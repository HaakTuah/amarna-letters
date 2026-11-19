/**
 * The game's measure of a kingdom, in one place, so that the engine's score, a seat's own strength line and the script
 * kings' reckoning agree on it ("The wealth of a realm", since build order item 9+a): Strength = weight × (what its land
 * produces a season at reference prices, the whole harvest and the mines) + the gold in its treasury + its holdings (the
 * people's purses of its provinces, the grain in their stores and markets at reference prices, and what its own men
 * carry). What it holds, never what it owes or is owed: since item 11a ("Debts are facts; repayment is a choice", the
 * scoring change of 21 October 2026) fees owed and debts count for nothing, borrowed gold counting as the borrower's. The
 * engine scores a power's true gold; a seat sees its ledger; a script king reckons a rival's from public data. Growth is
 * strength over starting strength.
 */
import type { GameConfig } from "../model/config.ts";
import type { Power } from "../model/power.ts";
import { CharacterPar, ParResults, ParSeasons } from "./par-results.ts";

export function strengthOf(
  weight: number,
  landWorth: number,
  gold: number,
  holdings: number,
): number {
  return weight * landWorth + gold + holdings;
}

export function strength(
  c: GameConfig,
  landWorth: number,
  gold: number,
  holdings: number,
): number {
  return strengthOf(c.provinceWeight, landWorth, gold, holdings);
}

/**
 * Par for each starting position ("One scoreboard for every power", designed in build order item 11+, ranked since item
 * 11e, tuned in item 18): the results a power that started where it did reaches by the end of the script games, each its
 * growth, a fall counted as the lowest of all (recorded as 0), tribute paid and received included ({@link ParResults},
 * measured from the script games recorded in the item's report, `docs/rounds/`). A power is judged by where its result
 * ranks among its own position's results, its standing: 1 at the middle of them, 2 above them all, and below 1 short of
 * the middle, so every position has the same chance when played as the scripts play, and surviving where most fall still
 * counts (item 11e: a mean with falls counted as 0 let any survivor of a fragile position win). A power with no measure is
 * ranked against a single result of 1. Since item 18, part F4, a result is ranked among par's games nearest in length to the
 * age it was reached in ({@link ParNear}), `seasons` long.
 */
export function standingOf(p: Power, growth: number, seasons: number): number {
  return 2 * rankAmong(ParResults[p] === undefined ? [1] : parAt(seasons).powers[p]!, growth);
}

/** Where a character's result ranks among what the best characters of par's games nearest in length gained ({@link CharacterPar}). */
export function characterStanding(result: number, seasons: number): number {
  return rankAmong(parAt(seasons).characters, result);
}

/**
 * Item 18, part F4: how many of par's games a result is ranked among, those nearest in length to its age (all of them where
 * par holds fewer). A power that usually grows stands low in a short age and high in a long one, one that usually falls the
 * reverse, so ranked among par's games of every length the age's random end, not play, chose the winner: in par's own
 * games those of the shortest half put Egypt, Hatti and Babylonia about a third of the way up their results and Mitanni and
 * Assyria two thirds, and the longest half the reverse (the measure in `docs/rounds/2026-11-19-balance-pass-f4.md`).
 */
export const ParNear = 30;

/** Par's results of the games nearest in length to an age of `seasons`, sorted for {@link rankAmong}. */
interface ParAt {
  powers: Partial<Record<Power, number[]>>;
  characters: number[];
}

const parAtCache = new Map<number, ParAt>();

function parAt(seasons: number): ParAt {
  let at = parAtCache.get(seasons);
  if (at !== undefined) return at;
  // The nearest games in length, the earlier first where two are as near.
  const games = ParSeasons.map((n, i) => [Math.abs(n - seasons), i] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .slice(0, ParNear)
    .map(([, i]) => i);
  const sorted = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);
  const powers: Partial<Record<Power, number[]>> = {};
  for (const [p, results] of Object.entries(ParResults) as [Power, readonly number[]][]) powers[p] = sorted(games.map((i) => results[i]));
  at = { powers, characters: sorted(games.flatMap((i) => CharacterPar[i])) };
  parAtCache.set(seasons, at);
  return at;
}

/**
 * Item 18, part F2 (#825: "a character wins now and then"): a character's par is what the best this many characters of
 * each script game gained, not every character's: a realm is measured against one result a game, and some 300
 * characters each measured against all of theirs would together stand first in a third of the games.
 */
export const CharacterParBest = 5;

/**
 * Where a result ranks among recorded results, from 0 to 1 (each recorded result standing at the middle of its share, so
 * the middle one at about a half, a result tied with several at the middle of their run): between two recorded results in proportion, below the lowest survivor in proportion to
 * its growth, and above the highest towards 1 as the result grows. Falls are recorded as 0 and rank lowest; a living
 * power's result is above them.
 */
export function rankAmong(results: readonly number[], growth: number): number {
  const n = results.length;
  if (n === 0) return 0.5;
  const falls = results.filter((r) => r <= 0).length;
  const lived = results.filter((r) => r > 0);
  const at = (i: number): number => (falls + i + 0.5) / n;
  if (growth <= 0) return falls / n / 2;
  if (lived.length === 0) return 1;
  // A result equal to recorded ones stands at the middle of their run (item 17b, part D: most characters gain nothing).
  const tied = lived.indexOf(growth);
  if (tied >= 0) return (at(tied) + at(lived.lastIndexOf(growth))) / 2;
  if (growth <= lived[0]) return falls / n + (0.5 / n) * (growth / lived[0]);
  const top = lived[lived.length - 1];
  if (growth >= top) return at(lived.length - 1) + (0.5 / n) * (1 - top / growth);
  let i = 0;
  while (lived[i + 1] < growth) i++;
  const lo = lived[i];
  const hi = lived[i + 1];
  return hi === lo ? at(i) : at(i) + ((growth - lo) / (hi - lo)) * (at(i + 1) - at(i));
}

/**
 * The final score (item 11e, decided 29 October 2026): a realm's size, its wealth as a share of the largest living
 * realm's, and its performance, the rank of its growth among its own position's results ({@link rankAmong}), both from 0
 * to 1, weighted together by `sizeWeight` percent for size. The highest score is the one true winner, and every placement
 * counts.
 */
/** A power's final score, and the size and performance it blends, each from 0 to 1 (item 11e). */
export interface FinalScore {
  power: Power;
  score: number;
  size: number;
  performance: number;
}

export function finalScore(sizeWeight: number, size: number, performance: number): number {
  return (sizeWeight * size + (100 - sizeWeight) * performance) / 100;
}

/** How a position's results read: how often it fell, and its survivors' growth at the quarters (for the rulebook). */
export function parSummary(p: Power): string {
  const results = [...(ParResults[p] ?? [1])].sort((a, b) => a - b);
  const lived = results.filter((r) => r > 0);
  const q = (f: number): string => (lived.length === 0 ? "-" : lived[Math.min(lived.length - 1, Math.floor(f * lived.length))].toFixed(2));
  return `${p} fell ${results.length - lived.length} of ${results.length}${lived.length === 0 ? "" : `, survivors ${q(0.25)}/${q(0.5)}/${q(0.75)}`}`;
}
