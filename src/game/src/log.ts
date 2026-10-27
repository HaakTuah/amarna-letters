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
  /** The rules version the game was played under ({@link GameState.CurrentVersion} for a new game). */
  version: number;
  seed: number;
  config: GameConfig;
  seats: Dict<Power, string>;
  /** Seats that may sleep in this game (when the config allows sleeping seats). */
  sleepers: Power[];
  minds: string;
  narrator: string;
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

/** One logged decision: its key and its JSON, as recorded. */
export interface Decision {
  key: string;
  json: string;
}

export class GameLog {
  header: LogHeader = newLogHeader();
  readonly decisions: Decision[] = [];
  readonly calls: ModelCall[] = [];
  /** Model characters' decisions beside the script's for the same situations. Not used in replay. */
  readonly shadows: ShadowDecision[] = [];
  private readonly index = new Map<string, string>();

  /** Records a decision under its key, once: a key already recorded keeps its first value. */
  record<T>(key: string, schema: Schema, value: T): void {
    if (this.index.has(key)) return;
    const json = serialize(schema, value);
    this.index.set(key, json);
    this.decisions.push({ key, json });
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

  get totalCost(): number {
    return this.calls.reduce((s, c) => s + c.costUsd, 0);
  }

  /** The log as JSON lines: the header, every decision, every call, then the shadows ordered by turn and key. */
  toJsonl(): string {
    let out = withType(serialize(LogHeaderSchema, this.header), "header") + "\n";
    for (const d of this.decisions) out += `{"type":"decision","key":${quote(d.key)},"value":${d.json}}\n`;
    for (const c of this.calls) out += withType(serialize(ModelCallSchema, c), "call") + "\n";
    // Ordered by key, so that two runs of a game write the same lines whatever order parallel calls finished in.
    for (const sh of sortBy(this.shadows, [(x: ShadowDecision) => x.turn, cmpNum], [(x: ShadowDecision) => x.key, cmpStr]))
      out += withType(serialize(ShadowDecisionSchema, sh), "shadow") + "\n";
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
          log.index.set(key, json);
          log.decisions.push({ key, json });
          break;
        }
        case "call":
          log.calls.push(deserialize<ModelCall>(ModelCallSchema, line));
          break;
        case "shadow":
          log.shadows.push(deserialize<ShadowDecision>(ShadowDecisionSchema, line));
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
