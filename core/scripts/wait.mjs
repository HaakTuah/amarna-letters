// What a pull request waits on (tasks/tests.md, "What a push waits on has a time mark"; #321), for every project
// that takes the core: of the pull requests merged last, the time the checks of each one's last push took, from the
// first check's start to the last one's end, and their median, held to the mark the shape check's config gives under
// "wait" (shape.mjs, beside this file, which lets the mark rise only as a suite's does); and, from the same checks, the
// minutes GitHub bills for each one's last push, each job rounded up to a whole minute, and their median (AGENTS.md of
// the core, "The core is measured as a feature is"; #460, point 6). It reports and fails nothing: the monthly state
// report says both medians, the wait beside its mark (state-report.mjs), and the session that reads a median past it
// files the task that brings it down.
//
//   node core/scripts/wait.mjs [<config>] --repo <owner>/<name> [--count <n>]
//       the last n merged pull requests (30 where none is given), through gh: the wait, then the billed minutes.
//       Reads only; gh and Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { aCommit, aRepository } from "./guards.mjs";
import { timeOf } from "./moment.mjs";
import { ghApi } from "./labels.mjs";
import { notLinked, parseConfig, where } from "./shape.mjs";
import { started } from "./started.mjs";

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
export const COUNT = 30;

// The seconds the checks of one push took: from the first one's start to the last one's end, of those that ran to an
// end (one skipped or not started counts nothing); null where none did.
export function waited(checks) {
  const ran = checks.filter(c => timeOf(c?.started_at) !== null && timeOf(c.completed_at) !== null && c.conclusion !== "skipped");
  if (!ran.length) return null;
  const from = Math.min(...ran.map(c => timeOf(c.started_at))), to = Math.max(...ran.map(c => timeOf(c.completed_at)));
  return Math.max(0, Math.round((to - from) / 1000));
}

// The minutes GitHub bills for the checks of one push, every attempt among them: each job its runners ran (a check run
// of the app github-actions that started and ended, not skipped; another app's check runs on no runner) rounded up to a
// whole minute, as GitHub bills a job, one at least; null where none ran. A check run does not say its runner: not
// weighted by its system (where a project runs jobs on Windows or macOS, which use its free minutes faster, it is a
// floor), and a self-hosted runner's job, which bills nothing, counted as any (selfHosted() says where one may be).
export function billed(checks) {
  const ran = checks.filter(c => c?.app?.slug === "github-actions" && timeOf(c.started_at) !== null && timeOf(c.completed_at) !== null && c.conclusion !== "skipped");
  if (!ran.length) return null;
  return ran.reduce((n, c) => n + Math.max(1, Math.ceil((timeOf(c.completed_at) - timeOf(c.started_at)) / 60000)), 0);
}

// Of every attempt of a push's check runs, the latest of each check, as GitHub shows them: what the wait reads.
export const latest = checks => [...checks.reduce((by, c) => { const k = `${c?.app?.slug ?? ""}\u0000${c?.name ?? ""}`, was = by.get(k); if (!was || String(c.started_at) > String(was.started_at)) by.set(k, c); return by; }, new Map()).values()];

// Whether a workflow of the project at `root` names a self-hosted runner (`runs-on` with "self-hosted"), read from its
// files: then the billed minutes may count jobs GitHub does not bill.
export function selfHosted(root = ".") {
  const dir = path.join(root, ".github", "workflows");
  try { return fs.readdirSync(dir).filter(f => /\.ya?ml$/u.test(f)).some(f => /^\s*runs-on:.*self-hosted/mu.test(fs.readFileSync(path.join(dir, f), "utf8"))); } catch { return false; }
}

export const median = xs => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length ? (s.length % 2 ? s[k] : Math.round((s[k - 1] + s[k]) / 2)) : null; };

// The last `count` merged pull requests of `repo` that `kept` keeps, newest first, read through `gh`: GitHub's rows.
// Also read by merge-line.mjs, beside this file, which keeps those into the default branch alone.
export function lastMerged(repo, count, gh = ghApi, kept = () => true) {
  // (newest updated first: a pull request is updated when it merges, so once a page's last update is older than the
  // count-th newest merge read, no later page holds a newer one)
  const merged = [], kth = () => merged.map(p => p.merged_at).sort().reverse()[count - 1];
  for (let page = 1; page <= 10; page++) {
    const rows = JSON.parse(gh(`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`) || "[]");
    merged.push(...rows.filter(p => p.merged_at && kept(p)));
    if (rows.length < 100 || (merged.length >= count && String(rows.at(-1).updated_at) < kth())) break;
  }
  return merged.sort((a, b) => b.merged_at.localeCompare(a.merged_at)).slice(0, count);
}

// The median wait of the last `count` merged pull requests of `repo`, read through `gh`, and their median billed
// minutes: { median, read, mark, billed, billedRead }, mark the config's, or undefined where it gives none.
export function measure({ repo, count = COUNT, mark, gh = ghApi }) {
  if (!aRepository(repo)) throw new Refused(`${JSON.stringify(String(repo)).slice(0, 80)} names no repository. Mend: name it as <owner>/<name>`);
  // (a head that is no commit's whole name, as GitHub gives one, is not read: it would name another route than the commit's)
  const runs = lastMerged(repo, count, gh).filter(p => aCommit(p.head?.sha))
    .map(p => JSON.parse(gh(`repos/${repo}/commits/${p.head.sha}/check-runs?filter=all&per_page=100`) || "{}").check_runs ?? []);
  const times = runs.map(r => waited(latest(r))).filter(t => t !== null), bills = runs.map(billed).filter(b => b !== null);
  return { median: median(times), read: times.length, mark, billed: median(bills), billedRead: bills.length };
}

// The line the state report gives: the median against its mark.
export function line(m) {
  if (m.median === null) return `- what a push waits on: not read (no merged pull request's checks could be read).`;
  const minutes = s => `${(s / 60).toFixed(1)} min`;
  const against = m.mark === undefined ? "; the shape check's config gives no mark under \"wait\"" : m.median > m.mark ? `, past its mark of ${minutes(m.mark)}: a task brings it down (tasks/tests.md)` : `, within its mark of ${minutes(m.mark)}`;
  return `- what a push waits on: ${minutes(m.median)}, the median of the last ${m.read} merged pull requests' checks${against}.`;
}

// The line the state report gives beside it: the median billed minutes.
export function billedLine(m, hosted = false) {
  if (m.billed === null || m.billed === undefined) return "- billed minutes a pull request: not read (no merged pull request's checks ran on GitHub's runners).";
  return `- billed minutes a pull request: ${m.billed}, the median of the last ${m.billedRead} merged pull requests' last push, each job and each attempt rounded up to a whole minute as GitHub bills it, not weighted by the runner's system${hosted ? "; a workflow here names a self-hosted runner, whose jobs GitHub does not bill, so it is a ceiling" : ""}.`;
}

function main(argv) {
  const named = argv[0] && !argv[0].startsWith("--") ? argv[0] : null, rest = named ? argv.slice(1) : argv;
  const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
  const repo = opt("--repo"), count = Number(opt("--count") ?? COUNT);
  if (!aRepository(repo) || !(Number.isInteger(count) && count > 0)) refuse("no repository was named, or the count is no whole number", "run node core/scripts/wait.mjs [<config>] --repo <owner>/<name> [--count <n>]");
  const rules = ["core-manifest.md", "AGENTS.md"].find(f => fs.existsSync(f)), at = named ?? where(rules ? fs.readFileSync(rules, "utf8") : "");
  let mark;
  try { mark = fs.existsSync(notLinked(at)) ? parseConfig(fs.readFileSync(at, "utf8"), at).wait : undefined; } catch { mark = undefined; }
  const m = measure({ repo, count, mark });
  console.log(`${line(m)}\n${billedLine(m, selfHosted())}`);
  return 0;
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { if (!(e instanceof Refused)) throw e; console.error(`FAIL: ${e.message}`); process.exitCode = 1; }
}
