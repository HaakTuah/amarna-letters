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
  return pick([`${name} is not in your service: they did not take the job offered.`, `${name} did not take your job, and is not yours to send.`, `${name} has not taken service with you, so they cannot be sent.`], key);
}

/** An envoy's journey as the seat view words it: "Terqa: 2 season(s) each way". */
const Journey = /^(?<court>.+): (?<n>\d+) season\(s\) each way$/;

/** Courts a journey of the same length away. */
export interface JourneyGroup {
  seasons: number;
  courts: string[];
}

/**
 * A seat view's journeys (`SeatView.travelTimes`) grouped by their length, for the model's request and the human's orders
 * alike, each in its own words (item 17++++): the most common length (null for none), the other lengths, shortest first,
 * and any line not in the usual form.
 */
export function journeyGroups(lines: readonly string[]): { most: JourneyGroup | null; others: JourneyGroup[]; odd: string[] } {
  const by = new Map<number, string[]>();
  const odd: string[] = [];
  for (const t of lines) {
    const m = Journey.exec(t)?.groups;
    if (m === undefined) odd.push(t);
    else by.set(Number(m.n), [...(by.get(Number(m.n)) ?? []), m.court]);
  }
  const groups = [...by].map(([seasons, courts]) => ({ seasons, courts })).sort((a, b) => a.seasons - b.seasons);
  const most = groups.reduce<JourneyGroup | null>((a, g) => (a === null || g.courts.length > a.courts.length ? g : a), null);
  return { most, others: groups.filter((g) => g !== most), odd };
}
