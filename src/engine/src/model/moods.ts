/**
 * The mood of the land as each court knows it (build order item 17++, part C; "Who holds what, and the mood of the land"
 * under Interface): a dated read of how a province's people stand under its holder, in the words they were told it, from
 * the one who told it. A court knows a read only from the season it reaches it (`known`), and it ages from the season it
 * was seen (`seen`), so it can be wrong. The god view reads the land as it is and keeps none of these.
 */
import { I, type ObjSchema, S, obj } from "../core/json.ts";
import type { Power } from "./power.ts";
import type { GameState } from "./state.ts";

/**
 * Who told a court a province's mood: its governor's report, a spy watching it, an envoy at the court whose city it is,
 * scribes counting it, travellers' talk of the land near the court, or the court's own eyes in its city.
 */
export type MoodSource = "governor" | "spy" | "envoy" | "census" | "travellers" | "court";

/** One court's read of one province's mood: the words as said ("quiet", "uneasy", "restless", "near revolt"). */
export interface MoodRead {
  power: Power;
  province: string;
  mood: string;
  seen: number;
  known: number;
  source: MoodSource;
}

export function newMoodRead(init: Partial<MoodRead> = {}): MoodRead {
  return { power: "Egypt", province: "", mood: "quiet", seen: 0, known: 0, source: "court", ...init };
}

export const MoodReadSchema: ObjSchema<MoodRead> = obj("MoodRead", newMoodRead, { power: S, province: S, mood: S, seen: I, known: I, source: S });

/**
 * A court's reads that have reached it by `turn`, the newest seen for each province (on a tie, the last told): what its
 * mood view draws.
 */
export function moodsKnown(s: GameState, p: Power, turn = s.turn): Map<string, MoodRead> {
  const out = new Map<string, MoodRead>();
  for (const r of s.moodReads) {
    if (r.power !== p || r.known > turn) continue;
    const had = out.get(r.province);
    if (had === undefined || r.seen >= had.seen) out.set(r.province, r);
  }
  return out;
}

/**
 * Keeps the list bounded, once a season: for each court and province, the newest read that has reached it and any still
 * on their way; a fallen court's reads go.
 */
export function pruneMoodReads(s: GameState, alive: (p: Power) => boolean): void {
  const newest = new Map<string, number>();
  for (const r of s.moodReads) {
    if (r.known > s.turn) continue;
    const k = `${r.power}|${r.province}`;
    newest.set(k, Math.max(newest.get(k) ?? -Infinity, r.seen));
  }
  const kept = new Set<string>();
  // From the newest told, so the last of equal reads is the one kept.
  const out: MoodRead[] = [];
  for (let i = s.moodReads.length - 1; i >= 0; i--) {
    const r = s.moodReads[i];
    if (!alive(r.power)) continue;
    const k = `${r.power}|${r.province}`;
    const top = newest.get(k);
    if (r.known > s.turn) out.push(r);
    else if (r.seen === top && !kept.has(k)) {
      kept.add(k);
      out.push(r);
    }
  }
  s.moodReads = out.reverse();
}
