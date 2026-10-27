/** Who plays what (each king's seat, the envoys and spies, and the narrator), the presets, the cost estimate, and the seats built from them. */
import { AllPowers, Dict, fmt, roundEven, type GameState, type Power } from "@amarna/engine";
import { HumanSeat, ScriptLeader, ScriptMind, TemplateNarrator, type GameLog, type ICharacterMind, type INarrator, type ISeat, type LogHeader } from "@amarna/game";
import { BridgeExchange, DefaultAddress, LocalBridge } from "./bridge.ts";
import { LlmCharacterMind } from "./character-mind.ts";
import { ClaudeClient, type ApiTransport } from "./client.ts";
import { LlmLeaderSeat } from "./leader-seat.ts";
import { ModelIds, Price } from "./models.ts";
import { LlmNarrator } from "./narrator.ts";

/** Who plays a king. LocalAgent is local play on a Claude subscription, through the local bridge. */
export type LeaderKind = "Script" | "Human" | "Haiku" | "Sonnet" | "Opus" | "LocalAgent";
export type CharacterKind = "Script" | "Haiku" | "Sonnet";
export type NarratorKind = "Template" | "Haiku" | "Sonnet" | "Opus";

export function leaderModel(k: LeaderKind): string | null {
  return k === "Haiku" ? ModelIds.Haiku : k === "Sonnet" ? ModelIds.Sonnet : k === "Opus" ? ModelIds.Opus : null;
}
export function characterModel(k: CharacterKind): string | null {
  return k === "Haiku" ? ModelIds.Haiku : k === "Sonnet" ? ModelIds.Sonnet : null;
}
export function narratorModel(k: NarratorKind): string | null {
  return k === "Haiku" ? ModelIds.Haiku : k === "Sonnet" ? ModelIds.Sonnet : k === "Opus" ? ModelIds.Opus : null;
}

/** Who plays what: each king's seat, the envoys and spies, and the narrator. */
export class SeatChoices {
  leaders = new Dict<Power, LeaderKind>(AllPowers.map((p) => [p, "Script"] as const));
  characters: CharacterKind = "Script";
  narrator: NarratorKind = "Template";
  leaderEffort = "medium";
  /** Local play: where the local bridge listens. */
  bridgeAddress = DefaultAddress;
  /** Local play: how long one decision waits for a king's agent before the script king stands in for it. */
  localAgentMinutes = 60;

  /** Local agent kings are not model calls from this program: they need the local bridge, not a key, and cost nothing here. */
  get usesModels(): boolean {
    return [...this.leaders.values()].some((v) => leaderModel(v) !== null) || this.characters !== "Script" || this.narrator !== "Template";
  }

  get usesLocalAgents(): boolean {
    return [...this.leaders.values()].some((v) => v === "LocalAgent");
  }

  copy(): SeatChoices {
    const c = new SeatChoices();
    c.leaders = this.leaders.clone();
    c.characters = this.characters;
    c.narrator = this.narrator;
    c.leaderEffort = this.leaderEffort;
    c.bridgeAddress = this.bridgeAddress;
    c.localAgentMinutes = this.localAgentMinutes;
    return c;
  }
}

/** A named way to play. Human seats chosen by the player are kept when a preset is applied. */
export class Preset {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly leaders: LeaderKind;
  readonly characters: CharacterKind;
  readonly narrator: NarratorKind;
  constructor(id: string, name: string, tagline: string, leaders: LeaderKind, characters: CharacterKind, narrator: NarratorKind) {
    this.id = id;
    this.name = name;
    this.tagline = tagline;
    this.leaders = leaders;
    this.characters = characters;
    this.narrator = narrator;
  }
  get needsKey(): boolean {
    return leaderModel(this.leaders) !== null || this.characters !== "Script" || this.narrator !== "Template";
  }
  applyTo(c: SeatChoices): void {
    for (const p of AllPowers) if (c.leaders.get(p) !== "Human") c.leaders.set(p, this.leaders);
    c.characters = this.characters;
    c.narrator = this.narrator;
  }
  matches(c: SeatChoices): boolean {
    return [...c.leaders.values()].filter((v) => v !== "Human").every((v) => v === this.leaders) && c.characters === this.characters && c.narrator === this.narrator;
  }
}

const Free = new Preset("free", "Free", "Script kings, envoys and narrator. No key and no cost; a whole game takes seconds.", "Script", "Script", "Template");
const Budget = new Preset("budget", "Budget", "Every role on Haiku 5.5. Cheap enough to play often; the kings plan less shrewdly.", "Haiku", "Haiku", "Haiku");
const Standard = new Preset("standard", "Standard", "The design document's table: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys and spies.", "Sonnet", "Haiku", "Sonnet");
const Showcase = new Preset(
  "showcase",
  "Showcase",
  "Opus 5.5 kings and narrator for the sharpest diplomacy. Envoys stay on Haiku 5.5: fallible messengers are part of the design.",
  "Opus",
  "Haiku",
  "Opus",
);

export const Presets = {
  Free,
  Budget,
  Standard,
  Showcase,
  all: [Free, Budget, Standard, Showcase] as readonly Preset[],
  /** Local play on a Claude subscription. Not in `all`: offered only when the game runs on this computer. */
  Local: new Preset(
    "local",
    "Local agents",
    "Kings played by Claude agents in a Claude Code session on this computer, on your Claude subscription. Needs the local bridge; envoys and narrator are scripts.",
    "LocalAgent",
    "Script",
    "Template",
  ),
  find(id: string | null | undefined): Preset | null {
    return Presets.all.find((p) => p.id === id) ?? null;
  },
  matching(c: SeatChoices): Preset | null {
    return Presets.all.find((p) => p.matches(c)) ?? null;
  },
};

/** A rough cost for a typical game, from average token counts per call. The in-game meter shows the actual figure. */
export const CostEstimate = {
  TypicalSeasons: 20,
  perGame(c: SeatChoices, seasons = 20): number {
    const effort = c.leaderEffort === "low" ? 0.6 : c.leaderEffort === "high" ? 1.6 : 1.0;
    let total = 0.0;
    for (const kind of c.leaders.values()) {
      const model = leaderModel(kind);
      if (model === null) continue;
      const price = Price.for(model);
      // Orders: the rulebook is read from cache, the season's situation is fresh.
      const orders = price.cost(5000, Math.trunc(3000 * effort), 5000, 0);
      // About one audience a season, at lower effort.
      const audiences = 1.2 * price.cost(3500, Math.trunc(1000 * effort), 5000, 0);
      total += seasons * (orders + audiences);
    }
    const cm = characterModel(c.characters);
    if (cm !== null) total += seasons * 15 * Price.for(cm).cost(1500, 400, 0, 0);
    const nm = narratorModel(c.narrator);
    if (nm !== null) {
      const p = Price.for(nm);
      total += 18 * p.cost(600, 400, 0, 0) + 7 * p.cost(3000, 1200, 0, 0) + 5 * p.cost(300, 200, 0, 0);
    }
    return total;
  },
  /** "about $9", "under $1", "free". */
  describe(dollars: number): string {
    if (dollars <= 0) return "free";
    if (dollars < 1) return "under $1";
    if (dollars < 10) return `about $${fmt(roundEven(dollars), "0")}`;
    return `about $${fmt(roundEven(dollars / 5) * 5, "0")}`;
  },
  /** A spending cap with room for a long game: half again the estimate, at least $1. */
  suggestedBudget(dollars: number): number {
    return dollars <= 0 ? 0 : Math.max(1, Math.ceil(dollars * 1.5));
  },
};

export interface SeatSet {
  seats: Dict<Power, ISeat>;
  minds: ICharacterMind;
  narrator: INarrator;
}

/** A local agent king's label, in the log header and wherever seats are listed. */
export const LocalAgentLabel = "Local agent";

/**
 * Builds seats for a game. Model seats share one client, which logs every call into the game's log. `transport`: how calls
 * reach the API (fetch with the player's key, or the simulated API).
 */
export function buildSeats(choices: SeatChoices, state: GameState, transport: ApiTransport | null, log: () => GameLog): SeatSet {
  let client: ClaudeClient | null = null;
  if (choices.usesModels) {
    if (transport === null) throw new Error("Model seats need an Anthropic API key.");
    client = new ClaudeClient(transport, (call) => log().addCall(call));
  }
  // Local play: every local agent king goes through the one bridge, as a file seat whose files the bridge writes.
  const bridge = choices.usesLocalAgents ? new LocalBridge(choices.bridgeAddress, Math.min(Math.max(choices.localAgentMinutes, 1), 24 * 60) * 60000) : null;

  const script = new ScriptLeader(state.seed);
  const seats = new Dict<Power, ISeat>();
  for (const p of AllPowers) {
    const kind = choices.leaders.get(p);
    const model = leaderModel(kind);
    seats.set(
      p,
      kind === "Human"
        ? new HumanSeat(p)
        : kind === "LocalAgent"
          ? new LlmLeaderSeat(
              p,
              new BridgeExchange(bridge!, p, (call) => log().addCall(call)),
              BridgeExchange.Model,
              choices.leaderEffort,
              state.config.customsPrimer,
              state.config,
              LocalAgentLabel,
            )
          : model !== null
            ? new LlmLeaderSeat(p, client!, model, choices.leaderEffort, state.config.customsPrimer, state.config)
            : script,
    );
  }
  // Model characters' decisions are logged beside the script's for the same situations (the log's shadow lines).
  const cm = characterModel(choices.characters);
  let minds: ICharacterMind = new ScriptMind();
  if (cm !== null) {
    const m = new LlmCharacterMind(client!, cm);
    m.shadow = (s) => log().addShadow(s);
    minds = m;
  }
  const nm = narratorModel(choices.narrator);
  const narrator: INarrator = nm !== null ? new LlmNarrator(client!, nm) : new TemplateNarrator();
  return { seats, minds, narrator };
}

/** Reads seat choices back from a log header's labels, to continue a saved game. */
export function choicesFromHeader(header: LogHeader): SeatChoices {
  const leader = (label: string): LeaderKind =>
    label === "Human"
      ? "Human"
      : label === LocalAgentLabel
        ? "LocalAgent"
        : label.includes("Opus")
          ? "Opus"
          : label.includes("Sonnet")
            ? "Sonnet"
            : label.includes("Haiku")
              ? "Haiku"
              : "Script";
  const c = new SeatChoices();
  for (const p of AllPowers) c.leaders.set(p, leader(header.seats.tryGet(p) ?? ""));
  c.characters = header.minds.includes("Sonnet") ? "Sonnet" : header.minds.includes("Haiku") ? "Haiku" : "Script";
  c.narrator = header.narrator.includes("Opus") ? "Opus" : header.narrator.includes("Sonnet") ? "Sonnet" : header.narrator.includes("Haiku") ? "Haiku" : "Template";
  return c;
}

