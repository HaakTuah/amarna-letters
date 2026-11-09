/**
 * The shadow scripts beside model kings (item 18, "Shadow scripts" under "Minds follow what is at stake"): for every
 * decision a model takes for a king, the script decides too, out of play, and the log keeps by kind whether the two
 * differed and how much it would have mattered. Logged only; nothing in the game reads it, so a game plays and replays
 * the same with or without it. The model characters' shadows are `ShadowDecision` (log.ts).
 */
import { D, I, S, align, cmpStr, describe, fmt, groupBy, obj, sortBy, unitOf, type HostReply, type ObjSchema, type TurnSubmission } from "@amarna/engine";
import type { GameLog } from "./log.ts";

export interface KingShadow {
  /** The decision's key ("t3/orders/Egypt", or an audience's "t3/aud/Egypt/c5"). */
  key: string;
  turn: number;
  /** "orders" or "court". */
  kind: string;
  power: string;
  /** The rung the decision went to, and its model. */
  rung: string;
  model: string;
  /** How close the script's own call was, 0 to 1 ({@link Brain.margins}); -1 where it reported none (courts). */
  margin: number;
  /** How far the two differ, 0 (the same) to 1, and that weighed by what the decision could move. */
  differ: number;
  mattered: number;
  /** Each side's decision in brief: its orders or answer as the engine reads them, never its words. */
  script: string;
  modelSaid: string;
  /** Why the model's call gave no decision (it is then left out of the counts), or null. */
  error: string | null;
}

export function newKingShadow(init: Partial<KingShadow> = {}): KingShadow {
  return { key: "", turn: 0, kind: "", power: "", rung: "", model: "", margin: -1, differ: 0, mattered: 0, script: "", modelSaid: "", error: null, ...init };
}

export const KingShadowSchema: ObjSchema<KingShadow> = obj("KingShadow", newKingShadow, {
  key: S,
  turn: I,
  kind: S,
  power: S,
  rung: S,
  model: S,
  margin: D,
  differ: D,
  mattered: D,
  script: S,
  modelSaid: S,
  error: S,
});

/** A submission's unit orders that do something (holds left out) and its other orders, as keys. */
function orderKeys(s: TurnSubmission): { units: Set<string>; acts: Set<string> } {
  const units = new Set<string>();
  const acts = new Set<string>();
  for (const o of s.orders) {
    if (o.type === "hold") continue;
    if (unitOf(o) !== null) units.add(describe(o));
    else acts.add(o.type === "dispatch" ? `letter to ${o.to}` : o.type);
  }
  return { units, acts };
}

/** 1 less the share two sets hold in common; 0 when both are empty. */
function jaccard(x: Set<string>, y: Set<string>): number {
  const all = new Set([...x, ...y]);
  if (all.size === 0) return 0;
  let same = 0;
  for (const k of all) if (x.has(k) && y.has(k)) same++;
  return 1 - same / all.size;
}

/** How far two kings' orders differ: unit by unit, and action by action (a letter by where it goes). */
export function submissionsDiffer(a: TurnSubmission, b: TurnSubmission): number {
  const x = orderKeys(a);
  const y = orderKeys(b);
  return (jaccard(x.units, y.units) + jaccard(x.acts, y.acts)) / 2;
}

/** A submission in brief, as its keys. */
export function submissionBrief(s: TurnSubmission): string {
  const k = orderKeys(s);
  return [...k.units, ...k.acts].join("; ");
}

/** What an answer to an envoy gives, seals and does, as keys. */
function hostKeys(r: HostReply): Set<string> {
  const out = new Set<string>(r.clauses.map((c) => c.kind));
  if (r.bribe > 0) out.add("a gift");
  if (r.goldBack > 0) out.add("gold back");
  if (r.jobOffer > 0) out.add("service offered");
  if (r.sealProposal) out.add("seals");
  if (r.detain) out.add("detains");
  if (r.counter !== null) out.add("a tablet of its own");
  return out;
}

/** How far two answers to one envoy differ: what each gives, seals, does and says in clauses. */
export function hostDiffer(a: HostReply, b: HostReply): number {
  return jaccard(hostKeys(a), hostKeys(b));
}

/** An answer in brief, as its keys. */
export function hostBrief(r: HostReply): string {
  return [...hostKeys(r)].join("; ");
}

/** The kings' shadows by kind: how many, how often the script would have decided otherwise, and how much it mattered. */
export function kingShadowReport(log: GameLog): string {
  const made = log.kingShadows.filter((s) => s.error === null);
  const lines = [
    `  Kings: ${made.length} decisions by the kings' models, each beside the script's in the same situation` +
      (log.kingShadows.length > made.length ? `; ${log.kingShadows.length - made.length} more gave none (a failed call)` : "") +
      ".",
    "    kind        decisions  differed  mean differ  mean mattered",
  ];
  const mean = (xs: readonly KingShadow[], f: (s: KingShadow) => number): string => fmt(xs.length === 0 ? 0 : xs.reduce((t, s) => t + f(s), 0) / xs.length, "0.00");
  for (const [kind, g] of sortBy([...groupBy(made, (s) => s.kind)], [(x: [string, KingShadow[]]) => x[0], cmpStr]))
    lines.push(
      `    ${align(kind, -11)} ${align(String(g.length), -10)} ${align(String(g.filter((s) => s.differ > 0).length), -9)} ${align(mean(g, (s) => s.differ), -12)} ${mean(g, (s) => s.mattered)}`,
    );
  return lines.join("\n");
}
