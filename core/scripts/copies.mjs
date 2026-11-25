// The copies check ("One fact, one place" in the core's roles/shared/how-to-work.md): fails when the same run of code (8
// lines that are more than brackets, 240 characters at least) or of the rule files' prose (12 words) stands in two
// places, unless the baseline lists every window of it (a run of lines or words) in as many places, as one of the old
// copies, which are removed over time and never added to. A listed window gone or in fewer places fails too, so the
// baseline only shrinks. A copy may move (cut from one place, pasted in another), since its places do not grow: moving
// is how a fact reaches its better home. Against the base the config holds too: the baseline stays at the base's path,
// and every file the base's config, and the base's SECURITY.md where it is asked, read is read still, as the same kind,
// one renamed by its new name, or by the file that took in most of its lines (#348, #371, #434); a path may be
// added; and a config moved, with the call that names it, is held to the one the base called (#370). It also lists the near-copies, the runs of code that match once names and numbers are set aside, and fails
// none of them. Node's own modules, and the schemas' checker (schemas.mjs) for its config's shape, which where the core's
// packages cannot be installed it leaves unchecked, saying so, so the check needs no install step. It runs from the project's
// root, whatever the directory it is started from.
// The files an agent tool takes its instructions from are rule files too, read since #405 (rule-files.mjs, `toolFiles`),
// and a project may hold copies in them from before. Nothing locks a project (AGENTS.md of the core): until the
// baseline lists it, a copy in one of those files that the pull request's base held, in as many places, is noted and
// fails nothing, as is every such copy where there is no base to read against (a push to main); one the base did not
// hold fails. --tools lists them, and against the base the baseline may grow by those alone.
//
//   node core/scripts/copies.mjs <config>            the check
//   node core/scripts/copies.mjs <config> --write    lower the baseline to what still stands (it never adds a copy)
//   node core/scripts/copies.mjs <config> --tools    list in the baseline the copies in an agent tool's files, and
//                                                    lower the rest as --write does
//   node core/scripts/copies.mjs <config> --first    write the first baseline, the copies that stand when a project
//                                                    takes the check; only where no baseline exists yet
//
// The config, a JSON file the project keeps (its *copies check* slot names it), says what is checked: "baseline", the
// baseline's path; "code" and "prose", lists of git pathspecs (":!" leaves a path out); and "proseFromSecurity": true
// to add the project's rule files: those floor rule 3 names, those its SECURITY.md adds, and an agent tool's
// (rule-files.mjs, beside it); "tests", git pathspecs of the files that are tests, and "twice", each value written in two
// files to why both must hold it, for the part that reads a value too short for these runs, a pin or a pattern
// (copies-values.mjs, beside it, which says what it reads and fails).
import "./whole-output.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inProject, leadsOut, logged, unrooted } from "./guards.mjs";
import { readAt, ruleFiles, toolFiles } from "./rule-files.mjs";
import { whole } from "./core-owned.mjs";
import { readBlobs } from "./blobs.mjs";
import { projectAt } from "./core-path.mjs";
import { keysOf, shapeFaults } from "./schemas.mjs";
import { didNotRun } from "./packages.mjs";
import { uncommented } from "./yaml-keys.mjs";
import { valuesTwice } from "./copies-values.mjs";
// Where the core stands from the root, so a mend names the path a session types: "core/" in a project, nothing in the
// core's own repository, which runs the check on itself (AGENTS.md of the core, "The core abides by its own rules").
// (git says it, as the path from the root to this folder, so no spelling of a path, such as Windows' short names,
// can differ)
const fail = msg => { console.error(`FAIL: ${logged(msg)}`); process.exit(1); };
const HERE = fileURLToPath(new URL(".", import.meta.url));
// (the project's root, a project's whose library carries its core in a submodule included: core-path.mjs)
const where = projectAt(HERE);
if (!where.root) fail(`copies.mjs stands in no git work tree, and the check reads the files git lists. Mend: run the script that stands in the repository's clone (core/scripts/copies.mjs in a project)`);
const ROOT = where.root, CORE = where.prefix.replace(/scripts\/$/u, "");
const SELF = `node ${CORE}scripts/copies.mjs`, TEMPLATE = `${CORE}setup/template/copies.json.tmpl`;
const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const configPath = process.argv.slice(2).find(a => !a.startsWith("--"));
if (!configPath) fail(`no config was named. Mend: name it: ${SELF} <config> [--write | --tools | --first]`);
// (the config's path from the root, as git names it at the base: git says it, as it says the root, so no spelling of a
// path can differ, and unquoted, -z, so a name outside plain ASCII is the name itself; for a config git does not list
// yet, both folders are made real first (the config's own name kept, a link it is stays the project's), since on Windows git names the root by its long name where Node may name a
// temporary folder by its short one, RUNNER~1, and a path made relative from one to the other leads out of the root)
const real = p => { try { return fs.realpathSync.native(p); } catch { return p; } };
let CONFIG_AT;
try { CONFIG_AT = git(["ls-files", "-z", "--full-name", "--error-unmatch", "--", configPath]).split("\0")[0]; } catch { CONFIG_AT = path.relative(real(ROOT), path.join(real(path.dirname(path.resolve(configPath))), path.basename(configPath))).split(path.sep).join("/"); }
let config;
try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { fail(`cannot read the config ${configPath} as JSON. Mend: write the config as the starter kit does (${TEMPLATE}): a JSON object with "baseline", the baseline's path, "code" and "prose", lists of git pathspecs, and "proseFromSecurity": true or false`); }
process.chdir(ROOT);
// A key it does not know, or one of the wrong shape, would check less without a word, so it fails: its schema holds
// the config's shape (scripts/schemas/copies.json, schemas.mjs). Where the core's packages are not installed, they are
// installed first (packages.mjs; #1093, point 1); where they cannot be, the shape is not checked, said as a warning,
// and the check goes on (AGENTS.md of the core, "Nothing locks a project").
const KEYS = keysOf("copies"), faults = shapeFaults("copies", config, CORE);
if (faults === null) console.log(didNotRun("The config's shape was not checked", "ajv"));
for (const f of faults ?? []) console.error(`FAIL: ${logged(f)}`);
if (faults?.length) process.exit(1);
// (unchecked, what the check itself reads must still be there: an object that names its baseline, lists of paths alone)
if (faults === null && !(config && typeof config === "object" && !Array.isArray(config) && typeof config.baseline === "string" && config.baseline)) fail(`the config is not a JSON object that names its "baseline". Mend: write the config as the starter kit does (${TEMPLATE}): a JSON object with "baseline", the baseline's path, "code" and "prose", lists of git pathspecs, and "proseFromSecurity": true or false`);
const list = v => (Array.isArray(v) ? v.filter(x => typeof x === "string" && x) : []);
// (the baseline is read, and written, only inside the project, as a file of its own reached through no link out of it)
if (!inProject(config.baseline) || leadsOut(ROOT, path.join(ROOT, config.baseline))) fail(`the config's "baseline", ${config.baseline}, lies outside the project. Mend: name the baseline by its path from the project's root, with no ".." that leads above it, as a file of the project's own reached through no link that leads out of it (${TEMPLATE})`);
const BASELINE = config.baseline;
const CODE_SPECS = list(config.code), PROSE_SPECS = list(config.prose);
let fromSecurity = null;
// The project's rule files, as `read` and `list` find them (rule-files.mjs): those SECURITY.md lists, each a pathspec as
// it is written there, and an agent tool's, each a literal path, so that a name of a glob's form names itself alone.
const withTools = (read, list) => {
  const rules = ruleFiles(read, list), named = new Set(rules);
  return rules.concat(toolFiles(read, list).filter(f => !named.has(f)).map(f => `:(literal)${f}`));
};
const security = () => { if (!fromSecurity) try { fromSecurity = withTools(); } catch (e) { fail(e.message); } return fromSecurity; };
const proseSpecs = PROSE_SPECS.concat(config.proseFromSecurity === true ? security() : []);
const TOOLS = process.argv.includes("--tools"), WRITE = TOOLS || process.argv.includes("--write");
if (!CODE_SPECS.length && !proseSpecs.length) fail('the config names nothing to check. Mend: list the code in "code" and the prose in "prose", as git pathspecs, or set "proseFromSecurity" to true');
const LINES = 8, MIN_CHARS = 240, WORDS = 12;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// Code: each line trimmed, its spaces collapsed; blank lines and lines of brackets, punctuation or a bare comment mark skipped.
function codeUnits(text) {
  const out = [];
  text.split('\n').forEach((raw, i) => {
    const t = raw.trim().replace(/\s+/g, ' ');
    if (!t || /^[\s{}()[\];,.:]*$/.test(t) || /^(\/\/|\*|\/\*|\*\/)\s*$/.test(t)) return;
    out.push({ t, line: i + 1 });
  });
  return out;
}
// Prose: the words, in lower case, without punctuation.
function proseUnits(text) {
  const out = [];
  text.split('\n').forEach((raw, i) => {
    for (const w of raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')) if (w) out.push({ t: w, line: i + 1 });
  });
  return out;
}
// The `size` units from `i` on, joined.
const windowAt = (u, i, size, joiner) => u.slice(i, i + size).map(x => x.t).join(joiner);
// Every window of every file, read in order: the units per file, and the places each window's hash stands in.
function indexWindows(files, units, size, joiner, minChars, read) {
  const perFile = new Map(), seen = new Map();
  for (const f of files) {
    const u = units(read(f));
    perFile.set(f, u);
    for (let i = 0; i + size <= u.length; i++) {
      const s = windowAt(u, i, size, joiner);
      if (s.length < minChars) continue;
      const h = hash(s);
      if (!seen.has(h)) seen.set(h, []);
      seen.get(h).push({ file: f, at: i });
    }
  }
  return { perFile, seen };
}
// The windows that stand in at least two places that do not overlap, each with those places.
function apartPlaces(seen, size) {
  const dup = new Map();
  for (const [h, list] of seen) {
    const apart = list.filter((p, k) => list.some((q, m) => m !== k && (q.file !== p.file || Math.abs(q.at - p.at) >= size)));
    if (apart.length >= 2) dup.set(h, apart);
  }
  return dup;
}
// How many units a copy runs: it grows while its next window stands in exactly the same places, one further on; where
// the places change (a part copied once more, or once less), a new copy starts, so no part of a block hides another
// copy of it.
function copyLength(places, size, joiner, perFile, dup) {
  let len = size;
  for (;;) {
    const step = len - size + 1;
    const next = places.map(p => windowAt(perFile.get(p.file), p.at + step, size, joiner));
    const there = next[0] && dup.get(hash(next[0]));
    if (next.some(t => t !== next[0]) || !there || there.length !== places.length
      || !places.every(p => there.some(q => q.file === p.file && q.at === p.at + step))) break;
    len++;
  }
  return len;
}
// One copy: the hashes of its windows, its files, its places as file:first-last line, and how it starts.
function describeCopy(places, len, size, joiner, perFile, u, i) {
  const windows = [];
  for (let k = 0; k <= len - size; k++) windows.push(hash(windowAt(u, i + k, size, joiner)));
  return {
    windows,
    files: places.map(p => p.file),
    places: places.map(p => { const pu = perFile.get(p.file); return `${p.file}:${pu[p.at].line}-${pu[Math.min(p.at + len - 1, pu.length - 1)].line}`; }),
    starts: windowAt(u, i, size, joiner).replace(/\n/g, ' / ').slice(0, 80),
  };
}
// Every run of `size` units found in two places that do not overlap; overlapping finds of one copy merge into one,
// keyed by a hash of its first run, so its key stays the same while the copy stands.
function find(files, units, size, joiner, minChars, read = f => fs.readFileSync(f, "utf8")) {
  const { perFile, seen } = indexWindows(files, units, size, joiner, minChars, read);
  const dup = apartPlaces(seen, size);
  const copies = [], used = new Set();
  for (const [f, u] of perFile) {
    for (let i = 0; i + size <= u.length; i++) {
      if (used.has(f + ':' + i)) continue;
      const s = windowAt(u, i, size, joiner);
      if (s.length < minChars) continue;
      const h = hash(s), places = dup.get(h);
      if (!places || places[0].file !== f || places[0].at !== i) continue;
      const len = copyLength(places, size, joiner, perFile, dup);
      for (const p of places) for (let k = 0; k <= len - size; k++) used.add(p.file + ':' + (p.at + k));
      copies.push(describeCopy(places, len, size, joiner, perFile, u, i));
    }
  }
  return { copies, dup };
}

// An empty list checks nothing: git ls-files would list every file. `env` names another index (lsAt, below).
const ls = (specs, env = process.env) => {
  if (!specs.length) return [];
  try { return execFileSync("git", ["ls-files", "-z", "--", ...specs], { env, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] }).split("\0").filter(Boolean); }
  catch (e) { return fail(`git cannot read the pathspecs ${specs.join(" ")}: ${unrooted(String(e.stderr || e.message).trim().split(/\r?\n/u)[0], ROOT)}. Mend: write each as a plain git pathspec, a path or a glob, with ":!" before one to leave it out, where it stands: in the config's "code" or "prose", or, for a rule file, on SECURITY.md's "the rule files:" line`); }
};
// The files pathspecs read in a commit's tree, as git lists them there: from an index of that tree, written to a
// folder of its own and taken away after, so that every pathspec reads as it does in the tree as it stands.
function lsAt(commit, specs) {
  if (!specs.length) return [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copies-")), env = { ...process.env, GIT_INDEX_FILE: path.join(dir, "index") };
  try {
    execFileSync("git", ["read-tree", commit], { env, stdio: "ignore" });
    return ls(specs, env);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
// What became of a commit's files in the tree as git holds it now: { to: each renamed file's new name, gone: those
// deleted, grown: those added or changed, each with its blob at the commit (null where it is new) and now }, read by
// the blob ids git gives, never by a path, which a name such as "0:x" would turn to another file. A file of the core's
// copy (core/ in a project) that moved counts as gone, not followed: a sync moves those, and the core's own pull
// request held the move, so a sync never fails for it.
function renamed(commit) {
  const to = new Map(), gone = new Set(), grown = new Map();
  const parts = git(["diff", "-M", "--raw", "--no-abbrev", "-z", "--cached", commit, "--"]).split("\0");
  for (let i = 0; i < parts.length;) {
    if (!parts[i].startsWith(":")) { i += 1; continue; }
    const [, , was, now, status] = parts[i].slice(1).split(" ");
    if (/^[RC]/u.test(status)) {
      if (status[0] === "R" && CORE && parts[i + 1].startsWith(CORE)) gone.add(parts[i + 1]);
      else if (status[0] === "R") to.set(parts[i + 1], parts[i + 2]);
      i += 3;
    }
    else {
      if (status === "D") gone.add(parts[i + 1]);
      else if (status === "A" || status === "M") grown.set(parts[i + 1], { was: /^0+$/u.test(was) ? null : was, now });
      i += 2;
    }
  }
  return { to, gone, grown };
}
// The lines of a text that hold a letter or a number of any script, as proseUnits reads them, each once, trimmed: what
// a file "holds" of another's.
const wordLines = text => new Set(String(text ?? "").split(/\r\n|\r|\n/u).map(l => l.trim()).filter(l => /[\p{L}\p{N}]/u.test(l)));
// Where the text of a commit's files that git calls deleted went: to the file the tree adds or changes whose new
// lines hold more than half of its own, so that one renamed and rewritten past half, which git reads as deleted and
// added, or one moved into another file, is followed all the same (#434); null where none does, the file deleted with
// its text. Only the lines a file gained count, so a copy that stood before is never taken for the text moved; a file
// of fewer than three such lines is never followed, since two lines as common as a heading and a "TODO" are no text
// moved. No file of the core's copy takes it in, as a sync moves those, and a file whose text cannot be read, binary
// or past a megabyte, takes none (blobs.mjs). The files are read only once a deleted file is looked up.
const FOLLOWED_FROM = 3;
function linesMoved(commit, grown) {
  const to = new Map(), show = readAt(commit);
  let index = null;
  const indexed = () => {
    const map = new Map(), mine = [...grown].filter(([f]) => !(CORE && f.startsWith(CORE)));
    const read = readBlobs(mine.flatMap(([, b]) => [b.was, b.now]));
    if (read.failure) fail(read.failure);
    const text = read.text;
    for (const [f, { was, now }] of mine) {
      if (!text.has(now) || (was && !text.has(was))) continue;
      const had = wordLines(was && text.get(was));
      for (const l of wordLines(text.get(now))) if (!had.has(l)) (map.get(l) ?? map.set(l, []).get(l)).push(f);
    }
    return map;
  };
  return f => {
    if (!to.has(f)) {
      index ??= indexed();
      const was = wordLines(show(f)), held = new Map();
      for (const l of was) for (const a of index.get(l) ?? []) held.set(a, (held.get(a) ?? 0) + 1);
      to.set(f, was.size < FOLLOWED_FROM ? null : [...held].find(([, n]) => n * 2 > was.size)?.[0] ?? null);
    }
    return to.get(f);
  };
}
// A config of this check's at a path of a commit, or null: an object of this check's keys alone that names its
// baseline, and that baseline, there, an object of "windows", so that another check's config (the shape check's, which
// names a baseline too) is never taken for one.
function configAt(commit, at) {
  const json = file => { try { return JSON.parse(git(["show", `${commit}:${file}`])); } catch { return null; } };
  const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const c = json(at);
  if (!object(c) || typeof c.baseline !== "string" || Object.keys(c).some(k => !KEYS.includes(k))) return null;
  const windows = json(c.baseline)?.windows;
  return object(windows) ? c : null;
}
// The configs the workflows call this check with, at a commit or (null) as git holds them now: each `config:` value
// and each word after `copies.mjs` on a line, comments left out, of each file git lists that is a file (no link
// followed); what is no config of this check's is passed over where it is read (configAt).
const CALLED = [/^[ \t-]*config:[ \t]*(["']?)([^\s"']+)\1[ \t]*$/u, /copies\.mjs["']?[ \t]+(["']?)([^\s"';&|]+)\1/gu];
function called(commit) {
  const files = (commit ? lsAt(commit, [".github/workflows"]) : ls([".github/workflows"])).filter(f => /\.ya?ml$/iu.test(f));
  const found = new Set();
  for (const f of files) {
    let text = "";
    if (commit) try { text = git(["show", `${commit}:${f}`]); } catch { /* (no such file there: none called) */ }
    else if (fs.lstatSync(f, { throwIfNoEntry: false })?.isFile()) text = fs.readFileSync(f, "utf8");
    for (const line of text.split(/\r\n|\r|\n/u).map(uncommented)) {
      for (const m of [CALLED[0].exec(line), ...line.matchAll(CALLED[1])]) if (m) found.add(m[2].replace(/^\.\//u, ""));
    }
  }
  return found;
}
// The base's config, each as { at, config }: the one at this config's path; where the base holds none there, each its
// workflows called that the tree's workflows call no more, or call where the tree no longer holds it (a config moved
// with its call); else none.
function heldTo(commit) {
  const here = configAt(commit, CONFIG_AT);
  if (here) return [{ at: CONFIG_AT, config: here }];
  // (a call to a config the tree no longer holds could never run; a path the system cannot even look up, too long or
  // through a file, holds none, the safe side, so the base's config is held)
  const held = at => { try { return fs.lstatSync(at, { throwIfNoEntry: false })?.isFile() === true; } catch { return false; } };
  const now = new Set([...called(null)].filter(held));
  return [...called(commit)].filter(at => !now.has(at)).map(at => ({ at, config: configAt(commit, at) })).filter(h => h.config);
}
// The files an agent tool takes its instructions from that the check read no other way (rule-files.mjs, `toolFiles`),
// at a commit (`show` reads its files, `list` a folder of its tree) or in the work tree: where a project may hold
// copies from before the check read them (#405). None where the config reads no rule files.
function toolsOnly(show, list, specs) {
  if (!config.proseFromSecurity) return new Set();
  let rules;
  try { rules = show ? ruleFiles(show, list) : ruleFiles(); } catch { return new Set(); }
  const before = new Set(specs(PROSE_SPECS.concat(rules)));
  return new Set(specs((show ? toolFiles(show, list) : toolFiles()).map(f => `:(literal)${f}`)).filter(f => !before.has(f)));
}
const TOOL_ONLY = toolsOnly(null, null, ls);
// What a commit held of the copies in those files: each prose window that stood there with one of its places in such a
// file, by its hash, and in how many places. Read only where a copy or the baseline asks it.
function toolCopiesAt(commit) {
  const show = readAt(commit), list = dir => lsAt(commit, [dir]), there = specs => lsAt(commit, specs);
  const tools = toolsOnly(show, list, there);
  if (!tools.size) return new Map();
  let rules;
  try { rules = withTools(show, list); } catch { return new Map(); }
  const { dup } = find(there(PROSE_SPECS.concat(rules)), proseUnits, WORDS, " ", 0, f => show(f) ?? "");
  return new Map([...dup].filter(([, at]) => at.some(p => tools.has(p.file))).map(([h, at]) => [h, at.length]));
}
let atBase = null;
const stood = (h, n) => !!process.env.COPIES_BASE && TOOL_ONLY.size > 0 && ((atBase ??= toolCopiesAt(process.env.COPIES_BASE)).get(h) ?? 0) >= n;
const runs = [find(ls(CODE_SPECS), codeUnits, LINES, "\n", MIN_CHARS), find(ls(proseSpecs), proseUnits, WORDS, " ", 0)];
const found = runs.flatMap(r => r.copies);
const places = new Map(runs.flatMap(r => [...r.dup].map(([h, list]) => [h, list.length])));
// (the copies that stand in an agent tool's file, and their windows)
const inTools = c => c.files.some(f => TOOL_ONLY.has(f));
const toolWindows = new Set(found.filter(inTools).flatMap(c => c.windows));
if (process.argv.includes("--first")) {
  if (fs.existsSync(BASELINE)) fail(`${BASELINE} exists, and --first writes only a project's first baseline. Mend: run the check without --first, or --write to lower the baseline`);
  fs.writeFileSync(BASELINE, JSON.stringify({ windows: Object.fromEntries([...places].sort()) }, null, 2) + "\n");
  console.log(`${BASELINE}: the first baseline, ${found.length} old copies in ${places.size} windows, to be removed over time`);
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) fail(`no baseline at ${BASELINE}. Mend: write the project's first with ${SELF} ${configPath} --first, and commit it`);
let base;
try { base = JSON.parse(fs.readFileSync(BASELINE, "utf8")); } catch { fail(`cannot read ${BASELINE} as JSON. Mend: take it back as main holds it (git checkout origin/main -- ${BASELINE}), then run --write to lower it`); }
if (!base || typeof base.windows !== "object" || base.windows === null || Array.isArray(base.windows)) fail(`${BASELINE} has no "windows" object. Mend: take it back as main holds it (git checkout origin/main -- ${BASELINE}); { "windows": {} } lists none`);
// A count is a whole number of places, at least two; anything else would let a copy through, so it fails.
const counted = (w, where) => {
  const bad = Object.entries(w || {}).filter(([h, n]) => !/^[0-9a-f]{12}$/.test(h) || !Number.isInteger(n) || n < 2);
  if (bad.length) { console.error(`FAIL: ${logged(where)} holds ${bad.length} windows without a whole count of two or more. Mend: take the baseline back as main holds it (git checkout origin/main -- ${BASELINE}), then run --write to lower it`); process.exit(1); }
  return w;
};
counted(base.windows, BASELINE);
// The baseline holds the old copies window by window: each run of lines or words that is copied, by its hash, and how
// many places it stands in. Every copied window must be listed with at least as many places, so a copy that is new,
// spreads to another place, grows, or is copied in part fails.
// The baseline only shrinks against the branch a PR merges into (COPIES_BASE, set by the workflow): a window it adds or a
// count it raises there fails, whoever wrote it.
const from = process.env.COPIES_BASE;
if (from) {
  try { git(["rev-parse", "--verify", `${from}^{commit}`]); } catch { console.error(`FAIL: COPIES_BASE ${from} is not a commit here. Mend: fetch it (git fetch origin ${from}) before the check runs`); process.exit(1); }
  // The config is held to the base's too, so that the check never reads less than it did there (#348): the baseline
  // stays where the base keeps it (one moved would be held to nothing), and every file the base's config read is read
  // still, as code or prose as it was: each the base's specs read in the tree as it stands, and each they read at the
  // base, followed through a rename, or to the file that took in most of its lines, a file deleted with its text
  // being no narrowing (#371, #434). The base's config is the one at this path, or, where the base holds none here,
  // each config its workflows called that the tree's workflows call no more, so that a config moved with its call is
  // held all the same (#370). A config beside one still called, or where the base called none, is the check's first
  // on that branch, held to nothing. Any widening passes.
  const held = heldTo(from);
  if (held.length) {
    const at = held.map(h => h.at).join(" and "), moved = held[0].at !== CONFIG_AT;
    const who = moved ? `${CONFIG_AT}, called in place of ${at} (the config ${from}'s workflows call),` : CONFIG_AT;
    const back = `Mend: take the config back as ${from} holds it (git checkout ${from} -- ${at})${moved ? ", and name it in the call again" : ""}, then widen it if need be: a path may be added, never taken out`;
    if (!held.some(h => h.config.baseline === BASELINE)) fail(`${who} moves the baseline from ${held.map(h => h.config.baseline).join(" and ")} to ${BASELINE} against ${from}, and a baseline moved is held to nothing there. ${back}`);
    // (each config the base called read on its own: one's ":!" leaves out only what that one read)
    const specs = (h, key) => Array.isArray(h.config[key]) ? h.config[key].filter(x => typeof x === "string" && x) : [];
    const moves = renamed(from), movedTo = linesMoved(from, moves.grown), was = new Map();
    const lost = (kind, before, now) => {
      const keep = new Set(ls(now)), at = lsAt(from, before);
      for (const f of at.filter(f => moves.gone.has(f))) { const to = movedTo(f); if (to) was.set(to, f); }
      const read = new Set([...ls(before), ...at.map(f => (moves.gone.has(f) ? movedTo(f) : moves.to.get(f) ?? f)).filter(Boolean)]);
      return [...read].filter(f => !keep.has(f)).map(f => `${f} (${kind}${was.has(f) ? `, which took in most of the lines of ${was.get(f)}, deleted` : ""})`);
    };
    // (the base's rule files as its own SECURITY.md lists them, so a file taken off that list is no narrowing unseen)
    let wasRules = [];
    if (held.some(h => h.config.proseFromSecurity === true)) try { wasRules = withTools(readAt(from), dir => lsAt(from, [dir])); } catch { /* the base read none */ }
    const less = [...new Set(held.flatMap(h => lost("code", specs(h, "code"), CODE_SPECS).concat(lost("prose", specs(h, "prose").concat(h.config.proseFromSecurity === true ? wasRules : []), proseSpecs))))];
    if (less.length) fail(`${who} reads ${less.length} files fewer than ${from}'s config read: ${less.slice(0, 5).join(", ")}${less.length > 5 ? ", and more" : ""}. ${back}`);
  }
  let there = true;
  try { git(["cat-file", "-e", `${from}:${BASELINE}`]); } catch { there = false; } // no baseline on that branch yet
  const old = there ? counted(JSON.parse(git(["show", `${from}:${BASELINE}`])).windows, `${from}:${BASELINE}`) || null : null;
  // (save a window of a copy that stands in an agent tool's file and that the base held there in as many places:
  // listing what stood is what --tools does, and the base is the list until it is written; #405)
  const raised = old ? Object.entries(base.windows).filter(([h, n]) => (!(h in old) || n > old[h]) && !(toolWindows.has(h) && stood(h, n))) : [];
  if (raised.length) { console.error(`FAIL: ${logged(BASELINE)} adds or raises ${raised.length} windows against ${from}, and the baseline only shrinks. Mend: take it back as ${from} holds it (git checkout ${from} -- ${BASELINE}), point the new copy to one place, and run --write`); process.exit(1); }
}
// Near-copies (tasks/code-shape.md, "Near-copies are reported"; #246): the runs of code that match once names and
// numbers are set aside, and are no exact copy. Reported, never failed: code that only looks alike is no second copy
// of a fact, and whether one function should serve both is a reader's call, the audit's.
const KEPT = new Set(("if else for while do switch case default break continue return function class const let var new try catch finally throw import export from async await yield typeof "
  + "instanceof in of void delete this super extends static public private protected readonly interface type enum namespace def elif pass lambda with as and or not is using struct foreach true false null").split(" "));
const skeleton = line => line.replace(/\b\d[\w.]*/g, "0").replace(/[A-Za-z_$][\w$]*/g, w => (KEPT.has(w) ? w : "N"));
const NEAR_CHARS = 120;
function nearCopies() {
  const lines = new Map();
  const exact = place => {
    const [, file, from, to] = /^(.*):(\d+)-(\d+)$/.exec(place);
    if (!lines.has(file)) lines.set(file, fs.readFileSync(file, "utf8").split("\n"));
    return codeUnits(lines.get(file).slice(from - 1, to).join("\n")).map(u => u.t).join("\n");
  };
  return find(ls(CODE_SPECS), text => codeUnits(text).map(u => ({ ...u, t: skeleton(u.t) })), LINES, "\n", NEAR_CHARS).copies.filter(c => new Set(c.places.map(exact)).size > 1);
}
if (!WRITE) {
  const near = nearCopies();
  if (near.length) console.log(`note ${near.length} ${near.length === 1 ? "run of code matches another" : "runs of code match others"} once names and numbers are set aside (reported, never failed: the audit's reader judges whether one function should serve both)`);
  for (const c of near.slice(0, 10)) console.log(`  ${logged(c.places.join(" and "))}`);
  if (near.length > 10) console.log(`  and ${near.length - 10} more`);
}
// (--tools: every window of a copy in an agent tool's file listed, in as many places as it stands in now)
if (TOOLS) for (const c of found.filter(inTools)) for (const h of c.windows) base.windows[h] = Math.max(base.windows[h] ?? 0, places.get(h));
const over = h => !(h in base.windows) || places.get(h) > base.windows[h];
// (a copy in an agent tool's file that the baseline does not list yet: noted where the base held it, or where there is
// no base to read against; #405)
const before = c => inTools(c) && (!process.env.COPIES_BASE || c.windows.filter(over).every(h => stood(h, places.get(h))));
// (a copy whose every place is a file the core writes whole, an agent tool's entry file of the starter kit's: the
// kit's own text, which a sync writes and the core answers for, noted and failing nothing; core-owned.mjs, #1083)
const kits = c => c.files.every(whole);
const fresh = found.filter(c => c.windows.some(over) && !before(c) && !kits(c)), unlisted = found.filter(c => c.windows.some(over) && before(c) && !kits(c));
for (const c of found.filter(c => c.windows.some(over) && kits(c))) console.log(`note ${logged(`a copy in the core's own files, as the starter kit writes them: ${c.places.join(" and ")} (it starts "${c.starts}")`)}: the core's text, failing nothing`);
const shrunk = Object.keys(base.windows).filter(h => !places.has(h) || places.get(h) < base.windows[h]);
for (const c of unlisted) console.log(`note ${logged(`an old copy in an agent tool's file, not yet in the baseline: ${c.places.join(" and ")} (it starts "${c.starts}")`)}: ${process.env.COPIES_BASE ? "the pull request's base held it" : "with no base to read against"}, so it fails nothing; list it with ${SELF} ${logged(configPath)} --tools, and commit ${logged(BASELINE)}`);
for (const c of fresh) console.error(`FAIL: ${logged(`a new copy: ${c.places.join(' and ')} (it starts "${c.starts}")`)}. Mend: keep it in the one place it belongs and point there from the others`);
if (WRITE) {
  base.windows = Object.fromEntries(Object.entries(base.windows).filter(([h]) => places.has(h)).map(([h, n]) => [h, Math.min(n, places.get(h))]));
  fs.writeFileSync(BASELINE, JSON.stringify(base, null, 2) + '\n');
  console.log(`${logged(BASELINE)}: ${Object.keys(base.windows).length} windows kept, ${shrunk.length} lowered or dropped${TOOLS ? `, the copies in an agent tool's files listed` : ""}`);
  if (fresh.length) process.exit(1);
} else {
  if (shrunk.length) console.error(`FAIL: ${logged(BASELINE)} lists ${shrunk.length} windows that are gone or in fewer places now. Mend: run ${SELF} ${logged(configPath)} --write and commit the baseline it lowers`);
  if (!fresh.length && !shrunk.length) console.log(`ok   no new copies (${found.length - unlisted.length} old ones, listed in ${logged(BASELINE)}, to be removed${unlisted.length ? `; ${unlisted.length} in an agent tool's files, noted above` : ""})`);
  // (a value written out in two files, a pin or a pattern, too short for the runs above: copies-values.mjs)
  const values = valuesTwice({ core: CORE, config, configPath, configAt: CONFIG_AT, base: process.env.COPIES_BASE || "", ls });
  if (fresh.length || shrunk.length || values) process.exit(1);
}
