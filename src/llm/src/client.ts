/**
 * The model layer's one small interface ("Built to outlive its models"). A call is one structured request: a cached shared
 * system block, a per-seat system block, one user message and a reply schema (Zod, "One source for model schemas"). The
 * client sends it to whichever provider its model names, validates the reply against the schema, sends an unfit reply
 * back once with its errors, and otherwise throws, so the runner's script stands in. Every call is logged, the retry too.
 */
import { newModelCall, type ModelCall } from "@amarna/game";
import { ModelIds, PriceTable } from "./models.ts";
import { jsonSchema, problems, type JsonObject, type ReplySchema } from "./schemas.ts";

export class ModelRefusedError extends Error {
  constructor(model: string, category: string | null) {
    super(`${ModelIds.display(model)} declined (${category ?? "no category"}).`);
  }
}

export class ModelOutputError extends Error {}

/** One structured call. */
export interface CallSpec {
  key: string;
  turn: number;
  role: string;
  /** The model, as a setting names it: "claude-sonnet-5-5", or "<provider>:<model>" for another provider. */
  model: string;
  /** Stable text shared by many calls (rules, map, primer); marked for prompt caching where the provider offers it. */
  sharedSystem: string;
  seatSystem?: string;
  user: string;
  schema: ReplySchema;
  /**
   * Strict (grammar-constrained) only where a malformed reply would do real harm; never for orders, since every reply is
   * validated and a script stands in anyway. No call in the game is strict today.
   */
  strict?: boolean;
  effort?: string;
  maxTokens?: number;
}

/** What one call returned, however it was made: the reply's JSON text and the call's usage. */
export interface ApiResult {
  text: string;
  stopReason: string | null;
  category: string | null;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Whoever answers a structured request: a provider, a file exchange, or a local bridge. */
export interface JsonAsker {
  askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject>;
}

/** One provider's adapter: its own format for system prompts and structured replies. */
export interface Provider {
  readonly id: string;
  /** Sends one call (the user text given, which carries the retry note on a second try) to this provider's model. */
  send(spec: CallSpec, model: string, user: string, signal?: AbortSignal): Promise<ApiResult>;
  /**
   * The check at setup: has this provider take one schema for one model as a call would send it, so a schema it cannot
   * compile, or a model it does not have, fails before the game starts. Throws with the provider's reason.
   */
  check(model: string, schema: ReplySchema, strict: boolean, signal?: AbortSignal): Promise<void>;
}

/** The provider id a model setting names, and the model itself: "local:llama3.1:8b" is model "llama3.1:8b" of "local". */
export function splitModel(ref: string, providers: Iterable<string>): { provider: string; model: string } {
  const i = ref.indexOf(":");
  if (i > 0) {
    const id = ref.slice(0, i);
    for (const p of providers) if (p === id) return { provider: id, model: ref.slice(i + 1) };
  }
  return { provider: AnthropicId, model: ref };
}

export const AnthropicId = "anthropic";

/** The note a reply that does not fit is sent back with, once. */
export const retryNote = (error: string): string => `\n\n(Your previous reply could not be used: ${error}. Reply again with every field of the schema.)`;

/** The reply's JSON object, read from its text: the whole text, or else the outermost {...} in it. */
export function readObject(text: string): JsonObject | null {
  const asObject = (s: string): JsonObject | null => {
    try {
      const v: unknown = JSON.parse(s);
      return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : null;
    } catch {
      return null;
    }
  };
  const whole = asObject(text);
  if (whole !== null) return whole;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start < 0 || end <= start ? null : asObject(text.slice(start, end + 1));
}

/** Why a reply's text cannot be used, or null when it fits its schema. */
export function unfit(text: string, schema: ReplySchema): string | null {
  const json = readObject(text);
  if (json === null) return "it was not one JSON object";
  const found = problems(json, schema);
  return found.length === 0 ? null : "it does not match the schema: " + found.join("; ");
}

export class ModelClient implements JsonAsker {
  private readonly providers: Map<string, Provider>;
  private readonly log: (call: ModelCall) => void;
  readonly prices: PriceTable;

  constructor(providers: Provider | Provider[], log: (call: ModelCall) => void, prices: PriceTable = new PriceTable()) {
    this.providers = new Map((Array.isArray(providers) ? providers : [providers]).map((p) => [p.id, p] as const));
    this.log = log;
    this.prices = prices;
  }

  private route(ref: string): { provider: Provider; model: string } {
    const { provider, model } = splitModel(ref, this.providers.keys());
    const p = this.providers.get(provider);
    if (p === undefined) throw new Error(`No ${provider} provider is set up (for ${ref}).`);
    return { provider: p, model };
  }

  async askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject> {
    let user = spec.user;
    for (let attempt = 1; ; attempt++) {
      const text = await this.call(spec, user, attempt, signal);
      const json = readObject(text);
      if (json !== null && problems(json, spec.schema).length === 0) return spec.schema.parse(json) as JsonObject;
      // The call's log line already says why; a second unfit reply throws, and the script stands in.
      const why = unfit(text, spec.schema)!;
      if (attempt !== 1) throw new ModelOutputError(why);
      user = spec.user + retryNote(why);
    }
  }

  private async call(spec: CallSpec, user: string, attempt: number, signal?: AbortSignal): Promise<string> {
    const call = newModelCall({ key: spec.key, turn: spec.turn, role: spec.role, model: spec.model, system: spec.seatSystem ?? "", prompt: user, attempt });
    try {
      const { provider, model } = this.route(spec.model);
      const r = await provider.send(spec, model, user, signal);
      call.inputTokens = r.input;
      call.outputTokens = r.output;
      call.cacheReadTokens = r.cacheRead;
      call.cacheWriteTokens = r.cacheWrite;
      call.costUsd = this.prices.cost(spec.model, r.input, r.output, r.cacheRead, r.cacheWrite);
      call.unpriced = this.prices.for(spec.model) === null;
      call.usedFallback = r.model.length > 0 && r.model !== model;
      call.output = r.text;
      if (r.stopReason === "refusal") {
        call.error = "refusal";
        throw new ModelRefusedError(spec.model, r.category);
      }
      if (r.stopReason === "max_tokens") call.error = "max_tokens";
      const why = unfit(r.text, spec.schema);
      if (why !== null) call.error = (call.error !== null ? call.error + ": " : "") + why;
      return r.text;
    } catch (ex) {
      if (call.error === null) call.error = ex instanceof Error ? ex.message : String(ex);
      throw ex;
    } finally {
      this.log(call);
    }
  }

  /**
   * The check at setup ("One source for model schemas"): each schema compiled once against the provider of each model in
   * use, so a schema too large, or a model a provider does not have, fails here and not in the middle of a game. Each job
   * is checked with the largest of its schemas; the others only leave fields out of it, so they are smaller still.
   */
  async check(jobs: { model: string; schemas: ReplySchema[] }[], signal?: AbortSignal): Promise<void> {
    const seen = new Set<string>();
    const failed: string[] = [];
    for (const job of jobs)
      for (const schema of job.schemas) {
        const id = job.model + "\n" + JSON.stringify(jsonSchema(schema));
        if (seen.has(id)) continue;
        seen.add(id);
        try {
          const { provider, model } = this.route(job.model);
          await provider.check(model, schema, false, signal);
        } catch (ex) {
          if (ex instanceof Error && ex.name === "AbortError") throw ex;
          failed.push(`${ModelIds.display(job.model)}: ${ex instanceof Error ? ex.message : String(ex)}`);
        }
      }
    if (failed.length > 0) throw new Error(`The model check at setup failed, so the game did not start. ${failed.join(" ")}`);
  }
}
