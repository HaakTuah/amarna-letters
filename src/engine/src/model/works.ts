/**
 * Everything built (build order item 15, "One rule for everything built", "Paid in gold or in labour"): walls, roads,
 * relay stations, harbours, policing and water works are each a level in a province, with upkeep each season, decay when
 * it goes unpaid, and projects that raise it over the seasons that follow. The kinds differ only in this data. Static
 * data and pure arithmetic, so the engine, the views and the script kings reckon with the same figures; the season's work
 * is in `turn/works.ts`. Every number is a first guess, tuned in item 18.
 *
 * The starting levels come from the dossiers ("Starting positions come from the sources"):
 * `docs/history/12-walls-roads-harbours.md` for walls, roads, relay stations and harbours, and
 * `docs/history/15-pirates-bandits-tolls.md` for policing.
 */
import { B, I, type ObjSchema, S, obj } from "../core/json.ts";
import { idiv } from "../core/num.ts";
import { type CityWater, CityWaters, Climates } from "./geography.ts";
import type { Province } from "./map.ts";
import type { GameState } from "./state.ts";
import { grantStands } from "./authority.ts";
import type { Power } from "./power.ts";
import { LandData } from "./land.ts";
import { newWorkView, type WorkView } from "./views.ts";

/** The kinds of building this item brings into the rule; fields, mines and storage come with the economy's later phases. */
export const WorkKindValues = ["Walls", "Roads", "Stations", "Harbour", "Policing", "Water"] as const;
export type WorkKind = (typeof WorkKindValues)[number];

/** A kind as kings name it. */
export function workName(kind: WorkKind): string {
  return kind === "Stations" ? "relay stations" : kind === "Water" ? "water works" : kind.toLowerCase();
}

/** A level as kings read it: policing in men, everything else by its level. */
export function workLevelText(kind: WorkKind, level: number): string {
  return kind === "Policing" ? `${level * PoliceMenPerLevel} men` : `level ${level}`;
}

/**
 * A kind's data ("The kinds differ only in data"):
 * - `most`: the highest level.
 * - `upkeep`: gold a level costs a season; `upkeepMen`: the men a level takes from the province's fields a season when it
 *   is kept by corvée instead.
 * - `cost`: the gold a season of building costs, times the level being built; `builders`: the men a season of building
 *   takes by corvée instead; `seasons`: the seasons of work a level takes (0: done at the end of the season ordered).
 * - `decay`: the seasons unpaid after which a level falls; 0: what is unpaid is gone at once (policing: paid people).
 *
 * Walls keep item 5's price (50, 100 and 150 shekels a level, now over two seasons), roads and relay stations fall over
 * years, harbours slowly, policing at once, walls and water works over a decade.
 */
export interface WorkData {
  readonly most: number;
  readonly upkeep: number;
  readonly upkeepMen: number;
  readonly cost: number;
  readonly builders: number;
  readonly seasons: number;
  readonly decay: number;
}

export const WorksData: Readonly<Record<WorkKind, WorkData>> = {
  Walls: { most: 3, upkeep: 1, upkeepMen: 100, cost: 25, builders: 1500, seasons: 2, decay: 30 },
  Roads: { most: 3, upkeep: 1, upkeepMen: 100, cost: 15, builders: 1000, seasons: 2, decay: 6 },
  Stations: { most: 2, upkeep: 1, upkeepMen: 50, cost: 20, builders: 300, seasons: 1, decay: 6 },
  Harbour: { most: 3, upkeep: 1, upkeepMen: 100, cost: 25, builders: 1500, seasons: 2, decay: 6 },
  // A level of policing is ten men (the dossier counts police in tens: twenty on a main road, fifty in bandit country);
  // their pay is a shekel a season for every five levels, rounded up ({@link upkeepGold}).
  Policing: { most: 50, upkeep: 1, upkeepMen: 10, cost: 0, builders: 0, seasons: 0, decay: 0 },
  Water: { most: 2, upkeep: 1, upkeepMen: 50, cost: 20, builders: 800, seasons: 2, decay: 30 },
};

/** Men of police a level of policing is. */
export const PoliceMenPerLevel = 10;
/** Levels of policing a shekel of pay keeps a season. */
export const PolicePerShekel = 5;

/**
 * What the levels do (first guesses, tuned in item 18):
 * - `roadPercent`: the time on the land half of a connection in a province, in percent, by its road's level: 0 a track
 *   nobody keeps, 1 a kept track (the journey times the geography dossier attests), 2 with bridges, wells and posts, 3 a
 *   royal road. Off the road (sneaking) and on the water roads count for nothing.
 * - `stationPercent`: a lone traveller's time where relay stations give him fresh animals and stores, by their level, on
 *   top of the road: couriers, envoys and spies, never a company with a size, a caravan or troops.
 * - `policeMost`, `policeHalf`: police hold the loose men's take, the bands' odds on the road and a crowd's chance of
 *   raising a chief down to 100 − `policeMost` × men / (men + `policeHalf`) percent of what it would be.
 * - `policeFound`: every so many police add a point to the odds of finding a smuggler or a traveller sneaking through.
 * - `harbourRoom`: the crews' men a harbour of each level shelters in winter, in its waters (a beach a few ships, a lesser
 *   port a few dozen, a great one a hundred: the walls dossier, "What a harbour held"); a fleet's men beyond the room its
 *   king's harbours there give it spend the winter on open beaches, and the storms take `exposedPercent` in a hundred of
 *   them.
 * - `waterSeasons`: the seasons of drinking a level of water works adds to a city whose water can fail (a cistern dug, a
 *   well sunk), and from level 1 a city whose spring lies outside its walls has a guarded way down to it, which the
 *   besieger cannot cut ("Water too"); in arid ground a level costs `aridCost` times as much.
 */
export const WorksEffect = {
  roadPercent: [120, 100, 90, 80],
  stationPercent: [100, 85, 75],
  policeMost: 60,
  policeHalf: 300,
  policeFound: 25,
  harbourRoom: [0, 300, 800, 2400],
  exposedPercent: 10,
  waterSeasons: 2,
  aridCost: 2,
} as const;

/**
 * What a repair of walls under siege takes a season, from inside the walls (first guesses, item 18): `men` of the city's
 * men of fighting age, away from its defence and its fields, and `food` measures from its stores to feed them, for one step
 * of the siege's wear made good; gold buys only what is there, so nothing comes from the treasury.
 */
export const RepairData = { men: 500, food: 20 } as const;

/** The upkeep in gold of a kind's levels a season. */
export function upkeepGold(kind: WorkKind, levels: number): number {
  if (levels <= 0) return 0;
  return kind === "Policing" ? idiv(levels + PolicePerShekel - 1, PolicePerShekel) : levels * WorksData[kind].upkeep;
}

/** The men a kind's levels take from the fields a season, kept by corvée. */
export function upkeepMen(kind: WorkKind, levels: number): number {
  return Math.max(0, levels) * WorksData[kind].upkeepMen;
}

/** The gold a season of building the next level (`level`) costs in a province. */
export function buildGold(kind: WorkKind, province: string, level: number): number {
  if (kind === "Policing") return upkeepGold(kind, level);
  const base = WorksData[kind].cost * Math.max(1, level);
  return kind === "Water" && Climates.get(province)?.water === "Arid" ? base * WorksEffect.aridCost : base;
}

/** The men a season of building takes by corvée (for policing, the men hired: the level's police). */
export function buildMen(kind: WorkKind, province: string, level: number): number {
  if (kind === "Policing") return Math.max(0, level) * PoliceMenPerLevel;
  const base = WorksData[kind].builders;
  return kind === "Water" && Climates.get(province)?.water === "Arid" ? base * WorksEffect.aridCost : base;
}

/**
 * Why a kind cannot be built in a province at all, by the land ("The land sets limits"), or null: walls and policing only
 * where people live under a lord (not at sea), harbours on a coast, water works where a city's water can fail.
 */
export function landRefusal(kind: WorkKind, p: Province): string | null {
  if (p.isSea) return `${p.name} is sea`;
  switch (kind) {
    case "Harbour":
      return p.isCoastal && p.waters !== null ? null : `${p.name} has no coast to build a harbour on`;
    case "Water": {
      const w = cityWater(p.id);
      return w === "River" || w === "Spring" || w === "Wells" ? `${p.name} drinks from water that never fails` : w === "Island" ? `${p.name} is an island whose water comes by boat` : null;
    }
    case "Walls":
      return p.kingless ? `${p.name} has no town to wall` : null;
    default:
      return null;
  }
}

/** Where a province's city drinks, as the water dossier gives it (item 10+b), or by its land where it is silent. */
export function cityWater(province: string): CityWater {
  const w = Climates.get(province)?.water;
  return CityWaters.get(province) ?? (w === "Arid" ? "Arid" : w === "River" ? "River" : "Cisterns");
}

// ---------------------------------------------------------------- starting levels, from the dossiers

/** The lands with no town and no lord's road: their tracks start unkept (the walls dossier: "No cities: villages, hill forts and camps"). */
const Townless = new Set(["kaska", "lukka", "steppe", "libya", "shasu"]);

/**
 * Roads (the walls dossier, "Roads and their upkeep"): a kept track in every land with a lord, which the attested journey
 * times are on (level 1); the Ways of Horus across the Sinai, a chain of forts with wells a day apart (Seti I's relief),
 * 2 from the Delta to Gaza; the townless lands' tracks unkept, 0.
 */
export function startRoad(p: Province): number {
  if (p.isSea || Townless.has(p.id)) return 0;
  return WaysOfHorus.has(p.id) ? 2 : 1;
}
const WaysOfHorus = new Set(["delta", "sinai", "gaza"]);

/** Relay stations: the sources' nearest thing is the fort with a well, so they start only along the Ways of Horus (the walls dossier, "Relay stations"). */
export const startStations = (p: Province): number => (WaysOfHorus.has(p.id) ? 1 : 0);

/**
 * Harbours (the walls dossier, "What a harbour held"): the great ports, Mahadu (Ugarit's), Peru-nefer in the Delta,
 * Byblos and Tyre's two anchorages, 3; the lesser, Sidon, Arwad, Akko, Gaza, Ashkelon, Enkomi, Ura (Hatti's, in
 * Kizzuwatna) and Apasa, 2; every other coast a beach, 1.
 */
export function startHarbour(p: Province): number {
  if (p.isSea || !p.isCoastal || p.waters === null) return 0;
  return GreatPorts.has(p.id) ? 3 : LesserPorts.has(p.id) ? 2 : 1;
}
const GreatPorts = new Set(["ugarit", "delta", "byblos", "tyre"]);
const LesserPorts = new Set(["sidon", "arwad", "akko", "gaza", "ashkelon", "enkomi", "kizzuwatna", "apasa"]);

/**
 * Policing (the pirates dossier, "What policing cost", "Start from"): 20 men in a province on a main road and 50 on the
 * frontier or in bandit country (the hills of Canaan, Amurru and Byblos's land, Galilee and the valley, Damascus and the
 * Bekaa, the Sinai road, the Kaska frontier), and the Medjay round Akhetaten; the townless lands' chiefs keep none.
 */
export function startPolicing(p: Province): number {
  if (p.isSea || Townless.has(p.id)) return 0;
  return BanditCountry.has(p.id) ? 5 : 2;
}
const BanditCountry = new Set([
  "shechem", "hebron", "megiddo", "jerusalem", "amurru", "byblos", "akko", "hazor", "damascus", "ashtaroth", "qadesh", "sinai", "gaza", "sapinuwa", "samuha", "akhetaten",
]);

/** A province's starting level of a kind other than walls (whose start is {@link MapData.StartWalls}). */
export function startLevel(kind: Exclude<WorkKind, "Walls">, p: Province): number {
  switch (kind) {
    case "Roads":
      return startRoad(p);
    case "Stations":
      return startStations(p);
    case "Harbour":
      return startHarbour(p);
    case "Policing":
      return startPolicing(p);
    case "Water":
      return 0;
  }
}

// ---------------------------------------------------------------- levels in the game state

/** The key of a level other than walls in GameState.built. */
export const workKey = (kind: WorkKind, province: string): string => `${kind}:${province}`;

/** The level of a kind in a province now (walls are GameState.walls, as since item 5). */
export function levelOf(s: GameState, kind: WorkKind, province: string): number {
  return kind === "Walls" ? s.walls.getOrDefault(province, 0) : s.built.getOrDefault(workKey(kind, province), 0);
}

/** Sets a level (0 leaves it out). Roads and stations change the couriers' reckoning, so their revision moves on. */
export function setLevel(s: GameState, kind: WorkKind, province: string, level: number): void {
  const n = Math.max(0, level);
  if (kind === "Walls") {
    if (n > 0) s.walls.set(province, n);
    else s.walls.delete(province);
    return;
  }
  const k = workKey(kind, province);
  if (n > 0) s.built.set(k, n);
  else s.built.delete(k);
  if (kind === "Roads" || kind === "Stations") bumpWays(s);
}

/**
 * A king's standing order for one kind in one province of his ("One rule for everything built"): the level to keep, paid
 * in gold or by corvée, the seasons of work done towards the next level, and the seasons its upkeep has gone unpaid.
 * What no order keeps goes unkept and decays: nothing is kept unless someone orders it. At the start each king has a
 * standing order to keep what stands in his land by corvée, the normal way of the age ("Paid in gold or in labour"),
 * which he sees and may change; land taken from another is unkept until its new holder orders otherwise.
 */
export interface WorkPlan {
  province: string;
  kind: WorkKind;
  /** The level to keep; above what stands, a project raises it, below, the levels above go unkept. */
  keep: number;
  /** Paid by corvée (true) or in gold. */
  labour: boolean;
  /** Seasons of work done towards the next level. */
  progress: number;
  /** Seasons in a row a level stood unpaid (its decay). */
  neglect: number;
  /** The season the order was given (0: at the start); an order for walls given during a siege repairs them. */
  since: number;
}

export function newWorkPlan(init: Partial<WorkPlan> = {}): WorkPlan {
  return { province: "", kind: "Roads", keep: 0, labour: true, progress: 0, neglect: 0, since: 0, ...init };
}

export const WorkPlanSchema: ObjSchema<WorkPlan> = obj("WorkPlan", newWorkPlan, { province: S, kind: S, keep: I, labour: B, progress: I, neglect: I, since: I });

/** The plan of a kind in a province, if any. */
export function planOf(s: GameState, kind: WorkKind, province: string): WorkPlan | null {
  return s.works.find((w) => w.kind === kind && w.province === province) ?? null;
}

// ---------------------------------------------------------------- roads and stations for the pace rule

/**
 * The roads and relay stations as the pace rule reads them ("What sets a company's pace": the roads term), by province.
 * One object a game state, renewed whenever a level changes, so the couriers' reckoning can be kept for it.
 */
export interface Ways {
  readonly road: (province: string) => number;
  readonly stations: (province: string) => number;
}

const waysOfState = new WeakMap<GameState, Ways>();

/** The roads and stations of a game state now. */
export function waysOf(s: GameState): Ways {
  let w = waysOfState.get(s);
  if (w === undefined) {
    const road = new Map<string, number>();
    const st = new Map<string, number>();
    for (const [k, v] of s.built.entries()) {
      const [kind, prov] = k.split(":");
      if (kind === "Roads") road.set(prov, v);
      else if (kind === "Stations") st.set(prov, v);
    }
    w = { road: (p) => road.get(p) ?? 0, stations: (p) => st.get(p) ?? 0 };
    waysOfState.set(s, w);
  }
  return w;
}

function bumpWays(s: GameState): void {
  waysOfState.delete(s);
}

/** The road term of a land connection, in percent of the time: the mean of its two halves' roads. */
export function roadTerm(w: Ways, from: string, to: string): number {
  const pc = (p: string): number => WorksEffect.roadPercent[Math.min(WorksEffect.roadPercent.length - 1, w.road(p))];
  return idiv(pc(from) + pc(to), 2);
}

/** The relay stations' term for a lone traveller on a land connection, in percent: the mean of its two halves'. */
export function stationTerm(w: Ways, from: string, to: string): number {
  const pc = (p: string): number => WorksEffect.stationPercent[Math.min(WorksEffect.stationPercent.length - 1, w.stations(p))];
  return idiv(pc(from) + pc(to), 2);
}

// ---------------------------------------------------------------- policing

/**
 * The police at work in a province now: its holder's, where his men can go (item 15, decided 29 October 2026): nowhere
 * hostile troops stand, and in a besieged city only inside the walls, so not on its roads and fields. 0 in land nobody holds.
 */
export function policeAt(s: GameState, province: string): number {
  const holder = s.owner.getOrDefault(province, null);
  if (holder === null) return 0;
  if (hostileAt(s, province, holder)) return 0;
  if (s.sieges.some((x) => x.province === province)) return 0;
  return levelOf(s, "Policing", province) * PoliceMenPerLevel;
}

/**
 * Whether hostile troops stand in a province of `holder`'s: any but his own and those he lets stand there, by a passage
 * or basing grant that stands (an ally's guests are not an enemy).
 */
export function hostileAt(s: GameState, province: string, holder: Power): boolean {
  return s.units.some(
    (u) =>
      u.province === province &&
      u.power !== holder &&
      !s.grants.some((g) => g.grantor === holder && g.grantee === u.power && grantStands(g, s.turn) && (g.province === province || (g.kind === "passage" && g.province === null && g.lands.includes(province)))),
  );
}

/** What police hold the loose and the bands down to, in percent of what they would take or dare unpoliced. */
export function policePercent(men: number): number {
  if (men <= 0) return 100;
  return 100 - idiv(WorksEffect.policeMost * men, men + WorksEffect.policeHalf);
}

/** The points police add to the odds of finding a smuggler or a sneaking traveller. */
export const policeFound = (men: number): number => idiv(Math.max(0, men), WorksEffect.policeFound);

// ---------------------------------------------------------------- harbours and water

/** The crews' men a harbour of this level shelters in winter. */
export const harbourRoom = (level: number): number => WorksEffect.harbourRoom[Math.max(0, Math.min(WorksEffect.harbourRoom.length - 1, level))];

/** The seasons a besieged city can drink, with its water works ("Water too"): Infinity where it never runs dry. */
export function drinkingSeasons(base: number, province: string, level: number): number {
  if (base === Infinity || level <= 0) return base;
  if (cityWater(province) === "Outside") return Infinity;
  return base + level * WorksEffect.waterSeasons;
}

// ---------------------------------------------------------------- what a court sees of its own

/** Every kind standing or ordered in each province a power holds, as its seat view shows it (item 15). */
export function worksOfPower(s: GameState, provinces: readonly string[]): WorkView[] {
  const out: WorkView[] = [];
  for (const id of provinces)
    for (const kind of WorkKindValues) {
      const level = levelOf(s, kind, id);
      const plan = planOf(s, kind, id);
      if (level <= 0 && (plan === null || plan.keep <= 0)) continue;
      const keep = plan?.keep ?? 0;
      const labour = plan?.labour ?? true;
      const kept = Math.min(level, keep);
      const next = kind === "Policing" ? keep - level : level + 1;
      const building = keep > level;
      out.push(
        newWorkView({
          province: id,
          kind,
          level,
          keep,
          labour,
          progress: plan?.progress ?? 0,
          seasons: WorksData[kind].seasons,
          upkeepGold: labour ? 0 : upkeepGold(kind, kept),
          upkeepMen: labour ? upkeepMen(kind, kept) : 0,
          buildGold: building && !labour ? buildGold(kind, id, next) : 0,
          buildMen: building && labour ? buildMen(kind, id, next) : 0,
          neglect: plan?.neglect ?? 0,
          decay: WorksData[kind].decay,
        }),
      );
    }
  return out;
}

/**
 * What the loose men take and the bands dare in a province, in percent of what they would unpoliced: held down by the
 * holder's troops standing there (item 11b: `LandData.policedPercent`) or by his police, whichever holds them lower.
 */
export function policedShare(s: GameState, province: string): number {
  const holder = s.owner.getOrDefault(province, null);
  if (holder === null) return 100;
  const troops = s.units.some((u) => u.province === province && u.power === holder) ? LandData.policedPercent : 100;
  return Math.min(troops, policePercent(policeAt(s, province)));
}
