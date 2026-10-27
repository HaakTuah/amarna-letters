/**
 * Any provider with an OpenAI-compatible chat completions endpoint: another provider's API, or a local model (Ollama,
 * LM Studio, vLLM and the like) through its compatible endpoint. The shared and seat system texts go as one system
 * message; the reply schema as a JSON-schema response format, strict only where the call asks for it. The check at setup
 * asks the endpoint's model list for the model, which costs nothing; such endpoints document no schema limits.
 */
import type { ApiResult, CallSpec, Provider } from "./client.ts";
import { jsonSchema, type JsonObject, type ReplySchema } from "./schemas.ts";

/** A provider as a table sets it up: its id (the prefix of its model settings), and where its endpoint is. */
export interface ProviderSetting {
  id: string;
  /** The base of the endpoint, up to and including its version: "https://api.openai.com/v1", "http://localhost:11434/v1". */
  baseUrl: string;
}

export class CompatibleProvider implements Provider {
  readonly id: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(setting: ProviderSetting, apiKey: string, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
    this.id = setting.id;
    this.baseUrl = setting.baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
    if (this.apiKey.length > 0) h.authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  /** The request body of a call, as a chat completions endpoint takes it. */
  body(spec: CallSpec, model: string, user: string): JsonObject {
    const seat = spec.seatSystem ?? "";
    return {
      model,
      max_completion_tokens: spec.maxTokens ?? 16000,
      messages: [
        { role: "system", content: seat.length > 0 ? `${spec.sharedSystem}\n\n${seat}` : spec.sharedSystem },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name: "reply", schema: jsonSchema(spec.schema), strict: spec.strict ?? false } },
    };
  }

  async send(spec: CallSpec, model: string, user: string, signal?: AbortSignal): Promise<ApiResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(spec, model, user)),
      signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${this.id} API ${response.status}: ${message(text)}`);
    const o = JSON.parse(text) as {
      model?: string;
      choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
    };
    const choice = o.choices?.[0];
    const cached = o.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    const refused = (choice?.message?.refusal ?? "").length > 0;
    return {
      text: choice?.message?.content ?? "",
      stopReason: refused ? "refusal" : choice?.finish_reason === "length" ? "max_tokens" : (choice?.finish_reason ?? null),
      category: refused ? choice!.message!.refusal! : null,
      model: o.model === model ? model : "",
      input: Math.max(0, (o.usage?.prompt_tokens ?? 0) - cached),
      output: o.usage?.completion_tokens ?? 0,
      cacheRead: cached,
      cacheWrite: 0,
    };
  }

  async check(model: string, _schema: ReplySchema, _strict: boolean, signal?: AbortSignal): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`, { headers: this.headers(), signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`${this.id} API ${response.status}: ${message(text)}`);
    const ids = ((JSON.parse(text) as { data?: { id?: string }[] }).data ?? []).map((m) => m.id);
    if (!ids.includes(model)) throw new Error(`${this.id} has no model ${model}.`);
  }
}

function message(body: string): string {
  try {
    const o = JSON.parse(body) as { error?: { message?: string } | string };
    return typeof o.error === "string" ? o.error : (o.error?.message ?? body);
  } catch {
    return body.length > 300 ? body.slice(0, 300) : body;
  }
}
