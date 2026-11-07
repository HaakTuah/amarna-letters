/**
 * A script king and the raiders from beyond the map (build order item 17++++a): it hunts the raiders it can break where
 * an army of its own stands with them, as it hunts any band (`outlaws.ts`), but marches no army after them, since they go
 * home within a few seasons; it hires them at war as it hires any band (`generals.ts`), and pays off those it cannot
 * break when its treasury can spare it. Police at the doors, measured, did not pay: raids are rare on any one coast and
 * police hold them down little. `--no-raider-play` makes kings ignore raiders altogether (no hunt, hire or pay-off), and
 * `--raider-play-half` half of them, for the measure against kings that ignore them.
 */
import { LandData, bandCost, bandRobs, cmpNum, cmpStr, grainWorth, payOff, sortBy, type BandSeen, type Order, type SeatView } from "@amarna/engine";
import type { Board } from "./board.ts";

export const RaiderPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** The bands a king heeds: all of them, or, ignoring raiders, only the land's own. */
export function heeded(me: string, bands: readonly BandSeen[]): BandSeen[] {
  return RaiderPlay.on(me) ? [...bands] : bands.filter((x) => x.raiders === "");
}

/**
 * What the bots reckon a chief asks for `term` seasons of his band's work: what his men cost, or what they take of our
 * land where our army stands with them (its purse and stores as we count them), whichever is more, and the cut of a
 * greedy chief, since his greed is unknown.
 */
export function chiefAskSeen(v: SeatView, x: BandSeen, term: number): number {
  const p = v.provinces.find((q) => q.province === x.province);
  const take = p === undefined ? 0 : bandRobs(x.men, p.purse, LandData.policedPercent) + grainWorth(bandRobs(x.men, p.stores, LandData.policedPercent));
  return Math.max(bandCost(x.men), take) * term + Math.ceil((bandCost(x.men) * term * GreedyCut) / 100);
}

/** The greed the bots allow for in a chief they cannot read, in a hundred; the seasons they pay a raider to go for. */
const GreedyCut = 80;
const PayOffTerm = 2;

/**
 * Raiders it cannot break where an army of ours stands with them (with its commander, or with the king) are paid to go
 * home, the fee with a tenth over what we reckon they ask, when the treasury holds three times it: what they would
 * carry off of our people, besides the gold, is worth more than the fee. One a season.
 */
export function payOffOrders(b: Board, orders: Order[], breaks: (x: BandSeen, army: number) => boolean): void {
  if (!RaiderPlay.on(b.me)) return;
  const v = b.v;
  for (const x of sortBy(v.bands.filter((x) => x.raiders !== "" && x.paidUntil === 0 && b.isMine(x.province)), [(x) => -x.men, cmpNum], [(x) => x.province, cmpStr])) {
    const here = b.mine.filter((u) => u.province === x.province && u.kind === "Army");
    if (here.length === 0) continue;
    const army = here.reduce((a, u) => a + u.men, 0);
    if (breaks(x, army)) continue;
    const carried = v.courtAt === x.province || here.some((u) => u.commander !== null && u.commandFrom <= v.turn);
    if (!carried) continue;
    const fee = Math.ceil((chiefAskSeen(v, x, PayOffTerm) * 11) / 10);
    if (v.gold < fee * 3) continue;
    orders.push(payOff(x.province, fee, PayOffTerm));
    return;
  }
}
