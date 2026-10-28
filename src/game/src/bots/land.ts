/**
 * The script kings' people at home (build order item 10+a): each province's tax set as high as its farmers can bear
 * without going hungry, the countryside fed from the stores in a famine, levies raised where and when they cost the
 * harvest least, and disbanded men settled as colonists where the land has room. `--no-land-play` and
 * `--land-play-half` leave the default tax, never feed a hungry countryside, raise as before and never settle, only to
 * measure what playing it is worth.
 */
import {
  EconomyData,
  LandData,
  WorldMap,
  countryNeed,
  feed,
  labourOf,
  menOf,
  menWeight,
  reckonedOf,
  seasonOfTurn,
  tax,
  type Order,
  type ProvinceEconomyView,
  type SeatView,
  type UnitKind,
} from "@amarna/engine";

/** Script kings that leave item 10+a's levers alone (`--no-land-play`, `--land-play-half`). None by default. */
export const LandPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A margin under the highest rate the farmers can bear, in points of the tax, against a worse season than this one. */
const TaxMargin = 3;

/** How far the bearable rate must rise above the rate set before a script king raises it. */
const TaxStep = 3;

/**
 * The highest tax a province's farmers can bear this season without going hungry, less a margin: what they keep of
 * its harvest must cover what its countryside eats.
 */
export function bearableTax(x: ProvinceEconomyView): number {
  const p = WorldMap.default.get(x.province);
  const need = countryNeed(p, x.settled, reckonedOf(WorldMap.default, x.province).settled);
  if (x.harvest <= 0) return 0;
  const most = 100 - Math.ceil((need * 100) / x.harvest) - TaxMargin;
  return Math.max(0, Math.min(LandData.taxMost, most));
}

/**
 * The tax orders: each province's rate moved to what its farmers can bear, a province already short of food at least
 * five points under its rate; a rate comes down at once, and goes up only once the farmers can bear three points more.
 */
export function taxOrders(v: SeatView, me: string): Order[] {
  if (!LandPlay.on(me)) return [];
  const orders: Order[] = [];
  for (const x of v.provinces) {
    let rate = bearableTax(x);
    if (x.fed < 1000) rate = Math.min(rate, Math.max(0, x.taxRate - 5));
    // A rate the farmers cannot bear comes down at once; otherwise it moves only by a few points, not every season.
    if (rate < x.taxRate || rate >= x.taxRate + TaxStep) orders.push(tax(rate, x.province));
  }
  return orders;
}

/**
 * Grain from the stores for a countryside that will go short this season: what its farmers keep at the rate it will pay
 * falls short of what it eats, less what its market already holds beyond its town's need.
 */
export function famineFeeding(v: SeatView, me: string, besieged: ReadonlySet<string>, stores: (province: string) => number): Order[] {
  if (!LandPlay.on(me)) return [];
  const orders: Order[] = [];
  for (const x of v.provinces) {
    if (besieged.has(x.province)) continue;
    const need = countryNeed(WorldMap.default.get(x.province), x.settled, reckonedOf(WorldMap.default, x.province).settled);
    const rate = Math.min(x.taxRate, bearableTax(x));
    const kept = Math.floor((x.harvest * (100 - rate)) / 100);
    const short = need - kept - Math.max(0, x.stock - x.need);
    const give = Math.min(short, stores(x.province));
    if (give > 0) orders.push(feed(x.province, give));
  }
  return orders;
}

/**
 * The grain a levy of this kind in a province costs its harvest a season, about: the men's share of its labour at this
 * season's weight, at the slope of the harvest near full strength (half of it). Zero for a script king that ignores it.
 */
export function levyCost(v: SeatView, me: string, province: string, kind: UnitKind): number {
  if (!LandPlay.on(me)) return 0;
  const x = v.provinces.find((p) => p.province === province);
  if (x === undefined) return 0;
  const season = seasonOfTurn(v.turn);
  const labour = labourOf(province, x.settled, x.men, season);
  if (labour <= 0) return x.harvest;
  const taken = menOf(kind) * (2 + menWeight(province, season));
  return Math.ceil((x.harvest * taken) / (2 * labour));
}

/** Whether a province has the men of fighting age a levy of this kind needs (a rule every script king keeps to). */
export function canLevy(v: SeatView, province: string, kind: UnitKind): boolean {
  const x = v.provinces.find((p) => p.province === province);
  return x !== undefined && x.men >= menOf(kind);
}

/** Whether a unit disbanding in a province of ours should settle its men there: the land has room for them. */
export function settleThere(v: SeatView, me: string, province: string, kind: UnitKind): boolean {
  if (!LandPlay.on(me)) return false;
  const x = v.provinces.find((p) => p.province === province);
  return x !== undefined && x.settled + menOf(kind) <= x.room;
}

/** The reference price of a measure of grain in shekels, for weighing grain against gold. */
export const grainShekel = EconomyData.basePrice / 100;
