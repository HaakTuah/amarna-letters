/**
 * The game's measure of a kingdom, in one place, so that the engine's score, a seat's own strength line and the script
 * kings' reckoning agree on it: Strength = weight × (base yield of the land held) + gold − back pay owed. The engine scores
 * a power's true gold and the back pay it really owes; a seat sees its ledger and the back pay it believes it owes; a
 * script king reckons a rival's with none owed, since it cannot see it. Growth is strength over starting strength.
 */
import type { GameConfig } from "../model/config.ts";

export function strengthOf(weight: number, landYield: number, gold: number, owed: number): number {
  return weight * landYield + gold - owed;
}

export function strength(c: GameConfig, landYield: number, gold: number, owed: number): number {
  return strengthOf(c.provinceWeight, landYield, gold, owed);
}
