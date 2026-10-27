/**
 * Travel on the map (build order item 7b): routes, and the one rule for what sets a company's pace ("What sets a
 * company's pace"), for envoys, servants, gold and armies alike. A route is a chain of provinces; each connection on it
 * costs a whole number of points, tenths of a day on the road, from the map data of item 7a ({@link connectionDays}), and
 * a traveller advances GameConfig.travelDays days' worth of points a season, carrying what he does not use over to the next.
 *
 * The pace is one function ({@link legPoints}) with one term per factor. A term whose system does not exist yet stays
 * neutral (100%) until the item that brings it turns it on: terrain and river crossings, winter passes, the sea and
 * sneaking are on from item 7b; size, load and pack animals come with caravans (9+), water, fodder and the season on land
 * with land and climate (10+), an army's size and forced marches with distance-based marching (13), the leader's skill
 * with characters who travel (11b), roads (15) and horses for messengers (the economy's second phase).
 */
import { connectionDays, connectionKm } from "./distance.ts";
import { Rivers, crossingBetween } from "./geography.ts";
import { type Edge, WinterSeason, type WorldMap, closedInWinter } from "./map.ts";

/** Points to a day on the road: progress counts in tenths of a day, so a factor worth a day or less still counts. */
export const PointsPerDay = 10;

/**
 * First guesses (item 18 tunes them): a ferry holds a company up a day at a river crossing, and four more in the
 * river's flood season, when its fords are closed; off the road a company takes half as long again ("Sneaking").
 */
export const TravelData = { ferryDays: 1, floodDays: 4, sneakPercent: 150 } as const;

/** What a company is, for its pace. Only sneaking is a choice today; the rest of its terms are neutral (above). */
export interface Company {
  /** Off the road, to pass unseen through a land closed to it. */
  readonly sneaking: boolean;
}

export const OnTheRoad: Company = { sneaking: false };

const edgeCache = new WeakMap<WorldMap, Map<string, Edge>>();

/** The connection between two neighbouring provinces, or null. */
export function edgeBetween(map: WorldMap, a: string, b: string): Edge | null {
  let byKey = edgeCache.get(map);
  if (byKey === undefined) {
    byKey = new Map();
    for (const e of map.edges) {
      byKey.set(e.a + "|" + e.b, e);
      byKey.set(e.b + "|" + e.a, e);
    }
    edgeCache.set(map, byKey);
  }
  return byKey.get(a + "|" + b) ?? null;
}

/** Is the connection closed in this season (0 Akhet, 1 Peret, 2 Shemu)? Open sea and mountain passes close in winter. */
export function closedIn(map: WorldMap, a: string, b: string, season: number): boolean {
  const e = edgeBetween(map, a, b);
  return e === null || (season === WinterSeason && closedInWinter(e));
}

/**
 * Days by boat between two provinces next to each other in one reach of a great river, downstream or upstream, or null
 * where no boat goes ("Rivers are roads": the Nile both ways, under sail before the north wind upstream; the Euphrates
 * and the Tigris downstream only). On foot a river counts once: a walker along it already goes at his own pace.
 */
export function boatDays(map: WorldMap, from: string, to: string): number | null {
  for (const r of Rivers)
    for (const reach of r.reaches) {
      const i = reach.indexOf(from);
      const j = reach.indexOf(to);
      if (i < 0 || j < 0 || Math.abs(i - j) !== 1) continue;
      const pace = j > i ? r.down : r.up;
      if (pace <= 0) return null;
      return connectionKm(map, from, to) / pace;
    }
  return null;
}

/**
 * The points one connection costs a company in a season, or Infinity when it is closed then. The terms, each a
 * percentage of the time or a number of days added, in the order of "What sets a company's pace".
 */
export function legPoints(map: WorldMap, from: string, to: string, season: number, company: Company = OnTheRoad): number {
  if (closedIn(map, from, to, season)) return Infinity;
  // The land it crosses: terrain, passes and the desert, and at sea the passage and the current (item 7a's data);
  // a boat on a river where one goes faster than walking.
  let days = connectionDays(map, from, to);
  const boat = boatDays(map, from, to);
  if (boat !== null && boat < days) days = boat;
  // River crossings: the ferry, and the flood season.
  const c = crossingBetween(from, to);
  if (c !== null && c.kind === "River") {
    days += TravelData.ferryDays;
    const river = Rivers.find((r) => r.id === c.river);
    if (river !== undefined && river.flood === season) days += TravelData.floodDays;
  }
  let percent = 100;
  // Sneaking: off the road on land; at sea a ship is a ship.
  if (company.sneaking && edgeBetween(map, from, to)!.kind !== "Sea") percent = (percent * TravelData.sneakPercent) / 100;
  // Neutral until their items: size and load (9+), water and fodder (10+), an army's size and forced marches (13), the
  // leader (11b), roads (15), horses (the economy's second phase).
  percent = (percent * sizeAndLoad(company) * waterAndFodder(company) * leader(company) * roads(company)) / 100_000_000;
  return Math.max(1, Math.round(days * PointsPerDay * (percent / 100)));
}

const sizeAndLoad = (_c: Company): number => 100;
const waterAndFodder = (_c: Company): number => 100;
const leader = (_c: Company): number => 100;
const roads = (_c: Company): number => 100;

/**
 * The cheapest route between two provinces by a cost for each connection and for entering each province (Infinity bars
 * it), or null if none. Ties go to the province first in the map's order, so every engine finds the same route.
 */
export function cheapestRoute(map: WorldMap, from: string, to: string, leg: (a: string, b: string) => number, enter: (p: string) => number = () => 0): { route: string[]; cost: number } | null {
  if (from === to) return { route: [from], cost: 0 };
  const order = new Map(map.provinces.map((p, i) => [p.id, i] as const));
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (;;) {
    let best: string | null = null;
    for (const [k, v] of dist)
      if (!done.has(k) && (best === null || v < dist.get(best)! || (v === dist.get(best)! && order.get(k)! < order.get(best)!))) best = k;
    if (best === null || best === to) break;
    done.add(best);
    for (const n of map.neighbors(best)) {
      if (done.has(n)) continue;
      const step = leg(best, n);
      if (step === Infinity) continue;
      const extra = n === to ? 0 : enter(n);
      if (extra === Infinity) continue;
      const d = dist.get(best)! + step + extra;
      const old = dist.get(n);
      if (old === undefined || d < old) {
        dist.set(n, d);
        prev.set(n, best);
      }
    }
  }
  const cost = dist.get(to);
  if (cost === undefined) return null;
  const route = [to];
  while (route[0] !== from) route.unshift(prev.get(route[0])!);
  return { route, cost };
}

const fastestCache = new WeakMap<WorldMap, Map<string, number>>();

/** The points of the fastest route on the road between two provinces in a season (Infinity if none is open then). */
export function fastestPoints(map: WorldMap, from: string, to: string, season: number): number {
  let cache = fastestCache.get(map);
  if (cache === undefined) fastestCache.set(map, (cache = new Map()));
  const key = `${from}|${to}|${season}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const r = cheapestRoute(map, from, to, (a, b) => legPoints(map, a, b, season));
  const points = r === null ? Infinity : r.cost;
  cache.set(key, points);
  return points;
}

/**
 * Seasons for word to go from one province to another, setting out in a turn: by the fastest route open in its season,
 * at least one; if none is open (an island in winter), it waits for the next season. Reports, rumours and ransoms travel
 * so by themselves until item 11b gives them carriers ("Messengers are errands"), and news of distant land with them.
 */
export function wordSeasons(travelDays: number, map: WorldMap, from: string, to: string, turn: number): number {
  if (from === to) return 1;
  const perSeason = travelDays * PointsPerDay;
  for (let wait = 0; wait < 3; wait++) {
    const season = (((turn - 1 + wait) % 3) + 3) % 3;
    const points = fastestPoints(map, from, to, season);
    if (points !== Infinity) return wait + Math.max(1, Math.ceil(points / perSeason));
  }
  return 3;
}
