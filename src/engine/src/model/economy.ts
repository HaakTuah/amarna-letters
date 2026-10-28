/**
 * The economy at home (build order item 9+a, "Economy and resources"): what each province grows and mines, how much its
 * stores hold, and its market's prices and purse. Static data and pure arithmetic, so the engine, the views and the script
 * kings reckon with the same figures.
 *
 * Grain is counted in measures (one measure, a kor, fetches a shekel at its base price); prices are kept in hundredths of
 * a shekel so that the one formula of "Prices" stays in integer arithmetic. Every number below is a first guess, from the
 * dossiers where they speak (`docs/history/04-people-and-settlement.md` for the towns, `05-economy.md` for the mines and
 * the grain), tuned in item 18.
 */
import { clamp, idiv } from "../core/num.ts";
import type { Province } from "./map.ts";

/** How sure and how large a land's surplus is ("Grain is everywhere, the surplus is not"; the dossier's grain table). */
export type Surplus = "High" | "Fair" | "Low" | "Thin";

/**
 * One land province's economy: its town's people in thousands (the market's local need, its storage and its purse), whether
 * it is a trading city (richer purse), its surplus, and the precious metal its mines yield a season (shekels).
 */
export interface ProvinceEconomy {
  readonly town: number;
  readonly trading: boolean;
  readonly surplus: Surplus;
  readonly mine: number;
}

const e = (town: number, surplus: Surplus, mine = 0, trading = false): ProvinceEconomy => ({ town, trading, surplus, mine });

/**
 * By province. Towns from the dossier's table where it gives one (the middle of its range, at 150 a hectare), otherwise a
 * guess from the province's place and size [G]. Mines: the map's new precious metal about 120 shekels a season, enough
 * to make good what leaves the markets for characters' wages and bought cities, shared as the dossier's table shares it
 * (Egypt's sources about 84%, Hatti's silver 13%, the rest 3%) [G].
 */
export const ProvinceEconomies: ReadonlyMap<string, ProvinceEconomy> = new Map([
  ["seha", e(4, "Fair")],
  ["apasa", e(8, "Fair", 0, true)],
  ["mira", e(4, "Fair", 2)],
  ["tuwanuwa", e(4, "Low", 6)],
  ["hattusa", e(11, "Low")],
  ["sapinuwa", e(5, "Low")],
  ["nesa", e(6, "Low")],
  ["kizzuwatna", e(6, "Fair", 5)],
  ["harran", e(5, "Fair")],
  ["washukanni", e(8, "Fair")],
  ["taidu", e(5, "Fair")],
  ["terqa", e(4, "Fair")],
  ["nineveh", e(6, "Fair")],
  ["arbela", e(5, "Fair")],
  ["ashur", e(9, "Fair", 0, true)],
  ["ekallate", e(4, "Fair")],
  ["sippar", e(10, "High")],
  ["durkurigalzu", e(20, "High")],
  ["babylon", e(40, "High", 0, true)],
  ["nippur", e(14, "High")],
  ["ur", e(14, "High", 0, true)],
  ["dilmun", e(3, "Thin", 0, true)],
  ["delta", e(20, "High")],
  ["sinai", e(1, "Thin")],
  ["memphis", e(30, "High")],
  ["akhetaten", e(35, "High")],
  ["thebes", e(30, "High", 30)],
  ["nubia", e(4, "Fair", 70)],
  ["kalavasos", e(2, "Fair")],
  ["enkomi", e(3, "Fair", 2, true)],
  ["isuwa", e(3, "Low", 4)],
  ["carchemish", e(6, "Fair", 0, true)],
  ["alalakh", e(4, "Fair")],
  ["aleppo", e(8, "Fair", 0, true)],
  ["ugarit", e(7, "Fair", 0, true)],
  ["nuhashshe", e(4, "Fair")],
  ["qatna", e(12, "Fair", 0, true)],
  ["qadesh", e(5, "Fair")],
  ["amurru", e(2, "Low")],
  ["sumur", e(2, "Low")],
  ["arwad", e(2, "Low", 0, true)],
  ["byblos", e(2, "Low", 0, true)],
  ["sidon", e(2, "Low", 0, true)],
  ["damascus", e(8, "Fair")],
  ["tyre", e(2, "Low", 0, true)],
  ["megiddo", e(2, "Fair")],
  ["shechem", e(2, "Fair")],
  ["jerusalem", e(2, "Fair")],
  ["gaza", e(3, "Fair", 0, true)],
  ["suhu", e(3, "Fair")],
  ["arrapha", e(6, "Fair")],
  ["susa", e(11, "Fair", 0, true)],
  ["lukka", e(1, "Thin")],
  ["kaska", e(1, "Thin")],
  ["steppe", e(1, "Thin")],
]);

/**
 * The first guesses of the economy at home (item 18 tunes them). Grain is in measures, prices in hundredths of a shekel.
 * - `harvestPerYield`: a province's whole harvest a season is its yield times this, by its surplus in percent (`surplusPercent`).
 * - `taxPercent`: the default tax in goods, so the king's share is about the yield; since item 10+a each king may set
 *   his own rate on each province of his (`tax`), and hunger answers a heavy one.
 * - `needPerThousand`: a town's local need a season, by its people, to which `ruralNeedPercent` of the province's harvest
 *   adds the craftsmen, servants and temple staff of the countryside who grow none of their own; the whole is the market's
 *   normal stock.
 * - `storeNeeds`, `storeDepot`: a province's basic storage, its local need this many times over plus a modest depot.
 * - `startStores`: the stores at the start, in percent of that capacity.
 * - `purseSeasons`: a market's purse at the start, its local need at the base price this many seasons over, twice that in
 *   a trading city.
 * - `spoilPercent`: what stores and markets lose a season to rot and vermin (granaries slow it in a later phase).
 * - `basePrice`: grain's base price (and its reference price in the score), `cutPercent` the merchants' cut each way.
 * - `armyFood`, `fleetFood`: what a unit eats a season; `carried`: how many seasons of food a unit carries at most.
 * - `spentPercent`: the share of their pay (GameConfig.armyUpkeep, fleetUpkeep) the men spend where they stand.
 * - `forageShare`: of the harvest the farmers keep, the part an army can take from the land a season (half in winter).
 * - `hungryMutiny`, `unpaidMutiny`: seasons of hunger, or of missing pay, after which a unit mutinies.
 * - `caravanEatPercent`: the share of its grain a caravan's porters and donkeys eat for each season's worth of road
 *   overland (`boatEatPercent` by boat on a river); `caravanPayPer`: a shekel of pay a season for this many measures;
 *   `caravanOutlawPercent`: the chance in a hundred a season that outlaws rob a caravan in its king's own land, rising
 *   with its size (twice that for a caravan of a hundred measures).
 * - `breachPerLevel`: seasons of wear for each level of walls before they are breached ("Walls price the storm, not the clock").
 */
export const EconomyData = {
  harvestPerYield: 3,
  surplusPercent: { High: 120, Fair: 100, Low: 80, Thin: 50 } as Readonly<Record<Surplus, number>>,
  taxPercent: 33,
  needPerThousand: 2,
  ruralNeedPercent: 15,
  storeNeeds: 3,
  storeDepot: 30,
  startStores: 50,
  purseSeasons: 20,
  spoilPercent: 5,
  basePrice: 100,
  cutPercent: 10,
  armyFood: 10,
  fleetFood: 10,
  carried: 2,
  spentPercent: 75,
  forageShare: 33,
  hungryMutiny: 2,
  unpaidMutiny: 3,
  caravanEatPercent: 20,
  boatEatPercent: 4,
  caravanPayPer: 10,
  caravanOutlawPercent: 1,
  breachPerLevel: 3,
} as const;

const NoEconomy: ProvinceEconomy = e(0, "Thin");

/** A province's economy data (a sea zone has none). */
export function economyOf(p: Province): ProvinceEconomy {
  return p.isSea ? NoEconomy : (ProvinceEconomies.get(p.id) ?? NoEconomy);
}

/** The whole harvest a season, before tax: the yield times `harvestPerYield`, by the land's surplus. */
export function harvestOf(p: Province): number {
  if (p.isSea) return 0;
  return idiv(p.yield * EconomyData.harvestPerYield * EconomyData.surplusPercent[economyOf(p).surplus], 100);
}

/** The king's share of a harvest at the default rate. */
export function taxOf(harvest: number): number {
  return idiv(harvest * EconomyData.taxPercent, 100);
}

/** A province's local need a season, its town's and its countryside's, which is also its market's normal stock (at least 2). */
export function needOf(p: Province): number {
  return p.isSea ? 0 : Math.max(2, economyOf(p).town * EconomyData.needPerThousand + idiv(harvestOf(p) * EconomyData.ruralNeedPercent, 100));
}

/** How much grain a province's stores hold at most: its basic capacity from its towns. */
export function capacityOf(p: Province): number {
  return p.isSea ? 0 : needOf(p) * EconomyData.storeNeeds + EconomyData.storeDepot;
}

/** The people's purse at the start. */
export function startPurseOf(p: Province): number {
  return p.isSea ? 0 : grainWorth(needOf(p)) * EconomyData.purseSeasons * (economyOf(p).trading ? 2 : 1);
}

/** The stores at the start. */
export function startStoresOf(p: Province): number {
  return idiv(capacityOf(p) * EconomyData.startStores, 100);
}

/** What a unit eats a season. */
export const foodOf = (kind: "Army" | "Fleet"): number => (kind === "Army" ? EconomyData.armyFood : EconomyData.fleetFood);

/** The most food a unit carries. */
export const carriedOf = (kind: "Army" | "Fleet"): number => foodOf(kind) * EconomyData.carried;

/**
 * The one formula of "Prices", in hundredths of a shekel for one measure: the base price times the normal stock over the
 * stock, kept between a quarter and four times the base; at a stock of none, the ceiling.
 */
export function priceAt(stock: number, normal: number): number {
  const base = EconomyData.basePrice;
  if (stock <= 0) return base * 4;
  return clamp(idiv(base * Math.max(1, normal), stock), idiv(base, 4), base * 4);
}

/** What a market pays for a measure it buys (under the price) and asks for one it sells (over it), in hundredths. */
export const bidAt = (stock: number, normal: number): number => idiv(priceAt(stock, normal) * (100 - EconomyData.cutPercent), 100);
export const askAt = (stock: number, normal: number): number => idiv(priceAt(stock, normal) * (100 + EconomyData.cutPercent), 100);

/**
 * A lot sold to a market, priced along the curve measure by measure ("Large lots are priced along the curve"): how many
 * measures it takes while its purse lasts, and what it pays for them in shekels.
 */
export function sellAlongCurve(stock: number, normal: number, purse: number, lot: number): { taken: number; paid: number } {
  let centi = 0;
  let taken = 0;
  while (taken < lot) {
    const next = bidAt(stock + taken, normal);
    if (idiv(centi + next, 100) > purse) break;
    centi += next;
    taken++;
  }
  return { taken, paid: idiv(centi, 100) };
}

/** A lot bought from a market, measure by measure: how many measures it gives while it holds stock and the gold lasts, and the cost. */
export function buyAlongCurve(stock: number, normal: number, gold: number, lot: number): { taken: number; paid: number } {
  let centi = 0;
  let taken = 0;
  while (taken < lot && stock - taken > 0) {
    const next = askAt(stock - taken, normal);
    if (Math.ceil((centi + next) / 100) > gold) break;
    centi += next;
    taken++;
  }
  return { taken, paid: Math.ceil(centi / 100) };
}

/** Grain at its reference price in shekels (the score's one value per good: "The wealth of a realm"). */
export const grainWorth = (measures: number): number => idiv(measures * EconomyData.basePrice, 100);

/** A price in hundredths as shekels for ten measures, the way a view shows it ("12 shekels for ten measures"). */
export const priceForTen = (centi: number): number => idiv(centi * 10 + 50, 100);

/**
 * What a province adds to its holder's strength: the worth of its land at the land's multiple, its people's purse, and the
 * grain in its stores and market at reference prices. Until item 11+ it was also a free city's price; no city is bought now.
 */
export function provinceWorthOf(p: Province, weight: number, purse: number, grain: number, harvest: number = harvestOf(p)): number {
  return weight * (grainWorth(harvest) + economyOf(p).mine) + purse + grainWorth(grain);
}

/**
 * What a province adds to its holder's strength as anyone can reckon it from public data (item 9+a): its land's worth, and
 * its purse, stores and market as they stood at the start. The script kings' estimate of a rival's wealth.
 */
export function publicWorthOf(p: Province, weight: number): number {
  return provinceWorthOf(p, weight, startPurseOf(p), startStoresOf(p) + needOf(p));
}

/** What a province's land adds to strength: the land's multiple times what it produces a season at reference prices. */
export function landWorthOf(p: Province, weight: number): number {
  return weight * (grainWorth(harvestOf(p)) + economyOf(p).mine);
}
