import { B, D, I, type ObjSchema, S, list, obj } from "../core/json.ts";
import type { PressMode } from "./clauses.ts";

/** Every tunable number in one place. The defaults are first proposals, tuned by batch runs. */
export interface GameConfig {
  /**
   * The random ending ("Random ending" under Victory, build order item 6a): the season by which half of all games have
   * ended, the chance of each season being the last growing in proportion to its number ({@link endSlope}). 44 seasons is
   * 1332 BCE, the conventional end of the archive. A table setting; kings are told the rule in words, never this number.
   */
  endMedian: number;
  /** Whether the game has a hard cap, drawn in secret at the start from capMin to capMax seasons (a single season is a known cap). */
  capped: boolean;
  capMin: number;
  capMax: number;
  /**
   * "An open age": no drawn last season and no cap. Set at the start, or chosen when the age ends, to play on after the
   * winner is recorded. Only one kingdom left still ends it.
   */
  openAge: boolean;
  /**
   * The land's multiple in the wealth of a realm: its worth is this times what it produces a season at reference prices
   * (see {@link Scoring}).
   */
  provinceWeight: number;
  /**
   * Off by default (since 18 October 2026): a house rule for experiments, never in a king's rulebook unless switched on.
   */
  sharedVictory: boolean;
  /**
   * A table setting, on by default (the design document's "A fallen player's game is over", built with the siege package):
   * a player whose kingdom has fallen watches the rest of the game in god view, seeing everything. Off, for a table worried
   * that a fallen player might pass hidden facts to a friend still playing, he watches with what his kingdom knew when it
   * fell. It changes no rule, and no king's rulebook names it.
   */
  fallenSeeAll: boolean;
  armyCost: number;
  fleetCost: number;
  /** The pay of an army's men, and of a fleet's crews, a season in gold (item 9+a: their food is grain, apart). */
  armyUpkeep: number;
  fleetUpkeep: number;
  catastropheChance: number;
  /** What each siege costs its besieger a season, on top of the army's upkeep. */
  siegeUpkeep: number;
  /** The highest walls go. */
  maxWalls: number;
  /** Strengthening walls costs this times the new level (50, 100, 150). */
  fortifyCost: number;
  /**
   * Each level of walls above the map's own for that province costs this a season; unpaid, the walls fall a level.
   */
  wallUpkeep: number;
  /**
   * The walls a city needs for its defenders to sally against troops within them (+1 to one attack on them); 0 turns sallies off.
   */
  sallyMinWalls: number;
  /**
   * An envoy leaving or coming home to its king's besieged capital is caught with a chance in percent of this × the siege's
   * tightness (the besieger's units in and next to the city, 1 to 3) − its skill ÷ 4, between the next two; one whose
   * courage is below this × the tightness will not leave.
   */
  siegeCatchPerUnit: number;
  siegeCatchMin: number;
  siegeCatchMax: number;
  /**
   * What the ground gives a unit that stands its ground against an attack ({@link Geography.DefenceGround}): on rough
   * ground, or across a mountain pass or a great river; this much in all, however many apply. 0 turns terrain off.
   */
  terrainDefence: number;
  /**
   * A besieged coastal city supplied by sea, because no fleet of its besieger holds its waters (build order item 7a,
   * "Finer seas"), is worn down this many steps less each season. 0 turns the blockade's part in sieges off.
   */
  seaSupply: number;
  /**
   * Days on the road a traveller makes in a season (build order item 7b): the points it advances along its route each
   * season are ten times this ({@link legPoints}). The rest of a season goes on halts, audiences and waiting at borders.
   */
  travelDays: number;
  /**
   * Winter is dangerous, never closed (item 9): the chance in percent that an army crossing a mountain pass in winter, or
   * carried over the open sea then, is lost to cold, hunger and desertion or to the storms, and that a fleet crossing the
   * open sea in winter is lost to the storms. Size, supplies and the commander are neutral until their items (9+a, 10+a, 13).
   */
  winterArmyLoss: number;
  winterFleetLoss: number;
  maxDispatchesPerTurn: number;
  maxLetterChars: number;
  /**
   * The press (build order item 8, "Two press modes"): "full", kings write free words and every letter carries its clauses
   * beside them; "structured", kings write only clauses from the templates and every letter is its clauses in the
   * templates' words. Structured is required whenever the characters are script (set at setup; see `requiresStructured`).
   */
  pressMode: PressMode;
  audienceRounds: number;
  tabletFee: number;
  /** The scribe's fee for the inventory of gold an envoy carries (item 8): saved by sending the gold without one. */
  inventoryFee: number;
  /** Seasons most Great Kings must have called a new claimant brother for his claim to become established (item 8). */
  recognitionSeasons: number;
  assayFee: number;
  forgeFee: number;
  forgeMinCompetence: number;
  customsPrimer: boolean;
  /**
   * On by default (since 18 October 2026): after every set of orders a model or file seat sleeps, and is asked again
   * only when something concerns it or the hidden cap is reached (it never chooses when it wakes). Off, every seat is asked every season.
   */
  sleepingSeats: boolean;
  /**
   * The hidden safety cap: a seat that gave orders in turn T is woken by turn T + 1 + this at the latest. Kings are never
   * told it (not in the rulebook, the schema or the view), so it does not anchor their planning. A placeholder.
   */
  maxSleep: number;
  startEnvoysPerPower: number;
  characterPoolSize: number;
  memoryKeep: number;
}

export function newGameConfig(init: Partial<GameConfig> = {}): GameConfig {
  return {
    endMedian: 44,
    capped: true,
    capMin: 80,
    capMax: 100,
    openAge: false,
    provinceWeight: 10,
    sharedVictory: false,
    fallenSeeAll: true,
    armyCost: 100,
    fleetCost: 120,
    armyUpkeep: 20,
    fleetUpkeep: 25,
    catastropheChance: 0.0175,
    siegeUpkeep: 15,
    maxWalls: 3,
    fortifyCost: 50,
    wallUpkeep: 5,
    sallyMinWalls: 2,
    siegeCatchPerUnit: 20,
    siegeCatchMin: 5,
    siegeCatchMax: 75,
    terrainDefence: 1,
    seaSupply: 1,
    travelDays: 45,
    winterArmyLoss: 30,
    winterFleetLoss: 25,
    maxDispatchesPerTurn: 3,
    maxLetterChars: 1500,
    pressMode: "full",
    audienceRounds: 2,
    tabletFee: 20,
    inventoryFee: 20,
    recognitionSeasons: 9,
    assayFee: 10,
    forgeFee: 40,
    forgeMinCompetence: 55,
    customsPrimer: true,
    sleepingSeats: true,
    maxSleep: 12,
    startEnvoysPerPower: 2,
    characterPoolSize: 60,
    memoryKeep: 12,
    ...init,
  };
}

export const GameConfigSchema: ObjSchema<GameConfig> = obj("GameConfig", newGameConfig, {
  endMedian: I,
  capped: B,
  capMin: I,
  capMax: I,
  openAge: B,
  provinceWeight: I,
  sharedVictory: B,
  fallenSeeAll: B,
  armyCost: I,
  fleetCost: I,
  armyUpkeep: I,
  fleetUpkeep: I,
  catastropheChance: D,
  siegeUpkeep: I,
  maxWalls: I,
  fortifyCost: I,
  wallUpkeep: I,
  sallyMinWalls: I,
  siegeCatchPerUnit: I,
  siegeCatchMin: I,
  siegeCatchMax: I,
  terrainDefence: I,
  seaSupply: I,
  travelDays: I,
  winterArmyLoss: I,
  winterFleetLoss: I,
  maxDispatchesPerTurn: I,
  maxLetterChars: I,
  pressMode: S,
  audienceRounds: I,
  tabletFee: I,
  inventoryFee: I,
  recognitionSeasons: I,
  assayFee: I,
  forgeFee: I,
  forgeMinCompetence: I,
  customsPrimer: B,
  sleepingSeats: B,
  maxSleep: I,
  startEnvoysPerPower: I,
  characterPoolSize: I,
  memoryKeep: I,
});
