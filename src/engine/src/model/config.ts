import { B, D, I, type ObjSchema, S, list, obj } from "../core/json.ts";
import type { PressMode } from "./clauses.ts";

/** Every tunable number in one place. The defaults are first proposals, tuned by batch runs. */
export interface GameConfig {
  /**
   * The random ending ("Random ending" under Victory, build order item 6a): the season by which half of all games have
   * ended, the chance of each season being the last growing in proportion to its number ({@link endSlope}). 80 seasons is
   * about 1320 BCE, as Suppiluliuma's age closed (item 17 lengthened it from 44, the archive's end in 1332 BCE). A table setting; kings are told the rule in words, never this number.
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
   * The weight of a realm's size in the final score, in percent, the rest its performance (item 11e, "One scoreboard for
   * every power": both from 0 to 1, size as a share of the largest realm's wealth, performance as its rank among its own
   * position's results). A first guess of 5 percent for size since item 11f (Haakon's answer to item 11e's review: near the
   * fair point item 11e measured; equal weights before), set in item 18 so that every power has about the same chance of
   * first place; kings are told the goal in words until then.
   */
  sizeWeight: number;
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
   * Item 13 ("What sets a company's pace": its size): how much an army's or a fleet's men slow it on the march, in percent
   * of {@link MarchData}'s term (100 as built; 0 marches every unit at a lone traveller's pace, for tests of other rules).
   */
  armyPace: number;
  /**
   * Item 13 ("Distance inside your own realm"): 1, orders and reports inside a realm travel with its couriers; 0, every
   * order reaches its place within the season and a king sees his whole realm, as before item 13 (for tests of other rules).
   */
  realmDistance: number;
  /**
   * Whether a land's people resist an army that enters it where no troop stands (item 10+a, "The people defend their
   * land"): 1 on, 0 off.
   */
  peopleDefence: number;
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
   * Winter is dangerous, never closed (item 9; by men since item 11a+): the share in percent of a full army's men lost
   * crossing a mountain pass in winter, or carried over the open sea then, to cold, hunger and desertion or to the storms,
   * and of a full fleet's crossing the open sea in winter, to the storms; in proportion to a troop's men, halved for one
   * carrying a season's food (turn/winter.ts). The commander is neutral until item 13.
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
  /** A Great King's starting staff; a city-state starts with half (at least one), since staff follows size (item 11+). */
  startEnvoysPerPower: number;
  /**
   * The characters at the start ("How many characters"): 60 for the seven Great Kings until item 11+, which recounts it
   * for the some thirty powers: each city-state's servant and as many free people again, about 100 (a first guess).
   */
  characterPoolSize: number;
  memoryKeep: number;
}

export function newGameConfig(init: Partial<GameConfig> = {}): GameConfig {
  return {
    endMedian: 80,
    capped: true,
    capMin: 140,
    capMax: 160,
    openAge: false,
    provinceWeight: 10,
    sizeWeight: 5,
    sharedVictory: false,
    fallenSeeAll: true,
    armyCost: 100,
    fleetCost: 120,
    armyUpkeep: 20,
    fleetUpkeep: 25,
    catastropheChance: 0.0175,
    siegeUpkeep: 15,
    sallyMinWalls: 2,
    siegeCatchPerUnit: 20,
    siegeCatchMin: 5,
    siegeCatchMax: 75,
    terrainDefence: 1,
    armyPace: 100,
    realmDistance: 1,
    peopleDefence: 1,
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
    characterPoolSize: 100,
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
  sizeWeight: I,
  sharedVictory: B,
  fallenSeeAll: B,
  armyCost: I,
  fleetCost: I,
  armyUpkeep: I,
  fleetUpkeep: I,
  catastropheChance: D,
  siegeUpkeep: I,
  sallyMinWalls: I,
  siegeCatchPerUnit: I,
  siegeCatchMin: I,
  siegeCatchMax: I,
  terrainDefence: I,
  armyPace: I,
  realmDistance: I,
  peopleDefence: I,
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
