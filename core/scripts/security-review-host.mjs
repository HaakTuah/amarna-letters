// The security-review status against the host's own record (#626; #593, point 9): the host is the authority on who
// may write and on what a pull request's reviews are, so the status is compared with what the host records of the core's
// own merged pull requests that had a Codex security review. scripts/security-review-record.mjs records it, one file per
// pull request under reports/security-review-host/ and the rights in rights.json there; tests/security-review-host-test.mjs
// reads them offline, with no token, and fails where a comparison finds a difference.
//
// The comparisons, each a kind of the pass recorded on #624 (reports/2026-11-18-the-security-review-status-read-whole.md):
//   - writersOf() and the push list name the same logins, but for one listed on purpose: an app's account, and a custom
//     role, which counts for no one (W5-W7, W11; compareRights);
//   - no Codex security review in pulls/N/reviews was submitted after the summary's last change, which the status takes
//     as the latest a finding can have come (F9, F10);
//   - the summary names the commit of Codex's newest security review, where its findings stand (F13, F14);
//   - an unresolved thread a Codex security finding opened does not meet a status that passes with no "Security
//     review:" posted after it, the pull request judged as it stood at its merge (F9).
// Codex's running state has no authority outside its summary, so it gets no comparison. Node's own modules only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FINDING, codexState, codexs, flat, judge, postedBy, writersOf } from "./security-review.mjs";

export const FOLDER = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "reports", "security-review-host");
// how a security review of Codex's opens in the host's list of reviews, its kind given by the heading after the receipt
export const SECURITY = /^<!-- codex-review-receipt:v1 -->\s*### 🛡️ Codex Security Review/u;
// the roles GitHub defines; any other is a custom role (W6)
const ROLES = ["read", "triage", "write", "maintain", "admin"];
export const time = (at) => Date.parse(at);
export const lower = (login) => String(login).toLowerCase();

// Codex's security reviews among the host's reviews of a pull request, submitted by its merge
export const securityReviews = (record) => flat(record.reviews).filter((review) => codexs(review) && SECURITY.test(review.body) && time(review.submitted_at) <= time(record.pull.merged_at));
// the pull request as it stood at its merge, as the workflow's last run read it: open and no draft, with what came by
// then (a comment's time unreadable is kept, as the host gave it). The verdict is read offline without what only the
// run had: the merges clean-merges.mjs proved (every update from main is followed), a pure sync's or the queue's proof,
// the reviewers the caller names, and the rights as they stood then (those recorded stand in for them)
export function atMerge(record) {
  const by = (entry) => !(time(entry.created_at) > time(record.pull.merged_at));
  const pull = { ...record.pull, state: "open", draft: false };
  return [pull, flat(record.comments).filter(by), flat(record.findings).filter(by), record.commits, record.files];
}
export const verdictOf = (record, rights = record.rights) => judge(...atMerge(record), true, { rights });

// what differs between the status and the host's record of one pull request's reviews: a list of lines, empty where
// nothing does
export function compare(record) {
  const n = `#${record.pull.number}`;
  const summary = codexState(record.comments);
  if (!summary.state) return [`${n}: Codex's summary is ${summary.unread ? "there but cannot be read" : "not there"}, so nothing of its security review can be compared`];
  const reviews = securityReviews(record);
  const out = reviews.filter((review) => !(time(review.submitted_at) <= time(summary.at)))
    .map((review) => `${n}: Codex's security review ${review.id} was submitted at ${review.submitted_at}, after the summary last changed (${summary.at}), which the status takes as the latest a finding can have come`);
  return [...out, ...commitDiffers(n, summary.state.security_review, reviews), ...threadsOpen(n, record)];
}
// where the summary says findings stand, the commit it names is that of Codex's newest security review, and where it
// says none do, no security review of Codex's (each of which carries findings) is on that commit
function commitDiffers(n, said, reviews) {
  if (said?.status !== "completed") return [];
  const newest = reviews.reduce((last, review) => (last === undefined || time(review.submitted_at) > time(last.submitted_at) ? review : last), undefined);
  if (said.has_any_findings === true && newest !== undefined && newest.commit_id !== said.commit_sha) return [`${n}: the summary names ${said.commit_sha} for Codex's security review, but its newest review in the host's list is on ${newest.commit_id}`];
  if (said.has_any_findings !== true && reviews.some((review) => review.commit_id === said.commit_sha)) return [`${n}: the summary says Codex's security review of ${said.commit_sha} found nothing, but the host lists a security review of Codex's on that commit`];
  return [];
}
// an unresolved thread a Codex security finding opened, where the status passed with no "Security review:" posted
// after that finding that the status counts (security-review.mjs, postedBy)
function threadsOpen(n, record) {
  if (!Array.isArray(record.threads)) return [];
  const [pull, comments, findings] = atMerge(record);
  const byId = new Map(findings.map((comment) => [comment.id, comment]));
  const open = record.threads.filter((thread) => thread.resolved === false).map((thread) => byId.get(thread.first))
    .filter((comment) => comment !== undefined && codexs(comment) && FINDING.test(comment.body));
  const verdict = verdictOf(record);
  if (!verdict.done) return [];
  const posted = postedBy(pull, comments, true, undefined, record.rights).all;
  return open.filter((finding) => !posted.some((comment) => time(comment.created_at) > time(finding.created_at)))
    .map((finding) => `${n}: Codex's security finding ${finding.id} is unresolved on the merged head, with no "Security review:" posted after it, yet the status, read without the run's proof of merges, passed: ${verdict.why}`);
}

// what differs between writersOf() and the host's push list: a list of lines, empty where nothing does
export function compareRights(rights) {
  const answers = flat(rights.answers), writers = writersOf(answers);
  const listed = flat(rights.pushList);
  const pushers = new Set(listed.map((entry) => lower(entry.login)));
  const out = [];
  for (const entry of listed) {
    const login = lower(entry.login);
    if (writers.has(login)) continue;
    const answer = answers.find((each) => lower(each.user?.login) === login);
    if (answer === undefined) out.push(`${entry.login} is on the host's push list, but no rights answer of theirs is recorded`);
    else if (!onPurpose(answer)) out.push(`${entry.login} is on the host's push list, but writersOf() does not count them (role ${answer.role_name}, permission ${answer.permission})`);
  }
  for (const login of writers) if (!pushers.has(login)) out.push(`writersOf() counts ${login}, who is not on the host's push list`);
  return out;
}
// the two listed on purpose, as the host's answer gives them: an app's account, which writersOf() never counts, and a
// custom role, which counts for no one (security-review.mjs, writersOf)
const onPurpose = (answer) => answer.user?.type !== "User" || !ROLES.includes(answer.role_name);

// the recordings in a folder, each as { file, record }
export const recordings = (folder = FOLDER) => fs.readdirSync(folder).filter((name) => /^pr-\d+\.json$/u.test(name)).sort()
  .map((name) => ({ file: name, record: JSON.parse(fs.readFileSync(path.join(folder, name), "utf8")) }));
