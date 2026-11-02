/**
 * Talk of a province's leaning (item 17++, part D, #431): travellers' talk that the people of a province of ours lean
 * toward another king reaches us at the roads' pace, and a script king treats that province as restless, easing what it
 * is asked (`freedom.ts`), before its offer reaches the other king and he takes it up. `--no-talk-play` and
 * `--talk-play-half` ignore the talk, only to measure what heeding it is worth.
 */
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
