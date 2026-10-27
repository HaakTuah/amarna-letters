/**
 * Deterministic xoshiro128** generator: 32-bit operations only (Math.imul, >>> 0), the same numbers as the C# build's
 * `Rng` since save version 7. Every roll in the game comes from a stream keyed by (seed, turn, purpose, subject), so
 * results never depend on the order code happens to ask. The key is hashed into the generator's full 128-bit state with
 * several 32-bit rounds, never into one 32-bit seed, so different keys do not come to share a stream in long games.
 *
 * Seeds are plain numbers: whole numbers below 2^53 (game seeds are small; script seat seeds are cut to 53 bits).
 */
export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  /** The state itself: use {@link Rng.for}, which keys a stream. */
  constructor(s0: number, s1: number, s2: number, s3: number) {
    this.s0 = s0 >>> 0;
    this.s1 = s1 >>> 0;
    this.s2 = s2 >>> 0;
    this.s3 = s3 >>> 0;
    // The all-zero state is the one state xoshiro cannot leave.
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 0x9e3779b9;
  }

  static for(seed: number, turn: number, purpose: string, subject = ""): Rng {
    const h = new KeyHash();
    h.word(seed % 4294967296);
    h.word(Math.floor(seed / 4294967296));
    h.word(turn);
    h.text(purpose);
    h.text(subject);
    return h.finish();
  }

  /** A uniform unsigned 32-bit number. */
  nextUInt(): number {
    const s1 = this.s1;
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  /** Uniform double in [0, 1), from 53 bits of two draws. */
  nextDouble(): number {
    const a = this.nextUInt() >>> 5;
    const b = this.nextUInt() >>> 6;
    return (a * 67108864 + b) * (1 / 9007199254740992);
  }

  /** Uniform int in [0, maxExclusive). */
  next(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return this.nextUInt() % maxExclusive;
  }

  /** Uniform int in [min, maxInclusive]. */
  range(min: number, maxInclusive: number): number {
    return min + this.next(maxInclusive - min + 1);
  }

  chance(p: number): boolean {
    return this.nextDouble() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.next(items.length)];
  }

  shuffle<T>(items: Iterable<T>): T[] {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i--) {
      const j = this.next(i + 1);
      const x = list[i];
      list[i] = list[j];
      list[j] = x;
    }
    return list;
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** The murmur3 finalizer. */
function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Hashes a roll's key into four 32-bit lanes, each word mixed into every lane with a round of its own (murmur3's body),
 * then the lanes finalized and mixed into one another. A text goes in as its length, then its UTF-16 code units, so the
 * purpose and the subject cannot run into each other.
 */
class KeyHash {
  private h0 = 0x243f6a88;
  private h1 = 0x85a308d3;
  private h2 = 0x13198a2e;
  private h3 = 0x03707344;
  private n = 0;

  word(w: number): void {
    const k = Math.imul(rotl(Math.imul(w >>> 0, 0xcc9e2d51), 15), 0x1b873593);
    this.h0 = (Math.imul(rotl((this.h0 ^ k) >>> 0, 13), 5) + 0xe6546b64) >>> 0;
    this.h1 = (Math.imul(rotl((this.h1 ^ k ^ this.h0) >>> 0, 17), 5) + 0x561ccd1b) >>> 0;
    this.h2 = (Math.imul(rotl((this.h2 ^ k ^ this.h1) >>> 0, 11), 5) + 0x0bcaa747) >>> 0;
    this.h3 = (Math.imul(rotl((this.h3 ^ k ^ this.h2) >>> 0, 19), 5) + 0x96cd1c35) >>> 0;
    this.n = (this.n + 1) >>> 0;
  }

  text(s: string): void {
    this.word(s.length);
    for (let i = 0; i < s.length; i++) this.word(s.charCodeAt(i));
  }

  finish(): Rng {
    let h0 = (this.h0 ^ this.n) >>> 0;
    let h1 = (this.h1 ^ this.n) >>> 0;
    let h2 = (this.h2 ^ this.n) >>> 0;
    let h3 = (this.h3 ^ this.n) >>> 0;
    h0 = (h0 + h1 + h2 + h3) >>> 0;
    h1 = (h1 + h0) >>> 0;
    h2 = (h2 + h0) >>> 0;
    h3 = (h3 + h0) >>> 0;
    h0 = fmix(h0);
    h1 = fmix(h1);
    h2 = fmix(h2);
    h3 = fmix(h3);
    h0 = (h0 + h1 + h2 + h3) >>> 0;
    h1 = (h1 + h0) >>> 0;
    h2 = (h2 + h0) >>> 0;
    h3 = (h3 + h0) >>> 0;
    return new Rng(h0, h1, h2, h3);
  }
}

/**
 * FNV-1a, 64-bit, over the UTF-16 code units of a string, as 16 hex digits: the fingerprint of the state's JSON. Done in
 * two 32-bit halves: the prime is 2^40 + 0x1b3, so h * prime = h * 0x1b3 + (low half << 40).
 */
export function fnv64(s: string): string {
  let hi = 0xcbf29ce4;
  let lo = 0x84222325;
  for (let i = 0; i < s.length; i++) {
    lo = (lo ^ s.charCodeAt(i)) >>> 0;
    const loP = lo * 0x1b3; // < 2^41: exact
    const carry = Math.floor(loP / 4294967296);
    const newLo = loP >>> 0;
    hi = (Math.imul(hi, 0x1b3) + carry + (lo << 8)) >>> 0;
    lo = newLo;
  }
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}
