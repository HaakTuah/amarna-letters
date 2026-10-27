/**
 * The game's JSON, written exactly as the C# build's System.Text.Json writes it (camelCase names in declaration order,
 * nulls left out, enums as names, every non-ASCII and HTML-sensitive character escaped, doubles in .NET's shortest form),
 * so that a state's fingerprint is the same in both builds and logs saved by either read in the other. Each serialized
 * type has a schema: its fields in order, their types and its factory with the defaults. The schema drives writing,
 * reading (missing fields keep their defaults, as in C#) and cloning.
 */
import { Dict, HSet } from "./collections.ts";
import { dbl } from "./num.ts";
import { fnv64 } from "./rng.ts";

export type Schema =
  | { k: "int" }
  | { k: "dbl" }
  | { k: "bool" }
  | { k: "str" }
  | { k: "raw" }
  | { k: "opt"; of: Schema }
  | { k: "list"; of: Schema }
  | { k: "set"; of: Schema }
  | { k: "dict"; of: Schema }
  | ObjSchema<unknown>
  | PolySchema
  | { k: "lazy"; get: () => Schema }
  | { k: "computed"; of: Schema; get: (o: never) => unknown };

export interface ObjSchema<T> {
  k: "obj";
  name: string;
  make: () => T;
  fields: [string, Schema][];
}

export interface PolySchema {
  k: "poly";
  name: string;
  tag: string;
  variants: Record<string, ObjSchema<unknown>>;
}

export const I: Schema = { k: "int" };
export const D: Schema = { k: "dbl" };
export const B: Schema = { k: "bool" };
export const S: Schema = { k: "str" };
/** Any JSON, kept as parsed (JsonNode, object). */
export const raw: Schema = { k: "raw" };

type SchemaLike = Schema | (() => Schema);
const resolve = (s: SchemaLike): Schema => (typeof s === "function" ? { k: "lazy", get: s } : s);

export const opt = (of: SchemaLike): Schema => ({ k: "opt", of: resolve(of) });
export const list = (of: SchemaLike): Schema => ({ k: "list", of: resolve(of) });
export const set = (of: SchemaLike): Schema => ({ k: "set", of: resolve(of) });
export const dict = (of: SchemaLike): Schema => ({ k: "dict", of: resolve(of) });
/** A get-only C# property: written, never read back. */
export const computed = <T>(of: SchemaLike, get: (o: T) => unknown): Schema => ({ k: "computed", of: resolve(of), get: get as (o: never) => unknown });

export function obj<T>(name: string, make: () => T, fields: Record<string, SchemaLike>): ObjSchema<T> {
  return { k: "obj", name, make, fields: Object.entries(fields).map(([n, s]) => [n, resolve(s)]) };
}

/** A polymorphic type written with its discriminator first ("type": "move", ...), as [JsonPolymorphic] does. */
export function poly(name: string, tag: string, variants: Record<string, ObjSchema<unknown>>): PolySchema {
  return { k: "poly", name, tag, variants };
}

// ---------------------------------------------------------------- writing

const HEX = "0123456789ABCDEF";

/** A string as System.Text.Json's default encoder writes it. */
export function quote(s: string): string {
  let out = '"';
  let run = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x20 && c < 0x7f && c !== 0x22 && c !== 0x5c && c !== 0x3c && c !== 0x3e && c !== 0x26 && c !== 0x27 && c !== 0x2b && c !== 0x60) {
      continue;
    }
    if (i > run) out += s.slice(run, i);
    run = i + 1;
    switch (c) {
      case 0x5c:
        out += "\\\\";
        break;
      case 0x0a:
        out += "\\n";
        break;
      case 0x0d:
        out += "\\r";
        break;
      case 0x09:
        out += "\\t";
        break;
      case 0x08:
        out += "\\b";
        break;
      case 0x0c:
        out += "\\f";
        break;
      default: {
        let code = c;
        // A lone surrogate is not valid text: the encoder writes the replacement character.
        if (c >= 0xd800 && c <= 0xdbff) {
          const n = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
          if (n >= 0xdc00 && n <= 0xdfff) {
            out += esc(c) + esc(n);
            i++;
            run = i + 1;
            continue;
          }
          code = 0xfffd;
        } else if (c >= 0xdc00 && c <= 0xdfff) code = 0xfffd;
        out += esc(code);
      }
    }
  }
  if (run === 0) return '"' + s + '"';
  if (run < s.length) out += s.slice(run);
  return out + '"';
}

function esc(c: number): string {
  return "\\u" + HEX[(c >> 12) & 15] + HEX[(c >> 8) & 15] + HEX[(c >> 4) & 15] + HEX[c & 15];
}

/** Writes a value by its schema. */
export function write(schema: Schema, v: unknown): string {
  switch (schema.k) {
    case "int":
      return String((v as number) + 0);
    case "dbl":
      return dbl(v as number);
    case "bool":
      return v ? "true" : "false";
    case "str":
      return quote(v as string);
    case "raw":
      return writeRaw(v);
    case "opt":
      return v === null || v === undefined ? "null" : write(schema.of, v);
    case "lazy":
      return write(schema.get(), v);
    case "computed":
      return write(schema.of, v);
    case "list":
    case "set": {
      let out = "[";
      let first = true;
      for (const x of v as Iterable<unknown>) {
        if (!first) out += ",";
        first = false;
        out += x === null || x === undefined ? "null" : write(schema.of, x);
      }
      return out + "]";
    }
    case "dict": {
      let out = "{";
      let first = true;
      for (const [key, x] of (v as Dict<string, unknown>).entries()) {
        if (!first) out += ",";
        first = false;
        out += quote(String(key)) + ":" + (x === null || x === undefined ? "null" : write(schema.of, x));
      }
      return out + "}";
    }
    case "obj":
      return writeObj(schema, v as Record<string, unknown>, "");
    case "poly": {
      const tag = (v as Record<string, unknown>)[schema.tag] as string;
      const variant = schema.variants[tag];
      if (!variant) throw new Error(`${schema.name}: no variant ${tag}`);
      return writeObj(variant, v as Record<string, unknown>, quote(schema.tag) + ":" + quote(tag));
    }
  }
}

function writeObj(schema: ObjSchema<unknown>, o: Record<string, unknown>, head: string): string {
  let out = "{" + head;
  let first = head === "";
  for (const [name, fs] of schema.fields) {
    const x = fs.k === "computed" ? fs.get(o as never) : o[name];
    // DefaultIgnoreCondition.WhenWritingNull: a null property is left out.
    if (x === null || x === undefined) continue;
    if (!first) out += ",";
    first = false;
    out += quote(name) + ":" + write(fs, x);
  }
  return out + "}";
}

/** Parsed JSON written back as System.Text.Json writes a JsonNode (numbers as they were read). */
function writeRaw(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (v instanceof RawNumber) return v.text;
  switch (typeof v) {
    case "string":
      return quote(v);
    case "number":
      return Number.isInteger(v) ? String(v) : dbl(v);
    case "boolean":
      return v ? "true" : "false";
  }
  if (Array.isArray(v)) return "[" + v.map(writeRaw).join(",") + "]";
  return "{" + Object.entries(v as Record<string, unknown>).map(([k, x]) => quote(k) + ":" + writeRaw(x)).join(",") + "}";
}

/** A number kept as its text, for JSON passed through untouched. */
export class RawNumber {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

// ---------------------------------------------------------------- reading

/** Builds a value of a schema from parsed JSON: missing fields keep the factory's defaults. */
export function read<T>(schema: Schema, j: unknown): T {
  return readAny(schema, j) as T;
}

function readAny(schema: Schema, j: unknown): unknown {
  switch (schema.k) {
    case "int":
    case "dbl":
      return typeof j === "number" ? j : Number(j);
    case "bool":
      return j === true;
    case "str":
      return j === null || j === undefined ? null : String(j);
    case "raw":
      return j;
    case "opt":
      return j === null || j === undefined ? null : readAny(schema.of, j);
    case "lazy":
      return readAny(schema.get(), j);
    case "computed":
      return undefined;
    case "list":
      return j === null ? null : (j as unknown[]).map((x) => (x === null ? null : readAny(schema.of, x)));
    case "set":
      return j === null ? null : new HSet((j as unknown[]).map((x) => readAny(schema.of, x)));
    case "dict": {
      if (j === null) return null;
      const d = new Dict<string, unknown>();
      for (const [key, x] of Object.entries(j as Record<string, unknown>)) d.set(key, x === null ? null : readAny(schema.of, x));
      return d;
    }
    case "obj":
      return readObj(schema, j as Record<string, unknown>);
    case "poly": {
      const tag = (j as Record<string, unknown>)[schema.tag] as string;
      const variant = schema.variants[tag];
      if (!variant) throw new Error(`${schema.name}: unknown ${schema.tag} "${tag}"`);
      const o = readObj(variant, j as Record<string, unknown>) as Record<string, unknown>;
      o[schema.tag] = tag;
      return o;
    }
  }
}

function readObj(schema: ObjSchema<unknown>, j: Record<string, unknown>): unknown {
  if (j === null) return null;
  const o = schema.make() as Record<string, unknown>;
  // Names are matched without regard to case (PropertyNameCaseInsensitive).
  const byLower = new Map<string, unknown>();
  for (const [key, x] of Object.entries(j)) byLower.set(key.toLowerCase(), x);
  for (const [name, fs] of schema.fields) {
    if (fs.k === "computed") continue;
    const lower = name.toLowerCase();
    if (!byLower.has(lower)) continue;
    o[name] = readAny(fs, byLower.get(lower));
  }
  return o;
}

// ---------------------------------------------------------------- helpers

/** JSON text of a value (Json.Serialize). */
export function serialize(schema: Schema, v: unknown): string {
  return write(schema, v);
}

/** A value from JSON text (Json.Deserialize). */
export function deserialize<T>(schema: Schema, json: string): T {
  return read<T>(schema, JSON.parse(json));
}

/** A deep copy through JSON (Json.Clone): what is not serialized is not copied. */
export function clone<T>(schema: Schema, v: T): T {
  return deserialize<T>(schema, serialize(schema, v));
}

/** A stable fingerprint of a value: FNV-1a over its JSON (Json.Hash). */
export function hash(schema: Schema, v: unknown): string {
  return fnv64(serialize(schema, v));
}
