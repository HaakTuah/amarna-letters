/**
 * The economy at home (build order item 9+a, "Economy and resources"): each season the land is harvested and the tax in
 * grain goes into each province's stores ("Production is local", "How a king lives"), the mines' gold into the holder's
 * treasury ("One treasury, many stores"), stores and markets spoil, towns eat from their markets ("Prices") and a besieged
 * city from its stores ("How long a siege lasts"); troops are paid in gold, part of which their men spend where they stand
 * ("Where gold comes from and where it goes", "Soldiers carry savings home"), and eat grain from their depots, their
 * baggage and the land, going hungry and in the end mutinying when none of it suffices ("Armies need food as well as
 * pay"); caravans carry grain between a king's provinces and to his troops ("Caravans carry a kingdom's goods"). With the
 * orders, kings sell grain at their markets and buy there, hand grain to their towns ("Kings can feed their towns"), and
 * send caravans out; each market's trades are settled together.
 */
import { Dict } from "../core/collections.ts";
import { idiv, roundEven, toInt } from "../core/num.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { caravanAt, newCaravan, newMarket, type Caravan, type Market } from "../model/caravans.ts";
import {
  buyAlongCurve,
  capacityOf,
  carriedOf,
  cityPriceOf,
  economyOf,
  EconomyData,
  foodOf,
  grainWorth,
  harvestOf,
  needOf,
  sellAlongCurve,
  taxOf,
} from "../model/economy.ts";
import { terrainOf } from "../model/geography.ts";
import { seasonOfTurn, WinterSeason, type Province } from "../model/map.ts";
import type { CaravanOrder, FeedOrder, Order, PurchaseOrder, SellOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { alive, isAlive, logEvent, newId, notify, ownedBy, siegeOf, unitLabel, type Unit } from "../model/state.ts";
import { cheapestRoute, legPoints, PointsPerDay, boatDays, type Company } from "../model/travel.ts";
import { formatMoney } from "../rules/calendar.ts";
import { RoadOdds } from "./travel.ts";
import { Views } from "../rules/views.ts";
import { absorbedIn, TurnEngine } from "./core.ts";

/** The notice of a king's economy each season: harvest, mines, pay and food. */
export const EconomyTitle = "The treasury";

/** The notice of a king's trades and shipments settled at the end of the season. */
export const MarketsTitle = "Markets and caravans";

declare module "./core.ts" {
  interface TurnEngine {
    market(province: string): Market;
    stores(province: string): number;
    putInStores(province: string, grain: number): number;
    takeFromStores(province: string, grain: number): number;
    spendAt(province: string, gold: number): void;
    yieldFactor(province: string, besiegedYields?: boolean): number;
    harvestSeason(): Dict<Power, string[]>;
    townsEat(): void;
    payTroops(p: Power): { paid: number; unpaid: string[] };
    feedTroops(): Dict<Power, string[]>;
    disbandUnit(u: Unit): void;
    caravansTravel(): void;
    caravanCompany(c: Caravan): Company;
    caravanRoute(p: Power, from: string, to: string): string[] | null;
    caravanArrives(c: Caravan): void;
    settleMarkets(orders: [Power, Order][]): void;
    cityPrice(province: string): number;
    landWorth(p: Power): number;
    holdings(p: Power): number;
    supplied(province: string): boolean;
  }
}

const P = TurnEngine.prototype;

// ---------------------------------------------------------------- stores and markets

P.market = function (province) {
  let m = this.s.markets.tryGet(province);
  if (m === undefined) this.s.markets.set(province, (m = newMarket()));
  return m;
};

P.stores = function (province) {
  return this.s.stores.getOrDefault(province, 0);
};

/** Puts grain into a province's stores as far as their capacity allows; returns what did not fit (lost). */
P.putInStores = function (province, grain) {
  const now = this.stores(province);
  const room = Math.max(0, capacityOf(this.map.get(province)) - now);
  const put = Math.min(room, Math.max(0, grain));
  if (put > 0) this.s.stores.set(province, now + put);
  return Math.max(0, grain) - put;
};

/** Takes up to that much grain from a province's stores; returns what was taken. */
P.takeFromStores = function (province, grain) {
  const now = this.stores(province);
  const take = Math.min(now, Math.max(0, grain));
  if (take <= 0) return 0;
  if (now - take > 0) this.s.stores.set(province, now - take);
  else this.s.stores.delete(province);
  return take;
};

/** Gold paid out to people in a province (soldiers' spending, builders' and porters' pay) goes into its people's purse. */
P.spendAt = function (province, gold) {
  if (gold <= 0) return;
  const p = this.map.get(province);
  if (p.isSea) return;
  this.market(province).purse += gold;
};

/**
 * What a province yields this season against its full yield: absorption and catastrophes; nothing to its holder while
 * besieged, though its fields outside the walls still grow (`besiegedYields`: what the besieger can forage).
 */
P.yieldFactor = function (province, besiegedYields = false) {
  const S = this.s;
  if (!besiegedYields && siegeOf(S, province) !== null) return 0;
  const owner = S.owner.getOrDefault(province, null);
  let factor = absorbedIn(S, province);
  for (const c of S.catastrophes) {
    if (c.startTurn > S.turn || c.endTurn < S.turn) continue;
    if (c.province === province || (c.province === null && owner === c.power)) factor *= c.incomeFactor;
  }
  return factor;
};

/** Is a besieged coastal city fed from the sea: its waters held by no fleet of its besieger ("Finer seas", item 7a)? */
P.supplied = function (province) {
  const S = this.s;
  const x = siegeOf(S, province);
  const waters = this.map.get(province).waters;
  if (x === null || waters === null || S.config.seaSupply <= 0) return false;
  return !S.units.some((u) => u.province === waters && u.kind === "Fleet" && u.power === x.power);
};

// ---------------------------------------------------------------- the season begins

/**
 * The harvest: every land province with a ruler grows its harvest, and the tax in grain at the default rate goes into its
 * stores, what does not fit lost; the mines' gold goes into the holder's treasury (a free city's into its people's purse);
 * then stores and markets spoil. Returns the lines each king reads of it.
 */
P.harvestSeason = function () {
  const S = this.s;
  const lines = new Dict<Power, string[]>();
  const taxed = new Dict<Power, number>();
  const lost = new Dict<Power, number>();
  const mined = new Dict<Power, number>();
  for (const prov of this.map.landProvinces) {
    if (prov.kingless) continue;
    const owner = S.owner.getOrDefault(prov.id, null);
    if (owner !== null && !isAlive(S, owner)) continue;
    const factor = this.yieldFactor(prov.id);
    const tax = toInt(roundEven(taxOf(harvestOf(prov)) * factor));
    const over = this.putInStores(prov.id, tax);
    const metal = toInt(roundEven(economyOf(prov).mine * factor));
    if (owner === null) {
      this.spendAt(prov.id, metal);
      continue;
    }
    taxed.set(owner, taxed.getOrDefault(owner, 0) + tax - over);
    lost.set(owner, lost.getOrDefault(owner, 0) + over);
    if (metal > 0) {
      const t = S.treasuries.get(owner);
      t.gold += metal;
      t.income += metal;
      mined.set(owner, mined.getOrDefault(owner, 0) + metal);
    }
  }
  // Rot and vermin in stores and markets alike.
  for (const [k, v] of [...S.stores.entries()]) {
    const rot = idiv(v * EconomyData.spoilPercent, 100);
    if (rot > 0) S.stores.set(k, v - rot);
  }
  for (const m of S.markets.values()) m.stock -= idiv(m.stock * EconomyData.spoilPercent, 100);
  for (const p of alive(S)) {
    const l: string[] = [];
    const t = taxed.getOrDefault(p, 0);
    l.push(`The tax in grain brought ${t} measures into your provinces' stores` + (lost.getOrDefault(p, 0) > 0 ? `; ${lost.get(p)} more were lost for want of room` : "") + ".");
    if (mined.getOrDefault(p, 0) > 0) l.push(`Your mines yielded ${formatMoney(mined.get(p))}, now in the treasury.`);
    lines.set(p, l);
  }
  return lines;
};

/**
 * Each town eats its local need from its market, and an empty market means a hungry town (before item 10+ that only
 * drives its price up). A besieged city not fed from the sea eats from its market and then its stores, its garrison's food
 * apart ("Stores and mouths are the clock"): one that cannot eat in full is starving, and surrenders with the season's
 * sieges if the siege still stands.
 */
P.townsEat = function () {
  const S = this.s;
  S.starving.length = 0;
  for (const prov of this.map.landProvinces) {
    const m = this.market(prov.id);
    const need = needOf(prov);
    const fromMarket = Math.min(m.stock, need);
    m.stock -= fromMarket;
    if (siegeOf(S, prov.id) === null || this.supplied(prov.id)) continue;
    const short = need - fromMarket - this.takeFromStores(prov.id, need - fromMarket);
    if (short > 0) S.starving.push(prov.id);
  }
};

/**
 * A king pays his troops, nearest his capital first, as far as his treasury goes: each army or fleet its men's pay and a
 * besieger the cost of its siege works. The men spend part of it where they stand, in their king's own land (abroad by
 * leave, from item 9+b), and keep the rest. A unit not paid in full counts a season of missing pay.
 */
P.payTroops = function (p) {
  const S = this.s;
  const Map = this.map;
  const t = S.treasuries.get(p);
  const cap = Map.capital(p).id;
  let paid = 0;
  const unpaid: string[] = [];
  for (const u of sortBy(
    S.units.filter((u) => u.power === p),
    [(u: Unit) => Map.hops(cap, u.province), cmpNum],
    [(u: Unit) => u.id, cmpStr],
  )) {
    const pay = (u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep) + (S.sieges.some((x) => x.unitId === u.id) ? S.config.siegeUpkeep : 0);
    if (t.gold < pay) {
      u.unpaid++;
      unpaid.push(unitLabel(u));
      continue;
    }
    t.gold -= pay;
    paid += pay;
    u.unpaid = 0;
    const where = spendingPlace(this, u);
    const spent = where === null ? 0 : idiv(pay * EconomyData.spentPercent, 100);
    if (where !== null) this.spendAt(where, spent);
    u.savings += pay - spent;
  }
  return { paid, unpaid };
};

/** Where a unit's men can spend their pay: the province it stands in, or for a fleet the coast of its waters, if their king's. */
function spendingPlace(e: TurnEngine, u: Unit): string | null {
  const prov = e.map.get(u.province);
  if (!prov.isSea) return e.s.owner.getOrDefault(prov.id, null) === u.power ? prov.id : null;
  return e.map.landProvinces.find((x) => x.waters === prov.id && e.s.owner.getOrDefault(x.id, null) === u.power)?.id ?? null;
}

/** Where a unit draws from its king's stores: the province it stands in, or a fleet's harbour on its own coast. */
function depotOf(e: TurnEngine, u: Unit): string | null {
  return spendingPlace(e, u);
}

/**
 * Every unit eats its season's food: from its king's stores where it stands (and refills its baggage from them), else from
 * its baggage, else from the land: at home the town's market (requisition), elsewhere what the farmers can spare, a third
 * of their share of the harvest (half that in winter, none in the desert or at sea), shared among the troops there. A unit
 * that cannot eat in full goes hungry; after a few seasons of hunger or of missing pay it mutinies and, until bands exist,
 * disbands and its men go home with their savings. Returns the lines each king reads.
 */
P.feedTroops = function () {
  const S = this.s;
  const lines = new Dict<Power, string[]>();
  const tell = (p: Power, line: string): void => {
    let l = lines.tryGet(p);
    if (!l) lines.set(p, (l = []));
    l.push(line);
  };
  const forage = new Dict<string, number>();
  const winter = seasonOfTurn(S.turn) === WinterSeason;
  const landFood = (prov: Province): number => {
    if (prov.isSea || terrainOf(prov.id) === "Desert") return 0;
    let left = forage.tryGet(prov.id);
    if (left === undefined) {
      const farmers = toInt(roundEven((harvestOf(prov) - taxOf(harvestOf(prov))) * this.yieldFactor(prov.id, true)));
      left = idiv(farmers * EconomyData.forageShare, winter ? 200 : 100);
      forage.set(prov.id, left);
    }
    return left;
  };
  const hungry = new Dict<Power, string[]>();
  const foraged = new Dict<Power, number>();
  for (const u of sortBy(S.units, [(u: Unit) => u.id, cmpStr])) {
    const need = foodOf(u.kind);
    let eaten = 0;
    const depot = depotOf(this, u);
    if (depot !== null) eaten += this.takeFromStores(depot, need);
    if (eaten < need) {
      const b = Math.min(u.food, need - eaten);
      u.food -= b;
      eaten += b;
    }
    if (depot !== null) u.food += this.takeFromStores(depot, carriedOf(u.kind) - u.food);
    const prov = this.map.get(u.province);
    if (eaten < need && !prov.isSea) {
      if (S.owner.getOrDefault(prov.id, null) === u.power) {
        const m = this.market(prov.id);
        const take = Math.min(m.stock, need - eaten);
        m.stock -= take;
        eaten += take;
      }
      if (eaten < need) {
        const take = Math.min(landFood(prov), need - eaten);
        if (take > 0) {
          forage.set(prov.id, forage.get(prov.id) - take);
          eaten += take;
          foraged.set(u.power, foraged.getOrDefault(u.power, 0) + take);
        }
      }
    }
    if (eaten < need) {
      u.hungry++;
      let h = hungry.tryGet(u.power);
      if (!h) hungry.set(u.power, (h = []));
      h.push(unitLabel(u));
    } else u.hungry = 0;
  }
  for (const [p, h] of hungry.entries()) {
    tell(p, `Hungry this season, with nothing left in their depots, baggage or the land around them: ${h.join(", ")}. Hunger acts fast: a unit hungry ${EconomyData.hungryMutiny} seasons running mutinies.`);
    logEvent(S, "hunger", `${p}'s troops went hungry: ${h.join(", ")}.`, [p], "hunger");
  }
  for (const [p, n] of foraged.entries()) if (n > 0) logEvent(S, "forage", `${p}'s troops took ${n} measures from the land.`, [p], "forage");
  // Mutiny: a few seasons of hunger, or of missing pay.
  for (const u of sortBy(
    S.units.filter((u) => u.hungry >= EconomyData.hungryMutiny || u.unpaid >= EconomyData.unpaidMutiny),
    [(u: Unit) => u.id, cmpStr],
  )) {
    const why = u.hungry >= EconomyData.hungryMutiny ? `hungry ${u.hungry} seasons running` : `unpaid ${u.unpaid} seasons running`;
    tell(u.power, `${unitLabel(u)} mutinied, ${why}, and disbanded: its men went home${u.savings > 0 ? ` with their savings, ${formatMoney(u.savings)}` : ""}.`);
    logEvent(S, "mutiny", `${u.power}'s ${unitLabel(u)} mutinied (${why}) and disbanded.`, [...AllPowers.filter((x) => Views.sight(S, this.map, x).has(u.province)), u.power], "mutiny");
    this.disbandUnit(u);
  }
  return lines;
};

/** A unit disbands: its men go home, their savings into their home province's purse; any siege it pressed is lifted. */
P.disbandUnit = function (u) {
  const S = this.s;
  const i = S.units.indexOf(u);
  if (i >= 0) S.units.splice(i, 1);
  this.liftSiegesOf(u.id);
  if (u.home !== "") this.spendAt(u.home, u.savings);
  u.savings = 0;
};

// ---------------------------------------------------------------- caravans

/**
 * A caravan's company for its pace ("What sets a company's pace"): its size is its load in measures, a donkey string for
 * every twenty, so a big caravan is slow and a small one quick; it carries no more than its donkeys can.
 */
P.caravanCompany = function (c) {
  return { sneaking: false, size: c.grain, load: c.grain, capacity: Math.max(20, Math.ceil(c.grain / 20) * 20), animals: "Donkeys" };
};

/**
 * A caravan's route at home: through land its king holds, ending at the destination (which may be land where his troops
 * stand), by road or by boat on a river; never by sea until ships carry goods (item 9+b). Null if there is none.
 */
P.caravanRoute = function (p, from, to) {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const r = cheapestRoute(
    this.map,
    from,
    to,
    (a, b) => (this.map.get(a).isSea || this.map.get(b).isSea ? Infinity : legPoints(this.map, a, b, season)),
    (x) => (S.owner.getOrDefault(x, null) === p ? 0 : Infinity),
  );
  return r === null ? null : r.route;
};

/**
 * The caravans on the road go on: each pays its porters (spent where it stands, if that is its king's land) or they
 * desert with the cargo, eats from its grain for the time on the road (little by boat), advances a season's travel at its
 * pace, meets the road's check once (the troops of a king who closed his roads to its king, standing in a province it
 * reached, take it with the road check's odds; outlaws, more readily for a big caravan), and hands over its grain where
 * it arrives.
 */
P.caravansTravel = function () {
  const S = this.s;
  const perSeason = S.config.travelDays * PointsPerDay;
  const season = seasonOfTurn(S.turn);
  for (const c of sortBy([...S.caravans], [(c: Caravan) => c.id, cmpStr])) {
    if (!isAlive(S, c.power)) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      continue;
    }
    const t = S.treasuries.get(c.power);
    const pay = Math.max(1, Math.ceil(c.grain / EconomyData.caravanPayPer));
    const here = caravanAt(c);
    if (t.gold < pay) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      notify(S, c.power, "Notice", MarketsTitle, `Your caravan from ${this.map.get(c.from).name} to ${this.map.get(c.to).name} went unpaid: its porters deserted at ${this.map.get(here).name} with its ${c.grain} measures of grain.`);
      logEvent(S, "caravan-lost", `${c.power}'s unpaid caravan deserted with its grain.`, [c.power], "caravan-lost");
      continue;
    }
    t.gold -= pay;
    if (S.owner.getOrDefault(here, null) === c.power) this.spendAt(here, pay);
    // Advance along the route at its pace, counting how much of the season went by boat.
    const start = perSeason + c.points;
    let budget = start;
    let boat = 0;
    const crossed: string[] = [];
    const company = this.caravanCompany(c);
    while (c.at < c.route.length - 1) {
      const a = c.route[c.at];
      const b = c.route[c.at + 1];
      const cost = legPoints(this.map, a, b, season, company);
      if (cost > budget) break;
      budget -= cost;
      if (boatDays(this.map, a, b) !== null) boat += cost;
      c.at++;
      crossed.push(b);
    }
    const arrived = c.at >= c.route.length - 1;
    c.points = arrived ? 0 : budget;
    // The porters and donkeys eat from the load for the share of a season they spent on the road, little on the river.
    const used = arrived ? Math.min(perSeason, start - budget) : perSeason;
    const onBoat = Math.min(boat, used);
    const eat = Math.ceil((c.grain * (EconomyData.caravanEatPercent * (used - onBoat) + EconomyData.boatEatPercent * onBoat)) / (100 * perSeason));
    c.grain = Math.max(0, c.grain - eat);
    // The road check, once, as for any traveller (item 7b's odds): the troops of a king who has closed his roads to its
    // king, where he has no passage, in a province it reached; or outlaws.
    const seen = crossed.length > 0 ? crossed : [caravanAt(c)];
    const hostile = (k: Power, at: string): boolean => (S.roadsClosed.tryGet(k) ?? []).includes(c.power) && !this.passageFor(k, c.power, at);
    const taker = seen.map((x) => S.units.find((u) => u.province === x && u.power !== c.power && hostile(u.power, x)) ?? null).find((u) => u !== null) ?? null;
    const roll = this.r("caravan", c.id).nextDouble() * 100;
    if (taker !== null && c.grain > 0 && roll < RoadOdds.troops) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      const kept = Math.min(c.grain, carriedOf(taker.kind) - taker.food);
      taker.food += Math.max(0, kept);
      const where = this.map.get(taker.province).name;
      notify(S, c.power, "Notice", MarketsTitle, `Your caravan to ${this.map.get(c.to).name} was taken at ${where} by ${taker.power}'s troops, with its ${c.grain} measures of grain.`);
      notify(S, taker.power, "Notice", MarketsTitle, `Your troops at ${where} took ${c.power}'s caravan and its ${c.grain} measures of grain${kept > 0 ? `; they kept ${kept} for their own baggage` : ""}.`);
      logEvent(S, "caravan-taken", `${taker.power}'s troops took ${c.power}'s caravan at ${where}.`, [c.power, taker.power], "caravan-taken");
      continue;
    }
    const odds = (EconomyData.caravanOutlawPercent * (100 + c.grain)) / 100;
    if (c.grain > 0 && this.r("caravan-outlaws", c.id).nextDouble() * 100 < odds) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      notify(S, c.power, "Notice", MarketsTitle, `Outlaws fell on your caravan to ${this.map.get(c.to).name} near ${this.map.get(caravanAt(c)).name} and carried off its ${c.grain} measures of grain.`);
      logEvent(S, "caravan-robbed", `Outlaws robbed ${c.power}'s caravan.`, [c.power], "caravan-robbed");
      continue;
    }
    if (arrived) this.caravanArrives(c);
  }
};

/**
 * A caravan arrives: it fills the baggage of its king's troops standing there, emptiest first, and puts the rest into the
 * stores if the province is its king's; whatever is left it carries home again. One coming home puts it into the stores.
 */
P.caravanArrives = function (c) {
  const S = this.s;
  const at = caravanAt(c);
  const name = this.map.get(at).name;
  const parts: string[] = [];
  if (!c.returning) {
    for (const u of sortBy(
      S.units.filter((u) => u.power === c.power && u.province === at),
      [(u: Unit) => u.food, cmpNum],
      [(u: Unit) => u.id, cmpStr],
    )) {
      const give = Math.min(c.grain, carriedOf(u.kind) - u.food);
      if (give <= 0) continue;
      u.food += give;
      c.grain -= give;
      parts.push(`${give} to ${unitLabel(u)}`);
    }
  }
  if (c.grain > 0 && S.owner.getOrDefault(at, null) === c.power) {
    const before = c.grain;
    c.grain = this.putInStores(at, c.grain);
    if (before > c.grain) parts.push(`${before - c.grain} into the stores`);
  }
  if (c.grain > 0 && !c.returning) {
    const back = this.caravanRoute(c.power, at, c.from);
    if (back !== null) {
      c.route = back;
      c.at = 0;
      c.points = 0;
      c.returning = true;
      notify(S, c.power, "Notice", MarketsTitle, `Your caravan reached ${name}${parts.length > 0 ? ` and handed over ${parts.join(", ")}` : ""}; it carries the other ${c.grain} measures home to ${this.map.get(c.from).name}.`);
      return;
    }
  }
  S.caravans.splice(S.caravans.indexOf(c), 1);
  const lostLine = c.grain > 0 ? ` The other ${c.grain} measures had nowhere to go and were lost.` : "";
  notify(S, c.power, "Notice", MarketsTitle, `Your caravan ${c.returning ? "came home to" : "reached"} ${name}${parts.length > 0 ? ` and handed over ${parts.join(", ")}` : ""}.${lostLine}`);
  logEvent(S, "caravan", `${c.power}'s caravan reached ${name}.`, [c.power], "caravan");
};

// ---------------------------------------------------------------- the season's trades

/**
 * The season's trades and shipments, after the moves, in provinces the king still holds: grain handed to his towns, sold
 * at or bought from each market (all of a market's trades netted and priced together along the curve, the merchants' cut
 * each way), and caravans sent out.
 */
P.settleMarkets = function (orders) {
  const S = this.s;
  const Map = this.map;
  const lines = new Dict<Power, string[]>();
  const tell = (p: Power, line: string): void => {
    let l = lines.tryGet(p);
    if (!l) lines.set(p, (l = []));
    l.push(line);
  };
  const held = (p: Power, prov: string, what: string, o: Order): boolean => {
    if (S.owner.getOrDefault(prov, null) === p && siegeOf(S, prov) === null) return true;
    tell(p, `${what} in ${Map.get(prov).name} did not happen: ${S.owner.getOrDefault(prov, null) === p ? "it is besieged" : "you no longer hold it"}.`);
    this.scheduledFailed(p, o, S.owner.getOrDefault(prov, null) === p ? "it is besieged" : "the province was lost");
    return false;
  };
  for (const p of AllPowers) S.treasuries.get(p).income = 0;
  // Feeding the towns.
  for (const [p, o] of orders.filter(([, o]) => o.type === "feed") as [Power, FeedOrder][]) {
    if (!held(p, o.province, "Grain for the town", o)) continue;
    const given = this.takeFromStores(o.province, o.amount);
    this.market(o.province).stock += given;
    tell(p, `You handed ${given} measures of grain from the stores of ${Map.get(o.province).name} to its town.`);
    if (given > 0) logEvent(S, "feed", `${p} handed grain to the town of ${Map.get(o.province).name}.`, [p], "feed");
  }
  // Each market's trades together: sales and purchases netted, the rest priced along the curve.
  const trades = new Dict<string, [Power, SellOrder | PurchaseOrder][]>();
  for (const [p, o] of orders) {
    if (o.type !== "sell" && o.type !== "purchase") continue;
    if (!held(p, o.province, o.type === "sell" ? "A sale of grain" : "A purchase of grain", o)) continue;
    let l = trades.tryGet(o.province);
    if (!l) trades.set(o.province, (l = []));
    l.push([p, o]);
  }
  for (const [prov, group] of sortBy(trades.entries(), [([k]: [string, unknown]) => k, cmpStr])) {
    const name = Map.get(prov).name;
    const m = this.market(prov);
    const normal = needOf(Map.get(prov));
    for (const [p, list] of sortBy(
      [...new Set(group.map(([p]) => p))].map((p) => [p, group.filter(([x]) => x === p).map(([, o]) => o)] as const),
      [([p]: readonly [Power, unknown]) => p, cmpStr],
    )) {
      const t = S.treasuries.get(p);
      const offered = Math.min(this.stores(prov), sum(list.filter((o) => o.type === "sell"), (o) => o.amount));
      const wanted = sum(list.filter((o) => o.type === "purchase"), (o) => o.amount);
      const net = offered - wanted;
      if (net > 0) {
        const r = sellAlongCurve(m.stock, normal, m.purse, net);
        this.takeFromStores(prov, r.taken);
        m.stock += r.taken;
        m.purse -= r.paid;
        t.gold += r.paid;
        t.income += r.paid;
        tell(p, `Sold ${r.taken} measures of grain at ${name} for ${formatMoney(r.paid)}` + (r.taken < net ? `; its people's purse could pay for no more (${net - r.taken} unsold)` : "") + ".");
        if (r.taken > 0) logEvent(S, "sale", `${p} sold grain at ${name}.`, [p], "sale");
        if (r.taken < net) for (const o of list.filter((o) => o.type === "sell")) this.scheduledFailed(p, o, "the people's purse ran dry");
      } else if (net < 0) {
        const r = buyAlongCurve(m.stock, normal, t.gold, -net);
        m.stock -= r.taken;
        m.purse += r.paid;
        t.gold -= r.paid;
        const over = this.putInStores(prov, r.taken);
        tell(p, `Bought ${r.taken} measures of grain at ${name} for ${formatMoney(r.paid)}` + (r.taken < -net ? ` (${-net - r.taken} more were not to be had)` : "") + (over > 0 ? `; ${over} did not fit in the stores and were lost` : "") + ".");
        if (r.taken > 0) logEvent(S, "purchase-grain", `${p} bought grain at ${name}.`, [p], "grain-bought");
      } else if (offered > 0) tell(p, `At ${name} your sales and purchases cancelled out: no grain changed hands.`);
    }
  }
  // Caravans set out.
  for (const [p, o] of orders.filter(([, o]) => o.type === "caravan") as [Power, CaravanOrder][]) {
    if (!held(p, o.from, "A caravan", o)) continue;
    const route = this.caravanRoute(p, o.from, o.to);
    if (route === null) {
      tell(p, `No caravan left ${Map.get(o.from).name} for ${Map.get(o.to).name}: there is no road there through your own land.`);
      this.scheduledFailed(p, o, "no road through its king's land");
      continue;
    }
    const grain = this.takeFromStores(o.from, o.amount);
    if (grain <= 0) {
      tell(p, `No caravan left ${Map.get(o.from).name}: its stores were empty.`);
      this.scheduledFailed(p, o, "the stores were empty");
      continue;
    }
    S.caravans.push(newCaravan({ id: newId(S, "v"), power: p, from: o.from, to: o.to, grain, route, since: S.turn }));
    tell(p, `A caravan of ${grain} measures of grain set out from ${Map.get(o.from).name} for ${Map.get(o.to).name}, by ${route.slice(1, -1).map((x) => Map.get(x).name).join(", ") || "the direct road"}.`);
    logEvent(S, "caravan-out", `${p} sent a caravan from ${Map.get(o.from).name}.`, [p], "caravan-out");
  }
  for (const [p, l] of lines.entries()) notify(S, p, "Resolution", MarketsTitle, l.join(" "));
};

// ---------------------------------------------------------------- wealth

/**
 * What a free city asks to be bought ("a bought city's price is what it adds"): the worth of its land, its people's purse,
 * and the grain in its stores and market at reference prices. The gold leaves the world, paid to its notables.
 */
P.cityPrice = function (province) {
  const m = this.market(province);
  return cityPriceOf(this.map.get(province), this.s.config.provinceWeight, m.purse, this.stores(province) + m.stock);
};
/** The land's worth a season, by what it produces at reference prices: the whole harvest and the mines, as far as it is absorbed. */
P.landWorth = function (p) {
  return sum(ownedBy(this.s, p), (id) => {
    const prov = this.map.get(id);
    return toInt(roundEven((grainWorth(harvestOf(prov)) + economyOf(prov).mine) * absorbedIn(this.s, id)));
  });
};

/**
 * All the gold and goods of a realm but its treasury, at reference prices: its provinces' purses, stores and markets, and
 * what its own men carry, their units' baggage and savings and its caravans' grain.
 */
P.holdings = function (p) {
  const S = this.s;
  let w = 0;
  for (const id of ownedBy(S, p)) {
    const m = this.market(id);
    w += m.purse + grainWorth(this.stores(id) + m.stock);
  }
  for (const u of S.units) if (u.power === p) w += grainWorth(u.food) + u.savings;
  for (const c of S.caravans) if (c.power === p) w += grainWorth(c.grain);
  return w;
};
