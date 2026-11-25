// How strong the tests are (tasks/code-shape.md, "How strong the tests are"; #253), for every project that takes the
// core: whether the tests would fail if a fault were put into the code on purpose, measured on the lines a pull request
// changes. The project's *mutation tool* (its manifest's row; the core's AGENTS.md names its own, Stryker run by
// stryker.mjs beside this file) puts the faults in and writes what it found in the open form of a mutation report (the
// mutation-testing-elements schema, as Stryker writes it); this script runs it, with no shell, as the row says,
// `{lines}` given the lines to fault (<file>:<first>-<last>, joined by commas) and `{report}` the file to write, and
// reads the report: a fault a test failed on (Killed, Timeout) was caught, one none did (Survived, NoCoverage)
// survived, and one the tool did not run (Pending) is counted as not run.
//
// Reported first: the number is printed, and in the job's summary, and fails nothing while the project has no
// baseline. Its baseline stands beside the shape check's (strength-baseline.json in the same folder), in its form:
// "listed", each fault that survives (by its file, its line's text and what it became) to how many times; "grown",
// the reason of each that had to join; "whole", the day and commit of the whole run it was written from. Once it
// stands, a fault that survives on a changed line and the baseline does not list fails, with its mend: a test that
// catches it, or, where it changes nothing the program does, the entry listed with that reason under "grown". An entry
// may join the baseline only with that reason, or in the pull request that records a new whole run. The baseline is
// read by kind, a file and what became what, whatever line a fault stands on: of each kind, the survivors on the
// changed lines and what the lines left alone still hold may not pass what it lists, so debt that only moved stays
// listed; and a pull request may not list fewer of a kind than still survive. Where the tool's budget leaves faults on
// the lines left alone unrun, it is run once more on those lines alone, with a budget of its own (#408). The whole run is
// the audit's, outside the suite (tasks/cleaning.md): --whole runs the tool on every file of the code and writes the
// baseline from it. A test file the pull request deletes is named, for its description to say why (the review reads
// it, roles/shared/review-guidelines.md). A project whose row says `none` has the measure left out; one with no row is told
// the step (setup/sync-notes.md). The code and the tests are the shape check's config's.
//
//   node core/scripts/strength.mjs           on a pull request, STRENGTH_BASE set to the branch it merges into
//                                            (origin/main): the lines it changes; with no base, nothing to measure
//   node core/scripts/strength.mjs --whole   the whole run, which writes the baseline: the first, or the new one
//   node core/scripts/strength.mjs --lower <file>[,<file>...]   a cleaning task's run: the tool on those files whole,
//                                            and their entries lowered to what still survives; nothing joins
// Run from the project's root, as a step of the job that runs its tests. git and Node's own modules.
// This file is where the check runs on a project: its rows, config and code, the tool, the command line. What a
// report holds is strength-report.mjs, and the verdict on a run, with the baseline's kinds, strength-verdict.mjs.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CODE, OTHER } from "./code-shape.mjs";
import { logged, parseBounded } from "./guards.mjs";
import { pathIn } from "./reading.mjs";
import { notLinked, parseBaseline, parseConfig, rowToken, where } from "./shape.mjs";
import { started } from "./started.mjs";
import { Refused, SURVIVED, counted, faultsOf, refuse } from "./strength-report.mjs";
import { again, kindOf, lowered, needed, recordsWhole, verdict, watched } from "./strength-verdict.mjs";

const SAFE = ["-c", "core.fsmonitor=false", "-c", "core.quotePath=false"];
const git = (args, cwd) => execFileSync("git", [...SAFE, ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const tolerant = read => { try { return read(); } catch { return null; } };
const ROW = "*mutation tool*";

// A file of the project's, read and written through no link (shape.mjs, notLinked): its path, or a refusal.
export const unlinked = file => { try { return notLinked(file); } catch (e) { const [what, mend] = String(e.message).split(". Mend: "); return refuse(what, mend ?? "make it a plain file of the project's own"); } };

// The project's rules: its manifest, else (the core) its AGENTS.md; and where the core's scripts lie from its root.
export function rulesHere(root = ".") {
  for (const [file, home] of [["core-manifest.md", null], ["AGENTS.md", ""]]) {
    const text = tolerant(() => fs.readFileSync(path.join(root, file), "utf8"));
    if (text !== null) return { text, home: home ?? pathIn(text) };
  }
  return { text: "", home: "core/" };
}

// The row that names the mutation tool: { command } (its words), { none } (the reason given), or null where there is
// no row. The command is the row's first text in backticks.
export function toolOf(rules) {
  const token = rowToken(rules, ROW);
  if (!token?.said) return null;
  return token.said === "none" ? { none: token.reason } : { command: token.said.split(/\s+/u) };
}

// Where the baseline stands: beside the shape check's.
export const baselineOf = config => path.posix.join(path.posix.dirname(config.baseline), "strength-baseline.json");

// The lines a pull request changes, of the files of code: a Map of file to a Set of line numbers, read from git's diff
// of the base (where they part, if git can tell; else the base itself) against the working folder.
export function changedLines(base, code) {
  const from = tolerant(() => git(["merge-base", base, "HEAD"]).trim()) || base;
  const out = new Map();
  if (!code.length) return out;
  let file = null;
  for (const line of git(["diff", "-U0", "--no-color", "--no-renames", "--no-ext-diff", from, "--", ...code]).split("\n")) {
    if (line.startsWith("+++ ")) file = line === "+++ /dev/null" ? null : line.slice(6).replace(/\t$/u, ""); // (git ends a name that holds a space with a tab)
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/u.exec(line);
    if (!file || !hunk) continue;
    const first = Number(hunk[1]), count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (!out.has(file)) out.set(file, new Set());
    for (let n = first; n < first + count; n++) out.get(file).add(n);
  }
  return new Map([...out].filter(([, lines]) => lines.size));
}

// The lines as the tool is told them: <file>:<first>-<last> for each run of lines, joined by commas.
export function linesArg(changed) {
  const runs = [];
  for (const [file, lines] of changed) {
    const sorted = [...lines].sort((a, b) => a - b);
    let start = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) continue;
      runs.push(`${file}:${start}-${sorted[i - 1]}`);
      start = sorted[i];
    }
  }
  return runs.join(",");
}


// The baseline at `at` as the check reads it ({ listed, grown, whole }), from its text; null where there is none.
function baselineFrom(text, at) {
  if (text === null || text === undefined) return null;
  const b = parseBaseline(text, at, `write it again from the audit's whole run (node core/scripts/strength.mjs --whole), or take it back as the base holds it`);
  return { ...b, whole: tolerant(() => parseBounded(text).whole) ?? null };
}

// The tool run, as the row says, on the lines given: the report's text. It throws a Refused where the tool fails or
// writes none.
export function runTool(command, lines, cwd = ".") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strength-")), report = path.join(dir, "report.json");
  try {
    const args = command.map(w => w.replaceAll("{lines}", lines).replaceAll("{report}", report));
    const r = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", stdio: ["ignore", "inherit", "inherit"], shell: false });
    if (r.error || r.status !== 0) refuse(`the mutation tool (${command.join(" ")}) ${r.error ? `could not start (${r.error.code ?? "no code given"})` : `ended with ${r.status ?? r.signal}`}`, `run the row's command by hand, mend what it says, and see that it writes its report to {report}`);
    if (!fs.existsSync(report)) refuse(`the mutation tool (${command.join(" ")}) wrote no report`, "put {report} in the row's command where the tool takes the path of its report in the mutation-testing-elements schema");
    return fs.readFileSync(report, "utf8");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}


// The test files the pull request deletes.
const deletedTests = (base, tests) => (tests.length ? git(["diff", "--name-only", "--diff-filter=D", "--no-renames", tolerant(() => git(["merge-base", base, "HEAD"]).trim()) || base, "--", ...tests]).split("\n").filter(Boolean) : []);

const summary = lines => { if (process.env.GITHUB_STEP_SUMMARY) tolerant(() => fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.map(l => `- ${l}`).join("\n")}\n`)); };

// The files git lists under pathspecs in the working folder at `root`, none a link.
const listed = (specs, root) => (specs.length ? git(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...specs], root).split("\0").filter(f => f && !tolerant(() => fs.lstatSync(path.join(root ?? ".", f)).isSymbolicLink())) : []);
// The code the measure reads under a config: each file of its "code" in a language the core knows by its ending,
// JavaScript's, TypeScript's or another's, that is no test (read-nothing.mjs names the check where it is none; #459).
export function measuredCode(config, root) {
  const tests = new Set(listed(config.tests, root));
  return listed(config.code, root).filter(f => !tests.has(f) && [...CODE, ...OTHER].includes(path.posix.extname(f)));
}

// The project as the check reads it: its tool, its config, its code (measuredCode) and the baseline's path. A
// change "touches" the code or the tests where it changes any file their pathspecs read (data the code reads too),
// but the two baselines and a text in Markdown, such as an audit's report.
function project() {
  const { text, home } = rulesHere(), tool = toolOf(text);
  const configAt = where(text);
  if (!fs.existsSync(unlinked(configAt))) return { tool, home, config: null };
  const config = parseConfig(fs.readFileSync(configAt, "utf8"), configAt);
  return { tool, home, config, code: measuredCode(config), at: baselineOf(config) };
}

// A pull request's run: the tool on the changed lines; then, where a kind's survivors there or its entries lowered
// call for it (needed()), on the lines the change left alone that could hold that kind (watched()), and once more on
// those of them whose faults it left unrun (again()).
function onPullRequest(p, base) {
  const changed = changedLines(base, p.code), deleted = deletedTests(base, p.config.tests), touched = touches(p, base);
  const baseline = baselineFrom(tolerant(() => fs.readFileSync(unlinked(p.at), "utf8")), p.at);
  const was = baselineFrom(tolerant(() => git(["show", `${base}:${p.at}`])), `${base}:${p.at}`);
  const read = f => (p.code.includes(f) ? tolerant(() => fs.readFileSync(unlinked(f), "utf8")) : null);
  const faults = measured(p, changed, baseline);
  const ids = baseline ? needed(faults, baseline, was, recordsWhole(baseline, was, touched)) : [];
  const kinds = new Set(ids.map(kindOf)), ofKinds = all => all.filter(f => kinds.has(kindOf(f.id)));
  // (the lines on which the first run found any fault, of any kind: those a second run would face again)
  const around = ids.length ? measured(p, watched(ids, read, changed), baseline) : [], found = new Map();
  for (const f of around) found.set(f.file, (found.get(f.file) ?? new Set()).add(f.line));
  const still = ids.length ? again(ofKinds(around), lines => ofKinds(measured(p, lines, baseline)), found) : [];
  const { lines, fails } = verdict({ faults, still, baseline, was, at: p.at, deleted, touched, texts: read });
  for (const l of lines) (l.startsWith("FAIL") ? console.error : console.log)(logged(l));
  summary(lines);
  return fails ? 1 : 0;
}

// The faults the tool finds on the lines given (a Map of file to a Set). Before the baseline stands, a tool that cannot
// run is said and fails nothing.
function measured(p, lines, baseline) {
  try { return lines.size ? faultsOf(runTool(p.tool.command, linesArg(lines)), lines) : []; } catch (e) {
    if (baseline || !(e instanceof Refused)) throw e;
    console.log(`Reported only, and not measured: ${e.message}`);
    return [];
  }
}

// Whether the pull request changes a file the code's or the tests' pathspecs read, but the baselines and Markdown.
function touches(p, base) {
  const from = tolerant(() => git(["merge-base", base, "HEAD"]).trim()) || base, record = new Set([p.at, p.config.baseline]);
  return git(["diff", "--name-only", "--no-renames", from, "--", ...p.config.code, ...p.config.tests]).split("\n").some(f => f && !record.has(f) && path.posix.extname(f) !== ".md");
}

// The whole run: the tool on every file of the code, and the baseline written from it, keeping the reasons of the
// entries that still stand.
function whole(p) {
  const faults = faultsOf(runTool(p.tool.command, p.code.join(",")), null), unrun = faults.filter(f => f.status === "Pending").length;
  if (unrun) refuse(`the mutation tool left ${unrun} faults not run, so the whole run is not whole`, "run it again with no budget (MUTATE_BUDGET unset for the core's tool)");
  const old = baselineFrom(tolerant(() => fs.readFileSync(unlinked(p.at), "utf8")), p.at);
  const listed = {};
  for (const f of faults.filter(f => SURVIVED.includes(f.status))) listed[f.id] = { count: (listed[f.id]?.count ?? 0) + 1 };
  const grown = Object.fromEntries(Object.entries(old?.grown ?? {}).filter(([id]) => id in listed));
  const head = tolerant(() => git(["rev-parse", "HEAD"]).trim()) ?? "unknown";
  const sorted = Object.fromEntries(Object.entries(listed).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(path.dirname(unlinked(p.at)), { recursive: true });
  fs.writeFileSync(unlinked(p.at), `${JSON.stringify({ whole: { day: new Date().toISOString().slice(0, 10), commit: head }, ...(Object.keys(grown).length ? { grown } : {}), listed: sorted }, null, 2)}\n`);
  console.log(`The whole run: ${counted(faults).line}. ${p.at} lists ${Object.keys(listed).length} faults that survive${old ? `, against ${old.listed.size} before` : ""}.`);
  return 0;
}

// A cleaning task's run: the tool on the files named, and the baseline's entries of those files lowered to what
// survives now. Nothing joins, and an entry of another file stays as it was.
function lower(p, named) {
  const files = named.split(",").filter(Boolean);
  const outside = files.find(f => !p.code.includes(f));
  if (outside !== undefined) refuse(`${outside} is no file of the code the shape check's config reads`, "name files of its \"code\" that are no tests, joined by commas");
  const old = baselineFrom(tolerant(() => fs.readFileSync(unlinked(p.at), "utf8")), p.at);
  if (!old) refuse(`there is no baseline at ${p.at} to lower`, "write it first with the audit's whole run (--whole)");
  const now = new Map(), found = faultsOf(runTool(p.tool.command, files.join(",")), null);
  const unrun = found.filter(f => f.status === "Pending").length;
  if (unrun) refuse(`the mutation tool left ${unrun} faults of ${files.join(", ")} not run, so what they would show is not known`, "run it again with no budget (MUTATE_BUDGET unset for the core's tool), or on fewer files at a time");
  for (const f of found.filter(f => SURVIVED.includes(f.status))) now.set(f.id, (now.get(f.id) ?? 0) + 1);
  const listed = Object.fromEntries([...lowered(old.listed, now, files)].map(([id, c]) => [id, { count: c }]));
  // (a reason given for an entry that left follows its kind's debt to the ids it is now listed under)
  const left = Object.keys(old.grown).filter(id => !(id in listed)), why = id => old.grown[id] ?? (old.listed.has(id) ? undefined : old.grown[left.find(g => kindOf(g) === kindOf(id))]);
  const grown = Object.fromEntries(Object.keys(listed).map(id => [id, why(id)]).filter(([, w]) => (w ?? "").trim()));
  fs.writeFileSync(unlinked(p.at), `${JSON.stringify({ ...(old.whole ? { whole: old.whole } : {}), ...(Object.keys(grown).length ? { grown } : {}), listed }, null, 2)}\n`);
  console.log(`${p.at} lists ${Object.keys(listed).length} faults that survive, against ${old.listed.size} before.`);
  return 0;
}

function main(argv) {
  const [option, files] = argv;
  const known = (option === "--whole" && argv.length === 1) || (option === "--lower" && argv.length === 2) || !argv.length;
  if (!known) refuse(`the check does not know ${argv.join(" ")}`, "run it with no option on a pull request, with --whole for the audit's whole run, or with --lower <file>[,<file>...] in a cleaning task");
  const p = project();
  if (!p.tool) { console.log(`The project names no mutation tool: its manifest has no row ${ROW}. The measure waits for that step (${p.home}setup/sync-notes/, "how strong the tests are").`); return 0; }
  if (p.tool.none !== undefined) { console.log(`The measure is left out: the project names no mutation tool${p.tool.none ? ` (${p.tool.none})` : ""}.`); return 0; }
  if (!p.config) { console.log("The measure waits for the shape check's config, whose \"code\" and \"tests\" it reads."); return 0; }
  if (option === "--whole") return whole(p);
  if (option === "--lower") return lower(p, files);
  const base = process.env.STRENGTH_BASE || "";
  if (!base) { console.log("No base (STRENGTH_BASE): no pull request's lines to measure."); return 0; }
  if (!/^\w[\w./^~-]*$/u.test(base) || tolerant(() => git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`])) === null) refuse(`STRENGTH_BASE (${JSON.stringify(base).slice(0, 80)}) is no commit here`, "set it to the pull request's base, such as origin/main, and fetch it first");
  return onPullRequest(p, base);
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { if (!(e instanceof Refused)) throw e; console.error(`FAIL: ${logged(e.message)}`); process.exitCode = 1; }
}
