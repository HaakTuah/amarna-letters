/**
 * A court's caravans as it knows them (bug #540, "Distance inside your own realm", item 13): one its couriers reach
 * within the season, as it is; one farther off, as its newest report whose word has come (Caravan.trail), a report from
 * a season `t` at a province `x` coming home once `t` + the couriers' seasons from `x` have passed, as a unit's does. One
 * is known only once word of its setting out could have come, and one that ended stands until word of its end comes.
 */
import type { Power } from "../model/power.ts";
import { caravanAt, type Caravan, readCaravanReport } from "../model/caravans.ts";
import { newCaravanView, type CaravanView } from "../model/views.ts";
import type { TurnEngine } from "../turn/turn-engine.ts";

const viewOf = (c: Caravan, at: string, grain: number, gold: number, returning: boolean): CaravanView =>
  newCaravanView({ from: c.from, to: c.to, grain, at, returning, gold, trade: c.trade, sneak: c.sneak, ship: c.ship !== null });

/** The caravans of a court as it knows them. */
export function caravansKnown(engine: TurnEngine, p: Power): CaravanView[] {
  const s = engine.s;
  const out: CaravanView[] = [];
  // Near, within the season (a journey ended as this season began, at once); farther, a season and the road later.
  const came = (turn: number, at: string): boolean => {
    const d = engine.wordTo(p, at);
    return d === 0 ? turn <= s.turn : Number.isFinite(d) && turn + d < s.turn;
  };
  const heard = (t: string): boolean => {
    const r = readCaravanReport(t);
    return came(r.turn, r.at);
  };
  for (const c of [...s.caravans, ...s.caravansGone]) {
    // Known once word of its setting out could have come: one hurrying home from far off is never ahead of that word.
    if (c.power !== p || !came(c.since, c.route[0])) continue;
    const live = s.caravans.includes(c);
    if (live && engine.wordTo(p, caravanAt(c)) === 0) {
      out.push(viewOf(c, caravanAt(c), c.grain, c.gold, c.returning));
      continue;
    }
    const last = [...c.trail].reverse().find(heard);
    if (last === undefined) continue;
    const r = readCaravanReport(last);
    if (!r.gone) out.push(viewOf(c, r.at, r.grain, r.gold, r.returning));
  }
  return out;
}
