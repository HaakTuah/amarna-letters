/**
 * The random ending ("Random ending" and "An open age" under Victory, build order item 6a): any season may be the last
 * from the first, with a chance that grows in proportion to the season number, so that half of all games have ended by
 * the median season. The engine draws the last season once, in secret, at the start, from its own seeded stream, together
 * with the hard cap drawn from the table's range; the game ends at whichever comes first. Nothing shown reads the drawn
 * season: no view, request, look-ahead or frame.
 */
import { Rng } from "../core/rng.ts";
import type { GameConfig } from "../model/config.ts";
import { type GameState, logEvent } from "../model/state.ts";

/**
 * The rising chance's slope: the chance that season t is the last, if the age reaches it, is this × t. Found so that the
 * chance the age outlives the median season is exactly one half (about 0.02% in the first season for a median of 80).
 */
const slopes = new Map<number, number>();

export function endSlope(median: number): number {
  const m = Number.isFinite(median) ? Math.max(1, Math.round(median)) : 80;
  const known = slopes.get(m);
  if (known !== undefined) return known;
  const outlives = (k: number): number => {
    let s = 1.0;
    for (let t = 1; t <= m; t++) s *= Math.max(0, 1 - k * t);
    return s;
  };
  let lo = 0.0;
  let hi = 1.0 / m;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (outlives(mid) > 0.5) lo = mid;
    else hi = mid;
  }
  slopes.set(m, (lo + hi) / 2);
  return (lo + hi) / 2;
}

/**
 * What every seat is told of a table's median, in words with no numbers ("What kings are told" under "Random ending";
 * decided 27 October 2026, built in item 6b): an age likely to be short, of the usual length, or long. First guesses:
 * a median up to 55 seasons is short, from 110 long (since item 17 lengthened the age). A script king believes the band's own median, never the table's.
 */
export const AgeBandValues = ["Short", "Usual", "Long"] as const;
export type AgeBand = (typeof AgeBandValues)[number];
export const BandMedian: Record<AgeBand, number> = { Short: 44, Usual: 80, Long: 130 };

export function ageBand(median: number): AgeBand {
  return median <= 55 ? "Short" : median >= 110 ? "Long" : "Usual";
}

/** The rule in the band's words, as every seat reads it. */
export function bandWords(band: AgeBand): string {
  switch (band) {
    case "Short":
      return "Any season may be the last, from the first. This age is likely to be short: early on the end is unlikely, but it grows likelier quickly, with every year.";
    case "Long":
      return "Any season may be the last, from the first. This age is likely to be long: for many years the end is very unlikely, and it grows likelier only slowly, with every year.";
    default:
      return "Any season may be the last, from the first. Early on it is very unlikely, and it grows likelier with every year.";
  }
}

/** The public chance that season t is the last, if the age reaches it. */
export function endChanceAt(turn: number, median: number): number {
  return Math.min(1, endSlope(median) * turn);
}

/** The secret draw: the last season, and whether it is the cap's (null for an open age). */
export interface FinalSeason {
  season: number;
  byCap: boolean;
}

/**
 * Draws the last season once, from the stream keyed to the game's seed and "end" alone, so no other roll in the game can
 * shift it: the cap from the table's range, then season by season the rising chance, up to the cap. The same odds as a
 * draw at the close of each season.
 */
export function drawFinalSeason(seed: number, c: GameConfig): FinalSeason | null {
  if (c.openAge) return null;
  const r = Rng.for(seed, 0, "end");
  const lo = Math.max(1, Math.min(c.capMin, c.capMax) || 1);
  const cap = c.capped ? r.range(lo, Math.max(lo, c.capMax || lo)) : null;
  const k = endSlope(c.endMedian);
  for (let t = 1; cap === null || t < cap; t++) if (r.chance(Math.min(1, k * t))) return { season: t, byCap: false };
  return { season: cap!, byCap: true };
}

/** The reason a game ends when only one kingdom is left: the one ending an open age keeps. */
export const OneKingdomLeft = "only one kingdom remains";

/** Whether the table may play on into an open age: the age has ended by its last season, not because one kingdom is left. */
export function canPlayOn(s: GameState): boolean {
  return s.ended && s.endReason !== OneKingdomLeft;
}

/**
 * Plays on after the age has ended ("An open age"): its winners and reason stay recorded, the game opens into an age with
 * no end, and the next season begins. Nothing else changes.
 */
export function playOn(s: GameState): void {
  if (!canPlayOn(s)) throw new Error("Only an age that ended by its last season can be played on.");
  s.ended = false;
  s.ageEndedTurn = s.turn;
  s.ageWinners = [...s.winners];
  s.finalSeason = null;
  s.finalByCap = false;
  s.config = { ...s.config, openAge: true };
  logEvent(s, "open-age", `The table plays on: the age that ended after turn ${s.turn} opens into an age with no end.`);
  s.turn++;
}
