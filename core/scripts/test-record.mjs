// What each test is worth (tasks/tests.md, "Each test is measured" and "A test keeps its place by one of three";
// #275), for every project that takes the core, read at its audit (tasks/cleaning.md), whose report shows the table
// this prints. For each test file: how long it takes (the median of its runs), how often it failed for a real reason
// and when last, how often it failed for no reason (it failed, and passed, on the same commit in the same job), what it
// alone catches of the faults put in on purpose (a mutation report whose faults name every test that caught them:
// mutate.mjs --every, beside this file, or Stryker's with its bail turned off), whether it guards a rule the project
// states (a rule file names its path, or its opening line names a rule file or an issue), whether it is the project's proof (the shape check's config, "select.proof") and whether it opens a screen, reaches a real clock or starts
// another process (the shape check's entries of the readers "screens", "clocks" and "processes"), with the share of the
// tests' time each of those three takes (#457). A test that none of the three keeps (it alone catches a fault, it
// guards a stated rule, it failed for a real reason) is proposed for removal or for merging with its neighbour; the reader of the
// audit decides, never by coverage alone, and one whose faults are not counted yet is never proposed. A test that
// failed for no reason is named, to be mended or removed. It reports and fails nothing.
//
// The runs are read from the workflow's own jobs through gh (each step that starts a test file the config names, as
// the core's tests workflow does, one a step), or from JUnit reports a project's runner writes (each file one run;
// each <testcase> counted under its "file", else its "classname").
//
//   node core/scripts/test-record.mjs [<config>] [--repo <owner>/<name> --workflow <file> [--count <n>]]
//                                     [--junit <folder>] [--mutation <report>]
//       Reads only; gh, git and Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { ghApi } from "./labels.mjs";
import { matcher } from "./select-matcher.mjs";
import { notLinked, parseConfig, standing, survey, where } from "./shape.mjs";
import { started } from "./started.mjs";
import { median } from "./wait.mjs";

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
export const COUNT = 30;

// ---- the runs ----

// Each step of a workflow that starts a test file, by its name: the step's name to the test. Read line by line (a
// step's "- name:" and the "run:" under it, on its line or, after | or >, on the lines indented under it), so a
// workflow's every form of YAML is read alike. A name that two steps give to different tests (in two jobs) is left
// out, since a job's runs cannot be told apart by it: no run is put on the wrong test.
export function stepsOf(workflowText, tests) {
  const out = new Map(), aTest = run => [...tests].find(t => new RegExp(`(^|[\\s/])${t.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?=\\s|$)`, "um").test(run));
  const lines = String(workflowText).split(/\r?\n/u), indent = l => /^\s*/u.exec(l)[0].length;
  let name = null;
  const twice = new Set();
  for (let i = 0; i < lines.length; i++) {
    const step = /^\s*- name:\s*(.+?)\s*$/u.exec(lines[i]), run = /^\s*(?:- )?run:\s*(.*?)\s*$/u.exec(lines[i]);
    if (step) name = step[1].replace(/^(["'])(.*)\1$/u, "$2");
    else if (/^\s*- /u.test(lines[i])) name = null;
    if (!run || name === null) continue;
    let text = run[1];
    if (/^[|>][-+0-9]*$/u.test(text)) { // (a block: the lines indented under it, to the first that is not)
      const under = [];
      for (let j = i + 1; j < lines.length && (!lines[j].trim() || indent(lines[j]) > indent(lines[i])); j++) under.push(lines[j]);
      text = under.join("\n");
    }
    const test = aTest(text);
    if (test) { if (out.has(name) && out.get(name) !== test) twice.add(name); out.set(name, test); }
  }
  for (const name of twice) out.delete(name);
  return out;
}

// The runs of a test, from the jobs GitHub gives (each { name, run_attempt, head_sha, created_at, steps }): one
// observation for each step that ran a test, { test, key, at, seconds, passed }, key the commit and the job.
export function fromJobs(jobs, steps) {
  const out = [];
  for (const job of jobs) for (const s of job.steps ?? []) {
    const test = steps.get(s.name);
    if (!test || !["success", "failure"].includes(s.conclusion) || !s.started_at || !s.completed_at) continue;
    out.push({ test, key: `${job.head_sha} ${job.name}`, at: job.created_at ?? s.started_at, seconds: (Date.parse(s.completed_at) - Date.parse(s.started_at)) / 1000, passed: s.conclusion === "success" });
  }
  return out;
}

const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/gu)].map(m => [m[1], m[2]]));

// The runs of each test file from JUnit reports ({ name: text }, each one run, in the order given): one observation for
// each file of tests in each report, its cases' seconds summed, failed where one of them failed or erred.
export function fromJunit(reports) {
  const out = [];
  for (const [name, text] of Object.entries(reports)) {
    const files = new Map();
    for (const m of text.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/gu)) {
      const a = attrs(m[1]), file = a.file || a.classname || "(unnamed)", f = files.get(file) ?? { seconds: 0, passed: true };
      f.seconds += Number(a.time) || 0;
      if (m[3] && /<(failure|error)\b/u.test(m[3])) f.passed = false;
      files.set(file, f);
    }
    for (const [test, f] of files) out.push({ test, key: name, at: name, ...f });
  }
  return out;
}

// What each test alone catches, from a mutation report whose faults name the tests that caught them ("killedBy", by
// the ids "testFiles" gives a name): the test's name to the count; null where no fault names its tests.
export function alone(report) {
  const names = new Map(Object.entries(report?.testFiles ?? {}).flatMap(([file, f]) => (f.tests ?? []).map(t => [t.id, file])));
  const counts = new Map();
  let named = false;
  for (const f of Object.values(report?.files ?? {})) for (const m of f.mutants ?? []) {
    if (!Array.isArray(m.killedBy) || !m.killedBy.length) continue;
    named = true;
    const files = new Set(m.killedBy.map(id => names.get(id) ?? id)); // (two cases of one file are that file alone)
    if (files.size === 1) { const [t] = files; counts.set(t, (counts.get(t) ?? 0) + 1); }
  }
  return named ? counts : null;
}

// ---- the record ----

// Each test's numbers and its verdict. `tests` the project's test files, `runs` the observations, `alone` the faults
// each alone catches (null where not counted), `named` the tests a rule names, `proof`, `screens`, `clocks` and
// `processes` sets of tests (the last two: those that reach a real clock and that start another process; #457).
export function record({ tests, runs, alone: caught, named, proof, screens, clocks = new Set(), processes = new Set() }) {
  const passedOn = new Set(runs.filter(r => r.passed).map(r => `${r.test}\n${r.key}`));
  return [...new Set([...tests, ...runs.map(r => r.test)])].sort().map(test => {
    const mine = runs.filter(r => r.test === test), fails = mine.filter(r => !r.passed);
    const flaky = fails.filter(r => passedOn.has(`${r.test}\n${r.key}`)), real = fails.filter(r => !passedOn.has(`${r.test}\n${r.key}`));
    const only = caught === null ? null : caught.get(test) ?? 0;
    const keeps = [only ? `alone catches ${only}` : "", named.has(test) ? "it guards a stated rule" : "", real.length ? "failed for a real reason" : "", proof.has(test) ? "the project's proof" : ""].filter(Boolean);
    const verdict = keeps.length ? `kept: ${keeps.join(", ")}` : only === null ? "not weighed: no run counted what it alone catches" : "proposed: for removal, or for merging with its neighbour";
    return { test, runs: mine.length, seconds: median(mine.map(r => r.seconds)), real: real.length, last: real.map(r => r.at).sort().at(-1) ?? null, flaky: flaky.length, alone: only, screen: screens.has(test), clock: clocks.has(test), process: processes.has(test), verdict };
  });
}

// The table the audit's report shows, and what it asks.
export function table(rows) {
  const cell = v => (v === null ? "-" : String(v));
  const lines = ["| Test | Runs | Seconds (median) | Real failures (last) | For no reason | Alone catches | Screen | Clock | Process | Verdict |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(r => `| \`${r.test}\` | ${r.runs} | ${cell(r.seconds === null ? null : Math.round(r.seconds * 10) / 10)} | ${r.real}${r.last ? ` (${String(r.last).slice(0, 10)})` : ""} | ${r.flaky} | ${cell(r.alone)} | ${r.screen ? "yes" : ""} | ${r.clock ? "yes" : ""} | ${r.process ? "yes" : ""} | ${r.verdict} |`)];
  const flaky = rows.filter(r => r.flaky), proposed = rows.filter(r => r.verdict.startsWith("proposed")), screened = rows.filter(r => r.screen);
  const time = rs => Math.round(rs.reduce((s, r) => s + (r.seconds ?? 0), 0));
  // (each share from the summed medians as they stand, rounded only as it is shown)
  const sum = rs => rs.reduce((s, r) => s + (r.seconds ?? 0), 0);
  const share = rs => (sum(rows) ? ` (${Math.round(100 * sum(rs) / sum(rows))}%)` : "");
  const clocked = rows.filter(r => r.clock), spawning = rows.filter(r => r.process);
  lines.push("", `${rows.length} tests, ${time(rows)} s in all by their medians. ${screened.length} open a screen, ${time(screened)} s of it. ${clocked.length} reach a real clock, ${time(clocked)} s of it${share(clocked)}; ${spawning.length} start another process, ${time(spawning)} s of it${share(spawning)}.`);
  if (flaky.length) lines.push(`Failed for no reason, each to be mended or removed, never retried in silence: ${flaky.map(r => `\`${r.test}\` (${r.flaky})`).join(", ")}.`);
  if (proposed.length) lines.push(`Proposed for removal or merging, for the reader to decide, each in a small pull request that leaves the tests' strength no worse: ${proposed.map(r => `\`${r.test}\``).join(", ")}.`);
  return lines;
}

// ---- reading the project ----

// Whether a test's opening line, a comment, names a rule file (a path ending .md) or an issue (#n): what the test
// says it guards (tasks/tests.md, "A new test says what it guards").
export const saysWhatItGuards = text => {
  const first = String(text).split(/\r?\n/u).find(l => l.trim()) ?? "";
  return /^\s*(\/\/|#|\/\*|<!--|"{3}|'{3})/u.test(first) && /(#\d+\b|[\w./-]+\.md\b)/u.test(first);
};

// The tests that guard a rule the project states: each test file whose path stands in its rule files or its holders'
// list, or whose opening line names a rule file or an issue.
function guarding(tests, texts) {
  const entries = fs.existsSync("scripts/holders") ? fs.readdirSync("scripts/holders").map(f => `scripts/holders/${f}`) : [];
  const rules = ["AGENTS.md", "SECURITY.md", "core-manifest.md", ...entries].filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, "utf8")).join("\n");
  return new Set([...tests].filter(t => rules.includes(t) || saysWhatItGuards(texts[t] ?? "")));
}

function runsOf(opts, tests) {
  const runs = [];
  if (opts["--repo"]) {
    const wf = opts["--workflow"];
    if (!/^[\w.-]+\/[\w.-]+$/u.test(opts["--repo"]) || !/^[\w.-]+\.ya?ml$/u.test(wf ?? "")) refuse("--repo needs <owner>/<name> and --workflow the file of the workflow that runs the tests", "run it with --repo <owner>/<name> --workflow <file>.yml");
    const at = `.github/workflows/${wf}`, steps = stepsOf(fs.existsSync(at) ? fs.readFileSync(at, "utf8") : refuse(`there is no workflow at ${at}`, "name the workflow that runs the tests, as it stands under .github/workflows/"), tests);
    const count = Number(opts["--count"] ?? COUNT);
    const ids = JSON.parse(ghApi(`repos/${opts["--repo"]}/actions/workflows/${wf}/runs?status=completed&per_page=${Math.min(100, count)}`)).workflow_runs.slice(0, count);
    for (const run of ids) runs.push(...fromJobs(JSON.parse(ghApi(`repos/${opts["--repo"]}/actions/runs/${run.id}/jobs?filter=all&per_page=100`)).jobs.map(j => ({ ...j, created_at: run.created_at })), steps));
  }
  if (opts["--junit"]) {
    const dir = opts["--junit"], files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".xml")).sort() : refuse(`there is no folder at ${dir}`, "name the folder that holds the JUnit reports, one a run");
    runs.push(...fromJunit(Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(dir, f), "utf8")]))));
  }
  return runs;
}

function main(argv) {
  const named = argv[0] && !argv[0].startsWith("--") ? argv[0] : null, rest = named ? argv.slice(1) : argv, opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!["--repo", "--workflow", "--count", "--junit", "--mutation"].includes(rest[i]) || rest[i + 1] === undefined) refuse(`the record does not know ${rest.slice(i).join(" ")}`, "run node core/scripts/test-record.mjs [<config>] [--repo <owner>/<name> --workflow <file>] [--count <n>] [--junit <folder>] [--mutation <report>]");
    opts[rest[i]] = rest[i + 1];
  }
  const rules = ["core-manifest.md", "AGENTS.md"].find(f => fs.existsSync(f)), at = named ?? where(rules ? fs.readFileSync(rules, "utf8") : "");
  if (!fs.existsSync(notLinked(at))) refuse(`there is no shape check's config at ${at}`, "write it as the starter kit does, with the project's test files under \"tests\"");
  const config = parseConfig(fs.readFileSync(at, "utf8"), at), now = standing(config);
  let mutation = null;
  if (opts["--mutation"]) try { mutation = JSON.parse(fs.readFileSync(opts["--mutation"], "utf8")); } catch { refuse(`the mutation report ${opts["--mutation"]} could not be read as JSON`, "name the report of a whole run, in the mutation-testing-elements schema"); }
  const ids = [...survey(now.texts, config, now.tests).entries.keys()];
  const of = kind => new Set(ids.filter(id => id.startsWith(`${kind}: `)).map(id => id.slice(kind.length + 2, id.indexOf(" -> "))));
  const proof = matcher(config.select.proof);
  const rows = record({ tests: now.tests, runs: runsOf(opts, now.tests), alone: alone(mutation), named: guarding(now.tests, now.texts), proof: new Set([...now.tests].filter(proof)), screens: of("screen"), clocks: of("timed"), processes: of("process") });
  console.log(table(rows).join("\n"));
  return 0;
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { if (!(e instanceof Refused)) throw e; console.error(`FAIL: ${e.message}`); process.exitCode = 1; }
}
