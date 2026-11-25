// The milestones of the *progress file*, as the description check reads them (tasks/planning.md; core archive 243;
// #322). A milestone's heading is a Markdown heading of the file (one to six #) whose words begin "Milestone"; it names
// its issue (its first "#n", or an inbox file) and stands over the lines that lead to it: the lines after it, up to the
// next heading of its level or above, that name an item. Of a pull request, with the file's text on its base and its
// head, it fails:
//   - a milestone's heading on the head that names no item, or has no line under it, unless the base already held that
//     fault (what stood before never turns the check red: AGENTS.md, "Nothing locks a project");
//   - a heading the pull request adds that names an issue that is closed;
//   - a milestone's issue the pull request closes ("Fixes #n") whose heading it leaves, or does not name under "What the
//     owner can try";
//   - a heading the pull request takes out whose issue stays open, not closed by it.
// It reads the form, not that a milestone is well chosen or in the right order: that stays with whoever writes the
// file, and the design check. Each item is read through `read` (done-when.mjs's readItem, beside this file, in the
// description check), a dozen at most (MOST) in one run with those the done-when check read before it (`already`); one
// it cannot read is asked nothing, and it says so. Each line of the
// file is read by steps of its own, with no pattern that backtracks: anyone who opens a pull request writes the file.
// pr-description.mjs, beside this file, asks it; its own test, milestones-test.mjs. Node's own modules only.
import { ITEM, MOST, closes, shown } from "./done-when.mjs";

export const WORD = "Milestone", TRY = "What the owner can try";
const lines = text => String(text ?? "").split(/\r\n|\r|\n/u);
const firstItem = text => String(text).match(ITEM)?.[0] ?? null;

// A Markdown heading as { level, words }, or null: up to three blanks, one to six "#", a blank, its words.
function headingOf(line) {
  let i = 0;
  while (i < 3 && line[i] === " ") i++;
  let n = 0;
  while (n < 7 && line[i + n] === "#") n++;
  if (n < 1 || n > 6 || (line[i + n] !== " " && line[i + n] !== "\t")) return null;
  return { level: n, words: line.slice(i + n).trim() };
}
// Whether a heading's words begin with the word "Milestone", marks such as bold before it set aside.
const isMilestone = words => {
  let i = 0;
  while (i < words.length && "*_`".includes(words[i])) i++;
  const rest = words.slice(i, i + WORD.length + 1);
  return rest.slice(0, WORD.length).toLowerCase() === WORD.toLowerCase() && !/[\p{L}\p{N}]/u.test(rest[WORD.length] ?? "");
};

// The milestones of a progress file, in order: [{ words, item, lines }], `item` the item its heading names or null,
// `lines` the items the lines under it name.
export function milestonesOf(text) {
  const out = [], all = lines(text);
  let open = null;
  for (const line of all) {
    const h = headingOf(line);
    if (h) {
      if (open && h.level <= open.level) open = null;
      if (isMilestone(h.words)) { open = { level: h.level, words: h.words, item: firstItem(h.words), lines: [] }; out.push(open); }
      continue;
    }
    const item = open ? firstItem(line) : null;
    if (item) open.lines.push(item);
  }
  return out.map(({ words, item, lines: under }) => ({ words, item, lines: under }));
}

// The faults of a file's milestones' form, each { key, what }: a heading that names no item, or has no line under it.
export function formFaults(text) {
  return milestonesOf(text).flatMap(m => [
    ...(m.item ? [] : [{ key: `none ${m.words}`, what: `the milestone's heading "${shown(m.words)}" names no issue. Mend: name in it the milestone's issue ("#<n>"), filing one that says the state the owner can use and try there and what is judged there` }]),
    ...(m.item && !m.lines.length ? [{ key: `empty ${m.item}`, what: `the milestone ${m.item} has no line under its heading. Mend: where this pull request takes out its last line, it reaches the milestone: take the heading out too, close its issue here ("Fixes ${m.item}") and name it under "${TRY}"; where lines still lead to it, put them under it` }] : []),
  ]);
}

// Whether a heading's words are a part's, as the description check reads its parts (pr-description.mjs, beside this
// file): without marks before the first letter or digit (bold, a sign), blanks as one, whatever the case, its words
// whole or followed by what is no letter or digit ("Readings taken (the unsure first)").
const words = text => String(text).replace(/^[^\p{L}\p{N}]+/u, "").replace(/\s+/gu, " ").trim().toLowerCase();
export function isPart(heading, part) {
  const h = words(heading), p = words(part);
  return h === p || (h.startsWith(p) && /^[^\p{L}\p{N}]/u.test(h.slice(p.length)));
}

// The text under a description's heading `name` (its first such heading), its subsections among it, up to the next
// heading of its level or above; null where none.
export function under(body, name) {
  const all = lines(body);
  const at = all.findIndex(l => { const h = headingOf(l); return h !== null && isPart(h.words, name); });
  if (at < 0) return null;
  const level = headingOf(all[at]).level, out = [];
  for (const l of all.slice(at + 1)) { if ((headingOf(l)?.level ?? 7) <= level) break; out.push(l); }
  return out.join("\n");
}

// Whether `text` names the item: "#12" with no digit after it, or the inbox file's path.
const names = (text, item) => [...String(text ?? "").matchAll(ITEM)].some(m => m[0] === item);

// Every failure for a pull request: `body` its description, `queue` { before, after } the progress file's text,
// `read(item)` an item as { state } (done-when.mjs's readItem), { limited: true } where the rate limit refused it, or
// null where it cannot be read; `already` the items the run read before, which the same `read` gives again at no cost.
// Returns { mends, notes }, each failure a line with its mend.
export function milestoneMends({ body, queue, read, at = "", already = new Set() }) {
  const mends = [], notes = [], where = `(${at}tasks/planning.md)`;
  const before = milestonesOf(queue?.before), after = milestonesOf(queue?.after);
  const stood = new Set(formFaults(queue?.before).map(f => f.key));
  for (const f of formFaults(queue?.after)) if (!stood.has(f.key)) mends.push(`${f.what} ${where}`);
  const had = new Set(before.map(m => m.item).filter(Boolean)), has = new Set(after.map(m => m.item).filter(Boolean));
  const closed = new Set(closes(body).filter(i => had.has(i) || has.has(i)));
  const added = [...has].filter(i => !had.has(i)), gone = [...had].filter(i => !has.has(i) && !closed.has(i));
  // (each item read costs calls on the run's token, and anyone who opens a pull request writes what names them)
  const fresh = new Set([...added, ...gone].filter(i => !already.has(i)));
  if (fresh.size + already.size > MOST) return { mends: [...mends, `this pull request adds or takes out ${added.length + gone.length} milestones' headings, which with the ${already.size} items it queues or closes are more than the ${MOST} the description check reads. Mend: split it into pull requests that each add, take out, queue or close ${MOST} or fewer ${where}`], notes };
  const stateOf = item => {
    const got = read(item);
    if (got?.limited) { mends.push(`${item} could not be read: GitHub's rate limit for this repository's token was reached. Mend: run the check again once the hour turns (re-run its job), or later ${where}`); return null; }
    if (!got) { notes.push(`${item} could not be read, so nothing is asked of it as a milestone`); return null; }
    return String(got.state ?? "");
  };
  for (const item of added) if (stateOf(item) === "closed") mends.push(`the milestone's heading this pull request adds names ${item}, which is closed. Mend: name the milestone's open issue, filing one where none stands ${where}`);
  for (const item of gone) if (stateOf(item) === "open") mends.push(`this pull request takes out the heading of the milestone ${item}, whose issue stays open. Mend: where it reaches the milestone, close it here ("Fixes ${item}") and name it under "${TRY}"; where the milestone is dropped, close its issue first, saying why; where it is renamed, keep its issue in the heading ${where}`);
  const tried = under(body, TRY);
  for (const item of closed) {
    if (has.has(item)) mends.push(`this pull request closes ${item}, a milestone's issue, and leaves its heading in the progress file. Mend: take the heading out, any line still under it moved under the next milestone ${where}`);
    if (!names(tried, item)) mends.push(`this pull request closes ${item}, a milestone's issue, and does not name it under "${TRY}". Mend: name ${item} there, with what the owner can now use and try from start to finish ${where}`);
  }
  return { mends, notes };
}
