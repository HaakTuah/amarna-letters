/**
 * One export, with filters for what goes in (Engine and models, "Logging and replay"). By default it holds everything
 * the log holds: the header, every decision, every call in full (what was asked and what came back, with each model's
 * notes, plans, ledger and standing orders), the shadow scripts and the audits. Each filter leaves a part out; the human
 * words filter blanks every word a human player wrote, so the export can be kept in the repository and still replays.
 *
 * What is sensitive is never a filter and never in any export, and it is kept out by design, not scrubbed: nothing
 * sensitive is recorded (a failure is logged as its kind, failure.ts), and the export is built from the list of fields
 * each record may give, so a field no one listed stays out.
 */
import { isFailure } from "./failure.ts";
import type { GameLog } from "./log.ts";

/** What an export holds: each part true to put it in. */
export interface ExportParts {
  /** Every model call: what was asked, what came back, its tokens, cost and errors. */
  calls: boolean;
  /** The shadow scripts' decisions beside the model characters'. */
  shadows: boolean;
  /** The audits of lower rungs' decisions. */
  audits: boolean;
  /** Every word a human player wrote. Left out, in a game with a human seat, every text is a marked blank of its length. */
  humanWords: boolean;
}

export const Everything: ExportParts = { calls: true, shadows: true, audits: true, humanWords: true };

/**
 * The fields each record may give, in the order the log writes them. A field the log gains is in no export until it is
 * listed here (or knowingly left out: `export.test.ts` holds every field of the log's schemas to one side or the other).
 */
export const ExportFields = {
  header: ["version", "seed", "config", "seats", "sleepers", "minds", "narrator", "jobs", "note"],
  authorship: ["kind", "name", "reason", "rung", "model", "why"],
  call: ["key", "turn", "role", "model", "system", "prompt", "output", "inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens", "costUsd", "usedFallback", "error", "requestChars", "attempt", "unpriced"],
  shadow: ["key", "turn", "kind", "character", "name", "traits", "goldCarried", "giftOffered", "serviceOffered", "known", "model", "script", "error"],
  choice: ["text", "kept", "swap", "acceptGift", "acceptService", "commitments", "price", "dropped", "flags"],
  audit: ["key", "turn", "kind", "rung", "model", "above", "differ", "mattered"],
} as const;

/** The mark that stands for each letter of words left out. Spaces stay, so a blank keeps its shape. */
export const BlankMark = "▒";

/**
 * The fields of a decision that hold words, by name: letters, mandates and speeches, notes, summaries and ledger entries,
 * answers' words, a tablet's or a forgery's text, a custom greeting, what a turned captive is to report home, and any
 * text the game could not read as an order. Every other field is an order the engine reads (ids, names it knows,
 * numbers), and is never blanked, so the export replays (`export.test.ts` holds each to one side, so a new field of
 * words cannot be missed).
 */
export const WordFields: ReadonlySet<string> = new Set(["letter", "mandate", "notes", "summary", "entry", "speech", "bribeAsk", "say", "reply", "text", "custom", "commitments", "poison", "unreadable", "reason"]);

/** A text blanked: every letter replaced by the mark, its spaces and its length kept. */
export function blank(text: string): string {
  return text.replace(/\S/g, BlankMark);
}

type Node = Record<string, unknown>;

/** The log as JSON lines, holding the parts asked for, each record giving only its listed fields. */
export function exportJsonl(log: GameLog, parts: ExportParts = Everything): string {
  // Models quote and echo what they read, so under the filter a game with a human seat loses every text; a game with
  // none loses nothing.
  const blanking = !parts.humanWords && ([...log.header.seats].some(([, label]) => label === "Human") || log.decisions.some((d) => d.by?.kind === "human"));
  let out = "";
  for (const line of log.toJsonl().split("\n")) {
    if (line.length === 0) continue;
    const record = given(JSON.parse(line) as Node, parts, blanking);
    if (record !== null) out += toJson(record) + "\n";
  }
  return out;
}

/** A record as the export gives it, or null when its part is left out (or its type is not one the export knows). */
function given(node: Node, parts: ExportParts, blanking: boolean): Node | null {
  const words = (s: unknown): unknown => (blanking && typeof s === "string" ? blank(s) : s);
  switch (node.type) {
    case "header":
      return { ...pick(node, ExportFields.header), type: "header" };
    case "decision": {
      const by = node.by === null || node.by === undefined ? null : pick(node.by as Node, ExportFields.authorship);
      if (by !== null) {
        by.reason = failure(by.reason);
        by.why = words(by.why);
      }
      // The value comes last: a log is read back by what follows its "value" key.
      return { type: "decision", key: node.key, ...(by !== null ? { by } : {}), value: blanking ? blankWords(node.value) : node.value };
    }
    case "call": {
      if (!parts.calls) return null;
      const call = pick(node, ExportFields.call);
      for (const f of ["system", "prompt", "output"]) call[f] = words(call[f]);
      call.error = failure(call.error);
      return { ...call, type: "call" };
    }
    case "shadow": {
      if (!parts.shadows) return null;
      const shadow = pick(node, ExportFields.shadow);
      if (Array.isArray(shadow.known)) shadow.known = shadow.known.map(words);
      for (const side of ["model", "script"]) {
        if (shadow[side] === null || shadow[side] === undefined) continue;
        const choice = pick(shadow[side] as Node, ExportFields.choice);
        choice.text = words(choice.text);
        choice.commitments = words(choice.commitments);
        shadow[side] = choice;
      }
      shadow.error = failure(shadow.error);
      return { ...shadow, type: "shadow" };
    }
    case "audit":
      return parts.audits ? { ...pick(node, ExportFields.audit), type: "audit" } : null;
    default:
      return null;
  }
}

/** The listed fields of a record, in the listed order; any other is left out. */
function pick(node: Node, fields: readonly string[]): Node {
  const out: Node = {};
  for (const f of fields) if (f in node) out[f] = node[f];
  return out;
}

/** A logged failure as the export gives it: a kind as this build writes it, or, from an older log, "failed". */
function failure(v: unknown): unknown {
  return typeof v === "string" && v.length > 0 && !isFailure(v) ? "failed" : v;
}

/** A decision's value with its words blanked: its word fields, or the whole of a value that is a text (a chronicle). */
function blankWords(v: unknown, key: string | null = null): unknown {
  if (typeof v === "string") return key === null || WordFields.has(key) ? blank(v) : v;
  // A list's entries are words only under a word field; a list at the top (ids, names) is orders.
  if (Array.isArray(v)) return v.map((x) => blankWords(x, key ?? ""));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankWords(x, k)]));
  return v;
}

/** A record as a line, its strings escaped as the log writes them (engine's json.ts, quote). */
function toJson(v: unknown): string {
  return JSON.stringify(v).replace(/[^\x20-\x7e]|[<>&'+`]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}
