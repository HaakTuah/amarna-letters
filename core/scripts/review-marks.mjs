// The marks reviews leave, as a check reads them (#551), for every project that takes the core:
//   - What a posted review declares (tasks/reviews.md, point 3): of the comments that open "Security review:", "Code
//     review:" or "Design check:" from an account whose review counts (`whose`, security-review.mjs's counted: the
//     repository's owner, an account the project names, or a person the host's rights let write, never GitHub's
//     association alone, which in an organisation a member who may only read also has), posted on or after MARKS_SINCE, the newest of
//     each kind declares its blocking findings and its other findings on lines of their own, as review-record.mjs,
//     beside this file, reads them (blockingOf, otherOf), and, posted on or after SCORE_SINCE, its score on a line
//     of its own (scoreOf; roles/shared/review-guidelines.md, "Every reviewer"; #710); a note that none is needed
//     declares nothing, and Codex's app,
//     which posts in its own form under an account of its own, is not read here.
//   - The design check (tasks/reviews.md, point 4): in the core's own repository, a pull request that changes a file
//     under floor/, roles/, tasks/ or tools/ (its *design-checked PRs*) has a "Design check:" from such an account,
//     as first posted, naming by its whole SHA the head or a commit that only updates from main follow; one opened
//     before MARKS_SINCE is not asked. In a project, which pull requests are design-checked is its manifest's slot,
//     none by default, which no check reads without guessing, so none is asked.
//   - A late review (tasks/reviews.md, "A late review is still read"): of Codex's findings in the last week (inline,
//     with a priority badge), those made after their pull request merged with no reply, which the scheduled look lists
//     (look.mjs, beside this file); a posted review's findings, written in its comment's text, are no check's to read.
// The first two are read by code-review-wait.mjs, beside this file, into the code-review status. What a review says,
// and whether its counts are true, stay the reviewer's. Node's own modules only.
import { blockingOf, codexFind, otherOf, postedKind, scoreOf } from "./review-record.mjs";
import { WRITERS, asPosted } from "./security-review.mjs";

// The day from which a posted review is asked its lines, and a pull request opened then its design check.
export const MARKS_SINCE = "2026-11-18T00:00:00Z";
// The day from which a posted review is asked its score too (#710): reviews posted before it was asked are not held.
export const SCORE_SINCE = "2026-11-20T00:00:00Z";
// The folders whose change makes a pull request of the core's design-checked (AGENTS.md's slot *design-checked PRs*).
export const DESIGNED = /^(?:floor|roles|tasks|tools)\//u;
const KINDS = { security: "Security review", code: "Code review", design: "Design check" };
const SHAS = /(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])/giu;
// A posted review's form, as security-review.mjs's form() writes it with the score's line after (#710), for each kind:
// each mend that names it says it whole within GitHub's 140 characters, the situation before it worded short to leave
// it room; the code-review status's own mends name it too (code-review-wait.mjs). (The security-review status's own
// mends, worded to that limit already, name the form without the score: a review posted by one of them is asked its
// score here.)
export const formOf = kind => `${kind}: <whole SHA>⏎Blocking findings: N.⏎Other findings: M.⏎Score: S of 10.`;
const counts = (c, whose) => typeof whose === "function" && whose(c?.user) === true;

// Of the posted reviews among `comments` (an issue's, as GitHub's API gives them) by an account whose review counts
// (`whose`, a function of a comment's user), posted on or after `since`, the kinds whose newest declares no line of
// its blocking findings or of its other findings, or, posted on or after `scored`, of its score: ["Code review", ...].
export function undeclared(comments, whose, since = MARKS_SINCE, scored = SCORE_SINCE) {
  const newest = new Map();
  for (const c of comments) {
    const kind = postedKind(c?.body);
    if (!KINDS[kind] || !counts(c, whose) || String(c.created_at ?? "") < since) continue;
    if (!newest.has(kind) || String(c.created_at) >= String(newest.get(kind).created_at)) newest.set(kind, c);
  }
  return [...newest].filter(([, c]) => blockingOf(c.body) === null || otherOf(c.body) === null || (String(c.created_at) >= scored && scoreOf(c.body) === null)).map(([kind]) => KINDS[kind]);
}

// Whether a pull request of the core's (`core`: its base is the core's own repository) asks the design check: opened on
// or after `since`, and changing a file under DESIGNED, by its name now or before (`files`, as GitHub's API gives them).
export const designAsked = (pull, files, core, since = MARKS_SINCE) => core && String(pull?.created_at ?? "") >= since
  && files.some(f => [f?.filename, f?.previous_filename].some(n => typeof n === "string" && DESIGNED.test(n)));

// Whether a "Design check:" from an account whose review counts (`whose`), as first posted, names a commit of `chain`
// (the head and the commits that only updates from main follow, as security-review.mjs's standsFrom gives them), or,
// declaring no blocking finding, one of `carried` (those the pull request's own fixes follow too, #1134, point 1).
export const designed = (comments, whose, chain, carried = chain) => comments.some(c => postedKind(c?.body) === "design" && counts(c, whose) && asPosted(c)
  && (String(c.body).match(SHAS) ?? []).some(sha => chain.has(sha.toLowerCase()) || (carried.has(sha.toLowerCase()) && blockingOf(c.body) === 0)));

// What the marks make a pull request wait on, a line with its mend, or null where they are kept.
// (the first kind missing is named, so that its form fits; once it is posted again, the next is named)
export function marksWait({ pull, comments, files, chain, carried, whose, core }) {
  const missing = undeclared(comments, whose);
  if (missing.length) return `${missing[0]} lacks lines. Mend: repost: ${formOf(missing[0])}`;
  if (files !== undefined && chain !== undefined && designAsked(pull, files, core) && !designed(comments, whose, chain, carried ?? chain)) return `no design check. Mend: a fresh reviewer posts ${formOf(KINDS.design)}`;
  return null;
}

// The pull request a review comment stands on, by its number, from GitHub's API's pull_request_url.
export const pullOf = c => Number(/\/pulls\/(\d+)$/u.exec(String(c?.pull_request_url ?? ""))?.[1]);

// The late findings (tasks/reviews.md, "A late review is still read"): of `inline` (review comments, any pull
// request's, as GitHub's API gives them), Codex's findings made on or after `since` and after their pull request merged
// (`merged`, a Map of the pull request's number to when it merged), with no reply from an account the host lets write
// (`writers`, the logins in lower case that security-review.mjs's writersOf reads from the host's rights: another
// account's reply is data, floor rule 4, and in an organisation a member or collaborator may only read):
// [{ pull, url, review, at }]. (A finding Codex posts as an issue comment is not read: an issue comment has no reply
// GitHub ties to it, so whether it was answered could only be guessed.)
export function lateOf(inline, merged, since = "", writers = new Set()) {
  const answered = new Set(inline.filter(c => c?.user?.type === "User" && typeof c.user.login === "string" && writers.has(c.user.login.toLowerCase())).map(c => c?.in_reply_to_id).filter(id => id !== undefined && id !== null));
  return inline.flatMap(c => {
    const find = codexFind(c), pull = pullOf(c), at = merged.get(pull), made = String(c?.created_at ?? "");
    return find && at && made >= since && made > at && !answered.has(c.id) ? [{ pull, url: String(c.html_url ?? ""), review: find.review, at: made }] : [];
  });
}

// The logins whose rights lateOf needs: of `inline`, the people (accounts of type User, with a login in GitHub's own
// form, so that it can stand in a request's route) whose association GitHub gives as one that may write (WRITERS) and
// who replied to a finding of Codex's, in lower case.
export function repliersOf(inline) {
  const finds = new Set(inline.filter(c => codexFind(c)).map(c => c.id));
  return [...new Set(inline.filter(c => finds.has(c?.in_reply_to_id) && c?.user?.type === "User" && typeof c.user.login === "string" && /^[a-z\d](?:[a-z\d-]{0,38})$/iu.test(c.user.login) && WRITERS.includes(c.author_association)).map(c => c.user.login.toLowerCase()))];
}

// The body of the look's issue for them, or null where none stands.
export const lateBody = late => (late.length ? `Findings of a reviewer the project asks, made after their pull request merged, with no reply (tasks/reviews.md, "A late review is still read"). A session answers each as point 5 of that file says: what holds is a bug, filed and fixed (a weakness: floor rule 9, never described in public), and its reply on the finding says what was done.\n\n${late.map(l => (l.review === "security" ? `- #${l.pull}, a finding of Codex's security review, ${l.at.slice(0, 10)}: read it on the pull request; nothing of it is written here (floor rule 9)` : `- #${l.pull}, Codex's code review, ${l.at.slice(0, 10)}: ${l.url}`)).join("\n")}` : null);
