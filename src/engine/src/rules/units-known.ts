/**
 * A court's own troops as it knows them ("Distance inside your own realm", item 13; bug #600): one its couriers reach
 * within the season, as it is; one farther off, as its last report has it (Unit.trail), as many seasons ago as the road
 * from it is long. A unit is known once word of its raising could have come, and one that left the game
 * (GameState.unitsGone) stands, as last reported, until word of its end could come.
 */
import { HSet } from "../core/collections.ts";
import { cmpNum, cmpStr, sortBy } from "../core/seq.ts";
import type { Power } from "../model/power.ts";
import {
  newLevyRef,
  type PlannedOrder,
  type SleepState,
} from "../model/sleep.ts";
import type { Character } from "../model/people.ts";
import type { Unit } from "../model/state.ts";
import { wordCame } from "./caravans-known.ts";
import { sight } from "./known-land.ts";
import type { TurnEngine } from "../turn/turn-engine.ts";

/**
 * Whether word of the unit's raising, or of its parting from the troops it was split off (bug #615), has reached its king
 * (at once for the troops a game begins with); `now` as for `wordCame`.
 */
export function raisedKnown(
  engine: TurnEngine,
  p: Power,
  u: Unit,
  now: number = engine.s.turn,
): boolean {
  return (
    u.since === 0 || heardFrom(engine, p, u.since, u.raisedAt || u.home, now)
  );
}

/**
 * Whether word from `at` of season `turn` has reached the court (`wordCame`); from a place its couriers reach within the
 * season now, or cannot reach at all, at once, as a unit there is shown as it is (`reportOf`, on today's roads).
 */
function heardFrom(
  engine: TurnEngine,
  p: Power,
  turn: number,
  at: string,
  now: number,
): boolean {
  const d = engine.wordFrom(p, at);
  return d === 0 || !Number.isFinite(d) || wordCame(engine, p, turn, at, now);
}

/**
 * Whether word that a unit of the court's has gone (it left the game, or passed to another) has reached it by season
 * `now`: never for one still its own, and for one gone, once word could come from where it went, whether or not its raising
 * was known (bug #600).
 */
export function goneHeard(
  engine: TurnEngine,
  p: Power,
  id: string,
  now: number = engine.s.turn,
): boolean {
  const s = engine.s;
  if (s.units.some((u) => u.id === id && u.power === p)) return false;
  const gone = s.unitsGone.find((u) => u.id === id && u.power === p);
  return (
    gone === undefined ||
    heardFrom(engine, p, gone.goneTurn, gone.province, now)
  );
}

/**
 * The court's own units as it knows them in season `now`: those it has heard were raised, and those gone whose end it has
 * not heard of.
 */
export function ownUnitsKnown(
  engine: TurnEngine,
  p: Power,
  now: number = engine.s.turn,
): Unit[] {
  const s = engine.s;
  const known = (u: Unit): boolean =>
    u.power === p && raisedKnown(engine, p, u, now);
  const live = s.units.filter(known);
  // One gone that is its own again (a fleet back from cargo service) is the live one.
  return [
    ...live,
    ...s.unitsGone.filter(
      (u) =>
        known(u) &&
        !live.some((x) => x.id === u.id) &&
        !heardFrom(engine, p, u.goneTurn, u.province, now),
    ),
  ];
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
  const [province, men, food, hungry, unpaid, chest, buy, savings] =
    t.split("|");
  const fed =
    food === undefined
      ? { province, men: Number(men) }
      : {
          province,
          men: Number(men),
          food: Number(food),
          hungry: Number(hungry),
          unpaid: Number(unpaid),
        };
  const chested =
    chest === undefined
      ? fed
      : { ...fed, chest: Number(chest), buy: buy === "1" };
  return savings === undefined
    ? chested
    : { ...chested, savings: Number(savings) };
}

/** A report's record of its unit's commander, battles won and lost (bug #615), or null if it gave none. */
function commanderReported(t: string): { won: number; lost: number } | null {
  const [won, lost] = t.split("|").slice(8);
  return won === undefined ? null : { won: Number(won), lost: Number(lost) };
}

/**
 * An own unit beyond what a courier brings within the season, as its last report has it; nothing to change for one
 * within it. A unit gone has no reports after the season it left: its newest is the last it sent.
 */
export function reportOf(
  engine: TurnEngine,
  u: Unit,
): { province: string; men: number; reported: number } | object {
  const i = reportIndex(engine, u);
  return i === null
    ? {}
    : {
        ...trailEntry(u.trail[i]),
        reported: reportedAt(engine, u, i),
        march: null,
        marchDays: 0,
      };
}

/** Which of a far unit's reports its king has as newest (`reportOf`), or null for one within its couriers' season. */
export function reportIndex(engine: TurnEngine, u: Unit): number | null {
  const d = engine.wordFrom(u.power, u.province);
  if (d === 0 || !Number.isFinite(d) || u.trail.length === 0) return null;
  const lag = u.goneTurn > 0 ? engine.s.turn - u.goneTurn : 0;
  return Math.min(
    u.trail.length - 1,
    Math.max(0, u.trail.length - 1 - d + lag),
  );
}

/**
 * Where the court's view shows each of its own known units, and so the unit its orders name there (bug #600): one its
 * couriers reach within the season where it stands (`at` null); one farther off by its newest report, unless other troops
 * it knows of are shown there too, when it gives way to its newest older report whose place none takes, or is left out if
 * it has none (never shown where it truly is: that news has not come yet), so a report never puts two troops in one
 * province. Each is placed in turn, in order of their ids, whether they stand or are gone, so a gone unit is placed as it
 * would be if it stood. In the order of `ownUnitsKnown`.
 */
export function ownPlaces(
  engine: TurnEngine,
  p: Power,
  seen: { has(province: string): boolean } = sight(engine.s, engine.map, p),
): { unit: Unit; at: number | null; province: string }[] {
  const known = ownUnitsKnown(engine, p);
  const placed = new Map<
    Unit,
    { unit: Unit; at: number | null; province: string }
  >();
  for (const u of known) {
    const at = reportIndex(engine, u);
    placed.set(u, {
      unit: u,
      at,
      province: at === null ? u.province : trailEntry(u.trail[at]).province,
    });
  }
  // Others' troops where it sees them stand where they are.
  const others = engine.s.units
    .filter((u) => u.power !== p && seen.has(u.province))
    .map((u) => u.province);
  for (const u of sortBy(known, [(x: Unit) => x.id, cmpStr])) {
    const x = placed.get(u)!;
    const taken = new HSet([
      ...others,
      ...[...placed.values()].filter((y) => y !== x).map((y) => y.province),
    ]);
    if (x.at === null || !taken.has(x.province)) continue;
    placed.delete(u);
    for (let i = x.at - 1; i >= 0; i--) {
      const province = trailEntry(u.trail[i]).province;
      if (taken.has(province)) continue;
      placed.set(u, { unit: u, at: i, province });
      break;
    }
  }
  return known.flatMap((u) => placed.get(u) ?? []);
}

/**
 * Where its king believes an own unit stands (bug #615): where his view shows it (`ownPlaces`), else by its newest report,
 * else where it is (one its couriers reach within the season). What he is told of his own doings with it names this place.
 */
export function placeKnown(engine: TurnEngine, u: Unit): string {
  return placesKnown(engine, u.power)(u);
}

/** `placeKnown` for each of a court's own units, its view's places reckoned once. */
export function placesKnown(
  engine: TurnEngine,
  p: Power,
  seen?: { has(province: string): boolean },
): (u: Unit) => string {
  const shown = new Map(
    ownPlaces(engine, p, seen).map((x) => [x.unit.id, x.province]),
  );
  return (u) => {
    const at = u.power === p ? shown.get(u.id) : undefined;
    if (at !== undefined) return at;
    const i = u.power === p ? reportIndex(engine, u) : null;
    return i === null ? u.province : trailEntry(u.trail[i]).province;
  };
}

/**
 * An own commander as his court knows him (bug #615): commanding where it believes his troops stand (`placeKnown`), with
 * his record of battles as their reports give it.
 */
export function commanderKnown(
  engine: TurnEngine,
  p: Power,
  c: Character,
  place: (u: Unit) => string = placesKnown(engine, p),
): Character {
  if (c.duty !== "Commanding" || (c.employer !== p && c.grantedBy !== p))
    return c;
  const u = engine.s.units.find((x) => x.commander === c.id && x.power === p);
  if (u === undefined) return c;
  // His battles as far as its reports have come: farther off, as its newest report gives his record.
  const i = reportIndex(engine, u);
  const record = i === null ? null : commanderReported(u.trail[i]);
  return { ...c, watchProvince: place(u), ...(record ?? {}) };
}

/** The court's own units where its view shows them (`ownPlaces`), each with its men as that report gives them, for the map (bug #615). */
export function ownUnitsShown(
  engine: TurnEngine,
  p: Power,
): { unit: Unit; province: string; men: number }[] {
  return ownPlaces(engine, p).map(({ unit, at, province }) => ({
    unit,
    province,
    men: at === null ? unit.men : trailEntry(unit.trail[at]).men,
  }));
}

/** The season a unit's report `i` is labelled with, as the view dates it ("as reported in turn N"). */
export function reportedAt(engine: TurnEngine, u: Unit, i: number): number {
  return (
    engine.s.turn -
    (u.goneTurn > 0 ? engine.s.turn - u.goneTurn : 0) -
    (u.trail.length - 1 - i)
  );
}

/**
 * A scheduled order as its court reads it, for a unit raised whose raising it has not heard of: still named by its levy
 * ("the army to be raised in nubia in turn 3"), as before the levy ran (TurnEngine.asShown).
 */
export function plannedAsKnown(
  engine: TurnEngine,
  p: Power,
  x: PlannedOrder,
): PlannedOrder {
  // One gone since, its end unheard, too: neither its raising nor its end has reached the court.
  const unheard = (id: string | null): Unit | null => {
    const u =
      id === null
        ? undefined
        : [...engine.s.units, ...engine.s.unitsGone].find(
            (y) => y.id === id && y.power === p,
          );
    return u !== undefined && !raisedKnown(engine, p, u) ? u : null;
  };
  const levy = (u: Unit) =>
    newLevyRef({ province: u.home, turn: u.since, kind: u.kind });
  const [a, b] = [unheard(x.unitId), unheard(x.otherUnitId)];
  if (a === null && b === null) return x;
  return {
    ...x,
    ...(a !== null ? { unitId: null, unitLevy: levy(a) } : {}),
    ...(b !== null ? { otherUnitId: null, otherLevy: levy(b) } : {}),
  };
}

/**
 * A seat's scheduled orders as it knows them (bug #615): those of a far unit whose march was held up or ended out of its
 * sight as they stood before, until word of it could come (`SleepState.scheduleUnheard`), the oldest such first.
 */
export function scheduleKnown(
  engine: TurnEngine,
  sl: SleepState,
): PlannedOrder[] {
  const now = engine.s.turn;
  const before = new Map<string, { turn: number; orders: PlannedOrder[] }>();
  for (const x of sortBy(
    sl.scheduleUnheard.filter((y) => y.until > now),
    [(y) => y.until, cmpNum],
  ))
    if (!before.has(x.unitId))
      before.set(x.unitId, {
        turn: x.turn,
        orders: x.orders.filter((o) => o.turn >= now),
      });
  // Orders it gave the unit since are its own, and shown.
  const kept = sl.scheduled.filter(
    (x) => x.unitId === null || x.given > (before.get(x.unitId)?.turn ?? -1),
  );
  return sortBy(
    [...kept, ...[...before.values()].flatMap((x) => x.orders)],
    [(x: PlannedOrder) => x.turn, cmpNum],
  );
}
