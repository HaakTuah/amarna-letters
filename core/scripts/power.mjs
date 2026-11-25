#!/usr/bin/env node
// What runs with power, and which later commits of a pull request touch none of it (#1134, points 1 and 4;
// tasks/reviews.md, "What a posted review stands for"). The set, as this script reads it from a tree of the repository,
// starts from its seeds:
//   - a workflow (.github/workflows/) with a write permission (its value on the line of its scope or the next, in any
//     letters), a secret (by its name, by an index, or the secrets whole, in any letters), or no top-level
//     `permissions:`, where the host's default token, which may write, is what it gets;
//   - an action (an action.yml or action.yaml in any folder);
//   - .claude/, and what comment-only.mjs, beside this file, reads as running by itself beyond .github/ (RUNS_TOO: an
//     agent tool's own folder, hooks, the files that say what installs or builds);
//   - a script whose own text calls GitHub, the network or `git push` (CALLS), or loads a module by a plain name that is
//     no path and none of Node's own modules that reach nothing beyond the machine (LOCAL): a package (axios), or
//     https; or by a name it builds that does not start as a path (UNPLACED), which may be a package's; a file with no
//     extension whose text starts with `#!` among them; and a script that cannot be read.
// Where any seed stands, every file of the tree that may run joins it: every file but text, data and pictures (INERT:
// Markdown, JSON, YAML, a picture and the like), so a script, an action, a file of a compiled language's source and a
// file with no extension (an executable is often named so: `./deploy`) each join, whatever their language. No name is followed from one file to another, so no
// form of naming, building or hiding a name can leave a file out; a tree with no seed has an empty set. The copy of the
// core at the path the manifest names is left out. Code an agent changes is read as data alone: its text is matched,
// never run. A tree is read from a folder on disk (the default branch's checkout) or from a commit of a git clone
// (`git ls-tree`, `git cat-file`), never checked out.
//
// Run by the core's workflow security-review.yml from the default branch's copy, in the clone of the head's commits it
// fetches (which checks out nothing), it prints, as JSON:
//   { "power": [the paths of the pull request's files in the set, at the default branch or at the head],
//     "light": [the commits of the pull request, each with one parent among its commits, whose changed paths are in the
//     set neither at the parent nor at the commit] }
// which security-review.mjs reads (POWER): floor rule 3's two reviews where "power" holds a path, and a review carried
// across the light commits.
// A commit it could not read in the time it has (DEADLINE, the seconds since the epoch by which it stops; the newest
// commits first) is not light, so its review is asked as before. Git and Node's own modules only.
//
// Usage (in that clone):  node scripts/power.mjs <the pull request, as GitHub's API gives it> <its commits, the same>
//                           <its files, the same> <the default branch's checkout>
//         node scripts/power.mjs --list [<folder>]   prints the set of a folder on disk (the repository's root by
//                                                   default), a path a line with what brought it in (a seed's power,
//                                                   place, calls or unread; runs, a file that may run beside a seed)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { RUNS_TOO } from "./comment-only.mjs";
import { started } from "./started.mjs";

const SHA = /^[0-9a-f]{40}$/u;
// a file of text, data or a picture, which runs nothing by itself (an action's own action.yml aside)
const INERT = /\.(?:md|markdown|txt|rst|adoc|json|jsonc|ya?ml|csv|tsv|png|jpe?g|gif|svg|webp|ico|bmp|pdf)$/iu;
// a script or a compiled language's source, by its name: a file whose text is read for a call that makes it a seed
export const SCRIPT = /\.(?:[cm]?[jt]sx?|sh|bash|zsh|py|ps1|psm1|rb|pl|php|lua|bat|cmd|go|rs|java|kts?|scala|groovy|cs|fs|vb|swift|dart|exs?|r|jl|c|cc|cpp|h|hpp)$/iu;
export const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/u; // a workflow of the host's, by its path
const ACTION = /(?:^|\/)action\.ya?ml$/iu;
// what a workflow's line says of power, comment lines aside, in any letters: a write permission (`<scope>: write`, the
// scope quoted or not, the value after a tag or an anchor, or on the next line), write-all, or the secrets in any form
// (`secrets.NAME`, an index, `inherit`, a declared one, `toJSON(secrets)`) but the token the job's own permissions
// bound (secrets.GITHUB_TOKEN)
const POWERED = /(?:^|\n)[ \t]*[^#\n][^\n]*?(?:\bwrite-all\b|\b[a-z-]+["']?[ \t]*:(?:[ \t]*#[^\n]*)?\s*(?:[!&][^\s]*\s+)*["']?write["']?[ \t]*(?:[,}#]|\n|$)|\bsecrets\b(?!\.GITHUB_TOKEN\b))/iu;
const PERMISSIONS = /(?:^|\n)permissions[ \t]*:/u;
// a call to GitHub, the network or `git push`, as a script's text shows it
export const CALLS = /\bfetch[ \t]*\(|\bnode:(?:https?|http2|net|tls|dgram)\b|\b(?:require\([ \t]*|from[ \t]+|import[ \t]+)["'](?:https?|http2|net|tls|dgram)["']|\bXMLHttpRequest\b|\bWebSocket\b|\bcurl\b|\bwget\b|\bInvoke-(?:WebRequest|RestMethod)\b|\burllib\b|\bsocket\b|\bhttp\.client\b|\bhttpx\b|\baiohttp\b|\bNet::HTTP\b|["']net\/http["']|\bjava\.net\b|\bSystem\.Net\b|\bHttpClient\b|\breqwest\b|\bURLSession\b|\b(?:ssh|scp|rsync|nc)[ \t]+|\brequests\.(?:get|post|put|patch|delete|request)\b|\bgh[ \t]+(?:api|pr|issue|release|run|repo|workflow|auth|secret|label|search)\b|["']gh["']|api\.github\.com|\bGH_TOKEN\b|\bGITHUB_TOKEN\b|\bgit[ \t]+(?:push|fetch|clone|pull|ls-remote)\b|["'](?:push|fetch|clone|pull|ls-remote)["']/u;
// a module a script loads by a name written whole (`import x from "y"`, `import "y"`, `export * from "y"`, `import("y")`,
// `require("y")`, `module.require("y")`, `require 'y'`), the name a string of its own (one inside another string, a
// test's fixture, loads nothing), or by a name built at run time that does not start as a path; and Node's own modules
// that reach nothing beyond the machine: any other name that is no path (a package, `https`, `node:dns`, a URL), and
// any built one, may call out
const LOCAL = new Set(["assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto", "diagnostics_channel", "events", "fs", "module", "os", "path", "perf_hooks", "process", "querystring", "readline", "stream", "string_decoder", "test", "timers", "tty", "url", "util", "v8", "vm", "worker_threads", "zlib"]);
function outward(text) {
  const strings = [], marked = text.replace(STRING, (...string) => { strings.push(string[1] ?? string[2] ?? string[3]); return `\u0001${strings.length - 1}\u0001`; });
  return UNPLACED.test(bare(text)) || [...marked.matchAll(/(?:(?:^|[^\w$.])from|(?:^|[^\w$])(?:import|require))\s*\(?\s*\u0001(\d+)\u0001/gu)].map(([, at]) => strings[Number(at)])
    .some((name) => /^[^\s\\]+$/u.test(name) && !/^(?:\.{0,2}\/|#|file:)/u.test(name) && !LOCAL.has(name.replace(/^node:/u, "").split("/")[0]));
}
// a module loaded by a name built at run time that does not start as a path or a file's URL: an import( or require(
// whose argument is no plain string, and is not one
const LOADING = String.raw`(?:^|\n)[ \t]*(?!\/\/|\*|#)[^\n]*?\b(?:import|require)[ \t]*\([ \t]*(?!["'][^"'\n$]*["'][ \t]*[,)]`;
const UNPLACED = new RegExp(`${LOADING}|[\`"'](?:\\.{0,2}\\/)|[\\w.]*pathToFileURL\\()`, "u");
// a module's own code, whose comments run nothing
const MODULE = /\.(?:[cm]?[jt]sx?)$/iu;
// a module's code with its comments out (`code`), a `///` directive of TypeScript's, which may add a file, and each
// string and regular expression kept (so a `//` inside one is no comment); and with its strings left empty but for a
// path's start (`bare`)
const COMMENTS = /(?<!\\)\/\*[\s\S]*?\*\/|(?<![/\\])\/\/(?!\/)[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|(?<=(?:^|[(,=:[!&|?{};]|\breturn)[ \t]*)\/(?![/*])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[a-z]*/gmu;
const code = (text) => text.replace(COMMENTS, (found) => (/^\/[/*]/u.test(found) ? " " : found));
const bare = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\$]|\\.|\$(?!\{))*`/gu,
  (found) => (/^["'`]/u.test(found) ? `"${found.slice(1).match(/^\.{0,2}\//u)?.[0] ?? ""}"` : " "));
// a quoted string, its text the first group of the three that matches
const STRING = /`([^`]*)`|"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/gu;
// the largest text read: a file past it is held in the set, unread
const LARGEST = 1 << 20;

// a text with its line ends as LF alone, so a file written with CRLF (as Windows may) reads as one written with LF
const lf = (text) => (text === null ? null : text.replace(/\r\n?/gu, "\n"));
// whether a workflow's text gives it power
export const powered = (text) => text === null || POWERED.test(lf(text)) || !PERMISSIONS.test(lf(text));
// whether a path has no extension: an executable named so (`deploy`, `bin/release`) is run as a script is
const unextended = (name) => path.posix.extname(name) === "";
// whether a path is in the set by where it stands alone
const placed = (name) => ACTION.test(name) || name.startsWith(".claude/") || RUNS_TOO.test(name);
// whether a path is one that may run: any but text, data and pictures
export const runnable = (name) => ACTION.test(name) || !INERT.test(name);
// whether a path may run with power, read by its name alone: where the set could not be read (security-review.mjs)
export const mayRun = (name) => placed(name) || runnable(name);

// The set of a tree: `paths`, every file's path; `read(path)`, its text, or null where it cannot be read or is too large;
// `links`, where given, the paths of its submodules, each code another repository holds, which may run;
// `copy`, the folder of the core's copy as the manifest names it, left out (only a sync changes it, its code reviewed in
// the core's own pull request; a repository whose manifest names none, the core's own among them, leaves out nothing).
// `why`, where given, is filled with what brought each path in.
export function setOf({ paths, read: raw, copy, links = new Set() }, why = new Map()) {
  const read = (name) => lf(raw(name));
  const own = paths.filter((name) => typeof name === "string" && !(typeof copy === "string" && copy !== "" && name.startsWith(copy)));
  const found = new Map();
  for (const name of own) { const seed = seedOf(name, read); if (seed) found.set(name, seed); }
  if (found.size) for (const name of own) if ((runnable(name) || links.has(name)) && !found.has(name)) found.set(name, "runs");
  for (const [name, from] of found) why.set(name, from);
  return new Set(found.keys());
}
// why a file is a seed (power, place, unread or calls), or null where it is not
function seedOf(name, read) {
  if (WORKFLOW.test(name)) return powered(read(name)) ? "power" : null;
  if (placed(name)) return "place";
  if (!SCRIPT.test(name)) { const text = unextended(name) ? read(name) : null; return text !== null && text.startsWith("#!") && calls(text) ? "calls" : null; }
  const text = read(name);
  if (text === null) return "unread";
  return calls(MODULE.test(name) ? code(text) : text) ? "calls" : null;
}
const calls = (text) => CALLS.test(text) || outward(text);

// A tree on disk: every file under `root`, .git and node_modules aside.
export function diskTree(root) {
  const paths = [];
  const walk = (at) => {
    for (const entry of readdirSync(path.join(root, at), { withFileTypes: true })) {
      const name = at ? `${at}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { if (entry.name !== ".git" && entry.name !== "node_modules") walk(name); }
      else if (entry.isFile() || entry.isSymbolicLink()) paths.push(name);
    }
  };
  walk("");
  const read = (name) => {
    try { const file = path.join(root, name); return statSync(file).size > LARGEST ? null : readFileSync(file, "utf8"); } catch { return null; }
  };
  return { paths, read };
}

const git = (args, cwd, input) => execFileSync("git", args, { cwd, input, encoding: "utf8", stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"], maxBuffer: 1 << 28 });
// A tree of a commit in the git repository at `cwd`, its texts read in one call of git's, never checked out; a
// submodule's pointer (a gitlink) is a path of it, among its `links`.
export function gitTree(commit, cwd) {
  const entries = git(["ls-tree", "-r", "-z", "--full-tree", "-l", commit], cwd).split("\0").filter(Boolean).map((line) => {
    const tab = line.indexOf("\t"), name = line.slice(tab + 1);
    const [, type, sha, size] = line.slice(0, tab).split(/ +/u);
    return { name, type, sha, size: Number(size) };
  });
  const links = new Set(entries.filter((entry) => entry.type === "commit").map((entry) => entry.name));
  const wanted = entries.filter((entry) => entry.type === "blob").filter((entry) => WORKFLOW.test(entry.name) || SCRIPT.test(entry.name) || unextended(entry.name) || placed(entry.name));
  const texts = new Map();
  const small = wanted.filter((entry) => entry.size <= LARGEST);
  if (small.length) {
    const out = execFileSync("git", ["cat-file", "--batch"], { cwd, input: small.map((entry) => entry.sha).join("\n") + "\n", maxBuffer: 1 << 28 });
    let at = 0;
    for (const entry of small) {
      const end = out.indexOf(10, at);
      const size = Number(out.subarray(at, end).toString("utf8").split(" ")[2]);
      texts.set(entry.name, out.subarray(end + 1, end + 1 + size).toString("utf8"));
      at = end + 1 + size + 1;
    }
  }
  return { paths: entries.filter((entry) => entry.type === "blob" || entry.type === "commit").map((entry) => entry.name), read: (name) => texts.get(name) ?? null, links };
}

// The paths of a pull request's files (`files`, as GitHub's API gives them, a moved file by both its names) in any of `sets`.
export const powerOf = (files, ...sets) => [...new Set(flat(files).flatMap((file) => [file.filename, file.previous_filename])
  .filter((name) => typeof name === "string" && sets.some((set) => set.has(name))))].sort();

const flat = (pages) => (Array.isArray(pages) ? pages.flat() : []).filter((entry) => entry !== null && typeof entry === "object");

// Of a pull request's commits (`commits`, as GitHub's API gives them), the light ones: one parent, that parent a commit
// of the pull request's, and no path it changes in the set at the parent or at the commit, read with `setAt(commit)`
// and `changed(parent, commit)`; the newest first, until `deadline` (a time in milliseconds) passes.
export function lightOf(commits, { setAt, changed, deadline = Infinity, now = Date.now }) {
  const list = flat(commits).filter((commit) => typeof commit.sha === "string" && SHA.test(commit.sha));
  const ours = new Set(list.map((commit) => commit.sha));
  const light = [];
  for (const commit of [...list].reverse()) {
    if (now() > deadline) break;
    const parents = commit.parents;
    if (!Array.isArray(parents) || parents.length !== 1 || !ours.has(parents[0]?.sha)) continue;
    try {
      const names = changed(parents[0].sha, commit.sha);
      const before = setAt(parents[0].sha), after = setAt(commit.sha);
      if (!names.some((name) => before.has(name) || after.has(name))) light.push(commit.sha);
    } catch { /* a commit not read is not light */ }
  }
  return light;
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2);
  const fail = (why, mend) => { console.error(`FAIL: scripts/power.mjs ${why}. Mend: ${mend}`); process.exit(1); };
  if (args[0] === "--list") {
    const root = args[1] ?? ".";
    if (!existsSync(root)) fail(`found no folder ${root}`, "give the folder of a repository's checkout, or none for the one you stand in");
    const copy = existsSync(path.join(root, "core-manifest.md")) ? (await import("./core-path.mjs")).copyOf(root) : undefined;
    const why = new Map();
    for (const name of [...setOf({ ...diskTree(root), copy }, why)].sort()) console.log(`${name}\t${why.get(name)}`);
    process.exit(0);
  }
  const [pullFile, commitsFile, filesFile, baseDir] = args;
  if (!pullFile || !commitsFile || !filesFile || !baseDir) {
    console.error("usage: node scripts/power.mjs <the pull request, as JSON> <its commits, as JSON> <its files, as JSON> <the default branch's checkout>");
    process.exit(2);
  }
  const read = (file) => {
    try { return JSON.parse(readFileSync(file, "utf8")); }
    catch (e) { return fail(`could not read ${file} as JSON (${e.code ?? e.name})`, "write it again from the GitHub API, as the security-review workflow does, and run the check again"); }
  };
  const pull = read(pullFile), commits = read(commitsFile), files = read(filesFile);
  const head = pull?.head?.sha;
  if (typeof head !== "string" || !SHA.test(head)) fail("was given a pull request with no head commit", "give it the pull request as GitHub's API gives it");
  const copy = existsSync(path.join(baseDir, "core-manifest.md")) ? (await import("./core-path.mjs")).copyOf(baseDir) : undefined;
  const sets = new Map();
  const setAt = (commit) => { if (!sets.has(commit)) sets.set(commit, setOf({ ...gitTree(commit, "."), copy })); return sets.get(commit); };
  const changed = (parent, commit) => git(["diff-tree", "-r", "-z", "--no-renames", "--name-only", parent, commit], ".").split("\0").filter(Boolean);
  const deadline = Number(process.env.DEADLINE) * 1000 || Infinity;
  let atHead;
  try { atHead = setAt(head); } catch (e) { fail(`could not read the head ${head} in this clone (${e.code ?? e.name})`, "run it in a clone that holds the head's commits, as the security-review workflow fetches them"); }
  const power = powerOf(files, setOf({ ...diskTree(baseDir), copy }), atHead);
  console.log(JSON.stringify({ power, light: lightOf(commits, { setAt, changed, deadline }) }));
}
