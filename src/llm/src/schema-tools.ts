/**
 * The tools the model schemas are built with ("One source for model schemas"): Zod fields that are always required, an
 * object of them in order, the JSON schema a provider is sent, what a schema holds that providers limit, and a reply's
 * problems against its schema.
 */
import { z } from "zod";

export type JsonObject = { [key: string]: unknown };

/** One reply's schema: a Zod object of required fields. */
export type ReplySchema = z.ZodObject<z.ZodRawShape>;

const withDescription = <T extends z.ZodType>(t: T, description: string | null): T => (description !== null ? t.describe(description) : t);
export const str = (description: string | null = null) => withDescription(z.string(), description);
export const int = (description: string | null = null) => withDescription(z.int(), description);
export const bool = (description: string | null = null) => withDescription(z.boolean(), description);
export const enumOf = <const T extends readonly [string, ...string[]]>(values: T, description: string | null = null) => withDescription(z.enum(values), description);
export const array = <T extends z.ZodType>(items: T, description: string | null = null) => withDescription(z.array(items), description);

/** An object of required fields, in the order given. */
export function object(...props: [string, z.ZodType][]): ReplySchema {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, schema] of props) shape[name] = schema;
  return z.object(shape);
}

/** The JSON schema a reply schema is sent as: Zod's own, without the dialect line or the safe-integer bounds it adds. */
export function jsonSchema(schema: z.ZodType): JsonObject {
  const out = z.toJSONSchema(schema) as JsonObject;
  delete out.$schema;
  const strip = (n: unknown): void => {
    if (n === null || typeof n !== "object") return;
    if (Array.isArray(n)) {
      for (const x of n) strip(x);
      return;
    }
    const o = n as JsonObject;
    if (o.type === "integer" && o.minimum === Number.MIN_SAFE_INTEGER && o.maximum === Number.MAX_SAFE_INTEGER) {
      delete o.minimum;
      delete o.maximum;
    }
    // A field's description reads after its type, as an agent reading the schema expects.
    if (typeof o.description === "string") {
      const d = o.description;
      delete o.description;
      o.description = d;
    }
    for (const v of Object.values(o)) strip(v);
  };
  strip(out);
  return out;
}

/** What a schema holds that providers limit: optional properties, union-typed ones, and objects not closed to others. */
export interface SchemaMeasure {
  optional: number;
  unions: number;
  open: number;
}

/** Measures a JSON schema, as sent, against what providers limit ({@link SchemaMeasure}). */
export function measure(schema: JsonObject): SchemaMeasure {
  const m: SchemaMeasure = { optional: 0, unions: 0, open: 0 };
  const walk = (n: unknown): void => {
    if (n === null || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const o = n as JsonObject;
    if (Array.isArray(o.type) || Array.isArray(o.anyOf) || Array.isArray(o.oneOf)) m.unions++;
    if (o.type === "object") {
      const props = Object.keys((o.properties as JsonObject | undefined) ?? {});
      const required = (o.required as string[] | undefined) ?? [];
      m.optional += props.filter((k) => !required.includes(k)).length;
      if (o.additionalProperties !== false) m.open++;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(schema);
  return m;
}

/**
 * Where a reply breaks its schema, in words a model can act on when the reply goes back to it: each field with what it gave
 * and what was asked ("letters[0].to: "Babel" is not one of Assyria, Babylonia, ..."), at most eight; empty when it fits.
 */
export function problems(reply: unknown, schema: z.ZodType): string[] {
  const r = schema.safeParse(reply);
  if (r.success) return [];
  const asked: Record<string, string> = { string: "text", number: "a number", boolean: "true or false", object: "an object", array: "a list" };
  return r.error.issues.slice(0, 8).map((i) => {
    const path = i.path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s.length === 0 ? String(k) : `${s}.${String(k)}`), "");
    const got = i.path.reduce<unknown>((v, k) => (v !== null && typeof v === "object" ? (v as Record<PropertyKey, unknown>)[k] : undefined), reply);
    const gave = got === undefined ? "nothing" : JSON.stringify(got).slice(0, 80);
    let what: string;
    if (i.code === "invalid_value") {
      const values = i.values.map((v) => (v === "" ? '"" (none)' : String(v)));
      what = `${gave} is not one of ${values.slice(0, 40).join(", ")}${values.length > 40 ? ", ..." : ""}`;
    } else if (i.code === "invalid_type") what = `gave ${gave}, where ${asked[i.expected] ?? i.expected} was asked`;
    else what = `gave ${gave}: ${i.message}`;
    return `${path.length === 0 ? "reply" : path}: ${what}`;
  });
}

