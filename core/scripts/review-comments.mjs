// How a comment on a pull request is read as a review (review-record.mjs, beside this file, counts what they found): which
// posted review a comment is (postedKind), the counts and the score its lines declare (blockingOf, otherOf, scoreOf,
// read by review-lines.mjs and given on from here) and the stance (stanceOf), what a find of Codex's is (codexFind), what each of the reviews did on one pull request
// (perPull), the heads they were asked or posted on (reviewEvents), the rules a pull request's findings name
// (rulesNamed) and the pull request a bug names (broughtBy). Split from review-record.mjs, whose counts, report and reads
// of GitHub it keeps; nothing here changed in the split. It reads; it writes nothing. Node's own modules.
import { seen } from "./guards.mjs";
import { blockingOf, lines, otherOf, scoreOf } from "./review-lines.mjs";
import { FINDING, codexState, codexs, named } from "./security-review.mjs";

export { blockingOf, otherOf, scoreOf };

const RECEIPT = /^<!-- codex-review-receipt:v1 -->/u;
const REVIEWED = /^\*\*Reviewed commit:\*\* `([0-9a-f]{7,40})`/mu; // (the commit a receipt of Codex's names, as its app writes it)
const BADGE = /!\[(P[0-3]) Badge\]/u;

const firstLine = body => lines(body).find(l => l.trim()) ?? "";

// Which posted review a comment is, from its first line unquoted: security, code, design, or none-needed (a note that
// no security review is needed), or null where it is none.
export function postedKind(body) {
  const first = firstLine(body);
  if (/^\s*>/.test(first)) return null;
  const m = /^\s*(?:\*\*)?(Security review|Code review|Design check):\s*(.*)$/su.exec(first); // (s: a line separator left in the line still matches, so the pattern never goes back over the spaces)
  if (!m) return null;
  if (m[1] === "Design check") return "design";
  if (m[1] === "Code review") return "code";
  return /^(?:\*\*)?\s*none needed\b/iu.test(m[2]) ? "none-needed" : "security";
}


// The stance a posted code review declares on a line of its own (tasks/reviews.md, "A review's stance follows the kind
// of change"; #397): "adversarial", "regular", or null where no line says one or two lines disagree.
export function stanceOf(body) {
  const said = new Set();
  for (const raw of lines(seen(body))) { const m = /^Stance: (adversarial|regular)\.(?:\s|$)/iu.exec(raw.replaceAll("**", "").trim()); if (m) said.add(m[1].toLowerCase()); }
  return said.size === 1 ? [...said][0] : null;
}

// One inline comment as a find of Codex's: { review: "code" | "security", badge, blocking }, or null where it is not
// one of Codex's, replies to another comment, or has no priority badge.
export function codexFind(comment) {
  if (!codexs(comment) || (comment.in_reply_to_id ?? null) !== null) return null;
  const badge = BADGE.exec(comment.body)?.[1];
  if (!badge) return null;
  return { review: FINDING.test(comment.body) ? "security" : "code", badge, blocking: badge === "P0" || badge === "P1" };
}

// What the five reviews, and the posted code review by stance, did on one pull request, from its comments (issue comments and inline ones, as GitHub's API
// gives them): each of REVIEWS' keys gives { got, blocked: null | "yes" | "no" | "unread", points, other, otherUnread },
// otherUnread true where a posted review that ran declares no count of its other points (Codex's are read by badge).
export function perPull(issueComments, inline, owner) {
  const state = codexState(issueComments);
  const finds = [...inline, ...issueComments].map(codexFind).filter(Boolean); // (a find can be an issue comment too, as security-review.mjs reads them)
  const codex = review => {
    const mine = finds.filter(f => f.review === review);
    const said = state.state?.[review === "code" ? "code_review" : "security_review"];
    const got = said?.status === "completed" || mine.length > 0 || (review === "code" && issueComments.some(c => codexs(c) && RECEIPT.test(c.body)));
    const points = mine.filter(f => f.blocking).length;
    // (the summary says there are finds, or cannot be read, and none of them was found: not read, never none)
    const unread = state.unread === true || said?.has_any_findings === true && mine.length === 0;
    return { got, blocked: !got ? null : points ? "yes" : unread ? "unread" : "no", points, other: mine.length - points, otherUnread: false };
  };
  const posted = (kind, stance) => {
    const mine = issueComments.filter(c => String(c.user?.login ?? "").toLowerCase() === owner.toLowerCase() && postedKind(c.body) === kind && (!stance || stanceOf(c.body) === stance));
    const reads = mine.map(c => blockingOf(c.body)), others = mine.map(c => otherOf(c.body));
    return { got: mine.length > 0, blocked: !mine.length ? null : reads.some(n => n > 0) ? "yes" : reads.every(n => n === 0) ? "no" : "unread",
      points: reads.reduce((s, n) => s + (n ?? 0), 0), other: others.reduce((s, n) => s + (n ?? 0), 0), otherUnread: others.some(n => n === null) };
  };
  return { codexCode: codex("code"), postedCode: posted("code"), postedAdversarial: posted("code", "adversarial"), postedRegular: posted("code", "regular"), codexSecurity: codex("security"), postedSecurity: posted("security"), postedDesign: posted("design") };
}

// What a pull request's reviews were asked or posted on, for its rounds (review-rounds.mjs): { sha, at, blocking }, sha
// the commit the review names (a posted review's first line, the commit a receipt of Codex's names, the one a find of
// Codex's was made on, and the one each review its summary says completed read, the newest alone, as its app keeps it)
// and at the time it was asked or posted, read where no commit is named. A review asked is a line
// "@codex review" alone, in a comment of the owner's account; a note that no security review is needed is none.
export function reviewEvents(issueComments, inline, owner) {
  const mine = c => String(c.user?.login ?? "").toLowerCase() === owner.toLowerCase();
  const out = [];
  for (const c of issueComments) {
    const kind = mine(c) ? postedKind(c.body) : null;
    if (["security", "code", "design"].includes(kind)) out.push({ sha: named(firstLine(c.body))[0], at: c.at, blocking: blockingOf(c.body) > 0 });
    else if (mine(c) && lines(seen(c.body)).some(l => l.trim() === "@codex review")) out.push({ at: c.at, blocking: false });
    else if (codexs(c) && RECEIPT.test(c.body)) out.push({ sha: REVIEWED.exec(c.body)?.[1], at: c.at, blocking: false });
  }
  const { state } = codexState(issueComments);
  for (const review of [state?.code_review, state?.security_review]) if (review?.status === "completed" && review.commit_sha) out.push({ sha: review.commit_sha, blocking: false });
  for (const c of [...inline, ...issueComments]) {
    const find = codexFind(c);
    if (find) out.push({ sha: c.original_commit_id ?? c.commit_id, at: c.at, blocking: find.blocking });
  }
  return out;
}

// The rules a pull request's findings name (the core's tasks/reviews.md, point 8; #254): each on a line of its own
// that opens "Rule:", in a find of Codex's or a review posted by the owner's account, read as a key the same however it
// is written: its backticks, bold and quotes, a closing stop, colon or comma (as rules.mjs's leadOf leaves them out of
// a rule's own key) and a leading "core/" left out, its spaces made one, its case lowered and its control and format
// characters taken out. A quoted line names none.
const RULE = /^[ \t]*(?:[-*][ \t]+)?(?:\*\*)?Rule:(?:\*\*)?[ \t]+(\S.*)$/u;
export const ruleOf = text => String(text).slice(0, 300).replace(/[\p{Cc}\p{Cf}`*"\u201c\u201d]/gu, "").replace(/\s+/gu, " ").trim()
  .replace(/[.:,;]+$/u, "").trim().replace(/^core\//u, "").toLowerCase();
export const rulesIn = body => lines(body).map(l => RULE.exec(l)?.[1]).filter(Boolean).map(ruleOf).filter(Boolean);
export function rulesNamed(issueComments, inline, owner) {
  const finds = [...inline, ...issueComments].filter(c => codexFind(c));
  const posted = issueComments.filter(c => String(c.user?.login ?? "").toLowerCase() === owner.toLowerCase() && ["security", "code", "design"].includes(postedKind(c.body)));
  return [...new Set([...finds, ...posted].flatMap(c => rulesIn(c.body)))].sort();
}

// The pull request a bug names as the one that brought it in ("Brought in by: #N" on a line of its own), or null.
export const broughtBy = body => { const all = [...lines(seen(body)).join("\n").matchAll(/^Brought in by: #([1-9]\d{0,8})[ \t]*$/gmu)]; return all.length ? Number(all.at(-1)[1]) : null; };
