/**
 * A script king's economy at home (build order item 9+a, "Building it": "selling surplus, supplying armies and stocking
 * depots"). Each season, before the treasury's other choices: it keeps in each province's stores what its troops there
 * will eat, and a depot's worth on the frontier where its armies stand; sends caravans to troops beyond its land whose
 * baggage runs low, and to frontier depots that run short; sells the rest at each market while the price is worth it, and
 * at any price when the treasury needs gold or the grain would be lost for want of room; hands its towns what would still
 * be lost; and buys grain where troops depend on an empty store. Returns the gold its sales should bring.
 */
import { knownWays } from "./works.ts";
import {
  EconomyData,
  PointsPerDay,
  bidAt,
  caravan,
  carriedOf,
  cheapestRoute,
  cmpNum,
  cmpStr,
  desc,
  feed,
  foodOf,
  legPoints,
  purchase,
  seasonOfTurn,
  sell,
  sellAlongCurve,
  sortBy,
  sum,
  type Order,
  type ProvinceEconomyView,
  type SeatView,
  type UnitView,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";
import { TradePlay, tradeOrders } from "./trade.ts";
import { famineFeeding } from "./land.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** How many seasons of food a frontier depot keeps for each army near it (a first guess of the script's own). */
const DepotSeasons = 2;

/** The province whose stores feed a unit of ours where it stands, or null: our land, or for a fleet our coast of its waters. */
export function depotFor(b: Board, u: UnitView): string | null {
  const prov = Board.Map.get(u.province);
  if (!prov.isSea) return b.isMine(prov.id) ? prov.id : null;
  return Board.Map.landProvinces.find((x) => x.waters === prov.id && b.isMine(x.id))?.id ?? null;
}

/**
 * A caravan's route to `to`, and the seasons it takes, or null if there is none. Through our own land first; since item
 * 11f a caravan may go anywhere, so the road may cross foreign land, openly where its king has not closed his roads to us
 * and sneaking (half as slow again, and found with a smuggler's odds) where he has: each foreign province costs a little
 * more than our own, a closed one more again for the risk, and a province where troops of a king who closed his roads to
 * us stand (as we see them) is avoided, since they may take the caravan there.
 */
function route(b: Board, from: string, to: string): { route: string[]; seasons: number } | null {
  const season = seasonOfTurn(b.v.turn);
  const anywhere = CaravanPlay.on(b.me);
  const closed = new Set<string>(b.v.roadsClosedToUs);
  const shut = (x: string): boolean => {
    const k = b.ownerOf(x);
    return k !== null && k !== b.me && closed.has(k);
  };
  const guarded = new Set(b.v.units.filter((u) => u.power !== b.me && closed.has(u.power)).map((u) => u.province));
  const r = cheapestRoute(
    Board.Map,
    from,
    to,
    (x, y) => (Board.Map.get(x).isSea || Board.Map.get(y).isSea ? Infinity : legPoints(Board.Map, x, y, season, { sneaking: shut(x) || shut(y), ways: knownWays(b.v) })),
    (x) => (b.isMine(x) ? 0 : !anywhere || guarded.has(x) ? Infinity : shut(x) ? 3 * PointsPerDay * ForeignDays : PointsPerDay * ForeignDays),
  );
  if (r === null) return null;
  return { route: r.route, seasons: Math.max(1, Math.ceil(r.cost / (45 * PointsPerDay))) };
}

/**
 * Whether a script king sends its caravans through foreign land (item 11f); off for the measure of using it against
 * ignoring it (`--caravan-play-half`), when they keep to its own land as before.
 */
export const CaravanPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** What crossing a foreign province weighs, in days, beyond its road (a first guess of the script's own): the tolls and the risk. */
const ForeignDays = 2;

export function grainOrders(b: Board, brain: Brain, plan: MilitaryPlan, orders: Order[], gold: number, costs: number): { sales: number; abroad: number } {
  const v = b.v;
  const p = brain.p;
  const ps = new Map(v.provinces.map((x) => [x.province, { ...x } as Mutable<ProvinceEconomyView>] as const));
  if (ps.size === 0) return { sales: 0, abroad: 0 };
  const besieged = new Set(v.sieges.filter((x) => x.holder === b.me).map((x) => x.province));

  // What each province must keep: its troops' food and refills for two seasons, and a depot on the frontier.
  const keep = new Map<string, number>();
  const add = (k: string, n: number): void => {
    keep.set(k, (keep.get(k) ?? 0) + n);
  };
  for (const u of b.mine) {
    const d = depotFor(b, u);
    if (d !== null) add(d, 2 * foodOf(u.kind) + (u.carried - u.food));
  }
  const armies = b.mine.filter((u) => u.kind === "Army");
  for (const x of ps.values()) {
    const near = armies.filter((u) => u.province !== x.province && Board.Map.areAdjacent(u.province, x.province)).length;
    const frontier = Board.Map.neighbors(x.province).some((n) => !Board.Map.get(n).isSea && !b.isMine(n));
    if (frontier && near > 0) add(x.province, DepotSeasons * EconomyData.armyFood * near);
  }
  const spare = (x: Mutable<ProvinceEconomyView>): number => (besieged.has(x.province) ? 0 : Math.max(0, x.stores - (keep.get(x.province) ?? 0)));

  // Caravans: to our troops beyond our land whose baggage will not last, and to frontier depots running short.
  const sending = new Set(v.caravans.filter((c) => !c.returning).map((c) => c.to));
  const wants: [string, number][] = [];
  for (const u of sortBy(armies, [(u: UnitView) => u.food, cmpNum], [(u: UnitView) => u.province, cmpStr])) {
    if (depotFor(b, u) !== null) continue;
    const o = plan.orders.tryGet(u.province);
    const at = o !== undefined && o.type === "move" && !Board.Map.get(o.to).isSea ? o.to : u.province;
    if (u.food > foodOf(u.kind) || sending.has(at)) continue;
    wants.push([at, carriedOf(u.kind) - u.food + foodOf(u.kind)]);
  }
  for (const [k, n] of keep) {
    const x = ps.get(k);
    if (x === undefined || besieged.has(k) || sending.has(k)) continue;
    if (x.stores + x.tax < n) wants.push([k, n - x.stores]);
  }
  let caravans = 0;
  for (const [to, n] of wants) {
    // A depot of ours whose market holds more than its own need buys the grain there: it costs nothing in strength (the
    // gold stays in our people's purse), where a caravan's porters eat a share of the load and must be paid.
    const local = ps.get(to);
    const spareStock = local === undefined ? 0 : Math.min(n, local.stock - Math.ceil(local.need / 2));
    if (local !== undefined && !besieged.has(to) && local.stock >= local.need && spareStock > 0 && gold >= 2 * costs) {
      orders.push(purchase(to, spareStock));
      local.stores += spareStock;
      local.stock -= spareStock;
      if (spareStock >= n) continue;
    }
    if (caravans >= 3) break;
    const source = sortBy(
      [...ps.values()].filter((x) => x.province !== to && spare(x) >= n),
      [(x: Mutable<ProvinceEconomyView>) => route(b, x.province, to)?.seasons ?? 99, cmpNum],
      [(x: Mutable<ProvinceEconomyView>) => spare(x), desc(cmpNum)],
      [(x: Mutable<ProvinceEconomyView>) => x.province, cmpStr],
    )[0];
    if (source === undefined) continue;
    const r = route(b, source.province, to);
    if (r === null || r.seasons > 2) continue;
    // What the porters will eat on the way.
    const amount = Math.ceil((n * 100) / (100 - EconomyData.caravanEatPercent * r.seasons));
    if (spare(source) < amount) continue;
    orders.push(caravan(source.province, to, amount));
    source.stores -= amount;
    sending.add(to);
    caravans++;
  }

  // A countryside that will go short is fed from its stores before any grain is sold (item 10+a).
  for (const o of famineFeeding(v, b.me, besieged, (k) => spare(ps.get(k)!))) {
    orders.push(o);
    const x = ps.get((o as Extract<Order, { type: "feed" }>).province)!;
    x.stores -= (o as Extract<Order, { type: "feed" }>).amount;
    x.stock += (o as Extract<Order, { type: "feed" }>).amount;
  }

  // Trade abroad (item 9+b): what pays better at a foreign market goes there before the home markets take the rest.
  const abroad = TradePlay.on(b.me) ? tradeOrders(b, brain, plan, orders, ps, spare, gold, costs) : 0;

  // Sales: while the market pays about what the grain is worth (grain kept loses a twentieth a season to spoiling, so a
  // little under its reference price still pays), lower when gold is needed; at any price for what the next tax would push
  // out of the stores.
  const target = costs * (2 + p.caution);
  const floor = gold < costs ? (EconomyData.basePrice * 35) / 100 : gold < target ? (EconomyData.basePrice * 6) / 10 : (EconomyData.basePrice * 9) / 10;
  let expected = 0;
  for (const x of sortBy([...ps.values()], [(x: Mutable<ProvinceEconomyView>) => x.province, cmpStr])) {
    if (besieged.has(x.province)) continue;
    const s = spare(x);
    const overflow = Math.max(0, x.stores + x.tax - x.capacity);
    let n = 0;
    while (n < s && (bidAt(x.stock + n, x.need) >= floor || n < overflow)) n++;
    const r = sellAlongCurve(x.stock, x.need, x.purse, n);
    if (r.taken > 0) {
      orders.push(sell(x.province, r.taken));
      expected += r.paid;
      x.stores -= r.taken;
      x.stock += r.taken;
    }
    // What would still be lost goes to a town short of grain; more would only glut its market and spoil its price.
    const lost = Math.max(0, x.stores + x.tax - x.capacity);
    if (lost > 0 && x.stock < x.need) orders.push(feed(x.province, Math.min(lost, x.need - x.stock)));
  }

  // Purchases: troops depending on an empty store, with grain on sale there and gold to spare.
  for (const x of sortBy([...ps.values()], [(x: Mutable<ProvinceEconomyView>) => x.province, cmpStr])) {
    const need = sum(b.mine.filter((u) => depotFor(b, u) === x.province), (u) => foodOf(u.kind));
    if (need === 0 || x.stores + x.tax >= need || besieged.has(x.province)) continue;
    if (gold + expected < 3 * costs || x.stock < x.need) continue;
    orders.push(purchase(x.province, need - x.stores - x.tax));
  }
  return { sales: expected, abroad };
}

/**
 * The plain way with grain, for the frozen baseline (adapted only as item 9+a's rules require) and for script kings that
 * play the economy plainly (`--plain-economy`): keep two seasons of the food of the troops each store feeds, sell all the
 * rest every season at whatever its market pays, and send no caravans. Returns the gold the sales should bring.
 */
export function plainGrainOrders(v: SeatView, orders: Order[]): number {
  let expected = 0;
  const besieged = new Set(v.sieges.filter((x) => x.holder === v.power).map((x) => x.province));
  for (const x of sortBy([...v.provinces], [(x: Mutable<ProvinceEconomyView>) => x.province, cmpStr])) {
    if (besieged.has(x.province)) continue;
    const here = v.units.filter((u) => u.power === v.power && u.province === x.province);
    const keep = sum(here, (u) => 2 * foodOf(u.kind) + (u.carried - u.food));
    const r = sellAlongCurve(x.stock, x.need, x.purse, Math.max(0, x.stores - keep));
    if (r.taken <= 0) continue;
    orders.push(sell(x.province, r.taken));
    expected += r.paid;
  }
  return expected;
}

/** The script kings that play the economy plainly (`--plain-economy`, `--plain-economy-half`): none by default. */
export const GrainPlay: { plain: boolean; only: ReadonlySet<string> | null } = { plain: false, only: null };

export const plainGrain = (me: string): boolean => GrainPlay.plain && (GrainPlay.only === null || GrainPlay.only.has(me));
