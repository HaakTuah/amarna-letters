/**
 * The game's measure of a kingdom, in one place, so that the engine's score, a seat's own strength line and the script
 * kings' reckoning agree on it ("The wealth of a realm", since build order item 9+a): Strength = weight × (what its land
 * produces a season at reference prices, the whole harvest and the mines) + the gold in its treasury + its holdings (the
 * people's purses of its provinces, the grain in their stores and markets at reference prices, and what its own men
 * carry). What is owed counts neither way. The engine scores a power's true gold; a seat sees its ledger; a script king
 * reckons a rival's from public data. Growth is strength over starting strength.
 */
import type { GameConfig } from "../model/config.ts";

export function strengthOf(weight: number, landWorth: number, gold: number, holdings: number): number {
  return weight * landWorth + gold + holdings;
}

export function strength(c: GameConfig, landWorth: number, gold: number, holdings: number): number {
  return strengthOf(c.provinceWeight, landWorth, gold, holdings);
}
