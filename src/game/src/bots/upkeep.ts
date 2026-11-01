/**
 * A script king's standing order to pay and feed his troops (build order item 17+, "the opening as it stood": nothing is
 * paid or fed without an order). He starts with the order every king starts with, and learns when holding back pay is worth
 * its price: a unit missing one season's pay costs nothing yet (it mutinies only after `unpaidMutiny` seasons running), so
 * when the treasury cannot carry the season's costs he holds back pay from the units with no missed season that stand in
 * his own land with no foreign troops beside them, largest pay first, until the shortfall is covered; and he gives pay
 * again the season he can. He never holds back food: hungry men take from the land, his own included, and mutiny fast.
 */
import { Board } from "./board.ts";
import { EconomyData, forMen, upkeep, type Order, type SeatView, type UnitView } from "@amarna/engine";

/** Script kings hold back pay when hard up (`--no-upkeep-play`), or half of them never do (`--upkeep-play-half`). */
export const UpkeepPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A unit's pay a season, as the engine reckons it. */
const payOf = (v: SeatView, u: UnitView): number => forMen(u.kind === "Army" ? v.prices.get("armyUpkeep") : v.prices.get("fleetUpkeep"), u.kind, u.men);

/**
 * The season's upkeep orders. `gold`: what the treasury can count on; `costs`: its costs a season. Returns the gold the
 * held-back pay keeps in the treasury this season.
 */
export function upkeepOrders(b: Board, gold: number, costs: number, orders: Order[]): number {
  const v = b.v;
  const me = b.me;
  if (!UpkeepPlay.on(me)) return 0;
  const mine = b.mine;
  const short = costs - gold;
  // Flush again: everything held back is paid, so that no unit runs towards mutiny for nothing.
  if (short <= 0) {
    for (const at of v.payHeld) orders.push(upkeep(true, true, at));
    return 0;
  }
  const safe = (u: UnitView): boolean =>
    b.ownerOf(u.province) === me &&
    u.unpaid === 0 &&
    !b.units.some((x) => x.power !== me && (x.province === u.province || Board.Map.neighbors(u.province).includes(x.province)));
  // Never within a season of mutiny: a unit held back once is paid the next season (its `unpaid` is then 1).
  if (EconomyData.unpaidMutiny < 2) return 0;
  let kept = 0;
  const byPay = mine.filter(safe).sort((a, b2) => payOf(v, b2) - payOf(v, a) || a.province.localeCompare(b2.province));
  const held = new Set<string>();
  for (const u of byPay) {
    if (kept >= short) break;
    if (v.payHeld.includes(u.province) || held.has(u.province)) continue;
    held.add(u.province);
    kept += payOf(v, u);
    orders.push(upkeep(false, true, u.province));
  }
  // Pay again those held back that are no longer safe to hold, or that would miss a second season.
  for (const at of v.payHeld) if (!held.has(at) && !mine.some((u) => u.province === at && safe(u))) orders.push(upkeep(true, true, at));
  return kept;
}
