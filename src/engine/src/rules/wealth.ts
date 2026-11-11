/**
 * A character's wealth, what it holds on the one scoreboard of every person (item 17b, part D; `turn/scoreboard.ts`). During
 * play a character knows its own wealth, never the ranking. Since item 11a wealth is what it holds, purse and hoard; fees
 * owed it and debt tablets count for nothing ("Debts are facts; repayment is a choice"), and the dead rank below every
 * living person, among themselves by what they held when they died.
 */
import type { Character, Earnings } from "../model/people.ts";

/** One character's wealth at a moment: the gold in its purse and in its hoard. */
export interface CharacterWealth {
  character: Character;
  purse: number;
  hoard: number;
  total: number;
  dead: boolean;
}

/** What counts on the one scoreboard, said wherever it is shown (item 17b, part D). */
export const WealthCounts =
  "Every person is on one scoreboard, by what he holds blended with how he did against par for his own start. A king holds his realm, measured from his accession against what he inherited; a character holds the gold in his purse and hoard, measured by what he gained since he came into play against what the best five characters of each trial game gained. Fees owed and debt tablets count for nothing. The dead rank below every living person, by what they held when they died.";

/** A character's wealth: its purse and its hoard (a hoard seized or lost is gone); the dead's as it was when it died. */
export function wealthOf(c: Character): CharacterWealth {
  const hoard = c.hoard?.gold ?? 0;
  const dead = c.status === "Dead";
  // The dead by what they held when they died (their hoard passes to the city that kept it).
  const total = dead ? (c.diedWith ?? c.purse + hoard) : c.purse + hoard;
  return { character: c, purse: dead ? total - hoard : c.purse, hoard, total, dead };
}

/** Who a character is at the end, in a few words: whom it serves, or that it is free, held or dead. */
export function wealthStanding(c: Character): string {
  if (c.status === "Dead") return "dead";
  // A king (item 17b) and a risen ruler rule; they serve nobody.
  if (c.duty === "Ruling" && c.employer !== null) return `ruling ${c.employer}`;
  if (c.status === "Captured" && c.heldBy !== null) return `captive in ${c.heldBy}` + (c.employer !== null ? `, serving ${c.employer}` : "");
  return c.employer !== null ? `serving ${c.employer}` : "free";
}

/** Where its gold came from and went, in one line ("fees 120, skimmed 10, gifts 40; spent 60"). */
export function wealthSources(e: Earnings): string {
  const parts: string[] = [];
  if (e.fees > 0) parts.push(`fees ${e.fees}`);
  if (e.dealt > 0) parts.push(`lending and dealing ${e.dealt}`);
  if (e.skimmed > 0) parts.push(`skimmed ${e.skimmed}`);
  if (e.gifts > 0) parts.push(`gifts ${e.gifts}`);
  if (e.carried > 0) parts.push(`gold kept on dismissal or capture ${e.carried}`);
  if (e.savings > 0) parts.push(`savings ${e.savings}`);
  if (e.loot > 0) parts.push(`loot ${e.loot}`);
  if (e.news > 0) parts.push(`news and carrying ${e.news}`);
  const gained = parts.length === 0 ? "nothing gained" : parts.join(", ");
  return e.spent > 0 ? `${gained}; spent ${e.spent}` : gained;
}

export const Wealth = { WhatCounts: WealthCounts, of: wealthOf, standing: wealthStanding, sources: wealthSources };
