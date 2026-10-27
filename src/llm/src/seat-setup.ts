/** Who plays what (each king's seat, the envoys and spies, and the narrator), the presets, the cost estimate, and the seats built from them. */
import { AllPowers, Dict, fmt, roundEven, type GameConfig, type GameState, type Power } from "@amarna/engine";
import {
  HumanSeat,
  ScriptLeader,
  ScriptMind,
  TemplateNarrator,
  type GameLog,
  type ICharacterMind,
  type INarrator,
  type ISeat,
  type LogHeader,
} from "@amarna/game";
import { BridgeExchange, DefaultAddress, LocalBridge } from "./bridge.ts";
import { LlmCharacterMind } from "./character-mind.ts";
import { AnthropicProvider, type ApiTransport } from "./anthropic.ts";
import { AnthropicId, ModelClient, splitModel, type Provider } from "./client.ts";
import { CompatibleProvider, type ProviderSetting } from "./compatible.ts";
import { LlmLeaderSeat } from "./leader-seat.ts";
import { ModelIds, PriceTable, type PriceSetting } from "./models.ts";
import { LlmNarrator } from "./narrator.ts";
import { Replies, type ReplySchema } from "./schemas.ts";

/**
 * Who plays a king: "Script", "Human", "LocalAgent" (local play on a Claude subscription, through the local bridge), or a
 * model: any model setting ("claude-sonnet-5-5", "<provider>:<model>"), or the presets' shorthands "Haiku", "Sonnet"
 * and "Opus" for the 5.5 models. Characters are "Script" or a model, the narrator "Template" or a model.
 */
export type LeaderKind = string;
export type CharacterKind = string;
export type NarratorKind = string;

/** The model a shorthand or a model setting names. */
const modelOf = (k: string): string => (k === "Haiku" ? ModelIds.Haiku : k === "Sonnet" ? ModelIds.Sonnet : k === "Opus" ? ModelIds.Opus : k.trim());

export function leaderModel(k: LeaderKind): string | null {
  return k === "Script" || k === "Human" || k === "LocalAgent" || k.trim().length === 0 ? null : modelOf(k);
}
export function characterModel(k: CharacterKind): string | null {
  return k === "Script" || k.trim().length === 0 ? null : modelOf(k);
}
export function narratorModel(k: NarratorKind): string | null {
  return k === "Template" || k.trim().length === 0 ? null : modelOf(k);
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
  /** Providers other than Anthropic, each with an OpenAI-compatible endpoint; a model setting names one by its id. */
  providers: ProviderSetting[] = [];
  /** Prices set by the table, by model setting, over the defaults. */
  prices: Record<string, PriceSetting> = {};

  /** Every model a job uses, each once. */
  get models(): string[] {
    const all = [...this.leaders.values()].map(leaderModel);
    all.push(characterModel(this.characters), narratorModel(this.narrator));
    return [...new Set(all.filter((m): m is string => m !== null))];
  }

  /** The providers the models in use name (by id), Anthropic included when a model names no other. */
  get providersInUse(): string[] {
    const ids = this.providers.map((p) => p.id);
    return [...new Set(this.models.map((m) => splitModel(m, ids).provider))];
  }

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
    c.providers = this.providers.map((p) => ({ ...p }));
    c.prices = { ...this.prices };
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
    // By the models named, so a shorthand and the model it stands for are the same choice.
    const same = (a: string, b: string, model: (k: string) => string | null): boolean => (model(a) ?? a) === (model(b) ?? b);
    return (
      [...c.leaders.values()].filter((v) => v !== "Human").every((v) => same(v, this.leaders, leaderModel)) &&
      same(c.characters, this.characters, characterModel) &&
      same(c.narrator, this.narrator, narratorModel)
    );
  }
}

const Free = new Preset("free", "Free", "Script kings, envoys and narrator. No key and no cost; a whole game takes seconds.", "Script", "Script", "Template");
const Budget = new Preset("budget", "Budget", "Every role on Haiku 5.5. Cheap enough to play often; the kings plan less shrewdly.", "Haiku", "Haiku", "Haiku");
const Standard = new Preset(
  "standard",
  "Standard",
  "The design document's table: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys and spies.",
  "Sonnet",
  "Haiku",
  "Sonnet",
);
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
    const prices = new PriceTable(c.prices);
    const effort = c.leaderEffort === "low" ? 0.6 : c.leaderEffort === "high" ? 1.6 : 1.0;
    let total = 0.0;
    for (const kind of c.leaders.values()) {
      const model = leaderModel(kind);
      if (model === null) continue;
      const price = prices.for(model);
      if (price === null) continue;
      // Orders: the rulebook is read from cache, the season's situation is fresh.
      const orders = price.cost(5000, Math.trunc(3000 * effort), 5000, 0);
      // About one audience a season, at lower effort.
      const audiences = 1.2 * price.cost(3500, Math.trunc(1000 * effort), 5000, 0);
      total += seasons * (orders + audiences);
    }
    const cm = characterModel(c.characters);
    const cp = cm !== null ? prices.for(cm) : null;
    if (cp !== null) total += seasons * 15 * cp.cost(1500, 400, 0, 0);
    const nm = narratorModel(c.narrator);
    const p = nm !== null ? prices.for(nm) : null;
    if (p !== null) {
      total += 18 * p.cost(600, 400, 0, 0) + 7 * p.cost(3000, 1200, 0, 0) + 5 * p.cost(300, 200, 0, 0);
    }
    return total;
  },
  /** The models in use that have no price set: the meter counts them as free. */
  unpriced(c: SeatChoices): string[] {
    const prices = new PriceTable(c.prices);
    return c.models.filter((m) => prices.for(m) === null);
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
 * The providers for the models in use: Anthropic through `anthropic` (the SDK with the player's key, or the simulated
 * API), and each other provider set up through its compatible endpoint with its own key. Keys are held per provider id.
 * Throws, naming what is missing, when a provider in use has no key (a local endpoint needs none: give it "").
 */
export function providersFor(
  choices: SeatChoices,
  anthropic: ApiTransport | null,
  keys: Readonly<Record<string, string>>,
  fetchImpl?: typeof fetch,
  simulated: ApiTransport | null = null,
): Provider[] {
  // The simulated API answers for every provider, so a table can be tried without any key or endpoint.
  if (simulated !== null) return choices.providersInUse.map((id) => new AnthropicProvider(simulated, id));
  const out: Provider[] = [];
  for (const id of choices.providersInUse) {
    if (id === AnthropicId) {
      if (anthropic === null) throw new Error("Model seats need an Anthropic API key.");
      out.push(new AnthropicProvider(anthropic));
      continue;
    }
    const setting = choices.providers.find((p) => p.id === id)!;
    const key = keys[id];
    if (key === undefined) throw new Error(`Models of ${id} need its key (an empty one for a local endpoint).`);
    out.push(new CompatibleProvider(setting, key, fetchImpl));
  }
  return out;
}

/**
 * What the check at setup compiles, per model in use: for each job, the largest of the schemas it sends (every other
 * variant only leaves fields out of it).
 */
export function checkJobs(choices: SeatChoices, config: GameConfig): { model: string; schemas: ReplySchema[] }[] {
  const jobs: { model: string; schemas: ReplySchema[] }[] = [];
  for (const m of new Set([...choices.leaders.values()].map(leaderModel)))
    if (m !== null) jobs.push({ model: m, schemas: [Replies.leaderOrders(config), Replies.hostReply(config, true)] });
  const cm = characterModel(choices.characters);
  if (cm !== null)
    jobs.push({ model: cm, schemas: [Replies.present(), Replies.react(), Replies.report(), Replies.pitch(), Replies.text("report", "Your report home.")] });
  const nm = narratorModel(choices.narrator);
  if (nm !== null) jobs.push({ model: nm, schemas: [Replies.text("persona", "The persona prompt, in the second person.")] });
  return jobs;
}

/**
 * Builds seats for a game. Model seats share one client, which logs every call into the game's log. `providers`: how calls
 * reach each provider in use ({@link providersFor}).
 */
export function buildSeats(choices: SeatChoices, state: GameState, providers: Provider[] | null, log: () => GameLog): SeatSet & { client: ModelClient | null } {
  let client: ModelClient | null = null;
  if (choices.usesModels) {
    if (providers === null || providers.length === 0) throw new Error("Model seats need an Anthropic API key.");
    client = new ModelClient(providers, (call) => log().addCall(call), new PriceTable(choices.prices));
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
  return { seats, minds, narrator, client };
}

/** Reads seat choices back from a log header's labels, to continue a saved game. */
export function choicesFromHeader(header: LogHeader, providers: readonly ProviderSetting[] = []): SeatChoices {
  // A model's label is its model setting (shown as Opus 5.5 and so on for the 5.5 models) and the job: "Opus 5.5 leader".
  // The 5.5 models read back as the presets' shorthands, so a saved preset game still matches its preset.
  const short = (m: string): string => (m === ModelIds.Opus ? "Opus" : m === ModelIds.Sonnet ? "Sonnet" : m === ModelIds.Haiku ? "Haiku" : m);
  const model = (label: string, job: string): string | null => (label.endsWith(` ${job}`) ? short(ModelIds.fromDisplay(label.slice(0, -job.length - 1))) : null);
  const leader = (label: string): LeaderKind => (label === "Human" ? "Human" : label === LocalAgentLabel ? "LocalAgent" : (model(label, "leader") ?? "Script"));
  const c = new SeatChoices();
  // The header keeps seat labels, not endpoints or keys: the providers come from the table as it is set up now.
  c.providers = providers.map((p) => ({ ...p }));
  for (const p of AllPowers) c.leaders.set(p, leader(header.seats.tryGet(p) ?? ""));
  const cm = model(header.minds, "characters");
  c.characters = cm === null || cm === "Script" ? "Script" : cm;
  const nm = model(header.narrator, "narrator");
  c.narrator = nm === null || nm === "Template" ? "Template" : nm;
  return c;
}
