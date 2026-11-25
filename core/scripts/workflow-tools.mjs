// The maintained tools of the workflow check (workflows.mjs, beside this file; #580): zizmor, which audits a workflow or
// an action for what floor rule 2 forbids and more (untrusted text in a script, an action not pinned, a token kept
// past its step), and actionlint, which reads a workflow as GitHub does, its syntax check refusing a key given twice
// (#393) and its expression check a context that does not exist. Each is fetched at set-up as its own program
// (workflow-tools.sh beside this file), never here, and run with the core's policy as its config (zizmor.yml and
// actionlint.yml beside this file), each file on its own, so that one it cannot read is named and the rest are read.
// The tool finds, and the core decides and words the failure: what the core judged safe is allowed in the config with
// its reason, or below (RUNNER_LABEL) where the config cannot say it. Node's own modules only.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TIMEOUT = 60000; // (ms a tool may take on one file: a project's take well under one)
const ZIZMOR_DOCS = "https://docs.zizmor.sh/audits/", ACTIONLINT_DOCS = "https://github.com/rhysd/actionlint/blob/v1.7.12/docs/checks.md";

// Whether a file read is a workflow (actionlint reads no action), or an action's own file (zizmor reads a workflow and
// an action, and nothing else under .github/actions/).
export const isWorkflow = f => /^\.github\/workflows\/[^/]+\.ya?ml$/iu.test(f);
export const isAction = f => /(^|\/)action\.ya?ml$/iu.test(f);

// zizmor's findings in its JSON (format json-v1) for the file `file`, each { file, line, tool, rule, said, url }; null
// where the output is no such JSON. One it marks ignored, by a comment in the file, is left out.
export function zizmorFindings(stdout, file) {
  let all; try { all = JSON.parse(stdout); } catch { return null; }
  if (!Array.isArray(all)) return null;
  return all.filter(f => f && !f.ignored).map(f => {
    const at = (f.locations ?? []).find(l => l?.symbolic?.kind === "Primary") ?? f.locations?.[0];
    const note = at?.symbolic?.annotation ? ` (${at.symbolic.annotation})` : "";
    // (`what`: its severity and the text it flags, which compared() reads so that a finding is not swapped for a worse one of the same words)
    return { file, line: (at?.concrete?.location?.start_point?.row ?? 0) + 1, tool: "zizmor", rule: String(f.ident), said: `${f.desc}${note}`, url: String(f.url || ZIZMOR_DOCS),
      what: `${f.determinations?.severity ?? ""}\0${at?.concrete?.feature ?? ""}` };
  });
}

// actionlint's findings in its JSON (-format '{{json .}}') for the file `file`, as zizmorFindings() gives them.
export function actionlintFindings(stdout, file) {
  let all; try { all = JSON.parse(stdout.trim() || "[]"); } catch { return null; }
  if (!Array.isArray(all)) return null;
  return all.filter(e => e && !RUNNER_LABEL(e)).map(e => ({ file, line: Number(e.line) || 1, tool: "actionlint", rule: String(e.kind), said: String(e.message), url: ACTIONLINT_DOCS }));
}
// (a runner's label actionlint does not know: a project's own runners have labels of their own, which floor rule 2
// leaves to it, and a job that names none of them waits where GitHub shows it)
const RUNNER_LABEL = e => e.kind === "runner-label";

// A file a tool stopped on, or could not read, as a finding of its own (rule "unread"), so that it fails where the
// change made it so and is noted where the base held it too.
const unread = (file, tool, why) => ({ file, line: 1, tool, rule: "unread", said: `${tool} could not read the file (${why})`, url: tool === "zizmor" ? ZIZMOR_DOCS : ACTIONLINT_DOCS });
const why = r => (r.error?.code === "ETIMEDOUT" ? `it ran past ${TIMEOUT / 1000} s` : r.error ? r.error.code : r.signal ? `it stopped on ${r.signal}` : `it ended with status ${r.status}`);

// The tools run on the files of `root` (paths relative to it), as { found, unrun }: `found` the findings; `unrun` the
// names of the tools that were not fetched here (`tools`, { zizmor, actionlint }, their programs from the environment
// where the job's set-up step fetched them; workflow-tools.sh), which then decide nothing.
export function run(root, files, tools) {
  const found = [], unrun = [];
  for (const [name, read, each] of [["zizmor", files.filter(f => isWorkflow(f) || isAction(f)), zizmorOn], ["actionlint", files.filter(isWorkflow), actionlintOn]]) {
    if (!read.length) continue;
    if (!tools[name]) unrun.push(name);
    else for (const f of read) found.push(...each(tools[name], root, f));
  }
  // (a workflow zizmor could not load is left to actionlint's word on why, where actionlint ran and refused it, by its
  // syntax check or as unread; otherwise zizmor's own word stands, so that no file passes unread by it)
  const said = new Set(found.filter(f => f.tool === "actionlint" && (f.rule === "syntax-check" || f.rule === "unread")).map(f => f.file));
  return { found: found.filter(f => !f.quiet || !said.has(f.file)).map(({ quiet, ...f }) => f), unrun };
}
const go = (program, root, args) => spawnSync(program, args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, timeout: TIMEOUT, windowsHide: true });

// zizmor on one file: its findings, or the word that it could not read it. Status 3 is zizmor's "no inputs collected":
// it could not load the file as a workflow or an action. For a workflow it is marked `quiet`, and run() keeps it only
// where actionlint said nothing of the file, so that it is not said twice; for an action it is said, since nothing else reads it.
function zizmorOn(program, root, f) {
  const r = go(program, root, ["--offline", "--no-progress", "--format", "json-v1", "--no-exit-codes", "--config", path.join(HERE, "zizmor.yml"), "--", f]);
  const got = r.status === 0 ? zizmorFindings(r.stdout ?? "", f) : null;
  if (got) return got;
  if (r.status !== 3 || r.error || r.signal) return [unread(f, "zizmor", why(r))];
  return isWorkflow(f) ? [{ ...unread(f, "zizmor", "it is no workflow it could load: a key given twice, a part GitHub asks for missing, or no YAML"), quiet: true }]
    : [unread(f, "zizmor", "it is no action GitHub could run: a key given twice, a part GitHub asks for missing, or no YAML")];
}

// actionlint on one file: its findings (status 1 where it found some), or the word that it could not read it.
function actionlintOn(program, root, f) {
  const r = go(program, root, ["-format", "{{json .}}", "-shellcheck=", "-pyflakes=", "-no-color", "-config-file", path.join(HERE, "actionlint.yml"), "--", f]);
  const got = r.status === 0 || r.status === 1 ? actionlintFindings(r.stdout ?? "", f) : null;
  return got ?? [unread(f, "actionlint", why(r))];
}

// A finding's line, its lead FAIL or note, `was` what it adds of the base.
export const line = (f, lead, was = "") => `${lead} ${f.file}:${f.line}: ${f.tool}'s ${f.rule}: ${f.said}${was}. Mend: ${
  f.rule === "unread" ? `write the file as GitHub reads a workflow or an action, plain YAML nested no deeper than it needs, so that ${f.tool} reads it; then mend what it says`
  : f.tool === "zizmor" ? `mend it as zizmor's page for ${f.rule} says (${f.url}); where it is safe there, end its line with a comment "# zizmor: ignore[${f.rule}]" and say why beside it, which the reviews read`
  : `mend it as the line says (actionlint's checks: ${f.url})`}`;

// The findings of the head against the base's, as { fails, notes } of lines: of each kind in each file (the file, the
// tool, its rule and what it said, with zizmor's severity and the text it flags, its line aside, and any position written
// into what it said, as actionlint's "previously defined at line:2,col:3", so that a finding moved is no new finding), as many as the base held are noted
// and the rest fail; with no base (`base` null), each is a note.
const placeless = said => said.replace(/\b(line|col|column|row)(:\s*|\s+)\d+/giu, "$1$2#");
export function compared(head, base) {
  const key = f => `${f.file}\0${f.tool}\0${f.rule}\0${placeless(f.said)}\0${f.what ?? ""}`, held = new Map();
  for (const f of base ?? []) held.set(key(f), (held.get(key(f)) ?? 0) + 1);
  const fails = [], notes = [];
  for (const f of head) {
    const n = held.get(key(f)) ?? 0;
    if (base && n <= 0) fails.push(line(f, "FAIL"));
    else { notes.push(line(f, "note", base ? ", as on the base" : "")); held.set(key(f), n - 1); }
  }
  return { fails, notes };
}
