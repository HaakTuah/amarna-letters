import { B, D, I, type ObjSchema, list, obj } from "../core/json.ts";

/** Every tunable number in one place. The defaults are first proposals, tuned by batch runs. */
export interface GameConfig {
  minTurns: number;
  endChance: number;
  maxTurns: number;
  /**
   * Strength = ProvinceWeight x (sum of owned base yields) + gold - back pay owed (see {@link Scoring}).
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
  armyUpkeep: number;
  fleetUpkeep: number;
  /** A neutral city-state sells itself for yield x this. */
  neutralPriceFactor: number;
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
   * ground, across a mountain pass or a great river, or against a landing from the sea; this much in all, however many
   * apply. 0 turns terrain off.
   */
  terrainDefence: number;
  /**
   * What an army pays for supplies, with its next upkeep, for a season it ends in desert land its king did not hold when
   * that season's moves were made; an army in its own land pays nothing.
   */
  desertUpkeep: number;
  /** Envoy travel: up to [0] hops is 1 season, up to [1] hops 2 seasons, beyond that 3. */
  travelHops: number[];
  maxDispatchesPerTurn: number;
  maxLetterChars: number;
  audienceRounds: number;
  tabletFee: number;
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
    minTurns: 15,
    endChance: 0.15,
    maxTurns: 60,
    provinceWeight: 10,
    sharedVictory: false,
    fallenSeeAll: true,
    armyCost: 100,
    fleetCost: 120,
    armyUpkeep: 30,
    fleetUpkeep: 35,
    neutralPriceFactor: 10,
    catastropheChance: 0.035,
    siegeUpkeep: 15,
    maxWalls: 3,
    fortifyCost: 50,
    wallUpkeep: 5,
    sallyMinWalls: 2,
    siegeCatchPerUnit: 20,
    siegeCatchMin: 5,
    siegeCatchMax: 75,
    terrainDefence: 1,
    desertUpkeep: 30,
    travelHops: [4, 7],
    maxDispatchesPerTurn: 3,
    maxLetterChars: 1500,
    audienceRounds: 2,
    tabletFee: 20,
    assayFee: 10,
    forgeFee: 40,
    forgeMinCompetence: 55,
    customsPrimer: true,
    sleepingSeats: true,
    maxSleep: 12,
    startEnvoysPerPower: 2,
    characterPoolSize: 18,
    memoryKeep: 12,
    ...init,
  };
}

export const GameConfigSchema: ObjSchema<GameConfig> = obj("GameConfig", newGameConfig, {
  minTurns: I,
  endChance: D,
  maxTurns: I,
  provinceWeight: I,
  sharedVictory: B,
  fallenSeeAll: B,
  armyCost: I,
  fleetCost: I,
  armyUpkeep: I,
  fleetUpkeep: I,
  neutralPriceFactor: I,
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
  desertUpkeep: I,
  travelHops: list(I),
  maxDispatchesPerTurn: I,
  maxLetterChars: I,
  audienceRounds: I,
  tabletFee: I,
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
