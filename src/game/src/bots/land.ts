/**
 * The script kings' people at home (build order item 10+a): the share each province can bear without going hungry
 * (asked by `counts.ts`), the countryside fed from the stores in a famine, levies raised where and when they cost the
 * harvest least, and disbanded men settled as colonists where the land has room. `--no-land-play` and
 * `--land-play-half` leave the usual share, never feed a hungry countryside, raise as before and never settle, only to
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

/**
 * Script kings that leave item 11a+'s levers alone (`--no-season-play`, `--season-play-half`): the granaries in their tax
 * and famine feeding, levies short of a full one, the share of mouths put out, deporting by a safe road, passage by order,
 * watching spies and winter strokes by sea. None by default.
 */
export const SeasonPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A margin under the highest share the farmers can bear, in points of the harvest, against a worse season than this one. */
const TaxMargin = 3;

/**
 * The highest share a province's farmers can bear this season, by the king's last count of it, without going hungry, less a margin: what they keep of
 * its harvest must cover what its countryside eats.
 */
export function bearableShare(x: ProvinceEconomyView, me: string | null = null, turn: number = x.counted ?? 0): number {
  const p = WorldMap.default.get(x.province);
  const need = countryNeed(p, x.settled, reckonedOf(WorldMap.default, x.province).settled);
  if (x.harvest <= 0) return 0;
  let most = 100 - Math.ceil((need * 100) / x.harvest) - TaxMargin;
  // The harvest comes once a year (item 11a+): until the next is reaped, the granary must feed them and pay the tax. The
  // seasons it must last: those before the reaping season, which the new harvest feeds.
  const seasons = x.reapsIn === 0 ? 2 : x.reapsIn - 1;
  if (seasons > 0 && (me === null || SeasonPlay.on(me))) most = Math.min(most, Math.floor(((granaryNow(x, turn) / seasons - need) * 100) / x.harvest) - TaxMargin);
  return Math.max(0, Math.min(LandData.taxMost, most));
}

/**
 * The farmers' granary now, reckoned forward from the king's last count of it (item 17++): each season since, what its
 * countryside eats and what he asks taken from it, and a reaping in between filling it with a harvest like the counted
 * one; this season's reaping in, its eating not yet. The count's own figure when it is this season's.
 */
export function granaryNow(x: ProvinceEconomyView, turn: number): number {
  if (x.counted === null) return x.granary;
  const need = countryNeed(WorldMap.default.get(x.province), x.settled, reckonedOf(WorldMap.default, x.province).settled);
  const use = need + Math.floor((x.harvest * shareNow(x)) / 100);
  let g = x.granary;
  for (let t = x.counted + 1; t <= turn; t++) {
    if ((((t - turn - x.reapsIn) % 3) + 3) % 3 === 0) g += 3 * x.harvest;
    // This season's eating and asking are still to come when the king gives his orders.
    if (t < turn) g = Math.max(0, g - use);
  }
  return g;
}

/** The share a province now gives, in percent of a season's harvest: its share, or what its amount comes to. */
export function shareNow(x: ProvinceEconomyView): number {
  if (x.amount === null) return x.share;
  return x.harvest > 0 ? Math.floor((x.amount * 100) / x.harvest) : 100;
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
    const rate = Math.min(shareNow(x), bearableShare(x, me, v.turn));
    // What the farmers will have next season (item 11a+): their granary, the harvest if it is reaped then, less the tax.
    // A king that ignores the granaries reckons by a season's share of the harvest, as before.
    const kept = SeasonPlay.on(me) ? granaryNow(x, v.turn) + (x.reapsIn === 1 ? x.crop + x.harvest : 0) - Math.floor((x.harvest * rate) / 100) : Math.floor((x.harvest * (100 - rate)) / 100);
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
  const taken = Math.min(menOf(kind), x.men) * (2 + menWeight(province, season));
  return Math.ceil((x.harvest * taken) / (2 * labour));
}

/**
 * Whether a province has the men of fighting age for a levy of this kind worth raising: a levy is sized by the men a
 * province has (item 11a+), and a script king raises one of at least half a full unit, where one counts for something.
 */
export function canLevy(v: SeatView, province: string, kind: UnitKind): boolean {
  const x = v.provinces.find((p) => p.province === province);
  return x !== undefined && x.men >= (SeasonPlay.on(v.power) ? Math.max(LandData.levyLeast, menOf(kind) / 2) : menOf(kind));
}

/** Whether a unit disbanding in a province of ours should settle its men there: the land has room for them. */
export function settleThere(v: SeatView, me: string, province: string, kind: UnitKind, men = menOf(kind)): boolean {
  if (!LandPlay.on(me)) return false;
  const x = v.provinces.find((p) => p.province === province);
  return x !== undefined && x.settled + men <= x.room;
}

/** The reference price of a measure of grain in shekels, for weighing grain against gold. */
export const grainShekel = EconomyData.basePrice / 100;
