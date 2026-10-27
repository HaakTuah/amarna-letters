/** The table's settings, chosen on the start page and carried into the engine's worker (plain data, so it crosses over). */
import { AllPowers, newGameConfig, type GameConfig, type GameState, type Power } from "@amarna/engine";
import type { LogHeader } from "@amarna/game";
import { CostEstimate, SeatChoices, choicesFromHeader, type CharacterKind, type LeaderKind, type NarratorKind, type PriceSetting, type ProviderSetting } from "@amarna/llm";

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
  /**
   * The ending ("Random ending" and "An open age" under Victory): the season by which half of all ages have ended, the hard
   * cap's range (drawn from in secret at the start) or none, and the open age with no end. The kings are told the rule in
   * words only.
   */
  endMedian: number;
  capped: boolean;
  capMin: number;
  capMax: number;
  openAge: boolean;
  /** The game pauses when its model spend reaches this: the spending limit an open age needs, since it makes calls with no end. */
  budgetUsd: number;
  messagesPerTurn: number;
  /** Answer model calls inside the browser with canned replies: for trying the app without a key or cost. */
  simulateApi: boolean;
  /** Providers other than Anthropic, each with an OpenAI-compatible endpoint (their keys are held apart, in memory). */
  providers: ProviderSetting[];
  /** Prices the table set, by model, over the defaults. */
  prices: Record<string, PriceSetting>;
  /** The game pauses when more than this share of a season's model calls fell back to scripts (0 never pauses). */
  pauseFallbackShare: number;
}

const Ending = newGameConfig();

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
    endMedian: Ending.endMedian,
    capped: Ending.capped,
    capMin: Ending.capMin,
    capMax: Ending.capMax,
    openAge: Ending.openAge,
    budgetUsd: 0,
    messagesPerTurn: 3,
    simulateApi: false,
    providers: [],
    prices: {},
    pauseFallbackShare: 0.5,
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
  c.providers = s.providers.map((p) => ({ ...p }));
  c.prices = { ...s.prices };
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
    providers: c.providers.map((p) => ({ ...p })),
    prices: { ...c.prices },
  };
}

export const usesModels = (s: GameSettings): boolean => choicesOf(s).usesModels;
/** The estimate for a game of median length; an open age has no end, so it is the spend of the same span, before the limit. */
export const estimate = (s: GameSettings): number => CostEstimate.perGame(choicesOf(s), s.endMedian);

export function toConfig(s: GameSettings): GameConfig {
  return newGameConfig({
    customsPrimer: s.customsPrimer,
    sharedVictory: s.sharedVictory,
    fallenSeeAll: s.fallenSeeAll,
    sleepingSeats: s.sleepingSeats,
    maxSleep: Math.min(Math.max(s.maxSleep, 1), 30),
    maxDispatchesPerTurn: s.messagesPerTurn,
    endMedian: Number.isFinite(s.endMedian) ? Math.min(Math.max(Math.round(s.endMedian), 3), 150) : Ending.endMedian,
    capped: s.capped,
    capMin: Math.max(1, Math.round(Math.min(s.capMin, s.capMax)) || Ending.capMin),
    capMax: Math.max(1, Math.round(Math.max(s.capMin, s.capMax)) || Ending.capMax),
    openAge: s.openAge,
  });
}

/** The table's own settings a saved log does not keep, carried over from the page when a game is continued. */
export type TableSettings = Pick<GameSettings, "providers" | "prices" | "pauseFallbackShare">;

export function settingsFromHeader(header: LogHeader, table: TableSettings | null = null): GameSettings {
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
      endMedian: header.config.endMedian,
      capped: header.config.capped,
      capMin: header.config.capMin,
      capMax: header.config.capMax,
      openAge: header.config.openAge,
      ...(table !== null ? { prices: { ...table.prices }, pauseFallbackShare: table.pauseFallbackShare } : {}),
    },
    choicesFromHeader(header, table?.providers ?? []),
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
