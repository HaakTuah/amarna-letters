/**
 * Every seat's standing orders: when one fires (a move it waits for), what its commanders carry out, the notice that it
 * fired, and keeping, cancelling and reading them. (Scheduled orders are in plans.ts.)
 */
import { Dict, HSet } from "../core/collections.ts";
import { cmpNum, groupBy, sortBy } from "../core/seq.ts";
import { eqIgnoreCase, isBlank, trim } from "../core/text.ts";
import { placesNamed, told } from "../model/order-reading.ts";
import { type MoveOrder, type Order } from "../model/orders.ts";
import { AllPowers, cmpPower, type Power, whose } from "../model/power.ts";
import { newStandingBook, newStandingOrder, type PlannedOrder, type StandingOrder, type StandingRequest } from "../model/sleep.ts";
import { findCharacter, notify, unitAt } from "../model/state.ts";
import { placesKnown } from "../rules/units-known.ts";
import { OrderValidator, type ValidationResult } from "../rules/validator.ts";
import { Views } from "../rules/views.ts";
import { conditionsText } from "../rules/conditions.ts";
import { removeAll } from "./resolve.ts";
import { entersText, kindName, MaxScheduledPerSeason, MaxStanding, standingFiredTitle } from "./sleep.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { wordFromKing } from "../rules/court.ts";
import { CommandData } from "../model/command.ts";
import { goneUnheard, ownNamed } from "./named-units.ts";
import type { SeasonPlan } from "./plans.ts";

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
    standingFires(seasons: Dict<Power, SeasonPlan>, validator: OrderValidator): Dict<Power, [StandingOrder, string][]>;
    /**
     * Whether a standing order's order for one unit runs when the move `m` by `mover` sets it off (item 13): word of it has
     * reached the unit, its commander or the king is with it, its army sees the move, and he does not look away.
     */
    standingRuns(p: Power, st: StandingOrder, o: PlannedOrder, mover: Power, m: MoveOrder): boolean;
    tellFired(p: Power, f: Firing, v: ValidationResult): void;
    keepStanding(p: Power, requests: StandingRequest[]): void;
    cancelStanding(p: Power, ids: string[]): void;
    whenText(p: Power, st: StandingOrder): string;
  }
}

const P = TurnEngine.prototype;

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
      const into = st.when === "UnitAttacked" ? ((S.units.find((u) => u.id === st.unitId && u.power === p) ?? goneUnheard(this, p, st.unitId))?.province ?? null) : st.province;
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
        notify(S, p, "Notice", `Standing order ${st.id} did not fire`, placesNamed(`Your standing order ${st.id} (${this.whenText(p, st)}) saw the move it waits for (${whose(hq)} troops set out from ${m.unit} for ${m.to}), but did not fire: ${conditionsText(st.conditions)}. It still stands.`));
        continue;
      }
      // Item 13, "Standing orders belong to commanders": each unit's part runs only where word of it has reached the army,
      // its commander, or the king himself, is with it, and the army sees the move; as he reads the moment.
      const eligible = st.orders.filter((o) => this.standingRuns(p, st, o, hq, m));
      if (eligible.length === 0) continue;
      firedOrders.set(st, eligible);
      list.push([st, `${whose(hq)} ${kindName(unitAt(S, m.unit)?.kind ?? "Army")} set out from ${m.unit} for ${m.to}`]);
    }
    if (list.length > 0) fires.set(p, list);
  }
  return fires;
};

/** The orders of each standing order that fires this season that its armies carry out (item 13). */
export const firedOrders = new WeakMap<StandingOrder, PlannedOrder[]>();

P.standingRuns = function (p, st, o, mover, m) {
  const S = this.s;
  if (o.unitId === null) return true;
  // Bug #600: one lost out of sight, its end unheard, is weighed as its king last knew it, its commander as he stood.
  const u = S.units.find((x) => x.id === o.unitId && x.power === p) ?? goneUnheard(this, p, o.unitId);
  if (u === undefined) return true;
  const gone = !S.units.includes(u);
  // Word of it must have reached the army.
  const reach = wordFromKing(S, this.map, p, u.province);
  if (!Number.isFinite(reach) || S.turn < st.given + reach) return false;
  // Someone to carry it out: the king himself there, or its commander.
  if (this.kingWith(u)) return true;
  // A recall that has reached him would have left it without one.
  const c = gone ? (u.commander === null || S.turn < u.commandFrom || (u.relieveAt !== null && S.turn >= u.relieveAt) ? null : findCharacter(S, u.commander)) : this.commanderOf(u);
  if (c === null) return false;
  // It fires on what the army sees: where its troops stand and one province around.
  const near = new HSet([u.province, ...this.map.neighbors(u.province)]);
  if (!near.has(m.unit) && !near.has(m.to)) return false;
  const rng = this.r("standing-commander", `${st.id}|${u.id}`);
  // A disloyal commander may look the other way.
  if (c.traits.loyalty < 50 && rng.chance(((50 - c.traits.loyalty) * 2) / 100)) return false;
  // A good one sees through a feint: a move that could not get through what stands where it goes, half as many men or fewer.
  const mv = unitAt(S, m.unit);
  const there = unitAt(S, m.to) ?? (gone && u.province === m.to ? u : null);
  const feint = mv !== null && there !== null && there.power !== mover && mv.men > 0 && there.men >= 2 * mv.men;
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
  const list = (orders: Iterable<Order>): string => [...orders].map(told).join("; ");
  const refused = f.given.map((o) => [o, v.rejected.find((r) => r.order === o)?.reason ?? null] as [Order, string | null]).filter(([, why]) => why !== null);
  const given = f.given.filter((o) => !refused.some(([r]) => r === o));
  const text = [`Your standing order ${f.from.id} (${this.whenText(p, f.from)}) fired in turn ${S.turn}: ${f.cause}.`];
  if (given.length > 0) text.push(`It gave these orders: ${list(given)}.`);
  if (refused.length > 0) text.push(`Refused: ${refused.map(([o, why]) => `${told(o)} (${why})`).join("; ")}.`);
  if (f.displaced.length > 0) text.push(`They replaced these orders you gave for turn ${S.turn}: ${list(f.displaced)}.`);
  for (const [by, g] of groupBy(f.byEarlier, ([, b]) => b)) text.push(`Replaced by standing order ${by}, which fired in the same season: ${list(g.map(([o]) => o))}.`);
  notify(S, p, "Resolution", standingFiredTitle(f.from.id), placesNamed(text.join(" ")));
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
    const u = this.map.exists(r.province) ? ownNamed(this, p, r.province) : null;
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
          why = `${told(o)}: ${refusal}`;
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
  notify(S, p, "Rejected", "Standing orders not kept", placesNamed(refused.map((x) => "- " + x).join("\n")));
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
    const u = this.s.units.find((u) => u.id === st.unitId && u.power === p) ?? goneUnheard(this, p, st.unitId);
    // Where its king believes it stands (bug #615).
    return u !== undefined ? `when your ${kindName(u.kind)} in ${placesKnown(this, p)(u)} is attacked` : `when your unit that stood in ${st.province ?? ""} is attacked`;
  }
  return entersText(p, st.power, st.province ?? "?");
};
