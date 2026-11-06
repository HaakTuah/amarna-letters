/**
 * A court's caravans as it knows them (bug #540, "Distance inside your own realm", item 13): one its couriers reach
 * within the season, as it is; one farther off, as its newest report whose word has come (Caravan.trail), a report from
 * a season `t` at a province `x` coming home once `t` + the couriers' seasons from `x` have passed, as a unit's does. One
 * is known only once word of its setting out could have come, and one that ended stands until word of its end comes.
 */
import type { Power } from "../model/power.ts";
import { courtOf, wordHomeAt } from "./court.ts";
import { caravanAt, type Caravan, readCaravanReport } from "../model/caravans.ts";
import { newCaravanView, type CaravanView } from "../model/views.ts";
import type { TurnEngine } from "../turn/turn-engine.ts";

/**
 * Whether word of what happened at `at` in season `turn` has reached a court: near, within the season (at once for what
 * happened as this season began); farther, a season and the couriers' road later. The road is reckoned as it was in
 * that season, so word once come never goes back with the seasons' roads. `now`: the season it is read in (the next,
 * while a season resolves, for what the court reads as it begins).
 */
export function wordCame(engine: TurnEngine, p: Power, turn: number, at: string, now: number = engine.s.turn): boolean {
  const s = engine.s;
  return (engine.map.exists(at) ? wordHomeAt(s, engine.map, courtOf(s, engine.map, p), at, turn) : turn) <= now;
}

const viewOf = (c: Caravan, at: string, grain: number, gold: number, returning: boolean, reported: number | null): CaravanView =>
  newCaravanView({ from: c.from, to: c.to, grain, at, returning, gold, trade: c.trade, sneak: c.sneak, ship: c.ship !== null, reported });

/** The caravans of a court as it knows them. */
export function caravansKnown(engine: TurnEngine, p: Power): CaravanView[] {
  const s = engine.s;
  const out: CaravanView[] = [];
  const came = (turn: number, at: string): boolean => wordCame(engine, p, turn, at);
  const heard = (t: string): boolean => {
    const r = readCaravanReport(t);
    return came(r.turn, r.at);
  };
  for (const c of [...s.caravans, ...s.caravansGone]) {
    // Known once word of its setting out could have come: one hurrying home from far off is never ahead of that word.
    const first = c.trail.length > 0 ? readCaravanReport(c.trail[0]) : null;
    if (c.power !== p || (first !== null && !came(first.turn, first.at))) continue;
    const live = s.caravans.includes(c);
    if (live && engine.wordFrom(p, caravanAt(c)) === 0) {
      // Its gold with its porters' pay, as its reports count it (#587).
      out.push(viewOf(c, caravanAt(c), c.grain, c.gold + c.pay, c.returning, null));
      continue;
    }
    const last = [...c.trail].reverse().find(heard);
    if (last === undefined) continue;
    const r = readCaravanReport(last);
    if (!r.gone) out.push(viewOf(c, r.at, r.grain, r.gold, r.returning, r.turn));
  }
  return out;
}
