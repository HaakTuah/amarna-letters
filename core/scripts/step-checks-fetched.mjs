// What the steps whose findings only a tool fetched at set-up reads answer, where the session fetched it (#1095, point 4):
// zizmor and actionlint on the project's workflows and actions, as the workflow check runs them (workflow-tools.mjs,
// fetched by workflow-tools.sh), and lychee on its rule files, as the pointer check runs it (links.mjs, fetched by
// lychee.sh), each beside this file. A step gives such a check as "fetched", beside its "unread", which stands where the
// tools are not there (steps.mjs, beside this file). Each lists what the tool finds standing in the project, by file,
// line and what it found: no base is read, since what stands is what the step's one task names. The tool finds, and the
// core words it, as the checks do; nothing is fetched here.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { lycheeReads, readable, run as linksOn } from "./links.mjs";
import { ruleFiles, toolFiles } from "./rule-files.mjs";
import { keysTwice, reads } from "./workflows.mjs";
import { run as toolsOn } from "./workflow-tools.mjs";
import { copyAt, readable as yamlRead } from "./workflow-calls.mjs";
import { shown } from "./step-checks.mjs";

// The most findings a mend names, the rest counted, so that a project with many keeps a report a session reads whole.
export const NAMED = 20;
const listed = (all, each) => `${all.slice(0, NAMED).map(each).join("; ")}${all.length > NAMED ? `; and ${all.length - NAMED} more, which the check's run lists` : ""}`;

// zizmor's and actionlint's findings on the project's own workflows and actions (programs from `env`), or null where
// they find none; a file a tool could not read is a finding too, as the check's run fails it. What another step reads
// already is its own: a key given twice is step 460's, its line left out, and a workflow the core's reader cannot read
// for another reason throws, so the step is reported as not read, as each step that reads it is (workflow-calls.mjs).
// A file the project's reader would not read (own-files.mjs, `safe`) is given to neither tool, and where a tool
// cannot start, the step throws, never read done or not done.
export function workflowFindings(p, env = process.env) {
  const tools = { zizmor: env.ZIZMOR || "", actionlint: env.ACTIONLINT || "" };
  for (const [name, program] of Object.entries(tools)) {
    const r = spawnSync(program, ["--version"], { encoding: "utf8", timeout: 30_000, windowsHide: true });
    if (r.error || r.status !== 0) throw new Error(`${name} could not start (${r.error?.code ?? r.signal ?? `exit ${r.status}`})`);
  }
  const twiceIn = text => keysTwice(text).filter(k => k.key !== null);
  yamlRead(p, text => !twiceIn(text).length);
  const files = reads(p.files, copyAt(p)).filter(f => p.safe(f));
  const twice = new Set(files.flatMap(f => twiceIn(p.read(f) ?? "").map(k => `${f}:${k.line}`)));
  const found = toolsOn(p.root, files, tools).found.filter(f => !(f.rule === "syntax-check" && twice.has(`${f.file}:${f.line}`)));
  return found.length ? listed(found, f => `\`${shown(f.file)}\`:${f.line} ${f.tool}'s ${shown(f.rule)}`) : null;
}

// lychee's findings on the project's rule files (the program from `env`), as the pointer check reads them: a link to no
// file or folder git tracks, one out of the project, a heading that is not there; or null where it finds none. Where
// lychee could not run, or the rule files cannot be named, it throws, and the step is reported as not read. A rule file
// the project's reader would not read (a link out of the project, past its size: own-files.mjs, `safe`) is left out.
export function linkFindings(p, env = process.env) {
  const read = f => p.read(f), under = dir => p.files.filter(f => f.startsWith(`${dir}/`));
  const own = ruleFiles(read, under), rules = [...new Set([...own, ...toolFiles(read, under)])];
  const folders = new Set(p.files.flatMap(f => f.split("/").slice(0, -1).map((_, i, s) => `${s.slice(0, i + 1).join("/")}/`)));
  const files = rules.filter(f => p.files.includes(f) && p.safe(f) && lycheeReads(f) && readable(fs.readFileSync(path.join(p.root, f))));
  const r = linksOn({ program: env.LYCHEE, root: fs.realpathSync(p.root), files, tracked: new Set(p.files), folders, text: read });
  if (r.unread) throw new Error(`lychee could not run on the rule files: ${r.unread}`);
  return r.found.length ? listed(r.found, f => `\`${shown(f.file)}\`:${f.line} to ${shown(f.to)}`) : null;
}
