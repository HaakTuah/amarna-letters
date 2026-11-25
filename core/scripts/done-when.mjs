// How done will be judged, as the description check reads it (tasks/done-when.md; core archive 240; #305): a feature's
// entry, its issue's current text (or, where that has none, the pull request's own description), holds under the heading
// "Done when" two to six lines, each starting "When", "While" or "If", at least one an "If", each naming what proves it
// after "Proof:" (a test, a check, a picture, or "the owner tries this"), and one line "Out of scope:"; or, for a change
// said in one sentence, the one line "None:" with that sentence. A pull request that closes it says under "Proved by
// use", for each line, what it ran ("Ran:") and what it saw ("Saw:"). An issue is a feature's where it names the kind
// `feature` (its label, or under "What to read"), as reading.mjs, beside this file, reads the kinds. A heading is a
// Markdown heading or a line wholly in bold, as the issue forms write them; an item, a line starting "-", "*" or a
// number, with the indented lines after it. It holds the form, not that the lines are right: that stays with the
// design check. pr-description.mjs, beside this file, asks it, of the issues whose lines a pull request adds to the
// *progress file* and of those it closes, a dozen at most (MOST), each issue read through gh with the newest pages of
// its notes and an inbox file through git, never followed as a link; its own test, done-when-test.mjs. Git, gh and
// Node's own modules.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { OWNER } from "./core-address.mjs";
import { leftOut, asked as toRead } from "./reading.mjs";
import { ownerOf } from "./releases.mjs";

export const HEADING = "Done when", PROVED = "Proved by use", KIND = "feature";
// The most items one pull request may queue or close, each read with a call or a few: a handful in practice.
export const MOST = 12;
export const CURRENT = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8")).headings.current;
const SHAPE = /^(When|While|If)\b/u, PROOFS = /^(?:a test|a check|a picture|"?the owner tries this)/iu;
const lines = text => String(text ?? "").split(/\r\n|\r|\n/u);
// (each line read by steps of its own, with no pattern that backtracks: a description of any shape, which anyone who
// opens a pull request writes, takes time in step with its length)
const indent = l => { let i = 0; while (i < 3 && l[i] === " ") i++; return l.slice(i); };
const blank = c => c === " " || c === "\t";
export function headingOf(line) {
  const l = indent(line);
  let n = 0;
  while (n < l.length && l[n] === "#") n++;
  if (n >= 1 && n <= 6 && blank(l[n])) { let end = l.length; while (end > n && (l[end - 1] === "#" || blank(l[end - 1]))) end--; return l.slice(n, end).trim(); }
  const t = line.trim(), inner = t.startsWith("**") ? (t.endsWith("**:") ? t.slice(2, -3) : t.endsWith("**") ? t.slice(2, -2) : null) : null;
  return inner && !inner.includes("*") ? inner.trim() : null;
}
// An item's text: after "-", "*", "+" or a number of up to three digits with "." or ")", and a blank; else null.
function itemOf(line) {
  const l = indent(line);
  let n = 0;
  if ("-*+".includes(l[0] ?? "x")) n = 1;
  else { while (n < 3 && l[n] >= "0" && l[n] <= "9") n++; n = n && (l[n] === "." || l[n] === ")") ? n + 1 : 0; }
  return n && blank(l[n]) ? l.slice(n).trim() : null;
}
const plain = s => s.replace(/[*_`:]+/gu, "").trim().toLowerCase();
// A line of an outsider's text as a failure shows it: its start, with no character that would start a line of the log
// or a command to the runner ("::" at a line's start, "##[" anywhere).
export const shown = s => s.slice(0, 60).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/gu, " ").replaceAll("##[", "# #[");

// The items under a heading that starts with `name` (the first such), as one string each; null where no such heading.
export function section(body, name) {
  const all = lines(body), at = all.findIndex(l => { const h = headingOf(l); return h !== null && plain(h).startsWith(name.toLowerCase()); });
  if (at < 0) return null;
  const items = [];
  for (const l of all.slice(at + 1)) {
    if (headingOf(l) !== null) break;
    const item = itemOf(l);
    if (item !== null) items.push(item);
    else if (items.length && blank(l[0]) && l.trim()) items[items.length - 1] += ` ${l.trim()}`;
  }
  return items;
}

// An entry: { none, lines: [{ text, shape, proof }], scope: [..], other: [..] }, or null where it has no heading.
export function entryOf(body) {
  const items = section(body, HEADING);
  if (items === null) return null;
  const bare = s => s.replace(/^[*_]+/u, "");
  const e = { none: [], lines: [], scope: [], other: [] };
  for (const item of items) {
    const t = bare(item), at = t.lastIndexOf("Proof:"), proof = at < 0 ? null : t.slice(at + 6).trim();
    if (/^None\b/u.test(t)) e.none.push(t);
    else if (/^Out of scope\b/iu.test(t)) e.scope.push(t);
    else if (SHAPE.test(t)) e.lines.push({ text: t, shape: SHAPE.exec(t)[1], proof });
    else e.other.push(t);
  }
  return e;
}

const FORM = "two to six lines, each one behaviour starting \"When\", \"While\" or \"If\" (at least one \"If ... then ...\"), each ending \"Proof: \" and a test written first, a check, a picture or \"the owner tries this\", and one line \"Out of scope: ...\"; or, for a change said in one sentence, the one line \"None: <that sentence>\"";

// What is wrong with an entry's form, each a line with its mend; `where` names it ("the issue #12"), `at` where the
// core lies ("core/" in a project). Empty where it is in the form.
export function entryFaults(e, where, at = "") {
  const mend = what => `${where}: its "${HEADING}" ${what}. Mend: write under it ${FORM} (${at}tasks/done-when.md)`;
  if (e.none.length) return e.none.length === 1 && !e.lines.length && !e.other.length && !e.scope.length ? [] : [mend("holds a \"None:\" line beside other lines")];
  const out = [];
  if (e.lines.length < 2 || e.lines.length > 6) out.push(mend(`holds ${e.lines.length} line${e.lines.length === 1 ? "" : "s"} in the three shapes, where two to six are asked`));
  if (e.lines.length && !e.lines.some(l => l.shape === "If")) out.push(mend("has no line for what happens when something goes wrong (one starting \"If\")"));
  for (const l of e.lines) if (!l.proof || !PROOFS.test(l.proof)) out.push(mend(`line "${shown(l.text)}" names no proof after "Proof:" of the four kinds`));
  for (const o of e.other) out.push(mend(`line "${shown(o)}" is in none of the shapes`));
  if (e.scope.length !== 1) out.push(mend(`holds ${e.scope.length} "Out of scope:" lines, where one is asked`));
  return out;
}

// What is wrong with a description's "Proved by use" for an entry: an item with a "Ran:" and a "Saw:" for each line
// (one, for an entry of "None:").
export function provedFaults(body, e, at = "") {
  const entries = Array.isArray(e) ? e : [e];
  const items = section(body, PROVED), want = entries.reduce((n, x) => n + Math.max(1, x.lines.length), 0);
  const got = (items ?? []).filter(i => /\bRan:\s*\S/u.test(i) && /\bSaw:\s*\S/u.test(i)).length;
  if (got >= want) return [];
  return [`the description's "${PROVED}" gives what was run and seen for ${got} of the ${want} line${want === 1 ? "" : "s"} of its entr${entries.length === 1 ? "y" : "ies"}${items === null ? " (it has no such heading)" : ""}. Mend: use the change as its user would (start the program, take its user's steps, run the command) and add under a heading "${PROVED}" one item for each "${HEADING}" line, saying "Ran: " what was run and "Saw: " what was seen; where it cannot be run here, "Saw: " says why and names the issue filed for it (${at}tasks/done-when.md)`];
}

// Whether an issue ({ labels, body }) is a feature's: it names the kind by its label or under "What to read".
export const isFeature = issue => (issue.labels ?? []).includes(KIND) || toRead(issue.body).some(w => w === KIND || /(?:^|\/)tasks\/done-when\.md$/u.test(w));

// An issue's current text: its description, or the *owner's account*'s newest note that says it is ("One current
// text"), the login compared as GitHub does, ignoring case.
const same = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
export function currentText(body, notes = [], owner = "") {
  const mine = notes.filter(n => same(n.author, owner) && String(n.body ?? "").includes(CURRENT));
  return mine.length ? String(mine.at(-1).body) : String(body ?? "");
}

// The items a pull request adds to the progress file: each line's first "#n" (or an inbox file, "inbox/<name>.md"),
// where no line of the base's file was its own.
// (an item as the progress file names it: an issue's number, or an inbox file)
export const ITEM = /(?<![\w/])(?:#\d{1,9}(?!\d)|inbox\/[\w-]+(?:\.[\w-]+)*\.md(?![\w.-]))/gu;
export function joined(before, after) {
  const named = text => lines(text).map(l => l.match(ITEM)?.[0]).filter(Boolean);
  // (an item named before only where another waits on it is no line of its own, and joins with its own)
  const had = new Set(named(before));
  return [...new Set(named(after))].filter(n => !had.has(n));
}

// The issues a description closes ("Fixes #12", "Closes #12", "Resolves #12"), as GitHub reads them.
export const closes = body => [...new Set([...String(body ?? "").matchAll(/\b(?:fix|fixe[sd]|close[sd]?|resolve[sd]?):?[ \t]*#(\d{1,9})(?!\d)/giu)].map(m => `#${m[1]}`))];

// Every failure for a pull request: `body` its description, `queue` { before, after } the progress file's text,
// `read(item)` an item ("#12" or an inbox file) as { labels, body } with its current text, or null where it cannot be
// read. Only a feature's issue is asked, so that an idea's template, which holds the heading, asks nothing of another.
// Returns { mends, notes }: the failures, each with its mend, and what was not asked and why.
export function doneMends({ body, queue, read, at = "" }) {
  const mends = [], notes = [], own = entryOf(body);
  // (each item read costs calls on the run's token, and anyone who opens a pull request writes what names them)
  const items = new Set([...joined(queue?.before, queue?.after), ...closes(body)]);
  if (items.size > MOST) return { mends: [`this pull request queues or closes ${items.size} items, more than the ${MOST} the description check reads. Mend: split it into pull requests that each queue or close ${MOST} or fewer (${at}tasks/done-when.md)`], notes };
  // (each item read once; a read GitHub's rate limit refused fails, since an outsider can spend the limit to pass a
  // feature's issue unasked; one that cannot be read at all, a private repository's issue to a token that reads none,
  // is asked nothing)
  const seen = new Map();
  const get = item => {
    if (seen.has(item)) return seen.get(item);
    const got = read(item);
    if (got?.limited) mends.push(`${item} could not be read: GitHub's rate limit for this repository's token was reached. Mend: run the check again once the hour turns (re-run its job), or later (${at}tasks/done-when.md)`);
    else if (!got) notes.push(`${item} could not be read, so nothing is asked of it`);
    seen.set(item, got?.limited ? null : got);
    return seen.get(item);
  };
  mends.push(...joinedMends(joined(queue?.before, queue?.after), get, at));
  if (own) mends.push(...entryFaults(own, "the description", at));
  // (each feature's issue closed is proved for its own lines; the description's stand for those that have none)
  const entries = [];
  for (const item of closes(body)) {
    const got = get(item), e = got && isFeature(got) ? entryOf(got.body) : undefined;
    if (e && !entryFaults(e, item).length) entries.push(e);
    else if (e !== undefined && !own) mends.push(`${item}, a feature's issue this pull request closes, has no "${HEADING}" lines in the form, and nor has the description. Mend: write the lines under a heading "${HEADING}" in the description, ${FORM}, and have the stand-in rule on them (${at}tasks/done-when.md)`);
  }
  if (own) entries.push(own);
  if (entries.length) mends.push(...provedFaults(body, entries, at));
  return { mends, notes };
}

// The failures for the items a pull request adds to the progress file: a feature's issue with no heading. The heading
// alone is asked here: lines missing or not in the form are its builder's to write, so nothing waits.
function joinedMends(items, get, at) {
  return items.flatMap(item => {
    const got = get(item);
    return got && isFeature(got) && !entryOf(got.body) ? [`${item}, a feature's issue that joins the progress file, has no "${HEADING}" in its current text. Mend: add to it a heading "${HEADING}", with ${FORM}, where they are known; where they are not, the heading alone, and its builder writes them (${at}tasks/done-when.md)`] : [];
  });
}

// The *progress file*'s path, as a manifest's slot names it (a row of its table, or the core's AGENTS.md, "the
// *progress file*: `QUEUE.md`"), else the starter kit's.
export const progressOf = manifest => /\*progress file\*[ \t]*[|:][ \t]*`([^`\n]+)`/u.exec(String(manifest ?? ""))?.[1] ?? "docs/PROGRESS.md";

// The progress file's text on the base and the head, in the checkout at `dir` (the merge commit against its first
// parent), the slot read as the base holds it; null where git cannot read them.
export function queueAt(dir, prefix) {
  const git = (...args) => { const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 }); return r.status === 0 ? r.stdout : null; };
  if (git("rev-parse", "--verify", "--quiet", "HEAD^1") === null) return null;
  const manifest = git("show", `HEAD^1:${prefix ? "core-manifest.md" : "AGENTS.md"}`) ?? "", file = progressOf(manifest);
  return { before: git("show", `HEAD^1:${file}`) ?? "", after: git("show", `HEAD:${file}`) ?? "", manifest };
}

// Who writes an issue's current text, as the base's manifest names the *owner's account* (the core's own, in the
// core), else the repository's account; and whether the project takes this module, as its manifest's lines say.
export const ownerAt = (manifest, prefix, repo) => (prefix ? ownerOf(String(manifest ?? "")) : OWNER) ?? String(repo).split("/")[0];
export const takesIt = (manifest, prefix, name = "done-when.md") => !prefix || !leftOut(manifest).has(name);

// The pages of an issue's notes read for its current text, newest first: an issue with more notes than these is read
// from its newest PAGES hundred, so that its calls stay few however many notes anyone adds.
export const PAGES = 3;
const LIMITED = Symbol("rate limit");

// the newest PAGES hundred of an issue's notes as { author, body }, oldest first, stopping at the owner's current text; null where one cannot be read
function readNotes(gh, repo, n, got, owner) {
  const last = Math.max(1, Math.ceil(Number(got.comments ?? 0) / 100)), notes = [];
  for (let page = last; page >= 1 && page > last - PAGES; page--) {
    const one = gh(`repos/${repo}/issues/${n}/comments?per_page=100&page=${page}`);
    if (!Array.isArray(one)) return null;
    notes.unshift(...one.map(c => ({ author: String(c.user?.login ?? ""), body: c.body })));
    if (one.some(c => same(c.user?.login, owner) && String(c.body ?? "").includes(CURRENT))) break;
  }
  return notes;
}

// An item as { labels, body, state, author, pull }, its body the current text, its state GitHub's ("open" or "closed"),
// and, of an issue, the login that opened it and whether it is a pull request: an issue
// by gh from `repo`, an inbox file, "open" while it stands, as the head's commit holds it in the checkout at `dir` (from
// git, so that a link is read as its own text and never followed out of the checkout); { limited: true } where
// GitHub's rate limit refused it; null where it cannot be read.
export function readItem(repo, item, dir = ".", owner = String(repo).split("/")[0]) {
  if (item.startsWith("inbox/")) {
    const r = spawnSync("git", ["show", `HEAD:${item}`], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 24 });
    return r.status === 0 ? { labels: [], body: r.stdout, state: "open" } : null;
  }
  const gh = route => {
    const r = spawnSync("gh", ["api", route], { encoding: "utf8", maxBuffer: 1 << 24 });
    if (r.status !== 0 && /rate limit/iu.test(String(r.stderr))) throw LIMITED;
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  };
  try {
    const n = item.slice(1), got = gh(`repos/${repo}/issues/${n}`);
    if (!got) return null;
    const notes = readNotes(gh, repo, n, got, owner);
    if (notes === null) return null;
    return { labels: (got.labels ?? []).map(l => String(l?.name ?? "")), body: currentText(got.body, notes, owner), state: got.state,
      author: String(got.user?.login ?? ""), pull: got.pull_request !== undefined };
  } catch (e) { return e === LIMITED ? { limited: true } : null; }
}
