// A mutation tool the core wrote (tasks/code-shape.md, "How strong the tests are"; #253), one any project whose code
// is JavaScript run by Node, and whose tests are files run by `node <file>`, may name as its *mutation tool*; the core
// names Stryker, run by stryker.mjs beside this file, which takes its helpers from here (#581; retiring it: #815). It puts faults into the code on purpose, one at a time: an equality or comparison
// turned (=== to !==, < to <=), and or or swapped, true and false swapped, a ! dropped, + and - swapped; and for each
// it runs the tests that name the changed file, until one fails. A fault no test catches survives. It writes what it
// found in the open form of a mutation report (the mutation-testing-elements schema, as Stryker writes it), which
// strength.mjs, beside this file, reads.
//
// The tests of a file are the files the shape check's config lists under "tests" whose text names the file (by its
// name, as an import or a path a test starts it by). Each is run once as it stands first: one that fails there, or
// takes longer than LONGEST, catches nothing and is left out, and the run says so. Each fault runs in a working copy of
// its own (a git worktree of HEAD, with the files that differ from it copied in), several side by side, so the
// project's own files are never changed; a fault whose tests run past their time is caught (a timeout, as Stryker
// counts it). Past the budget, the faults left are written as not run ("Pending"). What the project installed (its
// node_modules) is shared with the working copies by links, not copied, so a test that writes or removes there does so in it; a
// workspace's own package is linked to the copy's.
//
//   node core/scripts/mutate.mjs --report <file> [--budget <seconds>] [--every] [<file>[:<first>-<last>],...]
//       the faults on those lines, or with no file named every file of the config's "code" that is no test (the
//       whole run, outside the suite); the config is the one the shape check reads (shape.mjs, where()). The budget,
//       where none is given, is MUTATE_BUDGET's, else none. Each fault caught names the tests that failed on it
//       ("killedBy"); with --every, all of them, each fault run against every test that names its file, so that what
//       a test alone catches can be counted (test-record.mjs; tasks/tests.md), at a cost of more runs.
// Reads the project; writes the report and its working copies, which it takes away. git and Node's own modules.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { tokens } from "./code-shape.mjs";
import { links, reached } from "./select.mjs";
import { notLinked, parseConfig, standing, survey, where } from "./shape.mjs";
import { started } from "./started.mjs";

export const LONGEST = 60; // seconds: a test slower as it stands (a whole upgrade) is no test a fault is run against
// The time a test may take with a fault in, in seconds, from the time it took as it stands: past it, the fault is caught.
export const limitOf = took => Math.max(10, Math.ceil(3 * took + 5));
// (git's settings that run a command by themselves, off: no hook runs as a working copy is checked out)
const SAFE = ["-c", "core.fsmonitor=false", "-c", `core.hooksPath=${os.devNull}`];
const git = (args, cwd = ".") => execFileSync("git", [...SAFE, ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const OPERATORS = { "===": "!==", "!==": "===", "==": "!=", "!=": "==", "<=": "<", ">=": ">", "&&": "||", "||": "&&" };
const SINGLE = { "<": "<=", ">": ">=" };
const NAMES = { "&&": "LogicalOperator", "||": "LogicalOperator", "+": "ArithmeticOperator", "-": "ArithmeticOperator" };
const VALUE = new Set(["str", "num", "regex"]);

export class Refused extends Error {}
export const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };

// The line and column (both from 1) of an offset in a text.
function placeOf(src, at) {
  const before = src.slice(0, at), line = before.split("\n").length;
  return { line, column: at - before.lastIndexOf("\n") };
}

// Whether a token holds a value, so that a + or - after it joins two values (not a sign).
const aValue = tok => !!tok && (VALUE.has(tok.t) || (tok.t === "id" && !["return", "typeof", "case", "in", "of", "new", "void", "throw", "await", "yield"].includes(tok.v)) || (tok.t === "punct" && (tok.v === ")" || tok.v === "]")));

// The operator that starts at a punctuation token, and what it becomes: [text, replacement, name] or null. One that is
// part of a longer operator (<<=, >>>, =>, ++, -=) is none.
function operatorAt(src, k, toks) {
  const at = toks[k].at;
  if ("<>=!&|".includes(src[at - 1] ?? "")) return null;
  const long = Object.keys(OPERATORS).find(op => src.startsWith(op, at) && !"<>=&|".includes(src[at + op.length] ?? ""));
  if (long) return [long, OPERATORS[long], NAMES[long] ?? "EqualityOperator"];
  return shortAt(src, at, aValue(toks[k - 1]));
}

// A one-character operator at `at`: a comparison, a ! that negates, or a + or - between two values.
function shortAt(src, at, afterValue) {
  const c = src[at], after = src[at + 1] ?? "";
  if (c in SINGLE && !"<>=".includes(after)) return [c, SINGLE[c], "EqualityOperator"];
  if (c === "!" && after !== "=") return ["!", "", "BooleanLiteral"];
  const sign = (c === "+" || c === "-") && !"+-=".includes(after) && !"+-".includes(src[at - 1] ?? "");
  return sign && afterValue ? [c, c === "+" ? "-" : "+", "ArithmeticOperator"] : null;
}

// The faults a file's text can take on the lines wanted (a function of a line number; all where none is given):
// each { at, length, original, replacement, mutatorName }.
export function faults(src, wanted = () => true) {
  const toks = tokens(src), out = [];
  let skip = -1;
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (tok.at < skip || !wanted(tok.line)) continue;
    let found = null;
    if (tok.t === "id" && (tok.v === "true" || tok.v === "false") && toks[k - 1]?.v !== ".") found = [tok.v, tok.v === "true" ? "false" : "true", "BooleanLiteral"];
    else if (tok.t === "punct") found = operatorAt(src, k, toks);
    if (!found) continue;
    const [original, replacement, mutatorName] = found;
    out.push({ at: tok.at, length: original.length, original, replacement, mutatorName });
    skip = tok.at + original.length;
  }
  return out;
}

// The files and lines named on the command line: a Map of file to a function of a line number, or null for every
// line of every file of the code.
export function wantedOf(args, code) {
  if (!args.length) return new Map(code.map(f => [f, () => true]));
  const out = new Map();
  for (const part of args.flatMap(a => a.split(",")).filter(Boolean)) {
    const m = /^(.+?)(?::(\d+)-(\d+))?$/u.exec(part);
    if (!code.includes(m[1])) refuse(`${m[1]} is no file of the code the shape check's config reads`, "name a file of its \"code\" that is no test, with its lines as <file>:<first>-<last>");
    const was = out.get(m[1]) ?? (() => false), first = Number(m[2] ?? 1), last = Number(m[3] ?? Infinity);
    out.set(m[1], line => was(line) || (line >= first && line <= last));
  }
  return out;
}

// The tests that name a file: the test files whose text holds its name, not as the end of a longer one, or that import
// it by a path ending in its name without its ending, or with a JavaScript one, as TypeScript's imports are written
// (#1274); its own (<name>-test or <name>.test) first, so that a fault is mostly caught by the first test it runs.
export function testsOf(file, tests) {
  const stem = path.posix.basename(file).replace(/\.[^.]+$/u, ""), name = path.posix.basename(file).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const bare = stem.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), named = new RegExp(`(^|[^\\w-])${name}|/${bare}(\\.[cm]?jsx?)?["'\`]`, "u"), own = t => new RegExp(`(^|/)${stem.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}[-.]test\\.`, "u").test(t);
  return Object.keys(tests).filter(t => named.test(tests[t])).sort((x, y) => Number(own(y)) - Number(own(x)) || x.localeCompare(y));
}

// For --every: each file's tests that reach it, through a barrel or a wrapper too, as the selection maps them
// (select.mjs), so that every test that would catch a fault runs against it.
function reachersOf(texts, tests, config) {
  const out = new Map();
  for (const [t, files] of reached(tests, links(texts, tests, survey(texts, config, tests).reach))) for (const f of files) if (f !== t) out.set(f, [...(out.get(f) ?? []), t]);
  return out;
}

// Each fault on the lines wanted, with the tests it runs against: those that name its file, and with --every those
// that reach it too.
function jobsOf({ wanted, texts, tests, testTexts, config, every }) {
  const reaching = every ? reachersOf(texts, tests, config) : null;
  const testsFor = file => (reaching ? [...new Set([...testsOf(file, testTexts), ...(reaching.get(file) ?? [])])] : testsOf(file, testTexts));
  return [...wanted].flatMap(([file, lines]) => faults(texts[file], lines).map(f => ({ ...f, file, text: texts[file], tests: testsFor(file) })));
}

// The tests running now, each stopped with what it started where the run is stopped (`stopAll`).
const live = new Set();
export const stopAll = () => { for (const stop of live) stop(); };

// One run of a test file in a working copy: "passed", "failed" or "timeout", and how long it took, in seconds. `test`
// is the file node runs, or the words node is given (a runner's program, its words and the file: stryker.mjs, argsOf).
// `started` is told the test's process id as it starts (off Windows, its group's too).
export function run(test, cwd, limit, env = process.env, started = () => {}) {
  return new Promise(done => {
    // (in a group of its own off Windows, so that a test past its time is stopped with what it started)
    const start = Date.now(), group = process.platform !== "win32", child = spawn(process.execPath, [test].flat(), { cwd, env, stdio: "ignore", detached: group });
    const stop = () => { try { if (group) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* (it ended) */ } };
    if (child.pid) started(child.pid);
    live.add(stop);
    const timer = setTimeout(() => { stop(); live.delete(stop); done({ result: "timeout", took: limit }); }, limit * 1000);
    child.on("exit", code => { clearTimeout(timer); live.delete(stop); done({ result: code === 0 ? "passed" : "failed", took: (Date.now() - start) / 1000 }); });
  });
}

// The links to installed dependencies the working copies hold: each taken away, the link alone, before its copy, so
// that removing the copy never goes into what the project installed (git on Windows reads a junction as a folder).
const linked = [];
const unlink = to => { try { fs.unlinkSync(to); } catch { try { fs.rmdirSync(to); } catch { /* (gone) */ } } };

// A file's path in a copy made free of links: where HEAD holds a link the working folder has since replaced (at the
// file or at a folder on its way), the link itself is taken away, so that nothing is written through it outside the copy.
function noLinkOnTheWay(dir, f) {
  let at = dir;
  for (const part of f.split("/")) {
    at = path.join(at, part);
    let stat = null;
    try { stat = fs.lstatSync(at); } catch { return; }
    if (!stat.isSymbolicLink()) continue;
    unlink(at);
    let still = false;
    try { still = fs.lstatSync(at).isSymbolicLink(); } catch { /* (taken away) */ }
    if (still) refuse(`a link at ${f} in a working copy could not be taken away`, "take the link out of the project's HEAD, or commit the file that replaced it, and run again");
    return;
  }
}

// A working copy of the project: a git worktree of HEAD, with the files that differ from it, staged or not, and the new
// ones copied in, those deleted taken out, and its installed dependencies linked.
export function copyOf(dir) {
  git(["worktree", "add", "--detach", "--quiet", dir, "HEAD"]);
  const differ = [...git(["diff", "-z", "--name-only", "--no-renames", "HEAD"]).split("\0"), ...git(["ls-files", "-z", "--others", "--exclude-standard"]).split("\0")].filter(Boolean);
  for (const f of differ) {
    const from = path.join(".", f), to = path.join(dir, f);
    let here = null;
    try { here = fs.lstatSync(from); } catch { /* (deleted in the working folder) */ }
    if (!here) { noLinkOnTheWay(dir, f); fs.rmSync(to, { force: true }); continue; } // (gone here, so gone in the copy too)
    if (here.isSymbolicLink() || here.isDirectory()) continue; // (a folder's files come one by one)
    noLinkOnTheWay(dir, f);
    // (a file that replaced a folder of HEAD's: the copy's folder goes first; no link stands on its way, and taking a
    // folder away removes the links in it, never what they lead to)
    try { if (fs.lstatSync(to).isDirectory()) fs.rmSync(to, { recursive: true, force: true }); } catch { /* (nothing there) */ }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  // (the dependencies a Node project installed, beside each package.json and ignored by git, reached from the copy so
  // that a test that imports one runs there as it does in the project)
  for (const manifest of git(["ls-files", "-z", "--", ":(glob)**/package.json"]).split("\0").filter(Boolean)) {
    const installed = path.join(path.dirname(manifest), "node_modules"), to = path.join(dir, installed);
    if (fs.existsSync(installed) && !fs.existsSync(to)) linkInstalled(installed, to, dir);
  }
  return dir;
}

// A copy's node_modules: where no link in it leads into the project's own files, one link to the project's whole folder,
// a junction on Windows, so that a package's real path lies in the node_modules a script reads it from, as packages.mjs
// asks of the core's own install (#984); a test that writes or removes there does so in the project's (as the header says).
// Otherwise a folder of its own whose every entry (and every entry of a @scope folder) reaches the project's: a folder by
// a link and a file by a copy, which needs no right to make. A link that leads into the project's own files, a workspace's
// package, leads to the same place in the copy, so that its faults are the copy's; one that leads into a node_modules
// (pnpm's store) or outside, to where it led; a dangling one is left out.
function linkInstalled(installed, to, dir) {
  const root = fs.realpathSync("."), inCopy = from => {
    try {
      const inside = path.relative(root, fs.realpathSync(from));
      return inside && !inside.startsWith("..") && !path.isAbsolute(inside) && !inside.split(path.sep).includes("node_modules") ? path.join(path.resolve(dir), inside) : null;
    } catch { return null; }
  }, entries = []; // each entry of the folder, and of a @scope folder in it, with its place in the copy
  for (const entry of fs.readdirSync(installed, { withFileTypes: true })) {
    const from = path.join(installed, entry.name);
    if (!entry.name.startsWith("@") || !entry.isDirectory()) entries.push([from, path.join(to, entry.name)]);
    else for (const inner of fs.readdirSync(from)) entries.push([path.join(from, inner), path.join(to, entry.name, inner)]);
  }
  if (!entries.some(([from]) => fs.lstatSync(from).isSymbolicLink() && inCopy(from))) {
    fs.symlinkSync(path.resolve(installed), to, "junction");
    linked.push(to);
    return;
  }
  for (const [from, at] of entries) {
    let target = path.resolve(from);
    if (fs.lstatSync(from).isSymbolicLink()) {
      try { target = fs.realpathSync(from); } catch { continue; }
      target = inCopy(from) ?? target;
    }
    fs.mkdirSync(path.dirname(at), { recursive: true });
    if (!fs.statSync(path.resolve(from)).isDirectory()) { fs.copyFileSync(from, at); continue; }
    fs.symlinkSync(target, at, "junction");
    linked.push(at);
  }
}

// Each fault's status, in working copies side by side: Killed, Survived, NoCoverage, Timeout or Pending. Each test is
// run once as it stands before a fault is first run against it (`asIs`, shared): one that fails there, or runs past
// LONGEST, is left out.
async function judge(jobs, copies, budget, every = false) {
  const until = Date.now() + budget * 1000, asIs = new Map(), left = new Set();
  const checked = (test, dir) => {
    if (!asIs.has(test)) asIs.set(test, run(test, dir, LONGEST).then(r => (r.result === "passed" ? limitOf(r.took) : (left.add(test), 0))));
    return asIs.get(test);
  };
  const one = async (job, dir) => {
    const target = path.join(dir, job.file), mutated = job.text.slice(0, job.at) + job.replacement + job.text.slice(job.at + job.length);
    let ran = false, status = null;
    job.killedBy = [];
    for (const test of job.tests) {
      const limit = await checked(test, dir);
      if (!limit) continue;
      ran = true;
      fs.writeFileSync(target, mutated);
      const { result } = await run(test, dir, limit);
      fs.writeFileSync(target, job.text);
      if (result === "passed") continue;
      job.killedBy.push(test);
      status ??= result === "timeout" ? "Timeout" : "Killed";
      if (!every) return status;
    }
    return status ?? (ran ? "Survived" : "NoCoverage");
  };
  let next = 0;
  const worker = async dir => {
    while (next < jobs.length) {
      const job = jobs[next++];
      job.status = Date.now() > until ? "Pending" : await one(job, dir);
    }
  };
  await Promise.all(copies.map(worker));
  return [...left];
}

// The report, in the mutation-testing-elements schema: each file's text and its faults with their status.
export function report(texts, jobs) {
  const files = {};
  for (const [i, j] of jobs.entries()) {
    files[j.file] ??= { language: "javascript", source: texts[j.file], mutants: [] };
    const start = placeOf(j.text, j.at), end = placeOf(j.text, j.at + j.length);
    files[j.file].mutants.push({ id: String(i + 1), mutatorName: j.mutatorName, replacement: j.replacement, location: { start, end }, status: j.status, ...(j.killedBy?.length ? { killedBy: j.killedBy } : {}) });
  }
  const named = [...new Set(jobs.flatMap(j => j.killedBy ?? []))].sort();
  return { schemaVersion: "1", thresholds: { high: 80, low: 60 }, files, ...(named.length ? { testFiles: Object.fromEntries(named.map(t => [t, { tests: [{ id: t, name: t }] }])) } : {}) };
}

// The working copies taken away, as the run ends or is stopped.
export function takeAway(copies, scratch) {
  for (const to of linked.splice(0)) unlink(to);
  for (const dir of copies.splice(0)) try { git(["worktree", "remove", "--force", dir]); } catch { /* (taken away below) */ }
  fs.rmSync(scratch, { recursive: true, force: true });
  try { git(["worktree", "prune"]); } catch { /* (nothing to prune) */ }
}

// The project's code and tests, as the shape check's config (where shape.mjs finds it) reads them: the config, each
// file's text, the tests, the files of code that are no test, and each test's text.
export function projectOf() {
  const rules = [path.join(".", "core-manifest.md"), path.join(".", "AGENTS.md")].map(f => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null)).find(t => t !== null);
  const configAt = where(rules);
  try { notLinked(configAt); } catch (e) { refuse(String(e.message).split(". Mend: ")[0], "make the shape check's config a plain file of the project's own"); }
  const config = parseConfig(fs.readFileSync(configAt, "utf8"), configAt);
  const { texts, tests } = standing(config);
  const code = Object.keys(texts).filter(f => !tests.has(f) && !f.endsWith("package.json"));
  return { config, texts, tests, code, testTexts: Object.fromEntries([...tests].filter(t => t in texts).map(t => [t, texts[t]])) };
}

async function main(argv) {
  const at = argv.indexOf("--report"), out = at >= 0 ? argv[at + 1] : null;
  const b = argv.indexOf("--budget"), budget = Number(b >= 0 ? argv[b + 1] : process.env.MUTATE_BUDGET || Infinity);
  if (!out || !(budget > 0)) refuse("the mutation tool was not told where to write its report, or its budget is no number of seconds", "run node scripts/mutate.mjs --report <file> [--budget <seconds>] [<file>[:<first>-<last>],...]");
  const every = argv.includes("--every"), named = argv.filter((a, i) => i !== at && i !== at + 1 && i !== b && i !== b + 1 && a !== "--every");
  const { config, texts, tests, code, testTexts } = projectOf();
  const wanted = wantedOf(named, code);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "mutate-")), copies = [];
  const stop = () => { stopAll(); takeAway(copies, scratch); process.exit(130); };
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, stop);
  try {
    const jobs = jobsOf({ wanted, texts, tests, testTexts, config, every });
    const width = Math.max(1, Math.min(os.cpus().length, jobs.length));
    for (let i = 0; i < width; i++) copies.push(copyOf(path.join(scratch, String(i))));
    const left = await judge(jobs, copies, budget, every);
    fs.writeFileSync(out, `${JSON.stringify(report(texts, jobs))}\n`);
    const count = s => jobs.filter(j => j.status === s).length;
    if (left.length) console.log(`left out, failing or past ${LONGEST} s as they stand: ${left.join(", ")}${process.env.CORE_OFFLINE ? " (the network is cut off here, so a test that reaches it may be among them)" : ""}`);
    console.log(`mutate: ${jobs.length} faults in ${wanted.size} files: ${count("Killed") + count("Timeout")} caught, ${count("Survived") + count("NoCoverage")} survived, ${count("Pending")} not run (the budget); the report is written`);
  } finally { takeAway(copies, scratch); }
  return 0;
}

if (started(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, e => {
    if (!(e instanceof Refused)) throw e;
    console.error(`FAIL: ${e.message}`);
    process.exitCode = 1;
  });
}
