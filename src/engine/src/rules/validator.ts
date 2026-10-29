/**
 * The only door into the game state: every order must be legal, affordable (by the seat's own ledger) and permitted for
 * that seat. Persuading a model is never enough by itself.
 */
import { newsOffered } from "./news.ts";
import { HSet } from "../core/collections.ts";
import { roundEven, toInt } from "../core/num.ts";
import { isBlank } from "../core/text.ts";
import { WorldMap } from "../model/map.ts";
import { characterOf, unitOf, type CaptiveFate, type HireOrder, type Order, type RejectedOrder, type TurnSubmission } from "../model/orders.ts";
import { coverOf, falseNameAt, hiddenAt, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { standsForBorrower } from "../model/money.ts";
import type { PendingTask } from "../model/records.ts";
import { grantStands, grantLive } from "../model/authority.ts";
import { buyAlongCurve, needOf } from "../model/economy.ts";
import { forMen, harvestIn, LandData, menAvailable, menOf } from "../model/land.ts";
import { harbourOf, shipFleet, TradeData } from "../model/trade.ts";
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
    // Winter closes nothing (item 9): a move over a pass or the open sea in winter is dangerous, not refused.
    const Map = this.map;
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
    const busyCharacters = new HSet<string>();
    const ransomed = new HSet<string>();
    const renewed = new HSet<string>();
    const hiredNow = new HSet<string>();
    const tollsSet = new HSet<string>();
    const taxesSet = new HSet<string>();
    const peopleSet = new HSet<string>();
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
      // Item 11a, "Hiring as a negotiation", with Haakon's answers: offered where it stands, at your court or by an envoy
      // you send this season to the court where it is. Of a person abroad the court knows only what it heard: whether it is
      // still there and free is settled when the envoy comes (the engine), never told now.
      const via = h.via ?? null;
      if (via === null && (c.status !== "Free" || c.errand !== null)) return [`${c.name} is not available for hire`, c];
      if (via === null && c.heldBy !== null && c.heldBy !== power) return [`${c.name} is held at the court of ${c.heldBy} and cannot come to yours`, c];
      if (via === null && c.at !== power && c.heldBy !== power)
        return [`${c.name} is not at your court: an offer to a person elsewhere goes with an envoy you send this season to where they are (via)`, c];
      if (via !== null) {
        const d = orders.find((o) => o.type === "dispatch" && o.envoy === via) ?? null;
        if (d === null || d.type !== "dispatch") return [`you send no envoy '${via}' this season to carry the offer`, c];
      }
      if (h.fee <= 0 || h.term <= 0) return ["fee and term must be positive", c];
      if (h.advance < 0 || h.advance > h.fee) return ["the advance must be between nothing and the whole fee", c];
      const e = errandRefusal(h);
      if (e !== null) return [e, c];
      return [null, c];
    };

    // A job's errand as an order names it: an envoy to a living court not one's own, or a spy on such a court or a province.
    const errandRefusal = (o: { what?: string | null; where?: string | null }): string | null => {
      const what = o.what ?? null;
      if (what === null) return "name the job's errand: what (envoy, spy or stay) and where";
      const where = o.where ?? "";
      if (what === "envoy") return AllPowers.includes(where as Power) && where !== power && !heardFallen(where as Power) ? null : `an envoy's errand is to a court other than your own: '${where}' is not one`;
      if (what === "spy") {
        if (AllPowers.includes(where as Power)) return where !== power && !heardFallen(where as Power) ? null : `you cannot spy on ${where}`;
        return Map.exists(where) && !Map.get(where).isSea ? null : `there is no court or province called '${where}'`;
      }
      // Haakon's answers to item 11b+: staying at your court until a deadline is an errand like any other.
      if (what === "stay") return where === power ? null : `a stay is at your own court: name ${power}`;
      return `a job's errand is "envoy", "spy" or "stay", not '${what}'`;
    };

    // Whether a person may be sent on an errand by this submission: its job's errand is this one (or not yet named), or an
    // order earlier in the list offers it a job for this one.
    const errandFits = (id: string, what: string, where: string): string | null => {
      const c = findCharacter(S, id);
      if (c === null) return null;
      const offered = orders.some((o) => (o.type === "hire" || o.type === "renew") && o.character === id && o.what === what && o.where === where);
      if (offered) return null;
      const cover = coverOf(c, power);
      // One not in your service is sent only on the errand of the job offered it now.
      if (cover === null && c.employer !== power) {
        const job = orders.find((o) => o.type === "hire" && o.character === id);
        return job !== undefined && job.type === "hire"
          ? `the job offered ${c.name} is ${job.what === "envoy" ? `as envoy to ${job.where}` : job.what === "stay" ? "to stay at your court" : `to watch ${job.where}`}: another errand is a new job`
          : null;
      }
      const e = cover !== null ? null : (c.contract?.errand ?? null);
      if (e === null) return null;
      if (e.what === what && e.where === where && !e.done) return null;
      const job = e.done ? `${c.name}'s job's errand is done` : `${c.name}'s job is ${e.what === "envoy" ? `as envoy to ${e.where}` : e.what === "stay" ? "to stay at your court" : `to watch ${e.where}`}`;
      return `${job}: another errand is a new job, offered with order renew (what, where), which they may take or not`;
    };

    // People this season's orders offer a job at court: they may be sent on its errand at once, if they take it. Only a hire
    // that stands counts, wherever it is listed.
    const hiring = new HSet(orders.filter((o): o is HireOrder => o.type === "hire" && (o.via ?? null) === null && hireRefusal(o)[0] === null).map((h) => h.character));

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
      // Haakon's answers to item 11a: one offered a job at your court by an earlier order may be sent on its errand at once
      // (if it takes the job).
      if (hiring.has(c.id) && c.at === power) return busyCharacters.has(c.id) ? `${c.name} was already given a task by an earlier order` : null;
      const away = covered(c) || (c.employer === power && c.status === "Captured");
      if (!away && (c.employer !== power || c.status !== "Employed")) return `${c.name} is not in your service`;
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
          if (u!.kind === "Fleet") return Map.canMove("Fleet", order.unit, order.to) ? null : `a fleet in ${order.unit} cannot reach ${order.to}`;
          if (Map.canMove("Army", order.unit, order.to)) return null;
          if (Map.seaRouteExists(order.unit, order.to)) return null;
          return `an army in ${order.unit} cannot reach ${order.to}`;
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
          return Map.canMove(u!.kind, order.unit, into) ? null : `the unit in ${order.unit} cannot reach ${into} to support there`;
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

        case "sell":
        case "purchase":
        case "feed": {
          const what = order.type === "sell" ? "sell" : order.type === "purchase" ? "buy" : "hand to its town";
          if (isBlank(order.province)) return `name the province whose grain to ${what}`;
          if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
          const name = Map.get(order.province).name;
          if (S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${name}: at a foreign market you trade by a caravan (order trade) or a ship (order ship)`;
          if (siegeOf(S, order.province) !== null) return `${name} is besieged: nothing goes in or out of its market`;
          if (!(order.amount > 0)) return "name how many measures of grain";
          if (order.type !== "purchase") return null;
          const m = S.markets.tryGet(order.province);
          return spend(buyAlongCurve(m?.stock ?? 0, needOf(Map.get(order.province)), Number.MAX_SAFE_INTEGER, order.amount).paid);
        }

        case "caravan": {
          if (isBlank(order.from) || isBlank(order.to)) return "name the province the caravan sets out from and the one it goes to";
          for (const x of [order.from, order.to]) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
          if (order.from === order.to) return "a caravan must go somewhere else";
          if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${Map.get(order.from).name}`;
          if (siegeOf(S, order.from) !== null) return `${Map.get(order.from).name} is besieged: no caravan can leave it`;
          if (!(order.amount > 0)) return "name how many measures of grain";
          return null;
        }

        case "trade": {
          if (isBlank(order.from) || isBlank(order.to)) return "name the province the caravan sets out from and the market it goes to";
          for (const x of [order.from, order.to]) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
          if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${Map.get(order.from).name}`;
          if (siegeOf(S, order.from) !== null) return `${Map.get(order.from).name} is besieged: no caravan can leave it`;
          if (S.owner.getOrDefault(order.to, null) === power) return `${Map.get(order.to).name} is your own market: sell or buy there with the orders sell and purchase`;
          if (Map.get(order.to).kingless) return `${Map.get(order.to).name} has no town and no market to trade at`;
          if (!(order.grain >= 0) || !(order.gold >= 0) || order.grain + order.gold <= 0) return "name the grain it carries to sell, the gold it carries to buy with, or both";
          return spend(order.gold);
        }

        case "ship": {
          for (const x of [order.from, order.to]) if (isBlank(x) || !Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
          const fleet = shipFleet(S.units, Map.get(order.from), order.fleet, power);
          if (fleet === null || (fleet.province !== order.from && fleet.province !== Map.get(order.from).waters)) return `you have no fleet in ${Map.get(order.from).name} or its waters to load`;
          if (orderedUnits.has(fleet.province)) return `the fleet in ${fleet.province} already has an order`;
          const from = Map.get(order.from);
          const to = Map.get(order.to);
          if (harbourOf(from) <= 0) return `${from.name} has no harbour`;
          if (S.owner.getOrDefault(order.from, null) !== power) return `you do not hold ${from.name}`;
          if (siegeOf(S, order.from) !== null) return `${from.name} is besieged: nothing is loaded there`;
          if (harbourOf(to) <= 0) return `${to.name} has no harbour`;
          if (order.from === order.to) return "a ship must sail somewhere else";
          if (order.trade && S.owner.getOrDefault(order.to, null) === power) return `${to.name} is your own market: deliver there (trade false), and sell with the order sell`;
          if (order.trade && to.kingless) return `${to.name} has no town and no market to trade at`;
          if (!(order.grain >= 0) || !(order.gold >= 0) || order.grain + order.gold <= 0) return "name the grain it loads, the gold it carries, or both";
          if (order.grain > TradeData.shipCapacity) return `a fleet carries at most ${TradeData.shipCapacity} measures`;
          if (!order.trade && order.gold > 0) return "a ship that delivers carries grain only: gold goes with a ship that trades";
          const paid = spend(order.gold);
          if (paid === null) orderedUnits.add(fleet.province);
          return paid;
        }

        case "toll": {
          if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea)) return `there is no province called '${order.province}'`;
          if (order.province !== null && S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${Map.get(order.province).name}`;
          if (order.partner !== null && (!AllPowers.includes(order.partner) || order.partner === power)) return `there is no other king called '${order.partner}'`;
          if (!(order.percent >= 0) || order.percent > TradeData.tollMost) return `a toll is a percent from 0 to ${TradeData.tollMost}`;
          const key = `${order.province ?? ""}|${order.partner ?? ""}`;
          if (tollsSet.has(key)) return "you had already set that toll this season";
          tollsSet.add(key);
          return null;
        }

        case "tax": {
          if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea)) return `there is no province called '${order.province}'`;
          if (order.province !== null && S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${Map.get(order.province).name}`;
          if (!Number.isInteger(order.percent) || order.percent < 0 || order.percent > LandData.taxMost) return `a tax is a percent of the harvest from 0 to ${LandData.taxMost}`;
          const key = order.province ?? "";
          if (taxesSet.has(key)) return "you had already set that tax this season";
          taxesSet.add(key);
          return null;
        }

        // Item 10+b: people in a king's hands.
        case "welcome":
        case "expel":
        case "returnRunaways":
        case "deport": {
          if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
          const name = Map.get(order.province).name;
          if (S.owner.getOrDefault(order.province, null) !== power) return `you do not hold ${name}`;
          const key = `${order.type}|${order.province}|${order.type === "returnRunaways" ? order.to : ""}`;
          if (peopleSet.has(key)) return `you had already given that order for ${name} this season`;
          if (order.type === "expel" && siegeOf(S, order.province) === null) return `${name} is not besieged`;
          if (order.type === "expel" && (!Number.isInteger(order.percent) || order.percent < 1 || order.percent > 100)) return "say how many in a hundred of the mouths still inside to put out, 1 to 100";
          if (order.type === "returnRunaways" && (!AllPowers.includes(order.to) || order.to === power)) return `you cannot send runaways to '${order.to}'`;
          if (order.type === "deport") {
            if (Map.get(order.province).home === power) return `${name} is your own homeland: a king deports only from land he has taken`;
            if (!Map.exists(order.to) || Map.get(order.to).isSea || S.owner.getOrDefault(order.to, null) !== power) return `you do not hold '${order.to}' to send them to`;
            if (order.to === order.province) return "deportees go to another province of yours";
            if (!Number.isInteger(order.number) || order.number <= 0) return "say how many people to deport";
          }
          peopleSet.add(key);
          return null;
        }

        case "raise": {
          const r = order;
          if (r.men != null && (!Number.isInteger(r.men) || r.men <= 0)) return "say how many men the levy takes, or leave it out for a unit's full size";
          if (!Map.exists(r.province)) return `there is no province called '${r.province}'`;
          const p = Map.get(r.province);
          if (p.home !== power) return `${p.name} is not part of your homeland`;
          if (S.owner.getOrDefault(p.id, null) !== power) return `you do not hold ${p.name}`;
          if (r.kind === "Fleet" && !p.isCoastal) return `${p.name} has no harbour for a fleet`;
          if (raisedIn.has(p.id)) return `you already raise a unit in ${p.name}`;
          const men = menAvailable(S, p.id);
          if (men < LandData.levyLeast) return `${p.name} has too few men of fighting age left for ${r.kind === "Army" ? "an army" : "a fleet"} (${LandData.levyLeast} at least, ${men} at home and not carrying or building)`;
          if (r.men != null && r.men < LandData.levyLeast) return `a levy takes ${LandData.levyLeast} men at least`;
          return spend(forMen(r.kind === "Army" ? S.config.armyCost : S.config.fleetCost, r.kind, Math.min(men, r.men ?? menOf(r.kind))));
        }

        case "disband": {
          const [why, unit] = ownUnit(order.unit);
          if (why !== null || order.settle !== true || unit === null) return why;
          if (Map.get(unit.province).isSea || S.owner.getOrDefault(unit.province, null) !== power) return "its men can be settled as colonists only in a province of your own";
          return null;
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
          const fit = errandFits(d.envoy, "envoy", d.to);
          if (fit !== null) return fit;
          if (d.collect != null) {
            const debt = S.debts.find((x) => x.id === d.collect) ?? null;
            if (debt === null || debt.ended !== null || debt.holder !== power) return `you hold no tablet of a standing debt '${d.collect}' in your archive`;
          }
          // The advances of the offers it carries go with it.
          const carried = orders.filter((o): o is HireOrder => o.type === "hire" && o.via === d.envoy && hireRefusal(o)[0] === null).reduce((a, h) => a + Math.min(h.advance, h.fee), 0);
          if (dispatches >= S.config.maxDispatchesPerTurn) return `at most ${S.config.maxDispatchesPerTurn} envoys may leave in one season`;
          if (d.gold < 0) return "gold cannot be negative";
          if (d.purityPercent < 10 || d.purityPercent > 100) return "purity must be between 10 and 100 percent";
          if (d.copies && d.copies.length > 0)
            for (const id of d.copies) if (!S.copies.some((x) => x.id === id && x.holder === power)) return `you hold no tablet copy '${id}'`;
          // A claim to check (item 10): only that of a person at your court who says it is an envoy of the king written to.
          if (d.checkClaim != null) {
            const claimant = findCharacter(S, d.checkClaim);
            if (claimant === null || falseNameAt(claimant, power)?.employer !== d.to) return `nobody at your court says they are an envoy of ${d.to} by the id '${d.checkClaim}'`;
          }
          // The envoy's authority (item 9): provinces it names that the king no longer holds are left out by the engine.
          if (d.authority != null) {
            if (d.authority.maxGold < 0) return "the most gold an envoy may give cannot be negative";
            for (const id of [...d.authority.cede, ...d.authority.open]) if (!Map.exists(id)) return `there is no province called '${id}'`;
          }
          const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
          // The tablet's scribe, and the inventory's unless the gold goes without one (item 8), as the engine charges them.
          const fee = (d.proposal ? S.config.tabletFee : 0) + (d.gold > 0 && d.noInventory !== true ? S.config.inventoryFee : 0);
          return spend(fine + fee + carried);
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
          if (hiredNow.has(c!.id)) return `${c!.name} was already offered a job by an earlier order`;
          // Item 11a: the advance is handed over when the job is agreed, so it is reserved now (carried abroad, with the envoy).
          return (order.via ?? null) !== null ? null : spend(Math.min(order.advance, order.fee));
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
          // A new job is offered at your court, where the man stands; a servant abroad whose fate this court has not heard
          // of counts as away.
          const home = cover === null && c.status === "Employed" && c.duty === "None" && c.at === power;
          if (!home) return `${c.name} is not at your court: a new job is offered where the man stands`;
          if (rn.fee <= 0 || rn.term <= 0) return "fee and term must be positive";
          if (rn.advance < 0 || rn.advance > rn.fee) return "the advance must be between nothing and the whole fee";
          const ee = errandRefusal(rn);
          if (ee !== null) return ee;
          if (renewed.has(c.id)) return `${c.name} was already renewed by an earlier order`;
          return spend(rn.advance);
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
          const sfit = errandFits(ps.character, "spy", court ?? province!);
          if (sfit !== null) return sfit;
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

        case "revoke": {
          // Passage and basing granted on sealed tablets (item 9).
          if (!AllPowers.includes(order.grantee) || order.grantee === power) return `you granted nothing to '${order.grantee}'`;
          if (order.province !== null && !Map.exists(order.province)) return `there is no province called '${order.province}'`;
          // Only what it knows it granted: the tablet's copy is in its archive.
          const stands = S.grants.some(
            (g) =>
              g.grantor === power &&
              g.grantee === order.grantee &&
              grantLive(g, S.turn) &&
              (g.tabletId === "" || S.copies.some((k) => k.holder === power && k.tabletId === g.tabletId)) &&
              (order.province === null || g.province === order.province || (g.province === null && g.lands.includes(order.province))),
          );
          return stands ? null : `you have granted ${order.grantee} no passage or basing${order.province !== null ? ` in ${order.province}` : ""} that still stands`;
        }

        case "grant": {
          // Item 11a+: passage or basing granted by order.
          if (!AllPowers.includes(order.grantee) || order.grantee === power || heardFallen(order.grantee)) return `you cannot grant passage to '${order.grantee}'`;
          if (order.kind !== "passage" && order.kind !== "basing") return "grant passage or basing";
          if (order.province === null && order.kind === "basing") return "basing is granted in one city: name the province";
          if (order.province !== null && (!Map.exists(order.province) || Map.get(order.province).isSea || S.owner.getOrDefault(order.province, null) !== power)) return `you do not hold '${order.province}'`;
          if (order.seasons !== null && (!Number.isInteger(order.seasons) || order.seasons < 1)) return "say for how many seasons, or none for until revoked";
          return null;
        }

        case "repudiate": {
          const copy = S.copies.find((x) => x.id === order.copy && x.holder === power);
          const t = copy === undefined ? undefined : S.tablets.find((x) => x.id === copy.tabletId);
          if (t === undefined) return `you hold no tablet copy '${order.copy}'`;
          if (t.byHandOf !== power) return "only a tablet your own envoy sealed in your name can be repudiated as beyond his authority";
          if (t.repudiatedTurn !== null) return "you have already repudiated that tablet";
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

        case "steal": {
          // Item 10: a spy of yours posted at a court, which it watches, takes a tablet from its archive.
          // As for a recall: by what the court believes of its spy, so that a refusal never tells it what it has not heard.
          const c = findCharacter(S, order.character);
          if (c === null || (c.employer !== power && !covered(c))) return `${order.character} is not in your service`;
          if ((coverOf(c, power)?.believed ?? c.duty) !== "SpyPosted" || c.missionTarget === null) return `${c.name} is not watching a court for you`;
          if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
          return null;
        }

        case "gift": {
          // Item 10: a gift to a person at your court (a host's return gift, or a bribe).
          // Only someone the court sees standing there: a hidden spy is, to the court, nowhere.
          const c = findCharacter(S, order.character);
          if (c === null || c.status === "Dead" || c.at !== power || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
          if (order.gold <= 0) return "name the gold to give";
          return spend(order.gold);
        }

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
          // Item 10+b: a captive handed over travels under guard; it is nobody's to dispose of until it arrives.
          if (c.duty === "UnderGuard") return `${c.name} is on the road under guard and has not reached your court yet`;
          // Taking what it carries is no task: the captive's fate may be decided too (Haakon's answers to item 11a).
          if (co.fate === "TakePurse") return orders.some((o, i) => i < orders.indexOf(co) && o.type === "captive" && o.character === co.character && o.fate === "TakePurse") ? `you already take what ${c.name} carries` : c.purse + c.carriedFor > 0 || S.debts.some((d) => d.ended === null && d.holder === c.id && d.kept === "Person") ? null : `${c.name} carries nothing to take`;
          if (busyCharacters.has(c.id)) return `${c.name} was already given a task by an earlier order`;
          if (co.fate === "Ransom" && co.ransom <= 0) return "name a ransom";
          // Item 10: questioning costs what is spent on it; a captive is handed over to a living court other than one's own.
          if (co.fate === "Question") {
            if ((co.spend ?? 0) < 10) return "questioning costs at least 10 shekels";
            return spend(co.spend!);
          }
          if (co.fate === "HandOver") {
            const to = co.to ?? null;
            if (to === null || !AllPowers.includes(to) || to === power || heardFallen(to)) return `you cannot hand a captive over to '${to ?? ""}'`;
            return null;
          }
          return OrderValidator.captiveRefusal(S, c, co.fate);
        }

        case "payFee": {
          // Item 11a: pay what fell due unpaid to a person at your court, or withhold the rest of a servant's job.
          const c = findCharacter(S, order.character);
          if (c === null) return nobody(order.character);
          if (!order.pay) return c.employer === power && c.contract !== null ? null : `${c.name} has no job of yours whose fee you could withhold`;
          const owed = c.owed.getOrDefault(power, 0);
          if (owed <= 0) return c.employer === power && c.contract !== null && c.contract.withheld ? null : `you owe ${c.name} nothing that fell due`;
          if (c.at !== power || hiddenAt(c, power)) return `${c.name} is not at your court to be paid`;
          return spend(owed);
        }

        case "borrow": {
          // Item 11a: from a person at your court who offers to lend.
          const c = findCharacter(S, order.character);
          if (c === null || c.status === "Dead" || c.at !== power || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
          if (c.lendOffer === null || c.lendOffer.amount <= 0) return `${c.name} offers no loan`;
          if (order.amount <= 0 || order.repay < order.amount) return "name the gold to borrow, and a sum to repay no smaller";
          return null;
        }

        case "repay": {
          const d = S.debts.find((x) => x.id === order.debt) ?? null;
          // A debt whose tablet went missing stands, as far as you know, until word of its end reaches you.
          if (d === null || d.borrower !== power || !standsForBorrower(d, S.turn)) return `you have no debt '${order.debt}' standing`;
          if (order.amount <= 0) return "name the gold to repay";
          return spend(order.amount);
        }

        case "buyNews": {
          // Item 11b: from a person at your court who offers news of another court.
          const c = findCharacter(S, order.character);
          if (c === null || c.status === "Dead" || c.at !== power || c.heldBy !== null || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
          const n = newsOffered(S, c, power).find((x) => x.court === order.court) ?? null;
          if (n === null) return `${c.name} offers no news of ${order.court}`;
          return spend(n.price);
        }

        case "seize": {
          // Haakon's answers to item 11a: the hoard of a living person, kept in your capital.
          const c = findCharacter(S, order.character);
          if (c === null || c.status === "Dead") return nobody(order.character);
          if (c.hoard === null || c.hoard.at !== power) return `${c.name} keeps no hoard in your city that you know of`;
          return null;
        }

        case "sellDebt": {
          const d = S.debts.find((x) => x.id === order.debt) ?? null;
          if (d === null || d.ended !== null || d.holder !== power) return `you hold no tablet of a standing debt '${order.debt}' in your archive`;
          const c = findCharacter(S, order.character);
          if (c === null || c.status === "Dead" || c.at !== power || c.heldBy !== null || hiddenAt(c, power)) return `there is nobody at your court called '${order.character}'`;
          if (order.price <= 0) return "name the price";
          return null;
        }

        case "payCarriers":
          return null;

        case "huntBands":
          for (const x of order.provinces ?? []) if (!Map.exists(x) || Map.get(x).isSea) return `there is no province called '${x}'`;
          return null;

        case "hunt":
          if (!Map.exists(order.province) || Map.get(order.province).isSea) return `there is no province called '${order.province}'`;
          return S.owner.getOrDefault(order.province, null) === power ? null : `you do not hold ${Map.get(order.province).name}`;

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
        if (order.type === "renew") renewed.add(order.character);
        if (order.type === "hire") hiredNow.add(order.character);
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
