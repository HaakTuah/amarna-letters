/**
 * The log is the save game, the replay and the analysis data: the seed and config, every decision any seat or character
 * made (keyed, so replays are exact), and every model call. Written as JSON lines exactly as the C# build writes them.
 */
import {
  CURRENT_VERSION,
  D,
  Dict,
  GameConfigSchema,
  I,
  B,
  S,
  cmpNum,
  cmpStr,
  deserialize,
  dict,
  list,
  newGameConfig,
  obj,
  opt,
  quote,
  serialize,
  sortBy,
  type GameConfig,
  type ObjSchema,
  type Power,
  type Schema,
} from "@amarna/engine";

export interface LogHeader {
  /** The rules version the game was played under ({@link CURRENT_VERSION} for a new game). */
  version: number;
  seed: number;
  config: GameConfig;
  seats: Dict<Power, string>;
  /** Seats that may sleep in this game (when the config allows sleeping seats). */
  sleepers: Power[];
  minds: string;
  narrator: string;
  /**
   * The table's choices for every job beyond the seats ("Every model is the table's choice"): each job's ladder, planning,
   * the spending limit, a season's cost or a target, and the share audited, as JSON (the model layer reads it back). Empty
   * in a game with no model jobs, and in logs written before item 6c.
   */
  jobs: string;
  note: string;
}

export function newLogHeader(init: Partial<LogHeader> = {}): LogHeader {
  return {
    version: CURRENT_VERSION,
    seed: 0,
    config: newGameConfig(),
    seats: new Dict(),
    sleepers: [],
    minds: "",
    narrator: "",
    jobs: "",
    note: "",
    ...init,
  };
}

export const LogHeaderSchema: ObjSchema<LogHeader> = obj("LogHeader", newLogHeader, {
  version: I,
  seed: I,
  config: GameConfigSchema,
  seats: dict(S),
  sleepers: list(S),
  minds: S,
  narrator: S,
  jobs: S,
  note: S,
});

/** One language-model call, kept for replay review, cost accounting and analysis. */
export interface ModelCall {
  key: string;
  turn: number;
  role: string;
  model: string;
  system: string;
  prompt: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  usedFallback: boolean;
  error: string | null;
  /**
   * For a file seat or file character: the length in characters of the request file it wrote (the last one, if it was
   * retried), since such a call has no token counts. 0 for API calls, whose size is in the token counts.
   */
  requestChars: number;
  /** 1 for a call, 2 for the retry that sends an unfit reply back with its errors. */
  attempt: number;
  /** The model has no price: its cost is unknown, never counted as free ("Every model is the table's choice"). */
  unpriced: boolean;
}

export function newModelCall(init: Partial<ModelCall> = {}): ModelCall {
  return {
    key: "",
    turn: 0,
    role: "",
    model: "",
    system: "",
    prompt: "",
    output: "",
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
    usedFallback: false,
    error: null,
    requestChars: 0,
    attempt: 1,
    unpriced: false,
    ...init,
  };
}

export const ModelCallSchema: ObjSchema<ModelCall> = obj("ModelCall", newModelCall, {
  key: S,
  turn: I,
  role: S,
  model: S,
  system: S,
  prompt: S,
  output: S,
  inputTokens: I,
  outputTokens: I,
  cacheReadTokens: I,
  cacheWriteTokens: I,
  costUsd: D,
  usedFallback: B,
  error: S,
  requestChars: I,
  attempt: I,
  unpriced: B,
});

/**
 * One decision a model character made, beside what the script mind with the same traits decides in the same situation
 * ({@link Bots.ScriptMind}, which draws no dice of the game's own), for comparing the two. Logged only; nothing in
 * the game reads it, so a game plays and replays the same with or without it.
 */
export interface ShadowDecision {
  /** The call's key ("t3/aud/present/c5"), as in the model call it goes with. */
  key: string;
  turn: number;
  /** present, react, report, pitch, spy or memory. */
  kind: string;
  character: string;
  name: string;
  /** Its traits, "loyalty/greed/competence/ambition/courage", with the court it favours if any. */
  traits: string;
  /** What it faced: gold carried, a gift or a post offered (the numbers the counts need). */
  goldCarried: number;
  giftOffered: number;
  serviceOffered: number;
  /**
   * What the engine knows happened that a report should not hide or contradict ({@link CharacterChecks.Known}).
   */
  known: string[];
  /**
   * The model's decision; null when its reply failed and the script stood in (then {@link Error} says why).
   */
  model: CharacterChoice | null;
  script: CharacterChoice;
  error: string | null;
}

export function newShadowDecision(init: Partial<ShadowDecision> = {}): ShadowDecision {
  return {
    key: "",
    turn: 0,
    kind: "",
    character: "",
    name: "",
    traits: "",
    goldCarried: 0,
    giftOffered: 0,
    serviceOffered: 0,
    known: [],
    model: null,
    script: newCharacterChoice(),
    error: null,
    ...init,
  };
}

export const ShadowDecisionSchema: ObjSchema<ShadowDecision> = obj("ShadowDecision", newShadowDecision, {
  key: S,
  turn: I,
  kind: S,
  character: S,
  name: S,
  traits: S,
  goldCarried: I,
  giftOffered: I,
  serviceOffered: I,
  known: list(S),
  model: () => CharacterChoiceSchema,
  script: () => CharacterChoiceSchema,
  error: S,
});

/** One character decision in a form both minds share, with what the checks found in its words. */
export interface CharacterChoice {
  /** The speech, report, pitch or summary. */
  text: string;
  /** Gold kept for itself (present and report). */
  kept: number;
  swap: boolean;
  acceptGift: boolean;
  acceptService: boolean;
  commitments: string;
  /** The asking price of a pitch. */
  price: number;
  /** For a spy's report: how many of its observations its words leave out. */
  dropped: number;
  /**
   * What {@link CharacterChecks} found its words hide or contradict ("hid-gift", "softened-threat", ...).
   */
  flags: string[];
}

export function newCharacterChoice(init: Partial<CharacterChoice> = {}): CharacterChoice {
  return {
    text: "",
    kept: 0,
    swap: false,
    acceptGift: false,
    acceptService: false,
    commitments: "",
    price: 0,
    dropped: 0,
    flags: [],
    ...init,
  };
}

export const CharacterChoiceSchema: ObjSchema<CharacterChoice> = obj("CharacterChoice", newCharacterChoice, {
  text: S,
  kept: I,
  swap: B,
  acceptGift: B,
  acceptService: B,
  commitments: S,
  price: I,
  dropped: I,
  flags: list(S),
});

/**
 * The log is the save game, the replay and the analysis data: the seed and config, every
 * decision any seat or character made (keyed, so replays are exact), and every model call.
 */

/**
 * Who wrote a decision ("Who wrote it" under Spectator mode): a model, a script, a human, a file seat or file character
 * (an agent answering through files), or a fallback, the script standing in when the call of the seat named failed.
 */
export type AuthorKind = "model" | "script" | "human" | "file" | "fallback";

export interface Authorship {
  kind: AuthorKind;
  /** The seat, characters or narrator as labelled ("Sonnet 5.5 leader", "Script bot"); for a fallback, the one it stood in for. */
  name: string;
  /** Why a fallback stood in: the failed call's error. Empty otherwise. */
  reason: string;
  /**
   * The rung of the mind's ladder that took the decision ("Minds follow what is at stake"): "script", "small" or "large", with
   * the model that answered, and why it went there ("routine", "passed up: ...", "the budget"). Empty where no ladder chose.
   */
  rung: string;
  model: string;
  why: string;
}

export function newAuthorship(init: Partial<Authorship> = {}): Authorship {
  return { kind: "script", name: "", reason: "", rung: "", model: "", why: "", ...init };
}

export const AuthorshipSchema: ObjSchema<Authorship> = obj("Authorship", newAuthorship, { kind: S, name: S, reason: S, rung: S, model: S, why: S });
/** An authorship no ladder routed is written as before item 6c, so the logs of games without one stay the same. */
const UnroutedSchema: ObjSchema<Authorship> = obj("Authorship", newAuthorship, { kind: S, name: S, reason: S });

/** Which rung of a ladder took a decision, and why, as the model layer tells the log before the decision is recorded. */
export interface Route {
  rung: "script" | "small" | "large";
  model: string;
  why: string;
}

/**
 * One audit ("Audits" under "Minds follow what is at stake"): a decision a lower rung took, also put out of play to the rung
 * above. The answer above is never used; the log keeps whether the two differed and how much it would have mattered.
 */
export interface Audit {
  key: string;
  turn: number;
  /** The kind of decision ("orders", "court", "present", ...). */
  kind: string;
  rung: string;
  model: string;
  above: string;
  /** How far the two answers differ, 0 (the same) to 1, and that weighed by what the decision could move. */
  differ: number;
  mattered: number;
}

export function newAudit(init: Partial<Audit> = {}): Audit {
  return { key: "", turn: 0, kind: "", rung: "", model: "", above: "", differ: 0, mattered: 0, ...init };
}

export const AuditSchema: ObjSchema<Audit> = obj("Audit", newAudit, { key: S, turn: I, kind: S, rung: S, model: S, above: S, differ: D, mattered: D });

/** What kind of author a label names: the labels of the seats, minds and narrators the game builds. */
export function authorKind(label: string): AuthorKind {
  if (label === "Human") return "human";
  if (/^(File seat|File characters|Local agent)\b/.test(label)) return "file";
  if (/^(Script|Baseline|Template)\b/.test(label)) return "script";
  return "model";
}

/** A season's fallbacks: how many decisions models and file seats were asked for, and those a script made in their place. */
export interface SeasonFallbacks {
  asked: number;
  fallen: { key: string; name: string; reason: string }[];
}

/** Who wrote each part of one message trail (null where nothing was written yet, or in a log that kept no authors). */
export interface TrailAuthors {
  letter: Authorship | null;
  said: Authorship | null;
  /** By exchange, the host's answers and the envoy's. */
  answered: (Authorship | null)[];
  replied: (Authorship | null)[];
  report: Authorship | null;
}

/** The fallbacks of a season (turn), read from the authors in the log. */
export function seasonFallbacks(log: GameLog, turn: number): SeasonFallbacks {
  const out: SeasonFallbacks = { asked: 0, fallen: [] };
  const prefix = `t${turn}/`;
  for (const d of log.decisions) {
    if (d.by === null || !d.key.startsWith(prefix) || !(d.by.kind === "model" || d.by.kind === "file" || d.by.kind === "fallback")) continue;
    out.asked++;
    if (d.by.kind === "fallback") out.fallen.push({ key: d.key, name: d.by.name, reason: d.by.reason });
  }
  return out;
}

/** One logged decision: its key and its JSON, as recorded, and who wrote it (null in logs written before authors were kept). */
export interface Decision {
  key: string;
  json: string;
  by: Authorship | null;
}

export class GameLog {
  header: LogHeader = newLogHeader();
  readonly decisions: Decision[] = [];
  readonly calls: ModelCall[] = [];
  /** Model characters' decisions beside the script's for the same situations. Not used in replay. */
  readonly shadows: ShadowDecision[] = [];
  /** The audits of lower rungs' decisions. Not used in replay. */
  readonly audits: Audit[] = [];
  private readonly index = new Map<string, string>();
  private readonly authors = new Map<string, Authorship>();
  /** Routes told before their decisions are recorded, by decision key. */
  private readonly routes = new Map<string, Route>();

  /** The model layer tells which rung takes the decision under a key; its authorship carries it when it is recorded. */
  route(key: string, r: Route): void {
    this.routes.set(key, r);
  }

  /**
   * Records a decision under its key, once: a key already recorded keeps its first value. A route told for the key goes
   * into its authorship; a decision the script took at the bottom of a ladder is the script's, not the model's.
   */
  record<T>(key: string, schema: Schema, value: T, by: Authorship | null = null): void {
    if (this.index.has(key)) return;
    const r = this.routes.get(key);
    if (r !== undefined) {
      this.routes.delete(key);
      if (by !== null && by.kind !== "fallback")
        by = { ...by, kind: r.rung === "script" ? "script" : by.kind, name: r.rung === "script" ? `Script, for ${by.name}` : by.name, rung: r.rung, model: r.model, why: r.why };
    }
    const json = serialize(schema, value);
    this.index.set(key, json);
    this.decisions.push({ key, json, by });
    if (by !== null) this.authors.set(key, by);
  }

  /** Who wrote the decision under a key, or null. */
  authorOf(key: string): Authorship | null {
    return this.authors.get(key) ?? null;
  }

  /** The decision recorded under a key, read back by its schema, or undefined. */
  tryGet<T>(key: string, schema: Schema): T | undefined {
    const json = this.index.get(key);
    if (json === undefined) return undefined;
    return deserialize<T>(schema, json);
  }

  has(key: string): boolean {
    return this.index.has(key);
  }

  addCall(call: ModelCall): void {
    this.calls.push(call);
  }

  addShadow(shadow: ShadowDecision): void {
    this.shadows.push(shadow);
  }

  addAudit(audit: Audit): void {
    this.audits.push(audit);
  }

  get totalCost(): number {
    return this.calls.reduce((s, c) => s + c.costUsd, 0);
  }

  /** Whether a call was made to a model with no price: the meter then shows its spend as unknown beside what it counts. */
  get costUnknown(): boolean {
    return this.calls.some((c) => c.unpriced);
  }

  /** The log as JSON lines: the header, every decision, every call, then the shadows ordered by turn and key. */
  /** The decisions' lines written so far: decisions are only ever appended, so the lines of the earlier ones stand (item 17a). */
  private jsonlDecisions = { count: 0, text: "" };

  toJsonl(): string {
    let out = withType(serialize(LogHeaderSchema, this.header), "header") + "\n";
    const cache = this.jsonlDecisions;
    for (let i = cache.count; i < this.decisions.length; i++) {
      const d = this.decisions[i];
      cache.text += `{"type":"decision","key":${quote(d.key)}${d.by !== null ? `,"by":${serialize(d.by.rung === "" ? UnroutedSchema : AuthorshipSchema, d.by)}` : ""},"value":${d.json}}\n`;
    }
    cache.count = this.decisions.length;
    out += cache.text;
    for (const c of this.calls) out += withType(serialize(ModelCallSchema, c), "call") + "\n";
    // Ordered by key, so that two runs of a game write the same lines whatever order parallel calls finished in.
    for (const sh of sortBy(this.shadows, [(x: ShadowDecision) => x.turn, cmpNum], [(x: ShadowDecision) => x.key, cmpStr]))
      out += withType(serialize(ShadowDecisionSchema, sh), "shadow") + "\n";
    for (const a of sortBy(this.audits, [(x: Audit) => x.turn, cmpNum], [(x: Audit) => x.key, cmpStr])) out += withType(serialize(AuditSchema, a), "audit") + "\n";
    return out;
  }

  static fromJsonl(text: string): GameLog {
    const log = new GameLog();
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (line.length === 0) continue;
      const node = JSON.parse(line) as Record<string, unknown>;
      switch (node.type) {
        case "header":
          log.header = deserialize<LogHeader>(LogHeaderSchema, line);
          break;
        case "decision": {
          const key = node.key as string;
          // The value's JSON as written: the rest of the line after its "value" key (the last in the line).
          const at = line.indexOf('"value":');
          const json = at < 0 ? "null" : line.slice(at + 8, line.length - 1);
          const by = node.by !== undefined && node.by !== null ? deserialize<Authorship>(AuthorshipSchema, JSON.stringify(node.by)) : null;
          log.index.set(key, json);
          log.decisions.push({ key, json, by });
          if (by !== null) log.authors.set(key, by);
          break;
        }
        case "call":
          log.calls.push(deserialize<ModelCall>(ModelCallSchema, line));
          break;
        case "shadow":
          log.shadows.push(deserialize<ShadowDecision>(ShadowDecisionSchema, line));
          break;
        case "audit":
          log.audits.push(deserialize<Audit>(AuditSchema, line));
          break;
      }
    }
    return log;
  }
}

/** A JSON object with "type" added as its last property, as the C# build adds it to a serialized node. */
function withType(json: string, type: string): string {
  return json === "{}" ? `{"type":"${type}"}` : `${json.slice(0, -1)},"type":"${type}"}`;
}
