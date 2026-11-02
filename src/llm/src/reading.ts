/**
 * Answers are read as meant ("Calls that get through, live or in the background", decided 2 November 2026). Before a reply
 * is checked against its schema it is read the way its writer meant it: a field that does not apply may be left out
 * ("Requests are rules too"), blank-looking values are blank, and a name matches the list it was asked from in any spelling
 * shown (Babylon, Babylonia). The Haiku game of 1 November lost 26 answers to such slips: a quoted blank where a court was
 * asked, a list where a blank was, "babylon" for Babylonia. What still does not fit gets one retry that shows the model
 * what was wrong (`problems` in schemas.ts).
 */
import type { z } from "zod";
import type { JsonObject, ReplySchema } from "./schemas.ts";

type Def = { type: string; shape?: Record<string, z.ZodType>; element?: z.ZodType; entries?: Record<string, string> };
const def = (s: z.ZodType): Def => (s as unknown as { _zod: { def: Def } })._zod.def;
const shapeOf = (s: z.ZodType): Record<string, z.ZodType> => (s as unknown as { shape: Record<string, z.ZodType> }).shape;
const optionsOf = (s: z.ZodType): string[] => (s as unknown as { options: string[] }).options;

/** Text that means nothing: empty, quoted empty, or a word for none. */
const BlankWords = new Set(["", "none", "null", "nil", "n/a", "na", "nothing", "empty", "nobody", "no one", "-", "--", "—", "–"]);
const quotedBlank = (s: string): boolean => /^(["'`]{2}|“”|‘’)$/.test(s);
const isBlankWord = (s: string): boolean => quotedBlank(s) || BlankWords.has(s.toLowerCase());

/** A name folded for matching: lower case, no accents, letters and digits only. */
const fold = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * The option of an enum a value names: itself; the same in any case or accents; else the one option it is the start of, or
 * that is the start of it (Babylon, Babylonia), when exactly one is and the shorter is at least four letters long.
 */
export function matchOption(value: string, options: readonly string[]): string | null {
  if (options.includes(value)) return value;
  const v = fold(value);
  if (v.length === 0) return options.includes("") ? "" : null;
  const same = options.filter((o) => fold(o) === v);
  if (same.length === 1) return same[0];
  const near = options.filter((o) => {
    const f = fold(o);
    return f.length > 0 && Math.min(f.length, v.length) >= 4 && (f.startsWith(v) || v.startsWith(f));
  });
  return near.length === 1 ? near[0] : null;
}

/** A value read as its writer meant it for a field of this schema; what cannot be read is left for the check to name. */
function read(value: unknown, schema: z.ZodType): unknown {
  const d = def(schema);
  switch (d.type) {
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
      const out: JsonObject = { ...(value as JsonObject) };
      for (const [k, field] of Object.entries(shapeOf(schema))) {
        if (!(k in out) || out[k] === undefined) {
          const left = leftOut(field);
          if (left !== undefined) out[k] = left;
        } else out[k] = read(out[k], field);
      }
      return out;
    }
    case "array": {
      if (value === null || (typeof value === "string" && isBlankWord(value.trim()))) return [];
      return Array.isArray(value) ? value.map((x) => read(x, d.element!)) : value;
    }
    case "enum": {
      const options = optionsOf(schema);
      const one = single(value);
      if (one === null) return options.includes("") ? "" : value;
      if (typeof one !== "string") return value;
      // Tool-call markup a model let into a value ('\n<parameter name="go_as">') is no part of any choice.
      const t = outsideMarkup(one).trim();
      if (isBlankWord(t) && options.includes("")) return "";
      return matchOption(t.replace(/^["'`](.*)["'`]$/, "$1"), options) ?? value;
    }
    case "string": {
      const one = single(value);
      if (one === null) return "";
      return typeof one === "string" && quotedBlank(one.trim()) ? "" : one;
    }
    case "number": {
      if (typeof value === "string") {
        const n = Number(value.trim().replace(/,/g, ""));
        return value.trim().length > 0 && Number.isFinite(n) ? n : value;
      }
      return value;
    }
    case "boolean": {
      if (typeof value !== "string") return value;
      const t = value.trim().toLowerCase();
      return t === "true" || t === "yes" ? true : t === "false" || t === "no" ? false : value;
    }
    default:
      return value;
  }
}

/**
 * The text of a choice outside any markup: what comes before its first "<" and after its last ">" (a value is a name or a
 * blank, never markup). One pass, with no pattern, so no reply can make it slow.
 */
function outsideMarkup(value: string): string {
  const open = value.indexOf("<");
  if (open < 0) return value;
  const close = value.lastIndexOf(">");
  return close < open ? value.slice(0, open) : value.slice(0, open) + value.slice(close + 1);
}

/** A list given where one value was asked: empty means blank (null), one item means that item; else unchanged. */
function single(value: unknown): unknown {
  if (value === null) return null;
  if (!Array.isArray(value)) return value;
  return value.length === 0 ? null : value.length === 1 ? value[0] : value;
}

/**
 * What a field left out means where the schema has a blank: empty text, no choice, none. A number or a yes-or-no left out
 * is not guessed, since either value can be a decision (an errand's gold not handed over, gold sent back at no purity):
 * it goes back to the model with the retry.
 */
function leftOut(field: z.ZodType): unknown {
  switch (def(field).type) {
    case "string":
      return "";
    case "enum":
      return optionsOf(field).includes("") ? "" : undefined;
    case "array":
      return [];
    default:
      return undefined;
  }
}

/** The reply read as meant, for its schema. */
export function readAsMeant(reply: JsonObject, schema: ReplySchema): JsonObject {
  return read(reply, schema) as JsonObject;
}
