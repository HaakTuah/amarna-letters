// The scheduled look's readers of what the host and the registries say (look.mjs): the checks failed on the default
// branch's newest commit (#542), the late review findings (review-marks.mjs; #551) and the packages gone stale
// (held.mjs). Split from look.mjs along what each part reads.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ghApi, pagesOf } from "./labels.mjs";
import { lateBody, lateOf, pullOf, repliersOf } from "./review-marks.mjs";
import { codexFind } from "./review-record.mjs";
import { writersOf } from "./security-review.mjs";
import { plain, TITLES } from "./look-kinds.mjs";

// How far back a late finding is read (tasks/reviews.md, "A late review is still read": the last week), the most pull
// requests whose merge is read for it in one run, and the most pages of the week's review comments read for it.
export const LATE_DAYS = 7, LATE_PULLS = 30, LATE_PAGES = 50;

// The conclusions of a check run that count as failed on the default branch. A cancelled run is left out: a newer merge
// cancels there only a run still waiting, which ran nothing (tasks/tests.md, "The default branch is tested at its newest
// commit"), and a job that ran out of its time fails the core's gate, which is counted; one cancelled by hand is not
// counted yet (#817).
export const FAILED = ["failure", "timed_out", "startup_failure", "action_required"];

// The red issue's body, from the latest check runs of the default branch's newest commit (GitHub's "latest" filter, so
// a job run again and passed counts as passed): each that failed, its name as data and its address where it is
// GitHub's own; null where none failed.
export function redBody(runs, branch) {
  const red = runs.filter(r => r?.status === "completed" && FAILED.includes(r.conclusion));
  if (!red.length) return null;
  const sha = String(red[0].head_sha ?? "");
  const at = /^[0-9a-f]{40}$/u.test(sha) ? `, \`${sha.slice(0, 7)}\`` : "";
  const link = r => (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:actions\/runs\/\d+\/job\/\d+|runs\/\d+)$/u.test(String(r.html_url ?? "")) ? ` (${r.html_url})` : "");
  return [`Checks failed on the newest commit of \`${plain(branch).replace(/`/g, "'")}\`${at} (\`core/scripts/look.mjs\`). Each has an owner, who reads its mend and runs it again once where the mend says so, as \`core/tasks/tests.md\`, "A check that fails on the default branch has an owner", says. This closes once none of that branch's newest commit has failed.`,
    "", ...red.map(r => `- \`${plain(r.name).replace(/`/g, "'")}\`: ${r.conclusion}${link(r)}.`)].join("\n");
}

// The checks failed on the default branch's newest commit, through `add`, or why they could not be read.
export function redFinding(repo, add) {
  try {
    const branch = JSON.parse(ghApi(`repos/${repo}`)).default_branch;
    if (typeof branch !== "string" || !branch) throw new Error("no default branch");
    add(TITLES.red, redBody(pagesOf(`repos/${repo}/commits/${encodeURIComponent(branch)}/check-runs`, (...a) => JSON.stringify(JSON.parse(ghApi(...a)).check_runs ?? [])), branch));
  } catch {
    add(TITLES.red, null, `the default branch's checks could not be read: the token here may not read them. A project's daily job reads them where it calls the core's \`look.yml\` with \`checks: read\`, as \`core/setup/template/workflows/look.yml.tmpl\` has it`);
  }
}

// The packages the project holds that have gone stale (held.mjs's --issue): its body, null where none has, or unread
// where they could not be looked up.
export function staleFinding(run = () => spawnSync(process.execPath, [fileURLToPath(new URL("./held.mjs", import.meta.url)), "--issue"], { encoding: "utf8", timeout: 180000, maxBuffer: 1 << 24 })) {
  const r = run();
  if (r.status === 0) return { title: TITLES.stale, what: r.stdout.trim() || null, unread: null };
  return { title: TITLES.stale, what: null, unread: "the packages the project holds could not be looked up in their registries this time" };
}

// The late findings, through `add` (review-marks.mjs; #551): Codex's findings of the last LATE_DAYS days made after
// their pull request merged with no reply, or why they could not be read; `gh` in ghApi's form. Only the pull requests
// that hold a finding of Codex's are looked up, the newest first, and what is past LATE_PULLS or LATE_PAGES is said to be
// unread, never dropped: with nothing found, the issue is left as it stands. The comments are read newest first, so a
// reply, always newer than its finding, is read before it past the cap. The rights of at most LATE_PULLS accounts that
// replied are read; a reply of any other counts as none, and that too is said.
export function lateFinding(repo, add, at, gh = ghApi) {
  try {
    const since = new Date(Date.parse(at) - LATE_DAYS * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");
    let pages = 0;
    const inline = pagesOf(`repos/${repo}/pulls/comments?sort=created&direction=desc&since=${since}`, route => (++pages > LATE_PAGES ? "[]" : gh(route)));
    const all = [...new Set(inline.filter(c => codexFind(c)).map(pullOf).filter(Number.isInteger))].sort((a, b) => b - a);
    const merged = new Map(all.slice(0, LATE_PULLS).map(n => [n, JSON.parse(gh(`repos/${repo}/pulls/${n}`)).merged_at ?? null]).filter(([, m]) => typeof m === "string"));
    const left = [pages > LATE_PAGES && `the review comments past the first ${LATE_PAGES * 100} of the week`, all.length > LATE_PULLS && `Codex's findings on ${all.length - LATE_PULLS} older pull requests`].filter(Boolean);
    // a reply answers a finding only where the host says its author may write: a right not read, or past LATE_PULLS
    // accounts, counts as none, so its finding stays listed, and is said
    const repliers = repliersOf(inline), rights = [], unknown = repliers.slice(LATE_PULLS);
    for (const login of repliers.slice(0, LATE_PULLS)) { try { rights.push(JSON.parse(gh(`repos/${repo}/collaborators/${login}/permission`))); } catch { unknown.push(login); } }
    if (unknown.length) left.push(`the rights of ${unknown.length} account${unknown.length === 1 ? "" : "s"} that replied, whose replies are counted as none`);
    const body = lateBody(lateOf(inline, merged, since, writersOf(rights)));
    if (left.length === 0) return add(TITLES.late, body);
    if (body === null) return add(TITLES.late, null, `${left.join(" and ")} could not be read this run`);
    add(TITLES.late, `${body}\n\nNot read this run: ${left.join("; ")}.`);
  } catch {
    add(TITLES.late, null, "the review comments could not be read: the token here may not read pull requests");
  }
}
