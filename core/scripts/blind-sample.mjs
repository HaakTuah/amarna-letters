// The blind sample (README.md, "What the core is for"; #594): with each month's state report, a small sample of the
// month before's merged work, drawn at random and laid out without its story, for the owner to approve or not; the
// share approved is what the core is for, and the state report gives it among the outcomes (outcomes.mjs, beside this
// file). The scheduled look keeps it in one issue, TITLE, labelled needs-owner: on its first run of a month it lays out
// the new draw there, and the state report it writes that run reads first the owner's answers to the draw it replaces.
// Each change is laid out by its diff alone, file by file (GitHub's own patch of the pull request), so nothing says who
// built it, why, or what its reviews said; its number stands only in a comment of the issue's text, for the session that
// files a "no" as a correction. The draw is fixed by the repository and the month (the same each run), never picked by
// hand. The owner answers in a comment, a line each: "3: yes", or "3: no, <kind>", the kind one of a correction's
// (outcomes.mjs, KINDS). It asks and waits on nothing: a month the owner skips is said in the report as not read, and a
// "no" is a correction, built as any is. Through gh; Node's own modules.
//
//   import { reader, shareOf, line } from "./blind-sample.mjs";
import crypto from "node:crypto";
import { after, mergedIn } from "./cited.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { BLIND as LABEL, KINDS, counted } from "./outcomes.mjs";
import { byAgent } from "./stand-in-record.mjs";

export const TITLE = "The blind sample";
export const COUNT = 10, LINES = 60, FILES = 20, WIDE = 200, BODY = 60000;
const MARK = /<!-- blind-sample (\d{4}-\d\d) drawn (\d{4}-\d\d-\d\dT[\d:]+Z) pulls ([\d ]*) -->/u;
const ANSWER = new RegExp(`^\\s*(?:(\\d{4}-\\d\\d)\\s+)?(\\d{1,2})\\s*[:.)]\\s*(yes|no)\\b(?:\\s*[,;:-]\\s*(${KINDS.join("|")}))?`, "iu");

// The month before a month ("2026-01" gives "2025-12").
export const before = month => { const [y, m] = month.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };

// The draw: of the pull requests merged (Dependabot's left out), COUNT of them, ordered by a hash of the repository, the
// month and each number, so the same month gives the same draw on every run and no hand picks it.
export function draw(pulls, repo, month, count = COUNT) {
  const key = p => crypto.createHash("sha256").update(`${repo.toLowerCase()} ${month} ${p.number}`).digest("hex");
  return pulls.filter(p => p.merged_at && !/^dependabot\//u.test(p.head?.ref ?? "") && p.user?.login !== "dependabot[bot]")
    .map(p => ({ p, k: key(p) })).sort((a, b) => a.k.localeCompare(b.k)).slice(0, count).map(({ p }) => p.number).sort((a, b) => a - b);
}

// One change laid out: FILES of the files it changed at most, then GitHub's patch, LINES lines of WIDE characters at
// most and `budget` characters in all, the rest counted; a fence or a comment mark in the text is broken, so no diff
// closes the block or reads as the draw's own mark.
const tame = l => String(l).replace(/```/gu, "'''").replace(/<!--/gu, "<!- -").slice(0, WIDE);
export function laidOut(files, lines = LINES, budget = Infinity) {
  const out = files.slice(0, FILES).map(f => `- \`${String(f.filename).replace(/[`\r\n]/gu, "?").slice(0, WIDE)}\` (${f.status}, +${f.additions ?? 0} -${f.deletions ?? 0})`);
  if (files.length > FILES) out.push(`- and ${files.length - FILES} more files`);
  const patch = files.flatMap(f => (f.patch ? [`--- ${f.filename}`, ...String(f.patch).split("\n")] : [])).map(tame);
  const shown = [];
  let size = out.join("\n").length + 40;
  for (const l of patch.slice(0, lines)) { if (size + l.length + 1 > budget) break; shown.push(l); size += l.length + 1; }
  return [...out, "", "```diff", ...shown, "```", ...(patch.length > shown.length ? [`(${patch.length - shown.length} more lines of the diff not shown)`] : [])].join("\n");
}

// The issue's text for the draw of `month`, made at `drawn`: each change by its place in the draw, laid out by
// `filesOf(number)` within an equal share of BODY, under GitHub's limit for an issue's text; the draws before it kept
// as `earlier` marks, so the pull request behind an answer to one is still known when a "no" is filed.
export function bodyOf(month, drawn, numbers, filesOf, earlier = []) {
  const parts = [`The blind sample of the work merged in ${month}: ${numbers.length} changes drawn at random, each shown by what it changed alone, with no word of who built it, why, or what its reviews found (README.md, "What the core is for"; \`scripts/blind-sample.mjs\`). Would you approve each, shown it so?`,
    "",
    `Answer in a comment, a line each: \`3: yes\`, or \`3: no, <kind>\`, the kind one of ${KINDS.map(k => `\`${k}\``).join(", ")}; \`${month} 3: yes\` names this draw, so an answer given once the next is drawn is never taken for the next one's. The share counts the answers given before the next draw; the earlier draws' changes stay noted here, so a "no" given later is still filed as a correction. Nothing waits on it: next month's state report gives the share approved, or says the month was not answered, and a session files each "no" as a correction.`];
  if (!numbers.length) parts.push("", `Nothing was merged in ${month}, so nothing is drawn.`);
  const share = Math.floor((BODY - parts.join("\n").length - 2000) / Math.max(1, numbers.length));
  numbers.forEach((n, i) => parts.push("", `### ${i + 1}`, "", laidOut(filesOf(n), LINES, share)));
  parts.push("", ...earlier.slice(-11).map(d => `<!-- blind-sample-before ${d.month} drawn ${d.drawn} pulls ${d.pulls.join(" ")} -->`), `<!-- blind-sample ${month} drawn ${drawn} pulls ${numbers.join(" ")} -->`);
  return parts.join("\n");
}

// The draws before it an issue's text keeps: [{ month, drawn, pulls }], oldest first.
export const earlierOf = body => [...String(body ?? "").matchAll(/<!-- blind-sample-before (\d{4}-\d\d) drawn (\d{4}-\d\d-\d\dT[\d:]+Z) pulls ([\d ]*) -->/gu)]
  .map(m => ({ month: m[1], drawn: m[2], pulls: m[3].trim() ? m[3].trim().split(" ").map(Number) : [] }));

// The draw an issue's text holds: { month, drawn, pulls } or null.
export function drawOf(body) {
  // (the last mark: the draw's own stands at the text's end, after every diff)
  const m = [...String(body ?? "").matchAll(new RegExp(MARK.source, "gu"))].at(-1);
  return m ? { month: m[1], drawn: m[2], pulls: m[3].trim() ? m[3].trim().split(" ").map(Number) : [] } : null;
}

// The owner's answers to a draw: the owner's own comments (no agent's), made since it was drawn, a line each, its place
// alone or after the draw's month ("2026-10 3: yes"), one naming another month left out; the last answer to a place
// wins. { place: { yes, kind, pull } }.
export function answersOf(draw, comments, owner) {
  const out = {};
  const own = comments.filter(c => String(c.user?.login ?? "").toLowerCase() === String(owner).toLowerCase() && !byAgent(c.body ?? "") && String(c.created_at) >= draw.drawn)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  for (const c of own) for (const l of String(c.body ?? "").split(/\r?\n/u)) {
    const m = ANSWER.exec(l);
    // (an answer that names another month's draw is to that one, never to this)
    if (!m || (m[1] && m[1] !== draw.month) || Number(m[2]) < 1 || Number(m[2]) > draw.pulls.length) continue;
    out[Number(m[2])] = { yes: m[3].toLowerCase() === "yes", kind: m[4] ? m[4].toLowerCase() : null, pull: draw.pulls[Number(m[2]) - 1] };
  }
  return out;
}

// The share approved of the draw an issue holds: { month, drawn, answered, approved, no: [{ pull, kind }] }, or null.
export function shareOf(issue, comments, owner) {
  const d = drawOf(issue?.body);
  if (!d) return null;
  const a = Object.values(answersOf(d, comments, owner));
  return { month: d.month, drawn: d.pulls.length, answered: a.length, approved: a.filter(x => x.yes).length, no: a.filter(x => !x.yes).map(x => ({ pull: x.pull, kind: x.kind })) };
}

// The state report's line, among the outcomes (outcomes.mjs holds its label and reads its words).
export function line(s) {
  if (!s) return `- ${LABEL}: not read, none drawn yet.`;
  if (!s.answered) return `- ${LABEL}: not read, none of ${s.drawn} drawn from ${s.month} answered.`;
  return `- ${LABEL}: ${counted(s.approved)} of ${s.answered} answered, ${Math.round((100 * s.approved) / s.answered)}%, of ${s.drawn} drawn from ${s.month}.`;
}

// The share of the draw the issue held before this run, read through gh: the look's state report calls it with the issue
// it keeps under TITLE (or none); null where there is none, or GitHub did not answer.
export function shareNow(repo, issue, owner, gh = ghApi) {
  if (!issue) return null;
  try { return shareOf(issue, pagesOf(`repos/${repo}/issues/${issue.number}/comments`, gh), owner); } catch { return null; }
}

// The issue the look keeps under TITLE, as GitHub gives it, or null.
export function keptIssue(repo, gh = ghApi) {
  return pagesOf(`repos/${repo}/issues?state=all&labels=by%3Alook`, gh).filter(i => i.title === TITLE && !i.pull_request).sort((a, b) => b.number - a.number)[0] ?? null;
}

// The look's reader (look.mjs, DUE): on the first run of a month, the draw of the month before, laid out, drawn at
// that run's time (`at`), so only answers after it count; on later runs that month, the issue as it stands.
export function reader({ repo, at, gh = ghApi }) {
  if (!repo) return null;
  const month = before(String(at).slice(0, 7)), drawn = String(at).replace(/\.\d+Z$/u, "Z");
  try {
    const kept = keptIssue(repo, gh)?.body, was = drawOf(kept);
    if (was?.month === month) return { title: TITLE, unread: `the draw of ${month} stands`, owner: true };
    const numbers = draw(mergedIn(repo, `${month}-01T00:00:00Z`, `${after(month)}-01T00:00:00Z`, gh), repo, month);
    const files = n => pagesOf(`repos/${repo}/pulls/${n}/files`, gh);
    return { title: TITLE, body: bodyOf(month, drawn, numbers, files, [...earlierOf(kept), ...(was ? [was] : [])]), owner: true };
  } catch { return { title: TITLE, unread: "GitHub did not answer for the month's merged pull requests and their files", owner: true }; }
}
