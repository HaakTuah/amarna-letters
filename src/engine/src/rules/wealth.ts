/**
 * The richest characters: at the end of a game, beside the kings' standings, every character ranked by wealth, the
 * second game played under the kings'. During play a character knows its own wealth, never the ranking. Since item 11a
 * wealth is what it holds, purse and hoard; fees owed it and debt tablets count for nothing ("Debts are facts; repayment
 * is a choice"), and the dead rank below every living character, among themselves by what they held when they died.
 */
import { cmpBool, cmpNum, desc, sortBy } from "../core/seq.ts";
import { nameFrom, type Character, type Earnings } from "../model/people.ts";
import type { GameState } from "../model/state.ts";
import { idNumber } from "../turn/core.ts";

/** One character's wealth at a moment: the gold in its purse and in its hoard. */
export interface CharacterWealth {
  character: Character;
  purse: number;
  hoard: number;
  total: number;
  dead: boolean;
}

/** What counts, said wherever the ranking is shown. */
export const WealthCounts =
  "Wealth is what a character holds: the gold in its purse and in its hoard. Fees owed it and debt tablets count for nothing. The dead rank below every living character, by what they held when they died.";

/** A character's wealth: its purse and its hoard (a hoard seized or lost is gone); the dead's as it was when it died. */
export function wealthOf(c: Character): CharacterWealth {
  const hoard = c.hoard?.gold ?? 0;
  const dead = c.status === "Dead";
  // The dead by what they held when they died (their hoard passes to the city that kept it).
  const total = dead ? (c.diedWith ?? c.purse + hoard) : c.purse + hoard;
  return { character: c, purse: dead ? total - hoard : c.purse, hoard, total, dead };
}

/** Every character, the living first, richest first (ties by id). */
export function wealthRanking(s: GameState): CharacterWealth[] {
  return sortBy(
    s.characters.map(wealthOf),
    [(w: CharacterWealth) => w.dead, cmpBool],
    [(w: CharacterWealth) => w.total, desc(cmpNum)],
    [(w: CharacterWealth) => idNumber(w.character.id), cmpNum],
  );
}

/** Who a character is at the end, in a few words: whom it serves, or that it is free, held or dead. */
export function wealthStanding(c: Character): string {
  if (c.status === "Dead") return "dead";
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
  if (e.carried > 0) parts.push(`gold kept on dismissal ${e.carried}`);
  if (e.savings > 0) parts.push(`savings ${e.savings}`);
  if (e.loot > 0) parts.push(`loot ${e.loot}`);
  if (e.news > 0) parts.push(`news and carrying ${e.news}`);
  const gained = parts.length === 0 ? "nothing gained" : parts.join(", ");
  return e.spent > 0 ? `${gained}; spent ${e.spent}` : gained;
}

/** One character's line in a ranking: "Mane of Ugarit (serving Egypt): 312 (purse 280, hoard 32; fees 250, skimmed 30)". */
export function wealthLine(w: CharacterWealth): string {
  return `${nameFrom(w.character)} (${wealthStanding(w.character)}): ${w.total} (purse ${w.purse}, hoard ${w.hoard}; ${wealthSources(w.character.earned)})`;
}

export const Wealth = { WhatCounts: WealthCounts, of: wealthOf, ranking: wealthRanking, standing: wealthStanding, sources: wealthSources, line: wealthLine };
