// What the step of the size marks' start reads and writes (#1272, point 4): each file the core's part of `AGENTS.md`
// and `CLAUDE.md` pulls in, which every session reads at its start, named under the size marks' "read", so that the
// reading-size check counts the start whole. steps/824-… names both; steps.mjs, beside this file, runs them. Node's
// own modules.
import { marksConfig } from "./check-configs.mjs";
import { BLOCKS } from "./core-owned.mjs";
import { pulledIn } from "./init.mjs";
import { cut, moved } from "./step-checks-moved.mjs";
import { copyAt } from "./workflow-calls.mjs";
import { marksWritten } from "./step-writers.mjs";
import { shown } from "./step-checks.mjs";

// The size marks, as JSON, and the files the core's part pulls in that git tracks and their "read" leaves out: a file of
// the part that is no regular file of the project's own stays out, as the reading-size check would refuse it, and so
// does one "read" names by the path it had before the rules' move, which that step writes (step-checks-moved.mjs). Marks
// that cannot be read, or are not in the check's form, throw: the step is then said not read, never done.
function uncounted(p) {
  const marks = marksConfig(p), text = p.read(marks);
  let json = null;
  try { json = JSON.parse(text ?? "null"); } catch { /* (read below as not in the check's form) */ }
  if (!json?.read || typeof json.read !== "object" || Array.isArray(json.read) || !Number.isInteger(json.each)) throw new Error(`\`${shown(marks)}\` is no regular file the reading-size check reads, holding "each" and "read"`);
  const files = new Set(p.files), map = moved(), copy = copyAt(p), parts = BLOCKS.map(f => partOf(p.read(f) ?? "", copy, f));
  const named = new Set(Object.keys(json.read).flatMap(f => [f, ...(f.startsWith(copy) && map[f.slice(copy.length)] ? [`${copy}${map[f.slice(copy.length)]}`] : [])]));
  return { marks, json, missing: [...new Set(pulledIn(parts))].filter(f => files.has(f) && p.safe(f) && !named.has(f)) };
}

// The core's part of a rule file's text: within its marks; where it has none, as a kit wrote it before the marks
// (#1083), its lines that import a file of the copy. Marks that stand apart or more than once throw: which part is the
// core's cannot be told, and the step is then said not read.
function partOf(crlf, copy, f) {
  const text = crlf.replace(/\r\n/gu, "\n"), c = cut(text);
  if (!c) throw new Error(`\`${f}\` holds the core's marks apart or more than once`);
  return c.length === 3 ? c[1] : text.split(/\r?\n/u).filter(l => l.startsWith(`@${copy}`)).join("\n");
}

// The step's check: the mend, naming each file, or null where "read" names every one.
export function startCounted(p) {
  const { marks, json, missing } = uncounted(p), them = missing.length > 1 ? "them" : "it";
  return missing.length ? `Under "read" in \`${shown(marks)}\`, name ${missing.map(f => `\`${f}\``).join(", ")}${missing.length > 1 ? ", each" : ""} at ${json.each}, the marks' "each": the core's part of \`AGENTS.md\` or \`CLAUDE.md\` pulls ${them} in, so every session reads ${them} at its start, and the reading-size check counts only what "read" names.` : null;
}

// The step's writer: each such file named under "read" at the marks' "each".
export function writeStart(p, busy) {
  const { marks, json, missing } = uncounted(p);
  return missing.length ? marksWritten(p, { marks, json }, j => { for (const f of missing) j.read[f] = j.each; }, busy) : [];
}
