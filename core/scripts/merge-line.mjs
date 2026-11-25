// The merge line (roles/shared/work-flow.md, "Ready pull requests merge in a line"; tasks/hosts.md; #702), read from
// GitHub, for every project that takes the core. It reads three facts of the host, never declared: whether a branch
// must be up to date with the default branch before it merges, whether the host offers a merge queue for the
// repository and whether it is on, and whether the repository's runner minutes are billed, each following from who
// holds the repository, whether it is private and its rules on the default branch; a row of the project's manifest
// (*merge queue*, *billed minutes*) only overrides what was read, and it prints what it read. It reads too whether the
// project's users get each merge or a release (*users get*; floor rule 12; tasks/hosts.md, "What users get is published
// only from a green default branch"; #733), which cannot be read from the host: each merge where no row
// says, the core's own from its AGENTS.md. With --measure it counts
// the line's measure, which the monthly state report gives (state-report.mjs, beside this file): of the last merged
// pull requests, the pushes whose checks ran on each, and the minutes from its turn to its merge, its turn the later of
// the merge before it and its last marking ready. With --cancel, where the front's run stands queued behind the host's
// cap on jobs at once, it cancels the queued runs of the pull requests that are not the front or next in line, never
// a run of theirs or of the default branch. gh and Node's own modules.
//
//   node core/scripts/merge-line.mjs --repo <owner>/<name>                     the three facts, and what follows
//   node core/scripts/merge-line.mjs --repo <owner>/<name> --measure [--count <n>]   the measure (30 where none is given)
//   node core/scripts/merge-line.mjs --repo <owner>/<name> --cancel <front>[,<next>]  the cancelling of point 5
import fs from "node:fs";
import { aRepository, oneLine } from "./guards.mjs";
import { timeOf } from "./moment.mjs";
import { ghApi } from "./labels.mjs";
import { held } from "./releases.mjs";
import { started } from "./started.mjs";
import { COUNT, lastMerged, median } from "./wait.mjs";

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
const json = text => JSON.parse(text || "null");

// A row of the manifest that overrides a reading, `| *<slot>* | `<value>` |`: the value, or undefined where none.
export function override(manifest, slot, values) {
  const m = new RegExp(`^\\|[ \\t]*\\*${slot}\\*[ \\t]*\\|[ \\t]*\`([a-z]+)\``, "mu").exec(String(manifest ?? ""));
  return m && values.includes(m[1]) ? m[1] : undefined;
}

// Whether a branch must be up to date with `branch` before it merges, read from its rules and its classic protection:
// { upToDate (true, false, or null where neither answered), queued (a merge queue in its rules), said }.
function upToDateOf(repo, branch, gh) {
  let rules = null, classic = null;
  try { rules = json(gh(`repos/${repo}/rules/branches/${encodeURIComponent(branch)}`)); } catch { /* (not read) */ }
  try { classic = json(gh(`repos/${repo}/branches/${encodeURIComponent(branch)}/protection/required_status_checks`)).strict === true; }
  // (only the host's own "Branch not protected" is read as no protection: a 404 may also be a sign-in short of the right)
  catch (e) { classic = /Branch not protected/u.test(e.message) ? false : null; }
  const listed = Array.isArray(rules) ? rules : [];
  const strict = listed.some(x => x.type === "required_status_checks" && x.parameters?.strict_required_status_checks_policy === true);
  const queued = listed.some(x => x.type === "merge_queue");
  const byRules = strict || queued;
  const upToDate = byRules || classic === true ? true : Array.isArray(rules) && classic === false ? false : null;
  const said = upToDate === null ? "whether a branch must be up to date before it merges: not read (its rules or its protection did not answer), so the line is kept"
    : `a branch must be up to date before it merges: ${upToDate ? "yes" : "no"}, by its ${byRules ? "rules" : "protection"} on \`${branch}\``;
  return { upToDate, queued, said };
}

// The organisation's plan where a private repository of one is offered a queue only on the largest: "none",
// "offered", or null where the plan did not answer or is one whose name it does not know (never guessed); and the plan.
function planQueue(r, gh) {
  let plan;
  try { plan = json(gh(`orgs/${encodeURIComponent(String(r.owner.login))}`))?.plan?.name; } catch { plan = undefined; }
  return { queue: { free: "none", team: "none", enterprise: "offered" }[String(plan).toLowerCase()] ?? null, plan };
}

// Whether the host offers `r` a merge queue and whether it is on: { queue, said }.
function queueOf(r, queued, gh) {
  const org = r.owner?.type === "Organization";
  const { queue, plan } = queued ? { queue: "on" } : !org ? { queue: "none" } : !r.private ? { queue: "offered" } : planQueue(r, gh);
  const named = plan === undefined ? "did not answer" : `is ${JSON.stringify(oneLine(plan).slice(0, 40))}, a name this script does not know`;
  const what = { on: "on", offered: "offered and off", none: "not offered" }[queue] ?? `not read (the organisation's plan ${named}), so taken as not offered`;
  const holder = org ? `an organisation's${plan ? ` on the plan ${oneLine(plan).slice(0, 40)}` : ""}` : "a person's account's";
  const why = queued ? "by its rules on the default branch" : `the repository being ${r.private ? "private" : "public"} and ${holder}`;
  return { queue, said: `its merge queue: ${what}, ${why}` };
}

// Whether the checks of the default branch's newest commit all passed (floor rule 12: a red one is fixed first, in every
// project), as the host lists
// the runs its push started (held, in releases.mjs, as a release reads them): { sha, state ("passed", "running",
// "failed" or null where it could not be read), said }. A run still going is "running"; any other reason "failed".
function newestOf(repo, branch, gh) {
  let sha = null, list = null;
  try { sha = json(gh(`repos/${repo}/commits/${encodeURIComponent(branch)}`))?.sha ?? null; } catch { /* (not read) */ }
  if (!/^[0-9a-f]{40}$/u.test(String(sha))) return { sha: null, state: null, said: `the default branch's newest commit: not read, so whether its checks passed is not known` };
  try { list = json(gh(`repos/${repo}/actions/runs?head_sha=${sha}&branch=${encodeURIComponent(branch)}&event=push&per_page=100`)); } catch { /* (held says so) */ }
  // (no workflow is set aside: a project's own release workflow, run on a push, is one of its checks)
  const reasons = held(list, null), going = r => /: (?:queued|in_progress|waiting|pending|requested)$/u.test(r);
  const state = !reasons.length ? "passed" : list?.workflow_runs && reasons.every(r => going(r) || r === "no check has passed on it yet") ? "running" : reasons.some(r => /could not be read|were read/u.test(r)) ? null : "failed";
  const what = { passed: "its checks all passed", running: "its checks are still running", failed: `a check failed (${reasons.filter(r => !going(r)).map(r => oneLine(r).slice(0, 80)).join("; ")})` }[state] ?? "its checks could not be read";
  return { sha, state, said: `the default branch's newest commit, ${sha.slice(0, 7)}: ${what}` };
}

// The three facts of `repo`, read through `gh`, and overridden by `manifest`'s rows: { upToDate (true, false or null
// where it could not be read), queue ("on", "offered", "none" or null), billed (true or false), users ("merges" or
// "releases", the row *users get*), branch, said }, `said` how each was read.
export function facts({ repo, manifest = null, gh = ghApi }) {
  const r = json(gh(`repos/${repo}`)), branch = r.default_branch;
  const up = upToDateOf(repo, branch, gh), q = queueOf(r, up.queued, gh);
  const queueOver = override(manifest, "merge queue", ["on", "offered", "none"]);
  const billedOver = override(manifest, "billed minutes", ["yes", "no"]);
  const billedRead = r.private === true ? "yes, the repository being private" : "no, the repository being public";
  const users = override(manifest, "users get", ["merges", "releases"]);
  const newest = newestOf(repo, branch, gh);
  const said = [up.said,
    queueOver ? `its merge queue: ${queueOver}, as the manifest's row *merge queue* says (read: ${q.queue ?? "not read"})` : q.said,
    billedOver ? `its runner minutes billed: ${billedOver}, as the manifest's row *billed minutes* says (read: ${billedRead})` : `its runner minutes billed: ${billedRead}`,
    users ? `its users get: ${users === "releases" ? "a release" : "each merge"}, as the manifest's row *users get* says` : "its users get: each merge, as no row *users get* says otherwise (it cannot be read from the host)",
    ...newest ? [newest.said] : []];
  return { upToDate: up.upToDate, queue: queueOver ?? q.queue, queueRead: q.queue, billed: billedOver ? billedOver === "yes" : r.private === true, users: users ?? "merges", newest, branch, said };
}

// What follows from the facts, as tasks/hosts.md says: who keeps the line, and the one line of advice to the owner.
export function follows(f) {
  const red = f.newest?.state === "failed" ? " The default branch's newest commit has a failed check: no pull request but its fix merges. Turn auto-merge off on every other open pull request (the core's tasks/github-calls.md), and give the fix the first lane, or take it as a bug where no open pull request says it fixes it." : f.newest?.state === null ? " Whether the default branch's newest commit's checks passed could not be read: read them before a merge." : "";
  if (f.users === "releases") {
    const own = "Its users get a release: a pull request merges on its own green checks, up to date or not, while no check on the default branch's newest commit failed (floor rule 12; the core's tasks/hosts.md)." + red;
    if (f.upToDate === false) return `${own} No up-to-date branch is asked: the line has nothing to act on.`;
    if (f.upToDate === null) return `${own} Whether the host asks an up-to-date branch was not read, so the line is kept by hand meanwhile, as the core's roles/shared/work-flow.md says.`;
    return `${own} The host still asks an up-to-date branch, a setting of the default branch's rules only the owner changes: where no open issue names it, file one for the owner, labelled needs-owner, to switch it off, and nothing waits on it. Until then the line is kept${f.queue === "on" ? " by the host's merge queue" : " by hand, as the core's roles/shared/work-flow.md says"}.`;
  }
  // (where users get each merge, its publishing waits on no green branch yet: the step of the sync notes makes it, and
  // the row *users get* then says releases; #733, point 8; a red default branch is fixed first all the same)
  const pub = "Its users get each merge, published on a merge alone: a pull request is brought up to date first, until its agents make its publishing wait on a green default branch, a step of the core's sync notes, and the manifest's row *users get* then says `releases` (floor rule 12; the core's tasks/hosts.md)." + red;
  if (f.upToDate === false) return `${pub} No up-to-date branch is asked before a merge: the line has nothing to act on, and nothing waits.`;
  if (f.queue === "on") return `${pub} The host's merge queue keeps the line: bringing branches up to date by hand has nothing to act on.`;
  const line = `${pub} The line is kept by hand, as the core's roles/shared/work-flow.md says: only the first ready pull request is brought up to date.`;
  return f.queue === "offered" ? `${line} The host offers a merge queue for this repository, a setting of the default branch's rules only the owner makes, which would keep the line: where no open issue names it, file one for the owner, labelled needs-owner, and nothing waits on it. (A queue set in the branch's classic protection is not read here; the owner's settings show it.)` : line;
}

// The times of a pull request's markings ready, read from its timeline: the last, or null where it was never a draft.
function lastReady(repo, n, gh) {
  let last = null;
  for (let page = 1; page <= 10; page++) {
    const rows = json(gh(`repos/${repo}/issues/${n}/timeline?per_page=100&page=${page}`)) ?? [];
    for (const e of rows) if (e?.event === "ready_for_review" && timeOf(e.created_at) !== null) last = Math.max(last ?? 0, timeOf(e.created_at));
    if (rows.length < 100) break;
  }
  return last;
}

// The head commits a pull request's checks were started on, from its branch's runs between its opening and its merge.
function pushesRun(repo, p, gh) {
  const from = timeOf(p.created_at), to = timeOf(p.merged_at), shas = new Set();
  for (let page = 1; page <= 10; page++) {
    const got = json(gh(`repos/${repo}/actions/runs?branch=${encodeURIComponent(p.head.ref)}&event=pull_request&per_page=100&page=${page}`))?.workflow_runs ?? [];
    for (const run of got) { const at = timeOf(run.created_at); if (at !== null && at >= from && at <= to) shas.add(run.head_sha); }
    if (got.length < 100) break;
  }
  return shas.size;
}

// The measure of the last `count` merged pull requests into the default branch: { read, pushes (each one's count),
// minutes (each one's, from its turn to its merge) }.
export function measure({ repo, count = COUNT, gh = ghApi }) {
  if (!aRepository(repo)) refuse(`${JSON.stringify(String(repo)).slice(0, 80)} names no repository`, "name it as <owner>/<name>");
  const branch = json(gh(`repos/${repo}`)).default_branch;
  // (those into the default branch are kept before the sample is cut, so the merge before the oldest is one of them)
  const into = p => Number.isSafeInteger(p.number) && p.base?.ref === branch && timeOf(p.merged_at) !== null && typeof p.head?.ref === "string";
  const merged = lastMerged(repo, count + 1, gh, into)
    .sort((a, b) => timeOf(a.merged_at) - timeOf(b.merged_at));
  const pushes = [], minutes = [];
  merged.forEach((p, i) => {
    if (i === 0 && merged.length > count) return;
    const ready = lastReady(repo, p.number, gh) ?? timeOf(p.created_at);
    const turn = Math.max(ready ?? 0, i > 0 ? timeOf(merged[i - 1].merged_at) : 0);
    minutes.push(Math.max(0, (timeOf(p.merged_at) - turn) / 60000));
    pushes.push(pushesRun(repo, p, gh));
  });
  return { read: pushes.length, pushes, minutes };
}

// The state report's line of the measure.
export function line(m) {
  if (!m?.read) return "- the merge line: not read (no merged pull request could be read).";
  const all = m.pushes.reduce((a, b) => a + b, 0), mins = median(m.minutes.map(x => Math.round(x * 10))) / 10;
  return `- the merge line: of the last ${m.read} merged pull requests, ${all} pushes whose checks ran (a median of ${median(m.pushes)} each), and a median of ${mins.toFixed(1)} min from a pull request's turn to its merge, its turn the later of the merge before it and its last marking ready (\`merge-line.mjs --measure\`).`;
}

// Whether a queued run is of the pull requests in `keep`: by the pull requests GitHub names on it, so that a run of
// theirs started after their heads (`heads`) were read is still theirs, or by those heads.
const theirs = (run, keep, heads) => (run.pull_requests ?? []).some(p => keep.includes(p?.number)) || heads.some(h => h.head?.sha === run.head_sha);

// Whether a queued run may be cancelled: a run of a pull request into `branch`, the default branch, and none of the
// front's or the next's, nor of the default branch itself. (A fork's run names no pull request, so none is cancelled.)
const farFromTurn = (run, branch, keep, heads) => ["pull_request", "pull_request_target"].includes(run.event) && run.head_branch !== branch
  && Number.isSafeInteger(run.id) && (run.pull_requests ?? []).some(p => p?.base?.ref === branch) && !theirs(run, keep, heads);

// The runs queued now, page by page.
function queuedRuns(repo, gh) {
  const queued = [];
  for (let page = 1; page <= 10; page++) {
    const got = json(gh(`repos/${repo}/actions/runs?status=queued&per_page=100&page=${page}`))?.workflow_runs ?? [];
    queued.push(...got);
    if (got.length < 100) break;
  }
  return queued;
}

// Point 5: where the line is kept by hand and the front's run stands queued, the queued runs of pull requests into the
// default branch other than `keep` (the front, then the next in line) are cancelled, each of which runs again when its
// pull request is brought up to date in its turn: the lines it prints. Where no up-to-date branch is asked, or the
// host's merge queue keeps the line, it refuses: no turn would run those checks again.
export function cancel({ repo, keep, manifest = null, gh = ghApi }) {
  // (a queue on, as read or as the manifest's row says, stops it either way: a row cannot let it cancel more)
  const f = facts({ repo, manifest, gh });
  if (f.upToDate === false || f.queue === "on" || f.queueRead === "on") refuse(`the line of ${repo} is not kept by hand (${f.upToDate === false ? f.said[0] : "the host's merge queue keeps it"}), so a run cancelled would not run again in a turn`, "cancel nothing: tasks/hosts.md's point 5 has nothing to act on here");
  const branch = f.branch, heads = keep.map(n => json(gh(`repos/${repo}/pulls/${n}`)));
  if (heads[0]?.state !== "open") refuse(`#${keep[0]}, named as the front, is no open pull request`, "name the open pull request at the front of the line first");
  const queued = queuedRuns(repo, gh);
  if (!queued.some(run => theirs(run, keep.slice(0, 1), heads.slice(0, 1)))) return [`The front's run (#${keep[0]}) is not queued: nothing is cancelled.`];
  const out = [];
  for (const run of queued.filter(run => farFromTurn(run, branch, keep, heads))) {
    try { gh("-X", "POST", `repos/${repo}/actions/runs/${run.id}/cancel`); out.push(`cancelled: run ${run.id} (${oneLine(run.name).slice(0, 80)}) on ${oneLine(run.head_branch).slice(0, 80)}`); }
    catch (e) { out.push(`FAIL: run ${run.id} could not be cancelled (${oneLine(e.message).slice(0, 160)}). Mend: where the sign-in may not cancel runs, say so in the report and go on; nothing waits on it`); }
  }
  return out.length ? out : ["The front's run is queued, but no run of another pull request into the default branch is queued: nothing is cancelled."];
}

// The script's run: its exit code, what it prints through `say` (and failures through `warn`), read through `gh`.
// The core's own repository holds no manifest: its slots stand in its AGENTS.md ("the *users get*: `releases`"),
// read as a row of one; null elsewhere.
export function coreOwn(root = ".") {
  const at = name => `${root}/${name}`;
  if (!fs.existsSync(at("scripts/merge-line.mjs")) || !fs.existsSync(at("AGENTS.md"))) return null;
  const m = /the \*users get\*:\s+`(merges|releases)`/u.exec(fs.readFileSync(at("AGENTS.md"), "utf8"));
  return m ? `| *users get* | \`${m[1]}\` |\n` : null;
}

export function main(argv, { gh = ghApi, say = console.log, warn = console.error } = {}) {
  const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const repo = opt("--repo"), count = Number(opt("--count") ?? COUNT), keep = opt("--cancel");
  const usage = "run node core/scripts/merge-line.mjs --repo <owner>/<name>, with --measure [--count <n>] or --cancel <front>[,<next>]";
  if (!aRepository(repo) || !(Number.isInteger(count) && count > 0)) refuse("no repository was named, or the count is no whole number", usage);
  const manifest = fs.existsSync("core-manifest.md") ? fs.readFileSync("core-manifest.md", "utf8") : coreOwn();
  if (argv.includes("--cancel")) {
    const nums = String(keep ?? "").split(",").map(Number);
    if (nums.length > 2 || !nums.every(n => Number.isSafeInteger(n) && n > 0)) refuse("--cancel names no front, or more than the front and the next", usage);
    const out = cancel({ repo, keep: nums, manifest, gh });
    for (const l of out) (l.startsWith("FAIL") ? warn : say)(l);
    return out.some(l => l.startsWith("FAIL")) ? 1 : 0;
  }
  if (argv.includes("--measure")) { say(line(measure({ repo, count, gh }))); return 0; }
  const f = facts({ repo, manifest, gh });
  say([`What ${repo}'s host says of the merge line:`, ...f.said.map(s => `- ${s}`), follows(f)].join("\n"));
  return 0;
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error(e instanceof Refused ? `FAIL: ${e.message}` : `FAIL: GitHub did not answer (${oneLine(e.message).slice(0, 200)}). Mend: run it where gh answers for the repository, or say in the report that it was not read`); process.exitCode = 1; }
}
