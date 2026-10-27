/**
 * The economy abroad (build order item 9+b): caravans cross land open to them and trade at foreign markets, selling their
 * grain and buying with the gold they carry, and come home with the proceeds ("Caravans carry a kingdom's goods"); fleets
 * go into cargo service between harbours ("Ships carry goods"); goods entering a king's land pay his toll, at a rate for
 * each partner, unless they are smuggled round his toll posts at the risk of being found ("Tolls and smuggling"); troops
 * spend their pay and buy their food only where they stand by leave, and a province taken by force is sacked ("Where gold
 * comes from and where it goes").
 */
import { Dict } from "../core/collections.ts";
import { idiv } from "../core/num.ts";
import { caravanAt, newCaravan, type Caravan } from "../model/caravans.ts";
import { buyAlongCurve, needOf, priceAt, sellAlongCurve } from "../model/economy.ts";
import { newMarketSeen } from "../model/views.ts";
import { Views } from "../rules/views.ts";
import type { Province } from "../model/map.ts";
import type { Order, ShipOrder, TollOrder, TradeOrder } from "../model/orders.ts";
import type { Power } from "../model/power.ts";
import { alive, logEvent, newId, notify, ownedBy, siegeOf, unitAt, type Unit } from "../model/state.ts";
import { harbourOf, newToll, shipFleet, smuggleOdds, tollOn, tollRate, TradeData } from "../model/trade.ts";
import { cheapestRoute, legPoints, PointsPerDay } from "../model/travel.ts";
import { seasonOfTurn } from "../model/map.ts";
import { formatMoney } from "../rules/calendar.ts";
import { TurnEngine } from "./core.ts";
import { MarketsTitle } from "./economy.ts";
import { RoadOdds } from "./travel.ts";

/** The notice to a king of the tolls his land took and the smugglers his people found this season. */
export const TollsTitle = "Tolls";

/** What each holder's tolls and seizures brought in this season, told once at its end. */
export type TollBook = Dict<Power, { grain: number; gold: number; found: number }>;

/** What happens to a caravan at a border: it passes (perhaps paying), is turned back, or is found smuggling and seized. */
export type AtBorder = "pass" | "turned" | "seized";

declare module "./core.ts" {
  interface TurnEngine {
    openTo(p: Power, province: string, sneak: boolean): boolean;
    tradeRoute(p: Power, from: string, to: string, sneak: boolean): string[] | null;
    shipRoute(from: string, to: string): string[] | null;
    atBorder(c: Caravan, a: string, b: string, book: TollBook): AtBorder;
    tradeAtMarket(c: Caravan, parts: string[]): void;
    caravanHome(c: Caravan): void;
    rejoinFleet(c: Caravan): string | null;
    sendTraders(orders: [Power, Order][], tell: (p: Power, line: string) => void): void;
    setToll(p: Power, o: TollOrder): void;
    sack(province: string, taker: Power): void;
    byLeave(u: Unit): boolean;
    tellTolls(book: TollBook): void;
    seeMarket(p: Power, province: string): void;
    seeMarkets(): void;
  }
}

const P = TurnEngine.prototype;

/**
 * May a caravan of `p`'s go through this province? Its own land, a free city's or land without a king, or a foreign
 * king's land unless it has heard he closed his roads to its people and he granted it no passage there; at sea, never
 * (ships sail by their own routes). A smuggler goes through any land, off the road.
 */
P.openTo = function (p, province, sneak) {
  const S = this.s;
  const prov = this.map.get(province);
  if (prov.isSea) return false;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null || holder === p || sneak) return true;
  return !(S.roadsHeard.tryGet(p) ?? []).includes(holder) || this.passageFor(holder, p, province);
};

/** A caravan's route by road or river through land open to it (off the road through foreign land, for a smuggler). */
P.tradeRoute = function (p, from, to, sneak) {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const offRoad = (x: string): boolean => sneak && S.owner.getOrDefault(x, null) !== p && S.owner.getOrDefault(x, null) !== null;
  const r = cheapestRoute(
    this.map,
    from,
    to,
    (a, b) => (this.map.get(a).isSea || this.map.get(b).isSea ? Infinity : legPoints(this.map, a, b, season, { sneaking: offRoad(a) || offRoad(b) })),
    (x) => (this.openTo(p, x, sneak) ? 0 : Infinity),
  );
  return r === null ? null : r.route;
};

/** A ship's route: from a harbour out onto its waters, over the seas, and into another harbour. Null if there is none. */
P.shipRoute = function (from, to) {
  const Map = this.map;
  const season = seasonOfTurn(this.s.turn);
  const r = cheapestRoute(
    Map,
    from,
    to,
    (a, b) => {
      const pa = Map.get(a);
      const pb = Map.get(b);
      const ok = (pa.isSea && pb.isSea) || (a === from && pb.isSea && pa.waters === b) || (pa.isSea && b === to && pb.waters === a);
      return ok ? legPoints(Map, a, b, season) : Infinity;
    },
    (x) => (Map.get(x).isSea || x === to ? 0 : Infinity),
  );
  return r === null ? null : r.route;
};

/**
 * A caravan or ship crosses from `a` into `b`. Entering a foreign king's land from outside it, an open caravan is turned
 * back if he has closed his roads to its king (and granted it no passage there), or else pays his toll there, in kind
 * into that province's stores and in gold into his treasury; a smuggler pays nothing, but his people may find it, and then
 * its goods are seized ("Tolls and smuggling").
 */
P.atBorder = function (c, a, b, book) {
  const S = this.s;
  const k = S.owner.getOrDefault(b, null);
  if (k === null || k === c.power || this.map.get(b).isSea || S.owner.getOrDefault(a, null) === k) return "pass";
  const name = this.map.get(b).name;
  const entry = (): { grain: number; gold: number; found: number } => {
    let e = book.tryGet(k);
    if (e === undefined) book.set(k, (e = { grain: 0, gold: 0, found: 0 }));
    return e;
  };
  if (c.sneak && c.ship === null) {
    const odds = smuggleOdds(c.grain, c.gold, S.counterIntel.getOrDefault(k, 0), RoadOdds.most);
    if (this.r("smuggle", `${c.id}-${b}`).nextDouble() * 100 >= odds) {
      logEvent(S, "smuggled", `${c.power}'s smugglers slipped into ${k}'s land at ${name}.`, [c.power], "smuggled");
      return "pass";
    }
    const lost = this.putInStores(b, c.grain);
    S.treasuries.get(k).gold += c.gold;
    S.treasuries.get(k).income += c.gold;
    const e = entry();
    e.grain += c.grain - lost;
    e.gold += c.gold;
    e.found++;
    notify(S, c.power, "Notice", MarketsTitle, `Your smugglers were found at ${name} by ${k}'s people, and their goods were seized: ${c.grain} measures of grain${c.gold > 0 ? ` and ${formatMoney(c.gold)}` : ""}.`);
    logEvent(S, "smuggler-found", `${k}'s people found ${c.power}'s smugglers at ${name} and seized their goods.`, [c.power, k], "smuggler-found");
    return "seized";
  }
  if ((S.roadsClosed.tryGet(k) ?? []).includes(c.power) && !this.passageFor(k, c.power, b)) {
    notify(S, c.power, "Notice", MarketsTitle, `Your ${c.ship !== null ? "ship" : "caravan"} was turned back at the border of ${k}'s land at ${name}: his roads are closed to your people.`);
    const heard = S.roadsHeard.tryGet(c.power) ?? [];
    if (!heard.includes(k)) S.roadsHeard.set(c.power, [...heard, k]);
    return "turned";
  }
  const rate = tollRate(S.tolls, k, b, c.power);
  if (rate <= 0) return "pass";
  const grain = tollOn(c.grain, rate);
  const gold = tollOn(c.gold, rate);
  c.grain -= grain;
  c.gold -= gold;
  const lost = this.putInStores(b, grain);
  S.treasuries.get(k).gold += gold;
  S.treasuries.get(k).income += gold;
  const e = entry();
  e.grain += grain - lost;
  e.gold += gold;
  if (grain + gold > 0) {
    notify(S, c.power, "Notice", MarketsTitle, `Your ${c.ship !== null ? "ship" : "caravan"} paid ${k}'s toll of ${rate}% at ${name}: ${grain} measures of grain${gold > 0 ? ` and ${formatMoney(gold)}` : ""}.`);
    logEvent(S, "toll", `${c.power}'s goods paid ${k}'s toll at ${name}.`, [c.power, k], "toll-paid");
  }
  return "pass";
};

/**
 * A caravan or ship trades at the market it came to: it sells its grain there along the curve, from the people's purse,
 * and buys grain with the gold it carries (a ship no more than it holds). A besieged market trades with nobody.
 */
P.tradeAtMarket = function (c, parts) {
  const S = this.s;
  const at = caravanAt(c);
  if (siegeOf(S, at) !== null) {
    parts.push("found the city besieged and its market shut");
    return;
  }
  const m = this.market(at);
  const normal = needOf(this.map.get(at));
  this.seeMarket(c.power, at);
  // The proceeds of the sale go home; only the gold it brought buys grain.
  let proceeds = 0;
  if (c.grain > 0) {
    const r = sellAlongCurve(m.stock, normal, m.purse, c.grain);
    m.stock += r.taken;
    m.purse -= r.paid;
    c.grain -= r.taken;
    c.gold += r.paid;
    proceeds = r.paid;
    if (r.taken > 0) parts.push(`sold ${r.taken} measures of grain for ${formatMoney(r.paid)}`);
    if (c.grain > 0) parts.push(`its people's purse could pay for no more (${c.grain} unsold)`);
    if (r.taken > 0) logEvent(S, "sale-abroad", `${c.power} sold grain at ${this.map.get(at).name}.`, [c.power], "sale-abroad");
  }
  const spend = c.gold - proceeds;
  if (spend > 0) {
    const room = c.ship !== null ? Math.max(0, TradeData.shipCapacity - c.grain) : m.stock;
    const r = buyAlongCurve(m.stock, normal, spend, room);
    m.stock -= r.taken;
    m.purse += r.paid;
    c.gold -= r.paid;
    c.grain += r.taken;
    if (r.taken > 0) {
      parts.push(`bought ${r.taken} measures of grain for ${formatMoney(r.paid)}`);
      logEvent(S, "purchase-abroad", `${c.power} bought grain at ${this.map.get(at).name}.`, [c.power], "purchase-abroad");
    }
  }
  // What it found after its trades, which it carries home.
  this.seeMarket(c.power, at);
};

/**
 * A caravan or ship comes home: its grain into the stores it set out from (if its king still holds them), its gold into
 * the treasury, and a fleet back to its waters.
 */
P.caravanHome = function (c) {
  const S = this.s;
  const at = caravanAt(c);
  const name = this.map.get(at).name;
  const parts: string[] = [];
  if (c.grain > 0 && S.owner.getOrDefault(at, null) === c.power) {
    const before = c.grain;
    c.grain = this.putInStores(at, c.grain);
    if (before > c.grain) parts.push(`${before - c.grain} measures of grain into the stores`);
  }
  if (c.gold > 0) {
    const t = S.treasuries.get(c.power);
    t.gold += c.gold;
    t.income += c.gold;
    parts.push(`${formatMoney(c.gold)} into the treasury`);
    c.gold = 0;
  }
  const fleet = this.rejoinFleet(c);
  S.caravans.splice(S.caravans.indexOf(c), 1);
  const lostLine = c.grain > 0 ? ` The other ${c.grain} measures had nowhere to go and were lost.` : "";
  notify(
    S,
    c.power,
    "Notice",
    MarketsTitle,
    `Your ${c.ship !== null ? "ship" : "caravan"} came home to ${name}${parts.length > 0 ? ` with ${parts.join(" and ")}` : ""}.${lostLine}` +
      (c.ship !== null ? (fleet !== null ? ` The fleet is back in ${this.map.get(fleet).name}, ready for war.` : " Its waters and the seas near them were held, so its crew went home.") : ""),
  );
  logEvent(S, "caravan", `${c.power}'s ${c.ship !== null ? "ship" : "caravan"} came home to ${name}.`, [c.power], "caravan");
};

/**
 * A fleet back from cargo service takes its place again in its harbour, or the nearest free waters on its way home; if
 * every one is held, its crew go home with their savings. Returns where it stands, or null.
 */
P.rejoinFleet = function (c) {
  const S = this.s;
  const u = c.ship;
  if (u === null) return null;
  // Its own harbour first, then the waters on its way home, nearest first.
  const places = [c.from, ...c.route.filter((x) => this.map.get(x).isSea).reverse()];
  const free = places.find((x) => unitAt(S, x) === null && (this.map.get(x).isSea || S.owner.getOrDefault(x, null) === u.power)) ?? null;
  if (free === null) {
    if (u.home !== "") this.spendAt(u.home, u.savings);
    return null;
  }
  u.province = free;
  u.unpaid = 0;
  u.hungry = 0;
  S.units.push(u);
  return free;
};

/**
 * Trading caravans and ships set out, after the moves: a caravan with grain from a province's stores and gold from the
 * treasury, by land open to it; a fleet in its harbour's waters loads there and sails, out of the war until it is back.
 */
P.sendTraders = function (orders, tell) {
  const S = this.s;
  const Map = this.map;
  for (const [p, o] of orders.filter(([, o]) => o.type === "trade" || o.type === "ship") as [Power, TradeOrder | ShipOrder][]) {
    const from = Map.get(o.from);
    const to = Map.get(o.to);
    const fail = (why: string, reason: string): void => {
      tell(p, why);
      this.scheduledFailed(p, o, reason);
    };
    if (S.owner.getOrDefault(o.from, null) !== p || siegeOf(S, o.from) !== null) {
      fail(`Nothing set out from ${from.name}: ${S.owner.getOrDefault(o.from, null) === p ? "it is besieged" : "you no longer hold it"}.`, "the province was lost or besieged");
      continue;
    }
    let fleet: Unit | null = null;
    if (o.type === "ship") {
      fleet = shipFleet(S.units, from, o.fleet, p);
      if (fleet === null || (from.waters !== fleet.province && from.id !== fleet.province)) {
        fail(`No ship sailed from ${from.name}: your fleet was no longer in its harbour or its waters.`, "the fleet was not there");
        continue;
      }
    }
    const route = o.type === "ship" ? this.shipRoute(o.from, o.to) : this.tradeRoute(p, o.from, o.to, o.sneak);
    if (route === null) {
      fail(`Nothing set out from ${from.name} for ${to.name}: there is no ${o.type === "ship" ? "sea route" : "road open to your caravans"} there.`, "no route");
      continue;
    }
    const t = S.treasuries.get(p);
    const gold = Math.min(Math.max(0, t.gold), o.gold);
    const grain = this.takeFromStores(o.from, Math.min(o.grain, o.type === "ship" ? TradeData.shipCapacity : o.grain));
    if (grain + gold <= 0) {
      fail(`Nothing set out from ${from.name}: its stores were empty and no gold was sent.`, "nothing to carry");
      continue;
    }
    t.gold -= gold;
    const trading = o.type === "trade" || o.trade;
    if (fleet !== null) S.units.splice(S.units.indexOf(fleet), 1);
    S.caravans.push(
      newCaravan({ id: newId(S, "v"), power: p, from: o.from, to: o.to, grain, gold, route, since: S.turn, trade: trading, sneak: o.type === "trade" && o.sneak, ship: fleet }),
    );
    const what = `${grain} measures of grain${gold > 0 ? ` and ${formatMoney(gold)}` : ""}`;
    if (fleet !== null) tell(p, `Your fleet in ${Map.get(fleet.province).name} loaded ${what} at ${from.name} and sailed for ${to.name} to ${trading ? "trade" : "deliver it"}: it is out of the war until it is back.`);
    else tell(p, `A caravan${o.type === "trade" && o.sneak ? " of smugglers" : ""} with ${what} set out from ${from.name} to trade at ${to.name}, by ${route.slice(1, -1).map((x) => Map.get(x).name).join(", ") || "the direct road"}.`);
    logEvent(S, fleet !== null ? "ship-out" : "trade-out", `${p} sent ${fleet !== null ? "a ship" : "a trading caravan"} from ${from.name}.`, [p], fleet !== null ? "ship-out" : "trade-out");
  }
};

/** A king sets a toll on goods entering his land: it stands until he changes it. A rate of nothing removes the toll. */
P.setToll = function (p, o) {
  const S = this.s;
  const i = S.tolls.findIndex((t) => t.holder === p && t.province === o.province && t.partner === o.partner);
  if (i >= 0) S.tolls.splice(i, 1);
  // A rate of nothing is kept when it is the exception to a wider one (a partner let through free), else dropped.
  const wider = S.tolls.some((t) => t.holder === p && (t.province === null || t.province === o.province) && (t.partner === null || t.partner === o.partner) && t.percent > 0);
  if (o.percent > 0 || wider) S.tolls.push(newToll({ holder: p, province: o.province, partner: o.partner, percent: o.percent }));
  const where = o.province === null ? "your land" : this.map.get(o.province).name;
  notify(S, p, "Resolution", TollsTitle, `The toll on ${o.partner === null ? "everyone's" : `${o.partner}'s`} goods entering ${where} is now ${o.percent}%.`);
  logEvent(S, "toll-set", `${p} set a toll of ${o.percent}% on ${o.partner ?? "everyone"}'s goods entering ${where}.`, [p], "toll-set");
};

/** A province taken by force is sacked: its taker carries off a share of its people's purse into his treasury. */
P.sack = function (province, taker) {
  const S = this.s;
  const m = this.market(province);
  const loot = idiv(m.purse * TradeData.sackPercent, 100);
  if (loot <= 0) return;
  m.purse -= loot;
  S.treasuries.get(taker).gold += loot;
  S.treasuries.get(taker).income += loot;
  notify(S, taker, "Battle", "Loot", `Your troops sacked ${this.map.get(province).name} and carried off ${formatMoney(loot)} from its people's purse.`);
  logEvent(S, "sack", `${taker} sacked ${this.map.get(province).name}.`, [taker], "sack");
};

/** Does a unit stand by leave: in its king's own land, or land whose holder granted it passage or basing there? */
P.byLeave = function (u) {
  const prov: Province = this.map.get(u.province);
  if (prov.isSea) return false;
  const holder = this.s.owner.getOrDefault(prov.id, null);
  return holder === u.power || this.grantCovers(holder, u.power, prov.id) !== null;
};

/** Each holder hears once what his tolls brought in and the smugglers his people found this season. */
P.tellTolls = function (book) {
  const S = this.s;
  for (const [k, e] of book.entries()) {
    if (e.grain + e.gold + e.found <= 0) continue;
    notify(
      S,
      k,
      "Notice",
      TollsTitle,
      `Goods entering your land paid your tolls: ${e.grain} measures of grain into the stores where they crossed${e.gold > 0 ? ` and ${formatMoney(e.gold)} into the treasury` : ""}` +
        (e.found > 0 ? `, counting what your people seized from ${e.found} smuggler${e.found === 1 ? "" : "s"} they found` : "") +
        ".",
    );
  }
};

/** Harbour levels, for the views: every coast's. */
export const harboursOf = (provinces: readonly Province[]): [string, number][] => provinces.filter((p) => harbourOf(p) > 0).map((p) => [p.id, harbourOf(p)]);

/** Whether a ship can unload at a besieged harbour of its king's: only while no fleet of the besieger holds its waters. */
export function openToSea(e: TurnEngine, province: string): boolean {
  const x = siegeOf(e.s, province);
  const waters = e.map.get(province).waters;
  if (x === null) return true;
  if (waters === null) return false;
  return !e.s.units.some((u) => u.province === waters && u.kind === "Fleet" && u.power === x.power);
}

/** A court takes note of a foreign market as it stands now: its price, stock and purse, and the season. */
P.seeMarket = function (p, province) {
  const S = this.s;
  const m = this.market(province);
  let book = S.marketsSeen.tryGet(p);
  if (book === undefined) S.marketsSeen.set(p, (book = new Dict()));
  const need = needOf(this.map.get(province));
  book.set(province, newMarketSeen({ price: priceAt(m.stock, need), stock: m.stock, need, purse: m.purse, turn: S.turn }));
};

/**
 * Each season every court learns the foreign markets within half a season's travel of its land, by road, river or sea, and
 * those in the land it sees, as they stand when the season begins ("Prices are known where they are and through news":
 * word of a nearby market's price comes with the traders who use it; a far one's only with its own traders).
 */
P.seeMarkets = function () {
  const S = this.s;
  const Map = this.map;
  const reach = idiv(S.config.travelDays * PointsPerDay, TradeData.wordSeasonsShare);
  const season = seasonOfTurn(S.turn);
  for (const p of alive(S)) {
    // Every province within a season's travel of the king's land: the nearest first, from all his provinces at once.
    const dist = new globalThis.Map<string, number>();
    const queue: [string, number][] = [];
    for (const id of ownedBy(S, p)) {
      dist.set(id, 0);
      queue.push([id, 0]);
    }
    while (queue.length > 0) {
      let i = 0;
      for (let j = 1; j < queue.length; j++) if (queue[j][1] < queue[i][1] || (queue[j][1] === queue[i][1] && queue[j][0] < queue[i][0])) i = j;
      const [at, d] = queue.splice(i, 1)[0];
      if (d > (dist.get(at) ?? Infinity)) continue;
      for (const n of Map.neighbors(at)) {
        const nd = d + legPoints(Map, at, n, season);
        if (nd > reach || nd >= (dist.get(n) ?? Infinity)) continue;
        dist.set(n, nd);
        queue.push([n, nd]);
      }
    }
    const sight = Views.sight(S, Map, p);
    for (const prov of Map.landProvinces) {
      if (prov.kingless || S.owner.getOrDefault(prov.id, null) === p) continue;
      if (dist.has(prov.id) || sight.has(prov.id)) this.seeMarket(p, prov.id);
    }
  }
};
