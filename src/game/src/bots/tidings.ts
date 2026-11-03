/**
 * Word from vassals and allies (#618): a script king reads it as he reads any word of who holds the land, into his board
 * and his reckoning of who is warlike. `--no-tidings-play` and `--tidings-play-half` make a king leave it unread, keeping
 * the holder he knew before, only to measure what reading it is worth.
 */
import { isTidingsSource, type Power, type SeatView } from "@amarna/engine";
import type { Dict } from "@amarna/engine";

export const TidingsPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The view as the king reads it: unchanged, or, if he leaves word from vassals and allies unread, with the holders he knew before. */
export function asRead(v: SeatView, before: Dict<string, Power | null>): SeatView {
  if (TidingsPlay.on(v.power)) return v;
  const told = [...v.ownerFrom.entries()].filter(([k, src]) => isTidingsSource(src) && before.has(k));
  if (told.length === 0) return v;
  const owner = v.owner.clone();
  for (const [k] of told) owner.set(k, before.get(k));
  return { ...v, owner };
}
