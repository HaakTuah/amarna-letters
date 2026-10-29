/**
 * People at home (build order item 10+a, "People of the land", "Land and climate", "Seasons"): each province's people in
 * three groups, settled (with its men of fighting age counted apart), under arms (the men of its units, counted on each
 * unit) and loose, and the arithmetic that turns them into a harvest, a hunger, births and a resistance. Static data and
 * pure integer arithmetic, so the engine, the views and the script kings reckon with the same figures.
 *
 * The starting people come from the people dossier (`docs/history/04-people-and-settlement.md`): each region's middle
 * estimate, shared among its provinces by their harvests (arid land a tenth as thickly), with the loose men where the
 * dossier finds herders and Habiru outside the towns' control. Every number is a first guess, tuned in item 18.
 */
import { idiv } from "../core/num.ts";
import { carriedOf, foodOf, harvestOf } from "./economy.ts";
import { climateOf, terrainOf } from "./geography.ts";
import { seasonOfTurn, StartUnits, type Province, type UnitKind, type WorldMap } from "./map.ts";
import type { GameState } from "./state.ts";

/** A province's people at home: the settled on the land, its men of fighting age among them, and the loose. */
export interface People {
  settled: number;
  men: number;
  loose: number;
}

/**
 * The first guesses of people at home (item 18 tunes them).
 * - `menPercent`: the men of fighting age among the settled.
 * - `armyMen`, `fleetMen`: the men a full levy takes for an army and a fleet's crews ("A Great King's army is of thousands");
 *   `levyLeast` (item 11a+): the fewest men a levy raises, where the province has fewer than a full levy's.
 * - `busyWeight`, `slackWeight`: how much more than another settled person a man of fighting age counts in the harvest,
 *   in halves, in a province's sowing and harvest seasons and in its slack season ("Settled": most at sowing and harvest).
 * - `aboveHalf`: beyond the land's reckoned labour, extra hands add this many halves less (one in four of their share).
 * - `foodPercent`: what the countryside eats a season, in percent of its harvest at the start.
 * - `taxMost`: the highest rate a king may set: all of it ("no rule caps the rate": hunger answers it).
 * - `hungerLeave`: of the share of their food the settled went without, the share of them that leave the land that
 *   season, in percent ("hunger answers in the season it bites"); `hungerDead` of those die, the rest turn loose.
 * - `birthPercent`: a season's growth of the settled while the land has room, in proportion to the room left.
 * - `comingOfAge`: seasons over which boys coming of age close the gap in the men of fighting age (about a generation).
 * - `movePercent`: the settled moving between neighbouring provinces of a kingdom a season, at most, towards more room.
 * - `switchPercent`: men moving between the land and the roads a season, at most, by what each pays them.
 * - `robPermille`: what the roads pay: the loose men's take of their province's wealth a season, in thousandths, shared
 *   among them ("Bandits rob the purse", whose robbing itself is item 10+b's).
 * - `driftPercent`: the loose drifting a season to a richer neighbour, at most.
 * - `battleDead`: of a destroyed unit's men, the share killed; the rest run, and turn loose where it fell.
 * - `stormDead`: of a city's settled, the share killed when it is stormed or starved into surrender.
 * - `plagueDead`, `quakeDead`: of the settled, the share a plague kills across the realm and an earthquake in its province.
 * - `strayAfter`, `strayPerDays`, `strayMost`: of men discharged far from home, one in a hundred more for every
 *   `strayPerDays` days of road beyond `strayAfter`, at most `strayMost`, never arrive and turn loose where they stood.
 * - `porterPer`: a caravan's porters and drivers, men for each measure it sets out with; `builders`: the men levied
 *   for a season to strengthen walls (the corvée).
 * - `resistOne`, `resistTwo`: the men of fighting age, as hostile as they are and doubled on rough ground, halved on open
 *   plain, that give a land's people a resistance of one and of two ("The people defend their land").
 * - `hostileHome`: the people's hostility, in percent, to a king whose homeland the province is.
 * - `winterFood`: the extra food an army outside its own land eats in Peret, by the winter there ("Winter in the field").
 * - Item 10+b ("Where people go", "Bandits rob the purse", "People are worth having, not free to keep"):
 *   `runPercent`: of the share of their food the farmers could not keep from their harvest (crushing taxes or hunger
 *   short of famine), the share of them that run away a season; `refugeMargin`: in percent, how much better a neighbour's
 *   land must be for those leaving to cross to it rather than stay loose at home; `deportDead`: of people deported or
 *   returned, the share who die on the road (more turn loose on long roads, as discharged men do); `expelPercent`: the
 *   share of a besieged city's mouths put out when an order names none (item 11a+: the king chooses it, of the mouths
 *   still inside, up to `expelMost` of the town in all, so the fighting men and the hands that feed them stay);
 * - Item 11a+ ("Period first": the harvest in each land's own season): `reserveSeasons`, the seasons of their own need the
 *   farmers keep in their granaries beyond a whole harvest; more they eat better with, feed to their animals or lose; `policedPercent`: what the loose take where their
 *   holder's troops stand, in percent of what they take elsewhere; `lootSpentPercent`: what the loose spend a season of
 *   the gold they carry, at their province's market.
 */
export const LandData = {
  menPercent: 20,
  armyMen: 5000,
  fleetMen: 2000,
  levyLeast: 100,
  busyWeight: 6,
  slackWeight: 3,
  aboveHalf: 3,
  foodPercent: 60,
  taxMost: 100,
  hungerLeave: 10,
  hungerDead: 33,
  birthPercent: 8,
  comingOfAge: 30,
  movePercent: 5,
  switchPercent: 5,
  robPermille: 5,
  driftPercent: 10,
  battleDead: 50,
  stormDead: 5,
  plagueDead: 5,
  quakeDead: 2,
  strayAfter: 15,
  strayPerDays: 3,
  strayMost: 50,
  porterPer: 5,
  builders: 3000,
  resistOne: 5000,
  resistTwo: 30000,
  hostileHome: 50,
  winterFood: { Mild: 0, Cool: 50, Hard: 100 } as const,
  runPercent: 2,
  refugeMargin: 10,
  deportDead: 5,
  expelPercent: 50,
  expelMost: 90,
  reserveSeasons: 1,
  policedPercent: 50,
  lootSpentPercent: 50,
} as const;

/**
 * The people dossier's regions, each its middle estimate in thousands and its provinces; and the share of each province's
 * people that is loose at the start, in percent: the Levant's Habiru and herders (10), the lands without a king (30),
 * everywhere else 2.
 */
const Regions: readonly [number, readonly string[]][] = [
  [3000, ["delta", "memphis", "akhetaten", "thebes", "sinai"]],
  [100, ["nubia"]],
  [800, ["sippar", "durkurigalzu", "babylon", "nippur", "ur"]],
  [20, ["dilmun"]],
  [900, ["hattusa", "sapinuwa", "nesa", "tuwanuwa", "kizzuwatna"]],
  [500, ["washukanni", "taidu", "harran", "terqa", "arrapha"]],
  [250, ["ashur", "nineveh", "arbela", "ekallate"]],
  [300, ["apasa", "seha", "mira"]],
  [80, ["enkomi", "kalavasos"]],
  [70, ["megiddo", "gaza", "jerusalem", "shechem", "akko", "hazor", "gezer", "ashkelon", "lachish", "hebron"]],
  [80, ["tyre", "sidon", "byblos", "amurru", "sumur", "arwad"]],
  [35, ["ugarit"]],
  [300, ["damascus", "qadesh", "qatna", "nuhashshe", "aleppo", "alalakh", "carchemish"]],
  [150, ["susa"]],
  [40, ["suhu"]],
  [40, ["isuwa"]],
  [20, ["lukka"]],
  [30, ["kaska"]],
  [20, ["steppe"]],
];

const Habiru = ["megiddo", "gaza", "jerusalem", "shechem", "akko", "hazor", "gezer", "ashkelon", "lachish", "hebron", "tyre", "sidon", "byblos", "amurru", "sumur", "arwad", "damascus", "qadesh", "qatna", "nuhashshe"];

const startCache = new WeakMap<WorldMap, Map<string, People>>();

/** Every land province's people at the start, before the starting armies are levied from them. */
export function startPeople(map: WorldMap): ReadonlyMap<string, People> {
  let m = startCache.get(map);
  if (m !== undefined) return m;
  m = new Map();
  for (const [thousands, ids] of Regions) {
    const live = ids.filter((id) => map.exists(id));
    const weight = (id: string): number => harvestOf(map.get(id)) * (climateOf(id).water === "Arid" ? 1 : 10);
    const total = live.reduce((a, id) => a + weight(id), 0);
    for (const id of live) {
      const all = total <= 0 ? 0 : idiv(thousands * 1000 * weight(id), total);
      const p = map.get(id);
      const loosePercent = p.kingless ? 30 : Habiru.includes(id) ? 10 : 2;
      const loose = idiv(all * loosePercent, 100);
      const settled = all - loose;
      m.set(id, { settled, men: idiv(settled * LandData.menPercent, 100), loose });
    }
  }
  for (const p of map.landProvinces) if (!m.has(p.id)) m.set(p.id, { settled: 0, men: 0, loose: 0 });
  startCache.set(map, m);
  return m;
}

/**
 * What a province's land is reckoned to carry, and the labour its harvest is calibrated to: its people at the start once
 * the starting armies are levied from them, so each province starts at today's yield ("Calibrated to today's yields").
 * Births grow the settled back towards the people before those levies (`room`).
 */
export function reckonedOf(map: WorldMap, province: string): { settled: number; men: number; room: number } {
  const start = startPeople(map).get(province) ?? { settled: 0, men: 0, loose: 0 };
  const levied = StartUnits.filter((u) => u.province === province).reduce((a, u) => a + (u.men ?? menOf(u.kind)), 0);
  const away = Math.min(levied, start.men);
  return { settled: start.settled - away, men: start.men - away, room: start.settled };
}

/** The men a unit of this kind takes from its home. */
export const menOf = (kind: UnitKind): number => (kind === "Army" ? LandData.armyMen : LandData.fleetMen);

/**
 * Winter in the crossing (turn/winter.ts), item 11a+, first guesses (item 18 tunes them): `suppliedPercent`, what a troop carrying a season's food loses of what an
 * unsupplied one would; `desertPercent`, of the men a pass takes, those who desert and stay loose where they set out.
 */
export const WinterData = { suppliedPercent: 50, desertPercent: 50 } as const;

/**
 * Item 11a+ (Haakon's answer to item 10+a's review): a levy is sized by the men a province has: a full levy of its kind
 * where it has the men, else every man of fighting age at home and not away, so a small city raises its few hundred; none
 * below `levyLeast`. 0: too few to raise anything.
 */
export function levySize(s: GameState, province: string, kind: UnitKind, men: number | null = null): number {
  // Haakon's answers to item 11a+: the king chooses how many men a levy takes, up to all; none named, a full unit's.
  const n = Math.min(men ?? menOf(kind), menAvailable(s, province));
  return n >= LandData.levyLeast ? n : 0;
}

/** A unit's share of a full levy of its kind, in thousandths: what its pay, food and price are of a full unit's (item 11a+). */
export function shareOfFull(kind: UnitKind, men: number): number {
  // A levy larger than a full unit (Haakon's answers to item 11a+) costs and eats in proportion too.
  return men <= 0 ? 1000 : Math.max(1, Math.floor((men * 1000) / menOf(kind)));
}

/** A unit's food a season and the most it carries, in proportion to its men (item 11a+). */
export const unitFood = (u: { kind: UnitKind; men: number }): number => forMen(foodOf(u.kind), u.kind, u.men);
export const unitCarried = (u: { kind: UnitKind; men: number }): number => forMen(carriedOf(u.kind), u.kind, u.men);

/** A cost or a quantity of a full unit, for a unit of `men` (rounded up, so a few men still cost something). */
export function forMen(full: number, kind: UnitKind, men: number): number {
  return Math.ceil((full * shareOfFull(kind, men)) / 1000);
}

/** How much more than another settled person a man of fighting age counts in this season's harvest, in halves. */
export function menWeight(province: string, season: number): number {
  return climateOf(province).busy.includes(season) ? LandData.busyWeight : LandData.slackWeight;
}

/** A province's labour this season, in halves: every settled person twice, and its men of fighting age by the season. */
export function labourOf(province: string, settled: number, men: number, season: number): number {
  return Math.max(0, settled) * 2 + Math.max(0, men) * menWeight(province, season);
}

/**
 * The harvest this labour brings in, in thousandths of the harvest at the reckoned labour (`full`): fewer hands each
 * reap a little more of the same land (the square root of their share, so half the people reap seven in ten, and a levy
 * of a twentieth costs about a fortieth), and hands beyond it add a quarter of their share.
 */
export function harvestPermille(labour: number, full: number): number {
  if (full <= 0) return 0;
  const r = idiv(labour * 1000, full);
  if (r <= 1000) return Math.floor(Math.sqrt(Math.max(0, r) * 1000));
  return 1000 + idiv((r - 1000) * (4 - LandData.aboveHalf), 4);
}

/** What the countryside of a province eats a season, for this many settled, against the reckoned settled (`full`). */
export function countryNeed(p: Province, settled: number, full: number): number {
  if (full <= 0) return 0;
  // At least a measure, so a nearly emptied province still has room to fill and food to judge by.
  return Math.max(1, idiv(idiv(harvestOf(p) * LandData.foodPercent, 100) * Math.max(0, settled), full));
}

/**
 * How hard a land's people resist an army that enters it, 0, 1 or 2 ("The people defend their land"): its men of
 * fighting age, as hostile as they are to the invader, counted twice on rough ground and half on open plain.
 */
export function resistanceOf(province: string, men: number, hostility: number): number {
  const t = terrainOf(province);
  let eff = idiv(Math.max(0, men) * hostility, 100);
  if (t === "Rough") eff *= 2;
  else if (t === "Open") eff = idiv(eff, 2);
  return eff >= LandData.resistTwo ? 2 : eff >= LandData.resistOne ? 1 : 0;
}

/** The share of its harvest a province keeps this season through the droughts and floods striking it, in percent. */
export function climatePercentIn(s: GameState, province: string): number {
  let pct = 100;
  for (const c of s.climate) if (c.startTurn <= s.turn && c.endTurn >= s.turn && c.provinces.includes(province)) pct = idiv(pct * c.percent, 100);
  return pct;
}

/**
 * A province's whole harvest this season, before tax, absorption and catastrophes: its harvest at the start, by the
 * hands on its land now against the labour it was reckoned at, the men of fighting age counting more at sowing and
 * harvest; its caravans' porters and the corvée are away from it. Droughts and floods cut it unless `weather` is false:
 * the land's worth in the score counts its people over the whole year, not a passing season's weather or work.
 */
export function harvestIn(map: WorldMap, s: GameState, province: string, weather = true): number {
  const p = map.get(province);
  if (p.isSea) return 0;
  const season = seasonOfTurn(s.turn);
  const x = s.people.tryGet(province) ?? { settled: 0, men: 0, loose: 0 };
  const r = reckonedOf(map, province);
  // Porters and builders are away from this season's fields, not from the land's worth.
  const away = weather ? awayFrom(s, province) : 0;
  // The weather left out, so is the season: the land's worth counts its labour over the whole year.
  const seasons = weather ? [season] : [0, 1, 2];
  const labour = seasons.reduce((a, k) => a + labourOf(province, x.settled - away, x.men - away, k), 0);
  const full = seasons.reduce((a, k) => a + labourOf(province, r.settled, r.men, k), 0);
  const h = idiv(harvestOf(p) * harvestPermille(labour, full), 1000);
  return weather ? idiv(h * climatePercentIn(s, province), 100) : h;
}

/** The men of fighting age away from a province's fields this season: its caravans' porters and the corvée. */
export function awayFrom(s: GameState, province: string): number {
  const x = s.people.tryGet(province);
  if (x === undefined) return 0;
  const porters = s.caravans.filter((c) => c.from === province && c.ship === null).reduce((a, c) => a + c.grain * LandData.porterPer, 0);
  return Math.min(x.men, porters + s.corvee.getOrDefault(province, 0));
}

/** The men of fighting age a levy can take from a province now: those at home, less those away carrying and building. */
export function menAvailable(s: GameState, province: string): number {
  return Math.max(0, (s.people.tryGet(province)?.men ?? 0) - awayFrom(s, province));
}
