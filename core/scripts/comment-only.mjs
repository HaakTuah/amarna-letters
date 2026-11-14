// Is this pull request's change to what runs by itself only comments and steps' names (floor rule 3)? Such a change
// passes one security review, floor rule 8's, instead of rule 3's two. Its builder runs it from a checkout of the
// core's `main`, never from the pull request's own copy, which the pull request could change, in the pull request's
// clone with the head that merges checked out, up to date with `main` (floor rule 12):
//
//   node <the core's main>/scripts/comment-only.mjs [<a commit already reviewed>]
//
// It reads the head commit, not the working tree, against the merge base with the project's main (fetched), or against
// the commit given, one before the head that it grew from, for a later commit reviewed only for what it changes (floor
// rule 8); a head not up to date with main is refused, being no head that merges. It reads every file the pull request
// changes under .github/ or .claude/ (the folders themselves too, any case, at any depth), and every action.yml, a
// project's own action: each must be a YAML file changed in place, its mode kept, no link or submodule there on either
// side, whose two versions differ only in YAML comments, blank lines between entries, and the `name` of a job's steps.
// A step's name is the first key of an item under `jobs.<job>.steps` that YAML reads as text: holding no `${{` and no
// backslash, which in quotes could spell one, so nothing is evaluated; quoted and not empty, or plain from a letter and
// none of the words YAML reads as null, true or false. A comment a tool may read as an instruction (an ignore, a
// disable, a skip, a linter's or scanner's name) must stand word for word beside the same line as before, and the note
// beside an action's version (`uses:`) must stand. It reads YAML as GitHub's parser does where it reads it at all, and
// refuses, rather than guess, every line it cannot read for sure: a tab, a carriage return or another control character
// or line break; a value that runs on to the next line (a quoted or plain one, or one in [ ] or { }); a quote or #
// inside [ ] or { }; an anchor, alias, tag, explicit key or document marker. A line inside a block scalar (`run: |`) is
// text, a # line too, and changes nothing only where it is unchanged. Of the files outside what it reads, it refuses
// those that run by themselves or decide what does (RUNS_TOO below) and lists the rest: it exits 0 where there are
// none, 1 where it refuses, and 2 where others changed, which the session's "Security review:" comment says of, file by
// file, why each runs neither by itself nor with credentials (modules/reviews.md, point 3). It prints the head it
// checked, for that comment and the merge. Git and Node's own modules only; it changes nothing.
import { execFileSync } from "node:child_process";
import { started } from "./started.mjs";

export const RUNS = /(?:^|\/)(?:\.(?:github|claude)(?:\/|$)|action\.ya?ml$)/iu; // what runs by itself, as far as this proof reads it
const YAML = /\.ya?ml$/iu;
// what YAML 1.1 or 1.2 reads as a line break besides \n, a tab, a byte order mark, and every other control character
const UNREAD = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff]/u;
const HEADER = /^[|>](?:[1-9][+-]?|[+-][1-9]?)?(?: +(#.*)?)?$/u; // a block scalar's header, with its comment if any
// what else runs by itself or decides what does, refused outright: Claude Code's servers; an editor's, a container's or
// a shell's setup and git's hooks; npm's and .NET's packages, tools, configs and builds (MSBuild runs a project's
// targets) and the Node or SDK they pick; a task runner's file; the copy of the core; git's own attributes and
// submodules; a container's build; and a name with "~" and a digit, which Windows can read as another folder's short
// name (CLAUDE~1 for .claude)
export const RUNS_TOO = /(?:^|\/)(?:\.mcp\.json|package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|\.yarnrc(?:\.yml)?|\.npmrc|\.node-version|\.nvmrc|\.envrc|\.devcontainer\.json|\.pre-commit-config\.ya?ml|\.gitmodules|\.gitattributes|Dockerfile[^/]*|Makefile|GNUmakefile|justfile|Taskfile\.ya?ml|\.tool-versions|\.?mise\.toml|nuget\.config|global\.json|dotnet-tools\.json|packages\.lock\.json|[^/]+\.(?:csproj|fsproj|vbproj|props|targets))$|(?:^|\/)\.(?:vscode|devcontainer|husky)\/|^core\/|(?:^|\/)[^/]*~\d/iu;
// a comment a tool may read as an instruction (a check silenced, a linter told to look away)
const DIRECTIVE = /\b(?:ignore|disable|suppress|skip|allowlist|nosec|noqa|nosemgrep|semgrep|nolint|noinspection|nocheck|codeql|zizmor|actionlint|shellcheck|checkov|trivy|gitleaks|lint|pragma)/iu;
// a plain step's name YAML 1.1 or 1.2 reads as no string
const NOT_TEXT = /^(?:~|null|true|false|yes|no|on|off|y|n)$/iu;

// one node from `at`: { kind, text, end, comment } (kind "key" for a key, its text without the ":"), or { why }
function node(rest, at) {
  while (rest[at] === " ") at++;
  if (at >= rest.length) return { kind: "empty", text: "", start: at, end: at, comment: null };
  const c = rest[at], next = rest[at + 1];
  const spaced = next === undefined || next === " ";
  if (c === "#") return rest[at - 1] === " " ? { kind: "empty", text: "", start: at, end: at, comment: at } : { why: "a # that opens no comment" };
  if (c === "|" || c === ">") {
    const m = HEADER.exec(rest.slice(at));
    if (!m) return { why: "a block scalar's header this proof does not read" };
    const comment = m[1] === undefined ? null : rest.length - m[1].length;
    const text = rest.slice(at, comment ?? rest.length).replace(/ +$/u, "");
    return { kind: "block", text, start: at, end: rest.length, comment, fixed: /[1-9]/u.test(text) };
  }
  if (c === "-" && spaced) return { why: "a sequence on a key's line" };
  if (c === ":" && spaced) return { why: "a key with no name" };
  if ("&*!".includes(c)) return { why: "an anchor, alias or tag" };
  if ("?%@`".includes(c)) return { why: "an explicit key or a character YAML reserves" };
  if ("]},".includes(c)) return { why: "a [ ] or { } out of place" };
  if (c === "[" || c === "{") {
    let depth = 0, j = at;
    for (; j < rest.length; j++) {
      const ch = rest[j];
      if (`"'#&*!`.includes(ch)) return { why: "a quote, #, anchor, alias or tag inside [ ] or { }" };
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) return { why: "a [ ] or { } that runs on to the next line" };
    return after(rest, at, j, "flow");
  }
  if (c === '"' || c === "'") {
    let j = at + 1;
    for (; j < rest.length; j++) {
      if (c === '"' && rest[j] === "\\") { j++; continue; }
      if (rest[j] === c) { if (c === "'" && rest[j + 1] === "'") { j++; continue; } break; }
    }
    if (j >= rest.length) return { why: "a quoted value that runs on to the next line" };
    return after(rest, at, j + 1, "quoted");
  }
  // a plain scalar: it ends at " #" (a comment) or at ": " or a final ":" (a key)
  for (let j = at; j < rest.length; j++) {
    if (rest[j] === "#" && rest[j - 1] === " ") return { kind: "plain", text: rest.slice(at, j).replace(/ +$/u, ""), start: at, end: j, comment: j };
    if (rest[j] === ":" && (j + 1 === rest.length || rest[j + 1] === " ")) return { kind: "key", text: rest.slice(at, j), start: at, end: j + 1, comment: null };
  }
  return { kind: "plain", text: rest.slice(at).replace(/ +$/u, ""), start: at, end: rest.length, comment: null };
}

// what may follow a quoted value or one in [ ] or { }: nothing, a comment, or the ":" that makes it a key
function after(rest, at, end, kind) {
  let j = end;
  while (rest[j] === " ") j++;
  if (j >= rest.length) return { kind, text: rest.slice(at, end), start: at, end, comment: null };
  if (rest[j] === "#" && j > end) return { kind, text: rest.slice(at, end), start: at, end, comment: j };
  if (rest[j] === ":" && (j + 1 === rest.length || rest[j + 1] === " ") && kind === "quoted") return { kind: "key", text: rest.slice(at, end), start: at, end: j + 1, comment: null };
  return { why: `text after a ${kind === "flow" ? "[ ] or { }" : "quoted value"}` };
}

/** How YAML reads `text`, line by line: { lines, unread }. Each line kept is either a block scalar's ("content", as it
 *  stands) or one with its entries (items, the "- " before its key or value; key; value); comment lines and blank lines
 *  between entries are left out, a line's own comment cut off. `unread` says, by line, what this proof cannot read. */
export function readYaml(text) {
  const unread = [], lines = [], comments = [];
  const bad = UNREAD.exec(text);
  if (bad) return { lines, comments, unread: [`line ${text.slice(0, bad.index).split("\n").length}: a tab, carriage return, byte order mark, or another control character or line break`] };
  const raw = text.split("\n");
  let block = null; // in a block scalar: { from, at }, the line that opened it and, once read, its content's indentation
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i], n = i + 1;
    const indent = /^ */u.exec(line)[0].length;
    const blank = indent === line.length;
    if (block) {
      if (block.at === undefined && !blank) block.at = block.fixed ? block.from + 1 : Math.max(block.from + 1, indent);
      if (blank || indent >= (block.at ?? Infinity)) { lines.push({ n, content: true, text: line }); continue; }
      block = null;
    }
    if (blank) continue;
    const rest = line.slice(indent);
    if (rest[0] === "#") { comments.push({ text: rest, at: lines.length, own: true }); continue; }
    if (/^(?:---|\.\.\.)(?: |$)/u.test(rest)) { unread.push(`line ${n}: a document marker`); continue; }
    let at = 0, items = 0;
    while (rest[at] === "-" && (at + 1 === rest.length || rest[at + 1] === " ")) { items++; at++; while (rest[at] === " ") at++; }
    let first = node(rest, at), key = null, keyCol = null, value = first;
    if (first.why) { unread.push(`line ${n}: ${first.why}`); continue; }
    if (first.kind === "key") {
      key = first.text; keyCol = indent + at;
      value = node(rest, first.end);
      if (value.why) { unread.push(`line ${n}: ${value.why}`); continue; }
      if (value.kind === "key") { unread.push(`line ${n}: two keys on one line`); continue; }
      if (value.kind !== "empty" && rest[first.end] !== " ") { unread.push(`line ${n}: a value with no space after its key`); continue; }
    }
    const cut = value.comment === null ? rest.length : value.comment;
    const valueAt = value.kind === "empty" ? null : indent + value.start;
    const note = rest.slice(cut);
    if (note) comments.push({ text: note, at: lines.length, own: false });
    lines.push({ n, indent, items, key, keyCol, kind: value.kind, value: value.text, valueAt, note, text: line.slice(0, indent + cut).replace(/ +$/u, "") });
    if (value.kind === "block") block = { from: indent, fixed: value.fixed };
  }
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
  const kept = l => l.content ? `C${l.text}` : `L${l.stepName ? `${l.text.slice(0, l.valueAt)}\u0000a step's name` : l.text}`;
  const x = a.lines.map(kept), y = b.lines.map(kept);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    const where = (lines, side) => lines[i] ? `${side} line ${lines[i].n}` : `${side}: nothing`;
    return { why: `more than a comment or a step's name changed (${where(a.lines, "before")}, ${where(b.lines, "after")})` };
  }
  // a comment that a tool may read as an instruction, added, changed or moved (a tool reads it on its own line, or on
  // the line after it): each must stand, word for word, beside the same line as before, by its place, the two versions'
  // lines being matched one to one by now (two lines may read alike); the note beside an action's version (`uses:`)
  const placed = (side, c) => `${c.own ? "before" : "on"} ${c.at}\u0000${c.text}`;
  const left = new Map();
  for (const c of a.comments) if (DIRECTIVE.test(c.text)) left.set(placed(a, c), (left.get(placed(a, c)) ?? 0) + 1);
  for (const c of b.comments) {
    if (!DIRECTIVE.test(c.text)) continue;
    const key = placed(b, c);
    if (left.get(key)) { left.set(key, left.get(key) - 1); continue; }
    return { why: `a comment a tool may read as an instruction, added or moved: ${c.text.slice(0, 80)}` };
  }
  const note = a.lines.findIndex((l, i) => l.key === "uses" && l.note !== b.lines[i].note);
  if (note >= 0) return { why: `the note beside an action's version changed (before line ${a.lines[note].n}, after line ${b.lines[note].n})` };
  return { same: true };
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
    base = git(["rev-parse", "--verify", "--end-of-options", `${process.argv[2]}^{commit}`]).trim();
    let grew = base !== head;
    try { git(["merge-base", "--is-ancestor", base, head]); } catch { grew = false; }
    if (!grew) {
      console.log(`${clean(process.argv[2])} is no commit before the head that it grew from: a later commit is read only against one before it`);
      process.exit(1);
    }
  }
  const fields = git(["-c", "core.quotePath=false", "diff", "--raw", "-z", "--no-renames", "--no-abbrev", "--no-ext-diff", "--ignore-submodules=none", base, head]).split("\0");
  const fails = [], read = [], others = [];
  // a link or a submodule where this proof reads, on either side: what it points to is not read
  for (const commit of [base, head]) {
    for (const entry of git(["ls-tree", "-r", "-z", "--full-tree", commit]).split("\0")) {
      const [meta, file] = entry.split("\t");
      if (file && RUNS.test(file) && /^1[26]0000 /u.test(meta)) fails.push(`${file}: a link or submodule, at ${commit.slice(0, 7)}`);
    }
  }
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const blob = sha => utf8.decode(git(["cat-file", "blob", sha], "buffer"));
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const [modeA, modeB, shaA, shaB, status] = fields[i].replace(/^:/u, "").split(" ");
    const file = fields[i + 1];
    if (!RUNS.test(file)) { if (RUNS_TOO.test(file)) fails.push(`${file}: a file that runs by itself or decides what does`); else others.push(file); continue; }
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
