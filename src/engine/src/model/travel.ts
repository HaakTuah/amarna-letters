/**
 * Travel on the map (build order item 7b): routes, and the one rule for what sets a company's pace ("What sets a
 * company's pace"), for envoys, servants, gold and armies alike. A route is a chain of provinces; each connection on it
 * costs a whole number of points, tenths of a day on the road, from the map data of item 7a ({@link connectionDays}), and
 * a traveller advances GameConfig.travelDays days' worth of points a season, carrying what he does not use over to the next.
 *
 * The pace is one function ({@link legPoints}) with one term per factor. A term whose system does not exist yet stays
 * neutral (100%) until the item that brings it turns it on: terrain and river crossings, winter passes, the sea and
 * sneaking are on from item 7b; size, load, pack animals and the slowest part with caravans (9+a), water, fodder and the season on land
 * with land and climate (10+), an army's size and forced marches with distance-based marching (13), the leader's skill
 * with characters who travel (11b), roads (15) and horses for messengers (the economy's second phase).
 */
import { idiv } from "../core/num.ts";
import { connectionDays, connectionKm } from "./distance.ts";
import { MarchData } from "./command.ts";
import { Rivers, climateOf, crossingBetween, floodSeasonOf } from "./geography.ts";
import { type Edge, WinterSeason, type WorldMap, dangerousInWinter } from "./map.ts";
import { roadTerm, stationTerm, type Ways } from "./works.ts";

/** Points to a day on the road: progress counts in tenths of a day, so a factor worth a day or less still counts. */
export const PointsPerDay = 10;

/**
 * First guesses (item 18 tunes them): a ferry holds a company up a day at a river crossing, and four more in the
 * river's flood season, when its fords are closed; off the road a company takes half as long again ("Sneaking"); a
 * snowbound pass takes twice as long in winter (item 9, "Winter is dangerous, never closed"; the open sea in winter costs
 * no time, only its storms).
 */
export const TravelData = { ferryDays: 1, floodDays: 4, sneakPercent: 150, winterPassPercent: 200 } as const;

/**
 * First guesses for land and climate on the road (item 10+a, tuned in item 18): in arid land a company can be only as
 * large as the wells allow, `wells` men or measures, and takes `dryPer` percent longer for each beyond, at most `dryMost`
 * ("Water"); in winter or arid land its animals' fodder is carried, `fodderPercent` of what they can carry, which eats
 * into the load ("Fodder"); and in winter the land itself is slower where its winter is cool or hard, rain and snow on
 * the roads ("The land it crosses": `coolWinter`, `hardWinter` percent of the time).
 */
export const ClimatePace = { wells: 30, dryPer: 2, dryMost: 100, fodderPercent: 25, coolWinter: 110, hardWinter: 125 } as const;

/**
 * First guesses for the pace of a large company (item 9+a, tuned in item 18): a long column takes a percent longer for
 * every `sizePer` men or measures beyond the first `sizeFree`, at most `sizeMost` percent longer; an empty company goes
 * `emptyPercent` of the time of a fully loaded one, in proportion to its load; oxcarts take `oxcartPercent` and porters
 * `portersPercent` of the time donkeys do.
 */
export const PaceData = { sizeFree: 20, sizePer: 4, sizeMost: 100, emptyPercent: 80, oxcartPercent: 150, portersPercent: 110 } as const;

/** Pack animals: donkeys are the pack animals of the age; oxcarts carry heavy loads slowly; porters carry on their backs. */
export type Animals = "Donkeys" | "Oxcarts" | "Porters";

/**
 * What a company is, for its pace (item 9+a): whether it sneaks, its size (men and beasts, counted for a caravan by the
 * measures it carries), its load against what its animals can carry, and its animals. A company made of parts moving
 * together goes at the pace of its slowest part. A lone traveller leaves size, load and animals out: they are neutral.
 */
export interface Company {
  /** Off the road, to pass unseen through a land closed to it. */
  readonly sneaking: boolean;
  readonly size?: number;
  readonly load?: number;
  readonly capacity?: number;
  readonly animals?: Animals;
  /** The parts moving together, each with its own terms: the slowest sets the pace. */
  readonly parts?: readonly Company[];
  /**
   * Troops on the march (item 13, distance-based marching): an army's or a fleet's men, which set its pace as a column's
   * length does ({@link MarchData}), and whether it is forcing the pace. Left out for everyone else.
   */
  readonly troops?: { readonly men: number; readonly fleet: boolean; readonly forced: boolean };
  /**
   * The roads and relay stations it goes by (item 15, the roads term): a kept road speeds everyone on it, armies included,
   * and relay stations a lone traveller; left out, every road is a kept track (level 1) and there are no stations.
   */
  readonly ways?: Ways;
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

/** Is the connection a snowbound mountain pass in this season (0 Akhet, 1 Peret, 2 Shemu)? Slow, but never closed. */
export function snowbound(map: WorldMap, a: string, b: string, season: number): boolean {
  const e = edgeBetween(map, a, b);
  return e !== null && season === WinterSeason && dangerousInWinter(e) && !e.open && e.kind !== "Sea";
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
 * The points one connection costs a company in a season, or Infinity where there is no connection. The terms, each a
 * percentage of the time or a number of days added, in the order of "What sets a company's pace".
 */
export function legPoints(map: WorldMap, from: string, to: string, season: number, company: Company = OnTheRoad): number {
  if (edgeBetween(map, from, to) === null) return Infinity;
  // The slowest part sets the pace of a company moving together.
  if (company.parts !== undefined && company.parts.length > 0) return Math.max(...company.parts.map((c) => legPoints(map, from, to, season, c.ways === undefined && company.ways !== undefined ? { ...c, ways: company.ways } : c)));
  // The land it crosses: terrain, passes and the desert, and at sea the passage and the current (item 7a's data);
  // a boat on a river where one goes faster than walking.
  let days = connectionDays(map, from, to);
  const boat = boatDays(map, from, to);
  const byBoat = boat !== null && boat < days;
  if (byBoat) days = boat;
  // River crossings: the ferry, and the flood season.
  const c = crossingBetween(from, to);
  if (c !== null && c.kind === "River") {
    days += TravelData.ferryDays;
    if (floodSeasonOf(c.river) === season) days += TravelData.floodDays;
  }
  let percent = 100;
  // Winter: a mountain pass under snow is slow going, never closed.
  if (snowbound(map, from, to, season)) percent = (percent * TravelData.winterPassPercent) / 100;
  // The season on land (item 10+a): roads in rain and snow where the winter is cool or hard.
  const land = edgeBetween(map, from, to)!.kind !== "Sea";
  if (land && season === WinterSeason) {
    const w = climateOf(to).winter;
    if (w !== "Mild") percent = (percent * (w === "Hard" ? ClimatePace.hardWinter : ClimatePace.coolWinter)) / 100;
  }
  // Sneaking: off the road on land; at sea a ship is a ship.
  if (company.sneaking && edgeBetween(map, from, to)!.kind !== "Sea") percent = (percent * TravelData.sneakPercent) / 100;
  // Size, load and animals (9+a); water and fodder (10+a); neutral until their items: an army's size and forced marches
  // (13), the leader (11b), roads (15), horses (the economy's second phase).
  const dry = (land && (climateOf(to).water === "Arid" || climateOf(from).water === "Arid")) || crossingBetween(from, to)?.kind === "Desert";
  const fed = withFodder(company, dry || (land && season === WinterSeason && climateOf(to).winter !== "Mild"));
  percent = (percent * sizeAndLoad(fed) * water(company, dry) * leader(company) * roads(company, from, to, land && !byBoat)) / 100_000_000;
  // An army's or a fleet's size, and a forced march (item 13).
  percent = (percent * troopsPace(company)) / 100;
  return Math.max(1, Math.round(days * PointsPerDay * (percent / 100)));
}

/** The company's size, load and pack animals, as a percentage of a lone traveller's time (on land and on the river alike). */
function sizeAndLoad(c: Company): number {
  const size = c.size ?? 0;
  const long = Math.min(PaceData.sizeMost, Math.max(0, Math.floor((size - PaceData.sizeFree) / PaceData.sizePer)));
  const cap = c.capacity ?? 0;
  const load = cap > 0 ? Math.min(100, Math.floor(((c.load ?? 0) * 100) / cap)) : 100;
  const loaded = PaceData.emptyPercent + Math.floor(((100 - PaceData.emptyPercent) * load) / 100);
  const beasts = c.animals === "Oxcarts" ? PaceData.oxcartPercent : c.animals === "Porters" ? PaceData.portersPercent : 100;
  return Math.floor(((100 + long) * loaded * beasts) / 10_000);
}
/** In arid land, a company larger than the wells allow is slow to water (item 10+a). */
function water(c: Company, dry: boolean): number {
  if (!dry) return 100;
  const size = c.size ?? 0;
  return 100 + Math.min(ClimatePace.dryMost, Math.max(0, (size - ClimatePace.wells) * ClimatePace.dryPer));
}

/** In winter or arid land, pack animals carry their own fodder, which eats into the load (porters need none). */
function withFodder(c: Company, needed: boolean): Company {
  const cap = c.capacity ?? 0;
  if (!needed || cap <= 0 || c.animals === "Porters") return c;
  return { ...c, load: Math.min(cap, (c.load ?? 0) + Math.floor((cap * ClimatePace.fodderPercent) / 100)) };
}
/** An army's or a fleet's pace by its men, and a forced march's (item 13, "What sets a company's pace"). */
function troopsPace(c: Company): number {
  const t = c.troops;
  if (t === undefined) return 100;
  const [per, most] = t.fleet ? [MarchData.fleetPer, MarchData.fleetMost] : [MarchData.armyPer, MarchData.armyMost];
  const long = 100 + Math.min(most, Math.floor(Math.max(0, t.men) / per));
  return t.forced ? Math.floor((long * MarchData.forcedPercent) / 100) : long;
}
const leader = (_c: Company): number => 100;
/**
 * The roads term (item 15): on land, off the boat and on the road, the road's level in each half of the connection, and
 * for a lone traveller the relay stations' fresh animals and stores too.
 */
function roads(c: Company, from: string, to: string, onLand: boolean): number {
  if (!onLand || c.sneaking || c.ways === undefined) return 100;
  const road = roadTerm(c.ways, from, to);
  const lone = c.size === undefined && c.troops === undefined && (c.parts === undefined || c.parts.length === 0) && (c.capacity ?? 0) === 0;
  return lone ? idiv(road * stationTerm(c.ways, from, to), 100) : road;
}

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
 * Seasons for word to go from one province to another, setting out in a turn: by the fastest route in its season, at
 * least one. Reports, rumours and ransoms travel so by themselves until item 11b gives them carriers ("Messengers are
 * errands"), and news of distant land with them.
 */
export function wordSeasons(travelDays: number, map: WorldMap, from: string, to: string, turn: number): number {
  if (from === to) return 1;
  const perSeason = travelDays * PointsPerDay;
  const season = (((turn - 1) % 3) + 3) % 3;
  const points = fastestPoints(map, from, to, season);
  return points === Infinity ? 3 : Math.max(1, Math.ceil(points / perSeason));
}
