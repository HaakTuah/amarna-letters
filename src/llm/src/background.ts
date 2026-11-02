/**
 * Playing in the background ("Calls that get through, live or in the background", decided 2 November 2026): each phase's
 * calls go as one batch to the provider's batch service, at about half the price and with no limit on calls in flight, and
 * the game plays on as the answers come back, minutes or more later. The calls a phase sends together are gathered for a
 * moment and sent as one batch; the batch is asked after, more slowly as it waits, until it has ended. Every request is
 * named by a digest of its body, and the batches still out are kept by those names, so a game closed while it waited and
 * opened again later, with the key, asks the same calls again and collects their answers instead of sending them twice.
 * The models and the record are the same as live, so a game played in the background replays like any other.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { sha256, utf8 } from "@amarna/engine";
import { FallbackBeta, apiError, bodyText, resultOf, sdkParams, type ApiTransport, type SdkTransport } from "./anthropic.ts";
import type { ApiResult } from "./client.ts";
import { ApiStatusError, RealClock, type Clock } from "./limiter.ts";
import type { JsonObject } from "./schemas.ts";

/** A batch service: Anthropic's Message Batches, or a stand-in. */
export interface BatchService {
  /** Sends the requests as one batch; returns its id. */
  create(requests: { id: string; body: JsonObject }[], signal?: AbortSignal): Promise<string>;
  /** Whether the batch has ended (every request answered, failed or expired). */
  ended(batch: string, signal?: AbortSignal): Promise<boolean>;
  /** The answers of an ended batch, by request id: the result, or why it failed. */
  results(batch: string, signal?: AbortSignal): Promise<Map<string, ApiResult | ApiStatusError>>;
}

/**
 * Where the batches sent are kept, by the ids of their requests, so a game opened again collects them. They are kept
 * after their answers came, since a game saves only once its season is played: closed mid-season, it asks again for
 * answers that came before it closed. The service keeps a batch's answers for 29 days; the store may forget it sooner.
 */
export interface BatchStore {
  find(request: string): Promise<string | null>;
  keep(batch: string, requests: readonly string[]): Promise<void>;
}

/** A store kept in memory, for the batch runner and the tests. */
export class MemoryBatchStore implements BatchStore {
  private readonly byRequest = new Map<string, string>();
  find(request: string): Promise<string | null> {
    return Promise.resolve(this.byRequest.get(request) ?? null);
  }
  keep(batch: string, requests: readonly string[]): Promise<void> {
    for (const r of requests) this.byRequest.set(r, batch);
    return Promise.resolve();
  }
}

/** First guesses, not tuned: how long a phase's calls are gathered, and how often a batch is asked after. */
export const BatchTiming = { gatherMs: 500, firstPollMs: 10_000, longestPollMs: 120_000 };

/** A request's id in a batch: a digest of its body, 32 hex characters (the service takes up to 64). */
export function requestId(body: JsonObject): string {
  return [...sha256(utf8(bodyText(body))).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Waiting {
  id: string;
  body: JsonObject;
  resolve: (r: ApiResult) => void;
  reject: (e: unknown) => void;
}

export class BatchTransport implements ApiTransport {
  readonly background = true;
  private readonly service: BatchService;
  private readonly live: ApiTransport;
  private readonly store: BatchStore;
  private readonly clock: Clock;
  private gathered: Waiting[] = [];
  /** The answers of batches out, by request id: every call asking the same request waits on the same answer. */
  private readonly out = new Map<string, Promise<ApiResult>>();
  /** The answers of each ended batch, fetched once however many of its calls are asked again. */
  private readonly answers = new Map<string, Promise<Map<string, ApiResult | ApiStatusError>>>();
  /** Requests whose batch answered with a failure: asked again, they go in a new batch, whose id the store then keeps. */
  private readonly failed = new Set<string>();

  /** `live`: counts tokens for the check at setup, which costs nothing and needs no batch. */
  constructor(service: BatchService, live: ApiTransport, store: BatchStore = new MemoryBatchStore(), clock: Clock = RealClock) {
    this.service = service;
    this.live = live;
    this.store = store;
    this.clock = clock;
  }

  count(body: JsonObject, signal?: AbortSignal): Promise<void> {
    return this.live.count(body, signal);
  }

  send(body: JsonObject, signal?: AbortSignal): Promise<ApiResult> {
    const id = requestId(body);
    const asked = this.out.get(id);
    if (asked !== undefined) return asked;
    const answer = new Promise<ApiResult>((resolve, reject) => {
      const waiting = { id, body, resolve, reject };
      (this.failed.has(id) ? Promise.resolve(null) : this.store.find(id)).then((kept) => {
        // A batch sent before the game was closed: collect its answer instead of sending the call again.
        if (kept !== null) return void this.collect(kept, [waiting], signal);
        this.gathered.push(waiting);
        if (this.gathered.length === 1) void this.flush(signal);
      }, reject);
    });
    this.out.set(id, answer);
    const done = (): void => void this.out.delete(id);
    answer.then(done, done);
    return answer;
  }

  private async flush(signal?: AbortSignal): Promise<void> {
    try {
      await this.clock.sleep(BatchTiming.gatherMs, signal);
    } catch (e) {
      for (const w of this.gathered.splice(0)) w.reject(e);
      return;
    }
    const these = this.gathered.splice(0);
    for (const w of these) this.failed.delete(w.id);
    let batch: string;
    try {
      batch = await this.service.create(
        these.map((w) => ({ id: w.id, body: w.body })),
        signal,
      );
    } catch (e) {
      for (const w of these) w.reject(e);
      return;
    }
    try {
      await this.store.keep(
        batch,
        these.map((w) => w.id),
      );
    } catch {
      // Not kept: a game closed now would send these again, which costs, but this game plays on.
    }
    await this.collect(batch, these, signal);
  }

  /** Waits for a batch to end, asking after it more slowly as it waits, and hands each call its answer. */
  private async collect(batch: string, these: Waiting[], signal?: AbortSignal): Promise<void> {
    try {
      for (let wait = BatchTiming.firstPollMs; !(await this.service.ended(batch, signal)); wait = Math.min(BatchTiming.longestPollMs, wait * 2))
        await this.clock.sleep(wait, signal);
      let results = this.answers.get(batch);
      if (results === undefined) {
        this.answers.set(batch, (results = this.service.results(batch, signal)));
        results.catch(() => this.answers.delete(batch));
      }
      const answered = await results;
      for (const w of these) {
        const r = answered.get(w.id);
        if (r !== undefined && !(r instanceof ApiStatusError)) {
          w.resolve(r);
          continue;
        }
        this.failed.add(w.id);
        w.reject(r ?? new ApiStatusError(`Anthropic batch ${batch} has no answer for a call.`, 0));
      }
    } catch (e) {
      // Stopped, or the service failed: the batch stays kept, so the call asked again, now or once the game is opened
      // again, collects it.
      for (const w of these) w.reject(e);
    }
  }
}

/** The status an error type of the batch service stands for, so the client knows which to send again. */
const statusOf: Record<string, number> = { rate_limit_error: 429, overloaded_error: 529, api_error: 500, timeout_error: 504 };

/** Anthropic's Message Batches, through the official SDK and the player's own key; its errors read as a call's do. */
export class SdkBatchService implements BatchService {
  private readonly client: Anthropic;
  constructor(transport: SdkTransport) {
    this.client = transport.client;
  }

  async create(requests: { id: string; body: JsonObject }[], signal?: AbortSignal): Promise<string> {
    try {
      return await this.send(requests, signal);
    } catch (e) {
      throw apiError(e);
    }
  }

  private async send(requests: { id: string; body: JsonObject }[], signal?: AbortSignal): Promise<string> {
    const fallbacks = requests.some((r) => r.body.fallbacks !== undefined);
    const batch = await this.client.beta.messages.batches.create(
      {
        requests: requests.map((r) => {
          const { betas: _betas, ...params } = sdkParams(r.body) as unknown as JsonObject;
          return { custom_id: r.id, params } as unknown as Anthropic.Beta.Messages.BatchCreateParams.Request;
        }),
        ...(fallbacks ? { betas: [FallbackBeta] } : {}),
      } as Anthropic.Beta.Messages.BatchCreateParams,
      { signal },
    );
    return batch.id;
  }

  async ended(batch: string, signal?: AbortSignal): Promise<boolean> {
    try {
      return (await this.client.beta.messages.batches.retrieve(batch, {}, { signal })).processing_status === "ended";
    } catch (e) {
      throw apiError(e);
    }
  }

  async results(batch: string, signal?: AbortSignal): Promise<Map<string, ApiResult | ApiStatusError>> {
    try {
      return await this.read(batch, signal);
    } catch (e) {
      throw apiError(e);
    }
  }

  private async read(batch: string, signal?: AbortSignal): Promise<Map<string, ApiResult | ApiStatusError>> {
    const out = new Map<string, ApiResult | ApiStatusError>();
    for await (const r of await this.client.beta.messages.batches.results(batch, {}, { signal })) {
      const res = r.result;
      if (res.type === "succeeded") out.set(r.custom_id, { ...resultOf(res.message), batched: true });
      else if (res.type === "errored") {
        const e = (res.error as unknown as { error?: { type?: string; message?: string } }).error;
        out.set(r.custom_id, new ApiStatusError(`Anthropic batch: ${e?.message ?? e?.type ?? "error"}`, statusOf[e?.type ?? ""] ?? 400));
      } else out.set(r.custom_id, new ApiStatusError(`Anthropic batch: the call ${res.type === "expired" ? "expired before it was answered" : "was cancelled"}.`, 0));
    }
    return out;
  }
}
