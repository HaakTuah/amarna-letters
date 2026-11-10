/**
 * When the music may change piece (item 19+++b): it rises fast and falls slow. A rise crosses at the next phrase end
 * within about 8 s; a fall, or a change within a step, never cuts a piece: it plays to its end and rests before the
 * calmer music; a moment, or a change to or from the menu, waits up to 20 s for a phrase end. The fallback, which plays
 * phrase by phrase, holds a pass's mood through a fall until the pass ends. Pure, so it is tested without a browser; the
 * player (player.ts) asks it.
 */
import { MoodPieces, type Mood } from "./situation.ts";

/** Seconds a rise waits for a phrase end; and a moment or the menu. */
export const Wait = { rise: 8, other: 20 } as const;

/** How high each mood stands. */
const Rank: Record<Mood, number> = { menu: -1, calm: 0, tension: 1, last: 1, war: 2, siege: 3, battle: 3 };

/** The mood a piece is one of (null: none, or a moment's own). */
export const moodOf = (piece: string | null): Mood | null =>
  piece === null ? null : ((Object.keys(MoodPieces) as Mood[]).find((m) => MoodPieces[m].includes(piece)) ?? null);

/** A change from what plays to what is asked that crosses at a phrase end: a rise, or to or from the menu or no mood. */
const rises = (from: Mood | null, to: Mood): boolean => from === null || from === "menu" || to === "menu" || Rank[to] > Rank[from];

/**
 * How long a change from the piece playing may wait for a phrase end before it crosses anyway, in seconds; null where
 * it waits for the piece's end instead (a fall, or a change within a step). `moment`: a moment's piece is asked for.
 */
export function crossWait(playing: string | null, mood: Mood, moment: boolean): number | null {
  if (moment) return Wait.other;
  const from = moodOf(playing);
  if (!rises(from, mood)) return null;
  return from === null || from === "menu" || mood === "menu" ? Wait.other : Wait.rise;
}

/** Whether the music rests 4 to 12 s after a piece ends: in the quiet moods, and after a fall, before the calmer music. */
export function restsAfter(ended: string | null, mood: Mood): boolean {
  const from = moodOf(ended);
  const fell = from !== null && from !== mood && !rises(from, mood);
  return fell || mood === "calm" || mood === "menu" || mood === "tension" || mood === "last";
}

/** The fallback's pass under way: its score, the mood it plays and the stretches left of it. */
export interface Pass {
  score: string;
  mood: Mood;
  left: number;
}

/** The mood the fallback's next stretch plays: the one asked for at a rise or a new pass; a fall waits for the pass's end. */
export const passMood = (pass: Pass | null, asked: Mood): Mood => (pass === null || pass.left <= 0 || rises(pass.mood, asked) ? asked : pass.mood);

/** The pass after a stretch of `score` (of `length` stretches) in `mood`: the same pass on, or a new one. */
export function nextPass(pass: Pass | null, mood: Mood, score: string, length: number): Pass {
  const same = pass !== null && pass.score === score && pass.left > 0;
  return { score, mood, left: (same ? pass.left : length) - 1 };
}
