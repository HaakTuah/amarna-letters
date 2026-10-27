/** The table's settings, chosen on the start page and carried into the engine's worker (plain data, so it crosses over). */
import { AllPowers, newGameConfig, type GameConfig, type GameState, type Power } from "@amarna/engine";
import type { LogHeader } from "@amarna/game";
import { CostEstimate, SeatChoices, choicesFromHeader, type CharacterKind, type LeaderKind, type NarratorKind } from "@amarna/llm";

export interface GameSettings {
  seed: number;
  leaders: Record<string, LeaderKind>;
  characters: CharacterKind;
  narrator: NarratorKind;
  leaderEffort: string;
  bridgeAddress: string;
  localAgentMinutes: number;
  chronicles: boolean;
  customsPrimer: boolean;
  sharedVictory: boolean;
  /** On by default: a player whose kingdom has fallen watches the rest in god view. */
  fallenSeeAll: boolean;
  /** On by default: a model king sleeps after its orders until something concerns it. */
  sleepingSeats: boolean;
  /** The hidden safety cap on one sleep, in seasons; the kings are never told it. */
  maxSleep: number;
  /** The game pauses when its model spend reaches this. */
  budgetUsd: number;
  messagesPerTurn: number;
  /** Answer model calls inside the browser with canned replies: for trying the app without a key or cost. */
  simulateApi: boolean;
}

export const randomSeed = (): number => 1 + Math.floor(Math.random() * 999_999);

export function newSettings(): GameSettings {
  return {
    seed: randomSeed(),
    leaders: Object.fromEntries(AllPowers.map((p) => [p, "Script" as LeaderKind])),
    characters: "Script",
    narrator: "Template",
    leaderEffort: "medium",
    bridgeAddress: "http://localhost:5190",
    localAgentMinutes: 60,
    chronicles: true,
    customsPrimer: true,
    sharedVictory: false,
    fallenSeeAll: true,
    sleepingSeats: true,
    maxSleep: 12,
    budgetUsd: 0,
    messagesPerTurn: 3,
    simulateApi: false,
  };
}

export function choicesOf(s: GameSettings): SeatChoices {
  const c = new SeatChoices();
  for (const p of AllPowers) c.leaders.set(p, s.leaders[p]);
  c.characters = s.characters;
  c.narrator = s.narrator;
  c.leaderEffort = s.leaderEffort;
  c.bridgeAddress = s.bridgeAddress;
  c.localAgentMinutes = s.localAgentMinutes;
  return c;
}

/** Writes seat choices back into settings. */
export function withChoices(s: GameSettings, c: SeatChoices): GameSettings {
  return {
    ...s,
    leaders: Object.fromEntries(AllPowers.map((p) => [p, c.leaders.get(p)])),
    characters: c.characters,
    narrator: c.narrator,
    leaderEffort: c.leaderEffort,
    bridgeAddress: c.bridgeAddress,
    localAgentMinutes: c.localAgentMinutes,
  };
}

export const usesModels = (s: GameSettings): boolean => choicesOf(s).usesModels;
export const estimate = (s: GameSettings): number => CostEstimate.perGame(choicesOf(s));

export function toConfig(s: GameSettings): GameConfig {
  return newGameConfig({
    customsPrimer: s.customsPrimer,
    sharedVictory: s.sharedVictory,
    fallenSeeAll: s.fallenSeeAll,
    sleepingSeats: s.sleepingSeats,
    maxSleep: Math.min(Math.max(s.maxSleep, 1), 30),
    maxDispatchesPerTurn: s.messagesPerTurn,
  });
}

export function settingsFromHeader(header: LogHeader): GameSettings {
  const s = withChoices(
    {
      ...newSettings(),
      seed: header.seed,
      customsPrimer: header.config.customsPrimer,
      sharedVictory: header.config.sharedVictory,
      fallenSeeAll: header.config.fallenSeeAll,
      sleepingSeats: header.config.sleepingSeats,
      maxSleep: header.config.maxSleep,
      messagesPerTurn: header.config.maxDispatchesPerTurn,
    },
    choicesFromHeader(header),
  );
  s.budgetUsd = CostEstimate.suggestedBudget(estimate(s));
  return s;
}

/** The human seats chosen. */
export const humansOf = (s: GameSettings): Power[] => AllPowers.filter((p) => s.leaders[p] === "Human");

/**
 * A fallen player's game is over: once every human seat at the table has fallen, and the table's setting allows it (on by
 * default), the players watch the rest in god view. While one of them still plays, a fallen player on the same screen
 * would see what the other cannot, so nobody does. With the setting off, a fallen player keeps his own view.
 */
export function fallenSeesAll(s: GameState, humans: readonly Power[]): boolean {
  return s.config.fallenSeeAll && humans.length > 0 && humans.every((p) => s.eliminated.includes(p));
}
