// How often the host's checks sent a pull request's work back (#900; the count of the stages of #397), which
// review-record.mjs, beside this file, prints after the reviews' counts: of the commits of a merged pull request that
// the host's checks ran on, how many ended with a check that failed and were then changed (a later commit followed
// them), read from the host's check runs of each commit (the newest run of each check: a re-run that passed stands).
// A check run that failed, timed out or did not start is a failure; one cancelled (a push that supersedes a run
// cancels it), skipped, neutral or still running is not. A commit that no check ran on (pushed together with a later
// one) is no head and is not counted, and a pull request whose commits or check runs could not be read is "not read",
// never none. Only check runs are read: the reviews' commit statuses are no check of the host's, but a check run of a
// workflow that runs a review is counted like any other. It is a count, read at the reviews of the core the owner asks for and at the pruning of the rules:
// nothing fails or waits for it. Node's own modules.
import { grid } from "./core-cost.mjs";
import { LAST } from "./review-rounds.mjs";

const FAILED = new Set(["failure", "timed_out", "startup_failure"]);

// Whether any of the check runs `runs` (as GitHub gives them: { conclusion }) failed.
export const failedOn = runs => runs.some(r => FAILED.has(r?.conclusion));

// A commit's check runs as `runsOf` of checksOn takes it, read of `repo` by `pages` (stand-in-record.mjs: gh, page by page),
// the newest run of each check, each as { conclusion }; null where GitHub does not answer.
export const runsReader = (repo, pages) => sha => {
  try { return pages(`repos/${repo}/commits/${sha}/check-runs?filter=latest`, ".check_runs[] | {conclusion} | @json"); } catch { return null; }
};

// The commit of a pull request that no other of its commits has as a parent, its head; the last of `commits` where that
// leaves none or more than one. `commits`: { sha, parents: [{ sha }] }.
export function headOf(commits) {
  const parents = new Set(commits.flatMap(c => (c.parents ?? []).map(p => p.sha)));
  const tips = commits.filter(c => !parents.has(c.sha));
  return (tips.length === 1 ? tips[0] : commits.at(-1))?.sha ?? null;
}

// What the host's checks did on one pull request: { heads, failed }, heads the commits other than its last that a check
// ran on, failed those of them with a failed check; null where its commits, or the check runs of one of them, could not
// be read. `runsOf(sha)`: that commit's check runs, or null where they cannot be read.
export function checksOn(commits, runsOf) {
  if (!commits) return null;
  const head = headOf(commits);
  let heads = 0, failed = 0;
  for (const c of commits) {
    if (c.sha === head) continue;
    const runs = runsOf(c.sha);
    if (!runs) return null;
    if (!runs.length) continue;
    heads++;
    if (failedOn(runs)) failed++;
  }
  return { heads, failed };
}

// The pull requests whose checks are read, as tally takes them: the last LAST of `merged` (the pull requests counted,
// newest first, as { number, kind }) alone, since each commit of each is a call to GitHub; `commits`: a Map of a pull
// request's number to its commits (null where they cannot be read).
export const checksRead = (merged, commits, runsOf) => merged.slice(0, LAST).map(m => ({ kind: m.kind, checks: checksOn(commits.get(m.number), runsOf) }));

// The counts by kind of pull request, from `pulls` as { kind, checks } (checksOn's answer): the pull requests read, the
// heads their checks ran on, the heads that failed and were then changed, the pull requests with one such head (sent
// back), and those not read.
export function tally(pulls, kinds) {
  const t = Object.fromEntries(kinds.map(k => [k, { merged: 0, read: 0, heads: 0, failed: 0, sent: 0 }]));
  for (const p of pulls) {
    const row = t[p.kind];
    row.merged++;
    if (!p.checks) continue;
    row.read++; row.heads += p.checks.heads; row.failed += p.checks.failed;
    if (p.checks.failed) row.sent++;
  }
  return t;
}

// The lines review-record.mjs prints: `pulls` as tally takes them, `kinds` the kinds in the order they print.
export function checksLines(pulls, kinds) {
  const t = tally(pulls, kinds), rows = kinds.map(k => [k, t[k]]);
  const sum = key => rows.reduce((s, [, r]) => s + r[key], 0);
  const out = ["", `The host's checks: of the commits of the ${pulls.length} merged pull requests counted that a check ran on and that were then changed, how many ended with a check that failed (failed, timed out or did not start; the newest run of each check), read from each commit's check runs. A pull request whose commits or check runs could not be read is "not read", never none. A count: nothing fails or waits for it.`];
  if (!sum("read")) return [...out, "Read on no pull request."].join("\n");
  out.push(grid([["", "merged", "read", "not read", "heads checked", "heads failed", "sent back"],
    ...rows.map(([k, r]) => [k, ...(r.merged ? [r.merged, r.read, r.merged - r.read, r.heads, r.failed, r.sent].map(String) : Array(6).fill("-"))])]));
  out.push(`Sent back by the host's checks: ${sum("sent")} of the ${sum("read")} pull requests read (${sum("failed")} heads failed of ${sum("heads")} checked).`);
  return out.join("\n");
}
