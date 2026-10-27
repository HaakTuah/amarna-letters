/**
 * The model provider. A call is one structured request: a cached shared system block, a per-seat system block, one user
 * message and a JSON schema. The Anthropic Messages API is reached through a transport: fetch (the browser and Node alike),
 * or the simulated API (tests and the "simulate" option). Every call is logged with its prompt, output, usage and cost.
 * Output is constrained by a JSON schema; an unreadable reply is retried once with the error, then the caller falls back to
 * a script decision.
 */
import { raw, write } from "@amarna/engine";
import { newModelCall, type ModelCall } from "@amarna/game";
import { ModelIds, Price } from "./models.ts";
import type { JsonObject } from "./schemas.ts";

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
  model: string;
  /** Stable text shared by many calls (rules, map, primer); marked for prompt caching. */
  sharedSystem: string;
  seatSystem?: string;
  user: string;
  schema: JsonObject;
  effort?: string;
  maxTokens?: number;
}

/** What one call returned, however it was made. */
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

/** Whoever answers a structured request: the API, a file exchange, or a local bridge. */
export interface JsonAsker {
  askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject>;
}

/** How one request reaches the Messages API (the provider interface). */
export interface ApiTransport {
  send(spec: CallSpec, body: JsonObject, signal?: AbortSignal): Promise<ApiResult>;
}

export const FallbackBeta = "server-side-fallback-2026-07-01";
export const ApiVersion = "2023-06-01";

/** The request body of a call, as the Messages API takes it. */
export function requestBody(spec: CallSpec, user: string): JsonObject {
  const system: JsonObject[] = [{ type: "text", text: spec.sharedSystem, cache_control: { type: "ephemeral" } }];
  const seat = spec.seatSystem ?? "";
  if (seat.length > 0) system.push({ type: "text", text: seat });
  const effort = spec.effort ?? "medium";
  const body: JsonObject = {
    model: spec.model,
    max_tokens: spec.maxTokens ?? 16000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: {
      effort: effort === "low" || effort === "high" ? effort : "medium",
      format: { type: "json_schema", schema: structuredClone(spec.schema) },
    },
  };
  if (ModelIds.supportsFallback(spec.model)) body.fallbacks = "default";
  return body;
}

/** A request body as the C# build writes it (System.Text.Json's escaping): what the text fingerprints hash. */
export function bodyText(body: JsonObject): string {
  return write(raw, body);
}

export class ClaudeClient implements JsonAsker {
  private readonly log: (call: ModelCall) => void;
  private readonly transport: ApiTransport;

  constructor(transport: ApiTransport, log: (call: ModelCall) => void) {
    this.transport = transport;
    this.log = log;
  }

  async askJson(spec: CallSpec, signal?: AbortSignal): Promise<JsonObject> {
    let user = spec.user;
    for (let attempt = 1; ; attempt++) {
      const text = await this.call(spec, user, signal);
      try {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          throw new SyntaxError(e instanceof Error ? e.message : String(e));
        }
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new ModelOutputError("the reply was not a JSON object");
        return parsed as JsonObject;
      } catch (ex) {
        if (attempt !== 1 || !(ex instanceof SyntaxError || ex instanceof ModelOutputError)) throw ex;
        user = spec.user + `\n\n(Your previous reply could not be read: ${ex.message}. Reply with one JSON object that matches the schema.)`;
      }
    }
  }

  private async call(spec: CallSpec, user: string, signal?: AbortSignal): Promise<string> {
    const call = newModelCall({ key: spec.key, turn: spec.turn, role: spec.role, model: spec.model, system: spec.seatSystem ?? "", prompt: user });
    try {
      const r = await this.transport.send(spec, requestBody(spec, user), signal);
      call.inputTokens = r.input;
      call.outputTokens = r.output;
      call.cacheReadTokens = r.cacheRead;
      call.cacheWriteTokens = r.cacheWrite;
      call.costUsd = Price.for(spec.model).cost(r.input, r.output, r.cacheRead, r.cacheWrite);
      call.usedFallback = r.model.length > 0 && r.model !== spec.model;
      call.output = r.text;
      if (r.stopReason === "refusal") {
        call.error = "refusal";
        throw new ModelRefusedError(spec.model, r.category);
      }
      if (r.stopReason === "max_tokens") call.error = "max_tokens";
      return r.text;
    } catch (ex) {
      if (call.error === null) call.error = ex instanceof Error ? ex.message : String(ex);
      throw ex;
    } finally {
      this.log(call);
    }
  }
}

/** The Messages API over fetch, with the player's own key (in the browser, with the header for direct browser access). */
export class FetchTransport implements ApiTransport {
  private readonly apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(spec: CallSpec, body: JsonObject, signal?: AbortSignal): Promise<ApiResult> {
    const text = JSON.stringify(body);
    for (let attempt = 0; ; attempt++) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ApiVersion,
        "anthropic-dangerous-direct-browser-access": "true",
      };
      if (ModelIds.supportsFallback(spec.model)) headers["anthropic-beta"] = FallbackBeta;
      let response: Response;
      try {
        response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: text, signal });
      } catch (e) {
        if (signal?.aborted || attempt >= 2) throw e;
        await delay(backoff(attempt, null), signal);
        continue;
      }
      const reply = await response.text();
      const status = response.status;
      if (response.ok) return read(reply);
      const retryable = status === 408 || status === 409 || status === 429 || status >= 500;
      if (retryable && attempt < 2) {
        const after = Number(response.headers.get("retry-after"));
        await delay(backoff(attempt, Number.isFinite(after) && after > 0 ? after * 1000 : null), signal);
        continue;
      }
      throw new Error(`Anthropic API ${status}: ${errorMessage(reply)}`);
    }
  }
}

const backoff = (attempt: number, retryAfterMs: number | null): number =>
  retryAfterMs !== null && retryAfterMs > 0 && retryAfterMs < 60000 ? retryAfterMs : 1500 * (1 << attempt);

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

function errorMessage(body: string): string {
  try {
    const o = JSON.parse(body) as { error?: { message?: string } };
    return o?.error?.message ?? body;
  } catch {
    return body.length > 300 ? body.slice(0, 300) : body;
  }
}

function read(json: string): ApiResult {
  const o = JSON.parse(json) as {
    content?: { type?: string; text?: string }[];
    usage?: Record<string, unknown>;
    stop_reason?: string;
    stop_details?: { category?: string };
    model?: string;
  };
  const text = (o.content ?? [])
    .filter((b) => b?.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const n = (k: string): number => {
    const v = o.usage?.[k];
    return typeof v === "number" && Number.isInteger(v) ? v : 0;
  };
  return {
    text,
    stopReason: o.stop_reason ?? null,
    category: o.stop_details?.category ?? null,
    model: o.model ?? "",
    input: n("input_tokens"),
    output: n("output_tokens"),
    cacheRead: n("cache_read_input_tokens"),
    cacheWrite: n("cache_creation_input_tokens"),
  };
}
