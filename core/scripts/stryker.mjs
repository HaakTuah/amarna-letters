// Stryker run as a *mutation tool* (tasks/code-shape.md, "How strong the tests are"; #581): the core's own, as its
// AGENTS.md names it, and one any project whose code is JavaScript or TypeScript, and whose tests are files run by
// `node <file>`, or by its own vitest (`vitest run <file>`, with --runner vitest; #1274), may name too, with Stryker
// installed where it says. Stryker puts faults into the lines named (more
// kinds of fault than mutate.mjs, beside this file, puts in) and this script gives it what the core's measure needs:
// - the tests: Stryker's command runner runs, for each fault, this script again (with --tests), which runs the tests
//   that name the fault's file (mutate.mjs's testsOf), one after the other until one fails, as mutate.mjs runs them:
//   each is run once as it stands before a fault first reaches it (with no fault switched on), one that fails there
//   or takes longer than LONGEST left out, and the run says so, and with a fault in it is held to mutate.mjs's limit,
//   past which it is stopped and the fault counts as caught; Stryker's own first run, which only times the tests, runs
//   none;
// - a working copy of the project's own (mutate.mjs's copyOf: a git worktree of HEAD with the files that differ from
//   it), in which Stryker changes the files in place, so the project's own files are never changed and its tests find
//   git as they do in the project;
// - the budget: past it Stryker is stopped, with every test it was running, and the faults it had not run stand in
//   the report as not run ("Pending"), since its reporter (stryker-plugin.mjs, beside this file) writes the report as
//   the run goes;
// - the report, in the open form strength.mjs reads, at the path given.
// Stryker itself is a tool that only runs, installed at one exact version from a lock file of the project's (the
// core's: tests/mutation/), never with its install scripts (floor rules 7 and 15); --tool names that folder.
//
//   node core/scripts/stryker.mjs --tool <folder> [--runner vitest] --report <file> [--budget <seconds>] [<file>[:<first>-<last>],...]
//       the faults on those lines, or with no file named every file of the config's "code" that is no test; the
//       config is the one the shape check reads (shape.mjs, where()). A file of a language the core's list does not
//       give Stryker (mutation-tools.json, beside this file) is left out, and the run says so, since a project in
//       more than one is measured in its main language alone (#1247, point 5). The budget, where none is given, is
//       MUTATE_BUDGET's, else none.
// Reads the project; writes the report, and its working copy, which it takes away. git, Node's own modules and
// Stryker.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LONGEST, Refused, copyOf, limitOf, projectOf, refuse, run, stopAll, takeAway, testsOf, wantedOf } from "./mutate.mjs";
import { started } from "./started.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE = "__STRYKER_ACTIVE_MUTANT__"; // (the variable Stryker's command runner names the fault to switch on by)
// A path as one word of the shell the command runner starts, read as it is written: in single quotes off Windows, each
// of its own written as '\'', so no $, ` or \ is expanded; in double quotes on Windows, where a path that holds one, or
// a %, is refused, as is one that holds a line break anywhere.
export const word = (p, windows = process.platform === "win32") => {
  if (/[\r\n\0]/u.test(p) || (windows && /["%]/u.test(p))) refuse(`the path ${JSON.stringify(p)} holds a character the shell's word cannot hold as it is`, `run from a folder whose path holds no line break${windows ? ", double quote or %" : ""}`);
  return windows ? `"${p}"` : `'${p.replaceAll("'", "'\\''")}'`;
};

// The tests to run for one fault, those of the file the plan names for it; none in the run before any fault
// (Stryker's dry run): from `map`, { files: { file: [tests] }, plan: <its path>, asIs: <a folder> }.
export function testsFor(map, active, readPlan = p => JSON.parse(fs.readFileSync(p, "utf8"))) {
  if (active === undefined || active === "") return [];
  return map.files[readPlan(map.plan)[active]] ?? [];
}

// The folder the tests now running are named in by their process ids, each a group of its own off Windows, so that
// the run that stops Stryker stops them too (stopTests), and the words node is given before a test's file (none, or
// the project's vitest and run); both set from the map by dispatch.
let groups = null, runner = [];

// The words node is given to run one test: its file alone, or after the runner's (`prefix`), as vitest is given it.
export const argsOf = (prefix, test) => [...prefix, test];

// The program of the vitest installed at the project's root (`root`), as its package.json names it: its path from the
// root, or null where none is installed, it names none, or the one it names, its links followed, is no file inside
// the folder, its links followed too (a folder would have node run its own package's main, wherever that stands).
export function vitestAt(root) {
  const folder = "node_modules/vitest";
  let bin;
  try { bin = JSON.parse(fs.readFileSync(path.join(root, folder, "package.json"), "utf8")).bin; } catch { return null; }
  const named = typeof bin === "string" ? bin : bin?.vitest;
  if (typeof named !== "string") return null;
  const at = path.posix.join(folder, named.replaceAll("\\", "/"));
  try {
    const real = fs.realpathSync(path.join(root, at)), inside = path.relative(fs.realpathSync(path.join(root, folder)), real);
    return at.startsWith(`${folder}/`) && inside && inside.split(path.sep)[0] !== ".." && !path.isAbsolute(inside) && fs.statSync(real).isFile() ? at : null;
  } catch { return null; }
}

// One run of a test with `node`, its fault switched on or not: mutate.mjs's run, which stops past its time the test
// and all it started, named in `groups` while it runs.
async function once(test, seconds, env) {
  let at = null;
  const r = await run(argsOf(runner, test), process.cwd(), seconds, env, pid => { if (groups) fs.writeFileSync(at = path.join(groups, String(pid)), ""); });
  if (at) fs.rmSync(at, { force: true });
  return r;
}

// Each test named in `dir` stopped with all it started: a test Stryker's stop left running, the budget past or a
// signal come.
export function stopTests(dir) {
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const pid = Number(name);
    if (Number.isInteger(pid) && pid > 0) try { if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"]); else process.kill(-pid, "SIGKILL"); } catch { /* (it ended) */ }
    fs.rmSync(path.join(dir, name), { force: true });
  }
}

// A test as it stands, run once for the whole run, the first fault that reaches it running it with no fault switched
// on, and kept in the folder `asIs` for those after: { result, took }. Two faults that reach it at once may both run
// it, each writing the same.
export async function asItStands(test, asIs, run1 = once) {
  const at = path.join(asIs, `${Buffer.from(test).toString("hex")}.json`);
  try { return JSON.parse(fs.readFileSync(at, "utf8")); } catch { /* (not yet run) */ }
  const env = { ...process.env };
  delete env[ACTIVE];
  const r = await run1(test, LONGEST, env), part = `${at}.${process.pid}`;
  fs.writeFileSync(part, JSON.stringify(r));
  fs.renameSync(part, at);
  return r;
}

// The tests of one fault run one after the other, each as it stands first, until one fails or runs past its limit:
// the exit code Stryker's command runner reads, 1 where the fault was caught.
export async function dispatch(map, active, run1 = once) {
  groups = map.groups ?? null;
  runner = map.runner ?? [];
  for (const test of testsFor(map, active)) {
    const was = await asItStands(test, map.asIs, run1);
    if (was.result !== "passed") continue;
    if ((await run1(test, limitOf(was.took), process.env)).result !== "passed") return 1;
  }
  return 0;
}

// The tests left out, failing or past LONGEST as they stood, from the folder the faults kept them in.
const leftOut = asIs => fs.readdirSync(asIs).filter(f => f.endsWith(".json")).map(f => [Buffer.from(f.slice(0, -5), "hex").toString(), JSON.parse(fs.readFileSync(path.join(asIs, f), "utf8"))]).filter(([, r]) => r.result !== "passed").map(([t]) => t).sort();

// The run's options for Stryker: its command runner starting this script with --tests, in place in the working copy,
// with the core's reporter and nothing else.
export function optionsOf({ mutate, mapAt, scratch, report, plan, sources, concurrency = Math.max(1, os.cpus().length) }) {
  return {
    mutate, testRunner: "command", commandRunner: { command: `${word(process.execPath)} ${word(path.join(HERE, "stryker.mjs"))} --tests ${word(mapAt)}` },
    coverageAnalysis: "off", inPlace: true, timeoutMS: 24 * 3600 * 1000, timeoutFactor: 1, tempDirName: path.join(scratch, "stryker-tmp"), cleanTempDir: "always", concurrency,
    plugins: [path.join(HERE, "stryker-plugin.mjs")], reporters: ["core-report"], coreRun: { report, plan, sources },
    logLevel: "warn", fileLogLevel: "off", warnings: { unknownOptions: false }, allowConsoleColors: false,
  };
}

// Stryker, while it runs: the way to stop it with all it started, for a signal that stops this run.
let stopStryker = () => {};

// Stryker run in the working copy, stopped past `seconds`: { ended, out }, `ended` false where the budget stopped it.
function stryker(bin, configAt, cwd, seconds) {
  return new Promise(done => {
    const group = process.platform !== "win32", child = spawn(process.execPath, [bin, "run", configAt], { cwd, detached: group, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", stopped = false;
    const keep = d => { out = (out + d).slice(-4000); };
    child.stdout.on("data", keep); child.stderr.on("data", keep);
    const stop = () => { try { if (group) process.kill(-child.pid, "SIGKILL"); else spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"]); } catch { /* (it ended) */ } };
    stopStryker = stop;
    const timer = Number.isFinite(seconds) ? setTimeout(() => { stopped = true; stop(); }, Math.max(1, seconds) * 1000) : null;
    child.on("close", code => { if (timer) clearTimeout(timer); stopStryker = () => {}; done({ ended: !stopped, code, out }); });
  });
}

// The counts of a report's faults by their status.
export function counted(report) {
  const out = {};
  for (const f of Object.values(report.files ?? {})) for (const m of f.mutants) out[m.status] = (out[m.status] ?? 0) + 1;
  return out;
}

// The install of Stryker in the folder `folder` from its lock file, with no install scripts and nothing from outside the
// registry, as a job runs it before the strength check.
export const installIn = folder => `npm ci --ignore-scripts --allow-git=none --allow-remote=none --allow-file=none --allow-directory=none --workspaces=false --prefix ${folder}`;

// What the command line asks: { out, tool, bin, budget, vitest, named }, or a refusal.
function askedOf(argv) {
  const value = flag => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const out = value("--report"), tool = value("--tool"), budget = Number(value("--budget") ?? (process.env.MUTATE_BUDGET || Infinity));
  if (!out || !tool || !(budget > 0)) refuse("Stryker's run was not told where Stryker is installed, where to write its report, or its budget in seconds", "run node scripts/stryker.mjs --tool <the folder Stryker is installed in> --report <file> [--budget <seconds>] [<file>[:<first>-<last>],...]");
  const by = value("--runner");
  if (by !== null && by !== "vitest") refuse(`Stryker's run was told to run its tests with ${by}`, "give --runner vitest, for tests vitest runs, or no --runner, for tests run by node <file>");
  const bin = path.resolve(tool, "node_modules", "@stryker-mutator", "core", "bin", "stryker.js");
  if (!fs.existsSync(bin)) refuse(`Stryker is not installed in ${tool}`, `install it there from its lock file, with no install scripts: ${installIn(tool)} (in the core: node scripts/install.mjs mutation)`);
  const flags = new Set(["--report", "--tool", "--budget", "--runner"]);
  return { out: path.resolve(out), bin, budget, vitest: by === "vitest", named: argv.filter((a, i) => !flags.has(a) && !flags.has(argv[i - 1])) };
}

// The run's files in `scratch`: the tests of each file wanted, the folder the tests' runs as they stand are kept in,
// the folder the tests running are named in, and Stryker's options. Gives the options' path and the first folder.
function setUp(scratch, { wanted, named, texts, testTexts, report, prefix }) {
  const mapAt = path.join(scratch, "tests.json"), plan = path.join(scratch, "plan.json"), configAt = path.join(scratch, "stryker.json"), asIs = path.join(scratch, "as-is");
  fs.mkdirSync(asIs);
  fs.mkdirSync(path.join(scratch, "groups"));
  fs.writeFileSync(mapAt, JSON.stringify({ files: Object.fromEntries([...wanted.keys()].map(f => [f, testsOf(f, testTexts)])), plan, asIs, groups: path.join(scratch, "groups"), runner: prefix }));
  const mutate = named.length ? named.flatMap(a => a.split(",")).filter(Boolean) : [...wanted.keys()];
  // (each file's text as it stands, for the report: Stryker writes its own into the files in place)
  const sources = path.join(scratch, "sources.json");
  fs.writeFileSync(sources, JSON.stringify(Object.fromEntries([...wanted.keys()].map(f => [f, texts[f]]))));
  fs.writeFileSync(configAt, JSON.stringify(optionsOf({ mutate, mapAt, scratch, report, plan, sources })));
  return { configAt, asIs };
}

// The report of a run that measured nothing, in the open form strength.mjs reads.
const EMPTY = `${JSON.stringify({ schemaVersion: "1", thresholds: { high: 80, low: 60 }, files: {} })}\n`;
// What the run says once it ends: the tests left out, and the counts.
function said(report, { asIs, ended, files }) {
  if (!fs.existsSync(report)) fs.writeFileSync(report, EMPTY);
  const c = counted(JSON.parse(fs.readFileSync(report, "utf8"))), all = Object.values(c).reduce((a, b) => a + b, 0), left = leftOut(asIs);
  if (left.length) console.log(`left out, failing or past ${LONGEST} s as they stand: ${left.join(", ")}`);
  if (!ended && !all) console.log("the budget ran out before Stryker had planned its faults: nothing was measured");
  console.log(`stryker: ${all} faults in ${files} files: ${(c.Killed ?? 0) + (c.Timeout ?? 0)} caught, ${(c.Survived ?? 0) + (c.NoCoverage ?? 0)} survived, ${c.Pending ?? 0} not run${ended ? "" : " (the budget)"}; the report is written`);
}

// Of the files named (`named`, as the command line gives them) and of the code (`code`), those Stryker measures, of the
// endings the core's list gives it, and `left` the others: { named, code, left }. Where files were named and none is
// Stryker's, `named` is null: there is nothing to measure.
const ENDINGS = JSON.parse(fs.readFileSync(path.join(HERE, "mutation-tools.json"), "utf8")).languages.filter(l => l.tool === "Stryker").flatMap(l => l.endings);
export function strykers(named, code, endings = ENDINGS) {
  const fileOf = part => /^(.+?)(?::\d+-\d+)?$/u.exec(part)[1], ours = f => endings.includes(path.posix.extname(f));
  const parts = named.flatMap(a => a.split(",")).filter(Boolean), mine = parts.filter(p => ours(fileOf(p)));
  const left = [...new Set((parts.length ? parts.map(fileOf) : code).filter(f => !ours(f)))];
  return { named: parts.length && !mine.length ? null : mine, code: code.filter(ours), left };
}

async function main(argv) {
  const t = argv.indexOf("--tests");
  if (t >= 0) return dispatch(JSON.parse(fs.readFileSync(argv[t + 1], "utf8")), process.env[ACTIVE]);
  const { out, bin, budget, vitest, named: asked } = askedOf(argv), until = Date.now() + budget * 1000;
  const program = vitest ? vitestAt(".") : null;
  if (vitest && !program) refuse("the tests are to be run by vitest, and node_modules/vitest at the project's root names no program", "install the project's packages first (npm ci --ignore-scripts), as its job does before its tests, then run this again");
  const project = projectOf(), { named, code, left } = strykers(asked, project.code), { texts, testTexts } = project;
  if (left.length) console.log(`left out, of languages the core's list does not give Stryker: ${left.join(", ")}`);
  if (named === null || !code.length) {
    fs.writeFileSync(out, EMPTY);
    console.log("stryker: no file of a language Stryker measures, so nothing was measured; the report is written");
    return 0;
  }
  const wanted = wantedOf(named, code);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "stryker-")), copies = [];
  const stop = () => { stopStryker(); stopTests(path.join(scratch, "groups")); stopAll(); takeAway(copies, scratch); process.exit(130); };
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, stop);
  try {
    copies.push(copyOf(path.join(scratch, "copy")));
    const { configAt, asIs } = setUp(scratch, { wanted, named, texts, testTexts, report: out, prefix: program ? [program, "run"] : [] });
    fs.rmSync(out, { force: true });
    const ran = await stryker(bin, configAt, copies[0], (until - Date.now()) / 1000);
    stopTests(path.join(scratch, "groups"));
    if (ran.ended && ran.code !== 0) refuse(`Stryker ended with ${ran.code}: ${ran.out.trim().split("\n").slice(-12).join("\n")}`, "run the tests that name the files as they stand, and Stryker by hand with the options above, and mend what it says");
    said(out, { asIs, ended: ran.ended, files: wanted.size });
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
