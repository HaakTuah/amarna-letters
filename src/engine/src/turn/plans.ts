/**
 * Orders kept for later: scheduled orders of a seat that sleeps, and every seat's standing orders. Each kept order is bound
 * to the units it names and given, when it runs, from where they stand then. (The rest of sleeping seats is in sleep.ts.)
 */
import { Dict, HSet } from "../core/collections.ts";
import { cmpNum, distinct, groupBy, sortBy } from "../core/seq.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import { characterOf, describe, newTurnSubmission, unitOf, type MoveOrder, type Order, type TurnSubmission } from "../model/orders.ts";
import { AllPowers, cmpPower, type Power } from "../model/power.ts";
import {
  describeLevy,
  newLevyRef,
  newPlannedOrder,
  newSleepSpell,
  newStandingBook,
  newStandingOrder,
  type LevyRef,
  type PlannedOrder,
  type ScheduledOrders,
  type SleepState,
  type StandingOrder,
  type StandingRequest,
} from "../model/sleep.ts";
import { notify, unitAt, type GameState, type Unit } from "../model/state.ts";
import { OrderValidator, type ValidationResult } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { conditionsMet, conditionsText } from "../rules/conditions.ts";
import { MaxConditions, type Condition } from "../model/conditions.ts";
import { removeAll } from "./resolve.ts";
import { entersText, kindName, MarchEndsTitle, MarchHeldUpTitle, MaxScheduledPerSeason, MaxScheduledSeasons, MaxStanding, standingFiredTitle } from "./sleep.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { CommanderMinds } from "./command.ts";
import { wordFromKing } from "../rules/court.ts";
import { CommandData } from "../model/command.ts";

/** The notice that scheduled orders did not run because their conditions did not hold. */
export const HeldBackTitle = "Scheduled orders held back by their conditions";

/** The notice that scheduled orders waiting for a levy's unit were dropped, because the levy raised none. */
export const UnraisedTitle = "Orders for a levy that raised no unit dropped";

/**
 * What a seat gives for this season before its standing orders fire: the orders it gives now (for a seat that sleeps, the
 * letters it sent from its audiences first, then its fresh orders and its schedule's entry for this season), the orders
 * scheduled for this season, each as given from where its unit stands now, and whether the script king stood in.
 */
export interface SeasonPlan {
  sub: TurnSubmission;
  now: Order[];
  due: [Order | null, PlannedOrder][];
  standIn: boolean;
}

/**
 * A standing order that fired this season: what set it off, the orders it gave, the orders given now that it replaced, and
 * its orders that an earlier standing order that fired with it replaced (with that one's id).
 */
export interface Firing {
  from: StandingOrder;
  cause: string;
  given: Order[];
  displaced: Order[];
  byEarlier: [Order, string][];
}

declare module "./core.ts" {
  interface TurnEngine {
    planSeason(p: Power, sub: TurnSubmission): SeasonPlan;
    conditionsHold(p: Power, cs: readonly Condition[]): boolean;
    conditionProblem(cs: readonly Condition[]): string | null;
    compose(p: Power, plan: SeasonPlan, fired: readonly [StandingOrder, string][]): TurnSubmission;
    standingFires(seasons: Dict<Power, SeasonPlan>, validator: OrderValidator): Dict<Power, [StandingOrder, string][]>;
    /**
     * Whether a standing order's order for one unit runs when the move `m` by `mover` sets it off (item 13): word of it has
     * reached the unit, its commander or the king is with it, its army sees the move, and he does not look away.
     */
    standingRuns(p: Power, st: StandingOrder, o: PlannedOrder, mover: Power, m: MoveOrder): boolean;
    /** Whether a scheduled order due now still waits for its word to reach where it runs (it is kept for then). */
    notYetReached(p: Power, sl: SleepState, o: Order | null, x: PlannedOrder): boolean;
    tellFired(p: Power, f: Firing, v: ValidationResult): void;
    failureOf(p: Power, order: Order): string;
    scheduledFailed(p: Power, order: Order, why: string): void;
    afterValidation(p: Power, sub: TurnSubmission, v: ValidationResult): void;
    bind(p: Power, turn: number, o: Order, levies: readonly LevyRef[]): [PlannedOrder | null, string];
    levyRaised(p: Power, unit: Unit): void;
    unraisedLevies(): void;
    keepScheduled(p: Power, sl: SleepState, plans: ScheduledOrders[], accepted: readonly Order[]): void;
    keepStanding(p: Power, requests: StandingRequest[]): void;
    cancelStanding(p: Power, ids: string[]): void;
    whenText(p: Power, st: StandingOrder): string;
    marches(valid: Dict<Power, ValidationResult>): void;
    endMarch(p: Power, sl: SleepState, plan: PlannedOrder, unit: Unit, what: string, quietIfNothingDropped: boolean): void;
  }
}

const P = TurnEngine.prototype;

/**
 * A seat's season before its standing orders fire. Every seat may keep standing orders, so every seat has one: troops lost
 * take their standing orders with them, and standing orders cancelled now do not fire. For a seat that sleeps, more: an
 * entry for this season in the submission replaces what was scheduled for it (an empty one cancels it); its orders are
 * given now, so they count as fresh ones. Letters the seat sent from its audiences this season come first, as orders given
 * now; an order it gives now for the same person replaces one. What changes the seat's state happens here, once a season.
 * The script king standing in after the seat's call failed is not the seat: it neither replaces the schedule nor cancels
 * standing orders, and its orders only fill what the seat's own plans leave free.
 */
P.planSeason = function (p, sub) {
  const S = this.s;
  const sl = this.sleepOf(p);
  this.lostUnits(p, sl);
  const standIn = sub.fromFallback;
  // Cancelled now, a standing order does not fire this season.
  if (!standIn && sub.cancelStanding.length > 0) this.cancelStanding(p, sub.cancelStanding);
  if (sl === null) return { sub, now: standIn ? [] : [...sub.orders], due: [], standIn };

  // Entries for this season count as orders given now, each if its conditions hold as the seat knows things now.
  const entries = standIn ? [] : sub.scheduled.filter((x) => x.turn === S.turn);
  const replacement = entries.length > 0 ? entries : null;
  const now: Order[] = standIn ? [] : [...sub.orders];
  for (const x of entries) if (this.conditionsHold(p, x.conditions)) now.push(...survivors(now, x.orders, (o) => o));
  // Letters it sent from its audiences this season are its own orders, given before any it gives now: checked first, so
  // their gold is reserved first. One it gives now for the same person replaces the letter (when it reopened its orders).
  if (sl.courtLetters.length > 0) {
    now.unshift(...survivors(now, sl.courtLetters, (o) => o));
    sl.courtLetters.length = 0;
  }
  // Scheduled orders whose conditions do not hold are held back: the seat's own choice, told in its news, waking nobody.
  const held = replacement !== null ? [] : sl.scheduled.filter((x) => x.turn === S.turn && !this.conditionsHold(p, x.conditions));
  if (held.length > 0)
    notify(
      S,
      p,
      "Notice",
      HeldBackTitle,
      `Orders you scheduled for turn ${S.turn} did not run, as you had ordered: ` +
        groupBy(held, (x) => conditionsText(x.conditions))
          .map(([why, g]) => `${g.map((x) => describe(x.order)).join("; ")} (${why})`)
          .join("; ") +
        ".",
    );
  const due: [Order | null, PlannedOrder][] =
    replacement !== null
      ? []
      : sl.scheduled
          .filter((x) => x.turn === S.turn && !held.includes(x))
          .map((x) => [asItStands(S, p, x), x] as [Order | null, PlannedOrder])
          .filter(([o]) => o !== null);
  removeAll(sl.scheduled, (x) => x.turn <= S.turn);
  return { sub, now, due: due.filter(([o, x]) => !this.notYetReached(p, sl, o, x)), standIn };
};

/**
 * A seat's orders for this season with the standing orders that fire this season (`fired`) and its scheduled orders
 * folded in, each given from where its unit stands now. A standing order that fires replaces the season's other orders for
 * the same unit or person, those given now among them, and an earlier standing order's replace a later one's; orders given
 * now replace a scheduled order for the same unit or person; an order repeated is dropped. A renewal is not a task: a
 * renewal replaces another's renewal or dismissal of the same person, and a dismissal its renewal, but a renewal and an
 * errand for the same person both run. The stand-in's orders only fill what the seat's own plans leave free. The standing
 * orders that fire are spent: they leave the seat's list. The orders are checked in this order: those given now, then the
 * standing orders', then the scheduled ones, then the stand-in's.
 */
P.compose = function (p, plan, fired) {
  const S = this.s;
  if (fired.length > 0) removeAll(S.standing.get(p).orders, (x) => fired.some(([f]) => f === x));
  const standing: [Order, StandingOrder][] = [];
  const given: { from: StandingOrder; cause: string; kept: Order[]; byEarlier: [Order, string][] }[] = [];
  for (const [f, cause] of fired) {
    const orders = (firedOrders.get(f) ?? f.orders).map((o) => asItStands(S, p, o)).filter((o): o is Order => o !== null);
    const kept = survivors(
      standing.map(([o]) => o),
      orders,
      (o) => o,
    );
    // Each order an earlier standing order's replaced, with that standing order's id.
    const earlier = orders
      .filter((o) => !kept.some((k) => k === o))
      .map((o) => [o, standing.find(([x]) => survivors([x], [o], (y) => y).length === 0)![1].id] as [Order, string]);
    given.push({ from: f, cause, kept, byEarlier: earlier });
    standing.push(...kept.map((o) => [o, f] as [Order, StandingOrder]));
  }
  // The orders given now that a standing order replaced, each with the standing order that replaced it (one it repeats
  // exactly is not counted as replaced: it runs, once).
  const now = survivors(
    standing.map(([o]) => o),
    plan.now,
    (o) => o,
  );
  const firings: Firing[] = given.map((g) => ({
    from: g.from,
    cause: g.cause,
    given: g.kept,
    displaced: plan.now.filter(
      (o) => !now.some((k) => k === o) && !g.kept.some((k) => describe(k) === describe(o)) && standing.find(([x]) => survivors([x], [o], (y) => y).length === 0)![1] === g.from,
    ),
    byEarlier: g.byEarlier,
  }));

  const runs = survivors([...now, ...standing.map(([o]) => o)], plan.due, (x) => x[0]!);
  const scheduled = [...standing.map(([o]) => o), ...runs.map(([o]) => o!)];
  // Item 13, "Army mandates": a unit no order of the king's reached this season is led by its commander on the spot, by his
  // reading of its mandate; one with no commander, or no mandate, holds.
  const ordered = new HSet([...now, ...scheduled].map(unitOf).filter((x): x is string => x !== null));
  const mandated: Order[] = [];
  for (const u of S.units.filter((x) => x.power === p && !ordered.has(x.province))) {
    const c = this.commanderOf(u);
    if (c === null || u.mandate === null || S.turn < u.mandateFrom) continue;
    const o = CommanderMinds.decide?.(this, u, c, u.mandate) ?? null;
    if (o !== null && unitOf(o) === u.province) mandated.push(o);
  }
  this._mandatedNow.set(p, mandated);
  // The stand-in's orders come last, for the units and people the seat's own plans leave free.
  const filling = plan.standIn ? survivors([...now, ...scheduled, ...mandated], plan.sub.orders, (o) => o) : [];
  this._scheduledNow.set(p, scheduled);
  this._standingNow.set(
    p,
    standing.map(([o, f]) => [o, f.id] as [Order, string]),
  );
  this._firedNow.set(p, firings);
  this._marchNow.set(
    p,
    runs.filter(([o]) => o !== null && o.type === "move").map(([o, plan2]) => [o!, plan2] as [Order, PlannedOrder]),
  );
  const sub = plan.sub;
  return newTurnSubmission({
    orders: [...now, ...scheduled, ...mandated, ...filling],
    notes: sub.notes,
    scheduled: sub.scheduled,
    standing: sub.standing,
    cancelStanding: sub.cancelStanding,
    answers: sub.answers,
    cancelAnswers: sub.cancelAnswers,
    fromFallback: sub.fromFallback,
    stayAwake: sub.stayAwake,
  });
};

/**
 * The standing orders that fire this season, per seat, each with what set it off. A standing order answers a move in the
 * season it is made, as the king's commanders on the spot would: a unit of the power it names (any foreign power's if
 * none) setting out to move into the province it names (UnitEnters), or a foreign unit setting out to move into the
 * province where the seat's unit stands (UnitAttacked), whatever then becomes of the move. Only a move the seat can see
 * sets it off: one from or into a province in its sight as the season begins. The moves are those each seat was ordered to
 * make this season, as the validator accepts them, before any standing order fires: a standing order never answers the
 * orders another gives, so the season still resolves in one pass.
 */
P.standingFires = function (seasons, validator) {
  const S = this.s;
  const fires = new Dict<Power, [StandingOrder, string][]>();
  const waiting = sortBy(
    [...seasons.keys()].filter((p) => this.standingOf(p).length > 0),
    [(p: Power) => p, cmpPower],
  );
  if (waiting.length === 0) return fires;
  const moves = new Dict(
    AllPowers.filter((p) => seasons.has(p)).map(
      (p) => [p, validator.validate(p, this.compose(p, seasons.get(p), [])).accepted.filter((o): o is MoveOrder => o.type === "move")] as const,
    ),
  );
  for (const p of waiting) {
    const sight = Views.sight(S, this.map, p);
    const list: [StandingOrder, string][] = [];
    for (const st of sortBy(this.standingOf(p), [(x: StandingOrder) => idNumber(x.id), cmpNum])) {
      const into = st.when === "UnitAttacked" ? (S.units.find((u) => u.id === st.unitId && u.power === p)?.province ?? null) : st.province;
      if (into === null) continue;
      let hit: [Power, MoveOrder] | null = null;
      outer: for (const q of AllPowers) {
        const ms = moves.tryGet(q);
        if (ms === undefined) continue;
        for (const m of ms)
          if (m.to === into && (sight.has(m.unit) || sight.has(into)) && (st.when === "UnitAttacked" || st.power === null ? q !== p : q === st.power)) {
            hit = [q, m];
            break outer;
          }
      }
      if (hit === null) continue;
      const [hq, m] = hit;
      // Its conditions are read as the season begins, as the seat knows things then; one that does not hold waits on.
      if (!this.conditionsHold(p, st.conditions)) {
        notify(S, p, "Notice", `Standing order ${st.id} did not fire`, `Your standing order ${st.id} (${this.whenText(p, st)}) saw the move it waits for (${hq}'s troops set out from ${m.unit} for ${m.to}), but did not fire: ${conditionsText(st.conditions)}. It still stands.`);
        continue;
      }
      // Item 13, "Standing orders belong to commanders": each unit's part runs only where word of it has reached the army,
      // its commander, or the king himself, is with it, and the army sees the move; as he reads the moment.
      const eligible = st.orders.filter((o) => this.standingRuns(p, st, o, hq, m));
      if (eligible.length === 0) continue;
      firedOrders.set(st, eligible);
      list.push([st, `${hq}'s ${kindName(unitAt(S, m.unit)?.kind ?? "Army")} set out from ${m.unit} for ${m.to}`]);
    }
    if (list.length > 0) fires.set(p, list);
  }
  return fires;
};

/**
 * Item 13: a scheduled order is carried out where its unit or its place is, once word of it has reached there: one due now
 * whose word is still on the road waits for it, kept for the season it arrives.
 */
P.notYetReached = function (p, sl, o, x) {
  const S = this.s;
  if (o === null || x.given <= 0) return false;
  const unit = x.unitId !== null ? (S.units.find((u) => u.id === x.unitId) ?? null) : null;
  const place = unit !== null ? unit.province : (scheduledPlace(o) ?? null);
  if (place === null || !this.map.exists(place)) return false;
  const reach = this.wordTo(p, place);
  if (!Number.isFinite(reach) || S.turn >= x.given + reach) return false;
  sl.scheduled.push({ ...x, turn: x.given + reach });
  sl.scheduled = sortBy(sl.scheduled, [(y: PlannedOrder) => y.turn, cmpNum]);
  return true;
};

/** The province an order without a unit is carried out in, if it names one. */
function scheduledPlace(o: Order): string | null {
  switch (o.type) {
    case "fortify":
    case "sell":
    case "purchase":
    case "feed":
    case "raise":
    case "welcome":
    case "deport":
    case "expel":
    case "returnRunaways":
    case "cede":
    case "hunt":
      return o.province;
    case "caravan":
    case "trade":
      return o.from;
    default:
      return null;
  }
}

/** The orders of each standing order that fires this season that its armies carry out (item 13). */
const firedOrders = new WeakMap<StandingOrder, PlannedOrder[]>();

P.standingRuns = function (p, st, o, mover, m) {
  const S = this.s;
  if (o.unitId === null) return true;
  const u = S.units.find((x) => x.id === o.unitId && x.power === p);
  if (u === undefined) return true;
  // Word of it must have reached the army.
  const reach = wordFromKing(S, this.map, p, u.province);
  if (!Number.isFinite(reach) || S.turn < st.given + reach) return false;
  // Someone to carry it out: the king himself there, or its commander.
  if (this.kingWith(u)) return true;
  const c = this.commanderOf(u);
  if (c === null) return false;
  // It fires on what the army sees: where its troops stand and one province around.
  const near = new HSet([u.province, ...this.map.neighbors(u.province)]);
  if (!near.has(m.unit) && !near.has(m.to)) return false;
  const rng = this.r("standing-commander", `${st.id}|${u.id}`);
  // A disloyal commander may look the other way.
  if (c.traits.loyalty < 50 && rng.chance(((50 - c.traits.loyalty) * 2) / 100)) return false;
  // A good one sees through a feint: a move that could not get through whatever stands where it goes.
  const mv = unitAt(S, m.unit);
  const there = unitAt(S, m.to);
  const feint = mv !== null && there !== null && there.power !== mover && there.men >= mv.men;
  if (feint && rng.chance((c.traits.competence * CommandData.seeThrough) / 10000)) return false;
  return true;
};

/**
 * The notice that a standing order fired, written once the season's orders are checked: what set it off, the orders it
 * gave, those refused (with the reason), the orders given that season that it replaced, and those of its own that an
 * earlier standing order replaced.
 */
P.tellFired = function (p, f, v) {
  const S = this.s;
  const list = (orders: Iterable<Order>): string => [...orders].map(describe).join("; ");
  const refused = f.given.map((o) => [o, v.rejected.find((r) => r.order === o)?.reason ?? null] as [Order, string | null]).filter(([, why]) => why !== null);
  const given = f.given.filter((o) => !refused.some(([r]) => r === o));
  const text = [`Your standing order ${f.from.id} (${this.whenText(p, f.from)}) fired in turn ${S.turn}: ${f.cause}.`];
  if (given.length > 0) text.push(`It gave these orders: ${list(given)}.`);
  if (refused.length > 0) text.push(`Refused: ${refused.map(([o, why]) => `${describe(o)} (${why})`).join("; ")}.`);
  if (f.displaced.length > 0) text.push(`They replaced these orders you gave for turn ${S.turn}: ${list(f.displaced)}.`);
  for (const [by, g] of groupBy(f.byEarlier, ([, b]) => b)) text.push(`Replaced by standing order ${by}, which fired in the same season: ${list(g.map(([o]) => o))}.`);
  notify(S, p, "Resolution", standingFiredTitle(f.from.id), text.join(" "));
};

/** The orders of `under` that still run beside `over`, which replace them (see compose). */
export function survivors<T>(over: Iterable<Order>, under: Iterable<T>, order: (x: T) => Order): T[] {
  const given = [...over];
  const units = new HSet(given.map(unitOf).filter((x): x is string => x !== null));
  const people = new HSet(given.map(characterOf).filter((x): x is string => x !== null));
  const renewing = new HSet(given.filter((o) => o.type === "renew").map((r) => (r as Extract<Order, { type: "renew" }>).character));
  const renewedOrDismissed = new HSet([...given.filter((o) => o.type === "dismiss").map((d) => (d as Extract<Order, { type: "dismiss" }>).character), ...renewing]);
  const same = new HSet(given.map(describe));
  return [...under].filter((x) => {
    const o = order(x);
    if (same.has(describe(o))) return false;
    const u = unitOf(o);
    if (u !== null && units.has(u)) return false;
    const c = characterOf(o);
    if (c !== null && people.has(c)) return false;
    if (o.type === "dismiss" && renewing.has(o.character)) return false;
    if (o.type === "renew" && renewedOrDismissed.has(o.character)) return false;
    return true;
  });
}

/**
 * A kept order as its seat reads it: as it would be given from where its units stand now, or, for a unit a levy has still
 * to raise, with that unit named as such ("the army to be raised in nippur in turn 3 -> ur").
 */
export function asShown(s: GameState, p: Power, plan: PlannedOrder): Order {
  if (plan.unitLevy === null && plan.otherLevy === null) return asItStands(s, p, plan) ?? plan.order;
  const at = (id: string | null): string | null => (id === null ? null : (s.units.find((u) => u.id === id && u.power === p)?.province ?? null));
  const unit = plan.unitLevy !== null ? describeLevy(plan.unitLevy) : at(plan.unitId);
  const other = plan.otherLevy !== null ? describeLevy(plan.otherLevy) : at(plan.otherUnitId);
  const o = plan.order;
  switch (o.type) {
    case "hold":
    case "move":
    case "besiege":
    case "disband":
    case "giftUnit":
      return { ...o, unit: unit ?? o.unit };
    case "support":
      return { ...o, unit: unit ?? o.unit, supported: other ?? o.supported };
    case "convoy":
      return { ...o, unit: unit ?? o.unit, army: other ?? o.army };
    default:
      return o;
  }
}

/**
 * A kept order as it is given from where its units stand now: the seat's own unit (and its own unit supported or
 * convoyed) wherever it has gone since. Null if one of them is no longer the seat's (destroyed, disbanded, given away), or
 * is still to be raised by a levy.
 */
export function asItStands(s: GameState, p: Power, plan: PlannedOrder): Order | null {
  if (plan.unitLevy !== null || plan.otherLevy !== null) return null;
  const at = (id: string | null): string | null => s.units.find((u) => u.id === id && u.power === p)?.province ?? null;
  const unit = plan.unitId === null ? null : at(plan.unitId);
  const other = plan.otherUnitId === null ? null : at(plan.otherUnitId);
  if ((plan.unitId !== null && unit === null) || (plan.otherUnitId !== null && other === null)) return null;
  if (unit === null) return plan.order;
  const o = plan.order;
  switch (o.type) {
    case "hold":
    case "move":
    case "besiege":
    case "disband":
    case "giftUnit":
      return { ...o, unit };
    case "support":
      return { ...o, unit, supported: other ?? o.supported };
    case "convoy":
      return { ...o, unit, army: other ?? o.army };
    default:
      return o;
  }
}

/** How a failed scheduled or standing order is named when it wakes its seat. */
P.failureOf = function (p, order) {
  const hit = this._standingNow.tryGet(p)?.find(([o]) => o === order);
  return hit !== undefined && hit[1] !== null ? `a standing order of yours could not be carried out: ${hit[1]}` : "orders you scheduled could not be carried out";
};

/**
 * A scheduled or standing order that others foiled while the season resolved wakes its seat next season: a move stopped by
 * foreign troops, a support cut by a foreign attack, a purchase other buyers or foreign troops spoiled, a cession or levy
 * in land lost in movement, a captive or ransom whose fate another court changed, gold found short when paid. Callers call
 * it only for those: nothing the seat's own orders bring about wakes it.
 */
P.scheduledFailed = function (p, order, why) {
  const list = this._scheduledNow.tryGet(p);
  const sl = this.s.sleep.tryGet(p);
  if (list === undefined || !list.some((o) => o === order) || sl === undefined) return;
  sl.pendingWake.push(`${this.failureOf(p, order)}: ${describe(order)} (${why})`);
};

/**
 * After validation: a standing order that fired is told. Scheduled and standing orders the checks refuse are told in the
 * season's notice of refused orders and wake nobody. A seat that plays every season keeps the standing orders it gave,
 * unless the stand-in gave them. A seat that sleeps and was asked this season (and answered itself, not through the
 * stand-in) keeps the orders it scheduled and its new standing orders, and goes to sleep: until a reason wakes it, or the
 * hidden cap, turn + 1 + GameConfig.maxSleep.
 */
P.afterValidation = function (p, sub, v) {
  const S = this.s;
  for (const f of this._firedNow.tryGet(p) ?? []) this.tellFired(p, f, v);
  const sl = this.sleepOf(p);
  if (sl === null) {
    // A seat that plays every season keeps the standing orders and answers it gives now; the stand-in's are not the seat's.
    if (!sub.fromFallback) {
      this.keepStanding(p, sub.standing);
      this.keepAnswers(p, sub.answers, sub.cancelAnswers);
    }
    return;
  }
  // A seat asked this season has seen earlier failures in its own news; only this season's count.
  const asked = !sl.asleep && !sub.fromFallback;
  if (asked) sl.pendingWake.length = 0;
  // Asleep, or the script king stood in after the seat's call failed: the seat has not seen this season yet, and it is
  // asked again next season.
  if (!asked) return;

  // The seat was asked this season: it has now seen its digest, keeps what it scheduled, and sleeps.
  sl.lastCalled = S.turn;
  sl.digest.length = 0;
  sl.digestLeftOut = 0;
  this.keepScheduled(p, sl, sub.scheduled, v.accepted);
  this.keepStanding(p, sub.standing);
  this.keepAnswers(p, sub.answers, sub.cancelAnswers);

  // A seat that asked to stay awake (a human ending his turn without sleeping) is asked again next season.
  if (sub.stayAwake) return;
  // It sleeps until something concerns it, or, at the latest, the hidden cap: it names no season and sets no triggers.
  sl.asleep = true;
  sl.wakeAt = S.turn + 1 + Math.max(0, S.config.maxSleep);
  sl.history.push(newSleepSpell({ from: S.turn + 1 }));
};

/**
 * Binds an order the seat gives for later to the units it names: each of its own units, named by the province it stands
 * in now, and its own unit named as the unit supported or the army convoyed. A unit a levy is to raise is named by the
 * province of the levy: in an order for a season after a levy of the seat's in that province (one of `levies`, the latest
 * before it), the name is the levy's unit, even where another of the seat's units stands now. Null, with the reason in the
 * rulebook's words, when it names a province where the seat has no unit and raises none, or could not be read.
 */
P.bind = function (p, turn, o, levies) {
  const S = this.s;
  let refusal = "";
  if (o.type === "unreadable") return [null, o.reason];
  const levy = (province: string): LevyRef | null => {
    const found = sortBy(
      levies.filter((l) => l.province === province && l.turn < turn),
      [(l: LevyRef) => l.turn, cmpNum],
    );
    return found.length > 0 ? found[found.length - 1] : null;
  };
  const plan = newPlannedOrder({ turn, order: o, given: S.turn });
  const at = unitOf(o);
  if (at !== null) {
    // In the validator's words: a foreign unit is named as such only where the seat can see it.
    const lv = this.map.exists(at) ? levy(at) : null;
    const unit = unitAt(S, at);
    if (!this.map.exists(at)) refusal = `there is no province called '${at}'`;
    else if (lv !== null) plan.unitLevy = lv;
    else if (unit !== null && unit.power === p) plan.unitId = unit.id;
    else refusal = OrderValidator.notYours(unit, at, Views.sight(S, this.map, p));
    if (plan.unitId === null && plan.unitLevy === null) return [null, refusal];
  }
  // A foreign unit, or walls, stay named by their province.
  const other = o.type === "support" ? o.supported : o.type === "convoy" ? o.army : null;
  if (other !== null && other !== undefined) {
    const lv = levy(other);
    const helped = unitAt(S, other);
    if (lv !== null) plan.otherLevy = lv;
    else if (helped !== null && helped.power === p) plan.otherUnitId = helped.id;
  }
  return [plan, refusal];
};

/**
 * The levies a seat has under way as it gives orders for later: those it raises this season (accepted with its orders)
 * and those it has scheduled for later seasons.
 */
function levies(sl: SleepState, accepted: readonly Order[], turn: number): LevyRef[] {
  const list = accepted.filter((o) => o.type === "raise").map((r) => newLevyRef({ province: (r as Extract<Order, { type: "raise" }>).province, turn, kind: (r as Extract<Order, { type: "raise" }>).kind }));
  for (const x of sl.scheduled) if (x.order.type === "raise") list.push(newLevyRef({ province: x.order.province, turn: x.turn, kind: x.order.kind }));
  return list;
}

/** A levy raised a unit: the scheduled orders waiting for it are bound to it. */
P.levyRaised = function (p, unit) {
  const S = this.s;
  const sl = S.sleep.tryGet(p);
  if (sl === undefined) return;
  const isThis = (l: LevyRef | null): boolean => l !== null && l.province === unit.province && l.turn === S.turn;
  for (const x of sl.scheduled) {
    if (isThis(x.unitLevy)) {
      x.unitId = unit.id;
      x.unitLevy = null;
    }
    if (isThis(x.otherLevy)) {
      x.otherUnitId = unit.id;
      x.otherLevy = null;
    }
  }
};

/**
 * Once the season's levies are raised: scheduled orders still waiting for a unit a levy of this season or earlier was to
 * raise can never run (the levy failed, was refused, or was not given after all). They are dropped, and the seat is told
 * in its news. That wakes nobody.
 */
P.unraisedLevies = function () {
  const S = this.s;
  if (!S.config.sleepingSeats) return;
  for (const [p, sl] of sortBy(S.sleep.entries(), [([k]: [Power, SleepState]) => k, cmpPower])) {
    const unraised = (l: LevyRef | null): boolean => l !== null && l.turn <= S.turn;
    const dropped = sl.scheduled.filter((x) => unraised(x.unitLevy) || unraised(x.otherLevy));
    if (dropped.length === 0) continue;
    removeAll(sl.scheduled, (x) => dropped.includes(x));
    const lines = dropped.map((x) => `turn ${x.turn}: ${describe(asShown(S, p, x))}`);
    notify(S, p, "Rejected", UnraisedTitle, "These orders were for troops a levy was to raise, and it raised none, so they were dropped:\n" + lines.map((x) => "- " + x).join("\n"));
  }
};

/**
 * Keeps the orders a seat scheduled for later seasons: any later season, at most MaxScheduledPerSeason orders a season, for
 * at most MaxScheduledSeasons seasons. One entry per season replaces everything scheduled for it, and an empty entry
 * cancels it. Each order is bound to the units it names (bind); one naming a province where the seat has no unit and
 * raises none is refused. What is not kept is reported in the seat's news, and wakes nobody.
 */
P.keepScheduled = function (p, sl, plans, accepted) {
  const S = this.s;
  const raisedNow = [...accepted];
  const notKept: string[] = [];
  const refused: string[] = [];
  // The entries for one season together replace everything scheduled for it, each with its own conditions.
  const seasonsGiven = sortBy(
    groupBy(
      plans.filter((x) => x.turn !== S.turn),
      (x) => x.turn,
    ),
    [([t]: [number, ScheduledOrders[]]) => t, cmpNum],
  );
  for (const [turn, group] of seasonsGiven) {
    if (turn < S.turn) {
      if (group.some((x) => x.orders.length > 0)) notKept.push(`turn ${turn}: that season has passed`);
      continue;
    }
    // A season after the game's last is kept like any other, under the same limits: its orders never run, because the
    // game ends first, and nothing the king reads depends on when the game must end.
    removeAll(sl.scheduled, (x) => x.turn === turn);
    let room = MaxScheduledPerSeason;
    const keepEntry = (plan: ScheduledOrders): void => {
      if (plan.orders.length === 0) return;
      const problem = this.conditionProblem(plan.conditions);
      if (problem !== null) {
        refused.push(`turn ${plan.turn}: ${problem}`);
        return;
      }
      if (plan.orders.length > room)
        notKept.push(`turn ${plan.turn}: only the first ${room} of its ${plan.orders.length} orders were kept; at most ${MaxScheduledPerSeason} orders may be scheduled for one season`);
      // The levies under way as this season's orders are kept: this season's, and those scheduled so far, earlier seasons'
      // among them (the entries are kept in season order).
      const lv = levies(sl, raisedNow, S.turn);
      for (const o of plan.orders.slice(0, room)) {
        const [bound, why] = this.bind(p, plan.turn, o, lv);
        if (bound !== null) sl.scheduled.push({ ...bound, conditions: [...plan.conditions] });
        else refused.push(`turn ${plan.turn}: ${describe(o)}: ${why}`);
      }
      room = Math.max(0, room - plan.orders.length);
    };
    for (const plan of group) keepEntry(plan);
  }
  // By season, then as given (a stable sort).
  sl.scheduled = sortBy(sl.scheduled, [(x: PlannedOrder) => x.turn, cmpNum]);
  const seasons = distinct(sl.scheduled.map((x) => x.turn));
  if (seasons.length > MaxScheduledSeasons) {
    const late = seasons.slice(MaxScheduledSeasons);
    notKept.push(
      `turn${late.length === 1 ? "" : "s"} ${late.join(", ")}: orders may be scheduled for at most ${MaxScheduledSeasons} seasons, so those for the latest were not kept`,
    );
    removeAll(sl.scheduled, (x) => late.includes(x.turn));
  }
  // Orders past a limit, or for a season already past, are refused like any other: told in the seat's news, waking nobody.
  if (notKept.length + refused.length === 0) return;
  notify(S, p, "Rejected", "Scheduled orders not kept", [...refused, ...notKept].map((x) => "- " + x).join("\n"));
};

/**
 * Keeps a seat's new standing orders, at most MaxStanding in all, each bound to the units it names (bind). One that
 * cannot be kept is refused whole, which is reported in the seat's news and wakes nobody. Every seat keeps them alike,
 * awake or asleep.
 */
P.keepStanding = function (p, requests) {
  const S = this.s;
  if (requests.length === 0) return;
  let book = S.standing.tryGet(p);
  if (book === undefined) S.standing.set(p, (book = newStandingBook()));
  const refused: string[] = [];
  for (const r of requests) {
    const province = isBlank(r.province) ? "?" : r.province;
    const u = this.map.exists(r.province) ? unitAt(S, r.province) : null;
    const unit = u !== null && u.power === p ? u : null;
    const what = r.when === "UnitAttacked" ? `when your unit in ${province} is attacked` : entersText(p, r.power, province);
    let why: string | null =
      r.unreadable ??
      (!this.map.exists(r.province) ? `there is no province called '${r.province ?? ""}'` : null) ??
      (r.when === "UnitAttacked" && unit === null ? `you have no unit in ${province}` : null) ??
      (r.orders.length === 0 ? "it gives no orders" : null) ??
      this.conditionProblem(r.conditions) ??
      (r.orders.length > MaxScheduledPerSeason ? `it gives ${r.orders.length} orders; a standing order may give at most ${MaxScheduledPerSeason}` : null) ??
      (book.orders.length >= MaxStanding ? `you may keep at most ${MaxStanding} standing orders` : null);
    const bound: PlannedOrder[] = [];
    if (why === null)
      for (const o of r.orders) {
        const [plan, refusal] = this.bind(p, 0, o, []);
        if (plan !== null) bound.push(plan);
        else {
          why = `${describe(o)}: ${refusal}`;
          break;
        }
      }
    if (why !== null) {
      refused.push(`${what}: ${why}`);
      continue;
    }
    book.orders.push(
      newStandingOrder({
        id: `s${++book.last}`,
        when: r.when,
        power: r.when === "UnitEnters" ? r.power : null,
        province: r.province,
        unitId: r.when === "UnitAttacked" ? unit!.id : null,
        orders: bound,
        conditions: [...r.conditions],
        given: S.turn,
      }),
    );
  }
  // Told in the seat's news, waking nobody, as for scheduled orders not kept.
  if (refused.length === 0) return;
  notify(S, p, "Rejected", "Standing orders not kept", refused.map((x) => "- " + x).join("\n"));
};

/** Cancels standing orders by id, or all of them; an id the seat does not have is reported. */
P.cancelStanding = function (p, ids) {
  const S = this.s;
  const named = ids.map((x) => trim(x)).filter((x) => x.length > 0);
  const book = S.standing.tryGet(p) ?? null;
  if (named.some((x) => eqIgnoreCase(x, "all"))) {
    if (book !== null) book.orders.length = 0;
    return;
  }
  const unknown = named.filter((id) => {
    if (book === null) return true;
    const before = book.orders.length;
    removeAll(book.orders, (x) => eqIgnoreCase(x.id, id));
    return book.orders.length === before;
  });
  if (unknown.length > 0) notify(S, p, "Rejected", "Standing orders not cancelled", unknown.map((x) => `- ${x}: you have no standing order ${x}`).join("\n"));
};

/** What a standing order waits for, in the words its seat reads: its unit named by where it stands now. */
P.whenText = function (p, st) {
  if (st.when === "UnitAttacked") {
    const u = this.s.units.find((u) => u.id === st.unitId && u.power === p);
    return u !== undefined ? `when your ${kindName(u.kind)} in ${u.province} is attacked` : `when your unit that stood in ${st.province ?? ""} is attacked`;
  }
  return entersText(p, st.power, st.province ?? "?");
};

/**
 * After movement, each scheduled move that ran this season: one whose unit still stands but did not get where it was going
 * is tried again next season, and each of that unit's later scheduled orders waits a season; failing a second time, or
 * refused, it ends the unit's march, and the unit's remaining scheduled orders are dropped. A unit that was destroyed takes
 * its orders with it (lostUnits).
 */
P.marches = function (valid) {
  const S = this.s;
  for (const [p, moves] of sortBy(this._marchNow.entries(), [([k]: [Power, [Order, PlannedOrder][]]) => k, cmpPower])) {
    const sl = S.sleep.tryGet(p);
    if (sl === undefined) continue;
    for (const [order, plan] of moves) {
      const move = order as MoveOrder;
      const unit = S.units.find((u) => u.id === plan.unitId && u.power === p);
      if (unit === undefined) continue;
      const whose = `Your ${kindName(unit.kind)} in ${unit.province}`;
      const refused = valid.tryGet(p)?.rejected.find((r) => r.order === order);
      if (refused !== undefined) this.endMarch(p, sl, plan, unit, `${whose} could not be ordered to ${move.to} in turn ${S.turn} (${refused.reason})`, true);
      else if (unit.province === move.to) continue;
      // Still on a long road (item 13): it goes on next season, and nothing failed.
      else if (unit.march === move.to && unit.along < this.marchPoints(unit, move.to, move.forced === true)) {
        const later = sl.scheduled.filter((x) => x.unitId === plan.unitId && x.turn > S.turn);
        for (const x of later) x.turn++;
        sl.scheduled.push(newPlannedOrder({ turn: S.turn + 1, order: plan.order, unitId: plan.unitId, otherUnitId: plan.otherUnitId, retry: plan.retry }));
        sl.scheduled = sortBy(sl.scheduled, [(x: PlannedOrder) => x.turn, cmpNum]);
      } else if (plan.retry) this.endMarch(p, sl, plan, unit, `${whose} failed to reach ${move.to} a second time in turn ${S.turn}`, false);
      else {
        const later = sl.scheduled.filter((x) => x.unitId === plan.unitId && x.turn > S.turn);
        for (const x of later) x.turn++;
        sl.scheduled.push(newPlannedOrder({ turn: S.turn + 1, order: plan.order, unitId: plan.unitId, otherUnitId: plan.otherUnitId, retry: true }));
        sl.scheduled = sortBy(sl.scheduled, [(x: PlannedOrder) => x.turn, cmpNum]);
        const turns = distinct(later.map((x) => x.turn));
        notify(
          S,
          p,
          "Rejected",
          MarchHeldUpTitle,
          `${whose} did not reach ${move.to} in turn ${S.turn}. It will try again in turn ${S.turn + 1}` +
            (turns.length === 0 ? "." : `, and each of its later scheduled orders waits a season (they now run in turn${turns.length === 1 ? "" : "s"} ${turns.join(", ")}).`),
        );
      }
    }
  }
};

/** A unit's march ends: its remaining scheduled orders are dropped, and its seat is told which. */
P.endMarch = function (p, sl, plan, unit, what, quietIfNothingDropped) {
  const S = this.s;
  void unit;
  const dropped = sl.scheduled.filter((x) => x.unitId === plan.unitId && x.turn > S.turn);
  removeAll(sl.scheduled, (x) => dropped.includes(x));
  if (dropped.length === 0 && quietIfNothingDropped) return;
  notify(
    S,
    p,
    "Rejected",
    MarchEndsTitle,
    `${what}: its march ends` +
      (dropped.length === 0 ? "." : ", and its remaining scheduled orders were dropped: " + dropped.map((d) => `turn ${d.turn}: ${describe(asShown(S, p, d))}`).join("; ") + "."),
  );
};

/**
 * Whether conditions hold for a seat, read from its own view as the season begins: only what it knows where the order runs
 * ("Scheduled, conditional orders"). The view is built once a season per seat, and only for a seat with conditions.
 */
P.conditionsHold = function (p, cs) {
  if (cs.length === 0) return true;
  let v = this._viewsNow.tryGet(p);
  if (v === undefined) this._viewsNow.set(p, (v = Views.for(this.s, p)));
  return conditionsMet(cs, v);
};

/** Why conditions cannot be kept (too many, a province nobody knows, no person named), or null. */
P.conditionProblem = function (cs) {
  if (cs.length > MaxConditions) return `it has ${cs.length} conditions; at most ${MaxConditions} are allowed`;
  for (const c of cs) {
    if (c.unreadable.length > 0) return c.unreadable;
    if ((c.kind === "TroopsIn" || c.kind === "StoresAtLeast") && !this.map.exists(c.province)) return `its condition names no province ('${c.province}')`;
    if (c.kind === "StoresAtLeast" && c.amount <= 0) return "its condition names no amount of grain";
    if (c.kind === "EnvoyBack" && isBlank(c.person)) return "its condition names nobody";
    if ((c.kind === "TreasuryBelow" || c.kind === "TreasuryAtLeast") && c.amount <= 0) return "its condition names no amount of gold";
  }
  return null;
};
