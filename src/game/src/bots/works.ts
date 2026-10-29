/**
 * What a script king keeps and builds (build order item 15, "One rule for everything built"): relay stations and roads
 * where they bring his far provinces within his couriers' season, police where the loose men gather and bands work,
 * harbours where his fleets would winter on open beaches, water works for threatened cities whose water can fail, repairs
 * to his besieged walls, and an army in a foe's land razing the relay stations his couriers ride by. Walls themselves are
 * the strategy's (`fortification` in statecraft-strategy.ts). Every figure it reckons with is the engine's own.
 */
import {
  BandData,
  build,
  buildGold,
  cheapestRoute,
  cmpNum,
  cmpStr,
  desc,
  harbourRoom,
  landRefusal,
  legPoints,
  PoliceMenPerLevel,
  PointsPerDay,
  raze,
  seasonOfTurn,
  sortBy,
  startHarbour,
  startRoad,
  startStations,
  sum,
  WorksData,
  type Order,
  type SeatView,
  type WorkKind,
  type WorkView,
  type Ways,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { MilitaryPlan } from "./tactics.ts";

/**
 * Whether a script king plays what item 15 adds: roads, relay stations, policing, harbours, water works, repairs under
 * siege and razing. Off for the measure of using it against ignoring it (`--works-play-half`), when it builds only walls,
 * as before, and keeps what stands by corvée.
 */
export const WorksPlay: { off: boolean; only: ReadonlySet<string> | null; on: (me: string) => boolean } = {
  off: false,
  only: null,
  on(me: string): boolean {
    return !(this.off && (this.only === null || this.only.has(me)));
  },
};

/** A season of road for a lone traveller, in points (the engine's 45 days). */
const SeasonPoints = 45 * PointsPerDay;

/** What the king's own view says stands of a kind in a province of his, or null where it is not his. */
const own = (v: SeatView, kind: WorkKind, id: string): WorkView | null => v.works.find((w) => w.kind === kind && w.province === id) ?? null;

/**
 * The roads and relay stations as the king knows them: his own as his view gives them, others' where he sees them, and
 * elsewhere as the sources give them at the start.
 */
export function knownWays(v: SeatView): Ways {
  const level = (kind: WorkKind, id: string, start: number): number => {
    const mine = own(v, kind, id);
    if (mine !== null) return mine.level;
    if (v.owner.getOrDefault(id, null) === v.power) return 0;
    return v.worksSeen.find((w) => w.kind === kind && w.province === id)?.level ?? start;
  };
  return {
    road: (id) => level("Roads", id, startRoad(Board.Map.get(id))),
    stations: (id) => level("Stations", id, startStations(Board.Map.get(id))),
  };
}

/** The seasons beyond the first a courier takes from the court to each province, by the ways the king knows. */
export function courierSeasonsFrom(v: SeatView, ways: Ways): Map<string, { seasons: number; route: string[] }> {
  const season = seasonOfTurn(v.turn);
  const out = new Map<string, { seasons: number; route: string[] }>();
  for (const [id, holder] of v.owner) {
    if (holder !== v.power || id === v.courtAt) continue;
    const r = cheapestRoute(Board.Map, v.courtAt, id, (a, c) => legPoints(Board.Map, a, c, season, { sneaking: false, ways }));
    if (r !== null) out.set(id, { seasons: Math.floor(r.cost / SeasonPoints), route: r.route });
  }
  return out;
}

/**
 * The season's orders for what the king keeps and builds, beyond walls, and the gold their first season costs; razing
 * goes into the army's own order in `plan`. `spare` is the gold it may spend after its reserve.
 */
export function worksOrders(b: Board, plan: MilitaryPlan, spare: number): { orders: Order[]; spent: number } {
  const v = b.v;
  const orders: Order[] = [];
  let spent = 0;
  if (!WorksPlay.on(b.me)) return { orders, spent };
  const mineLand = sortBy(
    [...v.owner].filter(([, o]) => o === b.me).map(([k]) => k),
    [(x: string) => x, cmpStr],
  );
  const foreign = (id: string): boolean => b.units.some((u) => u.province === id && u.power !== b.me);
  const free = (id: string): boolean => b.siegeAt(id) === null && !foreign(id);
  const underWay = (kind: WorkKind, id: string): boolean => {
    const w = own(v, kind, id);
    return w !== null && w.keep > w.level;
  };
  // Gold when there is plenty, else corvée: the men are only away for a season.
  const pay = (cost: number): boolean => {
    if (cost > 0 && spare - spent - cost >= 150) {
      spent += cost;
      return false;
    }
    return true;
  };

  // Repairs: a besieged city of ours mends its walls with the men and food inside, a step a season.
  for (const x of v.sieges.filter((s) => s.holder === b.me && s.progress > 0 && s.walls > 0)) orders.push(build(x.province, "Walls", x.walls, true));

  // Police where the loose gather or bands work: enough to hold them down, more where a band works.
  let policed = 0;
  for (const id of sortBy(mineLand.filter(free), [(x: string) => v.provinces.find((p) => p.province === x)?.loose ?? 0, desc(cmpNum)], [(x: string) => x, cmpStr])) {
    if (policed >= 2) break;
    const loose = v.provinces.find((p) => p.province === id)?.loose ?? 0;
    const bands = sum(
      v.bands.filter((x) => x.province === id),
      (x) => x.men,
    );
    if (loose < BandData.crowd / 2 && bands === 0) continue;
    const want = Math.min(WorksData.Policing.most, Math.ceil(Math.min(300, Math.floor(loose / 40) + Math.floor(bands / 3) + (bands > 0 ? 50 : 0)) / PoliceMenPerLevel));
    const now = own(v, "Policing", id)?.level ?? 0;
    if (want <= now + 2) continue;
    orders.push(build(id, "Policing", want, pay(buildGold("Policing", id, want - now))));
    policed++;
  }

  // Relay stations, then roads, on the road to the provinces our couriers do not reach within the season: the province of
  // ours on the most of those roads, away from the frontier where a foe would march on them.
  const ways = knownWays(v);
  const far = [...courierSeasonsFrom(v, ways).values()].filter((x) => x.seasons >= 1);
  if (far.length > 0 && !mineLand.some((id) => underWay("Stations", id) || underWay("Roads", id))) {
    const hits = new Map<string, number>();
    for (const f of far) for (const id of f.route.slice(1)) if (v.owner.getOrDefault(id, null) === b.me && free(id)) hits.set(id, (hits.get(id) ?? 0) + 1);
    for (const [id] of sortBy([...hits], [([, n]) => n, desc(cmpNum)], [([k]) => k, cmpStr])) {
      const st = ways.stations(id);
      const road = ways.road(id);
      const kind: WorkKind | null = st < WorksData.Stations.most ? "Stations" : road < WorksData.Roads.most && (plan.danger.tryGet(id)?.[1] ?? 0) < 0.4 ? "Roads" : null;
      if (kind === null) continue;
      const level = kind === "Stations" ? st : road;
      orders.push(build(id, kind, level + 1, pay(buildGold(kind, id, level + 1))));
      break;
    }
  }

  // Harbours where our fleets would winter on open beaches: before the winter, the harbour of ours on those waters with
  // the most room to grow.
  const fleets = b.mine.filter((u) => u.kind === "Fleet");
  const byWaters = new Map<string, number>();
  for (const u of fleets) {
    const p = Board.Map.get(u.province);
    const w = p.isSea ? p.id : p.waters;
    if (w !== null) byWaters.set(w, (byWaters.get(w) ?? 0) + u.men);
  }
  for (const [waters, men] of sortBy([...byWaters], [([k]) => k, cmpStr])) {
    const shores = mineLand.filter((id) => Board.Map.get(id).waters === waters && landRefusal("Harbour", Board.Map.get(id)) === null && free(id));
    const room = sum(shores, (id) => harbourRoom(own(v, "Harbour", id)?.level ?? 0));
    if (men <= room || shores.some((id) => underWay("Harbour", id))) continue;
    const best = sortBy(
      shores.filter((id) => (own(v, "Harbour", id)?.level ?? startHarbour(Board.Map.get(id))) < WorksData.Harbour.most),
      [(id: string) => own(v, "Harbour", id)?.level ?? 0, desc(cmpNum)],
      [(id: string) => id, cmpStr],
    )[0];
    if (best === undefined) continue;
    const level = (own(v, "Harbour", best)?.level ?? 0) + 1;
    orders.push(build(best, "Harbour", level, pay(buildGold("Harbour", best, level))));
  }

  // Water works for a threatened walled city whose water can fail.
  for (const id of mineLand) {
    if (!free(id) || b.wallLevel(id) <= 0 || (plan.danger.tryGet(id)?.[1] ?? 0) < 0.5) continue;
    if (landRefusal("Water", Board.Map.get(id)) !== null || underWay("Water", id)) continue;
    const level = own(v, "Water", id)?.level ?? 0;
    if (level >= WorksData.Water.most) continue;
    orders.push(build(id, "Water", level + 1, pay(buildGold("Water", id, level + 1))));
    break;
  }

  // An army of ours pressing a siege already begun razes the relay stations the foe's couriers ride by; its standing there
  // presses the siege all the same.
  for (const [at, o] of [...plan.orders.entries()]) {
    if (o.type !== "hold" && o.type !== "besiege") continue;
    const u = b.unitAt.tryGet(at);
    const holder = v.owner.getOrDefault(at, null);
    if (u === undefined || u.kind !== "Army" || u.power !== b.me || holder === null || holder === b.me) continue;
    // Only where we lay siege: a foe's land, not a friend's we pass through.
    if (b.siegeAt(at)?.besieger !== b.me) continue;
    if (!v.worksSeen.some((w) => w.province === at && w.kind === "Stations" && w.level > 0)) continue;
    plan.orders.set(at, raze(at, "Stations"));
  }
  return { orders, spent };
}

