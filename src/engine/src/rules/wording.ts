/**
 * One of a notice's few phrasings (the slop audit, kind 3), so a line sent every season does not read the same each time.
 * Chosen by a hash of the key, never by the game's random numbers: the choice draws nothing and seeds replay exactly.
 */
import { fnv64 } from "../core/rng.ts";

/** One of `forms`, by `key`, "turn|the rest": the rest picks where to start, and each season moves on by one. */
export function pick<T>(forms: readonly T[], key: string): T {
  const bar = key.indexOf("|");
  const start = Number.parseInt(fnv64(key.slice(bar + 1)).slice(8), 16);
  return forms[(start + Number.parseInt(key.slice(0, bar), 10)) % forms.length];
}

/** A list as a sentence gives it: "Nesa", "Nesa and Samuha", "Nesa, Samuha and Kizzuwatna". */
export function listed(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** A journey's length in seasons: "a season", "two seasons". */
export function seasonsWords(n: number): string {
  return n === 1 ? "a season" : `${counted(n)} seasons`;
}

/** A small count as a report writes it ("two", "ten"), figures above ten. */
export function counted(n: number): string {
  return ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}

/** A line's first letter capitalised, for a sentence that opens with a land's name ("The Seha River Land's army ..."). */
export function upper(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** One sent on an errand who is not in the king's service, in one of a few phrasings by `key` (see {@link pick}). */
export function notTaken(name: string, key: string): string {
  return pick([`${name} is not in your service: they did not take the job offered.`, `${name} did not take your job, and is not yours to send.`, `${name} has not taken service with you, so cannot be sent.`], key);
}
