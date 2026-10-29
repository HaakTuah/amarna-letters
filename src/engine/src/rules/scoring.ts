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
import { ParResults } from "./par-results.ts";

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
 * ranked against a single result of 1.
 */
export function standingOf(p: Power, growth: number): number {
  return 2 * rankAmong(ParResults[p] ?? [1], growth);
}

/**
 * Where a result ranks among recorded results, from 0 to 1 (each recorded result standing at the middle of its share, so
 * the middle one at about a half): between two recorded results in proportion, below the lowest survivor in proportion to
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
  const results = ParResults[p] ?? [1];
  const lived = results.filter((r) => r > 0);
  const q = (f: number): string => (lived.length === 0 ? "-" : lived[Math.min(lived.length - 1, Math.floor(f * lived.length))].toFixed(2));
  return `${p} fell ${results.length - lived.length} of ${results.length}${lived.length === 0 ? "" : `, survivors ${q(0.25)}/${q(0.5)}/${q(0.75)}`}`;
}
