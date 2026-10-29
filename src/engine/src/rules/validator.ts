/**
 * The only door into the game state: every order must be legal, affordable (by the seat's own ledger) and permitted for
 * that seat. Persuading a model is never enough by itself.
 */
import { HSet } from "../core/collections.ts";
import { isBlank } from "../core/text.ts";
import { WorldMap } from "../model/map.ts";
import { characterOf, unitOf, type CaptiveFate, type HireOrder, type Order, type RejectedOrder, type TurnSubmission } from "../model/orders.ts";
import { coverOf, type Character } from "../model/people.ts";
import { AllPowers, type Power } from "../model/power.ts";
import type { PendingTask } from "../model/records.ts";
import { findCharacter, isAlive, ledger, unitAt, type GameState, type Unit } from "../model/state.ts";
import { Views } from "./views.ts";
import { checkArmyOrder } from "./validator-armies.ts";
import { checkCommandOrder } from "./validator-command.ts";
import type { Checking } from "./validator-context.ts";
import { checkEconomyOrder } from "./validator-economy.ts";
import { checkPeopleOrder } from "./validator-people.ts";

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

    // The checks, by kind of order, live in validator-armies.ts, validator-economy.ts and validator-people.ts.
    const v: Checking = {
      S, Map, power, orders,
      assayed, roadsSet, ceded, fortified, sallied, orderedUnits, raisedIn, busyCharacters, ransomed, renewed, hiredNow, tollsSet, taxesSet, peopleSet,
      get dispatches() { return dispatches; },
      get seekCount() { return seekCount; },
      get counterIntel() { return counterIntel; },
      heardFallen, Sight, nobody, covered, hireRefusal, errandRefusal, errandFits, spend, ownUnit, ownCharacter,
    };
    const check = (order: Order): string | null => {
      for (const group of [checkCommandOrder, checkArmyOrder, checkEconomyOrder, checkPeopleOrder]) {
        const why = group(v, order);
        if (why !== undefined) return why;
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
