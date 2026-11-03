/**
 * Item 17+++, part F: the director camera, optional and off by default. As a season plays out it takes the map to the
 * scene with the most at stake: the great moment where the season's highest-stakes thread is, when it plays, or else that
 * thread's place as the season begins, or else the season's greatest moment. It reads only the viewer's own threads and
 * the moments of the viewer's own scene, so it shows nothing the eyes it follows do not know, and it chooses only where
 * the map looks, never what happens.
 */
import type { Thread } from "@amarna/game";
import { city, type Pt } from "./art.ts";
import type { MapMoment } from "./moments.ts";
import type { Phase, Timeline } from "../session/pacing.ts";

/** Where the camera goes, and when, in milliseconds from the season's start. */
export interface Shot {
  at: Pt;
  time: number;
}

/** A thread's weight against the others: troops in one's own capital above any share. */
const weight = (t: Thread): number => (t.capital ? 100 : 0) + t.moved;
/** Among moments no thread weighs, the greater first: a fall, a battle, a disaster, an arrival. */
const Greater: readonly Phase[] = ["fall", "battle", "disaster", "arrival"];
const same = (a: Pt, b: Pt): boolean => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;

/** The season's one shot for `threads` (the viewer's, ranked) over its timeline, or null when nothing has a place. */
export function directorShot(timeline: Timeline<MapMoment>, threads: readonly Thread[]): Shot | null {
  const placed = threads.filter((t) => t.province !== "").map((t) => ({ at: city(t.province), weight: weight(t) }));
  const beats = timeline.beats.filter((b) => b.moment.kind === "great" && b.moment.at !== null);
  let best: { shot: Shot; weight: number; rank: number } | null = null;
  for (const b of beats) {
    const at = b.moment.at!;
    const w = Math.max(-1, ...placed.filter((p) => same(p.at, at)).map((p) => p.weight));
    const rank = Greater.indexOf(b.moment.phase);
    if (best === null || w > best.weight || (w === best.weight && rank >= 0 && (best.rank < 0 || rank < best.rank))) best = { shot: { at, time: b.at }, weight: w, rank };
  }
  const top = placed.length === 0 ? null : placed.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (top !== null && (best === null || top.weight > best.weight)) return { at: top.at, time: 0 };
  return best?.shot ?? null;
}
