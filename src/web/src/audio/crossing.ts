/**
 * When the music may change piece (items 19+++b and 19+++c): it rises fast and falls slow. A player's rise crosses at the
 * next phrase end within about 8 s; a fall, or a change within a step, never cuts a piece: it plays to its end, and the
 * next is drawn after its rest (draw.ts). A spectator's music turns over calmly: a rise crosses so fast only for
 * something clear in front of him (a battle of the realm or character he watches, that realm's capital attacked), the
 * world's own heat changes it only at a piece's end, and a change of what he watches never cuts a piece, which plays on to
 * its end, or at most about 45 s, to a phrase end. A moment, or a change to or from the menu, waits up to 20 s for a
 * phrase end. The fallback, which plays phrase by phrase, holds a pass's mood through a fall until the pass ends. Pure, so
 * it is tested without a browser; the player (player.ts) asks it.
 */
import { MoodPieces, type Mood } from "./situation.ts";

/** Seconds a rise waits for a phrase end; and a moment or the menu. */
export const Wait = { rise: 8, other: 20 } as const;

/** Seconds a spectator's piece may play on after a change of what he watches, before it crosses at a phrase end. */
export const Ease = 45;

/** Whose ears the music is: a player's at his seat, or a spectator's of a realm, of a character he follows, or of the world. */
export type Ears = "own" | "realm" | "character" | "world";

/** What the music is asked to turn over to: the ears; whether something clear is in front of him; seconds since he changed what he watches (null: he has not, or it has turned over). */
export interface Turn {
  ears: Ears;
  clear: boolean;
  eyes: number | null;
}

/** How high each mood stands. */
const Rank: Record<Mood, number> = { menu: -1, calm: 0, tension: 1, last: 1, war: 2, siege: 3, battle: 3 };

/** The mood a piece is one of (null: none, or a moment's own). */
export const moodOf = (piece: string | null): Mood | null =>
  piece === null ? null : ((Object.keys(MoodPieces) as Mood[]).find((m) => MoodPieces[m].includes(piece)) ?? null);

/**
 * The mood a piece stands for: the higher of its own and the one it was drawn for (null: none, or a moment's own). A war
 * piece drawn in tension stands for war; a calm piece drawn in war for war: only a mood above both is a rise.
 */
export function heardMood(piece: string | null, drawn: Mood | null): Mood | null {
  const own = moodOf(piece);
  if (own === null || drawn === null) return own ?? drawn;
  return Rank[drawn] > Rank[own] ? drawn : own;
}

/** A change from what plays to what is asked that crosses at a phrase end: a rise, or to or from the menu or no mood. */
const rises = (from: Mood | null, to: Mood): boolean => from === null || from === "menu" || to === "menu" || Rank[to] > Rank[from];

/**
 * How long a player's change from the music playing (the mood it stands for) may wait for a phrase end before it crosses
 * anyway, in seconds; null where it waits for the piece's end instead (a fall, or a change within a step). `moment`: a
 * moment's piece is asked for.
 */
export function crossWait(heard: Mood | null, mood: Mood, moment: boolean): number | null {
  if (moment) return Wait.other;
  if (heard === mood || !rises(heard, mood)) return null;
  return heard === null || heard === "menu" || mood === "menu" ? Wait.other : Wait.rise;
}

/** A change that crosses at a phrase end: `late` crosses at the last one within `wait`, and not at all where the piece ends sooner. */
export interface Plan {
  wait: number;
  late: boolean;
}

/** Whether the mood asked outranks what plays, and the viewer is to hear it at once: a player's rise, a spectator's clear one. */
export const riseNow = (heard: Mood | null, mood: Mood, turn: Turn): boolean =>
  heard !== mood && heard !== "menu" && mood !== "menu" && rises(heard, mood) && (turn.ears === "own" || turn.clear);

/**
 * How the music changes from what plays to the mood asked, for these ears: a player's as `crossWait` gives it; a
 * spectator's rise only where something is clear in front of him; a change of what he watches, to a mood of another
 * height, after the piece or at most `Ease` s from the change; null where the piece plays on to its end.
 */
export function crossPlan(heard: Mood | null, mood: Mood, moment: boolean, turn: Turn): Plan | null {
  const wait = crossWait(heard, mood, moment);
  if (wait !== null && (moment || wait === Wait.other || turn.ears === "own" || turn.clear)) return { wait, late: false };
  if (turn.eyes !== null && heard !== null && heard !== "menu" && mood !== "menu" && Rank[heard] !== Rank[mood]) return { wait: Math.max(0, Ease - turn.eyes), late: true };
  return null;
}

/**
 * Where in a piece a change crosses, in seconds into it: the start of the crossing, or null to let the piece play to its
 * end. `phrases` are the piece's phrase ends, `now` the time into it, `lead` the crossing's lead before a phrase end, and
 * `left` the piece's length (null: not known yet). A rise takes the next phrase end within `wait`, and crosses at once
 * where none comes that soon; a late change takes the last one within `wait`, and none where the piece ends in time.
 */
export function crossAt(plan: Plan, phrases: readonly number[], now: number, lead: number, left: number | null): number | null {
  const ahead = phrases.filter((p) => p > now + lead + 0.2);
  if (!plan.late) {
    const end = ahead[0];
    return end !== undefined && end - now <= plan.wait ? end - lead : now;
  }
  if (left !== null && left - now <= plan.wait) return null;
  const within = ahead.filter((p) => p - now <= plan.wait);
  return within.length > 0 ? within[within.length - 1] - lead : now;
}

/** The fallback's pass under way: its score, the mood it plays and the stretches left of it. */
export interface Pass {
  score: string;
  mood: Mood;
  left: number;
}

/**
 * The mood the fallback's next stretch plays: the one asked for at a new pass, or at a rise the viewer is to hear at once
 * (`rise`); a fall, or a spectator's other change, waits for the pass's end.
 */
export const passMood = (pass: Pass | null, asked: Mood, rise = true): Mood => (pass === null || pass.left <= 0 || (rise && rises(pass.mood, asked)) ? asked : pass.mood);

/** The pass after a stretch of `score` (of `length` stretches) in `mood`: the same pass on, or a new one. */
export function nextPass(pass: Pass | null, mood: Mood, score: string, length: number): Pass {
  const same = pass !== null && pass.score === score && pass.left > 0;
  return { score, mood, left: (same ? pass.left : length) - 1 };
}
