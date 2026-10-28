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
 * the growth a power that started where it did usually reaches by the end of a script game, among the games it is still
 * standing in, tribute paid and received included. A power is judged by its growth against its par, its standing, so a
 * city-state that holds its own against the odds and an empire that grows as empires do stand level. Measured from the
 * script games recorded in the item's report (`docs/rounds/`); a power with no measure has par 1.
 */
export const Par: ReadonlyMap<Power, number> = new Map<Power, number>([
  // Item 11+: 50 script games (seeds 1-50), each power's mean growth in the games it survived, where it survived five or
  // more; Lukka (fallen in all 50) and the Suteans (2 survivals) have no measure yet.
  ["Egypt", 0.85],
  ["Hatti", 0.87],
  ["Babylonia", 0.96],
  ["Mitanni", 0.86],
  ["Assyria", 1.01],
  ["Arzawa", 1.15],
  ["Alashiya", 0.96],
  ["Kaska", 1.14],
  ["Isuwa", 1.14],
  ["Carchemish", 0.88],
  ["Alalakh", 1.14],
  ["Aleppo", 0.83],
  ["Ugarit", 0.8],
  ["Nuhashshe", 1.04],
  ["Qadesh", 1.15],
  ["Qatna", 0.85],
  ["Arwad", 0.94],
  ["Amurru", 1.03],
  ["Byblos", 0.98],
  ["Sidon", 1.0],
  ["Damascus", 1.04],
  ["Tyre", 1.01],
  ["Megiddo", 1.12],
  ["Shechem", 1.07],
  ["Jerusalem", 1.01],
  ["Suhu", 1.18],
  ["Arrapha", 0.93],
  ["Elam", 0.96],
]);

/** A power's par: never below a tenth, so that no position's standing runs away with a small number. */
export function parOf(p: Power): number {
  return Math.max(0.1, Par.get(p) ?? 1);
}

/** Growth against par: the measure the game is won by. */
export function standingOf(p: Power, growth: number): number {
  return growth / parOf(p);
}
