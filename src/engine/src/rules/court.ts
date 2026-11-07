/**
 * Where each king and his court are (build order item 13, "The capital is wherever the king is"; item 17b, part C, "A realm
 * holds by its ledger"): his court, his capital, where foreign envoys and letters come and his treasury and archive are
 * kept, and where he commands from, the court or, apart from it, wherever he stands. A court never moved is at its map
 * capital.
 */
import { idiv } from "../core/num.ts";
import { CourtData, KingAloneData } from "../model/command.ts";
import { seasonOfTurn, type WorldMap } from "../model/map.ts";
import type { CourtOrder } from "../model/orders.ts";
import type { Crowned, Power } from "../model/power.ts";
import { findCharacter, type GameState } from "../model/state.ts";
import { PointsPerDay, cheapestRoute, legPoints } from "../model/travel.ts";
import type { Checking } from "./validator-context.ts";
import { type Ways, waysOf } from "../model/works.ts";

/** The province where the king's court is: his capital, wherever that is. */
export function courtOf(s: GameState, map: WorldMap, p: Power): string {
  return s.court.tryGet(p) ?? map.capital(p).id;
}

/**
 * Where the king stands apart from his court as it knows (item 17b, part C): where he stands, or, while word that he was
 * taken or died there is on its way, where he was; undefined with his court.
 */
export function kingAfield(s: GameState, p: Power): string | undefined {
  return s.kingAt.tryGet(p) ?? s.kingHeard.tryGet(p);
}

/**
 * The province the king commands from as his court knows it (item 17b, part C, "the king commands from where he is"): where
 * he stands apart from it ({@link kingAfield}), else his court. His orders to his land and armies go out from here, their
 * reports come here, and his view and his order checks are drawn from here, so his capture or death away from his court
 * shows in nothing before the word of it comes. What is physically true where he stands goes by {@link standsAt}.
 */
export function seatOf(s: GameState, map: WorldMap, p: Power): string {
  return kingAfield(s, p) ?? courtOf(s, map, p);
}

/**
 * Where the king physically stands for the rules of the world (item 17b, part C): apart from his court, or with it; one
 * taken or dead away from it is no longer where he was, and his court rules in his name. A unit he stands with carries
 * out a standing order, his presence holds a city's gate, and a battle or a city lost there takes him.
 */
export function standsAt(s: GameState, map: WorldMap, p: Power): string {
  return s.kingAt.tryGet(p) ?? courtOf(s, map, p);
}

/**
 * Item 17b, part C: the seasons a courier from a king's court takes to where he is apart from it, as it knows, beyond the
 * next, by which the court's business reaches him (`CourtKinds`, `GameState.courtLag`); 0 with his court.
 */
export function courtLagOf(s: GameState, map: WorldMap, p: Power): number {
  const at = kingAfield(s, p);
  if (at === undefined) return 0;
  const t = wordHomeAt(s, map, at, courtOf(s, map, p), s.turn);
  return Number.isFinite(t) && t > s.turn ? t - s.turn : 0;
}

/**
 * Item 17b, part C: whether what came to a power's court in season `turn` (a tablet, the check of one, a person come there)
 * has reached its king away from it, as the notice of it does: at once with his court, else `lag` seasons after the next.
 */
export function broughtToKing(s: GameState, turn: number, lag: number): boolean {
  return lag === 0 || turn + 1 + lag <= s.turn;
}

/** Item 17b, part C: whether word that a power's king was taken or died away from his court is still on its way to it. */
export function kingLossUnheard(s: GameState, p: Power): boolean {
  return s.journeys.some((j) => j.kind === "Word" && j.to === p && (j.news === "KingTaken" || j.news === "KingDead"));
}

/** Whether the court is on the road (`alone`: whether the king is, without it). */
export function onTheRoad(s: GameState, p: Power, alone = false): boolean {
  return s.kingRoads.some((r) => r.power === p && r.alone === alone);
}

/** The road to `to` of the court from where it is, or (`alone`) of the king from where he is, at its pace this season, or null where none leads. */
export function kingRoute(s: GameState, map: WorldMap, p: Power, to: string, alone = false): { route: string[]; cost: number } | null {
  const season = seasonOfTurn(s.turn);
  const size = alone ? KingAloneData.companyMen : CourtData.companyMen;
  return cheapestRoute(map, alone ? seatOf(s, map, p) : courtOf(s, map, p), to, (a, b) => legPoints(map, a, b, season, { sneaking: false, size, ways: waysOf(s) }));
}

/** What moving the court to a province costs, by the days of road to it (`alone`: the king's own journey with his guard). */
export function courtMoveCost(days: number, alone = false): number {
  const [base, per] = alone ? [KingAloneData.base, KingAloneData.per] : [CourtData.moveBase, CourtData.movePer];
  return base + idiv(Math.max(0, days) * per, 10);
}

/** Why the court, or the king alone, cannot set out for `to` now, or null; reserves its cost when it can. */
export function courtMoveRefusal(v: Checking, order: CourtOrder): string | null {
  const to = order.to;
  const alone = order.alone === true;
  if (!v.Map.exists(to) || v.Map.get(to).isSea) return `there is no land province called '${to}'`;
  if (v.orders.find((o) => o.type === "court" && (o.alone === true) === alone) !== order) return `you already sent ${alone ? "yourself" : "your court"} to another place by an earlier order`;
  if (alone) {
    // Only a king free and reigning goes anywhere: one held is in his captor's hands (his court refuses it only once it
    // knows; an order sent before goes nowhere).
    const king = findCharacter(v.S, v.S.reigns.tryGet(v.power)?.character ?? "");
    if ((king === null || king.status !== "Employed" || king.duty !== "Ruling") && !kingLossUnheard(v.S, v.power)) return "you are not free to travel";
    if (to === seatOf(v.S, v.Map, v.power) && !onTheRoad(v.S, v.power, true)) return `you are already in ${to}`;
  } else if (to === courtOf(v.S, v.Map, v.power) && !onTheRoad(v.S, v.power)) return `your court is already in ${to}`;
  const r = kingRoute(v.S, v.Map, v.power, to, alone);
  if (r === null) return `no road leads from ${alone ? "where you are" : "your court"} to ${to}`;
  return v.spend(courtMoveCost(idiv(r.cost, PointsPerDay), alone));
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

/** The seasons word from the king takes to reach a province: from wherever he commands. */
export function wordFromKing(s: GameState, map: WorldMap, p: Power, to: string): number {
  return courierSeasons(s, map, seatOf(s, map, p), to);
}

/** Item 17b, part C2: the fallen realm whose last king, or heir in exile, the character is, or null. */
export function fallenRealmOf(s: GameState, id: string): Power | null {
  for (const [p, r] of s.reigns) if (r.character === id && s.eliminated.includes(p)) return p;
  return null;
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
