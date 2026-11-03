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
