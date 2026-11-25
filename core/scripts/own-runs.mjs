// The steps of a project's workflows, and of the local actions they use, that run a script of the copy of the core (#366):
// each step read once, its run read by step-commands.mjs, the project's own runs of a script named once each.
import { parseYaml } from "./parse-yaml.mjs";
import { lineNamings, shellOf, runsIn, unaccounted } from "./step-commands.mjs";
import { tidy, folder } from "./step-paths.mjs";
import { readable, copyAt, Unread } from "./workflow-calls.mjs";

// Each step the project runs from its workflows, and from the local actions (`uses: ./…`) they use, as
// { where, from, run, dir }: the file it stands in, the workflow that runs it, its `run:` and its folder (an action's
// steps run from the root, save where one names its own); an action the reader cannot read as { where, from,
// unreadable }, its text.
const ACTION_DEPTH = 20, STEP_MOST = 20000;
const STEPS_OF = new WeakMap(); // (each project's steps read once, however many checks ask)
// What a step is given beside its run: its env:, its job's and its workflow's, its job's matrix, so that a script named
// there is counted as named (unaccounted). Each mapping is read once, its text values (at any depth, a mapping or a
// list held as text only by its values) counted by name once, however many steps and checks ask.
const GIVEN = new WeakMap();
const WRAP = Symbol("given"); // (a list of what a step is given, made here; a matrix's list is none)
const wrap = (...items) => Object.assign(items, { [WRAP]: true });
const WRAPPED = new WeakMap(); // (each wrapper's count by name, its parts counted once each)
function givenNamings(objects, name) {
  let n = 0;
  for (const o of objects) {
    if (!o || typeof o !== "object") continue;
    if (o[WRAP]) {
      if (!WRAPPED.has(o)) WRAPPED.set(o, new Map());
      const counts = WRAPPED.get(o);
      if (!counts.has(name)) counts.set(name, givenNamings(o, name));
      n += counts.get(name);
      continue;
    }
    if (!GIVEN.has(o)) { const lines = leaves(o); GIVEN.set(o, { lines, whole: lines.whole, counts: new Map() }); }
    const memo = GIVEN.get(o);
    // (a mapping too deep or too large to read whole counts as naming the script, so the step is not read)
    if (!memo.counts.has(name)) memo.counts.set(name, memo.whole ? memo.lines.reduce((k, l) => k + lineNamings(l, name), 0) : 1);
    n += memo.counts.get(name);
  }
  return n;
}
// The text values a mapping or a list holds, at any depth, `whole` false where a bound (depth, count) stopped it.
function leaves(o, depth = 0, out = Object.assign([], { whole: true })) {
  if (depth > 50 || out.length >= 1e5) { out.whole = false; return out; }
  for (const v of Array.isArray(o) ? o : Object.values(o)) {
    if (out.length >= 1e5) { out.whole = false; break; }
    if (typeof v === "string") out.push(v);
    else if (typeof v === "number" || typeof v === "boolean") out.push(`${v}`);
    else if (v && typeof v === "object") leaves(v, depth + 1, out);
  }
  return out;
}
function steps(p) {
  if (STEPS_OF.has(p)) return STEPS_OF.get(p);
  const out = [], parsed = new Map();
  let full = false, calls = 0;
  // (each action's file read and parsed once; an action is read at each call, with what that call gives it, its
  // caller's env: and with: and what the caller is given, as one shared list; never within itself, no deeper than
  // ACTION_DEPTH, and past STEP_MOST steps or calls in all, the rest is said not read)
  const actionFile = at => {
    if (!parsed.has(at)) {
      let found = null;
      for (const f of [`${at}/action.yml`, `${at}/action.yaml`]) {
        const text = p.read(f);
        if (text === null) continue;
        let yaml = null;
        try { yaml = parseYaml(text); } catch { /* (below) */ }
        found = { f, yaml, text };
        break;
      }
      parsed.set(at, found);
    }
    return parsed.get(at);
  };
  const tooMany = (where, from) => { if (!full) out.push({ where, from, tooMany: true }); full = true; };
  const action = (uses, from, envs, chain) => {
    const at = tidy(uses);
    if (chain.includes(at)) return;
    if (chain.length >= ACTION_DEPTH || ++calls > STEP_MOST) return tooMany(at, from);
    const found = actionFile(at);
    if (!found) return;
    if (!found.yaml) { out.push({ where: found.f, from, unreadable: found.text }); return; }
    walk(found.f, from, found.yaml.runs?.steps ?? [], step => ({ ...folder(step["working-directory"]), shell: shellOf(step.shell) }), envs, [...chain, at]);
  };
  const walk = (where, from, list, dirOf, envs = [], chain = []) => {
    for (const step of Array.isArray(list) ? list : []) {
      if (out.length >= STEP_MOST) return tooMany(where, from);
      if (typeof step?.run === "string") out.push({ where, from, run: step.run, dir: dirOf(step), given: wrap(step?.env, envs) });
      if (typeof step?.uses === "string" && step.uses.startsWith("./")) action(step.uses, from, wrap(step?.env, step?.with, envs), chain);
    }
  };
  for (const [f, w] of Object.entries(p.workflows)) {
    const where = `.github/workflows/${f}`;
    if (!w.yaml) continue;
    for (const job of Object.values(w.yaml.jobs ?? {})) {
      // (the job's folder and shell worked out once, each step's own only where it names one)
      const run = job?.defaults?.run, all = w.yaml.defaults?.run, dir = folder(run?.["working-directory"], all?.["working-directory"]), shell = shellOf(run?.shell ?? all?.shell, job?.["runs-on"]);
      walk(where, where, job?.steps, step => ({ ...(step["working-directory"] == null ? dir : folder(step["working-directory"])), shell: step.shell == null ? shell : shellOf(step.shell) }), wrap(job?.env, w.yaml.env, job?.strategy));
      // (a call to a workflow of the project's own: what it passes is read as the callee's steps would be given it)
      if (typeof job?.uses === "string" && job.uses.startsWith("./")) out.push({ where, from: where, run: "", dir: { at: "." }, given: [job.with, job.strategy] });
    }
  }
  STEPS_OF.set(p, out);
  return out;
}
// The project's own runs of a script of its copy (`name`, "copies.mjs"), each as { where, from, config } or { where,
// from, unread }: the file the step stands in and the workflow that runs it.
export function runsOwn(p, name) {
  readable(p, text => text.includes(name));
  const script = `${copyAt(p)}scripts/${name}`;
  return steps(p).flatMap(s => {
    if (s.tooMany) return [{ where: s.where, from: s.from, unread: `the project's workflows and actions hold more steps, or actions calling each other more deeply, than the reader follows`, unsure: true }];
    if (s.unreadable !== undefined) return s.unreadable.includes(name) ? [{ where: s.where, from: s.from, unread: `the core's reader cannot read ${s.where}, in a form it does not know`, unsure: true }] : [];
    const runs = runsIn(s.run, s.dir, script);
    return [...runs, ...unaccounted(s.run, script, runs, givenNamings(s.given ?? [], name))].map(r => ({ where: s.where, from: s.from, ...r }));
  });
}
// The workflows of the project's own that run the script, themselves or through an action they use, once each; where
// one may run it or another (`unsure`: after a cd, by a path named only when it runs, …), not read, so a step that asks
// whether a check runs beside another is never told it does on a guess.
export const runFiles = (p, name) => runsOwn(p, name).map(r => {
  if (r.unsure) throw new Unread(`${r.where} ${r.unread}`);
  return r.from;
}).filter((f, k, all) => all.indexOf(f) === k);
export const fromRuns = (p, name) => runsOwn(p, name).filter(r => !r.none).map(r => {
  if (r.unread) throw new Unread(`${r.where} ${r.unread}`);
  return { where: r.where, value: r.config };
});
