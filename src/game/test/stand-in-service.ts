/**
 * A stand-in for the provider's service, for "Calls that get through, live or in the background": no real call is made. It
 * refuses calls past a limit on calls in flight, as the account's limit did in the Haiku game of 1 November; it writes a
 * cache for every call that arrives before the first write is done, as the service does; it answers batches late; and it
 * can answer with the slips that game's models made. Time is a test clock, so waits take no time.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ApiStatusError, answer, type ApiResult, type ApiTransport, type BatchService, type Clock, type JsonObject } from "@amarna/llm";

/** Time that passes only when waited on: each wait ends in the order of its end, with no real delay. */
export class TestClock implements Clock {
  private t = 0;
  private readonly timers: { at: number; wake: () => void }[] = [];
  now(): number {
    return this.t;
  }
  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted === true) return reject(Object.assign(new Error("stopped"), { name: "AbortError" }));
      this.timers.push({ at: this.t + ms, wake: resolve });
      this.timers.sort((a, b) => a.at - b.at);
      setImmediate(() => {
        const next = this.timers.shift();
        if (next === undefined) return;
        this.t = Math.max(this.t, next.at);
        next.wake();
      });
    });
  }
}

/** Tokens of a text, as the stand-in counts them: one in four characters. */
const tokens = (text: string): number => Math.ceil(text.length / 4);

export class StandInService implements ApiTransport, BatchService {
  /** Calls in flight it takes at once; past it, a 429 asking for a wait of a second. */
  limit = 6;
  /** How long a live call takes. */
  latencyMs = 2000;
  /** How many times a batch is asked after before it has ended. */
  lateBy = 3;
  inFlight = 0;
  peak = 0;
  refused = 0;
  readonly bodies: JsonObject[] = [];
  /** The answer to a request: the simulated API's, unless a test sets its own. */
  reply: (body: JsonObject) => string = (body) => {
    const tool = (body.tools as JsonObject[] | undefined)?.[0];
    const props = ((tool?.input_schema as JsonObject | undefined)?.properties as JsonObject | undefined) ?? null;
    const content = (body.messages as JsonObject[] | undefined)?.[0]?.content;
    return answer(props, typeof content === "string" ? content : "");
  };
  /** Openings whose cache is written, with when it lapses (five minutes, or an hour, after its last use), and every write. */
  private readonly cached = new Map<string, number>();
  writes = 0;
  readonly batches = new Map<string, { requests: { id: string; body: JsonObject }[]; asked: number }>();
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  private opening(body: JsonObject): string {
    return JSON.stringify(body.tools) + String(((body.system as JsonObject[] | undefined)?.[0]?.text as string | undefined) ?? "");
  }

  /** The answer and its usage; the cache found written is read, else written, and the write lands only when `land` runs. */
  private answerOf(body: JsonObject): { result: ApiResult; land: () => void } {
    this.bodies.push(body);
    const key = this.opening(body);
    const size = tokens(key);
    const long = ((body.system as JsonObject[])[0].cache_control as JsonObject).ttl === "1h";
    const read = (this.cached.get(key) ?? -1) > this.clock.now();
    if (!read) this.writes++;
    const result: ApiResult = {
      text: this.reply(body),
      stopReason: "end_turn",
      category: null,
      model: String(body.model),
      input: 5000,
      output: 1000,
      cacheRead: read ? size : 0,
      cacheWrite: read ? 0 : size,
      cacheWriteLong: !read && long ? size : 0,
    };
    return { result, land: () => void this.cached.set(key, this.clock.now() + (long ? 60 : 5) * 60_000) };
  }

  async send(body: JsonObject): Promise<ApiResult> {
    if (this.inFlight >= this.limit) {
      this.refused++;
      throw new ApiStatusError("Anthropic API 429: Number of concurrent requests across all models has exceeded your organization's limit.", 429, 1000);
    }
    this.inFlight++;
    this.peak = Math.max(this.peak, this.inFlight);
    const { result, land } = this.answerOf(body);
    try {
      await this.clock.sleep(this.latencyMs);
    } finally {
      this.inFlight--;
    }
    land();
    return result;
  }

  count(): Promise<void> {
    return Promise.resolve();
  }

  create(requests: { id: string; body: JsonObject }[]): Promise<string> {
    const id = `batch_${this.batches.size + 1}`;
    this.batches.set(id, { requests, asked: 0 });
    return Promise.resolve(id);
  }

  ended(batch: string): Promise<boolean> {
    const b = this.batches.get(batch)!;
    return Promise.resolve(++b.asked > this.lateBy);
  }

  /** A batch's answers, worked out together: every request of an opening not yet cached writes its own copy. */
  results(batch: string): Promise<Map<string, ApiResult | ApiStatusError>> {
    const answered = this.batches.get(batch)!.requests.map((r) => [r.id, this.answerOf(r.body)] as const);
    for (const [, a] of answered) a.land();
    return Promise.resolve(new Map(answered.map(([id, a]) => [id, { ...a.result, batched: true }] as const)));
  }
}

/** The calls of the Haiku game of 1 November (`tests/fixtures/model-games/`), as its export holds them. */
export interface RecordedCall {
  turn: number;
  role: string;
  output: string;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}

export function haikuGame(): { header: JsonObject; calls: RecordedCall[] } {
  const lines = readFileSync(join(import.meta.dirname, "../../../tests/fixtures/model-games/haiku-two-seasons-seed-407184.jsonl"), "utf8").split("\n");
  const rows = lines.filter((l) => l.length > 0).map((l) => JSON.parse(l) as JsonObject);
  return { header: rows[0], calls: rows.filter((r) => r.type === "call") as unknown as RecordedCall[] };
}
