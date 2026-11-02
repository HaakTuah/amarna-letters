/**
 * The script kings' counts and demands (build order item 17++, part B; "A census", "The king says how much he wants"):
 * each province asked a share of its harvest as high as its farmers can bear by the last count, or, while that count is
 * fresh enough to judge by, the same grain as an amount, which it cannot hide; scribes sent to count a province whose
 * count has grown old, where the gold allows. `--no-count-play` and `--count-play-half` never count and always ask a
 * share, only to measure what counting is worth.
 */
import { CountData, census, demand, type Order, type ProvinceEconomyView, type SeatView } from "@amarna/engine";
import { bearableShare, LandPlay, shareNow } from "./land.ts";

/** Script kings that never count their land and always ask a share (`--no-count-play`, `--count-play-half`). None by default. */
export const CountPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** How far the bearable share must rise above the share asked before a script king raises it, in points. */
const ShareStep = 3;
/** The oldest count, in seasons, a script king asks an amount by: past it he cannot judge what the land holds. */
const FreshSeasons = 2;
/** The age, in seasons, at which a script king sends scribes to count a province again. */
const StaleSeasons = 8;
/** Scribes sent a season at most, and the treasury kept beyond their pay, in multiples of it. */
const CensusesASeason = 2;
const CensusReserve = 10;

/**
 * The demand orders: each counted province asked what its farmers can bear by its count, as an amount while the count is
 * fresh (and the king counts), as a share otherwise; a province short of food at least five points under what it gives;
 * a share comes down at once and goes up only by a few points. Land never counted keeps the usual share.
 */
export function demandOrders(v: SeatView, me: string): Order[] {
  if (!LandPlay.on(me)) return [];
  const orders: Order[] = [];
  for (const x of v.provinces) {
    if (x.counted === null) continue;
    const now = shareNow(x);
    let rate = bearableShare(x, me);
    if (x.fed < 1000) rate = Math.min(rate, Math.max(0, now - 5));
    if (CountPlay.on(me) && v.turn - x.counted <= FreshSeasons && x.harvest > 0) {
      const amount = Math.floor((x.harvest * rate) / 100);
      if (x.amount !== amount) orders.push(demand("amount", amount, x.province));
    } else if (x.amount !== null || rate < now || rate >= now + ShareStep) orders.push(demand("share", rate, x.province));
  }
  return orders;
}

/**
 * Scribes sent to count the provinces whose count is oldest, or that were never counted, once it is `StaleSeasons` old,
 * the richest first, while the treasury keeps `CensusReserve` times their pay.
 */
export function censusOrders(v: SeatView, me: string, gold: number): Order[] {
  if (!LandPlay.on(me) || !CountPlay.on(me)) return [];
  const counting = new Set(v.counting);
  const due = v.provinces
    .filter((x) => !counting.has(x.province) && (x.counted === null || v.turn - x.counted >= StaleSeasons))
    .sort((a, b) => b.harvest - a.harvest || (a.province < b.province ? -1 : 1));
  const orders: Order[] = [];
  for (const x of due) {
    if (orders.length >= CensusesASeason || gold < CountData.gold * CensusReserve) break;
    orders.push(census(x.province));
    gold -= CountData.gold;
  }
  return orders;
}

