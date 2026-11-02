/**
 * The script kings' answers to provinces that look to them (build order item 17++, "taken up, never thrust on anyone":
 * "script kings and characters take up what pays and refuse what costs more than it brings"). Land ceded to them they take
 * up. Land whose people declare for them they take up, unless taking it costs more than it brings: from a friend (a full
 * ally, or a treaty partner they still trust), whose land taken would break faith with him; or so far from their court that
 * its word, its tax and its defence come seasons late (`FarSeasons`), where they would hold it only by its people's
 * favour. Those they refuse at once rather than leave hanging, so its holder keeps it and they lose only a little standing
 * there. `--no-take-up-play` and `--take-up-play-half` take up everything, to measure what judging it is worth.
 */
import { answer, type Order } from "@amarna/engine";
import type { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { courierRoute, knownWays } from "./works.ts";

/** Script kings that take up every province that looks to them (`--no-take-up-play`, `--take-up-play-half`). */
export const TakeUpPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** Seasons of road from the court beyond which a declared province costs more than it brings (first guess, item 18). */
const FarSeasons = 3;

export function answerOrders(b: Board, brain: Brain, orders: Order[]): void {
  const v = b.v;
  const judge = TakeUpPlay.on(b.me);
  const ways = knownWays(v);
  for (const d of v.declared) {
    if (d.takenUp) continue;
    if (!judge || d.from !== null) {
      orders.push(answer(d.province, true));
      continue;
    }
    const holder = b.ownerOf(d.province);
    const route = courierRoute(v, ways, d.province);
    const far = route === null || route.seasons > FarSeasons;
    orders.push(answer(d.province, !(far || (holder !== null && holder !== b.me && brain.isFriend(holder)))));
  }
}
