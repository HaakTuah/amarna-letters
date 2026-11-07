/**
 * A script king afield (build order item 17b, part C, "the king commands from where he is"): when his largest army fights
 * where his couriers from his court come only a season late, he goes to it without his court, to a walled city of his own
 * that no foreign troops stand in or next to, from where his orders reach that army within the season; a cautious king
 * stays at his court. He goes back to his court when no such fight is left, or when foes come near where he stands.
 */
import { cmpNum, cmpStr, moveCourt, sortBy, type Order, type UnitView } from "@amarna/engine";
import { Board } from "./board.ts";
import { personalityOf } from "./personality.ts";
import { courierRoute, knownWays } from "./works.ts";

/** Script kings that never leave their courts (`--no-field-play`), or half of them (`--field-play-half`). None by default. */
export const FieldPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A king this cautious, or more (0 to 1), never leaves his court for the front (a first guess of the bots). */
const StaysHome = 0.75;

/** The king's journey for the season, without his court: to the front, or back to his court. */
export function kingAfield(b: Board, orders: Order[]): void {
  if (!FieldPlay.on(b.me)) return;
  const v = b.v;
  // Only a king free and reigning travels; one on the road goes on.
  if (v.kingTo !== null || ![...v.court, ...v.known].some((c) => c.kingOf === v.power && c.status === "employed")) return;
  const here = v.seat;
  const ways = knownWays(v);
  const seasons = (from: string, to: string): number => (from === to ? 0 : (courierRoute(v, ways, to, from)?.seasons ?? Infinity));
  const foes = new Set(b.others.map((u) => u.province));
  const danger = (x: string): boolean => foes.has(x) || Board.Map.neighbors(x).some((n) => foes.has(n));
  // His armies in a fight his couriers from the court reach late: laying a siege, or with foreign troops beside them.
  const fights = sortBy(
    b.mine.filter((u) => u.kind === "Army" && (v.sieges.some((x) => x.province === u.province && x.besieger === b.me) || danger(u.province)) && seasons(v.courtAt, u.province) >= 1),
    [(u: UnitView) => -u.men, cmpNum],
    [(u: UnitView) => u.province, cmpStr],
  );
  const home = (): void => {
    if (v.kingAt !== null) orders.push(moveCourt(v.courtAt, true));
  };
  if (fights.length === 0 || personalityOf(b.me, v.traits).caution >= StaysHome || (v.kingAt !== null && danger(v.kingAt))) {
    home();
    return;
  }
  const army = fights[0].province;
  if (!danger(here) && seasons(here, army) === 0) return;
  const safe = sortBy(
    [...v.owner]
      .filter(([x, o]) => o === b.me && !Board.Map.get(x).isSea && v.walls.getOrDefault(x, 0) > 0)
      .map(([x]) => x)
      .filter((x) => !danger(x) && !v.sieges.some((s) => s.province === x) && seasons(x, army) === 0),
    [(x: string) => Board.Map.hops(x, army), cmpNum],
    [(x: string) => x, cmpStr],
  );
  if (safe.length > 0 && safe[0] !== here) orders.push(moveCourt(safe[0], true));
  else if (safe.length === 0) home();
}
