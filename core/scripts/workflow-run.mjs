// What the upgrade test stands on (upgrade-test.mjs): it runs a workflow of the core's as GitHub would run it for a
// project, job by job and step by step, so that the test runs each check's own shell and not a copy of it. It reads
// the workflow's YAML with parse-yaml.mjs, evaluates GitHub's expressions with workflow-expressions.mjs, and runs each
// job whose `if` holds, a job for each combination of its matrix, its include and exclude read as GitHub's page on the
// workflow syntax defines them (#1263): each `run` step in bash as GitHub runs it (with -e, and pipefail where its shell
// is named bash), its env and its expressions filled in, its outputs read from GITHUB_OUTPUT; each `uses` step by a handler the caller gives for that action, or not at all, said so. A context,
// function or matrix it does not know throws, so a workflow the core changes in a way this cannot read fails the test,
// and is taught here, rather than running other than GitHub would. Its runner is run by the tests, and by check.mjs,
// which runs the core's checks from plain git where no GitHub runs them (tasks/hosts.md); no workflow of the core's
// runs it. Node's own modules, the YAML reader (parse-yaml.mjs), the expressions' (workflow-expressions.mjs) and the
// install step's copies (workflow-install.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseYaml } from "./parse-yaml.mjs";
import { evaluate, fill, holds, str } from "./workflow-expressions.mjs";
import { installKey, keepInstall, takeInstall } from "./workflow-install.mjs";
import { inNeedsOrder, needsOf } from "./workflow-needs.mjs";

// (the expressions, for those that import them from the runner, check.mjs among them)
export { evaluate, fill, holds };

// ---- running a called workflow ----

// A value as written: a whole `${{ }}` gives the expression's own value (a list, say), anything else is text.
const valueOf = (v, contexts) => {
  const whole = typeof v === "string" && /^\s*\$\{\{([\s\S]*)\}\}\s*$/.exec(v);
  return whole ? evaluate(whole[1], contexts) : v;
};
// A job's matrix as its combinations ([null] for a job with none), as GitHub's page on the workflow syntax defines
// `jobs.<job_id>.strategy.matrix` (#1263): each key's list, in the order the keys are written; then each `exclude` entry
// takes out every combination it matches in part; then each `include` entry, in order, adds its values to every original
// combination where it overwrites no original value (an added one it may), and where it fits none stands as a
// combination of its own, which no later entry extends. A matrix of include alone runs each entry. What the page leaves
// undefined (an exclude of a key the matrix lacks, an entry that is no mapping, a key `__proto__`, a matrix that makes
// no job) stops the test, to be taught.
function combinations(matrix, contexts) {
  if (matrix === undefined || matrix === null) return [null];
  const m = valueOf(matrix, contexts);
  if (!isMapping(m) || Object.hasOwn(m, "__proto__")) throw new Error(`a matrix this runner does not know: ${JSON.stringify(matrix)}`);
  const { include = [], exclude = [], ...vars } = m;
  const known = k => Object.hasOwn(vars, k);
  let list = Object.keys(vars).length ? [{}] : [];
  for (const [key, raw] of Object.entries(vars)) {
    const values = valueOf(raw, contexts);
    if (!Array.isArray(values)) throw new Error(`a matrix this runner does not know: ${key}`);
    list = list.flatMap(c => values.map(v => ({ ...c, [key]: v })));
  }
  for (const entry of entries(exclude, "exclude", contexts)) {
    const lacking = Object.keys(entry).find(k => !known(k));
    if (lacking) throw new Error(`a matrix's exclude names ${lacking}, which the matrix lacks: this runner does not know what GitHub does with it`);
    list = list.filter(c => !Object.entries(entry).every(([k, v]) => same(c[k], v)));
  }
  const added = [];
  for (const entry of entries(include, "include", contexts)) {
    const fits = list.filter(c => Object.entries(entry).every(([k, v]) => !known(k) || same(c[k], v)));
    for (const c of fits) Object.assign(c, entry);
    if (!fits.length) added.push({ ...entry });
  }
  const all = [...list, ...added];
  if (!all.length) throw new Error(`a matrix that makes no job, which this runner does not know: ${JSON.stringify(matrix)}`);
  return all;
}

const isMapping = v => v !== null && typeof v === "object" && !Array.isArray(v);
// A matrix's include or exclude: a list of mappings, written so or given by an expression.
function entries(raw, what, contexts) {
  const list = valueOf(raw, contexts);
  if (!Array.isArray(list) || !list.every(e => isMapping(e) && !Object.hasOwn(e, "__proto__"))) throw new Error(`a matrix's ${what} this runner does not know: ${JSON.stringify(raw)}`);
  return list;
}
// Whether two of a matrix's values are the same: equal as written, a mapping or list by each of its values.
const same = (a, b) => (isMapping(a) && isMapping(b) ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => same(a[k], b[k]))
  : Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, k) => same(x, b[k])) : a === b);

const outputsOf = file => {
  const out = {};
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n") : [];
  for (let k = 0; k < lines.length; k++) {
    const heredoc = /^([\w-]+)<<(.+)$/.exec(lines[k]);
    if (heredoc) { const end = lines.indexOf(heredoc[2], k + 1); out[heredoc[1]] = lines.slice(k + 1, end).join("\n"); k = end; continue; }
    const kv = /^([\w-]+)=(.*)$/.exec(lines[k]);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
};

/**
 * Runs each job of a called workflow (its text) as GitHub would for one event, each after the jobs it needs, and gives
 * each job's result: { job, ran, passed, steps: [{ name, ran, passed, out, missing }], declared: its own outputs, unrun, stopped: behind a failed need }. `inputs` and `secrets` are what the call passes (defaults
 * filled in here); `github` the github context; `base` the environment every step starts from; `workspace(job)` a
 * fresh folder for a job's runner; `uses` maps an action (its name before @) to a handler (step `with`, filled in;
 * the job's folder; the job's env) that does its part, or returns false where it stands for a step not run here.
 * With `dry`, it only says which jobs would start: each one that starts is a job the repository's owner pays for.
 * With `until`, a job stops after the step of that id (each job's `outputs` hold its steps' outputs). With `stop`, a
 * step that fails where `stop(its name)` holds cancels the rest of its job, as a run cancelled there: a step that runs
 * where `!cancelled()` runs no more. With `machine`, a job on another system is unrun. Each job's own
 * temporary folder is made under `temp` and removed when the job ends.
 */
// Whether a trigger's `paths:` filter lets a change through, as GitHub's cheat sheet reads one: `*` (no slash), `**`
// (any folders, none included, where `**/` begins it), `?` and `+` (zero or one, and one or more, of the character
// before), `[...]`, `\` before a character taking it as itself, and `!` before a pattern taking out what it matches;
// the last pattern a file matches decides, and the workflow starts where any changed file is let through. A `?` or `+`
// with nothing before it to repeat, and a `[` or `]` that closes no class, is taken as itself: every pattern is read.
export function pathsLetThrough(patterns, changed) {
  const rules = patterns.map(p => (p.startsWith("!") ? [false, globItems(p.slice(1))] : [true, globItems(p)]));
  return changed.some(f => rules.reduce((let_, [keep, items]) => (globMatches(items, f) ? keep : let_), false));
}

// A pattern as items, each one character's test with how often it may stand (`min` 0 or 1, `many`), or the folders
// `**/` stands for; the matcher walks them over a name keeping every position it could have reached at once, so no
// pattern makes it go back, and its work grows with the pattern's length times the name's, never more.
function globItems(glob) {
  const items = [];
  const one = test => items.push({ test, min: 1, many: false, single: true });
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i], last = items[items.length - 1];
    if (c === "\\" && i + 1 < glob.length) { const x = glob[++i]; one(ch => ch === x); }
    else if (glob.startsWith("**/", i)) { items.push({ folders: true }); i += 2; }
    else if (glob.startsWith("**", i)) { items.push({ test: () => true, min: 0, many: true }); i += 1; }
    else if (c === "*") items.push({ test: ch => ch !== "/", min: 0, many: true });
    else if (c === "[" && glob.indexOf("]", i + 2) > i) {
      const end = glob.indexOf("]", i + 2), set = glob.slice(i + 1, end);
      one(ch => [...set.matchAll(/(.)-(.)|(.)/gsu)].some(([, a, b, x]) => (x === undefined ? ch >= a && ch <= b : ch === x)));
      i = end;
    } else if ((c === "?" || c === "+") && last?.single) {
      last.single = false;
      if (c === "?") last.min = 0; else last.many = true;
    } else one(ch => ch === c);
  }
  return items;
}

function globMatches(items, name) {
  let at = new Set([0]);
  for (const item of items) {
    const next = new Set();
    if (item.folders) {
      let from = name.length;
      for (const p of at) { next.add(p); if (p < from) from = p; }
      for (let j = from; j < name.length; j++) if (name[j] === "/") next.add(j + 1);
    } else {
      for (const p of at) if (item.min === 0) next.add(p);
      for (const p of [...at].sort((a, b) => a - b)) {
        for (let j = p; j < name.length && item.test(name[j]); j++) {
          if (next.has(j + 1) && item.many) break;
          next.add(j + 1);
          if (!item.many) break;
        }
      }
    }
    at = next;
    if (!at.size) return false;
  }
  return at.has(name.length);
}

// The shell a step runs in: its own, its job's default or the workflow's; bash alone, or none named.
function shellOf(step, job, defaults, id) {
  const shell = step.shell ?? job.defaults?.run?.shell ?? defaults;
  if (shell !== undefined && shell !== "bash") throw new Error(`a shell this runner does not know: ${shell} (in ${id})`);
  return shell;
}

// What a step wrote to GITHUB_ENV (the file `file`), NAME=value a line, set in `env`, the environment of every step after
// it, as GitHub sets it; the file is emptied for the next step.
function carryEnv(file, env, id) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean)) {
    const at = line.indexOf("=");
    if (at <= 0) throw new Error(`a line of GITHUB_ENV in a form this runner does not read: ${line.slice(0, 80)} (in ${id})`);
    env[line.slice(0, at)] = line.slice(at + 1);
  }
  fs.rmSync(file);
}

// The inputs the workflow is called with, the declared ones' defaults filled in; a call that gives one the workflow does
// not take, or leaves out a required input or secret, throws.
function callInputs(wf, inputs, secrets) {
  const declared = wf.on?.workflow_call?.inputs ?? {};
  const given = Object.fromEntries(Object.entries(declared).map(([name, d]) => [name, name in inputs ? inputs[name] : d?.default ?? (d?.type === "boolean" ? false : "")]));
  for (const name of Object.keys(inputs)) if (!(name in declared)) throw new Error(`an input the workflow does not take: ${name}`);
  for (const [name, d] of Object.entries(declared)) if (d?.required && !(name in inputs)) throw new Error(`the call leaves out a required input: ${name}`);
  for (const [name, d] of Object.entries(wf.on?.workflow_call?.secrets ?? {})) if (d?.required && !(name in secrets)) throw new Error(`the call leaves out a required secret: ${name}`);
  return given;
}

// `once`, for a test that runs many jobs of one workflow: { pattern, store, temp }. A `run` step whose text matches
// `pattern` and whose effect lies outside the workspace (a tool fetched into the runner's folder, which a later step
// reads by the path it puts in GITHUB_ENV) runs once for each text; every later job takes its result and its GITHUB_ENV
// lines from `store`, a Map the caller keeps, and finds the tool in `temp`, a folder the caller makes and removes, which
// that first run was given in place of its job's own.
//
// `installed`, for the same: { store, temp }, a Map the caller keeps and a folder it makes and removes. A `run` step that
// runs the core's install.mjs puts the packages into the workspace, so it runs once for each text, env and set of lock
// files; every later job takes its result and a hard-linked copy of what the first one installed (each node_modules/ and
// pypi/ below the core's .packages/), as the first run left it.
//
// `sayUnread`, for check.mjs (#1263, point 1): a job, or a combination of its matrix, that this cannot read is given
// `unread`, why, in place of throwing, and the other jobs run on, each keeping its own verdict; a job that needs one
// unread measured nothing, and is unread too, never given a guessed result. Without it, it throws, as above.
export function runWorkflow(text, { inputs = {}, secrets = {}, github, base, workspace, uses, runner = {}, dry = false, until = null, stop = null, temp = os.tmpdir(), once = null, installed = null, machine = null, sayUnread = false }) {
  const wf = parseYaml(text);
  const rt = { defaults: wf.defaults?.run?.shell, github, base, workspace, uses, runner, dry, until, stop, temp, once, installed, machine, sayUnread };
  const given = callInputs(wf, inputs, secrets);
  const results = [], done = {}, stopped = new Set(), unread = new Set();
  for (const [id, job] of inNeedsOrder(wf.jobs ?? {})) {
    const lost = needsOf(job).filter(n => unread.has(n));
    if (lost.length) { unread.add(id); results.push(unreadJob(id, `it needs ${lost.join(", ")}, which this runner could not read`)); continue; }
    try {
      runOne(rt, { id, job, given, secrets, done, stopped }, results);
    } catch (e) {
      if (!sayUnread) throw e;
      unread.add(id);
      results.push(unreadJob(id, e.message));
    }
    if (results.some(r => r.unread && (r.job === id || r.job.startsWith(`${id} (`)))) unread.add(id);
  }
  return results;
}

// A job this runner could not read: it ran not, and measured nothing.
const unreadJob = (job, why) => ({ job, ran: false, passed: false, steps: [], outputs: {}, unread: why });

// One job of the workflow, a job for each combination of its matrix, its result and outputs put in `done` for the jobs
// that need it.
function runOne(rt, { id, job, given, secrets, done, stopped }, results) {
  // (the needs context; a job whose condition asks no status is skipped where a need did not succeed, and is
  // `stopped` where one failed or was stopped and its own condition held: #1245, points 2 and 3)
  const needs = Object.fromEntries(needsOf(job).map(n => [n, done[n]]));
  const top = { github: rt.github, inputs: given, secrets, vars: {}, needs };
  if (!holds(job.if, top, { failed: Object.values(needs).some(n => n.result !== "success") })) {
    const behind = needsOf(job).some(n => done[n].result === "failure" || stopped.has(n)) && holds(job.if, top, { failed: false });
    if (behind) stopped.add(id);
    results.push({ job: id, ran: false, passed: true, steps: [], outputs: {}, ...behind && { stopped: true } }); done[id] = { result: "skipped", outputs: {} }; return;
  }
  const from = results.length;
  // (a matrix makes a job of each of its combinations, each one billed, named by its values as GitHub names it)
  for (const matrix of combinations(job.strategy?.matrix, top)) runMatrixJob(rt, job, id, top, matrix, results);
  const mine = results.slice(from);
  done[id] = { result: mine.every(r => r.passed) ? "success" : "failure", outputs: Object.assign({}, ...mine.map(r => r.declared)) };
}

// One job of a workflow for one combination of its matrix (null for none): its runner folder made, the job run, the folder removed.
function runMatrixJob(rt, job, id, top, matrix, results) {
  const tmp = fs.mkdtempSync(path.join(rt.temp, "runner-temp-"));
  const ctx = { ...top, runner: { temp: tmp, os: "Linux", ...rt.runner }, env: {}, steps: {}, matrix: matrix ?? {} };
  const state = { failed: false };
  const result = { job: matrix ? `${id} (${Object.values(matrix).map(str).join(", ")})` : id, ran: true, passed: true, steps: [], outputs: ctx.steps, declared: {} };
  results.push(result);
  try {
    if (rt.dry) return;
    const away = rt.machine && elsewhere(fill(job["runs-on"], ctx, state), rt.machine);
    if (away) { Object.assign(result, { ran: false, unrun: `it runs on ${away}, which this machine is not` }); return; }
    runJob({ rt, job, id, ctx, state, result, tmp });
    // (the job's own outputs, as its `outputs:` fills them in from its steps, for the jobs that need it)
    result.declared = fillValues(job.outputs, ctx, state);
  } catch (e) {
    // (with sayUnread, a combination this cannot run as GitHub would is unread alone, the others kept)
    if (!rt.sayUnread) throw e;
    Object.assign(result, { ran: false, passed: false, unread: e.message, declared: {} });
  } finally { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
}

// The system a job's `runs-on` names where it is not `platform` (process.platform's), or null (#1245, point 8): Windows
// or macOS alone, since a Linux runner's steps (the core's own jobs among them) run wherever bash and Node are, as they
// did before, a program the machine lacks said so (point 9). A label is read whole or by its first part, as
// windows-latest or macOS: a runner's own name such as machine-2 is none.
function elsewhere(on, platform) {
  const labels = [on?.labels ?? on].flat().map(l => str(l).split("-")[0].toLowerCase());
  const os = [["Windows", ["windows"], "win32"], ["macOS", ["macos", "mac"], "darwin"]].find(([, names]) => labels.some(l => names.includes(l)));
  return os && os[2] !== platform ? os[0] : null;
}

// A map's values, each with its `${{ }}` filled in as text.
const fillValues = (map, ctx, state) => Object.fromEntries(Object.entries(map ?? {}).map(([k, v]) => [k, fill(str(v), ctx, state)]));

// The steps of a job, in order, each one's result put in `jr.result`; `jr` holds the run's settings (`rt`), the job, its
// id, its contexts, its state, its result and its temporary folder.
function runJob(jr) {
  const { rt, job, id, ctx, state, result } = jr;
  jr.dir = rt.workspace(id);
  ctx.env = fillValues(job.env, ctx, state);
  for (const step of job.steps ?? []) {
    const name = step.name ?? step.uses ?? step.run?.split("\n")[0];
    if (!holds(step.if, ctx, state)) { result.steps.push({ name, ran: false, passed: true, out: "" }); continue; }
    const env = { ...ctx.env, ...fillValues(step.env, ctx, state) };
    if (step.uses) { runUses(jr, step, name, env); continue; }
    runScript(jr, step, name, env);
    if (rt.until && step.id === rt.until) return;
  }
}

// A `uses` step, by the handler the caller gave for its action.
function runUses(jr, step, name, env) {
  const { rt, ctx, state, result, dir, id } = jr;
  const action = step.uses.split("@")[0];
  const handler = rt.uses[action];
  if (!handler) throw new Error(`an action this test has no part for: ${action} (in ${id})`);
  const w = fillValues(step.with, ctx, state);
  let did;
  try {
    did = handler(w, dir, env);
  } catch (e) {
    // (a stand-in that refuses what the step asks of it fails the step, as the action would)
    result.steps.push({ name, ran: true, passed: false, out: `${e.message}\n` });
    failed(state, result, rt.stop, name);
    return;
  }
  result.steps.push({ name, ran: did !== false, passed: true, out: did === false ? "GitHub's own, not run here" : "" });
}

// The key a PATH stands under in an environment: PATH on POSIX, in any letter case on Windows, as each system reads it.
const pathKey = env => Object.keys(env).find(k => (process.platform === "win32" ? k.toUpperCase() === "PATH" : k === "PATH"));

// A PATH with only its absolute folders, each unquoted: an empty or relative entry, "." or a trailing ":" among them,
// is the folder a program starts in, which a change under check fills (#513).
export const absolutePath = value => String(value ?? "").split(path.delimiter).map(f => f.replace(/^"(.*)"$/u, "$1")).filter(f => path.isAbsolute(f)).join(path.delimiter);

// An environment whose PATH holds only absolute folders.
export function withAbsolutePath(env) {
  const key = pathKey(env);
  return key === undefined ? { ...env } : { ...env, [key]: absolutePath(env[key]) };
}

// The program a name stands for, by its full path from the PATH's own folders, never from the folder it would start in:
// on Windows a program started by its bare name is looked for there first, by Node and by cmd.exe alike, and a step's
// folder holds the change under check (#513). As the system looks, the name as it is, and on Windows with .com and
// .exe, which alone Node starts. Null where the PATH holds none it may run.
export function onPath(name, env = process.env) {
  const exts = process.platform === "win32" ? ["", ".com", ".exe"] : [""];
  const key = pathKey(env);
  for (const folder of absolutePath(key === undefined ? "" : env[key]).split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const file = path.join(folder, `${name}${ext}`);
      // (a file it may run: on POSIX one with its execute bit for this user, as the system's own search asks)
      try { if (fs.statSync(file).isFile() && (process.platform === "win32" || (fs.accessSync(file, fs.constants.X_OK), true))) return file; } catch { /* (not here, or not to run) */ }
    }
  }
  return null;
}

// What a `once` step is kept under: its text (its expressions filled in), its env and the programs it names as the project holds them, so a copy
// whose script differs runs it; null for a step that `once` does not name.
function onceKey(rt, text, cwd, env) {
  if (!rt.once?.pattern.test(text)) return null;
  const programs = [...text.matchAll(/\bscripts\/[\w.-]+\.sh\b/gu)].map(([f]) => { try { return fs.readFileSync(path.join(cwd, env.CORE_AT ?? "", f), "utf8"); } catch { return null; } });
  return JSON.stringify([text, env, programs]);
}

// A step's outcome as the steps context holds it, where it has an id.
function outcome(ctx, step, passed, outputs) {
  if (step.id) ctx.steps[step.id] = { outputs, outcome: passed ? "success" : "failure", conclusion: passed ? "success" : "failure" };
}

// A file's text, or "" where there is none.
const readIf = file => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");

// A `once` step that ran before: its result and its GITHUB_ENV lines, taken as if it had run now.
function replay(jr, step, name, seen) {
  const { rt, ctx, state, result, tmp, id } = jr;
  if (seen.env) { fs.writeFileSync(path.join(tmp, "env"), seen.env); carryEnv(path.join(tmp, "env"), ctx.env, id); }
  result.steps.push({ name, ran: true, passed: seen.passed, out: seen.out });
  outcome(ctx, step, seen.passed, seen.outputs);
  if (!seen.passed) failed(state, result, rt.stop, name);
}

// A `run` step in bash, its outputs and its GITHUB_ENV read when it ends.
function runScript(jr, step, name, env) {
  const { rt, job, ctx, state, result, tmp, dir, id } = jr;
  const output = path.join(tmp, `output-${result.steps.length}`);
  const script = path.join(tmp, `step-${result.steps.length}.sh`);
  const text = fill(step.run, ctx, state);
  fs.writeFileSync(script, text);
  const cwd = step["working-directory"] ? path.join(dir, fill(str(step["working-directory"]), ctx, state)) : dir;
  // (as GitHub runs it: a step that names no shell in bash with -e alone; one whose shell is bash, by its own word or
  // the defaults', with --noprofile --norc -e -o pipefail)
  const shell = shellOf(step, job, rt.defaults, id);
  // (bash by its full path from the PATH the step is given, and, on Windows, what it starts never looked for in its folder)
  const bash = onPath("bash", { ...rt.base, ...env });
  if (!bash) throw new Error("bash is on no folder of the PATH: install Git for Windows, whose bash runs the steps, or put bash on the PATH");
  const kept = onceKey(rt, text, cwd, env);
  const seen = kept && rt.once.store.get(kept);
  if (seen) return replay(jr, step, name, seen);
  const install = installKey(rt, text, cwd, env), taken = takeInstall(rt, install);
  if (taken) return replay(jr, step, name, taken);
  const r = spawnSync(bash, shell === "bash" ? ["--noprofile", "--norc", "-eo", "pipefail", script] : ["-e", script], { cwd, encoding: "utf8", env: {
    ...rt.base, ...env, ...(process.platform === "win32" ? { NoDefaultCurrentDirectoryInExePath: "1" } : {}), CI: "true", GITHUB_ACTIONS: "true", GITHUB_OUTPUT: output, GITHUB_ENV: path.join(tmp, "env"), GITHUB_STEP_SUMMARY: path.join(tmp, "summary"),
    GITHUB_WORKSPACE: dir, GITHUB_REPOSITORY: str(rt.github.repository), GITHUB_EVENT_NAME: str(rt.github.event_name), RUNNER_TEMP: kept ? rt.once.temp : tmp, RUNNER_OS: ctx.runner.os } });
  const passed = r.status === 0;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error?.message ?? ""}`, outputs = outputsOf(output);
  if (kept) rt.once.store.set(kept, { passed, out, outputs, env: readIf(path.join(tmp, "env")) });
  keepInstall(rt, install, { passed, out, outputs, env: readIf(path.join(tmp, "env")) });
  carryEnv(path.join(tmp, "env"), ctx.env, id);
  // (a program this machine lacks, as bash says it: #1245, point 9)
  const missing = r.status === 127 ? /: ([^\s:]+): (?:command )?not found/u.exec(out)?.[1] : undefined;
  result.steps.push({ name, ran: true, passed, out, ...missing && { missing } });
  outcome(ctx, step, passed, outputs);
  if (!passed) failed(state, result, rt.stop, name);
}

// A step that failed: its job fails, and, where `stop` holds for its name, the rest of the job is cancelled.
function failed(state, result, stop, name) {
  state.failed = true;
  result.passed = false;
  if (stop && stop(name)) state.cancelled = true;
}
