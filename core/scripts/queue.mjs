// The *progress file* (in the core, QUEUE.md; AGENTS.md, "The queue"; in a project, the file its manifest's slot
// names: roles/shared/inbox.md, "The progress file holds order only"), read as its readers read it: its lines in order,
// a line whose issue has closed skipped, since a line no longer leaves in the pull request that closes its issue,
// where pull requests merging side by side collided on the one file, and the next pull request that changes the file
// clears such lines together (#750, point 1). A line is a row of a table or an item of a list that names its issue
// first ("#n"), and goes once every issue it names first has closed; what it waits on is a row's last cell, or what an
// item names after "waits on", and an issue or pull request named there that has closed is waited on no more. Its
// text and GitHub's answers are untrusted (SECURITY.md, rule 5): each is checked against its form, and only the
// repository's name reaches gh's route. Reads the issues through gh (GITHUB_REPOSITORY and
// GH_TOKEN where GitHub's job sets them; else the repository origin names, or, in the core, its own address, and gh's
// sign-in); writes the progress file with --clear alone.
//
//   node core/scripts/queue.mjs           the open lines in order, and the next: the first that waits on nothing open
//   node core/scripts/queue.mjs --clear   takes out the line of each closed issue, in the pull request that changes
//                                         the file
//   node core/scripts/queue.mjs --check   on a pull request that changes the file: fails where a line of a closed issue
//                                         stands, saying the mend (in the core, own-description.yml runs it)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { copyOf, readCore } from "./core-path.mjs";
import { progressOf } from "./done-when.mjs";
import { aRepository, inProject } from "./guards.mjs";
import { repoOf } from "./inbox.mjs";
import { RULES, ruleFiles } from "./rule-files.mjs";
import { started } from "./started.mjs";

export const FILE = "QUEUE.md";
export const LARGEST = 1 << 20; // (bytes: a progress file past it is refused, never read; SECURITY.md, rule 5)
const ROW = /^\|([^|]*)\|/u, ITEM = /^(\s*)(?:[-*+]|\d{1,9}[.)])\s+(?:\[[ xX]\]\s+)?#(\d{1,9})\b/u;
// The numbers what a line waits on names, a range "#a to #b" (at most a hundred wide) named whole, a number another
// repository's name leads (`owner/name#n`) skipped.
const numbers = text => [...String(text).matchAll(/(?<![\w/-])#(\d{1,9})\b(?:\s+to\s+#(\d{1,9})\b)?/gu)].flatMap(m => {
  const [from, to] = [Number(m[1]), m[2] === undefined ? null : Number(m[2])];
  return to !== null && to > from && to - from <= 100 ? Array.from({ length: to - from + 1 }, (_, i) => from + i) : to === null ? [from] : [from, to];
});
// The issues a line names first, read so that none is missed, since one read too many keeps a line a little longer
// and one missed loses it: { issues, kept }. Every "#n" counts, and a range in any of its spellings ("#a to #b",
// "#a-#b", "#a–b", "#a..#b", "#a through #b", ...) at most a hundred wide is read whole; one wider, or backwards,
// keeps the line, as does a row's first cell holding anything but issues, the words that join them and their points,
// steps, cases or parts; a bare number joined to an issue ("#12, 13 and 14", "#12/13") is read as one.
const RANGE = /#(\d{1,9})\b\s*(?:-|\u2010|\u2011|\u2012|\u2212|~|\u2013|\u2014|\.{2,3}|\u2026|\bup\s+to\b|\bto\b|\bthrough\b|\bthru\b|\btill\b|\buntil\b)\s*#?(\d{1,9})\b/giu;
function named(text, strict) {
  const issues = [];
  let kept = false;
  const rest = String(text).replace(RANGE, (_, a, b) => {
    const [from, to] = [Number(a), Number(b)];
    if (to >= from && to - from <= 100) issues.push(...Array.from({ length: to - from + 1 }, (_, i) => from + i));
    else { kept = true; issues.push(from, to); }
    return " ";
  });
  for (const m of rest.matchAll(/#(\d{1,9})\b((?:\s*(?:[,&+/]|\band\b)\s*\d{1,9}\b)*)/gu)) issues.push(Number(m[1]), ...[...m[2].matchAll(/\d{1,9}/gu)].map(Number));
  const left = rest.replace(/#\d{1,9}\b/gu, " ").replace(/\b(?:points?|steps?|cases?|parts?)\b[^#]*/giu, " ").replace(/\b(?:and|or)\b|[,;&+/]/giu, " ").trim();
  return { issues: [...new Set(issues)], kept: kept || (strict && left !== "") };
}
// What a line waits on beyond the issues it names: its words with each reference ("#n", "#n's points 1 to 3") and the
// words that join them taken out; a line whose words keep anything else (a hold, the owner's word) still waits.
const beyond = words => String(words).replace(/#\d{1,9}(?:'s\s+points?\s+[\d\s,]+(?:(?:to|and)\s+\d+)?)?/gu, " ").replace(/\b(?:and|after|then|or)\b|[,;.]/gu, " ").trim();

// The lines of a progress file's text, in order: { at, text, issues, waits, words, owner }: `at` its index among the
// text's lines, `span` how many it takes (an item's wrapped text and the items under it); `issues` the issues it names first (a row's first cell; an item's text before what it waits on);
// `kept` whether they could not be read whole, a line that never goes by itself;
// `waits` the numbers what it waits on names (a row's last cell, or what an item names after "waits on"), `words`
// that text; `owner` whether a row's second cell holds it for the owner ("the owner", AGENTS.md, "The queue").
export function linesOf(text) {
  const raw = String(text ?? "").split("\n"), all = raw.map(l => l.replace(/\r$/u, ""));
  return all.map((plain, at) => {
    const row = ROW.exec(plain), item = row ? null : ITEM.exec(plain);
    const { span, wraps } = item ? wrapped(all, at, item[1].replace(/\t/gu, "    ").length) : { span: 1, wraps: 1 }, whole = all.slice(at, at + wraps).join(" ");
    const head = row ? (/^\s*#\d/u.test(row[1]) ? named(row[1], true) : null) : item ? named(whole.replace(/\bwaits\s+on\b.*$/iu, ""), false) : null;
    if (!head?.issues.length) return null;
    const cells = row ? plain.split("|").slice(1, -1) : [];
    const words = (row ? cells.at(-1) ?? "" : /\bwaits\s+on\b(.*)$/iu.exec(whole)?.[1] ?? "").trim();
    return { at, span, text: raw[at], issues: head.issues, kept: head.kept, waits: numbers(words), words, owner: row !== null && /^\s*the owner\b/iu.test(cells[1] ?? "") };
  }).filter(Boolean);
}
// What an item at `at` spans: { span, wraps }, `span` itself and each line after it indented past its bullet (its
// wrapped text, and the lines under it that name no issue, which leave with it; one that names an issue anywhere, a
// heading or a fence ends the span; a tab counts four, in the item's own indent too), `wraps` how many of those are its own text, wrapped,
// before the first line that is a bullet of its own.
const BULLET = /^\s*(?:[-*+]|\d{1,9}[.)])\s/u;
function wrapped(all, at, indent) {
  let span = 1, wraps = 1;
  for (; at + span < all.length; span++) {
    const line = all[at + span].replace(/\t/gu, "    ");
    if (!new RegExp(`^ {${indent + 1},}\\S`, "u").test(line) || ROW.test(line.trim()) || ITEM.test(line) || /^\s*(?:#{1,6}\s|```|~~~)/u.test(line)) break;
    if (wraps === span && !BULLET.test(line)) wraps++;
    else if (/#\d/u.test(line)) break;
  }
  return { span, wraps };
}

// The progress file as its readers take it, given `closed` (a number => whether that issue or pull request has
// closed): { open, gone, stale, next }, `gone` the lines all of whose issues have closed, `stale` the lines kept, their
// issues not read whole, though each issue read has closed, which only a hand takes out, `next` the first open line,
// not stale, that no
// one holds for the owner and that waits on nothing open (what it waits on empty, or naming only what has closed and
// nothing else, such as a hold), or null.
export function read(text, closed) {
  const lines = linesOf(text), done = l => !l.kept && l.issues.every(closed);
  const gone = lines.filter(done), open = lines.filter(l => !done(l)), stale = open.filter(l => l.kept && l.issues.every(closed));
  const free = l => !l.owner && !stale.includes(l) && l.waits.every(closed) && beyond(l.words) === "";
  return { open, gone, stale, next: open.find(free) ?? null };
}

// The text with each line all of whose issues have closed taken out, and nothing else changed.
export function cleared(text, closed) {
  const out = new Set(read(text, closed).gone.flatMap(l => Array.from({ length: l.span }, (_, i) => l.at + i)));
  return String(text).split("\n").filter((_, at) => !out.has(at)).join("\n");
}

// Which numbers name an open issue or pull request, read from GitHub's list of the open ones (a page at a time,
// through `gh`): a number => whether it has closed, every number not open counted closed, so that a line naming one
// that does not exist goes, never stays. Each row is checked against its form; a page that is not a list, or a row
// that is no open item with a whole number, throws, as does gh failing: the reading never guesses.
export function statesOf(repo, gh = route => {
  const r = spawnSync("gh", ["api", route], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`gh could not read ${route.split("?")[0]}: ${String(r.stderr ?? r.error).trim().slice(0, 200)}`);
  return r.stdout;
}) {
  const open = new Set();
  for (let page = 1; ; page++) {
    let rows;
    try { rows = JSON.parse(gh(`repos/${repo}/issues?state=open&per_page=100&page=${page}`)); } catch (e) { throw new Error(e instanceof SyntaxError ? "GitHub's list of open issues is no JSON" : e.message); }
    if (!Array.isArray(rows)) throw new Error("GitHub's list of open issues is no list");
    for (const row of rows) {
      if (row === null || typeof row !== "object" || !Number.isSafeInteger(row.number) || row.number < 1 || row.state !== "open") throw new Error("GitHub's list of open issues holds a row that is no open issue with its number");
      open.add(row.number);
    }
    if (rows.length < 100) break;
    if (page >= 100) throw new Error("GitHub's list of open issues runs past 100 pages");
  }
  return n => !open.has(n);
}

// Whether one issue or pull request has closed, read alone, so that --clear takes out no line whose issue the list
// read a page at a time missed as it moved between pages: true where it is closed, deleted or does not exist; throws where
// GitHub's answer is neither.
export function closedAt(repo, n, gh = route => spawnSync("gh", ["api", route], { encoding: "utf8" })) {
  const r = gh(`repos/${repo}/issues/${n}`);
  let body = null;
  try { body = JSON.parse(r.stdout); } catch { /* (checked below) */ }
  if (r.status !== 0 && ["Not Found", "This issue was deleted"].includes(body?.message)) return true;
  if (r.status !== 0 || body === null || body.number !== n || !["open", "closed"].includes(body.state)) throw new Error(`GitHub's answer for #${n} is no issue with its state`);
  return body.state === "closed";
}

// What the command reads, or why it cannot: { text, closed } or { fail }, the failure with its mend.
function readIn(flag, at, FILE) {
  if (flag !== undefined && !["--clear", "--check"].includes(flag)) return { fail: `FAIL: ${flag} is no option of this script. Mend: run node scripts/queue.mjs, with --clear or --check, or with nothing` };
  const text = at.read();
  if (text === null) return { fail: `FAIL: ${FILE} is not here. Mend: run it from the repository's root, where the progress file its manifest names stands (in the core, QUEUE.md)` };
  if (Buffer.byteLength(text) > LARGEST) return { fail: `FAIL: ${FILE} is ${Buffer.byteLength(text)} bytes, past the ${LARGEST} the reader takes. Mend: take out the lines of finished work and any notes, which belong in the pull requests' descriptions` };
  let closed;
  try { closed = at.closed(); } catch (e) { return { fail: `FAIL: the issues the queue names could not be read: ${e.message}. Mend: run it again; where gh is not signed in, sign it in, or set GH_TOKEN` }; }
  const all = read(text, closed);
  if (all.gone.length && !all.open.length) return { fail: `FAIL: GitHub's list of open issues names none of the ${all.gone.length} lines of ${FILE}, which may be the list of another repository. Mend: run it again from the repository's root, GITHUB_REPOSITORY set to its owner/name; where every line's issue has truly closed, take them out by hand` };
  return { text, closed, all };
}

// The command, given its option and what it reads and writes: { status, out }, `out` what it prints. `at`: { file,
// project (whether it runs in a project, from its copy of the core), read() the progress file's text or null,
// write(text), closed() a reader of whether a number has closed, which throws where GitHub cannot answer, and
// confirm(n), where given, which --clear asks of each number before it takes a line out }.
export function command(flag, at) {
  const FILE = at.file ?? "QUEUE.md", got = readIn(flag, at, FILE);
  if (got.fail) return { status: 1, out: got.fail };
  const { open, gone, stale, next } = got.all;
  if (flag === "--clear") return clearing(FILE, got, at);
  if (flag === "--check") return checking(FILE, gone, stale, at);
  const last = [`${open.length} open lines${gone.length ? `, ${gone.length} of closed issues skipped (${namesOf(gone)}), which the next pull request that changes the queue takes out` : ""}`, next ? `next: ${next.issues.map(n => `#${n}`).join(" and ")}` : "next: none that a session takes waits on nothing open"];
  return { status: 0, out: [...open.map(l => l.text), ...last].join("\n") };
}
const namesOf = lines => lines.map(l => l.issues.map(n => `#${n}`).join(" and ")).join(", ");

// --clear: each line whose issues have all closed, each read alone where `at.confirm` is given, taken out; nothing
// written where one cannot be read, and what it says it took out what it did.
function clearing(FILE, got, at) {
  const sure = new Map(), closed = n => got.closed(n) && (!at.confirm || (sure.has(n) ? sure.get(n) : sure.set(n, at.confirm(n)).get(n)));
  let done, text;
  try { done = read(got.text, closed).gone; text = cleared(got.text, closed); } catch (e) { return { status: 1, out: `FAIL: the issues the queue names could not be read: ${e.message}. Mend: run it again; where gh is not signed in, sign it in, or set GH_TOKEN; where an issue's line stays, take it out by hand` }; }
  at.write(text);
  return { status: 0, out: done.length ? `${FILE}: took out the lines of ${namesOf(done)}, closed` : `${FILE}: no line of a closed issue` };
}

// --check: fails where a line of a closed issue stands, one --clear takes out, or one kept that only a hand does.
function checking(FILE, gone, stale, at) {
  if (gone.length) return { status: 1, out: `FAIL: ${FILE} holds the line of ${gone.length === 1 ? "an issue" : "issues"} closed: ${namesOf(gone)}, and this pull request changes the queue. Mend: run node ${at.project || ""}scripts/queue.mjs --clear and commit ${FILE}` };
  if (stale.length) return { status: 1, out: `FAIL: ${FILE} holds a line whose issues read have all closed, though the reader cannot read them whole: ${stale.map(l => l.text.trim()).join("; ")}. Mend: take the line out of ${FILE} by hand, or name its issues as "#n", "#a to #b" or "#n, points ..." and run node ${at.project || ""}scripts/queue.mjs --clear` };
  return { status: 0, out: `ok   ${FILE} holds no line of a closed issue` };
}

// The progress file where the command runs: a project's, as its manifest names it; the core's own where none stands.
// A project's slot is input (SECURITY.md, rule 5): a path taken only where it is a Markdown file inside the project,
// out of .git and of `outside` (the core's copy, or the library that carries it), and no protected file (floor rule 3:
// RULES, an agent tool's folder, and `rules`, the files its SECURITY.md adds); else null, which fails.
const TOOLS = /^\.git(?:\/|$)|(?:^|\/)\.(?:codex|kiro|agents?)(?:\/|$)/iu;
export const fileAt = (manifest, rules = [], outside = "core/") => {
  if (manifest === null) return FILE;
  const at = progressOf(manifest), plain = path.posix.normalize(String(at).replace(/\\/gu, "/"));
  return inProject(at) && /\.md$/iu.test(plain) && !RULES.test(plain) && !TOOLS.test(plain) && !plain.toLowerCase().startsWith(outside.toLowerCase()) && !rules.some(r => r.toLowerCase() === plain.toLowerCase()) ? plain : null;
};
// Whether any part of a path inside the project is a link, which --clear's write would follow, to a protected file
// inside the project as readily as to one outside it.
const linked = file => file.split("/").some((_, i, parts) => { try { return fs.lstatSync(parts.slice(0, i + 1).join("/")).isSymbolicLink(); } catch { return false; } });
// The rule files the project's SECURITY.md adds, and its tools' own; none where it names none.
const ownRules = () => { try { return ruleFiles(undefined, undefined, { tools: true }); } catch { return []; } };
// The path of the project's copy of the core this runs from (core/, or the folder the manifest's `Core:` line names,
// as core-path.mjs reads it), or "" where it runs from the core itself: this file must lie at <that path>scripts/, and
// the core's own scripts/ is no folder a `Core:` line can name.
const inCopy = () => { const core = copyOf(); return path.relative(process.cwd(), fileURLToPath(import.meta.url)).replace(/\\/gu, "/") === `${core}scripts/queue.mjs` ? core : ""; };

// Why the progress file where the command runs cannot be read, with its mend, or null.
export function unplaced(copy, file) {
  const out = file !== null && linked(file);
  if (!copy && out) return `FAIL: ${FILE} is reached through a link. Mend: make ${FILE} a plain file at the repository's root, the queue's lines in it`;
  if (file === null || out) return "FAIL: the progress file core-manifest.md names is no plain Markdown file inside the project (outside .git, the core's copy and any library that carries it, no protected file, reached through no link). Mend: name the progress file in the manifest's row *progress file* as a path such as docs/PROGRESS.md";
  if (fs.existsSync(file) && fs.statSync(file).size > LARGEST) return `FAIL: ${file} is ${fs.statSync(file).size} bytes, past the ${LARGEST} the reader takes. Mend: take out the lines of finished work and any notes, which belong in the pull requests' descriptions`;
  return null;
}

// Where the command runs: { copy, file, repo } or { fail }, the failure with its mend.
function placed() {
  const copy = inCopy(), manifest = copy && fs.existsSync("core-manifest.md") ? fs.readFileSync("core-manifest.md", "utf8") : null;
  // (never inside the copy, nor inside the library that carries it, whose files are its own repository's)
  const file = copy ? fileAt(manifest ?? "", ownRules(), readCore(manifest ?? "").library ?? copy) : FILE, fail = unplaced(copy, file);
  if (fail) return { fail };
  const origin = spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8" }).stdout;
  const repo = aRepository(process.env.GITHUB_REPOSITORY) ? process.env.GITHUB_REPOSITORY : repoOf(origin) ?? (copy ? null : CORE);
  if (repo === null) return { fail: "FAIL: which repository on GitHub this is cannot be told: its origin is no address on github.com. Mend: set GITHUB_REPOSITORY to its owner/name, and run it again" };
  return { copy, file, repo };
}

function main([flag]) {
  const at = placed();
  if (at.fail) { console.error(at.fail); return 1; }
  const { status, out } = command(flag, { file: at.file, project: at.copy, read: () => (fs.existsSync(at.file) ? fs.readFileSync(at.file, "utf8") : null), write: text => fs.writeFileSync(at.file, text), closed: () => statesOf(at.repo), confirm: n => closedAt(at.repo, n) });
  (status ? console.error : console.log)(out);
  return status;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
