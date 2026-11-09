/**
 * The shadow scripts beside model kings (item 18, "Shadow scripts" under "Minds follow what is at stake"): for every
 * decision a model takes for a king, the script decides too, out of play, and the log keeps by kind whether the two
 * differed and how much it would have mattered. Logged only, and read offline ("Script against model" under Tests);
 * nothing in the game reads the record. The script's margin does reach the budget ("What a call is worth"), which changes
 * only which rung a model king's decision goes to, never a script game; a game replays from its logged decisions either
 * way. The model characters' shadows are `ShadowDecision` (log.ts).
 */
import { D, I, S, align, cmpStr, describe, fmt, groupBy, obj, sortBy, unitOf, type HostReply, type ObjSchema, type Order, type TurnSubmission } from "@amarna/engine";
import type { GameLog } from "./log.ts";
import type { ScriptLeader } from "./bots/script-leader.ts";

/**
 * The shadow beside a king played by a model, a local agent or a file seat: the script that decides out of play, with a
 * memory of its own (it remembers its own choices, never the model's), and where its records go.
 */
export interface KingShadowing {
  script: ScriptLeader;
  log(k: KingShadow): void;
}

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

/** An order as a key: a unit's by what it does, any other by its kind, a letter by where it goes; null for a hold. */
function orderKey(o: Order): string | null {
  if (o.type === "hold") return null;
  if (unitOf(o) !== null) return describe(o);
  return o.type === "dispatch" ? `letter to ${o.to}` : o.type;
}

/**
 * A submission as keys, in three parts: the season's unit orders that do something (holds left out), its other orders,
 * and what it leaves to run later (scheduled and standing orders, standing answers, and what it cancels). Its words
 * (notes, summary, ledger, an answer's speech) are never compared.
 */
function orderKeys(s: TurnSubmission): Set<string>[] {
  const units = new Set<string>();
  const acts = new Set<string>();
  const later = new Set<string>();
  for (const o of s.orders) {
    const k = orderKey(o);
    if (k !== null) (unitOf(o) !== null ? units : acts).add(k);
  }
  for (const x of s.scheduled) for (const o of x.orders) later.add(`in season ${x.turn}: ${orderKey(o) ?? describe(o)}`);
  for (const x of s.standing) for (const o of x.orders) later.add(`standing, ${x.when} ${x.power ?? ""} ${x.province}: ${orderKey(o) ?? describe(o)}`);
  for (const a of s.answers) later.add(`answer to ${a.from ?? "any"} bringing ${a.brings}${a.seal ? ", seals" : ""}${a.goldBack > 0 ? `, ${a.goldBack} gold back` : ""}`);
  for (const id of s.cancelStanding) later.add(`cancel standing ${id}`);
  for (const id of s.cancelAnswers) later.add(`cancel answer ${id}`);
  return [units, acts, later];
}

/** 1 less the share two sets hold in common; null when both are empty (the part does not apply). */
function jaccard(x: Set<string>, y: Set<string>): number | null {
  const all = new Set([...x, ...y]);
  if (all.size === 0) return null;
  let same = 0;
  for (const k of all) if (x.has(k) && y.has(k)) same++;
  return 1 - same / all.size;
}

/** The mean of the parts that apply; 0 when none does. */
function meanOf(parts: (number | null)[]): number {
  const xs = parts.filter((x): x is number => x !== null);
  return xs.length === 0 ? 0 : xs.reduce((t, x) => t + x, 0) / xs.length;
}

/** How far two kings' orders differ, 0 to 1: each part that either holds alike (`orderKeys`). */
export function submissionsDiffer(a: TurnSubmission, b: TurnSubmission): number {
  const x = orderKeys(a);
  const y = orderKeys(b);
  return meanOf(x.map((k, i) => jaccard(k, y[i])));
}

/** A submission in brief, as its keys. */
export function submissionBrief(s: TurnSubmission): string {
  return orderKeys(s)
    .flatMap((k) => [...k])
    .join("; ");
}

/** What an answer to an envoy does, beside its sums: its clauses' kinds, sealing, detaining, its own tablet, its letters. */
function hostKeys(r: HostReply): Set<string> {
  const out = new Set<string>(r.clauses.map((c) => c.kind));
  if (r.sealProposal) out.add("seals");
  if (r.detain) out.add("detains");
  if (r.counter !== null) out.add("a tablet of its own");
  if (r.reopenOrders) out.add("reopens its orders");
  for (const o of r.letters) out.add(orderKey(o) ?? describe(o));
  return out;
}

/** An answer's sums: the gift to the envoy, the gold sent back, the wage of service offered. */
const sums = (r: HostReply): number[] => [r.bribe, r.goldBack, r.jobOffer];

/**
 * How far two answers to one envoy differ, 0 to 1: what each does (`hostKeys`), and each sum either gives, by how far
 * apart the two are; never their words.
 */
export function hostDiffer(a: HostReply, b: HostReply): number {
  const x = sums(a);
  const y = sums(b);
  const gaps = x.map((v, i) => (v <= 0 && y[i] <= 0 ? null : Math.min(1, Math.abs(v - y[i]) / Math.max(1, v, y[i]))));
  return meanOf([jaccard(hostKeys(a), hostKeys(b)), ...gaps]);
}

/** An answer in brief, as its keys and sums. */
export function hostBrief(r: HostReply): string {
  const [gift, back, wage] = sums(r);
  const given = [gift > 0 ? `a gift of ${gift}` : "", back > 0 ? `${back} gold back` : "", wage > 0 ? `service at ${wage}` : ""].filter((x) => x.length > 0);
  return [...hostKeys(r), ...given].join("; ");
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
  // How close the script's call was against how often the king did otherwise: the design's premise, that an obvious
  // call is one a model rarely makes otherwise, read by margin.
  const bands: [string, (m: number) => boolean][] = [
    ["close (below 1/3)", (m) => m < 1 / 3],
    ["middling", (m) => m >= 1 / 3 && m < 2 / 3],
    ["obvious (2/3 up)", (m) => m >= 2 / 3],
  ];
  const marked = made.filter((s) => s.margin >= 0);
  if (marked.length > 0)
    lines.push(
      `    by the script's margin (orders with one, ${marked.length}): ` +
        bands.map(([name, inBand]) => {
          const g = marked.filter((s) => inBand(s.margin));
          return `${name} ${g.length}, mean differ ${mean(g, (s) => s.differ)}`;
        }).join("; "),
    );
  return lines.join("\n");
}
