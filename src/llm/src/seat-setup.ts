/**
 * Who plays what (each king's seat, the envoys and spies, and the narrator), and the seats built from it. The presets are in
 * seat-presets.ts, the cost estimate in seat-cost.ts.
 */
import { AllPowers, Dict, type GameConfig, type GameState, type Power } from "@amarna/engine";
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
import type { ReplySchema } from "./schema-tools.ts";
import { Replies } from "./schemas.ts";

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
