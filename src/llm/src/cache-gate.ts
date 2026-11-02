/**
 * The cache is written once ("Calls that get through, live or in the background", decided 2 November 2026). Calls that share
 * an opening (the kings' rulebook, the courts' audiences, the characters' world) wait while one of them goes first; once its
 * reply shows the cache written, the rest follow and read it. Sent all at once, each wrote its own copy: 25 copies of one
 * 70,600-token opening in the Haiku game of 1 November, about two thirds of that season's cost. Where seasons are far apart,
 * so that an opening's cache had lapsed when it was next used, it is written from then on to last an hour, and in the
 * background always, since a batch's answers come minutes apart.
 */
import type { Clock } from "./limiter.ts";

/** How long a cache lasts: five minutes, refreshed by every read, or an hour when written to last. */
export const CacheLife = { shortMs: 5 * 60_000, longMs: 60 * 60_000, marginMs: 30_000 };

/** What a call learns at the gate: whether to write its cache to last an hour, and how to report what it found. */
export interface Pass {
  long: boolean;
  /** Called once the call is over: the cache it read or wrote, or null when it failed. */
  done(cache: { read: number; write: number } | null): void;
}

interface Opening {
  written: boolean;
  at: number;
  long: boolean;
  /** Too short to cache: nothing waits for it again. */
  uncacheable: boolean;
  first: Promise<void> | null;
}

export class CacheGate {
  private readonly openings = new Map<string, Opening>();
  private readonly clock: Clock;
  constructor(clock: Clock) {
    this.clock = clock;
  }

  private fresh(o: Opening): boolean {
    return o.written && this.clock.now() - o.at < (o.long ? CacheLife.longMs : CacheLife.shortMs) - CacheLife.marginMs;
  }

  /** Waits until the opening `key` is cached, or makes this call the one that writes it. `background`: write it to last. */
  async enter(key: string, background: boolean): Promise<Pass> {
    let o = this.openings.get(key);
    if (o === undefined) this.openings.set(key, (o = { written: false, at: 0, long: false, uncacheable: false, first: null }));
    const opening = o;
    for (;;) {
      if (opening.uncacheable) return { long: false, done: () => {} };
      if (this.fresh(opening))
        return {
          long: opening.long || background,
          done: (c) => {
            if (c !== null && c.read + c.write > 0) opening.at = this.clock.now();
          },
        };
      if (opening.first === null) break;
      await opening.first;
    }
    // This call goes first. An opening found lapsed means seasons are far apart: it is written to last from now on.
    if (opening.written) opening.long = true;
    let open!: () => void;
    opening.first = new Promise<void>((r) => (open = r));
    return {
      long: opening.long || background,
      done: (c) => {
        if (c !== null) {
          if (c.read + c.write > 0) {
            opening.written = true;
            opening.at = this.clock.now();
            if (background) opening.long = true;
          } else opening.uncacheable = true;
        }
        opening.first = null;
        open();
      },
    };
  }
}
