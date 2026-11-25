// What the steps of the shape check read: its baseline written, and its readers' packages installed first (steps.mjs,
// beside this file, holds the steps, and step-checks.mjs the words they share). Each piece takes the project as
// steps.mjs's `project` reads it and returns the mend, or null where the step is done; a step names the ones it needs,
// none runs by itself. It reads only. Node's own modules and git only.
import fs from "node:fs";
import path from "node:path";
import { offBy, parseBaseline, parseConfig, scanMend, where as shapeAt } from "./shape.mjs";
import { READERS } from "./shape-readers.mjs";
import { HERE, plain } from "./step-checks.mjs";

// The shape check's config and baseline as a project holds them: { at, config, reads } (the readers its baseline names),
// or { mend } where the config or the baseline is not there or cannot be read; { off } where the manifest turns the
// check off with the owner's reason (shape.mjs, offBy), which asks nothing of either.
function shapeHeld(p) {
  if (offBy(p.manifest)) return { off: true };
  const at = shapeAt(p.manifest), text = p.read(at);
  const first = `write its first baseline with \`if [ -f core/scripts/install.mjs ]; then node core/scripts/install.mjs all; fi\` and then \`node core/scripts/shape.mjs ${at} --first\` (the parser's packages, which the readers of JavaScript, TypeScript, C# and Python need, are installed only where named: #719), commit both, and name both in \`SECURITY.md\` under rule 3, among the checks on the work`;
  if (text === null) return { none: true, mend: `Write \`${at}\` as the starter kit does (\`core/setup/template/shape.json.tmpl\`), with the project's own code under "code" and its test files under "tests", as git pathspecs; then ${first}. Until then the shape check holds the project to the starter kit's config, with each pull request's base as its baseline.` };
  let config;
  try { config = parseConfig(text, at); } catch (e) { return { mend: `Mend \`${at}\`, which the shape check cannot read (${plain(String(e.message).split(". Mend: ")[0], p.root)}), as \`node core/scripts/shape.mjs\` says; then ${first}.` }; }
  const baseline = p.read(config.baseline);
  if (baseline === null) return { mend: `The shape check's config stands at \`${at}\` and its baseline does not: ${first}.` };
  let reads = [];
  try { reads = parseBaseline(baseline, config.baseline, "").reads; } catch { /* (read as naming no reader: its mend writes it again) */ }
  return { at, config, reads };
}

// The readers a later entry of the sync notes asks a baseline to name, each by its own step (shapeReadsParsed).
const LATER_READERS = ["csharp-tree", "javascript-tree", "python-tree"];

// Whether a baseline names `readers`, else the mend that writes it again.
const readersNamed = (held, readers) => {
  const missing = readers.filter(r => !held.reads.includes(r)).map(r => READERS[r]);
  return missing.length ? `The shape check's baseline \`${held.config.baseline}\` was written before the check read ${missing.join(", ")}: run \`node core/scripts/shape.mjs ${held.at} --write\`, which lists what stands there and names every reader, and commit the baseline in a pull request of its own. Until then what the pull request's base held there is reported, never failed.` : null;
};

// Whether the shape check's own list is written (AGENTS.md, "Nothing locks a project": no old breach goes unlisted):
// its config, where the manifest names it or the starter kit writes it, read as the check reads it, and the baseline
// that config names, which names every reader of the check's but those a later entry asks for ("reads";
// shape-readers.mjs), so that it lists what each finds. Null where all of it stands; else the mend.
export function shapeWritten(p) {
  const held = shapeHeld(p);
  if (held.off) return null;
  return held.mend ?? readersNamed(held, Object.keys(READERS).filter(r => !LATER_READERS.includes(r)));
}

// Whether the shape check's baseline names `reader`, one of its readers on the parser, so that it lists what that reader
// finds: the baseline its config names, or, where the project has no config yet, the one the starter kit's names, which
// the check holds it to. Null where it does, and where there is no such baseline or the config cannot be read, which
// the step of 16 November reports: the first baseline it asks for names every reader.
export function shapeReadsParsed(p, reader) {
  const held = shapeHeld(p);
  if (held.off) return null;
  if (!held.mend) return readersNamed(held, [reader]);
  if (!held.none) return null;
  const config = JSON.parse(fs.readFileSync(path.join(HERE, "setup/template/shape.json.tmpl"), "utf8")), baseline = p.read(config.baseline);
  if (baseline === null) return null;
  let reads = [];
  try { reads = parseBaseline(baseline, config.baseline, "").reads; } catch { /* (read as naming no reader) */ }
  return readersNamed({ at: shapeAt(p.manifest), config, reads }, [reader]);
}

// What is left to the project once a step's writer wrote the baseline (each step that writes it gives it as its `left`):
// its own scans of paths named, which the core cannot read (#1289); none where the config cannot be read again, which
// the step's check then says.
export function shapeLeft(p) {
  try { const at = shapeAt(p.manifest); return scanMend(parseConfig(p.read(at), at).baseline); } catch { return null; }
}
