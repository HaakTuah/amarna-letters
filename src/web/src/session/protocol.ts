/** The messages between the page and the engine's worker. The engine is the only state: the page shows what it is sent. */
import type { GameConfig, Power } from "@amarna/engine";
import type { SeasonFallbacks, SnapshotDelta, TrailAuthors } from "@amarna/game";
import type { SeasonFrame } from "./frames.ts";
import type { GameSettings, TableSettings } from "./settings.ts";

/** API keys by provider id ("anthropic", or a provider the table set up), held in memory only. */
export type Keys = Record<string, string>;

export type ToWorker =
  | { type: "start"; settings: GameSettings; keys: Keys }
  | { type: "load"; text: string; continuePlay: boolean; keys: Keys; table: TableSettings | null; id?: string | null }
  | { type: "step" }
  | { type: "auto"; on: boolean }
  | { type: "delay"; ms: number }
  | { type: "budget"; by: number }
  /** With the spending limit the table set by hand for the open age, where one is needed (handLimitNeeded). */
  | { type: "playOn"; budgetUsd: number | null }
  | { type: "stop" }
  | { type: "clear" }
  | { type: "orders"; power: Power; json: string }
  | { type: "answer"; power: Power; json: string }
  /** A sleeping human seat wakes itself next season (item 9+a). */
  | { type: "wake"; power: Power }
  | { type: "export"; id: number };

/** A human seat's question, as JSON the page reads with the engine's schemas. */
export interface Pending {
  power: Power;
  /** The seat view it gives orders from (SeatView JSON), or null. */
  orders: string | null;
  /** The audience it holds (AudienceView JSON) and its court as it stands (SeatView JSON), or null. */
  audience: { view: string; court: string } | null;
}

/** The game as the page shows it, after every change. */
export interface Live {
  hasRunner: boolean;
  /** Bumped when a new game starts: frames and states before it are gone. */
  generation: number;
  /**
   * The stream of the state (item 17a): each season's snapshot as the pieces new since the last update and the season's list
   * of pieces, from which the page keeps its own history and reads back what changed (session/incremental.ts). Empty when
   * no season ended since the last update.
   */
  states: SnapshotDelta[];
  phase: string;
  busy: boolean;
  auto: boolean;
  readOnly: boolean;
  ended: boolean;
  /** Whether the table may play on into an open age: the age ended by its last season, and this game is not a replay. */
  canPlayOn: boolean;
  turn: number;
  /** The last few fallback errors, and how many there were. */
  errors: string[];
  errorCount: number;
  error: string | null;
  notice: string | null;
  cost: number;
  /** A call went to a model with no price: the meter shows its spend as unknown beside what it counts. */
  costUnknown: boolean;
  settings: GameSettings;
  config: GameConfig | null;
  seats: Record<string, string>;
  snapshots: number;
  chronicles: Record<string, string>;
  humans: Power[];
  /** The human seats asleep now: seasons pass without asking them until something concerns them or they wake. */
  humansAsleep: Power[];
  pending: Pending[];
  gameId: string;
  /** Set once every human seat has fallen and the table lets the players watch in god view. */
  fallenToGod: boolean;
  /** Who wrote each part of each message trail, by trail id ("Who wrote it"). */
  trailAuthors: Record<string, TrailAuthors>;
  /** Each season played: how many decisions models and file seats were asked for, and those scripts made in their place. */
  fallbacks: ({ turn: number } & SeasonFallbacks)[];
}

export type FromWorker =
  | { type: "update"; live: Live; frames: SeasonFrame[]; reset: boolean }
  | { type: "export"; id: number; name: string; text: string };
