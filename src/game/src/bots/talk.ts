/**
 * Talk of a province's leaning (item 17++, part D, #431): "each of whom may act on it: the king with concessions, a governor
 * or troops, his enemies by courting the claimant". Travellers' talk that the people of a province of ours lean toward
 * another king reaches us at the roads' pace, and a script king treats that province as restless, easing what it is asked
 * (`freedom.ts`), before its offer reaches the other king and he takes it up. Talk that a rival's province leans toward
 * someone warms a script king to that claimant (`Brain.learn`). `--no-talk-play` and `--talk-play-half` ignore the talk,
 * only to measure what heeding it is worth.
 */
import type { Power } from "@amarna/engine";
import { Board } from "./board.ts";

/** Script kings that ignore talk of their land's leaning (`--no-talk-play`, `--talk-play-half`). None by default. */
export const TalkPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The provinces of ours that talk this season says lean toward another king. */
export function talkedAway(b: Board): string[] {
  if (!TalkPlay.on(b.me)) return [];
  const out: string[] = [];
  for (const m of b.v.inbox) {
    if (!m.title.startsWith("Talk of ") || !m.body.includes(" lean toward ")) continue;
    const p = Board.Map.provinces.find((q) => q.name === m.title.slice("Talk of ".length));
    if (p !== undefined && b.ownerOf(p.id) === b.me && !out.includes(p.id)) out.push(p.id);
  }
  return out;
}

/** How much a script king's trust in a claimant rises on talk that a rival's land leans toward him (a first guess). */
export const CourtTrust = 0.1;

/** The claimants that talk this season says a rival's people lean toward: "lean toward X, away from H", ours being neither. */
export function claimantsTalkedOf(b: Board): Power[] {
  if (!TalkPlay.on(b.me)) return [];
  const out: Power[] = [];
  for (const m of b.v.inbox) {
    if (!m.title.startsWith("Talk of ")) continue;
    const at = m.body.indexOf(" lean toward ");
    const away = m.body.indexOf(", away from ");
    if (at < 0 || away < 0) continue;
    const claimant = m.body.slice(at + " lean toward ".length, away) as Power;
    if (claimant !== b.me && !out.includes(claimant)) out.push(claimant);
  }
  return out;
}
