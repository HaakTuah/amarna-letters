/**
 * The economy abroad (build order item 9+b): caravans cross land open to them and trade at foreign markets, selling their
 * grain and buying with the gold they carry, and come home with the proceeds ("Caravans carry a kingdom's goods"); fleets
 * go into cargo service between harbours ("Ships carry goods"); goods entering a king's land pay his toll, at a rate for
 * each partner, unless they are smuggled round his toll posts at the risk of being found ("Tolls and smuggling"); troops
 * spend their pay and buy their food only where they stand by leave, and a province taken by force is sacked ("Where gold
 * comes from and where it goes").
 */
import { Dict } from "../core/collections.ts";
import { sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { idiv } from "../core/num.ts";
import { caravanAt, newCaravan, type Caravan } from "../model/caravans.ts";
import { buyAlongCurve, needOf, priceAt, sellAlongCurve } from "../model/economy.ts";
import { newMarketSeen, type MarketSeen } from "../model/views.ts";
import { newWord, noteMarket, noteTolls, type Word } from "../model/word.ts";
import { Views } from "../rules/views.ts";
import type { Province } from "../model/map.ts";
import type { Order, ShipOrder, TollOrder, TradeOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { alive, isAlive, logEvent, newId, notify, ownedBy, siegeOf, unitAt, type Unit } from "../model/state.ts";
import { harbourOf, newToll, shipFleet, smuggleOdds, tollOn, tollRate, TradeData } from "../model/trade.ts";
import { cheapestRoute, legPoints, PointsPerDay } from "../model/travel.ts";
import { seasonOfTurn } from "../model/map.ts";
import { formatMoney } from "../rules/calendar.ts";
import { TurnEngine } from "./core.ts";
import { CommandData } from "../model/command.ts";
import { gain } from "../model/people.ts";
import { MarketsTitle } from "./economy.ts";
import { RoadOdds } from "./travel.ts";

/** The notice to a king of the tolls his land took and the smugglers his people found this season. */
export const TollsTitle = "Tolls";

/** What each holder's tolls and seizures brought in this season, told once at its end. */
export type TollBook = Dict<Power, { grain: number; gold: number; found: number }>;

/**
 * How a caravan goes through foreign land: openly (false), off the road through all of it as smugglers (true), or, a
 * kingdom's caravan bound for a depot or an army (item 11f, "Caravans carry a kingdom's goods"), openly where it may and
 * sneaking through land its king has heard is closed to him, where he has no passage ("closed").
 */
export type Sneak = boolean | "closed";

/** What happens to a caravan at a border: it passes (perhaps paying), is turned back, or is found smuggling and seized. */
export type AtBorder = "pass" | "turned" | "seized";

declare module "./core.ts" {
  interface TurnEngine {
    openTo(p: Power, province: string, sneak: Sneak): boolean;
    tradeRoute(p: Power, from: string, to: string, sneak: Sneak): string[] | null;
    roadsShutTo(p: Power, province: string): boolean;
    caravanOffRoad(p: Power, province: string, sneak: Sneak): boolean;
    shipRoute(from: string, to: string): string[] | null;
    atBorder(c: Caravan, a: string, b: string, book: TollBook): AtBorder;
    tradeAtMarket(c: Caravan, parts: string[]): void;
    tradeTogether(cs: Caravan[], parts: Map<string, string[]>): void;
    caravanHome(c: Caravan): void;
    rejoinFleet(c: Caravan): string | null;
    sendTraders(orders: [Power, Order][], tell: (p: Power, line: string) => void): void;
    setToll(p: Power, o: TollOrder): void;
    sack(province: string, taker: Power, stormed?: boolean): void;
    /** `to`: where the load goes, if not the taker's court (gold sent to a fallen capital he holds, item 13+). */
    lootHome(taker: Power, from: string, gold: number, archive: readonly string[], archiveOf: string, to?: string): boolean;
    byLeave(u: Unit): boolean;
    tellTolls(book: TollBook): void;
    marketNow(province: string): MarketSeen;
    seeMarket(p: Power, province: string): void;
    hearWord(p: Power, w: Word): void;
    seeMarkets(): void;
  }
}

const P = TurnEngine.prototype;

/**
 * May a caravan of `p`'s go through this province? Its own land, land held by no one, or a foreign
 * king's land unless it has heard he closed his roads to its people and he granted it no passage there; at sea, never
 * (ships sail by their own routes). A smuggler goes through any land, off the road.
 */
P.openTo = function (p, province, sneak) {
  const S = this.s;
  const prov = this.map.get(province);
  if (prov.isSea) return false;
  const holder = S.owner.getOrDefault(province, null);
  if (holder === null || holder === p || sneak !== false) return true;
  return !this.roadsShutTo(p, province);
};

/** Whether `p` has heard this province's holder closed his roads to him, and has no passage there. */
P.roadsShutTo = function (p, province) {
  const holder = this.s.owner.getOrDefault(province, null);
  if (holder === null || holder === p) return false;
  return (this.s.roadsHeard.tryGet(p) ?? []).includes(holder) && !this.passageFor(holder, p, province);
};

/** Whether a caravan of `p`'s goes off the road in this province: a smuggler in any foreign land, a kingdom's caravan in land closed to it. */
P.caravanOffRoad = function (p, province, sneak) {
  if (sneak === "closed") return this.roadsShutTo(p, province);
  const holder = this.s.owner.getOrDefault(province, null);
  return sneak && holder !== p && holder !== null;
};

/** A caravan's route by road or river through land open to it (off the road through foreign land, for a smuggler). */
P.tradeRoute = function (p, from, to, sneak) {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const offRoad = (x: string): boolean => this.caravanOffRoad(p, x, sneak);
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
  // A holder shut inside his walls by another's siege keeps no border beyond them: the countryside is the besieger's (item 11f).
  if (S.sieges.some((x) => x.province === b && x.power !== k)) return "pass";
  const name = this.map.get(b).name;
  // Whatever happens at the border, the traders learn the tolls that stand there on their king's goods.
  noteTolls(c.word, S.tolls, k, c.power);
  const entry = (): { grain: number; gold: number; found: number } => {
    let e = book.tryGet(k);
    if (e === undefined) book.set(k, (e = { grain: 0, gold: 0, found: 0 }));
    return e;
  };
  const sneaking = c.ship === null && (c.sneak || (!c.trade && this.roadsShutTo(c.power, b)));
  if (sneaking) {
    const odds = smuggleOdds(c.grain, c.gold, S.counterIntel.getOrDefault(k, 0), RoadOdds.most);
    if (this.r("smuggle", `${c.id}-${b}`).nextDouble() * 100 >= odds) {
      logEvent(S, "smuggled", `${c.power}'s ${c.sneak ? "smugglers" : "caravan"} slipped into ${k}'s land at ${name}.`, [c.power], c.sneak ? "smuggled" : "caravan-slipped");
      return "pass";
    }
    const lost = this.putInStores(b, c.grain);
    S.treasuries.get(k).gold += c.gold;
    S.treasuries.get(k).income += c.gold;
    const e = entry();
    e.grain += c.grain - lost;
    e.gold += c.gold;
    e.found++;
    const who = c.sneak ? "smugglers" : "caravan, sneaking through land closed to you,";
    notify(S, c.power, "Notice", MarketsTitle, `Your ${who} ${c.sneak ? "were" : "was"} found at ${name} by ${k}'s people, and ${c.sneak ? "their" : "its"} goods were seized: ${c.grain} measures of grain${c.gold > 0 ? ` and ${formatMoney(c.gold)}` : ""}.`);
    logEvent(S, "smuggler-found", `${k}'s people found ${c.power}'s ${c.sneak ? "smugglers" : "caravan"} at ${name} and seized ${c.sneak ? "their" : "its"} goods.`, [c.power, k], c.sneak ? "smuggler-found" : "caravan-found");
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
 * and buys grain with the gold it carries (a ship no more than it holds). A besieged market trades by land with nobody;
 * anyone's ship may sell it grain while its waters are open, at what its starving market pays, but buys none there
 * ("Stores and mouths are the clock", Haakon's answer of 28 October 2026).
 */
P.tradeAtMarket = function (c, parts) {
  this.tradeTogether([c], new Map([[c.id, parts]]));
};

/**
 * The caravans and ships that reach one market in the same season trade there together (item 10+b, "The order of
 * resolution never decides"): their grain is sold along the curve as one lot and their gold buys as one purse, so every
 * seller and buyer meets the same falling or rising price, and each takes its share in proportion to what it brought.
 */
P.tradeTogether = function (cs, parts) {
  const S = this.s;
  const at = caravanAt(cs[0]);
  const besieged = siegeOf(S, at) !== null;
  const say = (c: Caravan, line: string): void => {
    let l = parts.get(c.id);
    if (l === undefined) parts.set(c.id, (l = []));
    l.push(line);
  };
  const open = cs.filter((c) => {
    if (!besieged || (c.ship !== null && openToSea(this, at))) return true;
    say(c, c.ship === null ? "found the city besieged and its market shut" : "found the harbour blockaded by the besieger's ships");
    return false;
  });
  if (open.length === 0) return;
  const m = this.market(at);
  const normal = needOf(this.map.get(at));
  const name = this.map.get(at).name;
  for (const c of open) noteMarket(c.word, at, this.marketNow(at));
  /** Shares of a whole in proportion to weights, the remainder one by one to the first in order. */
  const shares = (whole: number, weights: number[]): number[] => {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return weights.map(() => 0);
    const out = weights.map((w) => idiv(whole * w, total));
    let left = whole - out.reduce((a, b) => a + b, 0);
    for (let i = 0; i < out.length && left > 0; i++)
      if (weights[i] > 0) {
        out[i]++;
        left--;
      }
    return out;
  };
  // The sellers' grain, as one lot: the proceeds go home; only the gold each brought buys grain.
  const grain = open.map((c) => c.grain);
  const sold = sellAlongCurve(m.stock, normal, m.purse, grain.reduce((a, b) => a + b, 0));
  m.stock += sold.taken;
  m.purse -= sold.paid;
  const taken = shares(sold.taken, grain);
  const paid = shares(sold.paid, grain);
  open.forEach((c, i) => {
    if (grain[i] <= 0) return;
    c.grain -= taken[i];
    c.gold += paid[i];
    if (taken[i] > 0) say(c, `sold ${taken[i]} measures of grain for ${formatMoney(paid[i])}`);
    if (c.grain > 0) say(c, `its people's purse could pay for no more (${c.grain} unsold)`);
    if (taken[i] > 0) logEvent(S, "sale-abroad", `${c.power} sold grain at ${name}${besieged ? ", besieged" : ""}.`, [c.power], besieged ? "besieged-fed" : "sale-abroad");
  });
  // The buyers' gold, as one purse, each buying no more than it can carry.
  const spend = open.map((c, i) => (besieged ? 0 : c.gold - paid[i]));
  const room = open.map((c, i) => (spend[i] <= 0 ? 0 : c.ship !== null ? Math.max(0, TradeData.shipCapacity - c.grain) : m.stock));
  const bought = buyAlongCurve(m.stock, normal, spend.reduce((a, b) => a + b, 0), Math.min(m.stock, room.reduce((a, b) => a + b, 0)));
  m.stock -= bought.taken;
  m.purse += bought.paid;
  const got = shares(bought.taken, spend).map((x, i) => Math.min(x, room[i]));
  // What a capped share could not hold stays in the market, unpaid for.
  const left = bought.taken - got.reduce((a, b) => a + b, 0);
  m.stock += left;
  // Each pays for what it got, at the one price.
  const cost = shares(bought.paid - (left > 0 && bought.taken > 0 ? idiv(bought.paid * left, bought.taken) : 0), got);
  m.purse -= bought.paid - cost.reduce((a, b) => a + b, 0);
  open.forEach((c, i) => {
    if (got[i] <= 0) return;
    c.gold -= cost[i];
    c.grain += got[i];
    say(c, `bought ${got[i]} measures of grain for ${formatMoney(cost[i])}`);
    logEvent(S, "purchase-abroad", `${c.power} bought grain at ${name}.`, [c.power], "purchase-abroad");
  });
  // What each found after the season's trades, which it carries home.
  for (const c of open) noteMarket(c.word, at, this.marketNow(at));
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
  // A besieged city takes in nothing by land, and by sea only while its waters are open.
  const open = siegeOf(S, at) === null || (c.ship !== null && openToSea(this, at));
  if (c.grain > 0 && S.owner.getOrDefault(at, null) === c.power && open) {
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
  // What it learned abroad of markets and tolls, its court learns now; a captured archive it carried is its king's now.
  this.hearWord(c.power, c.word);
  if (c.archive.length > 0) this.archiveArrives(c.power, c.archive, c.archiveOf, this.map.get(c.to).name);
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
  // A rate of nothing for a partner or a province is kept, as the exception to any wider rate set before or after it; the
  // general rate of nothing is no toll at all.
  if (o.percent > 0 || o.partner !== null || o.province !== null) S.tolls.push(newToll({ holder: p, province: o.province, partner: o.partner, percent: o.percent }));
  const where = o.province === null ? "your land" : this.map.get(o.province).name;
  notify(S, p, "Resolution", TollsTitle, `The toll on ${o.partner === null ? "everyone's" : `${o.partner}'s`} goods entering ${where} is now ${o.percent}%.`);
  logEvent(S, "toll-set", `${p} set a toll of ${o.percent}% on ${o.partner ?? "everyone"}'s goods entering ${where}.`, [p], "toll-set");
};

/**
 * A province taken by force is sacked (item 10+b, "What a sack takes follows its causes"): its taker's men there carry off
 * what they can of its people's purse, more when they stormed it than when it surrendered, and no more than so many
 * shekels a hundred men can carry; the king's share travels home to his capital as a load that can be waylaid, and the
 * rest goes into the soldiers' packs, to be spent or carried home ("Soldiers carry savings home").
 */
P.sack = function (province, taker, stormed = true) {
  const S = this.s;
  const m = this.market(province);
  const units = sortBy(
    S.units.filter((u) => u.province === province && u.power === taker && u.men > 0),
    [(u: Unit) => u.id, cmpStr],
  );
  const men = units.reduce((a, u) => a + u.men, 0);
  const share = stormed ? TradeData.sackStormedPercent : TradeData.sackSurrenderPercent;
  const loot = Math.min(idiv(m.purse * share, 100), idiv(men * TradeData.lootPerHundred, 100));
  if (loot <= 0) return;
  m.purse -= loot;
  let king = idiv(loot * TradeData.kingSharePercent, 100);
  const soldiers = loot - king;
  // Item 13: the spoils pass through the commander's hands, and he keeps of the king's share by his greed.
  for (const u of units) {
    const c = this.commanderOf(u);
    if (c === null) continue;
    const kept = idiv(idiv(king * u.men, Math.max(1, men)) * idiv(c.traits.greed, CommandData.spoilsPer), 100);
    if (kept <= 0) continue;
    king -= kept;
    gain(c, kept, "Loot");
  }
  const commanders = loot - soldiers - king;
  let packs = soldiers;
  units.forEach((u, i) => {
    const part = i === units.length - 1 ? packs : idiv(soldiers * u.men, men);
    u.savings += part;
    packs -= part;
  });
  const name = this.map.get(province).name;
  const home = this.lootHome(taker, province, king, [], "");
  notify(
    S,
    taker,
    "Battle",
    "Loot",
    `Your troops sacked ${name} and carried off ${formatMoney(loot)} from its people's purse: ${formatMoney(soldiers)} in their packs` +
      (commanders > 0 ? `, ${formatMoney(commanders)} kept by their commanders` : "") +
      (king <= 0 ? "." : home ? `, and your share of ${formatMoney(king)} is on its way to your treasury.` : `, and your share of ${formatMoney(king)} is in your treasury.`),
  );
  logEvent(S, "sack", `${taker} sacked ${name}.`, [taker], "sack");
};

/**
 * Loot going home to the taker's capital as a load (item 10+b): gold, a captured archive, or both. Where the taker holds
 * his capital and a road leads there, it travels like a caravan and can be waylaid; otherwise it reaches him at once
 * (true: it is on the road).
 */
P.lootHome = function (taker, from, gold, archive, archiveOf, to) {
  const S = this.s;
  const cap = to ?? this.courtAt(taker);
  const route = from === cap || S.owner.getOrDefault(cap, null) !== taker ? null : this.tradeRoute(taker, from, cap, false);
  if (route === null) {
    S.treasuries.get(taker).gold += gold;
    S.treasuries.get(taker).income += gold;
    this.archiveArrives(taker, archive, archiveOf, this.map.get(from).name);
    return false;
  }
  S.caravans.push(newCaravan({ id: newId(S, "v"), power: taker, from: cap, to: from, gold, route, at: 0, returning: true, since: S.turn, archive: [...archive], archiveOf }));
  return true;
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

/** Whether a ship, anyone's, can reach a besieged harbour: only while no fleet of the besieger holds its waters. */
export function openToSea(e: TurnEngine, province: string): boolean {
  const x = siegeOf(e.s, province);
  const waters = e.map.get(province).waters;
  if (x === null) return true;
  if (waters === null) return false;
  return !e.s.units.some((u) => u.province === waters && u.kind === "Fleet" && u.power === x.power);
}

/** A foreign market as it stands now: its price, stock and purse, and the season. */
P.marketNow = function (province) {
  const m = this.market(province);
  const need = needOf(this.map.get(province));
  return newMarketSeen({ price: priceAt(m.stock, need), stock: m.stock, need, purse: m.purse, turn: this.s.turn });
};

/** A court takes note of a foreign market as it stands now, seen with its own eyes. */
P.seeMarket = function (p, province) {
  this.hearWord(p, newWord({ markets: new Dict([[province, this.marketNow(province)]]) }));
};

/**
 * Word brought home reaches its court (item 10+b): each market it tells of, unless the court knows a later state of it,
 * and the tolls of each holder it learned, in place of what the court knew of that holder's.
 */
P.hearWord = function (p, w) {
  const S = this.s;
  if (!isAlive(S, p)) return;
  let book = S.marketsSeen.tryGet(p);
  if (book === undefined) S.marketsSeen.set(p, (book = new Dict()));
  for (const [k, seen] of w.markets.entries()) {
    if (S.owner.getOrDefault(k, null) === p) continue;
    const had = book.tryGet(k);
    if (had === undefined || had.turn <= seen.turn) book.set(k, { ...seen });
  }
  if (w.holders.length === 0) return;
  const known = (S.tollsKnown.tryGet(p) ?? []).filter((t) => !w.holders.includes(t.holder));
  for (const t of w.tolls) if (t.holder !== p) known.push({ ...t });
  S.tollsKnown.set(p, known);
};

/**
 * Each season every court sees the foreign markets in the land it sees, as they stand when the season begins ("Prices are
 * known where they are and through news"); the rest it knows only as its caravans, ships and envoys bring word home
 * (item 10+b). At the start of the game it knows those within half a season's travel of its land, as they were last
 * reported to it before the game began, and the tolls standing on its goods there.
 */
P.seeMarkets = function () {
  const S = this.s;
  const Map = this.map;
  const reach = idiv(S.config.travelDays * PointsPerDay, TradeData.wordSeasonsShare);
  const season = seasonOfTurn(S.turn);
  const first = ![...S.marketsSeen.values()].some((x) => x.size > 0);
  for (const p of alive(S)) {
    // At the start: every province within half a season's travel of the king's land, from all his provinces at once.
    const dist = new globalThis.Map<string, number>();
    const queue: [string, number][] = [];
    if (first)
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
    if (first) {
      const w = newWord();
      for (const k of AllPowers) if (k !== p && [...dist.keys()].some((x) => S.owner.getOrDefault(x, null) === k)) noteTolls(w, S.tolls, k, p);
      this.hearWord(p, w);
    }
    const sight = Views.sight(S, Map, p);
    for (const prov of Map.landProvinces) {
      if (prov.kingless || S.owner.getOrDefault(prov.id, null) === p) continue;
      if (dist.has(prov.id) || sight.has(prov.id)) this.seeMarket(p, prov.id);
    }
  }
};
