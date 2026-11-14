// What the upgrade test stands on (upgrade-test.mjs): it runs a workflow of the core's as GitHub would run it for a
// project, job by job and step by step, so that the test runs each check's own shell and not a copy of it. It reads
// the YAML the core's workflows are written in (block mappings and sequences, block scalars, plain and quoted scalars,
// flow sequences, comments), evaluates GitHub's expressions (`${{ }}`: contexts, literals, ! == != && || and the
// functions the core's workflows use), and runs each job whose `if` holds, a job for each combination of its matrix:
// each `run` step in bash as GitHub runs it (with -e, and pipefail where its shell is named bash), its env and its
// expressions filled in, its outputs read from GITHUB_OUTPUT; each `uses`
// step by a handler the caller gives for that action, or not at all, said so. A context, function or form it does not
// know throws, so a workflow the core changes in a way this cannot read fails the test, and is taught here, rather than
// running other than GitHub would. Tests only: no project and no workflow of the core's runs it. Node's own modules.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---- YAML, as the core's workflows write it ----

const strip = line => { // a comment after a value: " #" outside quotes
  let q = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = ""; continue; }
    if ((c === '"' || c === "'") && (i === 0 || /[\s:[,{-]/.test(line[i - 1]))) q = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i).trimEnd();
  }
  return line.trimEnd();
};
function scalar(text) {
  const t = text.trim();
  if (t.startsWith("'")) { if (!t.endsWith("'") || t.length < 2) throw new Error(`a quoted value not ended: ${t}`); return t.slice(1, -1).replace(/''/g, "'"); }
  if (t.startsWith('"')) { if (!t.endsWith('"') || t.length < 2) throw new Error(`a quoted value not ended: ${t}`); return JSON.parse(t); }
  if (t.startsWith("[")) {
    if (!t.endsWith("]")) throw new Error(`a flow sequence not ended: ${t}`);
    const inner = t.slice(1, -1).trim();
    return inner ? inner.split(",").map(scalar) : [];
  }
  if (t.startsWith("{") || t.startsWith("&") || t.startsWith("*") || t.startsWith("!")) throw new Error(`a YAML form this reader does not know: ${t}`);
  if (t === "true" || t === "false") return t === "true";
  if (t === "" || t === "null" || t === "~") return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}

/** The workflow's YAML as plain values (keys as written: `on` stays the string "on"). */
export function parseYaml(text) {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const indentOf = l => l.length - l.trimStart().length;
  const blank = l => l.trim() === "" || l.trim().startsWith("#");
  const next = () => { while (i < raw.length && blank(raw[i])) i++; return i < raw.length ? raw[i] : null; };

  function block(header, parent) { // a block scalar: | or > with its chomping
    const style = header[0], chomp = header.includes("-") ? "strip" : header.includes("+") ? "keep" : "clip";
    const lines = [];
    let at = null;
    while (i < raw.length) {
      const l = raw[i];
      if (l.trim() === "") { lines.push(""); i++; continue; }
      const n = indentOf(l);
      if (n <= parent) break;
      at ??= n;
      if (n < at) break;
      lines.push(l.slice(at));
      i++;
    }
    while (chomp !== "keep" && lines.length && lines.at(-1) === "") lines.pop();
    let out = style === "|" ? lines.join("\n")
      : lines.reduce((acc, l, k) => (k === 0 ? l : l === "" ? `${acc}\n` : acc.endsWith("\n") ? acc + l : `${acc} ${l}`), "");
    if (chomp !== "strip" && lines.length) out += "\n";
    return out;
  }

  function value(rest, indent) { // what follows "key:" or "- "
    const r = strip(rest);
    if (/^[|>][-+]?$/.test(r)) return block(r, indent);
    if (r !== "") return scalar(r);
    const l = next();
    if (l === null) return null;
    const n = indentOf(l);
    if (n > indent || (n === indent && l.trimStart().startsWith("- "))) return node(n);
    return null;
  }

  function node(indent) {
    const first = next();
    if (first.trimStart().startsWith("- ") || first.trim() === "-") {
      const list = [];
      for (let l = next(); l !== null && indentOf(l) === indent && (l.trimStart().startsWith("- ") || l.trim() === "-"); l = next()) {
        const content = l.trimStart().slice(2);
        if (/^[\w.-]+:(\s|$)/.test(content)) { // a mapping that starts on the dash's line
          raw[i] = " ".repeat(indent + 2) + content;
          list.push(node(indent + 2));
        } else { i++; list.push(value(content, indent)); }
      }
      return list;
    }
    const map = {};
    for (let l = next(); l !== null && indentOf(l) === indent && !l.trimStart().startsWith("- "); l = next()) {
      const m = /^([\w.-]+|"[^"]*"|'[^']*'):(?:\s(.*)|$)/.exec(l.trimStart());
      if (!m) throw new Error(`a line this reader does not know: ${l.trim()}`);
      i++;
      map[scalar(m[1])] = value(m[2] ?? "", indent);
    }
    const l = next();
    if (l !== null && indentOf(l) > indent) throw new Error(`a line indented where no value begins: ${l.trim()}`);
    return map;
  }

  return next() === null ? {} : node(indentOf(next()));
}

// ---- GitHub's expressions ----

const truthy = v => !(v === false || v === null || v === undefined || v === 0 || v === "" || Number.isNaN(v));
const str = v => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const num = v => (v === null || v === undefined ? 0 : v === true ? 1 : v === false ? 0 : v === "" ? 0 : Number(v));
const equal = (a, b) => {
  a ??= null; b ??= null;
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  if (typeof a === typeof b) return a === b;
  if (a === null || b === null) return false;
  return num(a) === num(b);
};

/** The value of an expression (without its `${{ }}`), in the contexts given and the job's state so far. */
export function evaluate(expr, contexts, state = { failed: false }) {
  const tokens = [];
  for (let k = 0; k < expr.length;) {
    const rest = expr.slice(k);
    let m;
    if ((m = /^\s+/.exec(rest))) { k += m[0].length; continue; }
    if ((m = /^'(?:[^']|'')*'/.exec(rest))) tokens.push({ s: m[0].slice(1, -1).replace(/''/g, "'") });
    else if ((m = /^(==|!=|&&|\|\||<=|>=|[!()[\],.<>])/.exec(rest))) tokens.push({ op: m[0] });
    else if ((m = /^-?\d+(\.\d+)?/.exec(rest))) tokens.push({ n: Number(m[0]) });
    else if ((m = /^[A-Za-z_][\w-]*/.exec(rest))) tokens.push({ id: m[0] });
    else throw new Error(`an expression this reader does not know: ${expr}`);
    k += m[0].length;
  }
  let p = 0;
  const peek = op => tokens[p]?.op === op;
  const take = op => { if (!peek(op)) throw new Error(`"${op}" expected in: ${expr}`); p++; };
  const fns = {
    startswith: (a, b) => str(a).toLowerCase().startsWith(str(b).toLowerCase()),
    endswith: (a, b) => str(a).toLowerCase().endsWith(str(b).toLowerCase()),
    contains: (a, b) => (Array.isArray(a) ? a.some(x => equal(x, b)) : str(a).toLowerCase().includes(str(b).toLowerCase())),
    fromjson: a => JSON.parse(str(a)), tojson: a => JSON.stringify(a ?? null),
    format: (f, ...args) => str(f).replace(/\{\{|\}\}|\{(\d+)\}/g, (m, k) => (m === "{{" ? "{" : m === "}}" ? "}" : str(args[Number(k)]))),
    always: () => true, cancelled: () => false, success: () => !state.failed, failure: () => state.failed,
  };
  const primary = () => {
    const t = tokens[p++];
    if (!t) throw new Error(`an expression ends too soon: ${expr}`);
    if (t.op === "(") { const v = or(); take(")"); return v; }
    if ("s" in t) return t.s;
    if ("n" in t) return t.n;
    if (t.id === "true" || t.id === "false") return t.id === "true";
    if (t.id === "null") return null;
    if (t.id && peek("(")) {
      const fn = fns[t.id.toLowerCase()];
      if (!fn) throw new Error(`a function this reader does not know: ${t.id}`);
      take("(");
      const args = [];
      while (!peek(")")) { args.push(or()); if (!peek(")")) take(","); }
      take(")");
      return fn(...args);
    }
    if (t.id) { if (!(t.id in contexts)) throw new Error(`a context this test does not give: ${t.id} (in ${expr})`); return contexts[t.id]; }
    throw new Error(`an expression this reader does not know: ${expr}`);
  };
  const postfix = () => {
    let v = primary();
    for (;;) {
      if (peek(".")) { p++; const t = tokens[p++]; if (!t?.id) throw new Error(`a property name expected in: ${expr}`); v = v?.[t.id] ?? null; }
      else if (peek("[")) { p++; const k = or(); take("]"); v = v?.[k] ?? null; }
      else return v;
    }
  };
  const unary = () => (peek("!") ? (p++, !truthy(unary())) : postfix());
  const compare = () => {
    let v = unary();
    while (["<", ">", "<=", ">="].includes(tokens[p]?.op)) { const op = tokens[p++].op, w = unary(); v = op === "<" ? num(v) < num(w) : op === ">" ? num(v) > num(w) : op === "<=" ? num(v) <= num(w) : num(v) >= num(w); }
    return v;
  };
  const eq = () => { let v = compare(); while (peek("==") || peek("!=")) { const op = tokens[p++].op, w = compare(); v = op === "==" ? equal(v, w) : !equal(v, w); } return v; };
  const and = () => { let v = eq(); while (peek("&&")) { p++; const w = eq(); v = truthy(v) ? w : v; } return v; };
  const or = () => { let v = and(); while (peek("||")) { p++; const w = and(); v = truthy(v) ? v : w; } return v; };
  const out = or();
  if (p !== tokens.length) throw new Error(`an expression this reader does not know: ${expr}`);
  return out;
}

/** A text with each `${{ }}` in it filled in. */
export const fill = (text, contexts, state) => (typeof text === "string" ? text.replace(/\$\{\{([\s\S]*?)\}\}/g, (_, e) => str(evaluate(e, contexts, state))) : text);
/** Whether an `if` holds: a whole `${{ }}`, or an expression written bare. Left out: success(). */
export function holds(cond, contexts, state) {
  if (cond === undefined || cond === null) return !state.failed;
  if (typeof cond === "boolean") return cond && !state.failed;
  const t = String(cond).trim();
  // (as GitHub reads it: a condition that asks no status of its own is read as success() && it)
  if (!/\b(?:success|failure|always|cancelled)\s*\(/u.test(t) && state.failed) return false;
  const whole = /^\$\{\{([\s\S]*)\}\}$/.exec(t);
  return truthy(whole ? evaluate(whole[1], contexts, state) : t.includes("${{") ? fill(t, contexts, state) : evaluate(t, contexts, state));
}

// ---- running a called workflow ----

// A value as written: a whole `${{ }}` gives the expression's own value (a list, say), anything else is text.
const valueOf = (v, contexts) => {
  const whole = typeof v === "string" && /^\s*\$\{\{([\s\S]*)\}\}\s*$/.exec(v);
  return whole ? evaluate(whole[1], contexts) : v;
};
// A job's matrix as its combinations ([null] for a job with none): each key's list, in GitHub's order. An include or an
// exclude, which this has no need of yet, stops the test, to be taught.
function combinations(matrix, contexts) {
  if (matrix === undefined || matrix === null) return [null];
  const m = valueOf(matrix, contexts);
  if (!m || typeof m !== "object" || Array.isArray(m) || "include" in m || "exclude" in m) throw new Error(`a matrix this runner does not know: ${JSON.stringify(matrix)}`);
  let list = [{}];
  for (const [key, raw] of Object.entries(m)) {
    const values = valueOf(raw, contexts);
    if (!Array.isArray(values)) throw new Error(`a matrix this runner does not know: ${key}`);
    list = list.flatMap(c => values.map(v => ({ ...c, [key]: v })));
  }
  return list;
}

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
 * Runs each job of a called workflow (its text) as GitHub would for one event, and gives each job's result:
 * { job, ran, passed, steps: [{ name, ran, passed, out }] }. `inputs` and `secrets` are what the call passes (defaults
 * filled in here); `github` the github context; `base` the environment every step starts from; `workspace(job)` a
 * fresh folder for a job's runner; `uses` maps an action (its name before @) to a handler (step `with`, filled in;
 * the job's folder; the job's env) that does its part, or returns false where it stands for a step not run here.
 * With `dry`, it only says which jobs would start: each one that starts is a job the repository's owner pays for.
 * With `until`, a job stops after the step of that id (each job's `outputs` hold its steps' outputs). Each job's own
 * temporary folder is made under `temp` and removed when the job ends.
 */
export function runWorkflow(text, { inputs = {}, secrets = {}, github, base, workspace, uses, runner = {}, dry = false, until = null, temp = os.tmpdir() }) {
  const wf = parseYaml(text);
  const defaults = wf.defaults?.run?.shell;
  const declared = wf.on?.workflow_call?.inputs ?? {};
  const given = Object.fromEntries(Object.entries(declared).map(([name, d]) => [name, name in inputs ? inputs[name] : d?.default ?? (d?.type === "boolean" ? false : "")]));
  for (const name of Object.keys(inputs)) if (!(name in declared)) throw new Error(`an input the workflow does not take: ${name}`);
  for (const [name, d] of Object.entries(declared)) if (d?.required && !(name in inputs)) throw new Error(`the call leaves out a required input: ${name}`);
  for (const [name, d] of Object.entries(wf.on?.workflow_call?.secrets ?? {})) if (d?.required && !(name in secrets)) throw new Error(`the call leaves out a required secret: ${name}`);
  const results = [];
  for (const [id, job] of Object.entries(wf.jobs ?? {})) {
    const top = { github, inputs: given, secrets, vars: {} };
    if (!holds(job.if, top, { failed: false })) { results.push({ job: id, ran: false, passed: true, steps: [], outputs: {} }); continue; }
    // (a matrix makes a job of each of its combinations, each one billed, named by its values as GitHub names it)
    for (const matrix of combinations(job.strategy?.matrix, top)) {
      const tmp = fs.mkdtempSync(path.join(temp, "runner-temp-"));
      const ctx = { ...top, runner: { temp: tmp, os: "Linux", ...runner }, env: {}, steps: {}, matrix: matrix ?? {} };
      const state = { failed: false };
      const result = { job: matrix ? `${id} (${Object.values(matrix).map(str).join(", ")})` : id, ran: true, passed: true, steps: [], outputs: ctx.steps };
      results.push(result);
      try { if (!dry) runJob(job, id, ctx, state, result, tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    }
  }
  return results;

  function runJob(job, id, ctx, state, result, tmp) {
    const dir = workspace(id);
    ctx.env = Object.fromEntries(Object.entries(job.env ?? {}).map(([k, v]) => [k, fill(str(v), ctx, state)]));
    for (const step of job.steps ?? []) {
      const name = step.name ?? step.uses ?? step.run?.split("\n")[0];
      if (!holds(step.if, ctx, state)) { result.steps.push({ name, ran: false, passed: true, out: "" }); continue; }
      const env = { ...ctx.env, ...Object.fromEntries(Object.entries(step.env ?? {}).map(([k, v]) => [k, fill(str(v), ctx, state)])) };
      if (step.uses) {
        const action = step.uses.split("@")[0];
        const handler = uses[action];
        if (!handler) throw new Error(`an action this test has no part for: ${action} (in ${id})`);
        const w = Object.fromEntries(Object.entries(step.with ?? {}).map(([k, v]) => [k, fill(str(v), ctx, state)]));
        let did;
        try {
          did = handler(w, dir, env);
        } catch (e) {
          // (a stand-in that refuses what the step asks of it fails the step, as the action would)
          result.steps.push({ name, ran: true, passed: false, out: `${e.message}\n` });
          state.failed = true; result.passed = false;
          continue;
        }
        result.steps.push({ name, ran: did !== false, passed: true, out: did === false ? "GitHub's own, not run here" : "" });
        continue;
      }
      const output = path.join(tmp, `output-${result.steps.length}`);
      const script = path.join(tmp, `step-${result.steps.length}.sh`);
      fs.writeFileSync(script, fill(step.run, ctx, state));
      const cwd = step["working-directory"] ? path.join(dir, fill(str(step["working-directory"]), ctx, state)) : dir;
      // (as GitHub runs it: a step that names no shell in bash with -e alone; one whose shell is bash, by its own word or
      // the defaults', with --noprofile --norc -e -o pipefail)
      const shell = step.shell ?? job.defaults?.run?.shell ?? defaults;
      if (shell !== undefined && shell !== "bash") throw new Error(`a shell this runner does not know: ${shell} (in ${id})`);
      const r = spawnSync("bash", shell === "bash" ? ["--noprofile", "--norc", "-eo", "pipefail", script] : ["-e", script], { cwd, encoding: "utf8", env: {
        ...base, ...env, CI: "true", GITHUB_ACTIONS: "true", GITHUB_OUTPUT: output, GITHUB_ENV: path.join(tmp, "env"), GITHUB_STEP_SUMMARY: path.join(tmp, "summary"),
        GITHUB_WORKSPACE: dir, GITHUB_REPOSITORY: str(github.repository), GITHUB_EVENT_NAME: str(github.event_name), RUNNER_TEMP: tmp, RUNNER_OS: ctx.runner.os } });
      const passed = r.status === 0;
      result.steps.push({ name, ran: true, passed, out: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error?.message ?? ""}` });
      if (step.id) ctx.steps[step.id] = { outputs: outputsOf(output), outcome: passed ? "success" : "failure", conclusion: passed ? "success" : "failure" };
      if (!passed) { state.failed = true; result.passed = false; }
      if (until && step.id === until) return;
    }
  }
}
