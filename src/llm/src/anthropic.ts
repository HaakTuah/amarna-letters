/**
 * The Anthropic provider: the Messages API through the official TypeScript SDK (in the browser with the player's own key
 * and the header for direct browser access, in the batch runner and the tests alike), or through a stand-in transport
 * (the simulated API). The reply schema goes as the one tool the model answers with; a strict call (none today) sets the
 * tool's strict flag, which compiles a grammar, and an ordinary one does not, so no schema is ever too large to compile.
 * The check at setup counts a call's tokens with its tool, which costs nothing.
 */
import Anthropic from "@anthropic-ai/sdk";
import { raw, write } from "@amarna/engine";
import { AnthropicId, type ApiResult, type CallSpec, type Provider } from "./client.ts";
import { ApiStatusError, retryAfterMs } from "./limiter.ts";
import { ModelIds } from "./models.ts";
import { jsonSchema, type JsonObject, type ReplySchema } from "./schema-tools.ts";

export const FallbackBeta = "server-side-fallback-2026-07-01";

/**
 * Anthropic's documented limits on strict tools in one request: 20 strict tools, 24 optional parameters and 16 parameters
 * with union types. Every schema is measured against them in the tests, so an oversized one fails with no key and no cost.
 */
export const AnthropicLimits = { strictTools: 20, optionalParams: 24, unionParams: 16 } as const;

/** The tool a model answers with, and the line that asks it to. */
export const ReplyTool = "reply";
export const ReplyLine = `Answer by calling the ${ReplyTool} tool once. A field that does not apply to you may be left out.`;

/** How a request body reaches the Messages API: the SDK, or a stand-in. */
export interface ApiTransport {
  /** Sends through the provider's batch service (the background mode). */
  readonly background?: boolean;
  send(body: JsonObject, signal?: AbortSignal): Promise<ApiResult>;
  /** Counts a request's tokens (the check at setup): throws with the API's reason when it would refuse the request. */
  count(body: JsonObject, signal?: AbortSignal): Promise<void>;
}

const tool = (schema: ReplySchema, strict: boolean): JsonObject => {
  const t: JsonObject = { name: ReplyTool, description: "Your reply.", input_schema: jsonSchema(schema) };
  if (strict) t.strict = true;
  return t;
};

/** The request body of a call, as the Messages API takes it. */
export function requestBody(spec: CallSpec, model: string, user: string): JsonObject {
  const cache: JsonObject = spec.longCache === true ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
  const system: JsonObject[] = [{ type: "text", text: spec.sharedSystem, cache_control: cache }];
  const seat = spec.seatSystem ?? "";
  if (seat.length > 0) system.push({ type: "text", text: seat });
  const effort = spec.effort ?? "medium";
  const body: JsonObject = {
    model,
    max_tokens: spec.maxTokens ?? 16000,
    system,
    messages: [{ role: "user", content: `${user}\n\n${ReplyLine}` }],
    tools: [tool(spec.schema, spec.strict ?? false)],
    tool_choice: { type: "auto" },
    output_config: { effort: effort === "low" || effort === "high" ? effort : "medium" },
  };
  if (ModelIds.supportsFallback(model)) body.fallbacks = "default";
  return body;
}

/** A request body as text, with the engine's own writer (what the text fingerprints hash). */
export function bodyText(body: JsonObject): string {
  return write(raw, body);
}

export class AnthropicProvider implements Provider {
  readonly id: string;
  private readonly transport: ApiTransport;
  /** `id`: another id only when this stands in for another provider (the simulated API answers every provider). */
  constructor(transport: ApiTransport, id: string = AnthropicId) {
    this.transport = transport;
    this.id = id;
  }

  get background(): boolean {
    return this.transport.background === true;
  }

  send(spec: CallSpec, model: string, user: string, signal?: AbortSignal): Promise<ApiResult> {
    return this.transport.send(requestBody(spec, model, user), signal);
  }

  check(model: string, schema: ReplySchema, strict: boolean, signal?: AbortSignal): Promise<void> {
    // Strict tools compile a grammar the count does not prove; none is used, and the limits test measures them anyway.
    return this.transport.count({ model, messages: [{ role: "user", content: "Setup check." }], tools: [tool(schema, strict)] }, signal);
  }
}

/** The reply in a response: the reply tool's input, or else the text (a model that wrote its JSON out). */
export function replyText(content: readonly { type: string; name?: string; input?: unknown; text?: string }[]): string {
  const use = content.find((b) => b.type === "tool_use" && b.name === ReplyTool);
  if (use !== undefined) return JSON.stringify(use.input ?? {});
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

/** The parameters the SDK sends a request body as: the body, with the fallback beta where it asks for fallbacks. */
export const sdkParams = (body: JsonObject): Anthropic.Beta.MessageCreateParamsNonStreaming =>
  ({ ...body, ...(body.fallbacks !== undefined ? { betas: [FallbackBeta] } : {}) }) as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming;

/** What a message the API returned holds for the game: its reply and its usage. */
export function resultOf(m: Anthropic.Beta.BetaMessage): ApiResult {
  const usage = m.usage as unknown as Record<string, unknown>;
  const n = (k: string, from: Record<string, unknown> = usage): number => (typeof from[k] === "number" ? (from[k] as number) : 0);
  const created = (usage.cache_creation ?? {}) as Record<string, unknown>;
  const details = (m as unknown as { stop_details?: { category?: string } | null }).stop_details;
  return {
    text: replyText(m.content as unknown as { type: string; name?: string; input?: unknown; text?: string }[]),
    stopReason: m.stop_reason ?? null,
    category: details?.category ?? null,
    model: m.model,
    input: n("input_tokens"),
    output: n("output_tokens"),
    cacheRead: n("cache_read_input_tokens"),
    cacheWrite: n("cache_creation_input_tokens"),
    cacheWriteLong: n("ephemeral_1h_input_tokens", created),
  };
}

/**
 * The Messages API through the official SDK, with the player's own key. `fetch` is for tests. The SDK sends nothing again
 * by itself: the client's limiter does, so it learns the account's limit from every refusal.
 */
export class SdkTransport implements ApiTransport {
  readonly client: Anthropic;
  constructor(apiKey: string, fetchImpl?: typeof fetch) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0, ...(fetchImpl !== undefined ? { fetch: fetchImpl } : {}) });
  }

  async send(body: JsonObject, signal?: AbortSignal): Promise<ApiResult> {
    try {
      return resultOf(await this.client.beta.messages.create(sdkParams(body), { signal }));
    } catch (e) {
      throw apiError(e);
    }
  }

  async count(body: JsonObject, signal?: AbortSignal): Promise<void> {
    try {
      await this.client.messages.countTokens(body as unknown as Anthropic.MessageCountTokensParams, { signal });
    } catch (e) {
      throw apiError(e);
    }
  }
}

/** "Anthropic API 400: <the API's message>", as the log and the viewer show a failed call, with its status and wait. */
export function apiError(e: unknown): unknown {
  // An abort is an abort, as fetch's would be: the runner stops instead of falling back.
  if (e instanceof Anthropic.APIUserAbortError) {
    const abort = new Error(e.message);
    abort.name = "AbortError";
    return abort;
  }
  if (e instanceof Anthropic.APIConnectionError) return new ApiStatusError(`Anthropic API unreachable: ${e.message}`, 0);
  if (e instanceof Anthropic.APIError && e.status !== undefined) {
    const err = (e.error as { error?: { message?: string } } | undefined)?.error?.message;
    return new ApiStatusError(`Anthropic API ${e.status}: ${err ?? e.message}`, e.status, retryAfterMs(e.headers?.get("retry-after")));
  }
  return e;
}
