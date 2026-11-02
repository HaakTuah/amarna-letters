/**
 * Never more in flight than the account allows ("Calls that get through, live or in the background", decided 2 November
 * 2026). One limiter per provider keeps the calls in flight under a limit it learns: it halves the limit when a call is
 * refused for being one too many, and grows it slowly again with each call that gets through. A refused or overloaded call
 * waits as long as the service asks, or a backoff that doubles, and is sent again; a script stands in only once the
 * patience is spent. The background mode needs none of it, since the batch service has no limit on calls in flight.
 */

/** Time, as the layer waits on it: the real one in play, a stand-in in the tests. */
export interface Clock {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export const RealClock: Clock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted === true) return reject(abortError());
      const t = setTimeout(() => {
        signal?.removeEventListener("abort", stop);
        resolve();
      }, ms);
      const stop = (): void => {
        clearTimeout(t);
        reject(abortError());
      };
      signal?.addEventListener("abort", stop, { once: true });
    }),
};

function abortError(): Error {
  const e = new Error("The game was stopped.");
  e.name = "AbortError";
  return e;
}

/** A call a provider refused with a status: a 429 or an overload is sent again, after `retryAfterMs` when it says so. */
export class ApiStatusError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;
  constructor(message: string, status: number, retryAfterMs: number | null = null) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Too many in flight, or a rate limit: the limit halves. */
export const isTooMany = (e: unknown): boolean => e instanceof ApiStatusError && e.status === 429;

/** A refusal worth sending again: too many, an overload, a timeout or a server error (status 0: the connection failed). */
export const isRetryable = (e: unknown): boolean => e instanceof ApiStatusError && [0, 408, 429, 500, 502, 503, 504, 529].includes(e.status);

/** The seconds a `retry-after` header names, as milliseconds; null when it names none. */
export function retryAfterMs(header: string | null | undefined): number | null {
  if (header === null || header === undefined) return null;
  const s = Number(header);
  return Number.isFinite(s) && s >= 0 ? s * 1000 : null;
}

/** First guesses, not tuned: where the limit starts and the most it grows to, and how long a call keeps trying. */
export const LimiterDefaults = {
  start: 4,
  most: 32,
  /** The wait before the first resend when the service names none; it doubles, up to `longestWaitMs`. */
  firstWaitMs: 2000,
  longestWaitMs: 60_000,
  /** How long one call keeps trying before the script stands in. */
  patienceMs: 10 * 60_000,
};

export class CallLimiter {
  private limit: number;
  private inFlight = 0;
  /** Bumped each time the limit halves: refusals of calls sent before it are the same crowd and halve nothing more. */
  private epoch = 0;
  private readonly waiting: (() => void)[] = [];
  private readonly most: number;

  constructor(start = LimiterDefaults.start, most = LimiterDefaults.most) {
    this.limit = start;
    this.most = most;
  }

  /** The calls the limiter lets through at once now. */
  get allowed(): number {
    return Math.max(1, Math.floor(this.limit));
  }

  /** Waits for a slot; returns the epoch the call is sent in, which `release` takes back. */
  async acquire(signal?: AbortSignal): Promise<number> {
    while (this.inFlight >= this.allowed) {
      if (signal?.aborted === true) throw abortError();
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.inFlight++;
    return this.epoch;
  }

  /** Frees the slot: a call that got through grows the limit by about one a round, one refused as too many halves it. */
  release(epoch: number, outcome: "ok" | "too-many" | "other"): void {
    this.inFlight--;
    if (outcome === "ok") this.limit = Math.min(this.most, this.limit + 1 / this.limit);
    else if (outcome === "too-many" && epoch === this.epoch) {
      this.limit = Math.max(1, this.limit / 2);
      this.epoch++;
    }
    // Every waiter looks again, in the order it came; those that find no slot wait again.
    for (const wake of this.waiting.splice(0)) wake();
  }
}

/** How long to wait before sending a refused call again: what the service asked, or a doubling backoff. */
export function waitBefore(e: unknown, tries: number): number {
  const asked = e instanceof ApiStatusError ? e.retryAfterMs : null;
  return asked ?? Math.min(LimiterDefaults.longestWaitMs, LimiterDefaults.firstWaitMs * 2 ** (tries - 1));
}
