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
import { CharacterActor } from "./exchange.ts";
import { LlmCharacterMind } from "./character-mind.ts";
import { NewPlan, alertsReply, planReply, routineCourt } from "./king-ladder.ts";
import { Ladder, counselSchema, withLadder } from "./ladder.ts";
import { Spending, newSpendingSettings, type SpendingSettings } from "./spending.ts";
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
  return k === "Script" || k === "LocalAgent" || k.trim().length === 0 ? null : modelOf(k);
}
/** The model a rung names, or null when the table turned it off ("Off", or nothing). */
export function rungModel(k: string): string | null {
  return k === "Off" || k === "Script" || k === "Template" || k.trim().length === 0 ? null : modelOf(k);
}

/**
 * A king's small rung ("Three rungs for every job"): its seat's own choice, or the job's; null when it is off, or when it
 * is the king's own model, which then does everything itself.
 */
export function smallModel(choices: SeatChoices, p: Power): string | null {
  const king = leaderModel(choices.leaders.get(p));
  const own = choices.smallFor[p];
  const m = rungModel(own !== undefined && own.length > 0 ? own : choices.small);
  return king === null || m === null || m === king ? null : m;
}

/**
 * The model that words a king's standing answers ("phrasing calls" under "Minds follow what is at stake"): its small rung,
 * or else the small model the table chose for its characters, or else the king's own.
 */
export function phrasingModel(choices: SeatChoices, king: string, p: Power | null = null): string {
  return (p !== null ? smallModel(choices, p) : null) ?? characterModel(choices.characters) ?? king;
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
  /** With characters played by local agents: the ids the bridge keeps folders for (its seed's), as its status gave them. */
  bridgeCharacters: string[] = [];
  /** Providers other than Anthropic, each with an OpenAI-compatible endpoint; a model setting names one by its id. */
  providers: ProviderSetting[] = [];
  /** Prices set by the table, by model setting, over the defaults. */
  prices: Record<string, PriceSetting> = {};
  /**
   * The kings' small rung ("Every model is the table's choice"): routine audiences, light alerts and the words of standing
   * answers, Haiku by default; "Off" leaves every envoy to the king's own model, as before item 6c.
   */
  small = "Haiku";
  /** A seat's own small rung over the job's ("" keeps the job's), so that models can be compared. */
  smallFor: Partial<Record<Power, string>> = {};
  /** Who plays a woken king: "large", its own model; or "small", its small rung, with its own model above for what is passed up. */
  plays: "large" | "small" = "large";
  /** The characters' large rung, for what their own model passes up or asks counsel of; "Off" for none. */
  charactersUp = "Sonnet";
  /** The model that writes each king's plan ("Planning"); "Off", the default, plans nothing. */
  planning = "Off";
  /** What the game may spend, and how the layer spends it ("A budget, spent where it buys the most"). */
  spending: SpendingSettings = newSpendingSettings();

  /** Every model a job uses, each once. */
  get models(): string[] {
    const all = [...this.leaders.values()].map(leaderModel);
    all.push(characterModel(this.characters), narratorModel(this.narrator));
    for (const p of AllPowers) all.push(smallModel(this, p));
    if (characterModel(this.characters) !== null) all.push(rungModel(this.charactersUp));
    if ([...this.leaders.values()].some((k) => leaderModel(k) !== null)) all.push(rungModel(this.planning));
    return [...new Set(all.filter((m): m is string => m !== null))];
  }

  /** The table's choices beyond the seats, as the log header keeps them (JSON), so a game can be compared and continued. */
  get jobs(): string {
    if (!this.usesModels) return "";
    return JSON.stringify({ small: this.small, smallFor: this.smallFor, plays: this.plays, charactersUp: this.charactersUp, planning: this.planning, spending: this.spending });
  }

  /** Reads the table's choices beyond the seats back from a log header's JSON. */
  readJobs(json: string): void {
    if (json.trim().length === 0) return;
    const j = JSON.parse(json) as Partial<{ small: string; smallFor: Partial<Record<Power, string>>; plays: "large" | "small"; charactersUp: string; planning: string; spending: Partial<SpendingSettings> }>;
    if (typeof j.small === "string") this.small = j.small;
    if (j.smallFor !== undefined) this.smallFor = { ...j.smallFor };
    if (j.plays === "small" || j.plays === "large") this.plays = j.plays;
    if (typeof j.charactersUp === "string") this.charactersUp = j.charactersUp;
    if (typeof j.planning === "string") this.planning = j.planning;
    if (j.spending !== undefined) this.spending = newSpendingSettings(j.spending);
  }

  /** The providers the models in use name (by id), Anthropic included when a model names no other. */
  get providersInUse(): string[] {
    const ids = this.providers.map((p) => p.id);
    return [...new Set(this.models.map((m) => splitModel(m, ids).provider))];
  }

  /** Local agent kings are not model calls from this program: they need the local bridge, not a key, and cost nothing here. */
  get usesModels(): boolean {
    return [...this.leaders.values()].some((v) => leaderModel(v) !== null) || characterModel(this.characters) !== null || this.narrator !== "Template";
  }

  get usesLocalAgents(): boolean {
    return [...this.leaders.values()].some((v) => v === "LocalAgent") || this.characters === "LocalAgent";
  }

  copy(): SeatChoices {
    const c = new SeatChoices();
    c.leaders = this.leaders.clone();
    c.characters = this.characters;
    c.narrator = this.narrator;
    c.leaderEffort = this.leaderEffort;
    c.bridgeAddress = this.bridgeAddress;
    c.localAgentMinutes = this.localAgentMinutes;
    c.bridgeCharacters = [...this.bridgeCharacters];
    c.providers = this.providers.map((p) => ({ ...p }));
    c.prices = { ...this.prices };
    c.small = this.small;
    c.smallFor = { ...this.smallFor };
    c.plays = this.plays;
    c.charactersUp = this.charactersUp;
    c.planning = this.planning;
    c.spending = { ...this.spending };
    return c;
  }
}

/** A preset's choices beyond the seats: each job's other rungs and planning. */
export interface PresetRungs {
  small: string;
  plays: "large" | "small";
  charactersUp: string;
  planning: string;
}

/** A named way to play. Human seats chosen by the player are kept when a preset is applied. */
export class Preset {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly leaders: LeaderKind;
  readonly characters: CharacterKind;
  readonly narrator: NarratorKind;
  readonly rungs: PresetRungs;
  constructor(
    id: string,
    name: string,
    tagline: string,
    leaders: LeaderKind,
    characters: CharacterKind,
    narrator: NarratorKind,
    rungs: PresetRungs = { small: "Haiku", plays: "large", charactersUp: "Sonnet", planning: "Off" },
  ) {
    this.id = id;
    this.name = name;
    this.tagline = tagline;
    this.leaders = leaders;
    this.characters = characters;
    this.narrator = narrator;
    this.rungs = rungs;
  }
  get needsKey(): boolean {
    return leaderModel(this.leaders) !== null || this.characters !== "Script" || this.narrator !== "Template";
  }
  applyTo(c: SeatChoices): void {
    for (const p of AllPowers) if (c.leaders.get(p) !== "Human") c.leaders.set(p, this.leaders);
    c.characters = this.characters;
    c.narrator = this.narrator;
    c.small = this.rungs.small;
    c.smallFor = {};
    c.plays = this.rungs.plays;
    c.charactersUp = this.rungs.charactersUp;
    c.planning = this.rungs.planning;
  }
  matches(c: SeatChoices): boolean {
    // By the models named, so a shorthand and the model it stands for are the same choice.
    const same = (a: string, b: string, model: (k: string) => string | null): boolean => (model(a) ?? a) === (model(b) ?? b);
    return (
      [...c.leaders.values()].filter((v) => v !== "Human").every((v) => same(v, this.leaders, leaderModel)) &&
      same(c.characters, this.characters, characterModel) &&
      same(c.narrator, this.narrator, narratorModel) &&
      // The other rungs count only where they are in play: a Free table has no small rung to differ by.
      (!this.needsKey ||
        (same(c.small, this.rungs.small, rungModel) &&
          Object.values(c.smallFor).every((v) => v === undefined || v.length === 0) &&
          c.plays === this.rungs.plays &&
          same(c.charactersUp, this.rungs.charactersUp, rungModel) &&
          same(c.planning, this.rungs.planning, rungModel)))
    );
  }
}

const Free = new Preset("free", "Free", "Script kings, envoys and narrator. No key and no cost; a whole game takes seconds.", "Script", "Script", "Template");
const Budget = new Preset("budget", "Budget", "Every role on Haiku 5.5. Cheap enough to play often; the kings plan less shrewdly.", "Haiku", "Haiku", "Haiku", {
  small: "Haiku",
  plays: "large",
  charactersUp: "Off",
  planning: "Off",
});
const Standard = new Preset(
  "standard",
  "Standard",
  "The table the game is built for: Sonnet 5.5 kings and narrator, Haiku 5.5 envoys and spies.",
  "Sonnet",
  "Haiku",
  "Sonnet",
);
const Counsel = new Preset(
  "counsel",
  "Counsel",
  "Haiku 5.5 plays every king and character; Sonnet 5.5 writes each king's plan once a year, gives counsel, takes whatever is passed up and narrates.",
  "Sonnet",
  "Haiku",
  // The narrator on the large model (Haakon, answering item 6c's review, 27 October 2026).
  "Sonnet",
  { small: "Haiku", plays: "small", charactersUp: "Sonnet", planning: "Sonnet" },
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
  Counsel,
  Standard,
  Showcase,
  all: [Free, Budget, Counsel, Standard, Showcase] as readonly Preset[],
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
  /** The median game: half of all ages have ended by season 44 (1332 BCE) by default. */
  TypicalSeasons: 44,
  perGame(c: SeatChoices, seasons = 44): number {
    const prices = new PriceTable(c.prices);
    const effort = c.leaderEffort === "low" ? 0.6 : c.leaderEffort === "high" ? 1.6 : 1.0;
    const cost = (model: string | null, fresh: number, out: number, cached: number): number => {
      const price = model !== null ? prices.for(model) : null;
      return price === null ? 0 : price.cost(fresh, out, cached, 0);
    };
    let total = 0.0;
    for (const p of AllPowers) {
      const model = leaderModel(c.leaders.get(p));
      if (model === null) continue;
      const small = smallModel(c, p);
      // As measured in item 6b (src/batch/src/measure.ts, script games shadowed by model kings that sleep): a king gives
      // orders in about three seasons in ten and holds court, all its envoys in one call, in about one in five. Orders
      // read the rulebook and their schema (some 16,000 tokens) from cache and about 4,500 fresh; a court about 14,000 from
      // cache and 3,500 fresh. A standing answer's phrasing call costs next to nothing.
      const orders = (m: string | null): number => cost(m, 4500, Math.trunc(3000 * effort), 16000);
      const courts = (m: string | null): number => cost(m, 3500, Math.trunc(1000 * effort), 14000);
      // The ladder's first guesses (item 6c, not measured until the model games): a small rung that plays the king passes
      // one decision in five up; routine courts, most of a sleeping king's, one in three; light alerts come in about one
      // season in three; one decision in twenty is audited on the rung above; a plan is written once a year and twice more.
      if (small !== null && c.plays === "small") total += seasons * (0.3 * (orders(small) + 0.2 * orders(model)) + 0.2 * (courts(small) + 0.2 * courts(model)));
      else total += seasons * (0.3 * orders(model) + 0.2 * (small !== null ? courts(small) + 0.3 * courts(model) : courts(model)));
      if (small !== null) total += seasons * (0.3 * cost(small, 3000, 300, 16000) + 0.05 * 0.4 * orders(model));
      const planner = rungModel(c.planning);
      if (planner !== null) total += (seasons / 3 + 2) * cost(planner, 3000, 1000, 16000);
    }
    const cm = characterModel(c.characters);
    if (cm !== null) {
      const up = rungModel(c.charactersUp);
      total += seasons * 15 * (cost(cm, 1500, 400, 0) + (up !== null && up !== cm ? 0.15 * cost(up, 1500, 400, 0) : 0));
    }
    const nm = narratorModel(c.narrator);
    if (nm !== null) total += 18 * cost(nm, 600, 400, 0) + 7 * cost(nm, 3000, 1200, 0) + 5 * cost(nm, 300, 200, 0);
    return total;
  },
  /** The models in use that have no price set: the meter shows their cost as unknown, never as free. */
  unpriced(c: SeatChoices): string[] {
    const prices = new PriceTable(c.prices);
    return c.models.filter((m) => prices.for(m) === null);
  },
  /**
   * The estimate as the setup shows it: unknown while a model in use has no price (never free, so the figure never quietly
   * under-reports), else as {@link describe} words it.
   */
  describeFor(c: SeatChoices, seasons = 44): string {
    const unpriced = CostEstimate.unpriced(c);
    if (unpriced.length > 0) return `unknown (no price for ${unpriced.map(ModelIds.display).join(", ")})`;
    return CostEstimate.describe(CostEstimate.perGame(c, seasons));
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

/**
 * Why a table cannot start, or null: a game with a spending limit does not start until every model it uses has a price,
 * since a limit cannot hold against spending it cannot count ("Every model is the table's choice"); a local model the table
 * prices at nothing is free. A simulated API spends nothing.
 */
export function startProblem(c: SeatChoices, limitUsd: number, simulated = false): string | null {
  if (simulated || !c.usesModels || limitUsd <= 0) return null;
  const unpriced = CostEstimate.unpriced(c);
  if (unpriced.length === 0) return null;
  return `This game has a spending limit, which cannot hold against spending it cannot count: set a price for ${unpriced.map(ModelIds.display).join(", ")} (0 for a free local model) before it begins.`;
}

export interface SeatSet {
  seats: Dict<Power, ISeat>;
  minds: ICharacterMind;
  narrator: INarrator;
}

/** A local agent king's label, in the log header and wherever seats are listed. */
export const LocalAgentLabel = "Local agent";
/** The characters' label when local agents play them (item 8). */
export const LocalAgentCharactersLabel = "Local agent characters";

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
  const planned = (s: ReplySchema): ReplySchema => (rungModel(choices.planning) !== null ? s.extend({ new_plan: NewPlan }) : s);
  const jobs: { model: string; schemas: ReplySchema[] }[] = [];
  for (const m of new Set([...choices.leaders.values()].map(leaderModel)))
    if (m !== null) jobs.push({ model: m, schemas: [Replies.leaderOrders(config), Replies.hostReply(config, true), Replies.courtReply(config, true)] });
  // The phrasing calls of the kings' standing answers go to their small rung, or the characters' model, or the king's own.
  for (const p of AllPowers) {
    const m = leaderModel(choices.leaders.get(p));
    if (m !== null) jobs.push({ model: phrasingModel(choices, m, p), schemas: [Replies.phrase()] });
  }
  // A king's small rung: routine courts and light alerts, and his orders with its own fields when it plays him or the
  // budget gives them to it; above it, the counsel it may ask. Planning: the plan.
  const counsel = counselSchema();
  for (const p of AllPowers) {
    const small = smallModel(choices, p);
    const m = leaderModel(choices.leaders.get(p));
    if (small !== null && m !== null) {
      jobs.push({ model: small, schemas: [withLadder(planned(Replies.leaderOrders(config))), routineCourt(true, config), alertsReply()] });
      jobs.push({ model: m, schemas: [counsel] });
    }
  }
  const planner = rungModel(choices.planning);
  if (planner !== null && [...choices.leaders.values()].some((k) => leaderModel(k) !== null)) {
    jobs.push({ model: planner, schemas: [planReply()] });
    // With planning on, a king's orders may ask for a new plan: the largest orders schema has that field too.
    for (const m of new Set([...choices.leaders.values()].map(leaderModel))) if (m !== null) jobs.push({ model: m, schemas: [planned(Replies.leaderOrders(config))] });
  }
  const cm = characterModel(choices.characters);
  if (cm !== null) {
    const ladder = [Replies.present(), Replies.react(), Replies.report(), Replies.pitch(), Replies.text("report", "Your report home.")];
    jobs.push({ model: cm, schemas: [...ladder.map((x) => withLadder(x)), Replies.text("speech", "")] });
    const up = rungModel(choices.charactersUp);
    if (up !== null && up !== cm) jobs.push({ model: up, schemas: [...ladder, counsel] });
  }
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
  let ladder: Ladder | null = null;
  if (choices.usesModels) {
    if (providers === null || providers.length === 0) throw new Error("Model seats need an Anthropic API key.");
    const prices = new PriceTable(choices.prices);
    client = new ModelClient(providers, (call) => log().addCall(call), prices);
    // The ladder of every job, and the budget it spends ("Minds follow what is at stake").
    const spending = new Spending(choices.spending, state.config, state.seed, () => log().totalCost);
    ladder = new Ladder(client, spending, prices, { route: (key, r) => log().route(key, r), audit: (a) => log().addAudit(a) });
  }
  // Local play: every local agent king goes through the one bridge, as a file seat whose files the bridge writes.
  const bridge = choices.usesLocalAgents ? new LocalBridge(choices.bridgeAddress, Math.min(Math.max(choices.localAgentMinutes, 1), 24 * 60) * 60000) : null;

  const bridgeCharacters = new Set(choices.bridgeCharacters);
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
            ? new LlmLeaderSeat(p, client!, model, choices.leaderEffort, state.config.customsPrimer, state.config, null, phrasingModel(choices, model, p), {
                ladder: ladder!,
                small: smallModel(choices, p),
                plays: choices.plays,
                planning: rungModel(choices.planning),
              })
            : script,
    );
  }
  // Model characters' decisions are logged beside the script's for the same situations (the log's shadow lines).
  const cm = characterModel(choices.characters);
  let minds: ICharacterMind = new ScriptMind();
  // Characters played by local agents (item 8): each through the bridge, by its id, as the simulation kit's file characters
  // are through their folders; one the bridge keeps no folder for is a script.
  if (choices.characters === "LocalAgent") {
    const m = new LlmCharacterMind(
      (c) => (bridgeCharacters.has(c.id) ? new BridgeExchange(bridge!, c.id, (call) => log().addCall(call), CharacterActor) : null),
      BridgeExchange.Model,
      LocalAgentCharactersLabel,
    );
    m.shadow = (s) => log().addShadow(s);
    minds = m;
  } else if (cm !== null) {
    const m = new LlmCharacterMind(client!, cm, null, { ladder: ladder!, up: rungModel(choices.charactersUp) });
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
  c.characters = header.minds === LocalAgentCharactersLabel ? "LocalAgent" : cm === null || cm === "Script" ? "Script" : cm;
  const nm = model(header.narrator, "narrator");
  c.narrator = nm === null || nm === "Template" ? "Template" : nm;
  // A game saved before item 6c kept no other rungs: it goes on with the king's own model answering every envoy, as it was played.
  if (header.jobs.trim().length > 0) c.readJobs(header.jobs);
  else {
    c.small = "Off";
    c.charactersUp = "Off";
  }
  return c;
}
