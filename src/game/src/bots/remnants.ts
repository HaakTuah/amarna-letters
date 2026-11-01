/**
 * Remnants (build order item 17++, "A handful holds nothing by itself"): a script king folds the remnants of his troops
 * into larger ones, as a competent king would, or disbands them. A remnant is a unit of fewer men than a quarter of a full
 * levy (first guess). One standing next to a larger unit of its own kind that stays where it is this season marches to it
 * and joins it (order fold), the largest first; one with nothing to join, holding in its own land and under no threat,
 * is disbanded, its men settling where it stands where there is room. Under a commander or with a hired band it is left
 * as it is (it cannot fold).
 */
import { cmpNum, cmpStr, disband, fold, menOf, sortBy } from "@amarna/engine";
import { Board } from "./board.ts";
import { settleThere } from "./land.ts";
import type { MilitaryPlan } from "./tactics.ts";

/** Script kings fold or disband their remnants (`--no-remnant-play`), or half of them never do (`--remnant-play-half`). */
export const RemnantPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A remnant: fewer men than a quarter of a full levy of its kind. */
export const remnantShare = 4;

export function foldRemnants(b: Board, plan: MilitaryPlan): void {
  if (!RemnantPlay.on(b.me)) return;
  const v = b.v;
  const staying = (at: string): boolean => {
    const o = plan.orders.tryGet(at);
    return o === undefined || o.type === "hold" || o.type === "besiege" || o.type === "support";
  };
  const remnants = sortBy(
    b.mine.filter((u) => u.men * remnantShare < menOf(u.kind) && u.commander === null && u.hiredMen === 0 && (plan.role.tryGet(u.province) ?? "hold") === "hold"),
    [(u) => u.men, cmpNum],
    [(u) => u.province, cmpStr],
  );
  const folding = new Set<string>();
  for (const u of remnants) {
    const into = sortBy(
      b.mine.filter((x) => x !== u && x.kind === u.kind && x.men > u.men && !folding.has(x.province) && staying(x.province) && Board.Map.neighbors(u.province).includes(x.province)),
      [(x) => -x.men, cmpNum],
      [(x) => x.province, cmpStr],
    )[0];
    if (into !== undefined) {
      plan.orders.set(u.province, fold(u.province, into.province));
      plan.role.set(u.province, "fold");
      folding.add(u.province);
      continue;
    }
    if (b.ownerOf(u.province) !== b.me || plan.threatened.has(u.province) || Board.Map.get(u.province).isSea) continue;
    plan.orders.set(u.province, disband(u.province, settleThere(v, b.me, u.province, u.kind, u.men || undefined)));
    plan.role.set(u.province, "disband");
  }
}
