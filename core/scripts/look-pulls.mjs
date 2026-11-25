// The scheduled look's readers of the pull requests (look.mjs, which calls idleFinding): those that stand idle, with
// their checks, and the work standing still (stalled.mjs; #471). Split from look.mjs along what each part reads, so that
// whoever changes the one reads not the others.

import fs from "node:fs";
import { goesOn, handedOff, HOURS, NOTICE, openPulls, stalled, standingStill } from "./stalled.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { WAITS, waitsOn } from "./pr-description.mjs";
import { copyOf, readCore } from "./core-path.mjs";
import { parseBounded } from "./guards.mjs";
import { fileAt, statesOf, unplaced } from "./queue.mjs";
import { writersOf } from "./security-review.mjs";
import { plain, TITLES } from "./look-kinds.mjs";

// A pull request's checks, from its head commit's check runs and its combined commit status (the reviews' statuses,
// security-review and code-review among them) as GitHub gives them: green where every one ended well, red where one
// failed, waiting while one runs or a status is pending, none where there are none.
export function checksOf(runs, status = null) {
  // (a status whose count is no whole number, text "1" among them, is not read, and so never counted green)
  if (status !== null && !(Number.isSafeInteger(status?.total_count) && status.total_count >= 0)) return "not read (the commit's status is not in GitHub's form)";
  const states = status && status.total_count > 0 ? [status.state] : [];
  if (!runs.length && !states.length) return "none";
  if (runs.some(r => ["failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"].includes(r.conclusion)) || states.some(s => s === "failure" || s === "error")) return "red";
  if (runs.some(r => r.status !== "completed") || states.includes("pending")) return "waiting";
  return "green";
}

// The idle list: `lanes` as stalled() gives them, each with `checks`. Drafts with green checks first, then the rest,
// longest idle first; each line says draft or ready, its checks, what it waits on and for how long, and where its
// line and the label needs-owner disagree, that mend; and where its description holds no hand-off note
// (tasks/tools.md, "A change of tool loses nothing"; #306), that it has none.
export function idleBody(lanes, hours) {
  const first = l => (l.draft && l.checks === "green" ? 0 : 1);
  const sorted = [...lanes].sort((a, b) => first(a) - first(b) || b.waited - a.waited);
  return [`Every open pull request of this repository's own branches with no push for over ${hours} h (\`core/scripts/look.mjs\`). A draft with green checks is named first: it is the shape of a session that finished and stopped. Each is a task an agent takes alone: the lane goes on, is handed to a fresh builder from its branch, or, where it waits on the owner, waits with its question asked.`,
    "",
    ...sorted.map(l => {
      const w = waitsOn(l.body);
      // (a description's words as a code span, so they read as data and name no one)
      const quoted = text => `\`${plain(text).replace(/`/g, "'")}\``;
      const says = w ? (w.kind ? `waits on ${quoted(w.said)}` : `its line ${quoted(`${WAITS} ${w.said}`)} is in none of the forms`) : `says nothing of what it waits on`;
      const owner = w?.kind === "the owner", labelled = (l.labels ?? []).includes("needs-owner");
      const mend = owner && !labelled ? "; to label needs-owner" : !owner && labelled ? "; to take needs-owner off, or say the owner's question in its line" : "";
      return `- #${l.number} (${l.draft ? "draft" : "ready"}, checks ${l.checks}): ${says}; ${l.waited.toFixed(1)} h since its last push${handedOff(l.body) ? "" : "; no hand-off note"}${mend}.`;
    })].join("\n");
}

// The titles of the open notices that count, of `opened` ({ title, login }, as the search gives them): those the
// owner's account opened, and in a team those of another owner, an account the host lets write (roles/shared/teams.md),
// its right read through `right(login)` as the security-review check reads one (writersOf), at most NOTICE_LOGINS
// accounts; a right not read counts as none, so the look errs toward reporting, never toward silence.
export const NOTICE_LOGINS = 5;
export function noticesOf(opened, owner, right) {
  const mine = String(owner).toLowerCase(), rights = [];
  const logins = [...new Set(opened.map(i => String(i?.login ?? "").toLowerCase()).filter(l => l && l !== mine && /^[a-z0-9-]{1,39}$/u.test(l)))];
  for (const login of logins.slice(0, NOTICE_LOGINS)) { try { rights.push(right(login)); } catch { /* counted as none */ } }
  const writers = writersOf(rights);
  return opened.filter(i => { const l = String(i?.login ?? "").toLowerCase(); return l === mine || writers.has(l); }).map(i => String(i.title));
}

// The work standing still (stalled.mjs's standingStill; #471), through `add`. Read cheapest first, each costlier
// reading only once the one before leaves the question open: the open pull requests' pushes, the default branch's
// newest commit (a merge is work going on), the progress file the manifest's slot names (the core's QUEUE.md here),
// placed and read as queue.mjs's own reader takes it, a plain Markdown file inside the project, no larger than it reads
// (SECURITY.md, rule 5), then the open issues titled as the orchestrator's notice that `owner`'s account opened (anyone
// may open an issue in a public repository, and only an owner's, as the orchestrator posts, says why work waits:
// noticesOf),
// and last which issues are open. `gh` as ghApi gives it; `read` the text of the file placed.
export function stillFinding({ repo, manifest, owner, pulls, now = Date.now(), gh = ghApi, read = f => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "") }, add) {
  try {
    if (goesOn({ pulls, now })) return add(TITLES.still, null);
    const latest = gh(`repos/${repo}/commits?per_page=1`, "--jq", ".[0].commit.committer.date").trim();
    if (goesOn({ pulls, latest, now })) return add(TITLES.still, null);
    const copy = manifest === null ? "" : copyOf(), file = fileAt(manifest, [], manifest === null ? "core/" : readCore(manifest).library ?? copy), wrong = unplaced(copy, file);
    if (wrong) return add(TITLES.still, null, `the progress file was not read: ${wrong.replace(/^FAIL: /u, "")}`);
    const queue = read(file);
    if (!queue.trim()) return add(TITLES.still, null);
    const opened = parseBounded(gh(`search/issues?q=${encodeURIComponent(`repo:${repo} is:issue is:open in:title "${NOTICE}"`)}`, "--jq", "[.items[] | {title, login: .user.login}]"));
    const notices = noticesOf(opened, owner, login => parseBounded(gh(`repos/${repo}/collaborators/${login}/permission`)));
    if (notices.some(t => t.startsWith(NOTICE))) return add(TITLES.still, null);
    const free = standingStill({ queue, closed: statesOf(repo, route => gh(route)), pulls, notices, now, latest });
    add(TITLES.still, free ? `The *progress file* (\`${file}\`) holds a line a session could take (${free.map(n => `#${n}`).join(", ")}, the first that waits on nothing open), no pull request of this repository's own was pushed in the last day, nothing reached the default branch in it, and no issue titled "${NOTICE}" from the owner's account is open. Where builders are held back for usage, the orchestrator opens that issue, saying what is left, when the window opens again, which lines wait and the words that change it (\`roles/orchestrator.md\`, "Never held back in silence"); otherwise start a builder on that line. Close this issue once work goes on.` : null);
  } catch {
    add(TITLES.still, null, "the default branch, the progress file or the open issues could not be read");
  }
}

// The idle pull requests, through `add`: each lane with its checks, or why the pull requests could not be read; and
// the work standing still, from the same pull requests.
export function idleFinding(repo, add, manifest = null, owner = "") {
  try {
    const api = (route, jq) => ghApi(route, "--jq", jq);
    const pulls = openPulls(repo, api), lanes = stalled(pulls, Date.now(), HOURS);
    stillFinding({ repo, manifest, owner, pulls }, add);
    for (const l of lanes) {
      try { l.checks = checksOf(pagesOf(`repos/${repo}/commits/${l.sha}/check-runs`, (...a) => JSON.stringify(JSON.parse(ghApi(...a)).check_runs ?? [])), JSON.parse(ghApi(`repos/${repo}/commits/${l.sha}/status`))); }
      catch { l.checks = "not read (the token may not read checks and statuses)"; }
    }
    add(TITLES.idle, lanes.length ? idleBody(lanes, HOURS) : null);
  } catch {
    add(TITLES.idle, null, `the open pull requests could not be read: the token here may not read them. A project's daily job reads them where it calls the core's \`look.yml\` with \`pull-requests: read\`, \`checks: read\` and \`statuses: read\`, as \`core/setup/template/workflows/look.yml.tmpl\` has it`);
  }
}
