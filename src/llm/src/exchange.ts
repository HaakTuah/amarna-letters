/**
 * A decision as an exchange of files, wherever the files are: what file seats (FileExchange, Node only) and local agent kings
 * (BridgeExchange, through the local bridge) share. The request file holds the same system text, prompt and schema a model
 * king or character receives, and where to answer; an unreadable reply gets one retry request with the error; a second
 * failure, or the timeout, throws, and the runner falls back to the script for that decision, as it does for models. Every
 * exchange is also logged as a model call (with no tokens, but the request's length), so the log holds the prompts.
 */
import { isLetterOrDigit, trimEnd } from "@amarna/engine";
import { newModelCall, type ModelCall } from "@amarna/game";
import type { CallSpec } from "./client.ts";
import type { JsonObject } from "./schemas.ts";
import { Sb } from "./text.ts";

/** Whom the request asks to decide: a king's file seat decides "as the king", a file character "as yourself". */
export const King = "the king";
export const CharacterActor = "yourself";

/** The first line of every request file. */
export const Heading = "# Your decision";

/**
 * Only file seats get this: an agent answering the request ends with a message to whoever started it, which must carry
 * nothing of the king's decision. A model king called through the API sees no such line.
 */
export const Footer =
  "When you have written your reply file, your final message must be the single word done. Say nothing about your decision. " +
  "Earlier reply files cannot be read: your record of earlier seasons is in this request.";

export class ReplyError extends Error {}

/** One decision as an exchange of files: the request under the key's safe name, and on an unreadable reply one retry. */
export async function converse(
  spec: CallSpec,
  model: string,
  askOnce: (stem: string, error: string) => Promise<[string, number]>,
  record: ((call: ModelCall) => void) | null,
): Promise<JsonObject> {
  const name = safeName(spec.key);
  const call = newModelCall({ key: spec.key, turn: spec.turn, role: spec.role, model, system: spec.seatSystem ?? "", prompt: spec.user });
  try {
    let error = "";
    for (let attempt = 1; ; attempt++) {
      const stem = attempt === 1 ? name : `${name}.retry`;
      const [text, chars] = await askOnce(stem, error);
      call.output = text;
      call.requestChars = chars;
      try {
        const json = lenient(text);
        if (json === null) throw new ReplyError("the reply was not one JSON object");
        // Models get the schema enforced by the API; a file seat's reply is checked here instead.
        const found = problems(json, spec.schema);
        if (found.length > 0) throw new ReplyError("it does not match the schema: " + found.join("; "));
        record?.(call);
        return json;
      } catch (ex) {
        if (!(ex instanceof ReplyError) || attempt !== 1) throw ex;
        error = ex.message;
      }
    }
  } catch (ex) {
    if (!(ex instanceof Error && ex.name === "AbortError")) {
      call.error = ex instanceof Error ? ex.message : String(ex);
      record?.(call);
    }
    throw ex;
  }
}

/** The request file: the same system text, prompt and schema a model king or character receives, and where to answer. */
export function requestText(spec: CallSpec, replyPath: string, error: string, actor: string = King): string {
  const sb = new Sb();
  sb.appendLine(Heading);
  sb.appendLine();
  sb.appendLine(`Everything you need for this decision is in this file. Decide as ${actor}, then write your answer as one JSON object to the file named under HOW TO REPLY.`);
  sb.appendLine();
  sb.appendLine("## SYSTEM");
  sb.appendLine();
  sb.appendLine(trimEnd(spec.sharedSystem));
  const seat = spec.seatSystem ?? "";
  if (seat.length > 0) {
    sb.appendLine();
    sb.appendLine(trimEnd(seat));
  }
  sb.appendLine();
  sb.appendLine("## THIS DECISION");
  sb.appendLine();
  sb.appendLine(trimEnd(spec.user));
  if (error.length > 0) {
    sb.appendLine();
    sb.appendLine(`(Your previous reply could not be read: ${error}. Reply with one JSON object that matches the schema.)`);
  }
  sb.appendLine();
  sb.appendLine("## HOW TO REPLY");
  sb.appendLine();
  sb.appendLine(`Write exactly one JSON object that matches this schema, and nothing else, to: ${replyPath.replaceAll("\\", "/")}`);
  sb.appendLine();
  sb.appendLine("```json");
  sb.appendLine(readable(spec.schema));
  sb.appendLine("```");
  sb.appendLine();
  sb.appendLine(Footer);
  return sb.toString();
}

/**
 * The schema as the request prints it: indented, but each object that holds no other object (a field: its type, enum and
 * description) on one line, and apostrophes left as they are.
 */
export function readable(node: unknown, depth = 0): string {
  const nested = (x: unknown): boolean => (x !== null && typeof x === "object" && !Array.isArray(x)) || (Array.isArray(x) && x.some(nested));
  const pad = " ".repeat(2 * depth);
  const inner = " ".repeat(2 * (depth + 1));
  if (node !== null && typeof node === "object" && !Array.isArray(node) && Object.values(node).some(nested))
    return (
      "{\n" +
      Object.entries(node)
        .map(([k, v]) => `${inner}${JSON.stringify(k)}: ${readable(v, depth + 1)}`)
        .join(",\n") +
      `\n${pad}}`
    );
  if (Array.isArray(node) && node.some(nested)) return "[\n" + node.map((x) => inner + readable(x, depth + 1)).join(",\n") + `\n${pad}]`;
  if (node === null || node === undefined) return "null";
  return JSON.stringify(node);
}

/** The reply as a JSON object: the whole text, or else the outermost {...} in it (a code fence or a stray line around it is forgiven). */
export function lenient(text: string): JsonObject | null {
  const asObject = (s: string): JsonObject | null => {
    try {
      const v: unknown = JSON.parse(s);
      return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject) : null;
    } catch {
      return null;
    }
  };
  const whole = asObject(text);
  if (whole !== null) return whole;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return asObject(text.slice(start, end + 1));
}

/** Where a reply breaks the schema: wrong JSON types and values outside an enum (at most eight). Missing properties are allowed. */
export function problems(node: unknown, schema: JsonObject): string[] {
  const found: string[] = [];
  walk(node, schema, "reply", found);
  return found;
}

function walk(node: unknown, schema: JsonObject, path: string, found: string[]): void {
  if (found.length >= 8) return;
  const isObject = (x: unknown): x is JsonObject => x !== null && typeof x === "object" && !Array.isArray(x);
  switch (schema.type) {
    case "object": {
      if (!isObject(node)) {
        found.push(`${path} should be an object`);
        return;
      }
      const props = isObject(schema.properties) ? schema.properties : null;
      for (const [k, v] of Object.entries(node)) {
        const inner = props?.[k];
        if (isObject(inner)) walk(v, inner, `${path}.${k}`, found);
      }
      break;
    }
    case "array":
      if (!Array.isArray(node)) {
        found.push(`${path} should be an array`);
        return;
      }
      if (isObject(schema.items)) for (let i = 0; i < node.length; i++) walk(node[i], schema.items, `${path}[${i}]`, found);
      break;
    case "string":
      if (typeof node !== "string") {
        found.push(`${path} should be a string`);
        return;
      }
      if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === node)) found.push(`${path} must be one of ${schema.enum.join(", ")}`);
      break;
    case "integer":
      if (!(typeof node === "number" && Number.isInteger(node) && node >= -2147483648 && node <= 2147483647)) found.push(`${path} should be a whole number`);
      break;
    case "boolean":
      if (typeof node !== "boolean") found.push(`${path} should be true or false`);
      break;
  }
}

/** A key as a file name: letters, digits, '-' and '_' kept, anything else '_'. */
export function safeName(key: string): string {
  let out = "";
  for (const ch of key) out += isLetterOrDigit(ch) || ch === "-" || ch === "_" ? ch : "_";
  return out;
}
