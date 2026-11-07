/**
 * Where each king is (build order item 13, "The capital is wherever the king is"): his court, from where his orders travel
 * and to where his people's reports and foreign envoys come. A king never moved is at his map capital.
 */
import { idiv } from "../core/num.ts";
import { CourtData } from "../model/command.ts";
import { seasonOfTurn, type WorldMap } from "../model/map.ts";
import type { CourtOrder } from "../model/orders.ts";
import type { Crowned, Power } from "../model/power.ts";
import { findCharacter, type GameState } from "../model/state.ts";
import { PointsPerDay, cheapestRoute, legPoints } from "../model/travel.ts";
import type { Checking } from "./validator-context.ts";
import { type Ways, waysOf } from "../model/works.ts";

/** The province where the king is: his capital, wherever that is. */
export function courtOf(s: GameState, map: WorldMap, p: Power): string {
  return s.court.tryGet(p) ?? map.capital(p).id;
}

/** Whether the king is on the road with his court. */
export function onTheRoad(s: GameState, p: Power): boolean {
  return s.kingRoads.some((r) => r.power === p);
}

/** The king's road from where he is to `to`, at his court's pace this season, or null where none leads. */
export function kingRoute(s: GameState, map: WorldMap, p: Power, to: string): { route: string[]; cost: number } | null {
  const season = seasonOfTurn(s.turn);
  return cheapestRoute(map, courtOf(s, map, p), to, (a, b) => legPoints(map, a, b, season, { sneaking: false, size: CourtData.companyMen, ways: waysOf(s) }));
}

/** What moving the court to a province costs, by the days of road to it. */
export function courtMoveCost(days: number): number {
  return CourtData.moveBase + idiv(Math.max(0, days) * CourtData.movePer, 10);
}

/** Why the king cannot set out with his court for `to` now, or null; reserves its cost when it can. */
export function courtMoveRefusal(v: Checking, order: CourtOrder): string | null {
  const to = order.to;
  if (!v.Map.exists(to) || v.Map.get(to).isSea) return `there is no land province called '${to}'`;
  if (to === courtOf(v.S, v.Map, v.power) && !onTheRoad(v.S, v.power)) return `your court is already in ${to}`;
  if (v.orders.find((o) => o.type === "court") !== order) return "you already set out for another place by an earlier order";
  const r = kingRoute(v.S, v.Map, v.power, to);
  if (r === null) return `no road leads from your court to ${to}`;
  return v.spend(courtMoveCost(idiv(r.cost, PointsPerDay)));
}

/**
 * The seasons the realm's couriers take from one province to another (item 13, "Distance inside your own realm"): 0 where
 * a courier makes the road within the season, so an order sent now is carried out now and a report reaches the king now;
 * else the whole seasons beyond the first it takes, at the pace of a lone traveller on the fastest road. Infinity where no
 * road leads.
 */
export function courierSeasons(s: GameState, map: WorldMap, from: string, to: string, turn: number = s.turn): number {
  if (from === to || s.config.realmDistance <= 0) return 0;
  const cost = courierPoints(map, waysOf(s), from, seasonOfTurn(turn)).get(to);
  if (cost === undefined) return Infinity;
  return Math.floor(cost / (s.config.travelDays * PointsPerDay));
}

/**
 * The season word of `province`'s season `turn` reaches the court in `court` (bug #616, "one clock for one road"): what
 * the court sees as current (`sight`), a province's report (who holds it, its sieges), the notices told from it
 * (`TurnEngine.heardAt`), a census and what is known of caravans and units there come by this one clock, so the same
 * season's report and notices arrive together. The couriers' road home from the place to the court in that season
 * (roads differ by direction: rivers, winter at the destination): the same season where they make it within the season,
 * else one season more than the whole seasons beyond the first they take ({@link courierSeasons}), plus any `extra`
 * seasons; Infinity where no road leads. News lanes that bring word from a province to a court time it by this too.
 */
export function wordHomeAt(s: GameState, map: WorldMap, court: string, province: string, turn: number, extra: number = 0): number {
  const d = courierSeasons(s, map, province, court, turn) + extra;
  return d === 0 ? turn : Number.isFinite(d) ? turn + 1 + d : Infinity;
}

/**
 * The points a courier takes from one province to every other in a season of the year, by the roads and relay stations
 * standing (item 15). Cached for each map and each state of the roads, which is renewed whenever a level changes.
 */
const tables = new WeakMap<WorldMap, WeakMap<Ways, Map<string, Map<string, number>>>>();
function courierPoints(map: WorldMap, ways: Ways, from: string, season: number): Map<string, number> {
  let byWays = tables.get(map);
  if (byWays === undefined) tables.set(map, (byWays = new WeakMap()));
  let byKey = byWays.get(ways);
  if (byKey === undefined) byWays.set(ways, (byKey = new Map()));
  const key = `${from}|${season}`;
  const known = byKey.get(key);
  if (known !== undefined) return known;
  const dist = new Map<string, number>([[from, 0]]);
  const done = new Set<string>();
  for (;;) {
    let best: string | null = null;
    for (const [k, v] of dist) if (!done.has(k) && (best === null || v < dist.get(best)!)) best = k;
    if (best === null) break;
    done.add(best);
    for (const n of map.neighbors(best)) {
      const d = dist.get(best)! + legPoints(map, best, n, season, { sneaking: false, ways });
      if (d < (dist.get(n) ?? Infinity)) dist.set(n, d);
    }
  }
  byKey.set(key, dist);
  return dist;
}

/** The seasons word from the king takes to reach a province: from his court, wherever he is. */
export function wordFromKing(s: GameState, map: WorldMap, p: Power, to: string): number {
  return courierSeasons(s, map, courtOf(s, map, p), to);
}

/** Item 17b, part B: the realm whose reigning king the character is, or null (a realm that has fallen has no reigning king). */
export function realmOfKing(s: GameState, id: string): Power | null {
  for (const [p, r] of s.reigns) if (r.character === id && !s.eliminated.includes(p)) return p;
  return null;
}

/**
 * The heirs who have reigned, by realm, for the names every page and the engine use (`setCrowned`): each realm's heirs in
 * order (every king after the first is one: the kings of the reigns that ended, but the first, and the one reigning).
 */
export function crownedIn(s: GameState): Crowned[] {
  const out: Crowned[] = [];
  for (const [p, r] of s.reigns) {
    if (r.name === "") continue;
    const ended = s.reignsEnded.filter((x) => x.power === p);
    // The kings after the first: those whose reigns ended, and the one reigning unless he is dead and his heir not yet risen.
    const names = ended.slice(1).map((x) => findCharacter(s, x.character)?.name ?? "");
    if (!ended.some((x) => x.character === r.character)) names.push(r.name);
    out.push({ power: p, names, about: r.about, heard: [...(s.reignsHeard.tryGet(p) ?? [])] });
  }
  return out;
}
