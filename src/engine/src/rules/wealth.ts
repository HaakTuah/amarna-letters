/**
 * The richest characters: at the end of a game, beside the kings' standings, the living characters ranked by wealth, the
 * second game played under the kings'. During play a character knows its own wealth, never the ranking.
 */
import { cmpNum, desc, sortBy } from "../core/seq.ts";
import type { Character, Earnings } from "../model/people.ts";
import type { GameState } from "../model/state.ts";
import { idNumber } from "../turn/core.ts";

/** One character's wealth at a moment: the gold in its purse and the back pay kings still owe it. */
export interface CharacterWealth {
  character: Character;
  purse: number;
  backPay: number;
  total: number;
}

/** What counts, said wherever the ranking is shown. */
export const WealthCounts =
  "Wealth is the gold in a character's purse and the back pay kings still owe it; hoards and loans to kings on debt tablets do not exist yet. The dead are not ranked.";

/** A character's wealth: its purse and the back pay owed it by every court (a fallen court's debt died with it). */
export function wealthOf(c: Character): CharacterWealth {
  let backPay = 0;
  for (const v of c.backPay.values()) backPay += v;
  return { character: c, purse: c.purse, backPay, total: c.purse + backPay };
}

/** The living characters, richest first (ties by id). */
export function wealthRanking(s: GameState): CharacterWealth[] {
  return sortBy(
    s.characters.filter((c) => c.status !== "Dead").map(wealthOf),
    [(w: CharacterWealth) => w.total, desc(cmpNum)],
    [(w: CharacterWealth) => idNumber(w.character.id), cmpNum],
  );
}

/** Who a character is at the end, in a few words: whom it serves, or that it is free or held. */
export function wealthStanding(c: Character): string {
  if (c.status === "Captured" && c.heldBy !== null) return `captive in ${c.heldBy}` + (c.employer !== null ? `, serving ${c.employer}` : "");
  return c.employer !== null ? `serving ${c.employer}` : "free";
}

/** Where its gold came from, in one line ("wages 120, skimmed 10, gifts 40"). */
export function wealthSources(e: Earnings): string {
  const parts: string[] = [];
  if (e.wages > 0) parts.push(`wages ${e.wages}`);
  if (e.skimmed > 0) parts.push(`skimmed ${e.skimmed}`);
  if (e.gifts > 0) parts.push(`gifts ${e.gifts}`);
  if (e.carried > 0) parts.push(`gold kept on dismissal ${e.carried}`);
  return parts.length === 0 ? "nothing gained" : parts.join(", ");
}

/** One character's line in a ranking: "Mane of Ugarit (serving Egypt): 312 (purse 280, back pay owed 32; wages 250, skimmed 30)". */
export function wealthLine(w: CharacterWealth): string {
  return `${w.character.name} of ${w.character.origin} (${wealthStanding(w.character)}): ${w.total} (purse ${w.purse}, back pay owed ${w.backPay}; ${wealthSources(w.character.earned)})`;
}

export const Wealth = { WhatCounts: WealthCounts, of: wealthOf, ranking: wealthRanking, standing: wealthStanding, sources: wealthSources, line: wealthLine };
