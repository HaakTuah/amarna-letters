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
import { climateOf, terrainOf } from "../model/geography.ts";
import { LandData } from "../model/land.ts";
import { seasonOfTurn, WinterSeason, type Province } from "../model/map.ts";
import type { CaravanOrder, FeedOrder, Order, PurchaseOrder, SellOrder } from "../model/orders.ts";
import { AllPowers, type Power } from "../model/power.ts";
import { alive, isAlive, logEvent, newId, notify, ownedBy, siegeOf, unitLabel, type Unit } from "../model/state.ts";
import { legPoints, PointsPerDay, boatDays, type Company } from "../model/travel.ts";
import { formatMoney } from "../rules/calendar.ts";
import { RoadOdds } from "./travel.ts";
import { Views } from "../rules/views.ts";
import { absorbedIn, TurnEngine } from "./core.ts";
import { openToSea, type TollBook } from "./trade.ts";

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
    disbandUnit(u: Unit, settle?: boolean): string;
    caravansTravel(): void;
    caravanCompany(c: Caravan): Company;
    caravanRoute(p: Power, from: string, to: string): string[] | null;
    caravanArrives(c: Caravan): void;
    settleMarkets(orders: [Power, Order][]): void;
    cityPrice(province: string): number;
    landWorth(p: Power): number;
    holdings(p: Power): number;
    townNeed(province: string): number;
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
  this._foodNow.clear();
  const mined = new Dict<Power, number>();
  for (const prov of this.map.landProvinces) {
    // A land without a king collects no tax: its people keep their whole harvest.
    if (prov.kingless) {
      this._foodNow.set(prov.id, this.harvestNow(prov.id));
      continue;
    }
    const owner = S.owner.getOrDefault(prov.id, null);
    if (owner !== null && !isAlive(S, owner)) continue;
    const factor = this.yieldFactor(prov.id);
    const harvest = this.harvestNow(prov.id);
    const tax = toInt(roundEven(idiv(harvest * this.taxRate(prov.id), 100) * factor));
    // What the farmers keep (item 10+a): the harvest as catastrophes leave it, less the tax collected; their fields grow
    // even under a siege, when the tax cannot reach them, and the tax not yet collected in land being absorbed is theirs.
    const grown = toInt(roundEven(harvest * (this.yieldFactor(prov.id, true) / absorbedIn(S, prov.id))));
    this._foodNow.set(prov.id, Math.max(0, grown - tax));
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

/** What a town eats a season: its need, less the mouths put out of it while it is besieged (item 10+b). */
P.townNeed = function (province) {
  const need = needOf(this.map.get(province));
  return need - idiv(need * this.s.expelled.getOrDefault(province, 0), 100);
};

/**
 * Each town eats its local need from its market, and an empty market means a hungry town (before item 10+ that only
 * drives its price up). A besieged city eats from its market and then its stores, its garrison's food apart ("Stores and
 * mouths are the clock"): one that cannot eat in full is starving, and surrenders with the season's sieges if the siege
 * still stands. The sea feeds it only by the ships that bring it grain (item 9+b), while its waters are open.
 */
P.townsEat = function () {
  const S = this.s;
  S.starving.length = 0;
  for (const prov of this.map.landProvinces) {
    // The mouths put out of a besieged city (item 10+b) come back once the siege is over.
    if (S.expelled.has(prov.id) && siegeOf(S, prov.id) === null) S.expelled.delete(prov.id);
    const m = this.market(prov.id);
    const need = this.townNeed(prov.id);
    const fromMarket = Math.min(m.stock, need);
    m.stock -= fromMarket;
    if (siegeOf(S, prov.id) === null) continue;
    const short = need - fromMarket - this.takeFromStores(prov.id, need - fromMarket);
    if (short > 0) S.starving.push(prov.id);
  }
};

/**
 * A king pays his troops, nearest his capital first, as far as his treasury goes: each army or fleet its men's pay and a
 * besieger the cost of its siege works. The men spend part of it where they stand by leave, in their king's own land or
 * land its holder opened to them (item 9+b), and keep the rest. A unit not paid in full counts a season of missing pay.
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

/**
 * Where a unit's men can spend their pay: the province it stands in by leave, their king's own or opened to them by its
 * holder (item 9+b), or for a fleet the coast of its waters, if their king's. In land entered without leave nobody sells
 * to them, and they keep it.
 */
function spendingPlace(e: TurnEngine, u: Unit): string | null {
  const prov = e.map.get(u.province);
  if (!prov.isSea) return e.byLeave(u) ? prov.id : null;
  return depotOf(e, u);
}

/** Where a unit draws from its king's stores: the province it stands in, or a fleet's harbour on its own coast. */
function depotOf(e: TurnEngine, u: Unit): string | null {
  const prov = e.map.get(u.province);
  if (!prov.isSea) return e.s.owner.getOrDefault(prov.id, null) === u.power ? prov.id : null;
  return e.map.landProvinces.find((x) => x.waters === prov.id && e.s.owner.getOrDefault(x.id, null) === u.power)?.id ?? null;
}

/**
 * Every unit eats its season's food: from its king's stores where it stands (and refills its baggage from them), else from
 * its baggage, else from the land: at home the town's market (requisition), elsewhere what the farmers can spare, a third
 * of their share of the harvest (half that in winter, none in the desert or at sea), shared among the troops there. A unit
 * that cannot eat in full goes hungry; after a few seasons of hunger or of missing pay it mutinies and, until bands exist,
 * disbands and its men go home with their savings. Abroad by leave (item 9+b) its king buys its food at the market there,
 * from his treasury, before it eats into its baggage. Returns the lines each king reads.
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
      const farmers = this._foodNow.getOrDefault(prov.id, 0);
      left = idiv(farmers * EconomyData.forageShare, winter ? 200 : 100);
      forage.set(prov.id, left);
    }
    return left;
  };
  const hungry = new Dict<Power, string[]>();
  const foraged = new Dict<Power, number>();
  const bought = new Dict<Power, number>();
  for (const u of sortBy(S.units, [(u: Unit) => u.id, cmpStr])) {
    // An army outside its own land in winter pays supplies, by how hard the winter is there (item 10+a, "Winter in the field").
    const abroad = u.kind === "Army" && winter && S.owner.getOrDefault(u.province, null) !== u.power;
    const need = foodOf(u.kind) + (abroad ? idiv(foodOf(u.kind) * LandData.winterFood[climateOf(u.province).winter], 100) : 0);
    let eaten = 0;
    const depot = depotOf(this, u);
    if (depot !== null) eaten += this.takeFromStores(depot, need);
    // Abroad by leave: bought at the market where it stands, at the market's price, from its king's treasury.
    const host = S.owner.getOrDefault(u.province, null);
    if (eaten < need && depot === null && !this.map.get(u.province).isSea && host !== u.power && this.byLeave(u) && siegeOf(S, u.province) === null) {
      const t = S.treasuries.get(u.power);
      const m = this.market(u.province);
      const r = buyAlongCurve(m.stock, needOf(this.map.get(u.province)), Math.max(0, t.gold), need - eaten);
      if (r.taken > 0) {
        m.stock -= r.taken;
        m.purse += r.paid;
        t.gold -= r.paid;
        eaten += r.taken;
        bought.set(u.power, (bought.getOrDefault(u.power, 0) + r.paid));
      }
    }
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
          // Taken from what the farmers would eat (item 10+a).
          this._foodNow.set(prov.id, Math.max(0, this._foodNow.getOrDefault(prov.id, 0) - take));
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
  for (const [p, g] of bought.entries()) {
    tell(p, `Your troops abroad by leave bought their food at the markets where they stand, for ${formatMoney(g)} from the treasury.`);
    logEvent(S, "food-bought", `${p} bought food for its troops abroad.`, [p], "food-bought");
  }
  // Mutiny: a few seasons of hunger, or of missing pay.
  for (const u of sortBy(
    S.units.filter((u) => u.hungry >= EconomyData.hungryMutiny || u.unpaid >= EconomyData.unpaidMutiny),
    [(u: Unit) => u.id, cmpStr],
  )) {
    const why = u.hungry >= EconomyData.hungryMutiny ? `hungry ${u.hungry} seasons running` : `unpaid ${u.unpaid} seasons running`;
    const savings = u.savings;
    logEvent(S, "mutiny", `${u.power}'s ${unitLabel(u)} mutinied (${why}) and disbanded.`, [...AllPowers.filter((x) => Views.sight(S, this.map, x).has(u.province)), u.power], "mutiny");
    const home = this.disbandUnit(u);
    tell(u.power, `${unitLabel(u)} mutinied, ${why}, and disbanded${savings > 0 ? `, its men taking their savings, ${formatMoney(savings)}` : ""}${home !== "" ? `: ${home}` : ""}.`);
  }
  return lines;
};

/**
 * A unit disbands: its men go home, walking there from where it stood with their savings, which reach their home's purse
 * when they do (item 10+a), or settle where it stands as colonists (`settle`), their savings into its purse; any siege it
 * pressed is lifted. Returns what became of its men.
 */
P.disbandUnit = function (u, settle = false) {
  const S = this.s;
  const i = S.units.indexOf(u);
  if (i >= 0) S.units.splice(i, 1);
  this.liftSiegesOf(u.id);
  // The men carry their savings with them: home when they arrive, or where they settle (Haakon, 28 October 2026).
  return this.menHome(u, settle);
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
 * A caravan's route: through land open to it (its king's own, and from item 9+b land whose holder has not closed his
 * roads to it), ending at the destination (which may be land where his troops stand), by road or by boat on a river; by
 * sea only as a ship ("Ships carry goods"). Null if there is none.
 */
P.caravanRoute = function (p, from, to) {
  return this.tradeRoute(p, from, to, false);
};

/**
 * The caravans on the road go on: each pays its porters, or a ship its crew (spent where it stands, if that is its king's
 * land), or they desert with the cargo; eats from its grain for the time on the road (little by boat or ship); advances a
 * season's travel at its pace, meeting each border it crosses (item 9+b: turned back where the roads are closed to it,
 * paying the toll, or smuggling past it); meets the road's check once (the troops or fleets of a king who closed his roads
 * to its king, standing where it passed, take it with the road check's odds; outlaws on land, more readily for a big
 * caravan; storms at sea), and hands over or trades its goods where it arrives.
 */
P.caravansTravel = function () {
  const S = this.s;
  const perSeason = S.config.travelDays * PointsPerDay;
  const season = seasonOfTurn(S.turn);
  const book: TollBook = new Dict();
  const what = (c: Caravan): string => [c.grain > 0 || c.gold <= 0 ? `${c.grain} measures of grain` : "", c.gold > 0 ? formatMoney(c.gold) : ""].filter((x) => x !== "").join(" and ");
  const noun = (c: Caravan): string => (c.ship !== null ? "ship" : "caravan");
  for (const c of sortBy([...S.caravans], [(c: Caravan) => c.id, cmpStr])) {
    if (!isAlive(S, c.power)) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      continue;
    }
    const t = S.treasuries.get(c.power);
    const pay = c.ship !== null ? S.config.fleetUpkeep : Math.max(1, Math.ceil((c.grain + idiv(c.gold, 10)) / EconomyData.caravanPayPer));
    const here = caravanAt(c);
    if (t.gold < pay) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      if (c.ship !== null && c.ship.home !== "") this.spendAt(c.ship.home, c.ship.savings);
      notify(S, c.power, "Notice", MarketsTitle, `Your ${noun(c)} from ${this.map.get(c.from).name} to ${this.map.get(c.to).name} went unpaid: its ${c.ship !== null ? "crew" : "porters"} deserted at ${this.map.get(here).name} with its ${what(c)}${c.ship !== null ? ", and the fleet is lost to you" : ""}.`);
      logEvent(S, "caravan-lost", `${c.power}'s unpaid ${noun(c)} deserted with its goods.`, [c.power], "caravan-lost");
      continue;
    }
    t.gold -= pay;
    // The porters spend their pay where they stand openly (at home or in land open to them); smugglers off the road and
    // a crew at sea keep it, the smugglers' going to their homes at once and the crew's into its savings.
    if (this.map.get(here).isSea) {
      if (c.ship !== null) c.ship.savings += pay;
    } else if (c.sneak && S.owner.getOrDefault(here, null) !== c.power && S.owner.getOrDefault(here, null) !== null) this.spendAt(c.from, pay);
    else this.spendAt(here, pay);
    // Advance along the route at its pace, counting how much of the season went by boat, meeting each border it crosses.
    const start = perSeason + c.points;
    let budget = start;
    let boat = 0;
    const crossed: string[] = [];
    const company: Company = c.ship !== null ? { sneaking: false } : this.caravanCompany(c);
    let stopped: "turned" | "seized" | null = null;
    while (c.at < c.route.length - 1) {
      const a = c.route[c.at];
      const b = c.route[c.at + 1];
      const offRoad = (x: string): boolean => c.sneak && S.owner.getOrDefault(x, null) !== c.power && S.owner.getOrDefault(x, null) !== null;
      const cost = legPoints(this.map, a, b, season, { ...company, sneaking: offRoad(a) || offRoad(b) });
      if (cost > budget) break;
      const border = this.atBorder(c, a, b, book);
      if (border !== "pass") {
        stopped = border;
        break;
      }
      budget -= cost;
      if (c.ship !== null || boatDays(this.map, a, b) !== null) boat += cost;
      c.at++;
      crossed.push(b);
    }
    if (stopped === "seized") {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      if (c.ship !== null) this.rejoinFleet(c);
      continue;
    }
    if (stopped === "turned") {
      const at = caravanAt(c);
      // A new way home, round the land it now knows is closed to it.
      const back = c.ship !== null ? this.shipRoute(at, c.from) : this.tradeRoute(c.power, at, c.from, c.sneak);
      if (back === null && at !== c.from) {
        S.caravans.splice(S.caravans.indexOf(c), 1);
        if (c.ship !== null) this.rejoinFleet(c);
        notify(S, c.power, "Notice", MarketsTitle, `Your ${noun(c)} found no way home from ${this.map.get(at).name}: its ${what(c)} were lost.`);
        continue;
      }
      if (back !== null) {
        c.route = back;
        c.at = 0;
        c.returning = true;
      }
      c.points = 0;
      if (c.at >= c.route.length - 1) this.caravanHome(c);
      continue;
    }
    const arrived = c.at >= c.route.length - 1;
    c.points = arrived ? 0 : budget;
    // The porters and donkeys eat from the load for the share of a season they spent on the road, little on the river or at sea.
    const used = arrived ? Math.min(perSeason, start - budget) : perSeason;
    const onBoat = Math.min(boat, used);
    const eat = Math.ceil((c.grain * (EconomyData.caravanEatPercent * (used - onBoat) + EconomyData.boatEatPercent * onBoat)) / (100 * perSeason));
    c.grain = Math.max(0, c.grain - eat);
    // The road check, once, as for any traveller (item 7b's odds): the troops (at sea, the fleets) of a king who has
    // closed his roads to its king, where he has no passage, in a province it reached; or outlaws; or a storm at sea.
    const seen = crossed.length > 0 ? crossed : [caravanAt(c)];
    const hostile = (k: Power, at: string): boolean => (S.roadsClosed.tryGet(k) ?? []).includes(c.power) && !this.passageFor(k, c.power, at);
    const taker = seen.map((x) => S.units.find((u) => u.province === x && u.power !== c.power && hostile(u.power, x)) ?? null).find((u) => u !== null) ?? null;
    const roll = this.r("caravan", c.id).nextDouble() * 100;
    if (taker !== null && c.grain + c.gold > 0 && roll < RoadOdds.troops) {
      S.caravans.splice(S.caravans.indexOf(c), 1);
      const kept = Math.min(c.grain, carriedOf(taker.kind) - taker.food);
      taker.food += Math.max(0, kept);
      S.treasuries.get(taker.power).gold += c.gold;
      const where = this.map.get(taker.province).name;
      notify(S, c.power, "Notice", MarketsTitle, `Your ${noun(c)} to ${this.map.get(c.to).name} was taken at ${where} by ${taker.power}'s ${c.ship !== null ? "fleet" : "troops"}, with its ${what(c)}${c.ship !== null ? "; a loaded ship fights badly, and the fleet is lost" : ""}.`);
      notify(S, taker.power, "Notice", MarketsTitle, `Your ${taker.kind === "Fleet" ? "fleet" : "troops"} at ${where} took ${c.power}'s ${noun(c)} and its ${what(c)}${kept > 0 ? `; they kept ${kept} measures for their own baggage` : ""}${c.gold > 0 ? ", the gold for your treasury" : ""}.`);
      logEvent(S, "caravan-taken", `${taker.power}'s ${taker.kind === "Fleet" ? "fleet" : "troops"} took ${c.power}'s ${noun(c)} at ${where}.`, [c.power, taker.power], "caravan-taken");
      continue;
    }
    if (c.ship !== null) {
      const storm = seen.some((x) => this.map.get(x).isSea) ? (season === WinterSeason ? RoadOdds.winterStorm : RoadOdds.storm) : 0;
      if (storm > 0 && this.r("ship-storm", c.id).nextDouble() * 100 < storm) {
        S.caravans.splice(S.caravans.indexOf(c), 1);
        notify(S, c.power, "Notice", MarketsTitle, `A storm sank your ship near ${this.map.get(caravanAt(c)).name}, with its ${what(c)}: the fleet is lost.`);
        logEvent(S, "ship-lost", `A storm sank ${c.power}'s ship.`, [c.power], "ship-lost");
        continue;
      }
    } else {
      const odds = (EconomyData.caravanOutlawPercent * (100 + c.grain + idiv(c.gold, 10))) / 100;
      if (c.grain + c.gold > 0 && this.r("caravan-outlaws", c.id).nextDouble() * 100 < odds) {
        S.caravans.splice(S.caravans.indexOf(c), 1);
        notify(S, c.power, "Notice", MarketsTitle, `Outlaws fell on your caravan to ${this.map.get(c.to).name} near ${this.map.get(caravanAt(c)).name} and carried off its ${what(c)}.`);
        logEvent(S, "caravan-robbed", `Outlaws robbed ${c.power}'s caravan.`, [c.power], "caravan-robbed");
        continue;
      }
    }
    if (arrived) this.caravanArrives(c);
  }
  this.tellTolls(book);
};

/**
 * A caravan or ship arrives. One that trades sells and buys at the market there (item 9+b); one that delivers fills the
 * baggage of its king's troops standing there, emptiest first, and puts the rest into the stores if the province is its
 * king's and open to it (a besieged city takes in nothing by land, and by sea only while its waters are open). Whatever
 * it still carries, and a ship always, goes home again; one coming home unloads there.
 */
P.caravanArrives = function (c) {
  const S = this.s;
  if (c.returning) {
    this.caravanHome(c);
    return;
  }
  const at = caravanAt(c);
  const name = this.map.get(at).name;
  const parts: string[] = [];
  if (c.trade) this.tradeAtMarket(c, parts);
  else {
    const besieged = siegeOf(S, at) !== null;
    const open = !besieged || (c.ship !== null && openToSea(this, at));
    if (open)
      for (const u of sortBy(
        S.units.filter((u) => u.power === c.power && u.province === at),
        [(u: Unit) => u.food, cmpNum],
        [(u: Unit) => u.id, cmpStr],
      )) {
        const give = Math.min(c.grain, carriedOf(u.kind) - u.food);
        if (give <= 0) continue;
        u.food += give;
        c.grain -= give;
        parts.push(`handed ${give} to ${unitLabel(u)}`);
      }
    if (c.grain > 0 && S.owner.getOrDefault(at, null) === c.power && open) {
      const before = c.grain;
      c.grain = this.putInStores(at, c.grain);
      if (before > c.grain) parts.push(`put ${before - c.grain} into the stores${besieged ? " of the besieged city" : ""}`);
    }
    if (!open) parts.push(c.ship !== null ? "found the harbour blockaded" : "found the city besieged and could not get in");
  }
  if (c.grain > 0 || c.gold > 0 || c.ship !== null) {
    const back = c.ship !== null ? this.shipRoute(at, c.from) : this.tradeRoute(c.power, at, c.from, c.sneak);
    if (back !== null) {
      c.route = back;
      c.at = 0;
      c.points = 0;
      c.returning = true;
      notify(S, c.power, "Notice", MarketsTitle, `Your ${c.ship !== null ? "ship" : "caravan"} reached ${name}${parts.length > 0 ? ` and ${parts.join(", ")}` : ""}; it goes home to ${this.map.get(c.from).name}${c.grain + c.gold > 0 ? ` with ${[c.grain > 0 ? `${c.grain} measures of grain` : "", c.gold > 0 ? formatMoney(c.gold) : ""].filter((x) => x !== "").join(" and ")}` : ""}.`);
      logEvent(S, c.trade ? "traded" : "caravan", `${c.power}'s ${c.ship !== null ? "ship" : "caravan"} reached ${name}.`, [c.power], c.trade ? "traded" : "caravan");
      return;
    }
  }
  S.caravans.splice(S.caravans.indexOf(c), 1);
  if (c.ship !== null) this.rejoinFleet(c);
  const lostLine = c.grain + c.gold > 0 ? ` The other ${c.grain} measures${c.gold > 0 ? ` and ${formatMoney(c.gold)}` : ""} had no way home and were lost.` : "";
  notify(S, c.power, "Notice", MarketsTitle, `Your caravan reached ${name}${parts.length > 0 ? ` and ${parts.join(", ")}` : ""}.${lostLine}`);
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
      tell(p, `No caravan left ${Map.get(o.from).name} for ${Map.get(o.to).name}: there is no road there through land open to your caravans.`);
      this.scheduledFailed(p, o, "no road open to its caravans");
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
  // Trading caravans and ships (item 9+b).
  this.sendTraders(orders, tell);
  for (const [p, l] of lines.entries()) notify(S, p, "Resolution", MarketsTitle, l.join(" "));
};

// ---------------------------------------------------------------- wealth

/**
 * What a free city asks to be bought ("a bought city's price is what it adds"): the worth of its land, its people's purse,
 * and the grain in its stores and market at reference prices. The gold leaves the world, paid to its notables.
 */
P.cityPrice = function (province) {
  const m = this.market(province);
  return cityPriceOf(this.map.get(province), this.s.config.provinceWeight, m.purse, this.stores(province) + m.stock, this.harvestNow(province, false));
};
/**
 * The land's worth a season, by what it produces at reference prices: the whole harvest its people bring in now (item
 * 10+a: a ravaged or emptied province is worth less at once) and the mines, as far as it is absorbed.
 */
P.landWorth = function (p) {
  return sum(ownedBy(this.s, p), (id) => {
    const prov = this.map.get(id);
    return toInt(roundEven((grainWorth(this.harvestNow(id, false)) + economyOf(prov).mine) * absorbedIn(this.s, id)));
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
  // Discharged men walking home carry their savings to a province of this realm (item 10+a).
  for (const x of S.walking) if (S.owner.getOrDefault(x.home, null) === p) w += x.savings;
  for (const c of S.caravans) if (c.power === p) w += grainWorth(c.grain) + c.gold + (c.ship !== null ? grainWorth(c.ship.food) + c.ship.savings : 0);
  return w;
};
