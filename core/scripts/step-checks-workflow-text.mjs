// What the steps read of the text of the project's workflows: a key given twice, a line break the YAML package does
// not read (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words
// they share). Each piece takes the project as steps.mjs's `project` reads it and returns the mend, or null where the
// step is done; a step names the ones it needs, none runs by itself. It reads only. Node's own modules and git only.
import { installed } from "./packages.mjs";
import { copyAt } from "./workflow-calls.mjs";
import { foreignBreaks, keysTwice, reads } from "./workflows.mjs";
import { DEEPEST, LONGEST } from "./yaml-keys.mjs";

// Each key given twice in one mapping of a workflow or an action of the project's own, as the workflow check reads
// them (workflows.mjs and yaml-keys.mjs, beside this file), which GitHub refuses, running none of the file's jobs: the
// old ones, which the check notes and passes, listed here at every sync until they are gone (#393). Null where none is.
export function keysOnce(p) {
  // (with the core's packages not installed, as after a sync made by a copy from before #654, this step cannot be read:
  // it says so, with the install, and every other step is still told)
  if (!installed("yaml")) return `The core's packages are not installed, so the workflows could not be read for a key given twice: run \`if [ -f ${copyAt(p)}scripts/install.mjs ]; then node ${copyAt(p)}scripts/install.mjs; fi\`, then \`node ${copyAt(p)}scripts/steps.mjs\` again.`;
  const read = reads(p.files, copyAt(p)).map(f => [f, keysTwice(p.read(f) ?? "")]);
  const all = read.flatMap(([f, keys]) => keys.filter(k => k.key !== null).map(k => `\`${f}\` line ${k.line}, "${k.key}" (first on line ${k.first})`));
  const found = all.length > 25 ? [...all.slice(0, 25), `and ${all.length - 25} more, which show once these are mended`] : all; // (a hostile file gives a key for each line: #970)
  const unread = by => read.filter(([, keys]) => keys.some(k => k.key === null && Boolean(k.size) === by)).map(([f]) => `\`${f}\``), deep = unread(false), long = unread(true);
  const said = [
    found.length ? `In one pull request, keep one of the two keys where a workflow or an action of the project's gives one twice in a mapping, with what both said in it (two \`if:\` conditions joined by \`&&\`, two \`env:\` mappings as one), since GitHub runs none of such a file's jobs: ${found.join("; ")}.` : "",
    deep.length ? `In one pull request, nest the lists and mappings of these workflows or actions no deeper than a workflow needs, a few levels, since past ${DEEPEST} deep a key given twice in them cannot be read: ${deep.join("; ")}.` : "",
    long.length ? `In one pull request, cut these workflows or actions to under ${LONGEST} characters, the steps they repeat moved to a script or a workflow of their own, since past that a key given twice in them cannot be read: ${long.join("; ")}.` : ""];
  return said.filter(Boolean).join(" ") || null;
}

// Each workflow or action of the project's own that holds a line break YAML 1.1 reads and the YAML package the workflow check
// reads with does not (U+0085, U+2028, U+2029), as the workflow check reads them (workflows.mjs, foreignBreaks): the old
// ones, which the check notes and passes, listed here at every sync until they are gone (#876). Null where none is.
export function lineBreaksMended(p) {
  const found = reads(p.files, copyAt(p)).map(f => [f, foreignBreaks(p.read(f) ?? "")]).filter(([, b]) => b)
    .map(([f, b]) => `\`${f}\` line ${b.line}, ${b.code}${b.count > 1 ? ` and ${b.count - 1} more` : ""}`);
  return found.length ? `In one pull request, replace each U+0085, U+2028 or U+2029 of a workflow or an action of the project's with an ordinary line feed (inside a double-quoted string, with the escape of its own code, \\u0085, \\u2028 or \\u2029), since a reader of YAML 1.1 reads each as a line end and the workflow check's does not: ${found.join("; ")}.` : null;
}
