/**
 * A script king's economy abroad (build order item 9+b): where the gap between markets pays, it sends its spare grain to
 * sell at a dearer foreign market and gold to buy where grain is cheap, by caravan or, from a harbour with an idle fleet,
 * by ship; it smuggles a small load where tolls are heavy or the roads closed; it ships grain to a besieged harbour of its
 * own while its waters are open; and it sets its tolls, none on the partners it promised free passage to on a sealed tablet
 * nor on its allies. Every number below is a first guess of the script's own.
 */
import {
  EconomyData,
  PointsPerDay,
  RoadOdds,
  TradeData,
  WinterSeason,
  buyAlongCurve,
  cheapestRoute,
  cmpNum,
  cmpStr,
  desc,
  harbourOf,
  idiv,
  legPoints,
  move,
  seasonOfTurn,
  sellAlongCurve,
  ship,
  smuggleOdds,
  sortBy,
  toll,
  tollRate,
  trade,
  type MarketSeen,
  type Order,
  type Power,
  type ProvinceEconomyView,
  type SeatView,
  type UnitView,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** At most this many trading caravans of ours abroad at once (fleets are their own limit), and the most a caravan carries (its pace). */
const MaxTraders = 3;
const CaravanLot = 100;
/** A smuggler carries no more than this, since the odds of being found grow with the load. */
const SmuggleLot = 50;
/** A market seen longer ago than this is not trusted for its price. */
const StaleSeasons = 6;
/** The farthest a trading caravan or ship goes, in seasons one way. */
const FarSeasons = 3;

/** A foreign market's normal stock: a season of its town's need. */
const normalOf = (m: MarketSeen): number => Math.max(1, m.need);

/** The partners we promised, on a sealed tablet, to take no toll from (tollFree we wrote, or askTollFree written to us). */
export function promisedFree(v: SeatView): Set<Power> {
  const out = new Set<Power>();
  for (const t of v.tablets) {
    if (t.sealedTurn === null || !t.seals.includes(v.power) || t.seals.length < 2 || t.authResult?.includes("forgery") === true) continue;
    const other = t.seals.find((x) => x !== v.power);
    if (other === undefined) continue;
    const ours = t.proposedBy === v.power;
    if (t.clauses.some((c) => (ours && c.kind === "tollFree") || (!ours && c.kind === "askTollFree"))) out.add(other);
  }
  return out;
}

/** A route and the tolls on it as we know them: the borders it crosses into foreign kings' land. */
interface Way {
  route: string[];
  seasons: number;
  /** The share of the goods that reaches the far end past the tolls, in hundredths. */
  keep: number;
  /** The foreign realms it enters. */
  realms: number;
}

function wayOf(b: Board, route: string[] | null, cost: number, perSeason: number): Way | null {
  if (route === null) return null;
  let keep = 100;
  let realms = 0;
  for (let i = 1; i < route.length; i++) {
    const k = b.ownerOf(route[i]);
    if (k === null || k === b.me || Board.Map.get(route[i]).isSea || b.ownerOf(route[i - 1]) === k) continue;
    realms++;
    keep = idiv(keep * (100 - tollRate(b.v.tolls, k, route[i], b.me)), 100);
  }
  return { route, seasons: Math.max(1, Math.ceil(cost / perSeason)), keep, realms };
}

/** A caravan's way by land open to us (off the road through foreign land, for a smuggler), as the engine plans it. */
function landWay(b: Board, from: string, to: string, sneak: boolean): Way | null {
  const season = seasonOfTurn(b.v.turn);
  const closed = new Set(b.v.roadsClosedToUs);
  const foreign = (x: string): boolean => b.ownerOf(x) !== null && b.ownerOf(x) !== b.me;
  const r = cheapestRoute(
    Board.Map,
    from,
    to,
    (x, y) => (Board.Map.get(x).isSea || Board.Map.get(y).isSea ? Infinity : legPoints(Board.Map, x, y, season, { sneaking: sneak && (foreign(x) || foreign(y)) })),
    (x) => (Board.Map.get(x).isSea ? Infinity : sneak || !foreign(x) || !closed.has(b.ownerOf(x)!) ? 0 : Infinity),
  );
  return r === null ? null : wayOf(b, r.route, r.cost, 45 * PointsPerDay);
}

/** A ship's way from a harbour over the seas to another. */
function seaWay(b: Board, from: string, to: string): Way | null {
  const M = Board.Map;
  const season = seasonOfTurn(b.v.turn);
  const r = cheapestRoute(
    M,
    from,
    to,
    (x, y) => {
      const px = M.get(x);
      const py = M.get(y);
      const ok = (px.isSea && py.isSea) || (x === from && py.isSea && px.waters === y) || (px.isSea && y === to && py.waters === x);
      return ok ? legPoints(M, x, y, season) : Infinity;
    },
    (x) => (M.get(x).isSea || x === to ? 0 : Infinity),
  );
  return r === null ? null : wayOf(b, r.route, r.cost, 45 * PointsPerDay);
}

/** A fleet of ours that can go into cargo service from this harbour: idle in the plan, in the harbour or its waters. */
function idleFleet(b: Board, plan: MilitaryPlan, at: string, used: Set<string>): UnitView | null {
  const prov = Board.Map.get(at);
  if (harbourOf(prov) <= 0) return null;
  for (const u of b.mine) {
    if (u.kind !== "Fleet" || used.has(u.province) || (u.province !== at && u.province !== prov.waters)) continue;
    const o = plan.orders.tryGet(u.province);
    if (o === undefined || o.type === "hold") return u;
  }
  return null;
}

/** Are there enemy fleets near this harbour (a fleet of a king hostile to us within two moves of its waters)? */
function seasDangerous(b: Board, brain: Brain, at: string): boolean {
  const waters = Board.Map.get(at).waters;
  if (waters === null) return true;
  return b.v.units.some((u) => u.kind === "Fleet" && u.power !== b.me && (brain.rel.get(u.power)?.hostile ?? false) && Board.Map.hops(waters, u.province) <= 2);
}

/**
 * The trading caravans and ships a script king sends this season, before its home sales; `ps` is its provinces as the
 * grain plan has left them (what each keeps is `spare`), and it takes what it sends out of their stores. Returns the gold
 * it sends abroad.
 */
export function tradeOrders(
  b: Board,
  brain: Brain,
  plan: MilitaryPlan,
  orders: Order[],
  ps: Map<string, Mutable<ProvinceEconomyView>>,
  spare: (x: Mutable<ProvinceEconomyView>) => number,
  gold: number,
  costs: number,
): number {
  const v = b.v;
  const p = brain.p;
  let spent = 0;
  const winter = seasonOfTurn(v.turn) === WinterSeason;
  const usedFleets = new Set<string>();
  // Caravans abroad count against the cap; fleets are their own limit.
  let traders = v.caravans.filter((c) => c.trade && !c.ship).length;
  const fleetUpkeep = v.prices.getOrDefault("fleetUpkeep", 25);
  const fleetCost = v.prices.getOrDefault("fleet", 150);

  // A besieged harbour of ours, its waters open, its stores short: a ship brings it grain first.
  for (const x of v.sieges.filter((s) => s.holder === b.me)) {
    const city = ps.get(x.province);
    const waters = Board.Map.get(x.province).waters;
    if (city === undefined || waters === null || v.units.some((u) => u.province === waters && u.power === x.besieger && u.kind === "Fleet")) continue;
    if (city.stores >= 2 * city.need || v.caravans.some((c) => c.ship && c.to === x.province)) continue;
    for (const src of sortBy([...ps.values()], [(y: Mutable<ProvinceEconomyView>) => spare(y), desc(cmpNum)], [(y: Mutable<ProvinceEconomyView>) => y.province, cmpStr])) {
      if (src.province === x.province || spare(src) < 40) continue;
      const fleet = idleFleet(b, plan, src.province, usedFleets);
      const way = fleet === null ? null : seaWay(b, src.province, x.province);
      if (fleet === null || way === null || way.seasons > 2) continue;
      const n = Math.min(TradeData.shipCapacity, spare(src));
      orders.push(ship(fleet.province, src.province, x.province, n, 0, false));
      // Its hold in the military plan gives way to the voyage (one order a unit).
      plan.orders.delete(fleet.province);
      usedFleets.add(fleet.province);
      src.stores -= n;
      break;
    }
  }

  // The known foreign markets worth weighing.
  const markets = sortBy(
    [...v.markets.entries()].filter(([k, m]) => v.turn - m.turn <= StaleSeasons && !Board.Map.get(k).kingless && b.ownerOf(k) !== b.me),
    [([k]: [string, MarketSeen]) => k, cmpStr],
  );
  if (markets.length === 0) return spent;
  // Commerce makes a king readier to trade: the share of the proceeds a venture must clear.
  const margin = 0.25 - 0.15 * p.commerce;

  for (const x of sortBy([...ps.values()], [(y: Mutable<ProvinceEconomyView>) => spare(y), desc(cmpNum)], [(y: Mutable<ProvinceEconomyView>) => y.province, cmpStr])) {
    const home = x;
    const caravansFull = traders >= MaxTraders;
    const free = spare(home);
    // What its grain would fetch at home, and what grain costs there now.
    let best: { order: Order; gain: number; grain: number; gold: number; fleet: string | null } | null = null;
    const budget = Math.max(0, Math.min(150, gold - spent - costs * (2 + p.caution)));
    for (const [k, m] of markets) {
      const normal = normalOf(m);
      const fleet = winter ? null : idleFleet(b, plan, home.province, usedFleets);
      const byShip = fleet !== null && harbourOf(Board.Map.get(k)) > 0 && !seasDangerous(b, brain, home.province);
      const ways: [string, Way | null][] = caravansFull ? [] : [["land", landWay(b, home.province, k, false)], ["smuggle", landWay(b, home.province, k, true)]];
      if (byShip) ways.push(["ship", seaWay(b, home.province, k)]);
      for (const [how, way] of ways) {
        if (way === null || way.seasons > FarSeasons) continue;
        const eat = how === "ship" ? EconomyData.boatEatPercent : EconomyData.caravanEatPercent;
        const lotCap = how === "ship" ? TradeData.shipCapacity : how === "smuggle" ? SmuggleLot : CaravanLot;
        const keep = how === "smuggle" ? 100 : way.keep;
        // Selling: the grain that arrives past the tolls and what the porters eat, sold along the market's curve.
        const n = Math.min(free, lotCap);
        const arrive = Math.floor((n * keep * Math.max(0, 100 - eat * way.seasons)) / 10000);
        const sale = sellAlongCurve(m.stock, normal, m.purse, arrive);
        // What the grain is worth to us kept or sold at home: its reference price, since a sale at home only moves our own
        // people's gold into the treasury, where a sale abroad brings in another realm's.
        const atHome = Math.floor((n * EconomyData.basePrice) / 100);
        // Buying: where grain is cheap and our towns are short or dear.
        const short = home.stock < home.need || home.price >= 2 * EconomyData.basePrice;
        const buyGold = short && how !== "smuggle" ? budget : 0;
        const bought = buyAlongCurve(Math.max(0, m.stock - sale.taken), normal, Math.floor((buyGold * keep) / 100), how === "ship" ? lotCap : CaravanLot);
        const back = Math.floor((bought.taken * keep * Math.max(0, 100 - eat * way.seasons)) / 10000);
        const worthBack = Math.floor((back * Math.max(home.price, EconomyData.basePrice)) / 100);
        const proceeds = Math.floor((sale.paid * keep) / 100);
        const cost =
          how === "ship"
            ? Math.ceil((way.seasons * 2 * (RoadOdds.storm / 100)) * (fleetCost + proceeds + worthBack))
            : Math.ceil((n + bought.taken) / EconomyData.caravanPayPer) * way.seasons * 2 + Math.ceil(buyGold / 100) * way.seasons;
        // A smuggler is found entering each realm, going and coming back, with odds that grow with its load.
        const found = how === "smuggle" ? smuggleOdds(n, 0, 0, RoadOdds.most) / 100 : 0;
        const survive = Math.pow(1 - found, 2 * way.realms);
        const gain = (proceeds + worthBack) * survive - cost - atHome - (buyGold > 0 ? bought.paid : 0);
        const worth = proceeds + worthBack;
        // An idle fleet's pay is the same at war or in cargo service, so a voyage need clear less than a caravan.
        const bar = how === "ship" ? Math.max(5, (margin / 2) * worth) : Math.max(15, margin * worth);
        if (worth <= 0 || gain < bar) continue;
        if (best !== null && gain <= best.gain) continue;
        const goldOut = buyGold > 0 && bought.taken > 0 ? Math.min(buyGold, Math.ceil((bought.paid * 100) / Math.max(1, keep))) : 0;
        if (n <= 0 && goldOut <= 0) continue;
        best = {
          order: how === "ship" ? ship(fleet!.province, home.province, k, n, goldOut, true) : trade(home.province, k, n, goldOut, how === "smuggle"),
          gain,
          grain: n,
          gold: goldOut,
          fleet: how === "ship" ? fleet!.province : null,
        };
      }
    }
    if (best === null) continue;
    orders.push(best.order);
    home.stores -= best.grain;
    spent += best.gold;
    if (best.fleet !== null) {
      plan.orders.delete(best.fleet);
      usedFleets.add(best.fleet);
    } else traders++;
  }

  // An idle fleet whose harbour has little to carry moves to a harbour of ours next to it that has much, to load there
  // next season.
  if (!winter)
    for (const u of sortBy(b.mine.filter((x) => x.kind === "Fleet" && !usedFleets.has(x.province)), [(x: UnitView) => x.province, cmpStr])) {
      const o = plan.orders.tryGet(u.province);
      if (o !== undefined && o.type !== "hold") continue;
      const here = Board.Map.landProvinces.find((x) => (x.id === u.province || x.waters === u.province) && ps.has(x.id));
      if (here !== undefined && spare(ps.get(here.id)!) >= 60) continue;
      const target = sortBy(
        Board.Sail.movesFrom("Fleet", u.province).filter((t) => ps.has(t) && harbourOf(Board.Map.get(t)) > 0 && !b.unitAt.has(t) && !plan.destinations.has(t) && spare(ps.get(t)!) >= 80 && !seasDangerous(b, brain, t)),
        [(t: string) => spare(ps.get(t)!), desc(cmpNum)],
        [(t: string) => t, cmpStr],
      )[0];
      if (target === undefined) continue;
      plan.orders.set(u.province, move(u.province, target));
      plan.destinations.add(target);
      break;
    }
  return spent;
}

/**
 * The tolls a script king sets: a rate on everyone's goods entering its land, higher for a greedy king, and none for the
 * partners it promised free passage on a sealed tablet, nor for its allies. Only what differs from the tolls it has set
 * is ordered, so they stand from season to season.
 */
export function tollOrders(b: Board, brain: Brain, orders: Order[]): void {
  const v = b.v;
  const p = brain.p;
  const base = 5 * Math.round((10 + 10 * p.greed) / 5);
  const mine = v.tolls.filter((t) => t.holder === b.me && t.province === null);
  const current = mine.find((t) => t.partner === null)?.percent ?? 0;
  if (current !== base) orders.push(toll(base));
  const promised = promisedFree(v);
  for (const k of [...b.alive].filter((x) => x !== b.me).sort()) {
    const r = brain.rel.get(k);
    const free = promised.has(k) || (r?.allied ?? false);
    const set = mine.find((t) => t.partner === k)?.percent ?? null;
    if (free && set !== 0) orders.push(toll(0, k));
    else if (!free && set !== null && set !== base) orders.push(toll(base, k));
  }
}

/** Do this king and that partner charge each other tolls, so that free passage on a tablet would be worth asking for? */
export function wantsTradeRights(v: SeatView, to: Power): boolean {
  if (!TradePlay.on(v.power)) return false;
  if (promisedFree(v).has(to)) return false;
  return v.tolls.some((t) => (t.holder === to && t.percent > 0 && (t.partner === null || t.partner === v.power)) || (t.holder === v.power && t.percent > 0));
}

/** The script kings that leave trade abroad, ships and tolls alone (`--no-trade-play`, `--trade-play-half`): none by default. */
export const TradePlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};
