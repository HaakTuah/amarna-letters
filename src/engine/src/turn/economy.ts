/**
 * The economy at home (build order item 9+a, "Economy and resources"): each season the land is harvested and the tax in
 * grain goes into each province's stores ("Production is local", "How a king lives"), the mines' gold into the holder's
 * treasury ("One treasury, many stores"), stores and markets spoil, towns eat from their markets ("Prices") and a besieged
 * city from its stores ("How long a siege lasts"); troops are paid in gold, part of which their men spend where they stand
 * ("Where gold comes from and where it goes", "Soldiers carry savings home"), and eat grain from their depots, their
 * baggage and the land, going hungry and in the end mutinying when none of it suffices ("Armies need food as well as
 * pay"); caravans carry grain between a king's provinces and to his troops ("Caravans carry a kingdom's goods"; their
 * journeys are in caravans.ts). With the orders, kings sell grain at their markets and buy there, hand grain to their
 * towns ("Kings can feed their towns"), and send caravans out; each market's trades are settled together.
 */
import { Dict } from "../core/collections.ts";
import { idiv, roundEven, toInt } from "../core/num.ts";
import { cmpNum, sortBy, sum } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import { newCaravan, newMarket, setOut, type Market } from "../model/caravans.ts";
import { buyAlongCurve, capacityOf, economyOf, EconomyData, needOf, sellAlongCurve } from "../model/economy.ts";
import { UnrestData } from "../model/unrest.ts";
import { climateOf, reapSeasonOf, terrainOf } from "../model/geography.ts";
import { forMen, LandData, unitCarried, unitFood } from "../model/land.ts";
import { BandData } from "../model/bands.ts";
import { gain } from "../model/people.ts";
import { seasonOfTurn, WinterSeason, type Province } from "../model/map.ts";
import type { CaravanOrder, FeedOrder, Order, PurchaseOrder, SellOrder } from "../model/orders.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { courierSeasons } from "../rules/court.ts";
import { alive, feedsUnit, isAlive, logEvent, newId, notify, ownedBy, paysUnit, siegeOf, unitLabel, type Unit, loseUnit } from "../model/state.ts";
import { formatMoney, measures } from "../rules/calendar.ts";
import { listed } from "../rules/wording.ts";
import { Views } from "../rules/views.ts";
import { obeyedIn, TurnEngine } from "./core.ts";
import { CommandData } from "../model/command.ts";
import { TakenBook } from "./supply.ts";
import { goldSent } from "./coffers.ts";
import { carriedWorth, provinceHolding, provinceWorth } from "../rules/province-reports.ts";

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
    payTroops(p: Power): { paid: number; unpaid: string[]; held: string[] };
    feedTroops(): Dict<Power, string[]>;
    disbandUnit(u: Unit, settle?: boolean): string;
    settleMarkets(orders: [Power, Order][]): void;
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
  let factor = obeyedIn(S, province);
  for (const c of S.catastrophes) {
    if (c.startTurn > S.turn || c.endTurn < S.turn) continue;
    if (c.province === province || (c.province === null && owner === c.power)) factor *= c.incomeFactor;
  }
  return factor;
};

// ---------------------------------------------------------------- the season begins

/**
 * The harvest in each land's own season (item 11a+, "Period first"): every land province's fields grow by the hands on
 * them this season (`harvestNow`: its people and men, the droughts and floods); in its reaping season the crop is
 * reaped, as catastrophes leave it, into the farmers' granary, and that harvest is what the tax is reckoned from until
 * the next. Each season the holder's tax at its rate takes a third of it from the granary, as far as it holds, into the
 * province's stores (what does not fit lost; nothing while besieged, and in land that obeys its holder grudgingly only its share); the
 * farmers eat from what is left (`_foodNow`, see peopleSeason). The mines' gold goes into the holder's treasury (a free
 * city's into its people's purse); then stores and markets spoil. Returns the lines each king reads of it.
 */
P.harvestSeason = function () {
  const S = this.s;
  const season = seasonOfTurn(S.turn);
  const lines = new Dict<Power, string[]>();
  // Bug #540: by the court a province reports to, its couriers' season (the holder) or farther ("holder@province"), whose
  // report comes home by the road.
  const taxed = new Dict<string, number>();
  const lost = new Dict<string, number>();
  const reaped = new Dict<string, [string, number][]>();
  this._foodNow.clear();
  // What the mines yielded into the treasury at once (gold from farther mines travels as a load, reported as one).
  const mined = new Dict<Power, number>();
  for (const prov of this.map.landProvinces) {
    const owner = S.owner.getOrDefault(prov.id, null);
    const book = owner === null || this.wordTo(owner, prov.id) === 0 ? owner : `${owner}@${prov.id}`;
    // The fields grow by this season's hands and weather; in its season the crop is reaped into the granaries.
    const crop = S.crop.getOrDefault(prov.id, 0) + this.harvestNow(prov.id);
    let granary = S.granary.getOrDefault(prov.id, 0);
    if (season === reapSeasonOf(prov.id)) {
      // Plague, war and the like strike the harvest as it is brought in; it grows even under a siege.
      const harvest = toInt(roundEven(crop * (this.yieldFactor(prov.id, true) / obeyedIn(S, prov.id))));
      S.reaped.set(prov.id, harvest);
      granary += harvest;
      S.crop.set(prov.id, 0);
      if (book !== null) reaped.set(book, [...reaped.getOrDefault(book, []), [prov.name, harvest]]);
    } else S.crop.set(prov.id, crop);
    // Land nobody holds collects no tax: its people keep their whole harvest ("Land without a ruler", item 11+; until then
    // a free city's tax filled its own stores). Under a leader the Kaska lands, Lukka and the steppe are taxed like any land.
    if (owner === null) {
      const metal = toInt(roundEven(economyOf(prov).mine * this.yieldFactor(prov.id)));
      if (metal > 0) this.spendAt(prov.id, metal);
    } else {
      // The harvest already bore the catastrophes; the tax bears only how fully it obeys, and nothing reaches it under a siege.
      const due = siegeOf(S, prov.id) !== null ? 0 : toInt(roundEven(this.grainAsked(prov.id) * obeyedIn(S, prov.id)));
      // Item 17++: a share never squeezes the farmers: their season's food stays in the granary, however it was emptied.
      const tax = Math.min(Math.max(0, granary - this.shareReserve(prov.id)), due);
      granary -= tax;
      const over = this.putInStores(prov.id, tax);
      taxed.set(book!, taxed.getOrDefault(book!, 0) + tax - over);
      lost.set(book!, lost.getOrDefault(book!, 0) + over);
      // Item 13: the yield passes through a governor's hands, and he may keep some of it.
      const metal = this.throughGovernor(prov.id, toInt(roundEven(economyOf(prov).mine * this.yieldFactor(prov.id))));
      if (metal > 0) {
        // Item 13 ("Distance inside your own realm"): gold reaches the treasury after its travel time; from beyond the
        // season's reach it goes as a load that can be waylaid.
        // Item 13+: a fallen kingdom's land the word of its fall has not reached yet sends its gold to the fallen capital
        // as before, and it goes to whoever holds it (none: it stays with the province's people).
        const fall = isAlive(S, owner) ? null : this.fallOf(owner);
        const to = fall === null ? owner : S.owner.getOrDefault(fall.capital, null);
        if (to === null || !isAlive(S, to)) this.spendAt(prov.id, metal);
        else {
          const at = fall === null ? this.courtAt(to) : fall.capital;
          // #587: a far province's gold goes into its coffer, which pays what is done there and sends the rest home.
          if (fall === null && this.isFar(to, prov.id)) this.receiveAt(to, prov.id, metal);
          else if (courierSeasons(S, this.map, prov.id, at) >= 1) this.lootHome(to, prov.id, metal, [], "", at);
          else {
            const t = S.treasuries.get(to);
            t.gold += metal;
            t.income += metal;
            mined.set(to, mined.getOrDefault(to, 0) + metal);
          }
        }
      }
    }
    S.granary.set(prov.id, granary);
    // What the farmers have to eat this season (item 10+a's `_foodNow`): their granary, whatever troops forage of it first.
    this._foodNow.set(prov.id, granary);
  }
  // Rot and vermin in stores and markets alike.
  for (const [k, v] of [...S.stores.entries()]) {
    const rot = idiv(v * EconomyData.spoilPercent, 100);
    if (rot > 0) S.stores.set(k, v - rot);
  }
  for (const m of S.markets.values()) m.stock -= idiv(m.stock * EconomyData.spoilPercent, 100);
  // The owner's answer to item 11a+ (opening item 11b): the farmers' granaries rot like the king's stores.
  for (const [k, v] of [...S.granary.entries()]) {
    const rot = idiv(v * EconomyData.spoilPercent, 100);
    if (rot > 0) S.granary.set(k, v - rot);
  }
  for (const p of alive(S)) {
    const l: string[] = [];
    if (reaped.has(p)) {
      const brought = reaped.get(p).filter(([, n]) => n > 0);
      l.push(brought.length > 0 ? `The harvest is in the farmers' granaries: ${listed(brought.map(([name, n]) => `${measures(n)} at ${name}`))}.` : "The harvest brought nothing into the farmers' granaries.");
      logEvent(S, "harvest", `${p}'s land reaped its harvest: ${reaped.get(p).map(([name, n]) => `${name} ${n}`).join(", ")} measures.`, [p], "harvest-reaped");
    }
    // Only what came in: no line for a tax, a mine or a sale that brought nothing.
    const t = taxed.getOrDefault(p, 0);
    const over = lost.getOrDefault(p, 0);
    if (t + over > 0) l.push(`The grain tax brought ${measures(t)} into your stores` + (over > 0 ? `; they had no room for ${measures(over)} more, and it was lost` : "") + ".");
    const got = S.treasuries.get(p).income;
    const fromMines = mined.getOrDefault(p, 0);
    if (got > fromMines) l.push(`Since your last orders, ${formatMoney(got)} came into the treasury${fromMines > 0 ? `, ${formatMoney(fromMines)} of it from your mines` : ""}.`);
    else if (fromMines > 0) l.push(`Your mines yielded ${formatMoney(fromMines)} for the treasury.`);
    lines.set(p, l);
  }
  // Farther off, a province's harvest, or grain lost for want of room, comes home by the road as its report (its stores
  // show the tax; its mines' gold goes as a load).
  for (const book of new Set([...reaped.keys(), ...lost.keys()].filter((k) => k.includes("@")))) {
    const [p, id] = book.split("@") as [Power, string];
    if (!isAlive(S, p) || (!reaped.has(book) && lost.getOrDefault(book, 0) <= 0)) continue;
    const harvest = reaped.tryGet(book)?.[0]?.[1];
    const over = lost.getOrDefault(book, 0);
    const tax = `the grain tax brought ${measures(taxed.getOrDefault(book, 0))} into its stores` + (over > 0 ? `, which had no room for ${measures(over)} more` : "");
    this.tell(p, id, "Notice", EconomyTitle, `From ${this.map.get(id).name}: ${harvest !== undefined ? `its harvest of ${measures(harvest)} is in the farmers' granaries; ` : ""}${tax}.`);
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
 * A king pays his troops by his standing order (item 17+: every king starts with one, and nothing is paid without it),
 * nearest his capital first, as far as his treasury goes: each army or fleet its men's pay and a besieger the cost of its
 * siege works. The men spend part of it where they stand by leave, in their king's own land or land its holder opened to
 * them (item 9+b), and keep the rest. A unit not paid in full, or held back by its king's order, counts a season of missing pay.
 * Beyond the season's reach, the gold that is there pays, and a bill carried home the rest (#587, `TurnEngine.payFar`).
 */
P.payTroops = function (p) {
  const S = this.s;
  const Map = this.map;
  const t = S.treasuries.get(p);
  const cap = this.courtAt(p);
  let paid = 0;
  const unpaid: string[] = [];
  const held: string[] = [];
  for (const u of sortBy(
    S.units.filter((u) => u.power === p),
    [(u: Unit) => Map.hops(cap, u.province), cmpNum],
    [(u: Unit) => u.id, cmpStr],
  )) {
    if (!paysUnit(S, u)) {
      u.unpaid++;
      // Item 17++: wages unpaid are a taking its men remember of their king.
      this.armyEntry(u, u.power, -UnrestData.unpaid);
      held.push(unitLabel(u));
      logEvent(S, "pay-held", `${land(p)} held back the pay of ${unitLabel(u)} by its standing order.`, [p], "pay-held");
      continue;
    }
    const pay = forMen(u.kind === "Army" ? S.config.armyUpkeep : S.config.fleetUpkeep, u.kind, u.men) + (S.sieges.some((x) => x.unitId === u.id) ? S.config.siegeUpkeep : 0);
    // #587: beyond the season's reach, paid from the coffer of the province it stands in, if its king's, and the rest on a
    // bill carried home: its men serve on their king's word until the bill reaches him. What the coffer pays is told
    // with the province's report, the bill when it comes.
    const far = this.isFar(p, u.province) ? this.payFar(p, u.province, pay, u) : null;
    if (far === null && (this.isFar(p, u.province) || t.gold < pay)) {
      u.unpaid++;
      this.armyEntry(u, u.power, -UnrestData.unpaid);
      // A far unit's missing pay is its own report's, not the treasury's to tell.
      if (!this.isFar(p, u.province)) unpaid.push(unitLabel(u));
      continue;
    }
    const cash = far === null ? pay : far.coffer;
    if (far === null) {
      t.gold -= pay;
      paid += pay;
    }
    // On credit its missing pay stands until the bill is paid (`goldArrives`), so a bill unpaid is never forgotten.
    if (far === null || far.credit === 0) u.unpaid = 0;
    // Pay is a giving, credited to the hand they see: their commander, else their king.
    this.armyEntry(u, this.armyHand(u), UnrestData.pay);
    const where = spendingPlace(this, u);
    const spent = where === null ? 0 : idiv(cash * EconomyData.spentPercent, 100);
    if (where !== null) this.spendAt(where, spent);
    u.savings += cash - spent;
  }
  return { paid, unpaid, held };
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
 * disbands and its men go home with their savings. Where it stands by leave, at home or abroad (item 9+b), it buys its
 * food at the market there before it eats into its baggage, if its king's word is to buy and it carries the gold he sent
 * for it, unless its commander keeps that gold; without, it takes (item 17, "Armies need food as well as pay"), and what
 * troops take raises the land's unrest by how much it was. Returns the lines each king reads.
 */
P.feedTroops = function () {
  const S = this.s;
  this.foodArrives();
  // What each province's farmers and market held as the season began: what troops take is weighed against it (item 17).
  const base = new Dict<string, number>();
  for (const prov of this.map.landProvinces) base.set(prov.id, this._foodNow.getOrDefault(prov.id, 0) + (S.markets.tryGet(prov.id)?.stock ?? 0));
  const taken = new TakenBook(base);
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
    u.chest = Math.min(u.chest, u.savings);
    // An army outside its own land in winter pays supplies, by how hard the winter is there (item 10+a, "Winter in the field").
    const abroad = u.kind === "Army" && winter && S.owner.getOrDefault(u.province, null) !== u.power;
    const need = unitFood(u) + (abroad ? idiv(unitFood(u) * LandData.winterFood[climateOf(u.province).winter], 100) : 0);
    let eaten = 0;
    // Item 17+: fed from its king's stores and gold only by his standing order; held back, it eats what it carries and then takes.
    const depot = feedsUnit(S, u) ? depotOf(this, u) : null;
    if (depot !== null) eaten += this.takeFromStores(depot, need);
    // Where it stands by leave, at home or in a friend's land: bought at the market there, at the market's price, with the
    // gold it carries for food, if its king's word is to buy and its commander does not keep the gold (item 17).
    const host = S.owner.getOrDefault(u.province, null);
    const byLeave = !this.map.get(u.province).isSea && (host === u.power || this.byLeave(u)) && siegeOf(S, u.province) === null;
    let buying = false;
    if (eaten < need && byLeave && u.buy && u.chest > 0 && feedsUnit(S, u) && !this.keepsFoodGold(u)) {
      const m = this.market(u.province);
      const r = buyAlongCurve(m.stock, needOf(this.map.get(u.province)), u.chest, need - eaten);
      if (r.taken > 0) {
        m.stock -= r.taken;
        m.purse += r.paid;
        u.chest -= r.paid;
        u.savings -= r.paid;
        eaten += r.taken;
        buying = true;
        bought.set(u.power, (bought.getOrDefault(u.power, 0) + r.paid));
      }
    }
    if (eaten < need) {
      const b = Math.min(u.food, need - eaten);
      u.food -= b;
      eaten += b;
    }
    if (depot !== null) u.food += this.takeFromStores(depot, unitCarried(u) - u.food);
    const prov = this.map.get(u.province);
    const before = eaten;
    if (eaten < need && !prov.isSea) {
      if (S.owner.getOrDefault(prov.id, null) === u.power) {
        const m = this.market(prov.id);
        const take = Math.min(m.stock, need - eaten);
        m.stock -= take;
        eaten += take;
        taken.add(prov.id, u.power, take);
      }
      if (eaten < need) {
        const take = Math.min(landFood(prov), need - eaten);
        if (take > 0) {
          forage.set(prov.id, forage.get(prov.id) - take);
          // Taken from what the farmers would eat (item 10+a); and what its men waste and spoil besides, by how its commander
          // takes: a good one in order, a poor or disloyal one by letting them loot (item 13).
          const t = this.commandOf(u);
          const waste = idiv(take * Math.max(0, idiv(100 - t.competence, CommandData.lootPer) + idiv(100 - t.loyalty, CommandData.lootPer)), 100);
          this._foodNow.set(prov.id, Math.max(0, this._foodNow.getOrDefault(prov.id, 0) - take - waste));
          eaten += take;
          taken.add(prov.id, u.power, take + waste);
          foraged.set(u.power, foraged.getOrDefault(u.power, 0) + take);
        }
      }
    }
    // How each army by leave got its food this season, for the record (item 17): bought, or taken.
    if (byLeave && u.kind === "Army") {
      if (buying) logEvent(S, "supply", `${u.power}'s army in ${prov.name} bought its food.`, [], "supply-buy");
      if (eaten > before) logEvent(S, "supply", `${u.power}'s army in ${prov.name} took its food from the land.`, [], "supply-take");
    }
    if (eaten < need) {
      u.hungry++;
      // Hunger is a taking, held against the hand that feeds them.
      this.armyEntry(u, this.armyHand(u), -UnrestData.starved);
      let h = hungry.tryGet(u.power);
      if (!h) hungry.set(u.power, (h = []));
      h.push(unitLabel(u));
    } else u.hungry = 0;
  }
  for (const [p, h] of hungry.entries()) {
    tell(p, `Hungry this season, with nothing left in depot, baggage or field: your ${h.join(", your ")}. A unit hungry ${EconomyData.hungryMutiny} seasons running mutinies.`);
    logEvent(S, "hunger", `${p}'s troops went hungry: ${h.join(", ")}.`, [p], "hunger");
  }
  for (const [p, n] of foraged.entries()) if (n > 0) logEvent(S, "forage", `${p}'s troops took ${n} measures from the land.`, [p], "forage");
  taken.settle(this);
  for (const [p, g] of bought.entries()) {
    tell(p, `Your troops abroad bought their food in the markets there, for ${formatMoney(g)} of the gold they carry.`);
    logEvent(S, "food-bought", `${p} bought food for its troops abroad.`, [p], "food-bought");
  }
  // Mutiny: a few seasons of hunger, or of missing pay.
  for (const u of sortBy(
    S.units.filter((u) => u.hungry >= EconomyData.hungryMutiny || u.unpaid >= EconomyData.unpaidMutiny),
    [(u: Unit) => u.id, cmpStr],
  )) {
    const why = u.hungry >= EconomyData.hungryMutiny ? `hungry ${u.hungry} seasons running` : `unpaid ${u.unpaid} seasons running`;
    // Item 11b: on land, the mutineers may follow one of their own as a band, the larger the likelier ("Mutineers").
    const rng = this.r("mutiny-head", u.id);
    if (u.kind === "Army" && !this.map.get(u.province).isSea && rng.chance(Math.min(90, BandData.mutinyHead + idiv(u.men, 500)) / 100)) {
      const men = u.men;
      loseUnit(S, u);
      this.liftSiegesOf(u.id);
      const b = this.headRises(u.province, men, "mutiny", rng);
      gain(S.characters.find((c) => c.id === b.leaderId)!, u.savings, "Loot");
      logEvent(S, "mutiny", `${u.power}'s ${unitLabel(u)} mutinied (${why}) and follows one of its own as a band.`, [...AllPowers.filter((x) => Views.sight(S, this.map, x).has(u.province)), u.power], "mutiny");
      tell(u.power, `Your ${unitLabel(u)} mutinied, ${why}: its ${men} men took their savings and follow one of their own, ${S.characters.find((c) => c.id === b.leaderId)!.name}, as a band.`);
      continue;
    }
    const savings = u.savings;
    logEvent(S, "mutiny", `${u.power}'s ${unitLabel(u)} mutinied (${why}) and disbanded.`, [...AllPowers.filter((x) => Views.sight(S, this.map, x).has(u.province)), u.power], "mutiny");
    const home = this.disbandUnit(u);
    tell(u.power, `Your ${unitLabel(u)} mutinied, ${why}, and disbanded${savings > 0 ? `, its men taking their savings, ${formatMoney(savings)}` : ""}${home !== "" ? `: ${home}` : ""}.`);
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
  loseUnit(S, u);
  this.liftSiegesOf(u.id);
  // The men carry their savings with them: home when they arrive, or where they settle (the owner, 28 October 2026).
  return this.menHome(u, settle);
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
  // A court's lines of markets near it in one notice; of one farther off, by the road from there (bug #517).
  const tell = (p: Power, at: string, line: string): void => {
    const d = this.wordFrom(p, at);
    if (d > 0 && Number.isFinite(d)) {
      this.tell(p, at, "Resolution", MarketsTitle, line);
      return;
    }
    let l = lines.tryGet(p);
    if (!l) lines.set(p, (l = []));
    l.push(line);
  };
  // Sales and purchases at the markets near a court, one sentence for each; a farther market's by the road, alone.
  const deals = new Dict<Power, { Sold: string[]; Bought: string[] }>();
  const deal = (p: Power, at: string, verb: "Sold" | "Bought", item: string): void => {
    const d = this.wordTo(p, at);
    if (d > 0 && Number.isFinite(d)) {
      tell(p, at, `${verb} grain: ${item}.`);
      return;
    }
    let e = deals.tryGet(p);
    if (!e) deals.set(p, (e = { Sold: [], Bought: [] }));
    e[verb].push(item);
  };
  const held = (p: Power, prov: string, what: string, o: Order): boolean => {
    if (S.owner.getOrDefault(prov, null) === p && siegeOf(S, prov) === null) return true;
    // Land lost out of the king's sight: word of it comes home by the road (bug #467).
    if (S.owner.getOrDefault(prov, null) !== p) {
      this.lostOrder(p, o, prov, "Order failed", `${what} in ${Map.get(prov).name} did not happen: you no longer hold it.`, "the province was lost");
      return false;
    }
    // A siege: near, told among the markets' lines as ever; one it may not have heard of, by the road (bug #517).
    const line = `${what} in ${Map.get(prov).name} did not happen: it is besieged.`;
    const d = this.wordFrom(p, prov);
    if (d > 0 && Number.isFinite(d)) this.lostOrder(p, o, prov, "Order failed", line, "it is besieged");
    else {
      tell(p, prov, line);
      this.wakeFrom(p, o, prov, "it is besieged");
    }
    return false;
  };
  for (const p of AllPowers) S.treasuries.get(p).income = 0;
  // Feeding the towns.
  for (const [p, o] of orders.filter(([, o]) => o.type === "feed") as [Power, FeedOrder][]) {
    if (!held(p, o.province, "Grain for the town", o)) continue;
    const given = this.takeFromStores(o.province, o.amount);
    this.market(o.province).stock += given;
    tell(p, o.province, `You handed ${measures(given)} of grain from the stores of ${Map.get(o.province).name} to its town.`);
    if (given > 0) logEvent(S, "feed", `${p} handed grain to the town of ${Map.get(o.province).name}.`, this.nearOf(o.province, p), "feed");
    // Item 17++: grain handed out is a giving its people remember, most in a famine, of the hand they see: the governor
    // there, unless it comes in the king's own name.
    const hungry = S.fed.getOrDefault(o.province, 1000) < 1000;
    const points = Math.min(UnrestData.grain, idiv(UnrestData.grain * given, Math.max(1, needOf(Map.get(o.province)))));
    this.give(o.province, o.own === true ? p : this.handOf(o.province, p), hungry ? points : idiv(points, 4));
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
        // #587: from beyond the season's reach the gold goes into the province's coffer, the rest home as a load.
        this.receiveAt(p, prov, r.paid);
        if (r.taken > 0) deal(p, prov, "Sold", `${measures(r.taken)} at ${name} for ${r.paid > 0 ? formatMoney(r.paid) : "next to nothing"}` + (r.taken < net ? ` (its people's purse ran dry, ${net - r.taken} unsold)` : ""));
        else tell(p, prov, `Nobody at ${name} could buy your grain: its people's purse is empty.`);
        if (r.taken > 0) logEvent(S, "sale", `${p} sold grain at ${name}.`, this.nearOf(prov, p), "sale");
        if (r.taken < net) for (const o of list.filter((o) => o.type === "sell")) this.wakeFrom(p, o, prov, "the people's purse ran dry");
      } else if (net < 0) {
        // #587: paid with the gold that is there: the treasury's near, the province's coffer far.
        // What it can pay with; left with less than a measure's dearest price (4 shekels), it was the gold that ran out.
        const purse = this.goldAt(p, prov);
        const r = buyAlongCurve(m.stock, normal, purse, -net);
        m.stock -= r.taken;
        m.purse += r.paid;
        this.takeAt(p, prov, r.paid);
        const over = this.putInStores(prov, r.taken);
        if (r.taken > 0) deal(p, prov, "Bought", `${measures(r.taken)} at ${name} for ${r.paid > 0 ? formatMoney(r.paid) : "next to nothing"}` + (r.taken < -net ? (m.stock > 0 && purse - r.paid < 5 ? ` (${-net - r.taken} short: ${this.isFar(p, prov) ? "the gold in its coffer" : "your treasury"} ran out)` : ` (${-net - r.taken} short)`) : "") + (over > 0 ? `, ${over} of it lost for want of room in the stores` : ""));
        else tell(p, prov, `No grain could be bought at ${name}.`);
        if (r.taken > 0) logEvent(S, "purchase-grain", `${p} bought grain at ${name}.`, this.nearOf(prov, p), "grain-bought");
      } else if (offered > 0) tell(p, prov, `At ${name} your sales and purchases cancelled out: no grain changed hands.`);
    }
  }
  // Caravans set out.
  for (const [p, o] of orders.filter(([, o]) => o.type === "caravan") as [Power, CaravanOrder][]) {
    if (!held(p, o.from, "A caravan", o)) continue;
    const route = this.caravanRoute(p, o.from, o.to);
    if (route === null) {
      tell(p, o.from, `No caravan left ${Map.get(o.from).name} for ${Map.get(o.to).name}: there is no road there by land or river.`);
      this.wakeFrom(p, o, o.from, "no road there by land or river");
      continue;
    }
    const grain = this.takeFromStores(o.from, o.amount);
    if (grain <= 0) {
      tell(p, o.from, `No caravan left ${Map.get(o.from).name}: its stores were empty.`);
      this.wakeFrom(p, o, o.from, "the stores were empty");
      continue;
    }
    // #587: its porters' pay for the road goes with it, from the gold that is there.
    const c = newCaravan({ id: newId(S, "v"), power: p, from: o.from, to: o.to, grain, route, since: S.turn });
    c.pay = this.payLoad(c);
    if (!this.takeAt(p, o.from, c.pay)) {
      this.putInStores(o.from, grain);
      tell(p, o.from, `No caravan left ${Map.get(o.from).name}: there was too little gold ${this.isFar(p, o.from) ? "in its coffer" : "in the treasury"} for its porters' pay on the road (${formatMoney(c.pay)}).`);
      this.wakeFrom(p, o, o.from, "too little gold for its porters' pay");
      logEvent(S, "unfunded", `${p}'s caravan from ${Map.get(o.from).name} had too little gold there for its porters.`, this.nearOf(o.from, p), "unfunded");
      continue;
    }
    setOut(S, c);
    tell(p, o.from, `A caravan of ${measures(grain)} of grain set out from ${Map.get(o.from).name} for ${Map.get(o.to).name}, by ${listed(route.slice(1, -1).map((x) => Map.get(x).name)) || "the direct road"}.`);
    logEvent(S, "caravan-out", `${p} sent a caravan from ${Map.get(o.from).name}.`, this.nearOf(o.from, p), "caravan-out");
  }
  // Trading caravans and ships (item 9+b).
  this.sendTraders(orders, tell);
  for (const [p, e] of deals.entries()) {
    const said = (["Sold", "Bought"] as const).filter((v) => e[v].length > 0).map((v) => `${v} grain: ${e[v].join("; ")}.`);
    lines.set(p, [...said, ...(lines.tryGet(p) ?? [])]);
  }
  for (const [p, l] of lines.entries()) notify(S, p, "Resolution", MarketsTitle, l.join(" "));
};

// ---------------------------------------------------------------- wealth

/**
 * The land's worth a season, by what it produces at reference prices: the whole harvest its people bring in now (item
 * 10+a: a ravaged or emptied province is worth less at once) and the mines, as far as it obeys its holder.
 */
P.landWorth = function (p) {
  return sum(ownedBy(this.s, p), (id) => provinceWorth(this, id));
};

/**
 * All the gold and goods of a realm but its treasury, at reference prices: its provinces' purses, stores and markets, and
 * what its own men carry, their units' baggage and savings and its caravans' grain.
 */
P.holdings = function (p) {
  const S = this.s;
  let w = sum(ownedBy(S, p), (id) => provinceHolding(this, id));
  for (const u of S.units) if (u.power === p) w += carriedWorth(u.food, u.savings);
  // Discharged men walking home carry their savings to a province of this realm (item 10+a).
  for (const x of S.walking) if (S.owner.getOrDefault(x.home, null) === p) w += x.savings;
  // #587, #740: and the gold on the road with its couriers, to a far coffer or back, or loot coming home.
  w += goldSent(this, p);
  for (const c of S.caravans) if (c.power === p) w += carriedWorth(c.grain, c.gold + c.pay) + (c.ship !== null ? carriedWorth(c.ship.food, c.ship.savings) : 0);
  return w;
};
