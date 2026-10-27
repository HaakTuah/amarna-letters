/**
 * The only door into the game state: every order must be legal, affordable (by the seat's own ledger) and permitted for
 * that seat. Persuading a model is never enough by itself.
 */
import { HSet } from "../core/collections.ts";
import { roundEven, toInt } from "../core/num.ts";
import { isBlank } from "../core/text.ts";
import { WorldMap } from "../model/map.ts";
import { characterOf, unitOf, type CaptiveFate, type HireOrder, type Order, type RejectedOrder, type TurnSubmission } from "../model/orders.ts";
import { coverOf, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import type { PendingTask } from "../model/records.ts";
import { findCharacter, isAlive, ledger, siegeOf, unitAt, wallsOf, type GameState, type Unit } from "../model/state.ts";
import { Views } from "./views.ts";

export class ValidationResult {
  readonly accepted: Order[] = [];
  readonly rejected: RejectedOrder[] = [];
}

export class OrderValidator {
  private readonly s: GameState;
  private readonly map: WorldMap;

  constructor(state: GameState, map: WorldMap | null = null) {
    this.s = state;
    this.map = map ?? WorldMap.default;
  }

  static readonly MaxOrders = 80;

  /**
   * Why an order for a unit in `province` is refused when no unit of the seat's stands there: a foreign unit is named as
   * such only where the seat can see it, so that the refusal says nothing of troops out of its sight.
   */
  static notYours(unit: Unit | null, province: string, sight: HSet<string>): string {
    return unit !== null && sight.has(province) ? `the unit in ${province} is not yours` : `you have no unit in ${province}`;
  }

  validate(power: Power, submission: TurnSubmission): ValidationResult {
    const S = this.s;
    // The map as it can be crossed this season: in winter the open-sea crossings are closed.
    const Map = this.map.forTurn(S.turn);
    const closed = (from: string, to: string): string | null =>
      Map !== this.map && this.map.canMove("Fleet", from, to) && this.map.openCrossing(from, to) !== null
        ? `the open sea between ${from} and ${to} is closed in winter`
        : null;
    const result = new ValidationResult();
    const ledgerGold = ledger(S.treasuries.get(power));
    let budget = ledgerGold;
    const orders = submission.orders.slice(0, OrderValidator.MaxOrders);
    const assayed = new HSet<string>();
    const roadsSet = new HSet<string>();
    // A court it has not heard has fallen is, for its orders, still there (item 7b: word of a fall travels); an envoy or a
    // spy sent to it finds out on arrival.
    const heardFallen = (x: Power): boolean => !isAlive(S, x) && (S.fallsHeard.tryGet(power) ?? []).includes(x);
    const ceded = new HSet<string>();
    const fortified = new HSet<string>();
    const sallied = new HSet<string>();
    const orderedUnits = new HSet<string>();
    const raisedIn = new HSet<string>();
    const bought = new HSet<string>();
    const busyCharacters = new HSet<string>();
    const ransomed = new HSet<string>();
    const renewed = new HSet<string>();
    let dispatches = 0;
    let seekCount = 0;
    let counterIntel = false;
    let sight: HSet<string> | null = null;

    // What this seat can see: a refusal says nothing of troops out of its sight.
    const Sight = (): HSet<string> => (sight ??= Views.sight(S, Map, power));

    const nobody = (id: string): string => (isBlank(id) ? "you named nobody" : `there is nobody called '${id}'`);

    // A servant abroad whose fate this court has not heard of is, for its orders, a servant who is away:
    // nothing the validator says may betray what happened to it.
    const covered = (c: Character): boolean => coverOf(c, power) !== null;

    // Whether a hire can stand, apart from the person being given another task by an earlier order.
    const hireRefusal = (h: HireOrder): [string | null, Character | null] => {
      const c = findCharacter(S, h.character);
      if (c === null) return [nobody(h.character), null];
      // One of yours away, as far as you know (it went over to another court, or was let go there), reads as any servant of yours.
      if (covered(c) || (c.employer === power && (c.status === "Employed" || c.status === "Captured")))
        return [`${c.name} is already in your service; to keep them on, order renew`, c];
      if (c.status !== "Free") return [`${c.name} is not available for hire`, c];
      if (c.heldBy !== null && c.heldBy !== power) return [`${c.name} is held at the court of ${c.heldBy} and cannot come to yours`, c];
      if (!c.pitches.has(power) && c.at !== power) return [`${c.name} has not presented themselves to your court`, c];
      if (h.wage <= 0 || h.term <= 0) return ["wage and term must be positive", c];
      return [null, c];
    };

    // People this season's orders hire: they enter service only at the end of the season, so no errand can be given them
    // now. Only a hire that stands counts (one refused for its wage, or for someone not free to take it, does not), and it
    // counts wherever it is listed, so that an errand listed before it is refused in the same words.
    const hiring = new HSet(orders.filter((o): o is HireOrder => o.type === "hire" && hireRefusal(o)[0] === null).map((h) => h.character));

    if (!isAlive(S, power)) {
      for (const o of submission.orders) result.rejected.push({ order: o, reason: "your realm has fallen" });
      return result;
    }

    // Gold is reserved in the order the orders are listed, as each is accepted (the rulebook's "HOW A SEASON RESOLVES").
    const spend = (cost: number): string | null => {
      if (cost < 0) return "a cost cannot be negative";
      if (cost > budget) {
        const reserved = ledgerGold - budget;
        return reserved > 0
          ? `not enough gold: it needs ${cost} shekels; orders listed before it had reserved ${reserved}, and ${budget} was left`
          : `not enough gold: it needs ${cost} shekels, and your treasury held ${budget} by your ledger`;
      }
      budget -= cost;
      return null;
    };

    const ownUnit = (province: string): [string | null, Unit | null] => {
      const unit = unitAt(S, province);
      if (!Map.exists(province)) return [`there is no province called '${province}'`, unit];
      if (unit === null || unit.power !== power) return [OrderValidator.notYours(unit, province, Sight()), unit];
      if (orderedUnits.has(province)) return [`the unit in ${province} already has an order`, unit];
      return [null, unit];
    };

    const ownCharacter = (id: string, mustBeHome = true): string | null => {
      const c = findCharacter(S, id);
      if (c === null) return nobody(id);
      const away = covered(c) || (c.employer === power && c.status === "Captured");
      if (!away && (c.employer !== power || c.status !== "Employed"))
        return hiring.has(c.id)
          ? `${c.name} was to be hired that season: a person hired enters your service only at the end of the season, and can be sent on an errand from the next season`
          : `${c.name} is not in your service`;
      if (mustBeHome && (away || c.duty !== "None" || c.at !== power)) return `${c.name} is not at your court`;
      if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
      return null;
    };

    const check = (order: Order): string | null => {
      switch (order.type) {
        // An order the reply named but left incomplete: refused with the reason, rather than dropped unseen.
        case "unreadable":
          return order.reason;

        case "hold":
          return ownUnit(order.unit)[0];

        case "move": {
          const [e, u] = ownUnit(order.unit);
          if (e !== null) return e;
          if (isBlank(order.to)) return "name the province the unit should move to";
          if (!Map.exists(order.to)) return `there is no province called '${order.to}'`;
          if (order.to === order.unit) return "a unit cannot move to where it stands";
          if (u!.kind === "Fleet") return Map.canMove("Fleet", order.unit, order.to) ? null : (closed(order.unit, order.to) ?? `a fleet in ${order.unit} cannot reach ${order.to}`);
          if (Map.canMove("Army", order.unit, order.to)) return null;
          if (Map.seaRouteExists(order.unit, order.to)) return null;
          return this.map.seaRouteExists(order.unit, order.to)
            ? `an army in ${order.unit} cannot reach ${order.to}: the open sea is closed in winter, and no chain of coastal waters joins them`
            : `an army in ${order.unit} cannot reach ${order.to}`;
        }

        case "support": {
          const [e, u] = ownUnit(order.unit);
          if (e !== null) return e;
          if (isBlank(order.supported)) return "name the unit to support, by the province it stands in";
          if (!Map.exists(order.supported)) return `there is no province called '${order.supported}'`;
          // Out of sight, a province's troops are unknown: the support is given, and is void if no unit there acts as it names.
          if (unitAt(S, order.supported) === null && Sight().has(order.supported)) return `there is no unit in ${order.supported} to support`;
          if (order.supported === order.unit) return "a unit cannot support itself";
          const into = order.to ?? order.supported;
          if (!Map.exists(into)) return `there is no province called '${into}'`;
          if (into === order.unit) return "a unit cannot support a move into its own province";
          return Map.canMove(u!.kind, order.unit, into) ? null : (closed(order.unit, into) ?? `the unit in ${order.unit} cannot reach ${into} to support there`);
        }

        case "convoy": {
          const [e, u] = ownUnit(order.unit);
          if (e !== null) return e;
          if (u!.kind !== "Fleet" || !Map.get(order.unit).isSea) return "only a fleet at sea can convoy";
          if (isBlank(order.army)) return "name the army to convoy, by the province it stands in";
          if (isBlank(order.to)) return "name the coast where the army should land";
          if (!Map.exists(order.army)) return `there is no province called '${order.army}'`;
          const army = unitAt(S, order.army);
          // As for a support: out of sight, the convoy is given, and is void if no army there sails as it names.
          if ((army === null || army.kind !== "Army") && Sight().has(order.army)) return `there is no army in ${order.army}`;
          if (!Map.exists(order.to) || !Map.get(order.to).isCoastal) return `${order.to} is not a coast an army can land on`;
          return null;
        }

        case "fortify": {
          const f = order;
          if (isBlank(f.province)) return "name the province whose walls to strengthen";
          if (!Map.exists(f.province) || Map.get(f.province).isSea) return `there is no province called '${f.province}'`;
          const name = Map.get(f.province).name;
          if (S.owner.getOrDefault(f.province, null) !== power) return `you do not hold ${name}`;
          const level = wallsOf(S, f.province);
          if (level >= S.config.maxWalls) return `the walls of ${name} stand at ${level}, as high as walls go`;
          if (siegeOf(S, f.province) !== null) return `${name} is besieged: its walls cannot be strengthened while the siege lasts`;
          const within = unitAt(S, f.province);
          if (within !== null && within.power !== power) return `foreign troops stand within ${name}: its walls cannot be strengthened while they are there`;
          if (fortified.has(f.province)) return `the walls of ${name} were already to be strengthened by an earlier order`;
          return spend(S.config.fortifyCost * (level + 1));
        }

        case "sally": {
          const so = order;
          if (S.config.sallyMinWalls <= 0) return "walls do not sally in this game";
          if (isBlank(so.city)) return "name the city whose walls sally";
          if (!Map.exists(so.city) || Map.get(so.city).isSea) return `there is no city called '${so.city}'`;
          const name = Map.get(so.city).name;
          if (S.owner.getOrDefault(so.city, null) !== power) return `you do not hold ${name}`;
          if (wallsOf(S, so.city) === 0) return `${name} has no walls to sally from`;
          if (wallsOf(S, so.city) < S.config.sallyMinWalls)
            return `the walls of ${name} stand at ${wallsOf(S, so.city)}: only walls of ${S.config.sallyMinWalls} or more can sally`;
          const inside = unitAt(S, so.city);
          if (inside === null || inside.power === power) return `no foreign troops stand within the walls of ${name}`;
          if (isBlank(so.from)) return "name the province the attack the walls support comes from";
          if (!Map.exists(so.from)) return `there is no province called '${so.from}'`;
          if (!Map.areAdjacent(so.from, so.city)) return `${so.from} is not next to ${name}`;
          if (sallied.has(so.city)) return `the walls of ${name} were already to sally by an earlier order`;
          return null;
        }

        case "besiege": {
          const [e, u] = ownUnit(order.unit);
          if (e !== null) return e;
          if (u!.kind !== "Army") return "only an army can besiege a city; a fleet cannot";
          if (wallsOf(S, order.unit) <= 0) return `${Map.get(order.unit).name} has no walls to besiege`;
          if (S.owner.getOrDefault(order.unit, null) === power) return `${Map.get(order.unit).name} is yours`;
          return null;
        }

        case "raise": {
          const r = order;
          if (!Map.exists(r.province)) return `there is no province called '${r.province}'`;
          const p = Map.get(r.province);
          if (p.home !== power) return `${p.name} is not part of your homeland`;
          if (S.owner.getOrDefault(p.id, null) !== power) return `you do not hold ${p.name}`;
          if (r.kind === "Fleet" && !p.isCoastal) return `${p.name} has no harbour for a fleet`;
          if (raisedIn.has(p.id)) return `you already raise a unit in ${p.name}`;
          return spend(r.kind === "Army" ? S.config.armyCost : S.config.fleetCost);
        }

        case "disband":
          return ownUnit(order.unit)[0];

        case "buy": {
          const b = order;
          if (!Map.exists(b.province) || Map.get(b.province).isSea) return `there is no city called '${b.province}'`;
          if (S.owner.getOrDefault(b.province, null) !== null) return `${Map.get(b.province).name} is not a free city-state`;
          if (Map.get(b.province).kingless) return `${Map.get(b.province).name} has no king and no elders to sell it: it is taken only by force`;
          const near = Map.withinReach(
            b.province,
            power,
            S.owner,
            S.units.filter((u) => u.power === power).map((u) => u.province),
          );
          if (!near) return `${Map.get(b.province).name} lies beyond your reach (it must border your land or troops, or lie one voyage from one of your coasts: their waters the same or next to each other, and not across the open sea in winter)`;
          if (bought.has(b.province)) return "you already bid for that city";
          return spend(Map.get(b.province).yield * S.config.neutralPriceFactor);
        }

        case "cede": {
          const cp = order;
          if (!Map.exists(cp.province)) return `there is no province called '${cp.province}'`;
          if (S.owner.getOrDefault(cp.province, null) !== power) return "you can only cede what you hold";
          if (cp.province === Map.capital(power).id) return "you cannot cede your capital: your kingdom falls with it";
          if (cp.to === power || !isAlive(S, cp.to)) return `you cannot cede land to ${cp.to}`;
          if (ceded.has(cp.province)) return `${Map.get(cp.province).name} was already ceded by an earlier order`;
          return null;
        }

        case "giftUnit": {
          const ge = ownUnit(order.unit)[0];
          if (ge !== null) return ge;
          if (order.to === power || !isAlive(S, order.to)) return `you cannot give a unit to ${order.to}`;
          return null;
        }

        case "dispatch": {
          const d = order;
          const e = ownCharacter(d.envoy);
          if (e !== null) return e;
          if (d.to === power || heardFallen(d.to)) return `you cannot send an envoy to ${d.to}`;
          if (dispatches >= S.config.maxDispatchesPerTurn) return `at most ${S.config.maxDispatchesPerTurn} envoys may leave in one season`;
          if (d.gold < 0) return "gold cannot be negative";
          if (d.purityPercent < 10 || d.purityPercent > 100) return "purity must be between 10 and 100 percent";
          if (d.copies && d.copies.length > 0)
            for (const id of d.copies) if (!S.copies.some((x) => x.id === id && x.holder === power)) return `you hold no tablet copy '${id}'`;
          const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
          // The tablet's scribe, and the inventory's unless the gold goes without one (item 8), as the engine charges them.
          const fee = (d.proposal ? S.config.tabletFee : 0) + (d.gold > 0 && d.noInventory !== true ? S.config.inventoryFee : 0);
          return spend(fine + fee);
        }

        case "release": {
          const c = findCharacter(S, order.character);
          if (c === null) return nobody(order.character);
          if (c.heldBy !== power) return `you are not holding ${c.name}`;
          if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
          return null;
        }

        case "seekCandidates":
          return seekCount > 0 ? "you had already asked for candidates that season" : null;

        case "hire": {
          const [e, c] = hireRefusal(order);
          if (e !== null) return e;
          if (busyCharacters.has(c!.id)) return `${c!.name} was already given a task by an earlier order`;
          return null;
        }

        case "dismiss":
          return ownCharacter(order.character, false);

        case "renew": {
          const rn = order;
          // Not a task: a servant may be renewed and sent on an errand in the same season.
          const c = findCharacter(S, rn.character);
          if (c === null) return nobody(rn.character);
          const cover = coverOf(c, power);
          if (cover === null && (c.employer !== power || !(c.status === "Employed" || c.status === "Captured"))) return `${c.name} is not in your service`;
          // One who has given notice may be renewed wherever they are; anyone else only at your court. A servant
          // abroad whose fate this court has not heard of counts as it believes.
          const notice = cover !== null ? cover.noticePrice !== null : (c.contract?.noticePrice ?? null) !== null;
          const home = cover === null && c.status === "Employed" && c.duty === "None" && c.at === power;
          if (!notice && !home) return `${c.name} is not at your court and has not given notice`;
          if (rn.wage <= 0 || rn.term <= 0) return "wage and term must be positive";
          if (renewed.has(c.id)) return `${c.name} was already renewed by an earlier order`;
          return null;
        }

        case "check": {
          if (findCharacter(S, order.character) === null) return nobody(order.character);
          if (order.spend < 10) return "a background check costs at least 10 shekels";
          return spend(order.spend);
        }

        case "spy": {
          const ps = order;
          // In the rulebook's words: a spy must be one of your own people at your court, sent to watch a court or a province.
          const e = ownCharacter(ps.character);
          if (e !== null) return `a spy must be one of your own people at your court: ${e}`;
          const court = ps.court ?? null;
          const province = ps.province ?? null;
          if (court === null && province === null) return "a spy must be sent to watch a court or a province: you named neither";
          if (court !== null && province !== null) return "a spy must be sent to watch a court or a province: name only one";
          if (court !== null && (court === power || heardFallen(court))) return `you cannot spy on ${court}`;
          if (province !== null && (!Map.exists(province) || Map.get(province).isSea)) return `there is no province called '${province}'`;
          return null;
        }

        case "recall": {
          const c = findCharacter(S, order.character);
          if (c === null || (c.employer !== power && !covered(c))) return `${order.character} is not in your service`;
          if ((coverOf(c, power)?.believed ?? c.duty) !== "SpyPosted") return `${c.name} is not on a mission`;
          if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
          return null;
        }

        case "counterIntel":
          if (counterIntel) return "you had already set your watch that season";
          return spend(order.spend);

        case "roads": {
          if (order.court === power || !AllPowers.includes(order.court) || heardFallen(order.court)) return `you cannot close or open your roads to '${order.court}'`;
          if (roadsSet.has(order.court)) return `you had already closed or opened your roads to ${order.court} that season`;
          const closed = (S.roadsClosed.tryGet(power) ?? []).includes(order.court);
          if (closed === order.close) return `your roads are already ${closed ? "closed" : "open"} to the people of ${order.court}`;
          return null;
        }

        case "assay":
          if (!S.treasuries.get(power).lots.some((l) => l.id === order.lot)) return `there is no unassayed gold '${order.lot}'`;
          if (assayed.has(order.lot)) return `gold lot ${order.lot} was already to be assayed by an earlier order`;
          return spend(S.config.assayFee);

        case "authenticate":
          if (!S.copies.some((x) => x.id === order.copy && x.holder === power)) return `you hold no tablet copy '${order.copy}'`;
          if (order.spend < 10) return "an examination costs at least 10 shekels";
          return spend(order.spend);

        case "forge": {
          const e = ownCharacter(order.character);
          if (e !== null) return e;
          if (!order.seals || order.seals.length === 0) return "a forgery needs at least one seal";
          if (isBlank(order.text)) return "a tablet needs text";
          return spend(S.config.forgeFee);
        }

        case "captive": {
          const co = order;
          const c = findCharacter(S, co.character);
          if (c === null || c.status !== "Captured" || c.heldBy !== power) return `you hold no captive '${co.character}'`;
          if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
          if (co.fate === "Ransom" && co.ransom <= 0) return "name a ransom";
          return OrderValidator.captiveRefusal(S, c, co.fate);
        }

        case "payRansom": {
          const c = findCharacter(S, order.character);
          if (c === null) return nobody(order.character);
          if (ransomed.has(c.id)) return `a ransom for ${c.name} is already on its way`;
          const [why, task] = OrderValidator.ransomRefusal(S, power, c);
          if (why !== null) return why;
          const error = spend(task!.spend);
          if (error === null) ransomed.add(c.id);
          return error;
        }
      }
      return "unknown order";
    };

    for (const order of orders) {
      const budgetBefore = budget;
      const error = check(order);
      if (error === null) {
        result.accepted.push(order);
        const u = unitOf(order);
        if (u !== null) orderedUnits.add(u);
        const c = characterOf(order);
        if (c !== null) busyCharacters.add(c);
        if (order.type === "dispatch") dispatches++;
        if (order.type === "seekCandidates") seekCount++;
        if (order.type === "counterIntel") counterIntel = true;
        if (order.type === "roads") roadsSet.add(order.court);
        if (order.type === "raise") raisedIn.add(order.province);
        if (order.type === "buy") bought.add(order.province);
        if (order.type === "renew") renewed.add(order.character);
        if (order.type === "assay") assayed.add(order.lot);
        if (order.type === "cede") ceded.add(order.province);
        if (order.type === "fortify") fortified.add(order.province);
        if (order.type === "sally") sallied.add(order.city);
      } else {
        budget = budgetBefore;
        result.rejected.push({ order, reason: error });
      }
    }
    for (const o of submission.orders.slice(OrderValidator.MaxOrders))
      result.rejected.push({ order: o, reason: `too many orders: only the first ${OrderValidator.MaxOrders} of a season are read` });
    return result;
  }

  /**
   * Why a court cannot pay a ransom for one of its people, in the rulebook's words, or null if it can; with the demand. A
   * demand can be paid once its rumour has reached the court, while the captive is held by the court that asked (as far
   * as the payer knows: a captive put to death unknown to it still seems held), and once only.
   */
  static ransomRefusal(s: GameState, payer: Power, c: Character): [string | null, PendingTask | null] {
    let demand: PendingTask | null = null;
    for (const t of s.tasks) if (t.kind === "RansomDemand" && t.announced && t.characterId === c.id && t.requester === payer) demand = t;
    if (s.journeys.some((j) => j.kind === "Ransom" && j.characterId === c.id && j.from === payer)) return [`a ransom for ${c.name} is already on its way`, demand];
    const captor = demand?.other ?? null;
    if (captor === null) return [`no ransom demand for ${c.name} has reached you`, demand];
    const k = coverOf(c, payer);
    const held = k !== null ? k.heldAt === captor : c.status === "Captured" && c.heldBy === captor;
    return [held ? null : `${c.name} is no longer held by ${captor}`, demand];
  }

  /**
   * The court a ransom demand for a captive goes to: its king, or the king who dismissed it (so that a captor learns
   * nothing of another court's dismissal), or nobody once that kingdom has fallen.
   */
  static ransomPayer(s: GameState, c: Character): Power | null {
    if (c.employer !== null && isAlive(s, c.employer)) return c.employer;
    if (c.employer === null && c.formerEmployer !== null && isAlive(s, c.formerEmployer)) return c.formerEmployer;
    return null;
  }

  /**
   * Why a captor's ransom or turning cannot be carried out, in the rulebook's words, or null. A ransom needs a court to
   * pay it; a turning needs a king to deceive, which a captive whose king dismissed it no longer has.
   */
  static captiveRefusal(s: GameState, c: Character, fate: CaptiveFate): string | null {
    // An envoy caught at a besieged city was no spy at a post: there is nowhere to send it back to deceive from.
    if (fate === "Turn" && c.intercepted) return `${c.name} is an envoy your besiegers caught, not a spy at a post, and cannot be turned. ${c.name} remains your captive`;
    const possible = fate === "Ransom" ? OrderValidator.ransomPayer(s, c) !== null : fate === "Turn" ? c.employer !== null && isAlive(s, c.employer) : true;
    if (possible) return null;
    const nobody = `nobody is left to ${fate === "Ransom" ? "pay" : "deceive"}. ${c.name} remains your captive`;
    return c.formerEmployer !== null && isAlive(s, c.formerEmployer) ? `${c.name} serves no king now: ${nobody}` : `${c.name}'s kingdom has fallen: ${nobody}`;
  }
}
