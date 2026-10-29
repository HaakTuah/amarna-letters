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
 * Par for each starting position ("One scoreboard for every power", designed in build order item 11+, tuned in item 18):
 * the growth a power that started where it did reaches by the end of a script game on the mean over all games, a fall
 * counted as 0, so that survival itself scores (item 11d, Haakon's answer to item 11+'s review), tribute paid and
 * received included. A power is judged by its growth against its par, its standing, so a
 * city-state that holds its own against the odds and an empire that grows as empires do stand level. Measured from the
 * script games recorded in the item's report (`docs/rounds/`); a power with no measure has par 1.
 */
export const Par: ReadonlyMap<Power, number> = new Map<Power, number>([
  // Item 11d: 50 script games (seeds 1-50), each power's mean growth over every game, a fall counted as 0 (`parOf` keeps
  // it from going below a tenth: Arrapha fell in all 50).
  ["Egypt", 0.86],
  ["Hatti", 1.17],
  ["Babylonia", 0.95],
  ["Mitanni", 0.82],
  ["Assyria", 1.2],
  ["Arzawa", 0.89],
  ["Alashiya", 0.94],
  ["Kaska", 0.17],
  ["Lukka", 0.08],
  ["Seha", 0.57],
  ["Mira", 0.65],
  ["Isuwa", 0.81],
  ["Carchemish", 0.72],
  ["Alalakh", 0.85],
  ["Aleppo", 0.81],
  ["Ugarit", 0.76],
  ["Nuhashshe", 0.55],
  ["Qadesh", 1.45],
  ["Qatna", 0.69],
  ["Arwad", 0.95],
  ["Amurru", 0.76],
  ["Byblos", 1],
  ["Sidon", 0.83],
  ["Damascus", 0.54],
  ["Tyre", 0.96],
  ["Megiddo", 0.88],
  ["Shechem", 0.95],
  ["Jerusalem", 0.58],
  ["Terqa", 0.21],
  ["Suhu", 0.52],
  ["Suteans", 0.16],
  ["Arrapha", 0],
  ["Elam", 0.47],
]);

/** A power's par: never below a tenth, so that no position's standing runs away with a small number. */
export function parOf(p: Power): number {
  return Math.max(0.1, Par.get(p) ?? 1);
}

/** Growth against par: the measure the game is won by. */
export function standingOf(p: Power, growth: number): number {
  return growth / parOf(p);
}
