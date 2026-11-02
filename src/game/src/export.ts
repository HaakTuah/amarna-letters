/**
 * One export, with filters for what goes in (Engine and models, "Logging and replay"). By default it holds everything
 * the log holds: the header, every decision, every call in full (what was asked and what came back, with each model's
 * notes, plans, ledger and standing orders), the shadow scripts and the audits. Each filter leaves a part out; the human
 * words filter blanks every word a human player wrote, so the export can be kept in the repository and still replays.
 * What is sensitive is never a filter: the log never holds it (sensitive.ts).
 */
import type { GameLog } from "./log.ts";
import { withoutSensitive } from "./sensitive.ts";

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
 * summaries and ledger entries, his answers' words, a tablet's or a forgery's text, a custom greeting, what a turned
 * captive is to report home, and any text the game could not read as an order. Every other field is an order the engine
 * reads (ids, names it knows, numbers), and is never blanked, so the export replays (`export.test.ts` holds each to one
 * side, so a new field of words cannot be missed).
 */
export const WordFields: ReadonlySet<string> = new Set(["letter", "mandate", "notes", "summary", "entry", "speech", "bribeAsk", "say", "reply", "text", "custom", "commitments", "poison", "unreadable", "reason"]);

/**
 * Where a human's words may be quoted in a decision: its word fields, a decision whose whole value is a text (a
 * narrator's chronicle, a character's persona), and the ladder's why in its authorship (a model's own words).
 */
const QuotedFields = new Set([...WordFields, "value", "why"]);

/**
 * How much of a human's text must match, from its start or a sentence's, for a match to count as his quote: a quote cut
 * short (a prompt's brief of a letter keeps its first 120 letters) still counts. A text shorter than this counts only
 * whole, between word boundaries.
 */
const MinQuoted = 12;

/**
 * A quote may also begin at any word inside one of his sentences (a model copying a phrase): such a start must match for
 * this many letters, so that a common phrase of anyone's is not taken for his.
 */
const MinInner = 20;

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
  // A human's words are found as he wrote them, before anything sensitive in them is taken out.
  return (parts.humanWords ? kept : withoutHumanWords(kept))
    .map(withoutSensitiveWords)
    .map((l) => l + "\n")
    .join("");
}

/**
 * A decision with anything sensitive taken out of every string but its type and key, whatever the filters: a player may
 * type an e-mail address or a key into a letter, and a model may put anything into any field. The log keeps them as
 * written, for his own replay; no export carries them. A field the engine reads never holds such a thing in a valid
 * order, so the export still replays.
 */
function withoutSensitiveWords(line: string): string {
  if (!line.startsWith('{"type":"decision"')) return line;
  const touched = { any: false };
  const back = mapWords(JSON.parse(line), withoutSensitive, (f) => f !== "type" && f !== "key", "", touched);
  return touched.any ? toJson(back) : line;
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
  if (quoted.heads[0].size === 0 && quoted.short.length === 0) return out;
  return out.map((line) => {
    const node = JSON.parse(line) as Record<string, unknown>;
    // In decisions only words are blanked, never an order's ids or names, so the export still replays.
    const touched = { any: false };
    // In decisions and the header only words are blanked, never an order's ids or names, so the export still replays;
    // elsewhere everything but a record's ids and names.
    const changes = node.type === "decision" || node.type === "header" ? (f: string) => QuotedFields.has(f) : (f: string) => !Names.has(f);
    const back = mapWords(node, (v) => blankIn(v, quoted), changes, "", touched);
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

/**
 * A reference the engine's scribe puts a name in place of before others read a letter (`scribe` in the engine's
 * archives.ts): a person ("c12", "Mane (c12)"), a tablet ("the tablet k3") or a lot of gold ("g7").
 */
const Reference = /\s*\([ckg]\d+\)|\b(?:(?:the\s+)?(?:tablet|copy|gold|lot)\s+)?[ckg]\d+\b/gi;

/** What to look for: texts matched from their start, and forms in which each reference may have become a name. */
interface Quotes {
  /** Texts by their opening letters (`MinQuoted` of them, or `MinInner` for a start inside a sentence). */
  heads: Map<string, string[]>[];
  /** Texts shorter than `MinQuoted`, matched only whole. */
  short: string[];
  forms: RegExp[];
}

/**
 * The texts to look for elsewhere: each whole text, and each sentence or line of it; each also as it stands inside a
 * JSON string, since a model's reply is JSON (`Meet \\"my brother\\"`, a line break as `\\n`). One that names a
 * reference is also looked for as the scribe delivers it: each long run between references alone, and the whole with
 * any name of up to 120 letters, or none, where each reference stood ("Mane (c1)" is delivered as "Mane").
 */
function pieces(words: string[]): Quotes {
  const starts = new Map<string, string[]>();
  const inner = new Map<string, string[]>();
  const short = new Set<string>();
  const forms = new Map<string, RegExp>();
  const add = (map: Map<string, string[]>, t: string, n: number): void => {
    const head = t.slice(0, n);
    const list = map.get(head) ?? [];
    if (!list.includes(t)) list.push(t);
    map.set(head, list);
  };
  const text = (t: string): void => {
    if (t.length <= MinQuoted) short.add(t);
    else add(starts, t, MinQuoted);
    // Each start inside it, at a word, long enough to be his.
    for (const m of t.matchAll(/(?<=\s)\S/g)) if (t.length - m.index >= MinInner) add(inner, t.slice(m.index), MinInner);
  };
  for (const w of words)
    for (const p of [w, ...w.split(/(?<=[.!?;:])\s+|\n+/)]) {
      const t = p.trim();
      if (t.length === 0) continue;
      // As written, as the log keeps it in a call (anything sensitive replaced), and each inside a JSON string.
      const cleaned = withoutSensitive(t);
      for (const form of new Set([t, cleaned, JSON.stringify(t).slice(1, -1), JSON.stringify(cleaned).slice(1, -1)])) {
        text(form);
        const runs = form.split(Reference);
        if (runs.length === 1) continue;
        for (const r of runs) if (r.trim().length >= MinQuoted) text(r.trim());
        // A name at either end is not his; and a form with too few of his letters would match anyone's.
        while (runs.length > 0 && runs[0].trim() === "") runs.shift();
        while (runs.length > 0 && runs[runs.length - 1].trim() === "") runs.pop();
        if (runs.join("").replace(/\s/g, "").length < MinQuoted) continue;
        forms.set(form, new RegExp(runs.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^\\n]{0,120}?"), "g"));
      }
    }
  return { heads: [starts, inner], short: [...short], forms: [...forms.values()] };
}

const isWord = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

/**
 * A string with every quote of the texts blanked: wherever one's start (its first {@link MinQuoted} letters) stands at a
 * word's start, the span that goes on matching it is blanked, however soon it is cut off; a short text only whole.
 */
function blankIn(s: string, quotes: Quotes): string {
  // Every match is found in the text as it stands, then all are blanked together, so one match cut short (a text's JSON
  // form against its plain quote) never hides another's. Each word start of the string is looked up by its opening
  // letters, so the string is read once however many texts there are.
  const hit = new Uint8Array(s.length);
  let any = false;
  const mark = (i: number, t: string, from: number): void => {
    let n = from;
    while (n < t.length && s[i + n] === t[n]) n++;
    hit.fill(1, i, i + n);
    any = true;
  };
  for (let i = 0; i < s.length; i++) {
    if (isWord(s[i - 1])) continue;
    const at12 = quotes.heads[0].get(s.slice(i, i + MinQuoted));
    if (at12 !== undefined) for (const t of at12) mark(i, t, MinQuoted);
    const at20 = quotes.heads[1].get(s.slice(i, i + MinInner));
    if (at20 !== undefined) for (const t of at20) mark(i, t, MinInner);
  }
  for (const t of quotes.short)
    for (let i = s.indexOf(t); i >= 0; i = s.indexOf(t, i + 1))
      if (!isWord(s[i - 1]) && !isWord(s[i + t.length])) {
        hit.fill(1, i, i + t.length);
        any = true;
      }
  for (const re of quotes.forms)
    for (const m of s.matchAll(re)) {
      hit.fill(1, m.index, m.index + m[0].length);
      any = true;
    }
  if (!any) return s;
  let out = "";
  for (let i = 0; i < s.length; i++) out += hit[i] === 1 && !/\s/.test(s[i]) ? BlankMark : s[i];
  return out;
}

/** Ids and names in calls and shadows, never blanked: they say whose the record is. */
const Names = new Set(["type", "key", "role", "model", "character", "name", "traits"]);

/** A record with `change` applied to each string under a field `changes` accepts. `touched.any` is set if anything changed. */
function mapWords(v: unknown, change: (s: string) => string, changes: (field: string) => boolean, key: string, touched: { any: boolean }): unknown {
  if (typeof v === "string") {
    if (!changes(key)) return v;
    const s = change(v);
    if (s !== v) touched.any = true;
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => mapWords(x, change, changes, key, touched));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapWords(x, change, changes, k, touched)]));
  return v;
}
