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
import { ModelIds } from "./models.ts";
import { jsonSchema, type JsonObject, type ReplySchema } from "./schemas.ts";

export const FallbackBeta = "server-side-fallback-2026-07-01";

/**
 * Anthropic's documented limits on strict tools in one request: 20 strict tools, 24 optional parameters and 16 parameters
 * with union types. Every schema is measured against them in the tests, so an oversized one fails with no key and no cost.
 */
export const AnthropicLimits = { strictTools: 20, optionalParams: 24, unionParams: 16 } as const;

/** The tool a model answers with, and the line that asks it to. */
export const ReplyTool = "reply";
export const ReplyLine = `Answer by calling the ${ReplyTool} tool once, with every field filled in.`;

/** How a request body reaches the Messages API: the SDK, or a stand-in. */
export interface ApiTransport {
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
  const system: JsonObject[] = [{ type: "text", text: spec.sharedSystem, cache_control: { type: "ephemeral" } }];
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

/** The Messages API through the official SDK, with the player's own key. `fetch` is for tests. */
export class SdkTransport implements ApiTransport {
  private readonly client: Anthropic;
  constructor(apiKey: string, fetchImpl?: typeof fetch) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2, ...(fetchImpl !== undefined ? { fetch: fetchImpl } : {}) });
  }

  async send(body: JsonObject, signal?: AbortSignal): Promise<ApiResult> {
    const params = { ...body, ...(body.fallbacks !== undefined ? { betas: [FallbackBeta] } : {}) } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming;
    try {
      const m = await this.client.beta.messages.create(params, { signal });
      const usage = m.usage as unknown as Record<string, unknown>;
      const n = (k: string): number => (typeof usage[k] === "number" ? (usage[k] as number) : 0);
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
      };
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

/** "Anthropic API 400: <the API's message>", as the log and the viewer show a failed call. */
function apiError(e: unknown): unknown {
  if (e instanceof Anthropic.APIError && e.status !== undefined) {
    const err = (e.error as { error?: { message?: string } } | undefined)?.error?.message;
    return new Error(`Anthropic API ${e.status}: ${err ?? e.message}`);
  }
  return e;
}
