// What the reviews find, beside what the core costs (AGENTS.md of the core, "The core is measured as a feature is"):
// run in a project's clone, it reads the pull requests merged into the default branch as core-cost.mjs does (sync,
// upkeep, update, own) and, from GitHub (gh, page by page), every comment on the repository's issues and pull requests
// and the issues labelled `bug`, and counts for each kind of pull request, in five reviews, which got the review, in how
// many it blocked, how many blocking points it raised and how many other points:
//   Codex's code review      its own account (`chatgpt-codex-connector[bot]`, a Bot): a top-level inline comment with a
//                            P-badge and no security marker is a find; P0 and P1 block (roles/shared/review-guidelines.md),
//                            P2 and P3 count as other points; it ran where its summary (scripts/security-review.mjs
//                            `codexState`; perPull, review-comments.mjs) says completed, or a receipt or a find of it is there
//   Codex's security review  the same, for the finds that open with its security marker
//   posted reviews           comments of the owner's account (--owner, else the repository's account: floor rule 4)
//                            whose first line opens "Security review:", "Code review:" or "Design check:"; a security
//                            review posted is the second one, beside Codex's. Its points are read only from the lines
//                            of its form (tasks/reviews.md, "What a posted review declares"; #299): the blocking ones
//                            from a line that opens with "Blocking findings: N." (N points), or "No blocking finding.",
//                            "No finding.", "Nothing blocks." or "Blocking: none." (none), the others from one that
//                            opens with "Other findings: M." or "No other finding." ("No finding." too), with or
//                            without ** round it; a comment without the line, or whose lines disagree, is not read for
//                            it, and is never counted as none. A "Security review: none needed" is a note, not a review.
//                            A posted code review is counted again by its stance, from a line "Stance: adversarial." or
//                            "Stance: regular." (stanceOf, review-comments.mjs; #397), and one with neither in neither row.
// A review that was not read is said so ("not read"); it is never added as a zero. It also lists the pull requests whose
// second security review blocked where Codex's own found no blocking point, and counts the bugs that reached `main`
// all the same: a bug counts against a pull request only where the owner's account filed it, and a line "Brought in by:
// #N" (the bug form's last line) stands in its body or in a comment of the owner's account (the newest wins), N is a
// pull request that was read and merged before the bug was filed; any other bug is not read, never none. No prose is
// guessed at. It lists each rule the findings of two pull requests or more name, on their line "Rule:" (rulesNamed,
// review-comments.mjs). Last it counts the rounds of review each pull request took (#477; review-rounds.mjs, beside this file), from
// the head each review was asked or posted on (reviewEvents, review-comments.mjs) and the pull request's commits, read for those it
// counts, the last 30 merged and, given --since, the 30 merged before it, and how often the host's checks failed on a
// head of the last 30 counted that was then changed (#900; review-checks.mjs, beside this file). It reads; it writes nothing and changes
// nothing. Git, gh and Node's own modules.
//
//   node core/scripts/review-record.mjs [--since YYYY-MM-DD] [--owner login]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DAY, grid, mergedPulls, repoOf, rulesFor } from "./core-cost.mjs";
import { broughtBy, perPull, reviewEvents, ruleOf, rulesNamed } from "./review-comments.mjs";
import { checksLines, checksRead, runsReader } from "./review-checks.mjs";
import { roundsLines, roundsOf, wanted } from "./review-rounds.mjs";
import { started } from "./started.mjs";
import { ROOT, rules, rulesOf } from "./rules.mjs";
import { pages } from "./stand-in-record.mjs";

// (how a comment is read as a review stands in review-comments.mjs; the names stay importable from here)
export { blockingOf, broughtBy, codexFind, otherOf, perPull, postedKind, reviewEvents, ruleOf, rulesIn, rulesNamed, scoreOf, stanceOf } from "./review-comments.mjs";

export const REVIEWS = [
  ["codexCode", "Codex's code review"], ["postedCode", "Code review posted (the next reviewer's or the fallback's)"],
  ["postedAdversarial", "of those, its stance adversarial"], ["postedRegular", "of those, its stance regular"],
  ["codexSecurity", "Codex's security review"], ["postedSecurity", "Security review posted (the second)"],
  ["postedDesign", "Design check posted"],
];
export const KINDS = ["own", "upkeep", "sync", "update"];

// The rules the findings of two pull requests or more name, from `pulls` as { number, when, rules } (rulesNamed's
// answer), each as { rule, pulls }, the most named first: those alone that a pull request merged on or after `since`
// (a day, YYYY-MM-DD) named, where one is given, so that a month's report lists only what came up again in it.
export function foundTwice(pulls, since = null) {
  const by = new Map(), from = since ? Date.parse(`${since}T00:00:00Z`) : null;
  for (const p of pulls) for (const rule of new Set(p.rules ?? [])) by.set(rule, [...(by.get(rule) ?? []), p]);
  return [...by].filter(([, ps]) => ps.length > 1 && (from === null || ps.some(p => Date.parse(p.when) >= from)))
    .map(([rule, ps]) => ({ rule, pulls: ps.map(p => p.number).sort((a, b) => a - b) }))
    .sort((a, b) => b.pulls.length - a.pulls.length || a.rule.localeCompare(b.rule));
}

// The rules that stand, keyed as ruleOf keys a finding's line: those of the floor, the roles and the modules of the core
// at `core` (rules.mjs), and those of the AGENTS.md and SECURITY.md at the root of the project at `project`, its own;
// null where they cannot be read.
export function standing(core = ROOT, project = process.cwd()) {
  try {
    const own = ["AGENTS.md", "SECURITY.md"].filter(f => fs.existsSync(path.join(project, f)))
      .flatMap(f => rulesOf(f, fs.readFileSync(path.join(project, f), "utf8")));
    return new Set([...rules(core), ...own].map(r => ruleOf(r.key)));
  } catch { return null; }
}

// The counts by review and by kind of pull request, from `pulls` as { number, kind, reviews } (perPull's answer).
export function tally(pulls) {
  const t = {};
  for (const [key] of REVIEWS) {
    t[key] = Object.fromEntries(KINDS.map(k => [k, { merged: 0, got: 0, blocked: 0, unread: 0, points: 0, other: 0, otherUnread: 0 }]));
    for (const p of pulls) {
      const row = t[key][p.kind], r = p.reviews[key];
      row.merged++;
      if (!r.got) continue;
      row.got++;
      if (r.blocked === "yes") row.blocked++;
      if (r.blocked === "unread") row.unread++;
      if (r.otherUnread) row.otherUnread++;
      row.points += r.points; row.other += r.other;
    }
  }
  return t;
}

// The pull requests whose second security review blocked where Codex's read no blocking point (it ran, and was read).
export const secondFound = pulls => pulls.filter(p => p.reviews.codexSecurity.blocked === "no" && p.reviews.postedSecurity.blocked === "yes").map(p => p.number);

// The bugs, given as { number, at, login, body } with the owner's comments on any issue as { issue, at, login, body }:
// how many the owner's account filed, which of them are tied to a merged pull request (the newest "Brought in by" of the
// bug's body and the owner's comments on it, naming a pull request that merged, `merged`: Map of number to
// { when, kind }, before the bug was filed), by the kind of that pull request, how many of the rest have no such line
// (`unlined`) and how many name no pull request read that merged before (`unmatched`), and how many other accounts filed;
// `byPull`, the bugs tied to each pull request, by its number.
export function bugs(list, comments, merged, owner) {
  const same = login => String(login ?? "").toLowerCase() === owner.toLowerCase();
  const out = { filed: 0, tied: 0, byKind: Object.fromEntries(KINDS.map(k => [k, 0])), byPull: new Map(), unlined: 0, unmatched: 0, others: 0 };
  for (const b of list) {
    if (!same(b.login)) { out.others++; continue; }
    out.filed++;
    const named = [{ at: b.at, n: broughtBy(b.body) }, ...comments.filter(c => String(c.issue) === String(b.number) && same(c.login)).map(c => ({ at: c.at, n: broughtBy(c.body) }))]
      .filter(x => x.n !== null).sort((a, c) => String(a.at).localeCompare(String(c.at))).at(-1);
    if (!named) { out.unlined++; continue; }
    const pull = merged.get(named.n);
    if (!pull || !(Date.parse(pull.when) < Date.parse(b.at))) { out.unmatched++; continue; }
    out.tied++; out.byKind[pull.kind]++; out.byPull.set(named.n, (out.byPull.get(named.n) ?? 0) + 1);
  }
  return out;
}

// The part on what was found twice: each rule that stands which two pull requests' findings name, and apart those that
// are no rule that stands (known as print takes it).
function twiceLines(pulls, since, twice, known) {
  const naming = pulls.filter(p => p.rules?.length).length;
  const stands = twice.filter(f => known?.has(f.rule)), not = twice.filter(f => !known?.has(f.rule));
  const listed = fs => fs.map(f => `- ${f.rule}: ${f.pulls.map(n => `#${n}`).join(", ")}`);
  return [`Found twice, a rule that stands which the findings of two pull requests or more name${since ? `, one of them merged from ${since}` : ""}: ${stands.length}${stands.length ? "" : " (none)"}`,
    ...listed(stands),
    ...(not.length ? [`Named twice but no rule that stands${known ? "" : " (the rules could not be read)"}, so no issue is filed for it: ${not.length}`, ...listed(not)] : []),
    `A finding names its rule on a line \"Rule: <file>: <bold lead>\" (the core's tasks/reviews.md, point 8); one without it names none. Of the ${pulls.length} pull requests read, ${naming} have a finding that names one.`];
}

// `known`: the rules that stand, as ruleOf keys them (standing, below), or null where they were not read; a rule found
// twice that is none of them is listed apart, for no issue is filed for it.
export function print(repo, since, pulls, t, bug, twice = [], known = null) {
  const count = k => pulls.filter(p => p.kind === k).length;
  const out = [`The reviews in ${repo}, ${since ? `from ${since}` : "from the first merge read"}: ${pulls.length} merged pull requests (${KINDS.map(k => `${k} ${count(k)}`).join(", ")})`];
  out.push("A point blocks where it is P0 or P1 (Codex) or declared in the form read (a posted review); a posted review in any other wording is \"not read\", never none, and so for its other points.");
  for (const [key, name] of REVIEWS) {
    const rows = KINDS.map(k => [k, t[key][k]]);
    const got = rows.reduce((s, [, r]) => s + r.got, 0);
    out.push("", got ? name : `${name}: on no pull request read`);
    if (!got) continue;
    const codex = key.startsWith("codex");
    out.push(grid([["", "merged", "got it", "blocked", "not read", "blocking points", "other points", ...(codex ? [] : ["other not read"])],
      ...rows.map(([k, r]) => [k, ...(r.merged ? [r.merged, r.got, r.blocked, r.unread, r.points, r.other, ...(codex ? [] : [r.otherUnread])].map(String) : Array(codex ? 6 : 7).fill("-"))])]));
  }
  const second = secondFound(pulls);
  out.push("", `Second security review blocked where Codex's read no blocking point: ${second.length}${second.length ? ` (${second.map(n => `#${n}`).join(", ")})` : ""}`);
  out.push(`Bugs filed by the owner's account: ${bug.filed}; tied to a pull request that merged before: ${bug.tied}${bug.tied ? ` (${KINDS.filter(k => bug.byKind[k]).map(k => `${k} ${bug.byKind[k]}`).join(", ")})` : ""}; not read: ${bug.unlined + bug.unmatched}`
    + (bug.unmatched ? ` (no line ${bug.unlined}, a line naming no pull request read that merged before it ${bug.unmatched})` : "")
    + (bug.others ? `; filed by other accounts, left out: ${bug.others}` : ""));
  out.push("A bug is tied by a line \"Brought in by: #N\", alone on its line, in its body or in a comment of the owner's account; one without it is not read, never none.");
  out.push("", ...twiceLines(pulls, since, twice, known));
  return out.join("\n");
}

// What the record reads, from the clone it is run in and from GitHub (gh): `all` the merged pull requests, `merged`
// those from `since` on, the comments, the bugs filed from `since` on, `of` a pull request's comments and owner for
// perPull and its kin, and `commitsOf` its commits (null where they cannot be read). `fail` is called with what went wrong.
export function gather(since, by, fail) {
  let rules;
  try { process.chdir(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()); rules = rulesFor(repoOf()); } catch (e) { fail(`run it in a project that takes the core: ${e.message.split("\n")[0]}`); }
  let repo, all;
  try { ({ repo, merged: all } = mergedPulls(rules)); } catch (e) { fail(e.message); }
  if (!repo) fail("the repository is not known (GITHUB_REPOSITORY, or origin's address)");
  // (every merge is read for what was found twice, the first time often before --since; the counts read those from it)
  const merged = since ? all.filter(m => Date.parse(m.when) >= Date.parse(`${since}T00:00:00Z`)) : all;
  if (!merged.length) fail("no merged pull request found on the default branch's first-parent line");
  const owner = by ?? repo.split("/")[0];
  const issueComments = pages(`repos/${repo}/issues/comments?sort=created&direction=asc`,
    ".[] | {issue: (.issue_url | split(\"/\") | last | tonumber), created_at, at: .created_at, updated_at, login: .user.login, user: {login: .user.login, type: .user.type}, body} | @json");
  const inline = pages(`repos/${repo}/pulls/comments?sort=created&direction=asc`,
    ".[] | {pull: (.pull_request_url | split(\"/\") | last | tonumber), in_reply_to_id, at: .created_at, commit_id, original_commit_id, user: {login: .user.login, type: .user.type}, body} | @json");
  const labelled = pages(`repos/${repo}/issues?state=all&labels=bug`,
    ".[] | {number, at: .created_at, login: .user.login, body, pull: (.pull_request != null)} | @json").filter(b => !b.pull); // (pull requests are taken out after paging, so that a page's length is still GitHub's own)
  const issues = labelled.filter(b => !since || b.at >= `${since}T00:00:00Z`);
  const of = m => [issueComments.filter(c => c.issue === m.number), inline.filter(c => c.pull === m.number), owner];
  const commitsOf = n => { try { return pages(`repos/${repo}/pulls/${n}/commits?`, ".[] | {sha, at: .commit.committer.date, parents: [.parents[] | {sha}]} | @json"); } catch { return null; } };
  const runsOf = runsReader(repo, pages);
  return { repo, all, merged, owner, issueComments, inline, issues, labelled, of, commitsOf, runsOf };
}

function main(args) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const value = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
  const since = value("--since"), by = value("--owner");
  if (args.includes("--since") && !DAY.test(since ?? "")) fail("--since takes a day, YYYY-MM-DD");
  if (args.includes("--owner") && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(by ?? "")) fail("--owner needs the owner's account after it");
  const { repo, all, merged, owner, issueComments, issues, of, commitsOf, runsOf } = gather(since, by, fail);
  const named = new Map(all.map(m => [m.number, rulesNamed(...of(m))]));
  const pulls = merged.map(m => ({ number: m.number, kind: m.kind, reviews: perPull(...of(m)), rules: named.get(m.number) }));
  const t = tally(pulls);
  const bug = bugs(issues, issueComments, new Map(merged.map(m => [m.number, m])), owner);
  const twice = foundTwice(all.map(m => ({ number: m.number, when: m.when, rules: named.get(m.number) })), since);
  console.log(print(repo, since, pulls, t, bug, twice, standing()));
  const want = wanted(merged, all, since);
  const commits = new Map(all.filter(m => want.has(m.number)).map(m => [m.number, commitsOf(m.number)]));
  const rounds = new Map(all.filter(m => want.has(m.number)).map(m => [m.number, commits.get(m.number) && roundsOf(reviewEvents(...of(m)), commits.get(m.number))]));
  console.log(`\n${roundsLines(merged, all, since, rounds)}`);
  console.log(checksLines(checksRead(merged, commits, runsOf), KINDS));
}

if (started(import.meta.url)) main(process.argv.slice(2));
