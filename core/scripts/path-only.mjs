// Is this pull request's change to the floor or the review guidelines only paths that follow files it moves (floor rule
// 3, "The owner's yes in the PR"; #886, point 1)? Such a change asks no yes of the owner: a pointer that only follows a
// moved file cannot widen a session's mandate. The description check (pr-description.mjs, beside this file) runs it on
// the merge commit against its base, and asks the yes only of the files it does not prove; a builder may run it, from
// a checkout of the core's `main`, in the pull request's clone with the head checked out:
//
//   node <the core's main>/scripts/path-only.mjs [<the base, by default the merge base with origin/main>]
//
// A file the PR moves is a regular file on both sides, no link, that git finds renamed with its content whole
// (`-M100%`), and a folder it moves one whose files all moved so: the old path stands no more at the head, the new one
// stood nowhere at the base, and the new one holds what the old held. A file that asks the yes (owner-yes.mjs's asks)
// is proven where it is changed in place, a regular file on both sides, and its two versions are the same text but
// where a path of such a move stands between backticks in the old and that move's new path in the same place in the
// new, both paths in the core's own folders (OWN: a path a rule writes for something outside the repository, `actions/`,
// is never one a file planted under it moves). It refuses, never guessing, a file that asks the yes and is added,
// deleted or moved itself, a move into or out of such a path, every other change of a word, and every file where the
// pull request changes this script, the description check, its workflow, what that workflow sets up before the check
// (the installer, .node-version, the core's packages), or a file of the repository any of these scripts imports at any
// depth, as the base holds them (ownFiles), so that the code that proves is always `main`'s, as floor rule 3 asks,
// though the description check runs the pull request's copy. Git and Node's own modules; it changes nothing.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { asks } from "./owner-yes.mjs";
import { started } from "./started.mjs";

export { INVALID };
export const SELF = "scripts/path-only.mjs";
// Where the proof starts: the check that runs it, the installer its job runs first, and itself. The files whose code
// decides it are these and every file of the repository they import, at any depth, with the workflow that runs the
// check and what it sets up from (SETUP; a path ending in "/" is a folder): where the pull request changes one, the code
// that runs is not `main`'s.
export const ROOTS = ["scripts/pr-description.mjs", "scripts/install.mjs", SELF];
export const WORKFLOW = ".github/workflows/own-description.yml";
// (the root's package files and .npmrc too: setup-node would restore its npm cache from them, its cache turned off
// in the workflow all the same; a .gitattributes, in any folder, decides the bytes the checkout writes)
export const SETUP = [".node-version", ".packages/", ".gitattributes", "package.json", "package-lock.json", "npm-shrinkwrap.json", ".npmrc"];
export const decides = (own, p) => own.has(p) || p.endsWith("/.gitattributes") || SETUP.some(s => (s.endsWith("/") ? p.startsWith(s) : p === s));
const IMPORT = /^\s*(?:import|export)\b[^"'`]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']|^\s*import\s*["'](\.{1,2}\/[^"']+)["']/gmu;

// The files `ROOTS` import at any depth, as `textOf(path)` gives each (null: not there), with the workflow.
export function ownFiles(textOf) {
  const seen = new Set([WORKFLOW]), todo = [...ROOTS];
  while (todo.length) {
    const file = todo.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = textOf(file);
    if (text === null) continue;
    for (const m of text.matchAll(IMPORT)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1] ?? m[2])));
  }
  return seen;
}
const REGULAR = "100644";
const UTF8 = new TextDecoder("utf-8", { fatal: true }), INVALID = Symbol("no UTF-8");

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// The spellings of each move, old to new: each path between backticks alone, as the pointer check
// (pointers.mjs --core, on every pull request) reads it and fails one that leads to no file, so a spelling followed
// always named a file that stood; a folder also with its closing "/". A move justifies no pointer where either path
// lies outside the core's own folders (OWN) or holds anything but ASCII letters, digits, ".", "_", "-" and "/", or asks
// the yes, or is what a tool reads by a fixed name or place (FIXED: a dot file or folder, such as .claude/settings.json
// or .github/, and a rule file's name): it changes what a rule holds, not a pointer.
// (a path any part of which starts with ".", or whose file is named as a tool reads it)
// (and, since a file system may ignore case or trailing dots, a rule file's name in any case, a part ending in ".", and a
// name Windows keeps for a device)
const FIXED = p => p.split("/").some(part => part.startsWith(".") || part.endsWith(".") || /^(?:con|prn|aux|nul|com\d|lpt\d)(?:\..*)?$/iu.test(part)) || /^(?:AGENTS|CLAUDE|GEMINI|REVIEW|SECURITY)\.md$|^(?:LICENSE|NOTICE)(?:\.\w+)?$/iu.test(p.split("/").at(-1));
// (the core's own top folders that a project's copy carries, a fixed list no pull request steers: a path a rule writes
// under one names the core's file; reports/, tests/ and words/ stay out of the copy, .gitattributes)
export const OWN = ["archive", "inventory", "modules", "roles", "scripts", "setup", "tasks", "tools"];
const own = p => OWN.includes(p.split("/")[0]) && p.includes("/");
const SAFE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
export function spellings(moves) {
  const pairs = new Map();
  const add = (a, b) => pairs.set(`\`${a}\``, `\`${b}\``);
  for (const { from, to, folder } of moves) {
    if (asks(from) || asks(to) || from === to || !SAFE.test(from) || !SAFE.test(to) || FIXED(from) || FIXED(to) || !own(from) || !own(to)) continue;
    add(from, to);
    if (folder) add(`${from}/`, `${to}/`);
  }
  return pairs;
}

// `text` cut at each path of `names` (old or new, the longest first): literal text and paths, in turn, from a literal.
export function tokens(text, names) {
  if (!names.length) return [text];
  const alt = [...names].sort((a, b) => b.length - a.length).map(escape).join("|");
  const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_./-])(?:${alt})(?![\\p{L}\\p{M}\\p{N}_-]|[./][\\p{L}\\p{N}_])`, "gu");
  const out = [];
  let at = 0;
  for (const m of text.matchAll(re)) { out.push(text.slice(at, m.index), m[0]); at = m.index + m[0].length; }
  out.push(text.slice(at));
  return out;
}

// Where `one` first differs from `other`, some forty characters of it, on one line.
const near = (one, other) => { let i = 0; while (i < one.length && one[i] === other[i]) i++; return one.slice(Math.max(0, i - 20), i + 20).replace(/\s+/gu, " "); };

// Why `after` is not `before` with paths of `pairs` (spellings) followed, or null where it is.
export function follows(before, after, pairs) {
  const names = [...new Set([...pairs.keys(), ...pairs.values()])];
  const a = tokens(before, names), b = tokens(after, names);
  if (a.length !== b.length) return "it changes more than paths: a path stands where the other side has none";
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (i % 2 === 0) return `it changes words that are no path of a move: "${near(a[i], b[i])}" becomes "${near(b[i], a[i])}"`;
    if (pairs.get(a[i]) !== b[i]) return `the path ${a[i]} becomes ${b[i]}, which is not where the pull request moves it`;
  }
  return null;
}

// The verdict on each changed file that asks the yes. `changed`: [{ path, status ("M", "A", "D"...), before, after,
// modes: [base's, head's] }]; `moves`: [{ from, to, folder }]; `self`: the first file the pull request changes of
// those that decide the proof (ownFiles, SETUP), or false.
// Returns { proven: [path], refused: [{ path, why }] }.
export function verdicts({ changed, moves, self = false }) {
  const pairs = spellings(moves), proven = [], refused = [];
  for (const f of changed) {
    if (!asks(f.path)) continue;
    const why = self ? `the pull request changes ${self}, which decides the proof (the proof, the check that runs it, its workflow, what that sets up from, or a file they import), so the code that would run is not main's`
      : f.status !== "M" ? "it is added, deleted or moved, not changed in place"
      : f.modes?.[0] !== REGULAR || f.modes?.[1] !== REGULAR ? "it is not a regular file on both sides, its mode kept"
      : f.before === INVALID || f.after === INVALID ? "a side of it is no UTF-8 text"
      : follows(f.before, f.after, pairs);
    if (why) refused.push({ path: f.path, why }); else proven.push(f.path);
  }
  return { proven, refused };
}

// The folders a file's move moves with it: the old and new paths cut at each common trailing part.
export function foldersOf(from, to) {
  const a = from.split("/"), b = to.split("/"), out = [];
  while (a.length > 1 && b.length > 1 && a.at(-1) === b.at(-1)) { a.pop(); b.pop(); out.push({ from: a.join("/"), to: b.join("/") }); }
  return out;
}

// Whether `to` names, but for the case of its letters, another file or folder of `files` (the head's), as one file to a
// checkout on a file system that ignores case, where a pointer to it would open the other.
export function collides(to, files) {
  const parts = to.split("/");
  return files.some(f => {
    const other = f.split("/");
    for (let k = 0; k < Math.min(parts.length, other.length); k++) {
      if (other[k].toLowerCase() !== parts[k].toLowerCase()) return false;
      if (other[k] !== parts[k]) return true;
    }
    return false;
  });
}

// Whether a line of `git diff --raw` (":<mode> <mode> <id> <id> <status>") is a regular file renamed whole.
export const moved = line => { const [a, b, , , status] = line.replace(/^:/u, "").split(" "); return status === "R100" && /^100(?:644|755)$/u.test(a ?? "") && /^100(?:644|755)$/u.test(b ?? ""); };
const run = (cwd, args) => { const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 26 }); return r.status === 0 ? r.stdout : null; };
const fields = out => (out === "" ? [] : out.replace(/\0$/u, "").split("\0"));

// The moves from `base` to `head` in `cwd`: each file git finds renamed whole, and each folder (foldersOf) that stands
// no more, whose new path stood nowhere and each of whose files moved whole beneath it; null where git cannot say.
function movesOf(cwd, base, head) {
  const renamed = run(cwd, ["diff", "--raw", "-M100%", "--diff-filter=R", "-z", base, head]);
  if (renamed === null) return null;
  const moves = [], r = fields(renamed);
  // (a link's text kept is not what it points to kept, so a link, or anything but a regular file, moves nothing)
  for (let i = 0; i + 2 < r.length; i += 3) if (moved(r[i])) moves.push({ from: r[i + 1], to: r[i + 2] });
  const atHead = run(cwd, ["ls-tree", "-r", "--name-only", "-z", head]);
  if (atHead === null) return null;
  const headFiles = fields(atHead);
  const files = new Set(moves.map(m => `${m.from}\0${m.to}`)), seen = new Set();
  const stands = (at, p) => run(cwd, ["cat-file", "-e", `${at}:${p}`]) !== null;
  // (both ways: each file of the old folder moved to the new, and each file of the new came from the old, none added)
  const under = (at, dir) => { const listed = run(cwd, ["ls-tree", "-r", "--name-only", "-z", at, "--", `${dir}/`]); return listed === null ? null : fields(listed); };
  const whole = d => { const was = under(base, d.from), is = under(head, d.to); return was !== null && is !== null && was.length === is.length && was.every(f => files.has(`${f}\0${d.to}${f.slice(d.from.length)}`)); };
  for (const d of moves.flatMap(m => foldersOf(m.from, m.to))) {
    if (seen.has(`${d.from}\0${d.to}`)) continue;
    seen.add(`${d.from}\0${d.to}`);
    if (!stands(head, d.from) && !stands(base, d.to) && whole(d)) moves.push({ ...d, folder: true });
  }
  // (a move to a path another of the head's bears but for case follows nothing)
  return moves.filter(m => !collides(m.to, headFiles));
}

// One changed file as verdicts takes it: of one that asks the yes, its modes and, changed in place, its two texts.
function fileOf(cwd, base, head, status, path) {
  if (!asks(path)) return { path, status };
  const mode = at => (run(cwd, ["ls-tree", at, "--", path]) ?? "").split(" ")[0];
  // (read as bytes and refused where they are no UTF-8, which would decode two different bytes the same)
  const text = at => { if (status !== "M") return null; const r = spawnSync("git", ["show", `${at}:${path}`], { cwd, maxBuffer: 1 << 26 }); try { return r.status === 0 ? UTF8.decode(r.stdout) : null; } catch { return INVALID; } };
  return { path, status, modes: [mode(base), mode(head)], before: text(base), after: text(head) };
}

// What git says of the change from `base` to `head` in `cwd`, as verdicts takes it, or null where git cannot say.
export function read(cwd, base, head) {
  const all = run(cwd, ["diff", "--name-status", "--no-renames", "-z", base, head]), moves = movesOf(cwd, base, head);
  if (all === null || moves === null) return null;
  const names = fields(all), changed = [];
  for (let i = 0; i + 1 < names.length; i += 2) changed.push(fileOf(cwd, base, head, names[i], names[i + 1]));
  if (changed.some(f => f.status === "M" && asks(f.path) && (f.before === null || f.after === null))) return null;
  const own = ownFiles(p => run(cwd, ["show", `${base}:${p}`]));
  return { changed, moves, self: changed.find(f => decides(own, f.path))?.path ?? false };
}

// The paths of `asked` (the files that ask the yes) that the change from base to head proves only follow moves: [] where
// git cannot say.
export function proven(cwd, base, head, asked) {
  const got = read(cwd, base, head);
  return got === null ? [] : verdicts(got).proven.filter(p => asked.includes(p));
}

// The line a refused file fails with, its mend.
export const failure = ({ path, why }) => `FAIL: ${path} asks the owner's yes: ${why}. Mend: quote the owner's yes for it under "The owner's word" (floor rule 3), or take out of this pull request every change to it but paths that follow a file the pull request moves`;

function main() {
  const cwd = process.cwd(), given = process.argv[2];
  const head = run(cwd, ["rev-parse", "HEAD"])?.trim();
  const base = given ?? run(cwd, ["merge-base", "HEAD", "origin/main"])?.trim();
  if (!head || !base) {
    console.log(`FAIL: git could not give the head or the base${given ? ` ${given}` : " (the merge base with origin/main)"}. Mend: run it in the pull request's clone with the head checked out, after git fetch origin main, or name the base`);
    process.exit(1);
  }
  const got = read(cwd, base, head);
  if (got === null) { console.log(`FAIL: git could not read the change from ${base} to ${head}. Mend: fetch both commits (git fetch origin main) and run it again`); process.exit(1); }
  const { proven: ok, refused } = verdicts(got);
  console.log(`checked head ${head} against ${base}`);
  for (const p of ok) console.log(`ok   ${p}: only paths that follow files the pull request moves`);
  for (const r of refused) console.log(failure(r));
  if (!ok.length && !refused.length) console.log("ok   nothing here asks the owner's yes: the change touches neither the floor nor the review guidelines");
  process.exit(refused.length ? 1 : 0);
}

if (started(import.meta.url)) main();
