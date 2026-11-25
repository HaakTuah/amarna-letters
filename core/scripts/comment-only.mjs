// Is this pull request's change to what runs by itself only comments and steps' names (floor rule 3)? Such a change
// passes one security review, floor rule 8's, instead of rule 3's two. Its builder runs it from a checkout of the
// core's `main`, never from the pull request's own copy, which the pull request could change, in the pull request's
// clone with the head that merges checked out, brought up to date with `main` for it:
//
//   node <the core's main>/scripts/comment-only.mjs [<a commit already reviewed>]
//
// It reads the head commit, not the working tree, against the merge base with the project's main (fetched), or against
// the commit given, one before the head that it grew from, for a later commit reviewed only for what it changes (floor
// rule 8); a head not up to date with main is refused, since it reads the change against main only where the head
// holds it. It reads every file the pull request
// changes under .github/ or .claude/ (the folders themselves too, any case, at any depth), and every action.yml, a
// project's own action: each must be a YAML file changed in place, its mode kept, no link or submodule there on either
// side, whose two versions differ only in YAML comments, blank lines between entries, and the `name` of a job's steps.
// A step's name is the first key of an item under `jobs.<job>.steps` that YAML reads as text: holding no `${{` and no
// backslash, which in quotes could spell one, so nothing is evaluated; quoted and not empty, or plain from a letter and
// none of the words YAML reads as null, true or false. A comment a tool may read as an instruction (an ignore, a
// disable, a skip, a linter's or scanner's name) must stand word for word beside the same line as before, and the note
// beside an action's version (`uses:`) must stand. It reads YAML as GitHub's parser does where it reads it at all, and
// refuses, rather than guess, every line it cannot read for sure: a tab, a carriage return or another control character
// or line break, a byte order mark, a character YAML refuses; a value that runs on to the next line (a quoted or plain
// one, or one in [ ] or { }); a quote or # inside [ ] or { }; an anchor, alias, tag, explicit key or document marker. A
// line inside a block scalar (`run: |`) is text, a # line too, and changes nothing only where it is unchanged; the blank
// lines after its last are not, unless it keeps them (`|+`). Of the
// files outside what it reads, it refuses those that run by themselves or decide what does (RUNS_TOO below) and lists
// the rest: it exits 0 where there are none, 1 where it refuses, and 2 where others changed, which the session's
// "Security review:" comment says of, file by file, why each runs neither by itself nor with credentials
// (tasks/reviews.md, point 3). It prints the head it checked, for that comment and the merge. Git, Node's own modules
// and the lexer of the YAML package the core installs from its lock file (packages.mjs; #654), which says where each token of a line and each
// block scalar's text ends, this proof deciding what it reads (#530); it changes nothing.
import "./whole-output.mjs";
import { execFileSync } from "node:child_process";
import { loadSync } from "./packages.mjs";
import { started } from "./started.mjs";


export const RUNS = /(?:^|\/)(?:\.(?:github|claude)(?:\/|$)|action\.ya?ml$)/iu; // what runs by itself, as far as this proof reads it
const YAML = /\.ya?ml$/iu;
// what YAML 1.1 or 1.2 reads as a line break besides \n, a tab, a byte order mark, every other control character, and
// the two characters YAML refuses in a file (U+FFFE and U+FFFF), which would stop the whole file being read
const UNREAD = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff\ufffe\uffff]/u;
const HEADER = /^[|>](?:[1-9][+-]?|[+-][1-9]?)?(?: +(#.*)?)?$/u; // a block scalar's header, with its comment if any
// what else runs by itself or decides what does, refused outright: Claude Code's servers; another agent tool's own
// folder (Kiro's, Codex's, Antigravity's, Gemini's, Cursor's and the like: their hooks, settings and rules; core
// archive 232); an editor's, a container's or a shell's setup and git's hooks; npm's, pnpm's, yarn's and .NET's
// packages, tools, configs, hooks and builds (MSBuild runs a project's targets, and reads by itself a project's .user
// file and a folder's Directory.Build.rsp) and the Node or SDK they pick; a task runner's file; the copy of the core;
// git's own attributes and submodules; a container's build; and a name with "~" and a digit, which Windows can read as
// another folder's short name (CLAUDE~1 for .claude). It is asked first: a file of the copy of the core is refused even
// where it is one this proof reads.
export const RUNS_TOO = /(?:^|\/)(?:\.mcp\.json|package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|\.yarnrc(?:\.yml)?|\.npmrc|\.node-version|\.node-least|\.nvmrc|\.envrc|\.devcontainer\.json|\.pre-commit-config\.ya?ml|\.gitmodules|\.gitattributes|(?:[^/]*\.)?(?:Dockerfile|Containerfile)[^/]*|Makefile|GNUmakefile|justfile|Taskfile\.ya?ml|\.tool-versions|\.?mise\.toml|nuget\.config|global\.json|dotnet-tools\.json|packages\.lock\.json|[^/]+\.(?:(?:cs|fs|vb)?proj(?:\.user)?|projitems|shproj|props|targets)|Directory\.Build\.rsp|\.pnpmfile\.cjs)$|(?:^|\/)\.(?:vscode|devcontainer|husky|yarn\/releases|kiro|codex|agents?|gemini|cursor|windsurf|amazonq|continue|roo)(?:\/|$)|^core\/|(?:^|\/)[^/]*~\d/iu;
// a comment a tool may read as an instruction (a check silenced, a linter told to look away)
const DIRECTIVE = /\b(?:ignore|disable|suppress|skip|allowlist|nosec|noqa|nosemgrep|semgrep|nolint|noinspection|nocheck|codeql|lgtm|nosonar|ggignore|zizmor|actionlint|shellcheck|checkov|trivy|gitleaks|lint|pragma)/iu;
// a plain step's name YAML 1.1 or 1.2 reads as no string
const NOT_TEXT = /^(?:~|null|true|false|yes|no|on|off|y|n)$/iu;

// The text's tokens as the YAML package the core installs reads them (its lexer; #530, #654), each
// { src, at, content }: its text, its offset in the text, and whether it is a block scalar's text, the lines after its
// header, which hold no YAML. The lexer's own marks, which stand for no text, are left out.
function tokensOf(text) {
  const out = [];
  let at = 0, marked = false, header = false;
  const { Lexer } = loadSync("yaml"); // (loaded where it is used: no import of this file needs it)
  for (const src of new Lexer().lex(text)) {
    if (src === "\x02" || src === "\x18") continue; // (a document's start; a [ ] or { } left open, read below)
    if (src === "\x1f") { marked = true; continue; }
    out.push({ src, at, content: marked && header });
    if (marked) header = false;
    else if (src[0] === "|" || src[0] === ">") header = true;
    marked = false;
    at += src.length;
  }
  return out;
}

// The text's lines, each { line, n, last, toks, content, within }: its tokens (each with `col`, its column past the
// line's indentation), whether it is a block scalar's text, and whether it lies within a token that began on a line
// before (a value that runs on, read as such on its first line).
function linesOf(text, raw, broken) {
  const starts = [];
  for (let i = 0, at = 0; i < raw.length; at += raw[i].length + 1, i++) starts.push(at);
  const lineAt = at => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= at) lo = mid; else hi = mid - 1; } return lo; };
  const rows = raw.map((line, i) => ({ line, n: i + 1, last: i === raw.length - 1 && !broken, toks: [], content: false, within: false, indent: /^ */u.exec(line)[0].length }));
  for (const t of tokensOf(text)) {
    if (!t.src || !rows.length) continue;
    const first = lineAt(t.at), end = lineAt(t.at + t.src.length - 1);
    // (a block scalar's text first: one of a single blank line, kept by `|+`, is a line break alone)
    if (t.content) { for (let i = first; i <= end; i++) rows[i].content = true; continue; }
    if (t.src === "\n") continue;
    for (let i = first + 1; i <= end; i++) rows[i].within = true;
    if (!/^ +$/u.test(t.src)) rows[first].toks.push({ ...t, col: t.at - starts[first] - rows[first].indent, runs: end > first });
  }
  return rows;
}

// one node of a line's text `rest` from `at`, its tokens `toks` (each with its column in `rest`): { kind, text, start,
// end, comment } (kind "key" for a key, its text without the ":"), or { why }
function node(rest, toks, at) {
  while (rest[at] === " ") at++;
  if (at >= rest.length) return { kind: "empty", text: "", start: at, end: at, comment: null };
  const c = rest[at], next = rest[at + 1];
  const spaced = next === undefined || next === " ";
  if (c === "#") return rest[at - 1] === " " ? { kind: "empty", text: "", start: at, end: at, comment: at } : { why: "a # that opens no comment" };
  if (c === "|" || c === ">") return header(rest, at);
  const why = barred(c, spaced);
  if (why) return { why };
  const k = toks.findIndex(t => t.col === at);
  if (k < 0) return { why: "a node the YAML package does not start where this proof does" };
  if (c === "[" || c === "{") return flow(rest, toks, k);
  if (c === '"' || c === "'") return quoted(rest, toks, k);
  return plain(rest, toks, k);
}

// what a node may not start with, as this proof reads YAML: why, or null
function barred(c, spaced) {
  if (c === "-" && spaced) return "a sequence on a key's line";
  if (c === ":" && spaced) return "a key with no name";
  if ("&*!".includes(c)) return "an anchor, alias or tag";
  if ("?%@`".includes(c)) return "an explicit key or a character YAML reserves";
  return "]},".includes(c) ? "a [ ] or { } out of place" : null;
}

// a block scalar's header, with its comment if any
function header(rest, at) {
  const m = HEADER.exec(rest.slice(at));
  if (!m) return { why: "a block scalar's header this proof does not read" };
  const comment = m[1] === undefined ? null : rest.length - m[1].length;
  const text = rest.slice(at, comment ?? rest.length).replace(/ +$/u, "");
  return { kind: "block", text, start: at, end: rest.length, comment, fixed: /[1-9]/u.test(text) };
}

// a [ ] or { }, ending at the token that closes the one the k-th opens, on its own line
function flow(rest, toks, k) {
  const at = toks[k].col;
  let depth = 0, j = k;
  for (; j < toks.length; j++) {
    if ("[{".includes(toks[j].src)) depth++;
    else if ("]}".includes(toks[j].src) && --depth === 0) break;
  }
  const end = j < toks.length ? toks[j].col + 1 : rest.length;
  if (/["'#&*!]/u.test(rest.slice(at, end))) return { why: "a quote, #, anchor, alias or tag inside [ ] or { }" };
  if (j >= toks.length || toks.slice(k, j).some(t => t.runs)) return { why: "a [ ] or { } that runs on to the next line" };
  return after(rest, toks, j + 1, at, end, "flow");
}

// a quoted value, as the lexer ends it: on its own line, closed by its quote (one no backslash escapes, or past the
// pairs of quotes that stand for one)
function quoted(rest, toks, k) {
  const t = toks[k], q = t.src[0], body = t.src.slice(1);
  const trail = (q === '"' ? /\\*"$/u : /'+$/u).exec(body)?.[0] ?? "";
  const closed = !t.runs && trail.length % 2 === 1; // (an odd run: the last quote one no backslash escapes, or past the pairs of quotes)
  if (!closed) return { why: "a quoted value that runs on to the next line" };
  return after(rest, toks, k + 1, t.col, t.col + t.src.length, "quoted");
}

// a plain value, as the lexer ends it: at " #" (a comment), or at ": " or a final ":" (a key)
function plain(rest, toks, k) {
  const t = toks[k], at = t.col;
  if (t.runs) return { why: "a value that runs on to the next line" };
  const n = toks[k + 1];
  if (n?.src === ":" && (n.col + 1 === rest.length || rest[n.col + 1] === " ")) return { kind: "key", text: rest.slice(at, n.col), start: at, end: n.col + 1, comment: null };
  const note = toks.slice(k + 1).find(x => x.src[0] === "#" && rest[x.col - 1] === " ");
  if (note) return { kind: "plain", text: rest.slice(at, note.col).replace(/ +$/u, ""), start: at, end: note.col, comment: note.col };
  return { kind: "plain", text: rest.slice(at).replace(/ +$/u, ""), start: at, end: rest.length, comment: null };
}

// what may follow a quoted value or one in [ ] or { }: nothing, a comment, or the ":" that makes it a key
function after(rest, toks, k, at, end, kind) {
  const n = toks[k];
  if (!n) return { kind, text: rest.slice(at, end), start: at, end, comment: null };
  if (n.src[0] === "#" && n.col > end) return { kind, text: rest.slice(at, end), start: at, end, comment: n.col };
  if (n.src === ":" && (n.col + 1 === rest.length || rest[n.col + 1] === " ") && kind === "quoted") return { kind: "key", text: rest.slice(at, end), start: at, end: n.col + 1, comment: null };
  return { why: `text after a ${kind === "flow" ? "[ ] or { }" : "quoted value"}` };
}

// A block scalar's text, read by the lexer: each line as it stands, its last marked where the file ends with no line
// break, the break being part of the text. Blank lines before its first line may not hold more spaces than it; blank
// lines after its last are no part of it unless its header keeps them (`|+`), nor are they where they hold no more
// spaces than its text's indentation, YAML reading a line of more spaces as text.
function contentOf(rows, i, lines, unread) {
  let j = i;
  while (j < rows.length && rows[j].content) j++;
  const block = rows.slice(i, j), blank = r => r.indent === r.line.length, first = block.find(r => !blank(r));
  if (first && block.slice(0, block.indexOf(first)).some(r => r.line.length > first.indent)) unread.push(`line ${first.n}: a block scalar's first line less indented than a blank line before it`);
  let end = block.length;
  if (!lines.at(-1)?.value?.includes("+")) while (end > 0 && blank(block[end - 1]) && !(first && block[end - 1].line.length > first.indent)) end--;
  for (const r of block.slice(0, end)) lines.push({ n: r.n, content: true, text: r.line, last: r.last });
  return j;
}

// A line's key, if it has one, and its value, from `at`, past its "- "s: { key, keyCol, value } or { why }.
function keyAndValue(rest, toks, at, indent) {
  const first = node(rest, toks, at);
  if (first.why || first.kind !== "key") return { key: null, keyCol: null, value: first, why: first.why };
  const value = node(rest, toks, first.end);
  const why = value.why ?? (value.kind === "key" ? "two keys on one line" : value.kind !== "empty" && rest[first.end] !== " " ? "a value with no space after its key" : null);
  return { key: first.text, keyCol: indent + at, value, why };
}

// The blank lines after the text of a block scalar whose header keeps them (`|+`), its text too, as the proof read
// them: every blank line up to the next that is not, a last one with no line break after it among them, which the
// lexer leaves out. Returns the line after them.
function keptBlanks(rows, i, lines) {
  for (; i < rows.length && rows[i].indent === rows[i].line.length && !rows[i].within; i++) lines.push({ n: rows[i].n, content: true, text: rows[i].line, last: rows[i].last });
  return i;
}

// One line of YAML that is no block scalar's text, read into `lines` and `comments`, or what is unread of it.
function entryOf(r, lines, comments, unread) {
  const { line, n, indent } = r, rest = line.slice(indent);
  if (rest[0] === "#") { comments.push({ text: rest, at: lines.length, own: true }); return; }
  if (/^(?:---|\.\.\.)(?: |$)/u.test(rest)) { unread.push(`line ${n}: a document marker`); return; }
  let at = 0, items = 0, dash = indent;
  while (rest[at] === "-" && (at + 1 === rest.length || rest[at + 1] === " ")) { items++; dash = indent + at; at++; while (rest[at] === " ") at++; }
  const { key, keyCol, value, why } = keyAndValue(rest, r.toks, at, indent);
  if (why) { unread.push(`line ${n}: ${why}`); return; }
  const cut = value.comment === null ? rest.length : value.comment;
  const note = rest.slice(cut);
  if (note) comments.push({ text: note, at: lines.length, own: false });
  lines.push({ n, indent, items, key, keyCol, kind: value.kind, value: value.text, valueAt: value.kind === "empty" ? null : indent + value.start, note, text: line.slice(0, indent + cut).replace(/ +$/u, "") });
  return value.kind === "block" ? { from: key !== null ? keyCol : dash, keep: value.text.includes("+"), fixed: value.fixed } : null;
}

// A block scalar whose header gives its indentation (`|2`): its text read as more than YAML may, never less, every line
// past the column its key or its last "- " stands at, and the blank lines among them, those after its last kept only
// where its header keeps them. Returns the line after it.
function fixedOf(rows, i, { from, keep }, lines, unread) {
  let held = [];
  for (; i < rows.length; i++) {
    const r = rows[i], text = { n: r.n, content: true, text: r.line, last: r.last };
    // (a line past the column that the lexer reads as YAML, no text of a block scalar and no comment alone: the two
    // readings part there, and what follows cannot be read for sure)
    if (r.indent >= from + 1 && r.indent < r.line.length && !r.content && !(r.toks.length === 1 && r.toks[0].src[0] === "#")) unread.push(`line ${r.n}: a line YAML reads outside the block scalar whose header gives its indentation`);
    if (r.indent === r.line.length && r.indent <= from + 1) { held.push(text); continue; }
    if (r.indent < from + 1) break;
    for (const h of [...held, text]) lines.push(h);
    held = [];
  }
  if (keep) for (const h of held) lines.push(h);
  return i;
}

// The lines read into `lines` and `comments`, a block scalar's text as such, or what is unread of them.
function readRows(rows, lines, comments, unread) {
  for (let i = 0; i < rows.length;) {
    if (rows[i].content) { i = contentOf(rows, i, lines, unread); continue; }
    // (a line within a token that began on a line before, a value that runs on, is refused here too: its first line may be
    // one the proof reads as a block scalar's text)
    if (rows[i].within && rows[i].indent < rows[i].line.length) unread.push(`line ${rows[i].n}: a value on a line of its own, or one that runs on from the line before`);
    const block = rows[i].indent < rows[i].line.length && !rows[i].within ? entryOf(rows[i], lines, comments, unread) : null;
    i = block?.fixed ? fixedOf(rows, i + 1, block, lines, unread) : i + 1;
    if (block?.keep && !block.fixed) i = keptBlanks(rows, rows[i]?.content ? contentOf(rows, i, lines, unread) : i, lines);
  }
}

/** How YAML reads `text`, line by line: { lines, unread }. Each line kept is either a block scalar's ("content", as it
 *  stands) or one with its entries (items, the "- " before its key or value; key; value); comment lines and blank lines
 *  between entries are left out, a line's own comment cut off. `unread` says, by line, what this proof cannot read.
 *  The YAML package's lexer says where each token and each block scalar's text ends; this proof, what it reads. */
export function readYaml(text) {
  const unread = [], lines = [], comments = [];
  const bad = UNREAD.exec(text);
  if (bad) return { lines, comments, unread: [`line ${text.slice(0, bad.index).split("\n").length}: a tab, carriage return, byte order mark, another control character or line break, or a character YAML refuses`] };
  const raw = text.split("\n"), broken = text.endsWith("\n");
  if (broken) raw.pop(); // (what follows the last line break is no line)
  readRows(linesOf(text, raw, broken), lines, comments, unread);
  // one entry a line: a line that is no key and no item continues a value, or stands alone where YAML would read it so;
  // and nothing deeper may follow a line that holds its value, where YAML would read it as that value running on
  const entries = lines.filter(l => !l.content);
  entries.forEach((l, k) => {
    if (l.key === null && l.items === 0) unread.push(`line ${l.n}: a value on a line of its own, or one that runs on from the line before`);
    const next = entries[k + 1];
    if (next && ["plain", "quoted", "flow"].includes(l.kind) && next.indent > (l.key !== null ? l.keyCol : l.indent)) unread.push(`line ${next.n}: a value that runs on from line ${l.n}`);
  });
  if (unread.length) return { lines: [], comments: [], unread };
  // the steps' names: `- name: <value>` as the first key of an item under jobs.<job>.steps, read as text: holding no ${{
  // and no \ (a double-quoted name's escape, \x24 for $, would spell an expression the text does not show), quoted and
  // not empty, or plain from a letter and no word YAML reads as null or true or false
  const holder = (k) => {
    const me = entries[k];
    for (let p = k - 1; p >= 0; p--) {
      const q = entries[p];
      if (q.indent < me.indent || (q.indent === me.indent && q.items === 0 && me.items > 0)) return p;
    }
    return -1;
  };
  const opens = (p, key) => p >= 0 && entries[p].items === 0 && entries[p].kind === "empty" && (key === undefined ? entries[p].key !== null : entries[p].key === key);
  entries.forEach((l, k) => {
    if (l.items !== 1 || l.key !== "name" || l.value.includes("${{") || l.value.includes("\\")) return;
    if (!(l.kind === "quoted" ? l.value.length > 2 : l.kind === "plain" && /^[A-Za-z]/u.test(l.value) && !NOT_TEXT.test(l.value))) return;
    const steps = holder(k);
    if (!opens(steps, "steps")) return;
    const job = holder(steps);
    if (!opens(job)) return;
    const jobs = holder(job);
    if (opens(jobs, "jobs") && entries[jobs].indent === 0) l.stepName = true;
  });
  return { lines, comments, unread };
}

/** Whether `before` and `after`, two versions of one YAML file, differ only in comments, blank lines between entries
 *  and steps' names: { same: true } or { why }. */
export function proof(before, after) {
  const a = readYaml(before), b = readYaml(after);
  if (a.unread.length) return { why: `before: ${a.unread.join("; ")}` };
  if (b.unread.length) return { why: `after: ${b.unread.join("; ")}` };
  const why = lineChanged(a, b) ?? directiveMoved(a, b) ?? usesNoteChanged(a, b);
  return why === null ? { same: true } : { why };
}

// what of a line the proof holds to: a block scalar's text as it stands, an entry's without its comment, a step's name
// left out
function kept(l) {
  return l.content ? `C${l.text}${l.last ? "\u0000no line break after it" : ""}` : `L${l.stepName ? `${l.text.slice(0, l.valueAt)}\u0000a step's name` : l.text}`;
}

// the first line that changed beyond a comment or a step's name, or null
function lineChanged(a, b) {
  const x = a.lines.map(kept), y = b.lines.map(kept);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    const where = (lines, side) => lines[i] ? `${side} line ${lines[i].n}` : `${side}: nothing`;
    return `more than a comment or a step's name changed (${where(a.lines, "before")}, ${where(b.lines, "after")})`;
  }
  return null;
}

// a comment that a tool may read as an instruction, added, changed or moved (a tool reads it on its own line, or on
// the line after it): each must stand, word for word, beside the same line as before, by its place, the two versions'
// lines being matched one to one by now (two lines may read alike); or null
function directiveMoved(a, b) {
  const left = new Map();
  for (const c of a.comments) if (DIRECTIVE.test(c.text)) left.set(placed(a, c), (left.get(placed(a, c)) ?? 0) + 1);
  for (const c of b.comments) {
    if (!DIRECTIVE.test(c.text)) continue;
    const key = placed(b, c);
    if (left.get(key)) { left.set(key, left.get(key) - 1); continue; }
    return `a comment a tool may read as an instruction, added or moved: ${c.text.slice(0, 80)}`;
  }
  return null;
}

// a comment's place and words, by which the two versions' are matched
function placed(side, c) { return `${c.own ? "before" : "on"} ${c.at}\u0000${c.text}`; }

// the note beside an action's version (`uses:`), changed; or null
function usesNoteChanged(a, b) {
  const note = a.lines.findIndex((l, i) => uses(l.key) && l.note !== b.lines[i].note);
  if (note >= 0) return `the note beside an action's version changed (before line ${a.lines[note].n}, after line ${b.lines[note].n})`;
  return null;
}

// (the key however it is written: quoted, or with an escape that could spell it, is taken for one)
function uses(key) {
  return typeof key === "string" && (/^(["']?)uses\1$/u.test(key) || (key.startsWith('"') && key.includes("\\")));
}

if (started(import.meta.url)) {
  const git = (args, encoding = "utf8") => execFileSync("git", args, { encoding, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
  const clean = s => s.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, "?");
  const head = git(["rev-parse", "HEAD"]).trim();
  git(["fetch", "-q", "--no-tags", "origin", "refs/heads/main"]);
  const main = git(["rev-parse", "FETCH_HEAD"]).trim();
  try { git(["merge-base", "--is-ancestor", main, head]); } catch {
    console.log(`the head is not up to date with main (${main.slice(0, 7)}): bring it up to date, and run this on the head that merges`);
    process.exit(1);
  }
  let base = git(["merge-base", main, head]).trim();
  if (process.argv[2]) {
    try { base = git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${process.argv[2]}^{commit}`]).trim(); } catch { base = ""; }
    let grew = Boolean(base) && base !== head;
    try { git(["merge-base", "--is-ancestor", base, head]); } catch { grew = false; }
    if (!grew) {
      console.log(`${clean(process.argv[2])} is no commit before the head that it grew from: a later commit is read only against one before it`);
      process.exit(1);
    }
  }
  // (the whole tree, from whatever folder it is run in, whatever git's diff.relative says)
  const fields = git(["-c", "core.quotePath=false", "diff", "--raw", "-z", "--no-relative", "--no-renames", "--no-abbrev", "--no-ext-diff", "--ignore-submodules=none", base, head]).split("\0");
  const fails = [], read = [], others = [];
  // a link or a submodule where this proof reads, on either side: what it points to is not read
  for (const commit of [base, head]) {
    for (const entry of git(["ls-tree", "-r", "-z", "--full-tree", commit]).split("\0")) {
      const tab = entry.indexOf("\t"), meta = entry.slice(0, tab), file = tab < 0 ? "" : entry.slice(tab + 1); // (a path may hold a tab)
      if (file && RUNS.test(file) && /^1[26]0000 /u.test(meta)) fails.push(`${file}: a link or submodule, at ${commit.slice(0, 7)}`);
    }
  }
  // (a byte order mark at the start is kept, to be refused as one anywhere else is, never dropped unseen)
  const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const blob = sha => utf8.decode(git(["cat-file", "blob", sha], "buffer"));
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const [modeA, modeB, shaA, shaB, status] = fields[i].replace(/^:/u, "").split(" ");
    const file = fields[i + 1];
    if (RUNS_TOO.test(file)) { fails.push(`${file}: a file that runs by itself or decides what does`); continue; }
    if (!RUNS.test(file)) { others.push(file); continue; }
    if (status !== "M" || modeA !== modeB || !["100644", "100755"].includes(modeA)) { fails.push(`${file}: added, deleted, or its mode or kind changed`); continue; }
    if (!YAML.test(file)) { fails.push(`${file}: not a YAML file`); continue; }
    let result;
    try { result = proof(blob(shaA), blob(shaB)); } catch { result = { why: "not text in UTF-8" }; }
    if (result.why) fails.push(`${file}: ${result.why}`);
    else read.push(file);
  }
  if (fails.length) {
    for (const f of fails) console.log(`  NOT ALONE ${clean(f)}`);
    console.log("not comments and steps' names alone: floor rule 3's two security reviews");
    process.exit(1);
  }
  console.log(read.length
    ? `comments and steps' names alone in .github/, .claude/ and actions, ${base.slice(0, 7)}..${head.slice(0, 7)}: ${read.map(clean).join(", ")}`
    : `nothing changed in .github/, .claude/ or an action.yml, ${base.slice(0, 7)}..${head.slice(0, 7)}`);
  console.log(`checked head ${head}`);
  if (others.length) {
    console.log(`also changed, outside what this proof reads: ${others.map(clean).join(", ")}`);
    console.log("rule 8's one review only where the \"Security review:\" comment says of each of these why it runs neither by itself nor with credentials; otherwise floor rule 3's two");
    process.exit(2);
  }
}
