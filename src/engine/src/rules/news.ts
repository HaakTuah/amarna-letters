/**
 * Characters as sellers of news (build order item 11b): what a free person saw at a court it stood at, which it offers at
 * another court at a price it sets, as it sets its fee. News ages: a seller from far away offers old news.
 */
import { idiv } from "../core/num.ts";
import type { Character, NewsHeld } from "../model/people.ts";
import type { Power } from "../model/power.ts";
import type { GameState } from "../model/state.ts";

/**
 * First guesses: news older than `maxAge` seasons is not offered; a seller asks `perLine` shekels a report line plus
 * `base`, more by its greed (up to `greedPercent` more), less by a `agePercent` in a hundred for each season of age. A
 * servant selling its master's secrets is found out `secretsCaught` times in a hundred.
 */
export const NewsData = { maxAge: 6, perLine: 3, base: 4, greedPercent: 100, agePercent: 15, keep: 3, secretsCaught: 30 } as const;

/** What a seller asks for its news, as of now. */
export function newsPrice(c: Character, n: NewsHeld, turn: number): number {
  const age = Math.max(0, turn - n.turn);
  const whole = (NewsData.base + NewsData.perLine * n.lines.length) * (100 + idiv(c.traits.greed * NewsData.greedPercent, 100));
  return Math.max(1, idiv(whole * Math.max(10, 100 - NewsData.agePercent * age), 10000));
}

/** The news a person standing at `viewer`'s court offers it: of other courts, not too old. */
export function newsOffered(s: GameState, c: Character, viewer: Power): NewsHeld[] {
  if (c.status === "Dead" || c.at !== viewer || c.heldBy !== null) return [];
  return c.news.filter((n) => n.court !== viewer && s.turn - n.turn <= NewsData.maxAge).map((n) => ({ ...n, price: newsPrice(c, n, s.turn) }));
}
