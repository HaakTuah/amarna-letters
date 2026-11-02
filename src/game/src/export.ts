/**
 * One export, with filters for what goes in (Engine and models, "Logging and replay"). By default it holds everything
 * the log holds: the header, every decision, every call in full (what was asked and what came back, with each model's
 * notes, plans, ledger and standing orders), the shadow scripts and the audits. Each filter leaves a part out; the human
 * words filter blanks every word a human player wrote, so the export can be kept in the repository and still replays.
 * What is sensitive is never a filter: the log never holds it (sensitive.ts).
 */
import type { GameLog } from "./log.ts";

/** What an export holds: each part true to put it in. */
export interface ExportParts {
  /** Every model call: what was asked, what came back, its tokens, cost and errors. */
  calls: boolean;
  /** The shadow scripts' decisions beside the model characters'. */
  shadows: boolean;
  /** The audits of lower rungs' decisions. */
  audits: boolean;
  /** Every word a human player wrote: his letters, notes and speeches. Left out, each is a marked blank of its length. */
  humanWords: boolean;
}

export const Everything: ExportParts = { calls: true, shadows: true, audits: true, humanWords: true };

/** The mark that stands for each letter of a human player's words left out. Spaces stay, so a blank keeps its shape. */
export const BlankMark = "▒";

/**
 * The fields of a human player's decisions that hold his own words, by name: letters, mandates and speeches, notes,
 * summaries and ledger entries, his answers' words, a tablet's or a forgery's text, a custom greeting. Every other field
 * is an order the engine reads (ids, names it knows, numbers), and is never blanked, so the export replays.
 */
const WordFields = new Set(["letter", "mandate", "notes", "summary", "entry", "speech", "bribeAsk", "say", "reply", "text", "custom", "commitments"]);

/**
 * How much of a human's text must match, from its start or a sentence's, for a match to count as his quote: a quote cut
 * short (a prompt's brief of a letter keeps its first 120 letters) still counts. A text shorter than this counts only
 * whole, between word boundaries.
 */
const MinQuoted = 12;

/** A text blanked: every letter replaced by the mark, its spaces and its length kept. */
export function blank(text: string): string {
  return text.replace(/\S/g, BlankMark);
}

/** The log as JSON lines, holding the parts asked for. */
export function exportJsonl(log: GameLog, parts: ExportParts = Everything): string {
  const lines = log.toJsonl().split("\n").filter((l) => l.length > 0);
  const kept = lines.filter((line) => {
    const type = typeOf(line);
    return !((type === "call" && !parts.calls) || (type === "shadow" && !parts.shadows) || (type === "audit" && !parts.audits));
  });
  return (parts.humanWords ? kept : withoutHumanWords(kept)).map((l) => l + "\n").join("");
}

/** The record type of a line: the last property of every line the log writes, but a decision's, whose value is last. */
function typeOf(line: string): string {
  return line.startsWith('{"type":"decision"') ? "decision" : ((JSON.parse(line) as { type?: string }).type ?? "");
}

/**
 * The lines with every word a human wrote blanked: the word fields of his decisions, and wherever a piece of them is
 * quoted elsewhere (a model's prompt that carries his letter, an envoy's report of it, the narrator's chronicle).
 */
function withoutHumanWords(lines: string[]): string[] {
  const words: string[] = [];
  const out = lines.map((line) => {
    if (!line.startsWith('{"type":"decision"')) return line;
    const node = JSON.parse(line) as { by?: { kind?: string } | null; value: unknown };
    if (node.by?.kind !== "human") return line;
    node.value = blankFields(node.value, words);
    return toJson(node);
  });
  const quoted = pieces(words);
  if (quoted.length === 0) return out;
  return out.map((line) => {
    const node = JSON.parse(line) as Record<string, unknown>;
    // In decisions only words are blanked, never an order's ids or names, so the export still replays.
    const touched = { any: false };
    const back = blankQuoted(node, quoted, node.type === "decision" || node.type === "header" ? WordFields : null, "", touched);
    return touched.any ? toJson(back) : line;
  });
}

/** A record as a line, its strings escaped as the log writes them (engine's json.ts, quote). */
function toJson(v: unknown): string {
  return JSON.stringify(v).replace(/[^\x20-\x7e]|[<>&'+`]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/** A human decision's value with its word fields blanked; each text blanked is added to `words`. */
function blankFields(v: unknown, words: string[], key = ""): unknown {
  if (typeof v === "string") {
    if (!WordFields.has(key) || v.trim().length === 0) return v;
    words.push(v);
    return blank(v);
  }
  if (Array.isArray(v)) return v.map((x) => blankFields(x, words, key));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankFields(x, words, k)]));
  return v;
}

/** The texts to look for elsewhere: each whole text, and each sentence or line of it, longest first. */
function pieces(words: string[]): string[] {
  const found = new Set<string>();
  for (const w of words)
    for (const p of [w, ...w.split(/(?<=[.!?;:])\s+|\n+/)]) {
      const t = p.trim();
      if (t.length > 0) found.add(t);
    }
  return [...found].sort((a, b) => b.length - a.length);
}

const isWord = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

/**
 * A string with every quote of the texts blanked: wherever one's start (its first {@link MinQuoted} letters) stands at a
 * word's start, the span that goes on matching it is blanked, however soon it is cut off; a short text only whole.
 */
function blankIn(s: string, texts: string[]): string {
  let out = s;
  for (const t of texts) {
    const head = t.slice(0, MinQuoted);
    for (let i = out.indexOf(head); i >= 0; i = out.indexOf(head, i + 1)) {
      if (isWord(out[i - 1])) continue;
      let n = head.length;
      while (n < t.length && out[i + n] === t[n]) n++;
      if (t.length <= MinQuoted && isWord(out[i + n])) continue;
      out = out.slice(0, i) + blank(out.slice(i, i + n)) + out.slice(i + n);
    }
  }
  return out;
}

/** Ids and names in calls and shadows, never blanked: they say whose the record is. */
const Names = new Set(["type", "key", "role", "model", "character", "name", "traits"]);

/**
 * Every string in a record with each quoted piece blanked: under a word field only (`fields`), or, where `fields` is null,
 * everywhere but the record's ids and names. `touched.any` is set if anything was blanked.
 */
function blankQuoted(v: unknown, quoted: string[], fields: ReadonlySet<string> | null, key: string, touched: { any: boolean }): unknown {
  if (typeof v === "string") {
    if (fields !== null ? !fields.has(key) : Names.has(key)) return v;
    const s = blankIn(v, quoted);
    if (s !== v) touched.any = true;
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => blankQuoted(x, quoted, fields, key, touched));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blankQuoted(x, quoted, fields, k, touched)]));
  return v;
}
