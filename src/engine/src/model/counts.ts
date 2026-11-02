/**
 * What a king can count (build order item 17++, part B; "Counts as the scribes knew them", "A census" and "The king says
 * how much he wants" under The world): a king knows his provinces' people and fields only as his scribes last counted
 * them, dated; a census sends scribes to count a province afresh, paid and taking seasons, its count travelling home;
 * and the king asks each province for its grain either as a share of what it reaps or as an amount. The engine and the
 * god view keep the exact figures. Every number here is a first guess, tuned in item 18.
 */
import { Dict } from "../core/collections.ts";
import { I, type ObjSchema, S, obj, opt } from "../core/json.ts";
import { economyOf } from "./economy.ts";
import type { WorldMap } from "./map.ts";
import type { GameState } from "./state.ts";

/**
 * A province as a king's scribes counted it, on the season `turn`: its settled on the land, the men of fighting age among
 * them and the loose; the people of its town; the last harvest reaped; and what the farmers held in their granaries and
 * had growing in the fields.
 */
export interface Count {
  province: string;
  turn: number;
  settled: number;
  men: number;
  loose: number;
  town: number;
  harvest: number;
  granary: number;
  crop: number;
}

export const CountSchema: ObjSchema<Count> = obj(
  "Count",
  (init: Partial<Count> = {}) => ({ province: "", turn: 0, settled: 0, men: 0, loose: 0, town: 0, harvest: 0, granary: 0, crop: 0, ...init }),
  { province: S, turn: I, settled: I, men: I, loose: I, town: I, harvest: I, granary: I, crop: I },
);

/**
 * Scribes a king sent to count a province: they count it in the season `counted` and their count, once taken (`count`),
 * reaches his court in the season `home`, with its people's mood as they found it (item 17++, part C; "" until counted).
 */
export interface Census {
  power: string;
  province: string;
  counted: number;
  home: number;
  count: Count | null;
  mood: string;
}

export const CensusSchema: ObjSchema<Census> = obj(
  "Census",
  (init: Partial<Census> = {}) => ({ power: "Egypt", province: "", counted: 0, home: 0, count: null, mood: "", ...init }),
  { power: S, province: S, counted: I, home: I, count: opt(() => CountSchema), mood: S },
);

/**
 * The first guesses of counting and demands (item 18 tunes them).
 * - `seasons`: the seasons the scribes take to count a province, after they arrive.
 * - `gold`: their pay for counting a province, in shekels, the same for every province (a fee the king knows before he
 *   sends them, not a figure that would tell him how many they will find).
 * - `hidePerSeason`, `hidePerFar`, `hideMost`: of a share asked, the part a province hides, in percent: one point for
 *   every season since its last count, and `hidePerFar` for every season its word takes to reach the court beyond the
 *   first, at most `hideMost` ("lets it hide more the older his count and the farther it lies").
 * - `hideUncounted`: what a province hides of a share while its king has never counted it (land he took and never
 *   counted).
 */
export const CountData = {
  seasons: 1,
  gold: 3,
  hidePerSeason: 1,
  hidePerFar: 2,
  hideMost: 30,
  hideUncounted: 20,
};

/** Of a share asked, the part a province hides, in percent, by its count's age in seasons (null: never counted) and its distance. */
export function hiddenPercent(age: number | null, seasonsAway: number): number {
  const far = CountData.hidePerFar * Math.max(0, Number.isFinite(seasonsAway) ? seasonsAway - 1 : 4);
  const old = age === null ? CountData.hideUncounted : CountData.hidePerSeason * Math.max(0, age);
  return Math.min(CountData.hideMost, old + far);
}

/** A province counted now, as the scribes find it: the exact figures of the season. */
export function takeCount(s: GameState, map: WorldMap, province: string): Count {
  const x = s.people.tryGet(province) ?? { settled: 0, men: 0, loose: 0 };
  return {
    province,
    turn: s.turn,
    settled: x.settled,
    men: x.men,
    loose: x.loose,
    town: economyOf(map.get(province)).town * 1000,
    harvest: s.reaped.getOrDefault(province, 0),
    granary: s.granary.getOrDefault(province, 0),
    crop: s.crop.getOrDefault(province, 0),
  };
}

/** A king's last count of a province that has reached his court, or null if he has none. */
export function countOf(s: GameState, power: string, province: string): Count | null {
  return s.counts.tryGet(power)?.tryGet(province) ?? null;
}

/** Keep a count that has reached a king's court, in place of an older one. */
export function keepCount(s: GameState, power: string, c: Count): void {
  let mine = s.counts.tryGet(power);
  if (mine === undefined) s.counts.set(power, (mine = new Dict()));
  const old = mine.tryGet(c.province);
  if (old === undefined || old.turn <= c.turn) mine.set(c.province, c);
}

/**
 * The seasons before the first in which each court last counted its land ("at the start each court has the counts its
 * sources suggest (Egypt counted often, so its counts are recent; most others' are older)", "Counts as the scribes knew
 * them"): different data under the same rules. First guesses, for item 18: Egypt two seasons, every other court two years.
 */
export const StartCountAge: { readonly default: number; readonly by: Readonly<Partial<Record<string, number>>> } = { default: 8, by: { Egypt: 2 } };

/**
 * Every court starts with a count of the land it holds, as its scribes last counted it before the game (`StartCountAge`),
 * before the first season's harvest is reaped.
 */
export function seedCounts(s: GameState, map: WorldMap): void {
  for (const p of map.landProvinces) {
    const holder = s.owner.getOrDefault(p.id, null);
    if (holder !== null) keepCount(s, holder, { ...takeCount(s, map, p.id), turn: s.turn - (StartCountAge.by[holder] ?? StartCountAge.default) });
  }
}

/**
 * The figures a count of people shows by its age in seasons ("Counts as the scribes knew them": "a fresh count shows its
 * figure and its date, each year older it shows one figure less, down to one"): two while under a year old, then one.
 * A land never counted shows only a rough guess, at one figure.
 */
export function countFigures(age: number | null): number {
  return age === null ? 1 : Math.max(1, 2 - Math.floor(Math.max(0, age) / 4));
}

/** `n` to `figures` significant figures: 18,400 to two is 18,000; numbers with no more figures than that stay as they are. */
export function toFigures(n: number, figures: number): number {
  if (n <= 0) return 0;
  // Integer steps only, so every engine rounds alike: the step is the power of ten below the last figure kept.
  let top = 1;
  for (let i = 0; i < figures; i++) top *= 10;
  let step = 1;
  while (Math.round(n / step) >= top) step *= 10;
  return Math.round(n / step) * step;
}
