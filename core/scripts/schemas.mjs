// The shape of the core's settings files, each held by a schema of its own (scripts/schemas/<name>.json, beside this
// file) and one checker of schemas, ajv, a package the core installs from its lock file (packages.mjs; #530, item 7),
// in place of checks written by hand in each script that reads one. A schema names at each rule the mend its failure
// says ("mend"; for one keyword of a rule, "mendFor"), the nearest along the failing rule's path, {core} standing for
// the copy's folder; each failure says where and what, then "Mend:" and that, as every check of the core does (#254).
// What a schema cannot say (a path that lies outside the project, a file that is not there) stays with the script.
// A definition a schema refers to holds no "$ref" of its own, so ajv writes it in place and its failure's path runs from
// the schema's root, where the mend is looked up; one that held a "$ref" would be compiled apart, its path starting
// again at the definition, and its mend missed. A failure is said of the file by its schema's "title", else "the config".
//
//   import { keysOf, shapeFaults } from "./schemas.mjs";   shapeFaults("copies", config, "core/"[, its path]) -> ["the config's ...",
//                                                  ...], [] where it holds; null where ajv is not installed, which the
//                                                  caller says; keysOf("copies") -> the keys its schema gives;
//                                                  requiredOf("copies") -> the keys it asks, at each depth
import fs from "node:fs";
import { installed, loadSync } from "./packages.mjs";

const schemaOf = name => JSON.parse(fs.readFileSync(new URL(`./schemas/${name}.json`, import.meta.url), "utf8"));
const checkers = new Map();
function checker(name) {
  if (!checkers.has(name)) {
    // (a union of types, such as a key that is a number or a string, gives one failure where "anyOf" gives one a branch)
    const Ajv = loadSync("ajv"), ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
    ajv.addKeyword({ keyword: "mend", schemaType: "string" });
    ajv.addKeyword({ keyword: "mendFor", schemaType: "object" });
    const schema = schemaOf(name);
    checkers.set(name, { validate: ajv.compile(schema), schema });
  }
  return checkers.get(name);
}

/** The keys the schema `name` gives its file, read from the schema alone, with no package: for a script that tells its
 *  own file from another's by them. */
export const keysOf = name => Object.keys(schemaOf(name).properties ?? {});
/** The keys the schema `name` asks at each depth, read from the schema alone: { required, keys: { <key>: the same of its
 *  value } }, for a writer that must never add a key whose absence the check fails (converge.mjs, `merged`). A key any
 *  branch or dependency may ask counts as asked, so it reads more than ajv would, never less; a reference it cannot
 *  follow throws. */
export const requiredOf = name => {
  const schema = schemaOf(name), at = node => {
    if (!node?.$ref) return node ?? {};
    if (!node.$ref.startsWith("#/$defs/") || !schema.$defs?.[node.$ref.slice(8)] || Object.keys(node).some(k => !["$ref", "mend", "mendFor"].includes(k))) throw new Error(`${name}'s schema refers to ${node.$ref}, or holds keys beside it, which requiredOf cannot follow`);
    return schema.$defs[node.$ref.slice(8)];
  };
  const asked = n => [...(n.required ?? []), ...[n.dependencies, n.dependentRequired, n.dependentSchemas].flatMap(d => Object.values(d ?? {})).flatMap(v => Array.isArray(v) ? v : asked(at(v))),
    ...[...(n.allOf ?? []), ...(n.anyOf ?? []), ...(n.oneOf ?? []), n.then, n.else].filter(Boolean).flatMap(v => asked(at(v)))];
  const tree = node => { const n = at(node); return { required: asked(n), keys: Object.fromEntries(Object.entries(n.properties ?? {}).map(([k, v]) => [k, tree(v)])) }; };
  return tree(schema);
};

// The mend of a failing rule: the nearest "mendFor" of its keyword, else "mend", up its schema's path.
function mendOf(schema, schemaPath, keyword) {
  let at = schema, found = schema.mendFor?.[keyword] ?? schema.mend;
  const steps = schemaPath.replace(/^#\/?/u, "").split("/").filter(Boolean).slice(0, -1);
  for (const step of steps) {
    at = at?.[step.replace(/~1/gu, "/").replace(/~0/gu, "~")];
    if (at && typeof at === "object") found = at.mendFor?.[keyword] ?? at.mend ?? found;
  }
  return found;
}

// Where a failure lies, in words: the file itself, called by its schema's "title" ("the config" where it gives none), or
// the key or item the path names.
const where = (path, file) => (path ? `${file}'s ${path.split("/").slice(1).map(k => (/^\d+$/u.test(k) ? `item ${k}` : JSON.stringify(k.replace(/~1/gu, "/").replace(/~0/gu, "~")))).join(", ")}` : file);

/** The failures of `value` against the schema `name`, each with its mend, {core} read as `core`, said of `file` (its path)
 *  where given, else of the schema's title; [] where it holds;
 *  null where ajv is not installed beside the core's copy, which the caller says as a warning. */
export function shapeFaults(name, value, core = "", file = null) {
  if (!installed("ajv")) return null;
  const { validate, schema } = checker(name);
  if (validate(value)) return [];
  file ??= schema.title ?? "the config";
  // (a name's failure is said once, by the rule it breaks, naming the name: ajv adds a line of its own for the
  // "propertyNames" around it, which says no more)
  const errors = validate.errors.filter(e => e.keyword !== "propertyNames");
  // (the first SHOWN alone, and a count of the rest: a config of many bad items says each kind once, not a line each)
  const left = errors.length - SHOWN;
  return errors.slice(0, SHOWN).map(e => {
    const named = e.params?.additionalProperty ?? e.propertyName;
    const extra = named !== undefined ? ` (${JSON.stringify(named)})` : "";
    return `${where(e.instancePath, file)} ${e.propertyName !== undefined ? "names a key that " : ""}${e.message}${extra}. Mend: ${String(mendOf(schema, e.schemaPath, e.keyword) ?? "write it as the starter kit does").replaceAll("{core}", core)}`;
  }).concat(left > 0 ? [`${file} holds ${left} more faults than those said. Mend: mend those said, then run the check again to see the rest`] : []);
}
const SHOWN = 20;
