/**
 * How a script king plays: his king's traits (item 17b, `model/kings.ts` in the engine), as weights from 0 to 1. No realm
 * keeps a temper of its own: the seat plays the man on its throne, as its view shows him, and a new king plays as himself.
 */
import { KingTraitValues, natureOf, natureTraits, standout, type Power } from "@amarna/engine";

export interface Personality {
  readonly epithet: string;
  readonly description: string;
  /** Appetite for war: how readily it attacks land that is not free. */
  readonly aggression: number;
  /** Weight on keeping what it has: troops held back, reserves of gold. */
  readonly caution: number;
  /** Keeps sealed oaths, sends fine gold, tells envoys the truth. */
  readonly honesty: number;
  /** Hoards gold rather than spending it. */
  readonly greed: number;
  /** Sends gifts and returns favours. */
  readonly generosity: number;
  /** Cares about titles: who is called brother and Great King. */
  readonly pride: number;
  /** Writes letters, seals tablets, builds coalitions. */
  readonly diplomacy: number;
  /** Spies, bribes, forgeries and turned captives. */
  readonly cunning: number;
  /** How long it remembers a wrong, and how hard it punishes one. */
  readonly vengeance: number;
  /** Prefers trade and bargains to conquest. */
  readonly commerce: number;
}

/** A king's personality: what is known of him, and his traits (0 to 100, in `KingTraitValues`' order) as weights. */
export function personalityOf(p: Power, traits: readonly number[]): Personality {
  const w = Object.fromEntries(KingTraitValues.map((k, i) => [k, (traits[i] ?? 50) / 100])) as Record<(typeof KingTraitValues)[number], number>;
  return { ...natureOf(p), ...w };
}

/**
 * How a rival's king is pictured: as the sources show the man of 1346, unvaried, since no court knows how this game
 * drew him; a ruler risen in play as a middling one.
 */
export function archetype(p: Power): Personality {
  return personalityOf(p, natureTraits(p));
}

/** Item 18: a rival pictured when kings' traits were rolled for the game: a middling king, judged by what he does. */
export function unknownKing(p: Power): Personality {
  return personalityOf(p, KingTraitValues.map(() => 50));
}

/** The three traits that stand out, for display (`standout` in the engine's `model/kings.ts`). */
export function highlights(t: Personality): string[] {
  return standout(KingTraitValues.map((k) => Math.round(t[k] * 100)));
}
