/**
 * A court's own troops as it knows them ("Distance inside your own realm", item 13; bug #600): one its couriers reach
 * within the season, as it is; one farther off, as its last report has it (Unit.trail), as many seasons ago as the road
 * from it is long. A unit is known once word of its raising could have come, and one that left the game
 * (GameState.unitsGone) stands, as last reported, until word of its end could come.
 */
import type { Power } from "../model/power.ts";
import { newLevyRef, type PlannedOrder } from "../model/sleep.ts";
import type { Unit } from "../model/state.ts";
import { wordCame } from "./caravans-known.ts";
import type { TurnEngine } from "../turn/turn-engine.ts";

/**
 * Whether word of the unit's raising has reached its king (at once for the troops a game begins with); `now` as for
 * `wordCame`.
 */
export function raisedKnown(engine: TurnEngine, p: Power, u: Unit, now: number = engine.s.turn): boolean {
  return u.since === 0 || wordCame(engine, p, u.since, u.home, now);
}

/**
 * The court's own units as it knows them in season `now`: those it has heard were raised, and those gone whose end it has
 * not heard of.
 */
export function ownUnitsKnown(engine: TurnEngine, p: Power, now: number = engine.s.turn): Unit[] {
  const s = engine.s;
  const known = (u: Unit): boolean => u.power === p && raisedKnown(engine, p, u, now);
  const live = s.units.filter(known);
  // One gone that is its own again (a fleet back from cargo service) is the live one.
  return [...live, ...s.unitsGone.filter((u) => known(u) && !live.some((x) => x.id === u.id) && !wordCame(engine, p, u.goneTurn, u.province, now))];
}

/**
 * One season's report of a unit: where it stood, its men, food, hunger and pay owed, its chest and whether it buys, and
 * its men's savings (bug #540); older saves carry fewer.
 */
export function trailEntry(t: string): {
  province: string;
  men: number;
  food?: number;
  hungry?: number;
  unpaid?: number;
  chest?: number;
  buy?: boolean;
  savings?: number;
} {
  const [province, men, food, hungry, unpaid, chest, buy, savings] = t.split("|");
  const fed = food === undefined ? { province, men: Number(men) } : { province, men: Number(men), food: Number(food), hungry: Number(hungry), unpaid: Number(unpaid) };
  const chested = chest === undefined ? fed : { ...fed, chest: Number(chest), buy: buy === "1" };
  return savings === undefined ? chested : { ...chested, savings: Number(savings) };
}

/**
 * An own unit beyond what a courier brings within the season, as its last report has it; nothing to change for one
 * within it. A unit gone has no reports after the season it left: its newest is the last it sent.
 */
export function reportOf(engine: TurnEngine, u: Unit): { province: string; men: number; reported: number } | object {
  const i = reportIndex(engine, u);
  return i === null ? {} : { ...trailEntry(u.trail[i]), reported: reportedAt(engine, u, i), march: null, marchDays: 0 };
}

/** Which of a far unit's reports its king has as newest (`reportOf`), or null for one within its couriers' season. */
export function reportIndex(engine: TurnEngine, u: Unit): number | null {
  const d = engine.wordTo(u.power, u.province);
  if (d === 0 || !Number.isFinite(d) || u.trail.length === 0) return null;
  const lag = u.goneTurn > 0 ? engine.s.turn - u.goneTurn : 0;
  return Math.min(u.trail.length - 1, Math.max(0, u.trail.length - 1 - d + lag));
}

/** The season a unit's report `i` is labelled with, as the view dates it ("as reported in turn N"). */
export function reportedAt(engine: TurnEngine, u: Unit, i: number): number {
  return engine.s.turn - (u.goneTurn > 0 ? engine.s.turn - u.goneTurn : 0) - (u.trail.length - 1 - i);
}

/**
 * A scheduled order as its court reads it, for a unit raised whose raising it has not heard of: still named by its levy
 * ("the army to be raised in nubia in turn 3"), as before the levy ran (TurnEngine.asShown).
 */
export function plannedAsKnown(engine: TurnEngine, p: Power, x: PlannedOrder): PlannedOrder {
  const unheard = (id: string | null): Unit | null => {
    const u = id === null ? undefined : engine.s.units.find((y) => y.id === id && y.power === p);
    return u !== undefined && !raisedKnown(engine, p, u) ? u : null;
  };
  const levy = (u: Unit) => newLevyRef({ province: u.home, turn: u.since, kind: u.kind });
  const [a, b] = [unheard(x.unitId), unheard(x.otherUnitId)];
  if (a === null && b === null) return x;
  return { ...x, ...(a !== null ? { unitId: null, unitLevy: levy(a) } : {}), ...(b !== null ? { otherUnitId: null, otherLevy: levy(b) } : {}) };
}
