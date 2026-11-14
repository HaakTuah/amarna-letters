#!/usr/bin/env node
// Has this pull request's security review run (floor rule 8, and what modules/reviews.md, point 3, adds: a security
// review that starts by itself is waited for on every pull request)? Run by the core's workflow security-review.yml,
// always from the default branch's copy, on what GitHub's own API gives of the pull request and its comments. It takes
// two things as proof: the summary Codex's own app keeps on the pull request (its login and kind are GitHub's, which no
// one else can post under), saying its security review is completed; or a comment that opens "Security review:" from
// the repository's owner, a member or a collaborator, which is how another reviewer's, or the fallback reviewer's, is
// posted (modules/reviews.md, point 3). Where Codex's summary says a finding of its security review is open, the check
// waits until such a comment is posted after Codex's newest security finding: the fallback reviewer's check of the fix
// (Codex's own mark of an open finding does not clear by itself once the finding is fixed). Where the mark stands and
// no finding of Codex's is to be found among the comments, such a comment settles it whenever it was posted.
// Dependabot's own pull request (opened by it from a branch of the repository, every commit of it written by Dependabot
// and signed by GitHub, so that one somebody else has pushed to, or brought up to date by a merge, is its own no
// longer) passes where no review of Codex's has begun on it: floor rule 17 holds it (with a branch of the repository,
// its status is written when the first comment that counts arrives, which is Codex's summary once the code review rule
// 17 asks for is asked). A pull request that needs no security review and gets none by itself says so in a comment of
// that kind, which its code reviewer checks (modules/reviews.md, point 3); the status then says a review is posted, and
// cannot tell that note from a review. Nothing else on the pull request counts: not its description, not a comment of
// anyone else, not a review's own text. What it does not hold: what a posted review says, whether a finding is
// blocking, and that a later commit which changes what the review was for got its check; those stay with the builder
// and the reviews. It prints, as JSON, the commit to mark and the status to give it, or {} for a pull request that is
// closed or a draft. While "advisory" (the workflow's input, on unless turned off) the status is always a pass that
// says what the check would have done, so a week of pull requests shows whether it is right before anything waits for
// it.
//
// Usage:  node scripts/security-review.mjs <the pull request, as GitHub's API gives it> <its comments, the same>
//           [<its review comments, the same> [<its commits, the same>]]
//         ADVISORY=false for a status that waits; RUN_URL for the link the status carries.
import { readFileSync } from "node:fs";
import { started } from "./started.mjs";

const CODEX = "chatgpt-codex-connector[bot]";
const DEPENDABOT = "dependabot[bot]";
// the first two lines of the summary Codex's app keeps: the second is its state, as JSON (GitHub's API gives its braces
// as they are; one written as &#123; or &#125;, as a delivery may show it, is read as one too)
const SUMMARY = /^<!-- codex-pull-request-review-summary -->\r?\n<!-- codex-review-state:v1 ([^\r\n]{1,4000}) -->\r?\n/u;
const WRITERS = ["OWNER", "MEMBER", "COLLABORATOR"]; // GitHub's own word for who wrote a comment, not the comment's
const POSTED = /^(?:\*\*)?Security review:/u;
const FINDING = /^<!-- codex-security-review-finding:v1 -->/u; // how a finding of Codex's security review opens
const SHA = /^[0-9a-f]{40}$/u;
export const CONTEXT = "security-review";

const flat = (pages) => (Array.isArray(pages) ? pages.flat() : []).filter((entry) => entry !== null && typeof entry === "object");
const codexs = (comment) => comment.user?.login === CODEX && comment.user.type === "Bot" && typeof comment.body === "string";
const newest = (times) => times.reduce((latest, at) => (at > latest ? at : latest), -Infinity); // -Infinity: none

// what the summary Codex's app keeps says of its security review: { review }, review undefined where there is none it
// can read, and { unread: true } where a summary of Codex's is there but its state cannot be read, a form nobody
// documents having changed (core archive 201). The app keeps one summary and edits it, so the first comment of its that
// opens as one is read, never a later look-alike.
const OPENS = /^<!-- codex-pull-request-review-summary -->/u;
function codex(comments) {
  for (const comment of comments) {
    if (!codexs(comment) || !OPENS.test(comment.body)) continue;
    const text = SUMMARY.exec(comment.body)?.[1];
    let state;
    try { state = text === undefined ? undefined : JSON.parse(text.replaceAll("&#123;", "{").replaceAll("&#125;", "}")); } catch { state = undefined; }
    if (state === null || typeof state !== "object" || !("security_review" in state)) return { unread: true };
    return { review: state.security_review };
  }
  return {};
}
// what the check says where Codex's summary is there but cannot be read: a warning beside the status, which waits or
// passes as it would with no summary at all
export const UNREAD = "Codex's summary is on the pull request, but its state cannot be read: its form may have changed, and scripts/security-review.mjs must learn it";

// { sha, done, why }, or undefined for a pull request with nothing to mark (closed, a draft, no commit to name)
export function judge(pull, comments, reviewComments, commits) {
  if (pull?.state !== "open" || pull.draft !== false || typeof pull.head?.sha !== "string" || !SHA.test(pull.head.sha)) return undefined;
  const sha = pull.head.sha;
  const list = flat(comments);
  const posted = list.filter((comment) => typeof comment.body === "string" && POSTED.test(comment.body) && WRITERS.includes(comment.author_association));
  const read = codex(list), review = read.review, warning = read.unread ? UNREAD : undefined;
  const verdict = judgeWith(sha, list, posted, review, pull, reviewComments, commits);
  return warning ? { ...verdict, warning } : verdict;
}
function judgeWith(sha, list, posted, review, pull, reviewComments, commits) {
  if (review !== null && typeof review === "object" && review.status === "completed") {
    const on = typeof review.commit_sha === "string" && SHA.test(review.commit_sha) ? ` (on ${review.commit_sha.slice(0, 7)})` : "";
    if (review.has_unresolved_findings !== true) return { sha, done: true, why: `Codex's security review has run${on}` };
    // a finding of it is marked open: only a review posted after its newest finding settles it
    const found = newest([...list, ...flat(reviewComments)].filter((comment) => codexs(comment) && FINDING.test(comment.body)).map((comment) => Date.parse(comment.created_at) || Infinity));
    if (newest(posted.map((comment) => Date.parse(comment.created_at) || -Infinity)) > found) return { sha, done: true, why: `Codex's security review has run${on}, and a review is posted after its newest finding` };
    return { sha, done: false, why: "a finding of Codex's security review has no review posted after it" };
  }
  if (posted.length > 0) return { sha, done: true, why: "a security review is posted on the pull request" };
  // Dependabot's own, with no review of Codex's begun on it: the floor holds it another way (rule 17). Its own means
  // opened by it from a branch of the repository, every commit written by it and signed by GitHub, the head among them.
  const all = flat(commits);
  const its = (commit) => commit.author?.login === DEPENDABOT && commit.author.type === "Bot" && commit.committer?.login === "web-flow" && commit.commit?.verification?.verified === true;
  const dependabots = pull.user?.login === DEPENDABOT && pull.user.type === "Bot" && typeof pull.head.repo?.full_name === "string" && pull.head.repo.full_name === pull.base?.repo?.full_name
    && all.length > 0 && all.every(its) && all.some((commit) => commit.sha === sha);
  if (dependabots && !(review !== null && typeof review === "object" && typeof review.status === "string")) return { sha, done: true, why: "Dependabot's own, which floor rule 17 holds" };
  return { sha, done: false, why: "no security review has run yet" };
}

// the commit status GitHub is given: while advisory always a pass, saying what the check would have done
export function status(verdict, advisory, url) {
  const state = verdict.done || advisory ? "success" : "pending";
  // (where Codex's summary cannot be read, the status says so too, where the owner sees it; GitHub takes 140 characters)
  const description = `${advisory ? "Advisory: " : ""}${verdict.done ? "" : advisory ? "would wait, " : "Waiting: "}${verdict.why}${verdict.warning ? "; summary unreadable" : ""}`.slice(0, 140);
  return { state, description, context: CONTEXT, ...(typeof url === "string" && /^https:\/\/[\w./-]{1,200}$/u.test(url) ? { target_url: url } : {}) };
}

if (started(import.meta.url)) {
  const [pullFile, commentsFile, reviewCommentsFile, commitsFile] = process.argv.slice(2);
  if (!pullFile || !commentsFile) {
    console.error("usage: node scripts/security-review.mjs <the pull request, as JSON> <its comments, as JSON> [<its review comments, as JSON> [<its commits, as JSON>]]");
    process.exit(2);
  }
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  const verdict = judge(read(pullFile), read(commentsFile), reviewCommentsFile ? read(reviewCommentsFile) : [], commitsFile ? read(commitsFile) : []);
  console.log(JSON.stringify(verdict === undefined ? {} : { sha: verdict.sha, status: status(verdict, process.env.ADVISORY !== "false", process.env.RUN_URL), ...(verdict.warning ? { warning: verdict.warning } : {}) }));
}
