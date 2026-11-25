// The shape check (tasks/code-shape.md; core archive 226; #246), for every project that takes the core: how its code
// is put together may not get worse. It reads the project's JavaScript and TypeScript (JSX among them), C# and Python,
// each with its reader (shape-readers.mjs, beside this file), and fails what is new of:
//   - a function past a mark ("marks": its lines, how deep its blocks nest, how often it branches), tests left out;
//   - an import from one system into another that it does not declare it uses ("systems", each with its "paths", the
//     systems it "uses", its "entrance", its "domain" and the packages it "wraps");
//   - an import that reaches inside a system past its entrance, from anywhere outside it;
//   - an import that lies on a cycle between files (of what runs: a dynamic import or one of types alone makes none);
//   - an import of what binds code to one platform ("platform") outside a system of the domain "platform";
//   - a package the project ships with (a dependency, not one of development alone) imported outside the system that
//     wraps it, or, where none wraps it, from more than one system (systems of tools and of tests aside);
//   - the clock or randomness of its own in a system of the domain "rules", which is passed both;
//   - a name that joins the global space scripts with no import or export share: a second name of one file there, or
//     a name that two such files declare.
//   - a line of a comment that marks a change, by the marks of shape-readers.mjs and the config's "changes", counted by
//     file and mark (tasks/code-shape.md, "A comment says why the code is so, never what changed"; #458).
// What stood before is in the baseline ("baseline", a file the project keeps), and never fails: a listed function may
// shrink and may not grow, and a listed import may go. The baseline only shrinks: against the branch a pull request
// merges into (SHAPE_BASE, set by the workflow) an entry may join only where it stood on that branch already, as this
// config reads that branch's code (the check reads more: a system named, a mark lowered, the first baseline), or
// where the baseline gives its reason under "grown", as a raised mark's is given, which the reviews read
// (roles/shared/review-guidelines.md, "What blocks"). Neither the config nor the baseline is read or written through a
// link. What a change to the config itself makes the check read (a use declared, a folder left out) no rule here
// judges, since none could without guessing what was meant: the config is a protected file, and the reviews read
// its change (floor rule 3). An entry that is gone is taken out with --write, which lowers the
// numbers that fell too. A pull request that only improves on the baseline passes and says what --write would take
// out, which the next pull request that changes the baseline, or a cleaning task, writes; one that changes the
// baseline and leaves such an entry standing fails, so the baseline it writes lists the debt as it is (#750, point
// 5: improving pull requests had to rewrite this shared file, and collided); until it is written, an entry the base's
// code no longer holds covers no breach, in its own place or elsewhere, where the base is told (`heldAt`), and with
// no base told the mended one could come back unseen, the cost the owner accepted. Told the base, the baseline is
// read as it is told none, less those entries, so what passes there passes on the push to the branch, which is told
// none (`thenOf`); a breach left where another's entry is listed can leave one without, and fails until --write. A baseline names the readers
// whose finds it lists ("reads"): what a reader it does not name finds is said, never failed, where the base held it
// already or no base is told, until --write lists it, so that a sync that brings a reader turns nothing red
// (AGENTS.md, "Nothing locks a project"). It never guesses:
// an import that leads nowhere it can tell and a file whose JSX its reader cannot follow to its end are counted and
// said, never failed. Once the config names a system, a file of code the pull request adds that lies in none fails
// too, read against the base's files.
//
// The config's other keys: "code" and "tests", git pathspecs of what is read (tests for their imports alone);
// "aliases", each prefix an import may start with to the path it stands for; "suites", each suite's time mark in
// seconds, a number or one for each of Node's names for a platform ({ "linux": 60, "win32": 240 }); and those of what
// the tests cost (tasks/tests.md; #275, #321): "changes", the marks of a change the project adds, each plain text
// found anywhere in a comment line (the reader "changes"); "screens", what a test imports that opens a screen, a window or a
// device (a package or module by the name it is imported under, or the start of one), so that each test file that
// imports one is an entry ("screen: <test> -> <what>", found by the reader
// "screens"), new ones failing as any breach does; "clocks" and "processes", names beside those the check knows for
// each language (shape-readers.mjs, REACH) that a test calls or imports and that reach a real clock or start another
// process, so that each test file that reaches either is an entry ("timed: <test> -> <what>", "process: <test> ->
// <what>", found by the readers "clocks" and "processes"; #457); "select", for select.mjs beside this file: "proof", pathspecs of the
// tests never selected out, "whole", those of the tests that reach every file (one that copies or runs the whole
// project), and "none", those of the files no test reads; "wait", the time mark in seconds on the checks of one push
// (wait.mjs), which rises only as a suite's does; and "long", the seconds from which a measurement runs as a job of
// its own, outside the session (an hour where none is given).
//
//   node core/scripts/shape.mjs [<config>]            the check; with no config named, the one the manifest's *shape
//                                                     check* names (in the core, its AGENTS.md's), else
//                                                     checks/shape.json. A project that has not
//                                                     written one yet is held to the starter kit's own, with the
//                                                     pull request's base as its baseline: from the sync that
//                                                     brings the check nothing gets worse, and nothing that stood
//                                                     fails (AGENTS.md, "Nothing locks a project")
//   node core/scripts/shape.mjs <config> --first      write the first baseline, what stands when a project takes the
//                                                     check; only where no baseline exists yet
//   node core/scripts/shape.mjs <config> --write      lower the baseline to what still stands; it adds only what
//                                                     "grown" gives a reason for, what a reader the baseline did
//                                                     not name finds, and, with SHAPE_BASE set, what that branch
//                                                     held already, where the config reads more
//   node core/scripts/shape.mjs <config> --suite <name> -- <command>...   run a suite (with no shell) and measure its
//                                                     time against its mark, a warning past it, never a failure
//   node core/scripts/shape.mjs <config> --suite <name> --since <seconds>  measure the time since a start the
//                                                     workflow took (date +%s) against the suite's mark
// Run from the project's root, by the copies workflow (.github/workflows/copies.yml) on every pull request; in the
// core by its size workflow. Reads only, but for the baseline it writes when told; git and Node's own modules.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { builtinModules } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CODE, append, cycles, lyingUnder, nameTree, resolve } from "./code-shape.mjs";
import { inProject, logged } from "./guards.mjs";
import { didNotRun, installStep, installed, notInstalled } from "./packages.mjs";
import { shapeFaults } from "./schemas.mjs";
import { CHANGE_MARKS, FIRST_READS, PACKAGE_FILES, REACH, READERS, WHOLE_ON_PARSER, index, isCode, isPackageFile, linked, reachRuns, reading, shared, unreachedReaders } from "./shape-readers.mjs";
import { started } from "./started.mjs";
import { LARGEST, MOST_NODES } from "./tree-walk.mjs";

export const KIT = "checks/shape.json";
const TEMPLATE = fileURLToPath(new URL("../setup/template/shape.json.tmpl", import.meta.url));
// First guesses, which use tunes (the report of 14 November 2026; #246, part G).
export const MARKS = { lines: 60, depth: 4, branches: 15 };
// The domains a project names its systems under, leaving out what it lacks; a name of its own is allowed beside them.
export const DOMAINS = ["rules", "saved-data", "computer-players", "display", "input", "network", "storage", "platform", "packages", "tools", "tests"];
// What the rules never use: nothing outward.
export const OUTWARD = ["display", "input", "network", "storage", "platform"];
const SELECT_KEYS = ["proof", "whole", "none"];
// The seconds from which a measurement runs as a job outside the session, where the config gives none (#321).
export const LONG = 3600;
const BUILTIN = new Set(builtinModules.flatMap(m => [m, `node:${m}`]));

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
const isObject = v => !!v && typeof v === "object" && !Array.isArray(v);
const strings = v => Array.isArray(v) && v.every(s => typeof s === "string" && s.length > 0);
const optional = (v, test) => v === undefined || test(v);
const plainPath = s => typeof s === "string" && /^[\w@.-][\w@. -]*(\/[\w@.-][\w@. -]*)*\/?$/u.test(s) && !s.split("/").includes("..");
// Where a git pathspec points once its magic is taken off (":!", ":^", ":/", ":(top,glob)"): "outside" where it is
// absolute, a drive's or a share's, or climbs above the project's root (git itself refuses such a pathspec, in words
// that name no mend).
const OUTSIDE = /^(?:\/|[A-Za-z]:)|^\.\.(?:\/|$)/u;
const leavesProject = spec => OUTSIDE.test(path.posix.normalize(spec.replace(/^:(?:\([^)]*\)|[!^/]*:?)/u, "").replaceAll("\\", "/")));
// A mark of a change the project adds ("changes"): plain text, found anywhere in a comment line's first 400 characters,
// so that no mark a config holds can make the check slow (a pattern of its own could backtrack past any bound a count
// of its quantifiers sets); at most 120 characters, no control character, at most 20 of them (the schema's, which a
// config unchecked is held to here).
// (its length in characters, as the schema counts them, never in UTF-16's halves, so that a mark the schema takes is kept;
// counted only where its halves are few enough, since more than 240 cannot be 120 characters)
const plainMark = s => s.length <= 240 && [...s].length <= 120 && !/[\p{Cc}]/u.test(s);
const marked = v => strings(v) && v.length <= 20 && v.every(plainMark);
const KIT_FORM = "write it as the starter kit does (core/setup/template/shape.json.tmpl): a JSON object with \"baseline\", the baseline's path, and \"code\", git pathspecs of the code to read";

// ---- the config ----

// The config's shape, held by its schema (scripts/schemas/shape.json, schemas.mjs; #530): a key the check does not know,
// or one of the wrong shape, would read less without a word, so it is refused, its first fault said with its mend.
// Where the core's packages are not installed, as in a project's job of tests that selects with the config and installs
// none, the shape is not checked, and what the check reads is taken where it stands in its form (formed, below); the
// shape check itself says so as a warning (main). What the schema cannot say stays here: a path outside the project.
function readShape(c, at) {
  const faults = shapeFaults("shape", c, "core/", at);
  if (faults?.length) throw new Refused(faults[0]);
  if (faults === null && !(typeof c.baseline === "string" && strings(c.code) && c.code.length)) refuse(`${at} names no "baseline" and "code" the check can read`, KIT_FORM);
  if (!plainPath(c.baseline) || c.baseline.endsWith("/")) refuse(`${at} names no "baseline" that is a plain path inside the project`, "name the baseline's path in \"baseline\", as the starter kit writes it (checks/shape-baseline.json)");
  for (const key of ["code", "tests"]) {
    const out = formed(c[key], strings, []).find(leavesProject);
    if (out !== undefined) refuse(`"${key}" in ${at} names the pathspec ${JSON.stringify(out)}, which leaves the project`, `name only paths inside the project in "${key}", as git pathspecs from its root (":!" leaves one out), as the starter kit writes them (core/setup/template/shape.json.tmpl)`);
  }
  const aliases = formed(c.aliases, isObject, {});
  if (!Object.values(aliases).every(plainPath)) refuse(`"aliases" in ${at} is not in the form the check reads`, "give each prefix an import may start with (\"@/\") the path inside the project it stands for (\"src/\")");
}
// (a key as given where it holds its form, else its default: what a config unchecked can hold)
const formed = (v, test, fallback) => (v !== undefined && test(v) ? v : fallback);
const aSecond = n => Number.isFinite(n) && n > 0;

function readSystem(name, s, systems, at) {
  const here = `the system "${name}" in ${at}`;
  if (!isObject(s) || !Array.isArray(s.paths) || !s.paths.length || !s.paths.every(plainPath)) refuse(`${here} names no "paths" inside the project`, "list its folders (each ending in /) or files there");
  for (const k of ["uses", "wraps"]) s[k] = formed(s[k], strings, undefined);
  const other = (s.uses ?? []).find(u => !(u in systems) || u === name);
  if (other !== undefined) refuse(`${here} uses "${other}", which is no other system of the config`, "name a system the config holds, or take it out");
  if (s.entrance !== undefined && !(plainPath(s.entrance) && s.paths.some(p => s.entrance.startsWith(p)))) refuse(`${here} names an "entrance" outside its own paths`, "name the one file of the system that the others import from");
}

// What holds between the systems: the rules use nothing outward, a package is wrapped once, and no circle is declared.
function readTogether(systems, at) {
  const wrapped = new Map();
  for (const [name, s] of Object.entries(systems)) {
    const out = s.domain === "rules" ? (s.uses ?? []).find(u => OUTWARD.includes(systems[u].domain)) : undefined;
    if (out !== undefined) refuse(`the system "${name}" in ${at}, of the rules, declares that it uses "${out}", of the domain ${systems[out].domain}`, `take "${out}" out of its "uses": the rules use nothing outward (the display, input, the network, storage, a platform), and what they need of it is passed in; the imports that stand are listed in the baseline`);
    for (const p of s.wraps ?? []) {
      if (wrapped.has(p)) refuse(`the package ${p} is wrapped by two systems in ${at}, "${wrapped.get(p)}" and "${name}"`, "name it under the \"wraps\" of one system alone");
      wrapped.set(p, name);
    }
  }
  const round = cycles(new Map(Object.entries(systems).map(([n, s]) => [n, new Set(s.uses ?? [])])))[0];
  if (round) refuse(`the systems ${round.map(n => `"${n}"`).join(", ")} in ${at} declare that they use one another in a circle`, "take one direction out of their \"uses\": dependencies point one way, and the imports that stand the other way are listed in the baseline");
  return wrapped;
}

// Where ajv is not installed the config's shape went unchecked, as readShape says: said as a warning, and the check
// goes on (the core's AGENTS.md, "Nothing locks a project").
function unchecked() {
  if (!installed("ajv")) console.log(didNotRun("The config's shape was not checked", "ajv"));
}

// The config as the check reads it, every key filled; it throws a Refused, with its mend, for one it cannot hold to.
export function parseConfig(text, at = KIT) {
  let c;
  try { c = JSON.parse(text); } catch { refuse(`${at} could not be read as JSON`, KIT_FORM); }
  if (!isObject(c)) refuse(`${at} is not a JSON object`, KIT_FORM);
  readShape(c, at);
  const systems = formed(c.systems, isObject, {});
  for (const [name, s] of Object.entries(systems)) readSystem(name, s, systems, at);
  const list = k => formed(c[k], strings, []), select = Object.fromEntries(SELECT_KEYS.map(k => [k, formed(c.select?.[k], strings, [])]));
  const marks = { ...MARKS, ...Object.fromEntries(Object.entries(formed(c.marks, isObject, {})).filter(([k, n]) => Object.hasOwn(MARKS, k) && Number.isInteger(n) && n > 0)) };
  const suites = Object.fromEntries(Object.entries(formed(c.suites, isObject, {})).filter(([, v]) => aSecond(v) || (isObject(v) && Object.keys(v).length > 0 && Object.values(v).every(aSecond))));
  return { baseline: c.baseline, code: c.code, tests: list("tests"), systems, platform: list("platform"), screens: list("screens"), clocks: list("clocks"), processes: list("processes"), changes: [...Object.entries(CHANGE_MARKS), ...formed(c.changes, marked, []).map(p => [JSON.stringify(p).replaceAll(": ", ":\\u0020"), { test: t => t.includes(p) }])], select, wait: formed(c.wait, aSecond, undefined), long: formed(c.long, aSecond, LONG), marks, aliases: formed(c.aliases, isObject, {}), suites, wrapped: readTogether(systems, at) };
}

// ---- what stands ----

const packageOf = spec => (spec.startsWith("@") ? spec.split("/").slice(0, 2) : spec.split("/").slice(0, 1)).join("/");
const isRelative = spec => /^\.\.?(\/|$)/u.test(spec);
const toCode = spec => !/\.[A-Za-z0-9]+$/u.test(spec) || CODE.includes(path.posix.extname(spec));
const add = (ctx, kind, key, group, n = true) => ctx.entries.set(`${kind}: ${key}`, { kind, group, n });
const NONE = "(no system)";

// The packages the project's own package.json files name: those it holds itself, by name; those it ships with; and all
// it declares, the ones of development too.
function manifests(texts) {
  const packages = new Map(), ships = new Set(), declared = new Set();
  for (const [file, text] of Object.entries(texts)) {
    if (path.posix.basename(file) !== "package.json") continue;
    let p = null;
    try { p = JSON.parse(text); } catch { /* not a package's */ }
    if (!isObject(p)) continue;
    if (typeof p.name === "string") packages.set(p.name, { dir: path.posix.dirname(file), main: typeof p.main === "string" ? p.main : null, exports: p.exports !== undefined || p.imports !== undefined });
    const names = k => Object.keys(isObject(p[k]) ? p[k] : {});
    for (const d of ["dependencies", "peerDependencies", "optionalDependencies"].flatMap(names)) { ships.add(d); declared.add(d); }
    for (const d of names("devDependencies")) declared.add(d);
  }
  return { packages, ships, declared };
}

// The system a file lies in: the one whose path reaches furthest into the file's own; null where none names it.
function systemOf(config, file) {
  let best = null, length = -1;
  for (const [name, s] of Object.entries(config.systems)) for (const p of s.paths) {
    const holds = p.endsWith("/") ? file.startsWith(p) : file === p;
    if (holds && p.length > length) { best = name; length = p.length; }
  }
  return best;
}

function markedFunctions(ctx, file, fns) {
  const seen = new Map(), marks = ctx.config.marks;
  for (const fn of fns) {
    ctx.read.functions++;
    if (fn.lines <= marks.lines && fn.depth <= marks.depth && fn.branches <= marks.branches) continue;
    const k = (seen.get(fn.name) ?? 0) + 1;
    seen.set(fn.name, k);
    add(ctx, "function", `${file}#${fn.name}${k > 1 ? `#${k}` : ""}`, fn.name, { lines: fn.lines, depth: fn.depth, branches: fn.branches, line: fn.line });
  }
}

// The comments that mark a change, by the config's marks ("changes"): for each mark, how many lines of a file's
// comments hold it, a line counted under the first it holds; counted as each file is read, so that no file's comments
// are held past its reading.
function marksOf(config, comments) {
  const counts = new Map();
  for (const { text } of comments ?? []) {
    const mark = config.changes.find(([, re]) => re.test(text));
    if (mark) counts.set(mark[0], (counts.get(mark[0]) ?? 0) + 1);
  }
  return counts;
}
function changeMarks(ctx, file, counts) {
  for (const [mark, count] of counts ?? []) add(ctx, "change", `${file}: ${mark}`, mark, { count });
}

// The clock and randomness of a file's own, by the runs of tokens its reader names (`own`).
function ownClock(ctx, file, { toks, own }) {
  const at = (run, k) => run.every((v, j) => toks[k + j].v === v && toks[k + j].t !== "str") && !(toks[k - 1]?.t === "punct" && toks[k - 1].v === ".");
  for (const { run, what } of own) {
    let count = 0;
    for (let k = 0; k + run.length <= toks.length; k++) if (at(run, k)) count++;
    if (count) add(ctx, "clock", `${file}: ${what}`, what, { count });
  }
}

// An import that leads to no file of the project: what binds to a platform, a package the project ships with, or
// nowhere the check can tell.
function outside(ctx, from, spec, aliased) {
  const name = packageOf(spec), bound = [spec, name].find(s => ctx.config.platform.includes(s));
  opensScreen(ctx, from, [spec, name]);
  if (bound) { if (from.domain !== "platform") add(ctx, "platform", `${from.file} -> ${bound}`, bound); return; }
  if (BUILTIN.has(spec)) return;
  const known = !aliased && !isRelative(spec) && !ctx.packages.has(name) && ctx.declared.has(name);
  if (!known) ctx.unsure.add(from.file); // (it leads to a file the readers do not read, or nowhere they can tell)
  if (known && ctx.ships.has(name)) append(ctx.usedBy, name, from);
  else if (!known && (toCode(spec) || !isRelative(spec))) ctx.read.nowhere++;
}

// A test that imports what opens a screen, a window or a device: one of the config's "screens", by any of the names it
// is imported under (a name listed, or one that starts with it and a slash or a dot). A test of the display's own code
// is none: importing it opens nothing.
function opensScreen(ctx, from, names) {
  if (!ctx.tests.has(from.file)) return;
  const under = s => names.some(n => n === s || n.startsWith(`${s}/`) || n.startsWith(`${s}.`));
  const what = ctx.config.screens.find(under);
  if (what !== undefined) add(ctx, "screen", `${from.file} -> ${what}`, what);
  // (an import of types alone, which the program never loads, reaches nothing)
  if (!from.types) for (const kind of ["clock", "process"]) for (const name of [...IMPORTS[kind], ...ctx.config[LISTS[kind]]].filter(under)) reached(ctx, kind, from.file, name);
}
// A module of the project's own that the config names under "clocks" or "processes" (a helper that sleeps or starts
// a program), by its path or by the name the test imports it under.
function configuredReach(ctx, from, names) {
  if (!ctx.tests.has(from.file) || from.types) return;
  const under = s => names.some(n => n === s || n.startsWith(`${s}/`) || n.startsWith(`${s}.`));
  for (const kind of ["clock", "process"]) for (const name of ctx.config[LISTS[kind]].filter(under)) reached(ctx, kind, from.file, name);
}

// What a test reaches that costs the most time, by the names its reader knows and the config's (shape-readers.mjs,
// REACH): each test file is one entry of each kind it reaches, "timed: <test> -> <what>" or "process: <test> ->
// <what>", its first name in order; found by the readers "clocks" and "processes".
const KINDS = { clock: "timed", process: "process" }, LISTS = { clock: "clocks", process: "processes" };
const IMPORTS = Object.fromEntries(Object.keys(KINDS).map(kind => [kind, [...new Set(Object.values(REACH).flatMap(l => l[kind].imports))]]));
function reached(ctx, kind, file, name) {
  const of = ctx.reached.get(file) ?? { clock: new Set(), process: new Set() };
  ctx.reached.set(file, of);
  of[kind].add(name);
}
const isPunct = (t, v) => t?.t === "punct" && t.v === v;
// Whether a run of tokens is called or read at k: never one after a dot, a property's key before ":" or what "=" assigns.
function runAt(toks, run, k) {
  if (!run.every((v, j) => toks[k + j].v === v && toks[k + j].t !== "str") || isPunct(toks[k - 1], ".")) return false;
  const next = toks[k + run.length];
  return !isPunct(next, ":") && !(isPunct(next, "=") && !isPunct(toks[k + run.length + 1], "="));
}
function testReach(ctx, file, r) {
  if (!ctx.tests.has(file)) return;
  for (const kind of ["clock", "process"]) {
    const own = REACH[r.lang]?.[kind]?.runs ?? [], named = reachRuns(ctx.config[LISTS[kind]]);
    for (const { run, what } of [...own, ...named]) for (let k = 0; k + run.length <= r.toks.length; k++) if (runAt(r.toks, run, k)) { reached(ctx, kind, file, what); break; }
  }
}
function reachEntries(ctx) {
  for (const [file, of] of ctx.reached) for (const kind of ["clock", "process"]) {
    const what = [...of[kind]].sort()[0];
    if (what !== undefined) add(ctx, KINDS[kind], `${file} -> ${what}`, file);
  }
}

// An import from one file of the project to another: across a boundary nobody declared, or past an entrance.
function between(ctx, from, to) {
  const target = systemOf(ctx.config, to);
  if (!target || target === from.system) return;
  const pair = `${from.system ?? NONE} -> ${target}`, key = `${pair}: ${from.file} -> ${to}`, entrance = ctx.config.systems[target].entrance;
  if (from.system && !(ctx.config.systems[from.system].uses ?? []).includes(target)) add(ctx, "crossing", key, pair);
  else if (entrance && to !== entrance) add(ctx, "inside", key, pair);
}

function oneImport(ctx, from, imp) {
  ctx.read.imports++;
  const alias = Object.keys(ctx.config.aliases).filter(a => imp.spec.startsWith(a)).sort((a, b) => b.length - a.length)[0];
  const spec = alias === undefined ? imp.spec : `./${path.posix.relative(path.posix.dirname(from.file), path.posix.join(ctx.config.aliases[alias], imp.spec.slice(alias.length))) || "."}`;
  const to = resolve(from.file, spec, ctx.files, ctx.packages);
  if (!to) { outside(ctx, imp.types ? { ...from, types: true } : from, imp.spec, alias !== undefined); return; }
  configuredReach(ctx, imp.types ? { ...from, types: true } : from, [to, imp.spec]);
  // (a package of the project's own that maps its entrances, "exports" or "imports", may load another file than this)
  if (!isRelative(spec) && ctx.packages.get(packageOf(spec))?.exports) ctx.unsure.add(from.file);
  if (to !== from.file) ctx.reach.set(from.file, (ctx.reach.get(from.file) ?? new Set()).add(to));
  if (imp.kind !== "dynamic" && !imp.types && to !== from.file) ctx.graph.set(from.file, (ctx.graph.get(from.file) ?? new Set()).add(to));
  between(ctx, from, to);
}

// An import of C# or Python (shape-readers.mjs): to the project's own files, or outside it, as an import of
// JavaScript is.
function foreign(ctx, from, imp, r) {
  ctx.read.imports++;
  const l = linked(from.file, imp, r, ctx.idx, ctx.files, ctx.config.platform);
  for (const to of (l.to ?? []).filter(t => t !== from.file)) {
    configuredReach(ctx, from, [to, ...l.names ?? []]);
    ctx.reach.set(from.file, (ctx.reach.get(from.file) ?? new Set()).add(to));
    if (!imp.dynamic && !imp.types) ctx.graph.set(from.file, (ctx.graph.get(from.file) ?? new Set()).add(to));
    between(ctx, from, to);
  }
  if (l.to) return;
  opensScreen(ctx, from, l.names);
  // (the shortest name of the config's "platform" that the import is or lies under)
  const bound = lyingUnder(ctx.platformTree ??= nameTree(ctx.config.platform), l.outside)[0];
  if (bound) { if (from.domain !== "platform") add(ctx, "platform", `${from.file} -> ${bound}`, bound); return; }
  if (l.known && l.known !== "builtin" && ctx.ships.has(l.known)) append(ctx.usedBy, l.known, from);
  else if (!l.known) { ctx.read.nowhere++; ctx.unsure.add(from.file); }
}

// An import whose target only running the code tells: in JavaScript, by its tokens (a string or a regular expression
// is never code), a dynamic import or require of anything but one plain string, or a glob of files (import.meta.glob,
// require.context); in Python, outside a comment, an import by a name built at run time.
// (by any name, a plain string too: what it names is resolved against roots on Python's path the readers do not know)
const PY_COMPUTED = /\b(?:import_module|__import__)\s*\(/u;
const after = (toks, k, ...vs) => vs.every((v, j) => toks[k + 1 + j]?.v === v && toks[k + 1 + j].t !== "str");
const plainString = (toks, k) => toks[k]?.t === "str" && toks[k].v !== "`" && [")", ","].includes(toks[k + 1]?.v);
function computed(r, text) {
  if (r.lang === "python") return PY_COMPUTED.test(text.split("\n").filter(l => !/^\s*#/u.test(l)).join("\n"));
  if (r.lang !== "javascript") return false;
  const t = r.toks;
  return t.some((tok, k) => tok.t === "id" && t[k - 1]?.v !== "." && (((tok.v === "import" || tok.v === "require") && after(t, k, "(") && !plainString(t, k + 2))
    || (tok.v === "import" && after(t, k, ".", "meta", ".", "glob")) || (tok.v === "require" && after(t, k, ".", "context"))));
}

// Whether a file's imports are as ones the readers cannot follow: a reader could not read them, its parser not installed
// or the file past it; and in C# and Python, read on the parser alone, those of a file the grammar could not read whole,
// which may stand in the part it lost.
const unfollowed = r => !r.imports || (!r.functions && ["csharp", "python"].includes(r.lang));

function oneFile(ctx, file, r) {
  const system = systemOf(ctx.config, file), domain = system ? ctx.config.systems[system].domain ?? null : null, from = { file, system, domain };
  if (computed(r, ctx.texts[file] ?? "")) ctx.unsure.add(file);
  if (!system) ctx.unnamed.push(file);
  ctx.readers.set(file, r.reader);
  if (!r.functions) { ctx.read.jsx++; add(ctx, "lost", file, file); }
  else if (!ctx.tests.has(file)) markedFunctions(ctx, file, r.functions);
  if (domain === "rules") ownClock(ctx, file, r);
  changeMarks(ctx, file, r.marks);
  testReach(ctx, file, r);
  if (unfollowed(r)) ctx.unsure.add(file);
  for (const imp of r.imports ?? []) { if (r.lang === "javascript") oneImport(ctx, from, imp); else foreign(ctx, from, imp, r); }
  const names = ctx.tests.has(file) ? null : shared(file, r, ctx.idx);
  if (names) ctx.scripts.set(file, names);
}

// Scripts that share one global space: each name of a file that declares more than one there, and each name that more
// than one such file declares.
function sharedSpace(ctx) {
  const by = new Map();
  for (const [file, names] of ctx.scripts) for (const n of names) append(by, n, file);
  for (const [file, names] of ctx.scripts) for (const n of names) if (names.length > 1 || by.get(n).length > 1) add(ctx, "global", `${file}: ${n}`, n);
}

function onCycles(ctx) {
  for (const part of cycles(ctx.graph)) {
    const inside = new Set(part);
    for (const from of part) for (const to of ctx.graph.get(from) ?? []) if (inside.has(to)) add(ctx, "cycle", `${from} -> ${to}`, "cycle");
  }
}

// A package the project ships with is imported in one system: the one that wraps it, or, where none does, one alone.
function wrappedOnce(ctx) {
  for (const [name, by] of ctx.usedBy) {
    const home = ctx.config.wrapped.get(name) ?? null;
    const held = by.filter(u => u.domain !== "tools" && u.domain !== "tests" && (home ? u.system !== home : u.system));
    const breach = home ? held.length > 0 : new Set(held.map(u => u.system)).size > 1;
    if (breach) for (const u of held) add(ctx, "package", `${u.file} -> ${name}`, name);
  }
}

// What the check finds in the files given ({ path: text }, the files that declare packages among them): `entries`, a
// Map of each breach's id to { kind, group, n }, n its numbers where it has any; `read`, the counts of what it read;
// `unnamed`, the files of code in no system; `readers`, the reader of each file (shape-readers.mjs); and `reach`, each
// file's imports of the project's own files, dynamic ones and those of types among them, and `scripts`, the files that
// share the global space, which import nothing, and `unsure`, the files with an import whose target the readers cannot
// follow, or whose imports they could not read (select.mjs). `tests` is the
// set of the files that are tests: read for their imports, not held to the marks nor to the shared space. `watch`, where
// given, is hurry.mjs's, the selection's: it fails the reading where the files a pull request changes, or the project's
// files all together, are too many to read in time; the changed files are read first, and of JavaScript no functions,
// which the selection does not use (#962), so the marks on functions are not held in what it finds.
export function survey(texts, config, tests = new Set(), watch = null) {
  const code = Object.keys(texts).filter(isCode).sort();
  // (one file of JavaScript or TypeScript is lexed whole, whatever its size, and one of Python is read whole for its
  // computed imports and the names it holds; one of C# past `LARGEST` is read not at all, so it is held to no characters
  // of its own)
  watch?.size(texts, code.filter(file => path.posix.extname(file) !== ".cs"));
  const read = { files: code.length, functions: 0, imports: 0, jsx: 0, nowhere: 0, unnamed: 0, systems: Object.keys(config.systems).length, noEntrance: Object.values(config.systems).filter(s => !s.entrance).length };
  const timed = (file, read) => (watch ? watch.timed(file, read) : read());
  const readOne = file => { const r = reading(file, texts[file], { functions: !watch }); r.marks = marksOf(config, r.comments); delete r.comments; return r; };
  const byFile = new Map((watch ? watch.first(code) : code).map(file => [file, timed(file, () => readOne(file))]));
  const readings = code.map(file => [file, byFile.get(file)]);
  const idx = index(readings, texts), js = manifests(texts);
  const ctx = { config, tests, texts, unsure: new Set(), files: new Set(Object.keys(texts)), idx, packages: js.packages, ships: new Set([...js.ships, ...idx.ships]), declared: new Set([...js.declared, ...idx.declared]),
    entries: new Map(), graph: new Map(), reach: new Map(), usedBy: new Map(), unnamed: [], read, readers: new Map(), scripts: new Map(), reached: new Map() };
  for (const [file, r] of readings) timed(file, () => oneFile(ctx, file, r));
  reachEntries(ctx);
  sharedSpace(ctx);
  onCycles(ctx);
  wrappedOnce(ctx);
  read.unnamed = ctx.unnamed.length;
  read.tests = tests.size;
  for (const [k, kind] of [["screens", "screen"], ["timed", "timed"], ["processes", "process"]]) read[k] = new Set([...ctx.entries.keys()].filter(id => id.startsWith(`${kind}: `)).map(fileOf)).size;
  return { entries: ctx.entries, read, unnamed: ctx.unnamed, readers: ctx.readers, reach: ctx.reach, scripts: new Set(ctx.scripts.keys()), unsure: ctx.unsure, texts };
}

// ---- the baseline ----

// A listed entry's kind and group, from its id alone (the baseline holds ids and numbers, nothing more).
export function groupOf(id) {
  const kind = id.slice(0, id.indexOf(": ")), key = id.slice(kind.length + 2);
  if (kind === "function") return { kind, group: key.slice(key.indexOf("#") + 1).replace(/#\d+$/u, "") };
  if (kind === "crossing" || kind === "inside") return { kind, group: key.slice(0, key.indexOf(": ")) };
  if (kind === "cycle") return { kind, group: "cycle" };
  if (kind === "lost") return { kind, group: key }; // (a file lost covers itself alone)
  if (kind === "clock" || kind === "global" || kind === "change") return { kind, group: key.slice(key.lastIndexOf(": ") + 2) };
  // (a test's reach is its file's: one that reaches another name, or keeps a later one, stands under its old entry)
  if (kind === "timed" || kind === "process") return { kind, group: key.slice(0, key.lastIndexOf(" -> ")) };
  return { kind, group: key.slice(key.lastIndexOf(" -> ") + 4) };
}

// The file an entry stands in, from its id alone.
export function fileOf(id) {
  const { kind } = groupOf(id), key = id.slice(kind.length + 2);
  if (kind === "function") return key.slice(0, key.indexOf("#", key.lastIndexOf("/") + 1));
  if (kind === "clock" || kind === "global" || kind === "change") return key.slice(0, key.lastIndexOf(": "));
  if (kind === "lost") return key;
  const from = kind === "crossing" || kind === "inside" ? key.slice(key.indexOf(": ") + 2) : key;
  return from.slice(0, from.indexOf(" -> "));
}

// The reader that found an entry: the reader of its file as the check reads it now, the shared space's own; null where
// the file is not read now.
const OWN_READER = { global: "scripts", screen: "screens", timed: "clocks", process: "processes", change: "changes" };
export const readerOf = (id, readers) => OWN_READER[groupOf(id).kind] ?? readers.get(fileOf(id)) ?? null;

const NUMBERS = ["lines", "depth", "branches", "count"];
// Whether an entry's numbers are within a listed one's: each no more than listed, or, for a function, than its mark.
const within = (n, listed, marks) => n === true || listed === true || NUMBERS.every(k => (n[k] ?? 0) <= Math.max(listed[k] ?? 0, marks[k] ?? 0));
const size = n => (n === true ? 0 : NUMBERS.reduce((s, k) => s + (n[k] ?? 0), 0));

// What `want` claims of `pool`: { left, taken }, `left` the entries of `want` that nothing in the pool covers, `taken`
// each entry of `want` that claimed one to the id of the one it claimed. Each claims one entry of the pool, the one of
// its own id where its numbers are within that one's, else one of its kind and group that no entry of `want` stands
// under any more (what was listed moved, under its name): the smallest still free that covers it, in the order of
// `want`, and where none is free, one an earlier claimant gives up for another that covers that one (`matched`). So
// none is left wherever each can be given an entry of its own, whatever the order, and one that shrinks, moves to an
// id the pool lists nothing at, or goes, leaves no other without. Both are Maps of id to numbers (or true). `groups`
// gives an id's kind and group: another check that keeps a baseline in this form passes its own (screens.mjs, through
// `unclaimed`).
function claims(want, pool, marks = {}, groups = groupOf) {
  const free = new Map(pool), later = new Map(), taken = new Map();
  for (const [id, n] of want) { if (free.has(id) && within(n, free.get(id), marks)) { free.delete(id); taken.set(id, id); } else later.set(id, n); }
  for (const id of want.keys()) free.delete(id); // one that stands, and grew, lends its place to no other
  const fits = new Map([...later].map(([id, n]) => {
    const { kind, group } = groups(id);
    const covers = ([other, listed]) => { const o = groups(other); return o.kind === kind && o.group === group && within(n, listed, marks); };
    return [id, [...free].filter(covers).sort((a, b) => size(a[1]) - size(b[1]) || a[0].localeCompare(b[0])).map(([other]) => other)];
  }));
  const held = matched(fits);
  return { left: [...later.keys()].filter(id => !held.has(id)), taken: new Map([...taken, ...held]) };
}
// Each id of `fits` (an id to the entries that cover it, the one it would take first leading) to the entry it is given,
// each entry given once, as many given one as can be: an id takes its first entry not given yet, and where all are
// given, one whose holder can take another, that holder's own holder moved the same way.
function matched(fits) {
  const holder = new Map();
  const give = (id, seen) => {
    const open = fits.get(id).find(entry => !holder.has(entry));
    if (open !== undefined) return holder.set(open, id);
    return fits.get(id).some(entry => !seen.has(entry) && seen.add(entry) && give(holder.get(entry), seen) && holder.set(entry, id));
  };
  for (const id of fits.keys()) give(id, new Set());
  return new Map([...holder].map(([entry, id]) => [id, entry]));
}
export const unclaimed = (want, pool, marks = {}, groups = groupOf) => claims(want, pool, marks, groups).left;
// The entries of `want` that `pool` leaves unclaimed of those named in `last`, these claiming after every other, so
// that a breach that stands where it stood claims its own before a new one may take it (#750, point 5).
const unclaimedOf = (last, want, pool, marks) => { const at = new Set(last); return unclaimed(new Map([...[...want].filter(([id]) => !at.has(id)), ...[...want].filter(([id]) => at.has(id))]), pool, marks).filter(id => at.has(id)); };

const numbersOf = n => (n === true ? true : Object.fromEntries(NUMBERS.filter(k => k in n).map(k => [k, n[k]])));
const sorted = map => Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
const anEntry = v => v === true || (isObject(v) && Object.keys(v).length > 0 && Object.entries(v).every(([k, n]) => NUMBERS.includes(k) && Number.isInteger(n) && n >= 0));
const said = (grown, id) => (grown[id] ?? "").trim().length > 0;

// A baseline's text as the check reads it: { listed, grown, audited, reads }, listed a Map of id to numbers, reads the
// readers whose finds it lists (FIRST_READS where it names none); it throws a Refused where the text is none.
export function parseBaseline(text, at, restore) {
  let b;
  try { b = JSON.parse(text); } catch { refuse(`${at} could not be read as JSON`, restore); }
  if (!isObject(b) || !isObject(b.listed) || !Object.entries(b.listed).every(([id, v]) => /^[a-z]+: \S/u.test(id) && anEntry(v))) refuse(`${at} has no "listed" object of entries the check reads`, restore);
  if (!optional(b.grown, g => isObject(g) && Object.values(g).every(v => typeof v === "string"))) refuse(`"grown" in ${at} is not an object of reasons`, "give each entry that had to join, by its id, its reason in a sentence, or take \"grown\" out");
  if (!optional(b.reads, r => Array.isArray(r) && r.every(x => Object.hasOwn(READERS, x)))) refuse(`"reads" in ${at} is not a list of the check's readers (${Object.keys(READERS).join(", ")})`, `take it out, then run the check with --write, which writes it`);
  return { listed: new Map(Object.entries(b.listed)), grown: b.grown ?? {}, audited: isObject(b.audited) ? b.audited : null, reads: b.reads ?? FIRST_READS };
}

// A baseline as the check writes it: what was audited and what grew kept, every reader named, the entries sorted.
const written = (listed, grown, audited) => `${JSON.stringify({ ...(audited ? { audited } : {}), reads: Object.keys(READERS), ...(Object.keys(grown).length ? { grown } : {}), listed: sorted(listed) }, null, 2)}\n`;

// ---- the project's files ----

const SAFE = ["-c", "core.fsmonitor=false"];
const git = (args, opts = {}) => execFileSync("git", [...SAFE, ...args], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "ignore"], ...opts });
const lsFiles = (specs, root) => (specs.length ? git(["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...specs], { cwd: root }).split("\0").filter(Boolean) : []);
const readable = f => isCode(f) || isPackageFile(f);
// A file the check reads in the working folder: a regular file on disk, never a link or a folder (a submodule, a nested
// repository), as standing() reads it.
const onDisk = (f, root) => { try { return fs.lstatSync(path.join(root, f)).isFile(); } catch { return false; } };
// The files of code its readers know that the check reads under the config's "code" and "tests", in the working folder
// (read-nothing.mjs counts them, so that the two lists cannot drift; #459).
export const codeListed = (config, root = ".") => lsFiles([...config.code, ...config.tests], root).filter(f => isCode(f) && onDisk(f, root));

// The project's files as they stand in the working folder: { texts, tests }, never through a link.
export function standing(config, root = ".") {
  const texts = {};
  for (const f of new Set([...lsFiles([...config.code, ...config.tests], root), ...lsFiles(PACKAGE_FILES, root)].filter(readable))) {
    try { if (onDisk(f, root)) texts[f] = fs.readFileSync(path.join(root, f), "utf8"); } catch { /* listed, not on disk */ }
  }
  return { texts, tests: new Set(lsFiles(config.tests, root)) };
}

// The same files as a commit holds them, read through an index of its own, so that the pathspecs mean what they mean
// in the working folder; a link and a submodule are passed over.
export function standingAt(commit, config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shape-")), env = { ...process.env, GIT_INDEX_FILE: path.join(dir, "index") };
  try {
    git(["read-tree", commit], { env });
    const aFile = m => m && m[1] !== "120000" && m[1] !== "160000" && !m[3].includes("\n");
    const staged = specs => (specs.length ? git(["ls-files", "-z", "--stage", "--", ...specs], { env }).split("\0").map(l => /^(\d+) ([0-9a-f]+) \d\t([\s\S]+)$/u.exec(l)).filter(aFile) : []);
    const wanted = new Map([...staged([...config.code, ...config.tests]), ...staged(PACKAGE_FILES)].filter(m => readable(m[3])).map(m => [m[3], m[2]]));
    const out = execFileSync("git", [...SAFE, "cat-file", "--batch"], { input: `${[...wanted.values()].join("\n")}\n`, maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "ignore"] });
    const texts = {};
    let at = 0;
    for (const file of wanted.keys()) {
      const end = out.indexOf(10, at), bytes = Number(out.subarray(at, end).toString().split(" ")[2]);
      texts[file] = out.subarray(end + 1, end + 1 + bytes).toString("utf8");
      at = end + 1 + bytes + 1;
    }
    return { texts, tests: new Set(staged(config.tests).map(m => m[3])) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// A config or a baseline is read and written only as a file of the project's own: never through a link, at the file
// or at a folder on its way, which could lead outside the project (floor rule 13).
export function notLinked(file, root = ".") {
  if (!inProject(file)) refuse(`${file} lies outside the project`, "name it by its path from the project's root, with no \"..\" that leads above it: the check reads and writes only the project's own files");
  const parts = file.split("/");
  for (let i = 1; i <= parts.length; i++) {
    const found = tolerant(() => fs.lstatSync(path.join(root, ...parts.slice(0, i))));
    if (found?.isSymbolicLink()) refuse(`${file} is reached through a link (${parts.slice(0, i).join("/")})`, "make it a plain file of the project's own, inside the project: the check reads and writes through no link");
  }
  return path.join(root, file);
}

// The config the manifest's *shape check* row names: its first path to a .json file, in backticks; in a row that says
// `none`, the one after "config" that ends the reason (configTail), which offBy takes off it, so that the config's
// other readers keep reading it while the check is off and a path the reason quotes is not taken for it. Else the kit's.
const rowNames = manifest => {
  const token = rowToken(manifest, "*shape check*");
  if (token?.said === "none") return /^[\w./-]+\.json$/u.exec(configTail(token.reason)?.path ?? "")?.[0] ?? null;
  const row = /^.*\*shape check\*.*$/mu.exec(String(manifest ?? ""))?.[0] ?? "";
  return /`([\w./-]+\.json)`/u.exec(row)?.[1] ?? null;
};
export const where = manifest => rowNames(manifest) ?? KIT;

// What a project's own scan does about the baseline at `baseline`, whose entries name the project's files by path, where
// that scan counts a path named in its tracked text as a use of that code and fails on it (#1289): the core cannot know
// a project's own scans, so `--first` and the step's writer say it.
export const scanMend = baseline => `where a scan of the project's own that counts a path named in its tracked text as a use of that code (an unused-code or reference check) fails on \`${baseline}\`, which names the project's files by path, have the scan leave \`${baseline}\` out, as a file the shape check writes, and never take out an entry of the scan's own list for it`;
// Printed where `--first` or `--write` wrote a path into the baseline that it did not name before.
const noteScan = baseline => console.log(`note ${baseline} names the project's files by path. Mend: ${scanMend(baseline)}`);

// A manifest row's first text in backticks after its name `label`: { said } (trimmed) and { reason }, where `said` is
// `none`, what follows that token as it stands (padded or not), "" where it holds no letter or digit, which gives no
// reason; null where the row or the token is not there. The rows *shape check* and *mutation tool* (strength.mjs) read
// it so.
export function rowToken(text, label) {
  const row = String(text ?? "").split(/\r?\n/u).find(l => l.includes(label));
  if (row === undefined) return null;
  const rest = row.slice(row.indexOf(label) + label.length), token = /`([^`]*)`/u.exec(rest);
  if (!token) return null;
  const after = trimTail(rest.slice(token.index + token[0].length).replace(/^[\s:|,;-]+/u, ""));
  return { said: token[1].trim(), reason: /[\p{L}\p{N}]/u.test(after) ? after : "" };
}

// `text` with its trailing spaces and table bars taken off, in one pass from its end (a pattern anchored at the end
// alone would try each start in turn).
const trimTail = text => {
  let end = text.length;
  while (end > 0 && /[\s|]/u.test(text[end - 1])) end -= 1;
  return text.slice(0, end);
};

// Whether the manifest's *shape check* row turns the check off (tasks/code-shape.md, "Only the owner turns the shape
// check off"; #1107, point 3): the reason given after a `none` that is the row's first text in backticks, "" where it
// gives none, which turns nothing off; null where the row says no `none`.
export function offBy(manifest) {
  const token = rowToken(manifest, "*shape check*");
  if (token?.said !== "none") return null;
  const reason = withoutConfig(token.reason);
  return /[\p{L}\p{N}]/u.test(reason) ? reason : "";
}

// The config's path a `none` row's reason ends with (`; config \`<path>\``): { path, before }, the reason before it
// with the separators between taken off, which is all of the reason; null where it ends with none. Found from the end,
// in one pass (a pattern that started at each place would not), and read so by rowNames and offBy alike.
const configTail = reason => {
  const at = reason.lastIndexOf("config `"), tail = /^config `([^`]*)`$/u.exec(reason.slice(at));
  if (at < 0 || /\w/u.test(reason[at - 1] ?? "") || !tail) return null;
  let end = at;
  while (end > 0 && /[\s;,]/u.test(reason[end - 1])) end -= 1;
  return { path: tail[1], before: reason.slice(0, end) };
};
const withoutConfig = reason => configTail(reason)?.before ?? reason;

// ---- the verdict ----

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const UNIT = { lines: "lines", depth: "deep", branches: "branch points", count: "in all" };
const show = (id, n) => `${id.slice(id.indexOf(": ") + 2)}${n === true ? "" : `${n.line ? ` (line ${n.line})` : ""}: ${NUMBERS.filter(k => k in n).map(k => `${n[k]} ${UNIT[k]}`).join(", ")}`}`;
const some = (ids, entries) => ids.slice(0, 20).map(id => `  ${show(id, entries.get(id) ?? true)}`).concat(ids.length > 20 ? [`  and ${ids.length - 20} more`] : []);

// What a new breach of each kind is, and its mend, in words a session acts on with no rule file open.
const SAID = {
  function: (n, c) => [`${plural(n, "function passes", "functions pass")} a mark (${c.marks.lines} lines, ${c.marks.depth} blocks deep, ${c.marks.branches} branch points) that stood under it before, or ${n === 1 ? "grows" : "grow"} past what the baseline lists`,
    "split each by what it does into functions under the marks, its tests proving that it behaves as before"],
  crossing: n => [`${plural(n, "import crosses", "imports cross")} from one system into another that it does not declare it uses`,
    "take what is needed through a system this one may use, or have it passed in; where the dependency is meant, name the other system under this one's \"uses\" in the config (the rules use nothing outward, and no two systems use each other)"],
  inside: n => [`${plural(n, "import reaches", "imports reach")} inside a system, past its entrance`, "import from the system's entrance, the file its \"entrance\" names in the config, and add there what the system is to offer"],
  cycle: n => [`${plural(n, "import lies", "imports lie")} on a cycle between files that did not stand before`, "turn one import of the cycle round: move what both files need into a file that imports neither, or pass it in"],
  platform: n => [`${plural(n, "import binds", "imports bind")} code to one platform outside the system declared for that`, "move the code that needs it into the system of the domain \"platform\", and have the rest call what that system offers, so that the rest builds and tests wherever the project's checks run"],
  package: n => [`${plural(n, "import takes", "imports take")} a package the project ships with outside the one system that wraps it`, "import it in one system alone, named under that system's \"wraps\" in the config, and have the others use what that system offers"],
  lost: n => [`${plural(n, "file", "files")} of code ${n === 1 ? "holds" : "hold"} what the reader cannot follow to its end (JavaScript, TypeScript, C# or Python the grammar the core installs cannot read whole, or within its time, a file of them past the largest its reader takes, ${LARGEST.javascript.toLocaleString("en")} characters of JavaScript or TypeScript, ${LARGEST.python.toLocaleString("en")} of Python and ${LARGEST.csharp.toLocaleString("en")} of C#, a tree of more than ${MOST_NODES.toLocaleString("en")} nodes, or C# or Python nested more than 200 levels deep), so ${n === 1 ? "its" : "their"} functions are not held`,
    "write it so that the reader can follow it: close each element of JSX, write a } or > in JSX's text as {'}'} or {'>'}, and nest less deep; where a script wrote it as data past that size, leave it out of the config's \"code\" (\"!\" before its pathspec); where it is code that builds, newer than the grammar reads, list the entry under \"grown\" with that reason, by its id, and tell the core which construct it is, never the project's code (the core's README.md, \"Reporting to the core\"); the check's failure on the file then names what it holds"],
  global: n => [`${plural(n, "name joins", "names join")} the global space that scripts with no import or export share: a second name of one file there, or a name another such file declares too`,
    "make the file a module that imports what it uses and exports what it offers; where the page cannot load it so, put what it adds under the one name the file declares there already (an object of its functions), and give a name that two files declare one home"],
  screen: n => [`${plural(n, "test imports", "tests import")} what opens a screen, a window or a device, where no test of ${n === 1 ? "its" : "their"} file did before`,
    "test what it guards beneath the screen, through the system it uses, and take the import out; only where the screen, the window or the device itself is what the test guards, list the entry in the baseline with that reason under \"grown\", by its id, and in the pull request"],
  change: n => [`${plural(n, "comment line marks", "comment lines mark")} what changed, when or for which task, more than the file's comments did before (a change's heading such as "Changed:", what the code was, a change's date, the task that changed it)`,
    "move what changed, when and for which task to the commit's message or the pull request's description, and keep in the comment only why the code is so, or a pointer to the issue that gives the reason; where a mark of the config's (\"changes\") takes a comment that says why for a change's mark, take that mark out of the config in this pull request; where one of the core's marks takes such a comment, or a notice a licence asks for (Apache-2.0's, that a file was modified), list the entry under \"grown\" in the baseline with that reason, and report the pattern to the core (core/README.md, \"Reporting to the core\")"],
  timed: n => [`${plural(n, "test reaches", "tests reach")} a real clock (a sleep, a timed wait, a read of the time), where no test of ${n === 1 ? "its" : "their"} file did before`,
    "hand the time in, as the rules take it, and test beneath the clock; only where the clock itself is what the test guards, or the test runs under a fake clock it installs (which the check does not tell apart from the real one), list the entry in the baseline with that reason under \"grown\", by its id, and in the pull request"],
  process: n => [`${plural(n, "test starts", "tests start")} another process, where no test of ${n === 1 ? "its" : "their"} file did before`,
    "call the code the process would run from the test itself, beneath the process; only where starting it is what the test guards (a command's own line, its exit code, what it prints), list the entry in the baseline with that reason under \"grown\", by its id, and in the pull request"],
  clock: n => [`${plural(n, "file", "files")} of the rules ${n === 1 ? "reads" : "read"} the clock or ${n === 1 ? "makes" : "make"} randomness of ${n === 1 ? "its" : "their"} own`, "pass the time and the source of randomness in as arguments, so that the same input gives the same result"],
};

// The breaches no entry of the baseline covers: { fail, later }. One that only moved, under its name, claims its old
// entry and is none: the old entry is stale, and --write lists it where it stands now. One that the base held already,
// as this config reads the base's code, is no new breach either: the check reads more than it did (a system named, a
// mark lowered), the baseline was lowered in this same change past what stands, or its entry is listed under another
// id, where a breach stands now that takes it or lends it to no other, and --write, told the base, lists it; a
// breach that still stands where the base held it claims that one first, so a new one of its name takes no
// breach's place that covers itself. Of a reader the baseline does not list (`unread`), one the base held, or any where
// no base is told, is `later`: reported, never failed, until --write lists it. The rest are new, each kind with its mend.
function fresh({ config, at, self, found, current, base, news, unread }) {
  // (a file the readers cannot follow that the base held, its text as the base holds it, or any where no base is told,
  // is said, never failed: a reader that comes to take less, a file past a smaller size or one a newer grammar reads
  // otherwise, turns nothing that stood red, and only one a pull request adds or changes fails: tasks/code-shape.md,
  // "What the check reads"; AGENTS.md, "Nothing locks a project". Its text is compared, since whether a file is lost can
  // hang on the parser's time: a base read past its budget on one run excuses nothing a change brings to the file)
  const lost = id => groupOf(id).kind === "lost" && !unread(id);
  const unchanged = id => base.standing().texts[fileOf(id)] === found.texts[fileOf(id)];
  const later = base ? [] : news.filter(unread), unfollowed = base ? [] : news.filter(lost);
  if (!base) news = news.filter(id => !unread(id) && !lost(id));
  const fail = [];
  if (base && news.length) {
    const left = new Set(unclaimedOf(news, current, base.stood(), config.marks));
    const excused = id => lost(id) && unchanged(id);
    unfollowed.push(...news.filter(id => !left.has(id) && excused(id)));
    const readMore = news.filter(id => !left.has(id) && !unread(id) && !excused(id));
    later.push(...news.filter(id => !left.has(id) && unread(id)));
    news = news.filter(id => left.has(id));
    if (readMore.length) fail.push([`FAIL: ${plural(readMore.length, "breach", "breaches")} that ${base.name} held already ${readMore.length === 1 ? "is" : "are"} not in ${config.baseline}: the config reads more than it did, the baseline was lowered past what stands, or the entry is listed under another id, where a breach stands now. Mend: list them where they stand with SHAPE_BASE=${base.name} node ${self} ${at} --write, and commit the baseline`, ...some(readMore, current)]);
  }
  return { fail: [...fail, ...byKind(news, found, current, config)], later, unfollowed };
}

// The files lost that stood before, said, never failed (fresh, above).
function unfollowedNote({ config, at, self, base, unfollowed }) {
  if (!unfollowed.length) return [];
  const n = unfollowed.length, it = n === 1 ? "it" : "them";
  return [`${SAID.lost(n, config)[0]}, and ${config.baseline} does not list ${it}: ${base ? `${base.name} held ${it} already` : "no base is told"}, so nothing fails over ${it}; SHAPE_BASE=${base?.name ?? "<the base branch>"} node ${self} ${at} --write lists ${it}: ${unfollowed.join("; ")}`];
}

// The failures of new breaches, one for each kind, with its mend and the breaches under it.
function byKind(news, found, current, config, also = "") {
  const kinds = new Map();
  for (const id of news) append(kinds, found.entries.get(id).kind, id);
  return [...kinds].map(([kind, ids]) => { const [what, mend] = SAID[kind](ids.length, config); return [`FAIL: ${what}. Mend: ${mend}${also}`, ...some(ids, current)]; });
}

// The marks the config raises or drops against the base's: each by the id its reason stands under in "grown".
function raised(config, old) {
  const on = (mark, p) => (isObject(mark) ? mark[p] : mark); // a suite's mark on a platform, none where it names none
  const out = Object.keys(MARKS).filter(k => config.marks[k] > old.marks[k]).map(k => `mark: ${k}`);
  for (const [name, mark] of Object.entries(old.suites)) {
    const now = config.suites[name];
    const platforms = [...Object.keys(isObject(mark) ? mark : {}), ...Object.keys(isObject(now) ? now : {}), "any"];
    if (platforms.some(p => on(mark, p) !== undefined && !(on(now, p) <= on(mark, p)))) out.push(`mark: suite ${name}`);
  }
  if (old.wait !== undefined && !(config.wait <= old.wait)) out.push("mark: wait");
  return out;
}

const asWritten = text => (typeof text === "string" ? text.replace(/\r\n/gu, "\n").trimEnd() : null); // (a baseline's text, whatever its line endings)
const tolerant = read => { try { return read(); } catch { return null; } }; // (what the base cannot be read by holds nothing there)
const once = make => { let made = null; return () => (made ??= make()); };
// The base (`standing`, its files), read once as this config reads its code: `found`, what the check finds there, and
// `stood`, each breach's id to its numbers.
const readAt = (base, config) => {
  base.standing = once(base.standing);
  base.found = once(() => { const before = base.standing(); return survey(before.texts, config, before.tests); });
  base.stood = once(() => new Map([...base.found().entries].map(([id, e]) => [id, e.n])));
  return base;
};

// The base's breaches a baseline's entries may stand for: each of a reader the baseline names, and of one it does not
// (a reader renamed since among them: shape-readers.mjs, READERS), only the one an entry at its own id is listed for
// (`own`), which `claims` gives that entry before any other claim; so such a breach takes no entry of another's.
const readUnder = (stood, reads, readers, own) => new Map([...stood].filter(([id, n]) => reads.includes(readerOf(id, readers)) || own(id, n)));

// What the base's own check read under its baseline: each of those breaches of the base's (`readUnder`) to the id of
// the entry it claims, as a breach claims one now (`claims`), all of them at once. An entry none claims, mended
// where an earlier pull request left it listed, covers no breach, in its own place or elsewhere, and one that only a
// group-mate's grown breach stands by covers that one (#750, point 5).
function heldAt(baseline, base, marks) {
  if (!baseline.listed.size) return baseline.listed;
  const { listed, reads } = baseline, own = (id, n) => listed.has(id) && within(n, listed.get(id), marks);
  return claims(readUnder(base.stood(), reads, base.found().readers, own), listed, marks).taken;
}

// What a baseline the change wrote covers against the base (`then`, the base's own baseline; `held`, what the base's
// check read under it): its entries that the base backs, each as listed. An entry "grown" gives a reason for that
// the base's did not list as high joins in this change, and is kept. Each other claims one breach of the base's,
// as this config reads its code and the one at a joining entry's id aside, where its numbers are within what that
// breach stood under there: its entry in the base's baseline, else the breach itself (the check reads more than it
// did, or the base's baseline did not cover it). So no entry covers more than the base held, and no two one breach.
function coverAt({ listed, reads, grown }, base, marks, then, held) {
  if (!listed.size) return listed;
  const before = then?.listed ?? new Map(), readers = base.found().readers;
  const joins = new Map([...listed].filter(([id, n]) => said(grown, id) && !(before.has(id) && within(n, before.get(id), {}))));
  const under = new Map([...readUnder(base.stood(), reads, readers, id => listed.has(id))].filter(([id]) => !joins.has(id)).map(([id, n]) => [id, held.get(id) ?? n]));
  const backed = claims(new Map([...listed].filter(([id]) => !joins.has(id))), under, marks).taken;
  return new Map([...listed].filter(([id]) => joins.has(id) || backed.has(id)));
}

// A baseline against the base: `then`, the base's own baseline as the check reads it, and `old`, its config (each
// null where the base holds none the check can read); `read`, the ids of the entries the base's own check read a
// breach under, and `held`, each of those breaches to its entry's numbers, by the base's own config where this one
// reads the base's code otherwise (`own`: the base's files as a config reads them); `wrote`, whether the change writes the baseline; and `covers`, what of this
// baseline covers against the base, each entry under its own id, as the check told no base reads it: left as the
// base holds it, the entries the base's check read a breach under, and written, those the base backs (`coverAt`).
// Being the baseline less some entries, read by the same matching, it covers nothing the check told no base, as the
// push to the branch runs it, would not: a pull request that passes leaves that run passing (floor rule 12).
function thenOf(base, baseline, baselineText, config) {
  const then = base.baseline === null ? null : tolerant(() => parseBaseline(base.baseline, base.name, ""));
  const old = base.config === null ? null : tolerant(() => parseConfig(base.config, base.name));
  const own = old && JSON.stringify(old) !== JSON.stringify(config) ? readAt({ standing: () => (base.own ?? base.standing)(old) }, old) : base;
  const under = then ? heldAt(then, own, (old ?? config).marks) : new Map(), read = new Set(under.values());
  const held = new Map([...under].map(([at, id]) => [at, then.listed.get(id)])), wrote = asWritten(base.baseline) !== asWritten(baselineText);
  return { then, old, held, read, wrote, covers: wrote ? coverAt(baseline, base, config.marks, then, held) : new Map([...baseline.listed].filter(([id]) => read.has(id))) };
}

// Against the pull request's base: what joined the baseline that the base neither listed nor held, and each mark
// raised, where "grown" gives no reason.
function againstBase({ config, at, self, baseline, base, found, then, old, read }) {
  const fail = [];
  // (of what the base lists: each entry its check read a breach under, and each this baseline keeps at its id, which no other claims)
  const was = then && new Map([...then.listed].filter(([id]) => read.has(id) || baseline.listed.has(id)));
  // (the readers a baseline names only grow: one dropped would let what it lists go unlisted while it stands)
  const dropped = (then?.reads ?? []).filter(r => !baseline.reads.includes(r));
  if (dropped.length) fail.push([`FAIL: ${config.baseline} no longer names ${plural(dropped.length, "reader")} that ${base.name}'s names: ${dropped.join(", ")}. Mend: take "reads" back as ${base.name} holds it (git checkout ${base.name} -- ${config.baseline}), then run node ${self} ${at} --write if the baseline must be lowered`]);
  let joined = unclaimed(baseline.listed, was ?? new Map(), config.marks);
  if (joined.length) joined = unclaimedOf(joined, baseline.listed, base.stood(), config.marks).filter(id => !said(baseline.grown, id));
  if (joined.length) fail.push([`FAIL: ${config.baseline} lists ${plural(joined.length, "entry", "entries")} that ${base.name} neither listed nor held, and the baseline only shrinks. Mend: take each out of the baseline and mend the code as the check then says; only where there is no other way, give each its reason under "grown" in the baseline, by its id, and in the pull request, with a fresh session's word there that it found no other way`, ...some(joined, baseline.listed)]);
  // (once a system is named, a file of code the base did not hold lies in one)
  const loose = Object.keys(config.systems).length ? found.unnamed.filter(f => !(f in base.standing().texts)) : [];
  if (loose.length) fail.push([`FAIL: ${plural(loose.length, "new file", "new files")} of code ${loose.length === 1 ? "lies" : "lie"} in no system. Mend: put each under the "paths" of the system it belongs to in ${at}, or name its system there, with its paths, the systems it uses and its entrance`, ...loose.slice(0, 20).map(f => `  ${f}`)]);
  const unsaid = (old ? raised(config, old) : []).filter(id => !said(baseline.grown, id));
  if (unsaid.length) fail.push([`FAIL: ${at} raises or drops ${plural(unsaid.length, "mark")} against ${base.name}. Mend: first make the code or the suite fit its mark; only where it cannot, give the raise its reason under "grown" in ${config.baseline}, by the id below, and in the pull request, with a fresh session's word there that it found no other way`, ...unsaid.map(id => `  ${id}`)]);
  return fail;
}

// What the check read and does not hold, each said, never failed.
function notesOf(read) {
  const notes = [];
  if (read.nowhere) notes.push(`${plural(read.nowhere, "import leads", "imports lead")} nowhere the check can tell (no file, no package the project declares, no alias the config names): not held`);
  if (read.unnamed) notes.push(`${read.unnamed} of ${plural(read.files, "file")} lie in no system the config names: held to the marks and the cycles alone${read.systems ? ", and a new one fails" : ""}`);
  if (read.screens) notes.push(`${plural(read.screens, "test file")} of ${read.tests} ${read.screens === 1 ? "opens" : "open"} a screen, a window or a device (tasks/tests.md): each is listed, and a new one fails`);
  if (read.timed) notes.push(`${plural(read.timed, "test file")} of ${read.tests} ${read.timed === 1 ? "reaches" : "reach"} a real clock (tasks/tests.md): each is listed, and a new one fails`);
  if (read.processes) notes.push(`${plural(read.processes, "test file")} of ${read.tests} ${read.processes === 1 ? "starts" : "start"} another process (tasks/tests.md): each is listed, and a new one fails`);
  if (read.noEntrance && read.systems > 1) notes.push(`${plural(read.noEntrance, "system names", "systems name")} no entrance: nothing holds what the others import from ${read.noEntrance === 1 ? "it" : "them"}`);
  return notes;
}

// The check's verdict on a project: { fail: [[line, ...details]], notes, listed, read }. `base`, where the pull
// request's base is known: { name, baseline (its text there, or null), config (its text there, or null), standing: ()
// => the base's files as `config` reads them, own: other => those files as another config reads them (where it is
// left out, the files `standing` gives) }.
export function verdict({ config, at, self, found, baselineText, base }) {
  const restore = base ? `take it back as ${base.name} holds it (git checkout ${base.name} -- ${config.baseline}), then run node ${self} ${at} --write` : `write it again from what stands (delete it, then node ${self} ${at} --first), in a pull request the reviews read`;
  const baseline = parseBaseline(baselineText, config.baseline, restore);
  const current = new Map([...found.entries].map(([id, e]) => [id, e.n]));
  // (what a reader finds on the parser, where it could not run, its packages not installed for the registry not
  // answering: its functions are read as a reader's the baseline does not name, so that none fails, and a file its
  // baseline lists as lost, which only the parser tells, is kept, never gone; what the same reader finds without the
  // parser, the imports, cycles and clock of JavaScript, and a file new to the baseline, are held as ever; of a file the
  // parser reads whole (C#'s and Python's), each entry is so: #654, point 4; #530, item 6)
  const reads = new Set(baseline.reads), skipped = unreachedReaders();
  const wholly = id => { const r = found.readers.get(fileOf(id)); return skipped.includes(r) && WHOLE_ON_PARSER.includes(r); };
  const unread = id => { const r = readerOf(id, found.readers); return r !== null && (!reads.has(r) || (skipped.includes(r) && groupOf(id).kind === "function") || wholly(id)); };
  const kept = id => !current.has(id) && ((skipped.includes(readerOf(id, found.readers)) && ["function", "lost"].includes(groupOf(id).kind)) || wholly(id));
  const gone = id => !current.has(id) && !unread(id) && !kept(id);
  // (against the base, a listed entry covers what the base's code still holds of it, wherever it stands now: #750, point 5)
  // (what a reader the baseline does not name finds claims after every other, so that it leaves no other without)
  const told = base ? thenOf(readAt(base, config), baseline, baselineText, config) : null;
  const news = unclaimed(new Map([...current].sort(([a], [b]) => unread(a) - unread(b))), told?.covers ?? baseline.listed, config.marks);
  const { fail, later, unfollowed } = fresh({ config, at, self, found, current, base, news, unread });
  const lowered = staleOf({ config, at, self, baseline, wrote: told?.wrote, gone });
  fail.push(...lowered.fail);
  if (told) fail.push(...againstBase({ config, at, self, baseline, base, found, ...told }));
  const reread = [...baseline.listed.keys()].filter(id => !current.has(id) && unread(id) && !kept(id)).length;
  return { fail, notes: [...notesOf(found.read), ...lowered.notes, ...unfollowedNote({ config, at, self, base, unfollowed }), ...unlisted({ config, at, self, reads, later, reread })], listed: baseline.listed.size, read: found.read, kept: [...baseline.listed.keys()].filter(kept).length };
}

// The entries a baseline lists that are gone or moved now (`gone`): { fail, notes }. One that only shrank passes as it
// is listed, since --write lowers its numbers whenever it is run; one gone or moved fails only a change that writes the
// baseline, which then writes it whole, and is said, never failed, where the change only improves on it (#750, point 5).
function staleOf({ config, at, self, baseline, wrote, gone }) {
  const stale = [...baseline.listed.keys()].filter(gone), n = stale.length, they = n === 1 ? ["is", "it"] : ["are", "them"];
  if (!n) return { fail: [], notes: [] };
  const what = `${config.baseline} lists ${plural(n, "entry", "entries")} that ${they[0]} gone or moved now`;
  if (wrote) return { fail: [[`FAIL: ${what}, and this change writes the baseline. Mend: run node ${self} ${at} --write and commit the baseline it lowers`, ...some(stale, baseline.listed)]], notes: [] };
  return { fail: [], notes: [`${what}, which fails nothing: the code improved on the baseline. The lowered baseline leaves ${they[1]} out; node ${self} ${at} --write writes it, in the next pull request that changes the baseline or a cleaning task: ${some(stale, baseline.listed).map(l => l.trim()).join("; ")}`] };
}

// What a baseline written before a reader came does not list yet, said, never failed.
function unlisted({ config, at, self, reads, later, reread }) {
  const missing = Object.keys(READERS).filter(r => !reads.has(r)).map(r => READERS[r]);
  if (!missing.length) return [];
  const found = [later.length ? `${plural(later.length, "breach", "breaches")} that stood before ${later.length === 1 ? "is" : "are"} not listed yet` : "", reread ? `${plural(reread, "entry", "entries")} listed there ${reread === 1 ? "reads" : "read"} otherwise now` : ""].filter(Boolean);
  return [`${config.baseline} was written before the check read ${missing.join(", ")}${found.length ? `: ${found.join(", and ")}` : ""}. Nothing fails over ${found.length ? "them" : "it"}; node ${self} ${at} --write lists what stands, and the baseline it writes is committed`];
}

// ---- the commands ----

// A suite measured against its time mark: the command after --, run and timed, or the time since a start the workflow
// took.
function timed(name, rest, usage) {
  if (rest[0] === "--since" && /^\d+$/u.test(rest[1] ?? "") && rest.length === 2) return { took: Date.now() / 1000 - Number(rest[1]), status: 0 };
  if (rest[0] !== "--" || rest.length < 2) refuse("--suite takes a name, then -- and the suite's command, or --since and the second its run started at", usage);
  const start = process.hrtime.bigint();
  const r = spawnSync(rest[1], rest.slice(2), { stdio: "inherit" });
  if (r.error) refuse(`the suite ${name} could not be started (${rest[1]})`, "name a command that runs here, with no shell, after the --");
  return { took: Number(process.hrtime.bigint() - start) / 1e9, status: r.status ?? 1 };
}

function suite(config, at, self, [name, ...rest]) {
  const mark = config.suites[name ?? ""];
  if (mark === undefined) refuse(`${at} gives the suite ${JSON.stringify(name ?? "")} no time mark`, `name it under "suites" in ${at} with its mark in seconds, set with room above what it takes today so that a slow runner fails nothing`);
  const limit = isObject(mark) ? mark[process.platform] : mark;
  const { took, status } = timed(name, rest, `run node ${self} ${at} --suite ${name} -- <command>`);
  if (status !== 0) return status; // (the suite's own failure, which says its own mend)
  // (a time mark measures and never fails, tasks/tests.md; #733, point 5: past it, a warning, which the run shows)
  if (limit !== undefined && took > limit) {
    console.log(`::warning::the suite ${name} took ${Math.round(took)} s, past its mark of ${limit}, which fails nothing. Mend: add it to the open task on the tests' time, or file one where none is open: make it faster (set up only what each test needs, run only what the change can reach), or split it so that each part runs alone under a mark of its own; only where it cannot be, raise its mark in ${at} with the reason under "grown" in ${config.baseline} and in the pull request`);
    return 0;
  }
  console.log(`ok   the suite ${name} took ${Math.round(took)} s${limit === undefined ? `; ${at} gives it no mark on ${process.platform}` : `, within its mark of ${limit}`}`);
  return 0;
}

function first(config, at, self, numbers) {
  if (fs.existsSync(notLinked(config.baseline))) refuse(`${config.baseline} exists, and --first writes only a project's first baseline`, `run node ${self} ${at} to check, or with --write to lower the baseline`);
  fs.mkdirSync(path.dirname(config.baseline), { recursive: true });
  fs.writeFileSync(config.baseline, written(numbers, {}, null));
  console.log(`${config.baseline}: the first baseline, ${plural(numbers.size, "entry", "entries")} that stand today, to be cleaned over time`);
  noteScan(config.baseline);
  return 0;
}

// The baseline lowered to what still stands: an entry that is gone goes, one that moved is listed where it stands, a
// number that fell is lowered, and nothing joins but what "grown" gives a reason for and, where the base is told,
// what the base held already as this config reads its code (the check reads more than it did); there, what stands is
// read against what the old baseline covers against the base, as the check reads it (`thenOf`), so a mended entry an
// earlier pull request left listed lists nothing in its place, and a baseline written twice is the same (#750, point 5).
// What a reader the old baseline did not list finds joins it too: what stood when the check came to read it.
function write(config, at, self, numbers, base, found, named) {
  const text = fs.readFileSync(notLinked(config.baseline), "utf8");
  const old = parseBaseline(text, config.baseline, `write it again from what stands (delete it, then node ${self} ${at} --first), in a pull request the reviews read`);
  const reads = new Set(old.reads);
  const there = base && readAt(toldOf(base, named, config), config);
  let joins = unclaimed(numbers, there ? thenOf(there, old, text, config).covers : old.listed, config.marks).filter(id => reads.has(readerOf(id, found.readers)));
  if (there && joins.length) joins = unclaimedOf(joins, numbers, there.stood(), config.marks);
  joins = new Set(joins);
  const kept = new Map([...numbers].filter(([id]) => !joins.has(id) || said(old.grown, id)));
  const grown = Object.fromEntries(Object.entries(old.grown).filter(([id]) => kept.has(id) || id.startsWith("mark: ")));
  fs.writeFileSync(config.baseline, written(kept, grown, old.audited));
  console.log(`${config.baseline}: ${plural(kept.size, "entry", "entries")} listed, ${old.listed.size} before`);
  if ([...kept.keys()].some(id => !old.listed.has(id))) noteScan(config.baseline);
  return 0;
}

// The base a pull request merges into, as SHAPE_BASE names it: { name, show: file => its text there or null }, or null.
function baseOf() {
  const name = process.env.SHAPE_BASE || "";
  if (!name) return null;
  if (!/^\w[\w./^~-]*$/u.test(name)) refuse(`SHAPE_BASE (${JSON.stringify(name).slice(0, 80)}) is no plain name of a commit or branch`, "set it to the pull request's base, such as origin/main");
  try { git(["rev-parse", "--verify", "--quiet", `${name}^{commit}`]); } catch { refuse(`${name} is not a commit here`, `fetch it (git fetch origin ${name.replace(/^origin\//u, "")}), or set SHAPE_BASE to the pull request's base`); }
  return { name, show: file => tolerant(() => git(["show", `${name}:${file}`])) };
}

// Where the config is: the one named, else the one the project's rules name (its manifest; in the core, its
// AGENTS.md), else the kit's; null where the project has none yet.
function configAt(named, self, base) {
  const at = named ?? where(tolerant(() => fs.readFileSync("core-manifest.md", "utf8")) ?? tolerant(() => fs.readFileSync("AGENTS.md", "utf8")));
  if (fs.existsSync(notLinked(at))) return aFile(at);
  if (named) refuse(`there is no config at ${at}`, `write it as the starter kit does (core/setup/template/shape.json.tmpl), then node ${self} ${at} --first`);
  const was = base ? baseFiles(base, named) : null; // (where the base's own manifest places it, if this one moved it)
  const held = base?.show(at) != null ? at : was?.config != null ? was.at : null;
  if (held !== null) refuse(`${at} is gone, and ${base.name} holds it${held === at ? "" : ` at ${held}, where its manifest names it`}: no pull request takes the shape check's config out`, `take the config back as ${base.name} holds it (git checkout ${base.name} -- ${held}), and the manifest's *shape check* row with it where this pull request changed it`);
  return null;
}

const aFile = at => {
  if (!fs.statSync(at).isFile()) refuse(`${at}, where the shape check's config is named, is no file`, "name the config's own file in the manifest's *shape check* row, or move what stands at that path out of its way");
  return at;
};

// A project that has not written its config yet: held to the starter kit's own, with the pull request's base as its
// baseline, so that from the sync that brings the check nothing gets worse and nothing that stood before fails.
function unwritten(self, base) {
  const config = parseConfig(fs.readFileSync(TEMPLATE, "utf8"), "the starter kit's config");
  const yet = `the project has not written its config of the shape check yet (${KIT}; core/setup/sync-notes/, "how code is put together")`;
  if (!base) { console.log(`ok   ${yet}, and there is no base to compare with: nothing was held`); return 0; }
  const now = standing(config), found = survey(now.texts, config, now.tests);
  const current = new Map([...found.entries].map(([id, e]) => [id, e.n]));
  const news = unclaimed(current, readAt({ standing: () => standingAt(base.name, config) }, config).stood(), config.marks);
  const fail = byKind(news, found, current, config, `; a file of tests is not held to the marks once the project's own config names it under "tests"`);
  for (const line of fail.flat()) console.error(logged(line));
  if (fail.length) return 1;
  console.log(`ok   nothing new in how the code is put together against ${base.name}, by the starter kit's config: ${yet}`);
  return 0;
}

// The base's config and baseline as the base's own rules place them, so that a pull request that moves either is
// compared with the old one: the config one named on the command line (the workflow's), else the one the base's
// manifest (in the core, its AGENTS.md) names; the baseline where that config names it.
function baseFiles(base, named) {
  const own = where(base.show("core-manifest.md") ?? base.show("AGENTS.md"));
  const at = named !== null && base.show(named) !== null ? named : own; // (a config newly named is compared with the old)
  const config = base.show(at), baseline = config === null ? null : tolerant(() => parseConfig(config, base.name).baseline);
  return { at, config, baseline: baseline === null ? null : base.show(baseline) };
}

// The base as the verdict reads it: its name, its config and baseline as its own rules place them, and its files as
// this config reads them, or (`own`) as another does.
const toldOf = (base, named, config) => base && { name: base.name, ...baseFiles(base, named), standing: () => standingAt(base.name, config), own: other => standingAt(base.name, other) };

function check(config, at, self, found, base, named) {
  if (!fs.existsSync(notLinked(config.baseline))) refuse(`there is no baseline at ${config.baseline}`, `write the project's first with node ${self} ${at} --first, and commit it`);
  const v = verdict({ config, at, self, found, baselineText: fs.readFileSync(config.baseline, "utf8"), base: toldOf(base, named, config) });
  for (const note of v.notes) console.log(`note ${logged(note)}`);
  const skipped = unreachedReaders().filter(r => [...found.readers.values()].includes(r));
  // (why, with its mend, as packages.mjs words it: the registry not answering, or what the copy's installer said where it
  // ran for this check and did not install the parser's packages; #719, #1093, point 1)
  const [why, mend] = notInstalled("web-tree-sitter").split(". Mend: ");
  if (skipped.length) console.log(`::warning::The shape check did not read ${skipped.map(r => `${READERS[r]} (the reader ${r})`).join(", ")}: ${why}, so what it would find there on the parser is reported, never failed${v.kept ? `, and the ${plural(v.kept, "entry", "entries")} its baseline lists there (functions, files the grammar cannot read, and all of a file of C# or Python) ${v.kept === 1 ? "is" : "are"} kept as listed, never failed as gone` : ""}; what it reads without the parser is held as ever. Mend: ${mend}`);
  if (!base) console.log("note no base to compare with (set SHAPE_BASE to the branch the work started from), so the baseline was not checked for what joined it, and what the config newly reads is not told from what is new");
  for (const line of v.fail.flat()) console.error(logged(line));
  if (v.fail.length) return 1;
  console.log(`ok   nothing new in how the code is put together: ${plural(found.read.functions, "function")} and ${plural(found.read.imports, "import")} read, ${plural(v.listed, "old breach", "old breaches")} listed in ${config.baseline}, to be cleaned`);
  return 0;
}

// Whether the project's manifest turns the check off with a reason: it then says so, and why, and where the pull
// request's base did not, that this pull request turns it off, which only the owner does. A `none` with no reason turns
// nothing off, and it says so.
function isOff(named, rest, base) {
  if (named !== null || rest.length) return false; // (a config named, or a write or a suite asked, reads the config)
  const said = offBy(tolerant(() => fs.readFileSync("core-manifest.md", "utf8")));
  if (said === "") console.log("note the manifest's *shape check* row says `none` with no reason, which turns nothing off: the check runs. Mend: where the owner turns it off, give the owner's reason after `none`; else name the config there, or take the `none` out");
  if (!said) return false;
  if (base && !offBy(base.show("core-manifest.md"))) {
    console.log(`::warning::this pull request turns the shape check off (the manifest's *shape check* row says \`none\`: ${logged(said)}), which only the owner does; ${base.name} did not, so it runs here and is off from the next pull request on (core/tasks/code-shape.md, "Only the owner turns the shape check off")`);
    return false;
  }
  console.log(`ok   the shape check is off: the manifest's *shape check* row says \`none\`: ${logged(said)} (core/tasks/code-shape.md, "Only the owner turns the shape check off")`);
  return true;
}

// A row that says `none` keeps naming a config of the project's own path after its reason, which the config's other
// readers (the selection, the strength, the mutation) read too: a pull request whose row says `none` and drops the path
// its base names fails, whether or not the check is off by then.
function pathKept(named, base) {
  const manifest = tolerant(() => fs.readFileSync("core-manifest.md", "utf8"));
  if (named || !base || offBy(manifest) === null || rowNames(manifest) !== null) return;
  const was = baseFiles(base, null).at;
  if (was !== KIT) refuse(`the manifest's *shape check* row says \`none\` and no longer names the config at ${was}, which ${base.name}'s names, so the config's other readers (the selection, the strength, the mutation) would read the starter kit's at ${KIT}`, `keep the path in the row after the reason: | *shape check* | \`none\`: <the owner's reason>; config \`${was}\` |`);
}

function main(argv) {
  const self = path.relative(process.cwd(), fileURLToPath(import.meta.url)).replace(/\\/gu, "/"); // (as a mend names it)
  const named = argv[0] && !argv[0].startsWith("--") ? argv[0] : null, rest = named ? argv.slice(1) : argv;
  const base = baseOf();
  pathKept(named, base);
  if (isOff(named, rest, base)) return 0;
  const at = configAt(named, self, base);
  if (at === null) return unwritten(self, base);
  const config = parseConfig(fs.readFileSync(at, "utf8"), at);
  unchecked();
  if (rest[0] === "--suite") return suite(config, at, self, rest.slice(1));
  const command = { "--first": first, "--write": write }[rest[0] ?? ""];
  if (rest.length > 1 || (rest.length && !command)) refuse(`the check does not know ${rest.join(" ")}`, `run node ${self} [<config>] [--first | --write], or --suite <name> with -- <command> or --since <seconds>`);
  const now = standing(config), found = survey(now.texts, config, now.tests);
  // (a baseline is written only where every reader of a file the project holds could run: one that has no file to read
  // is no reason to refuse, so a project with no file a reader on the parser reads writes its own with the parser's
  // packages not installed)
  const skipped = unreachedReaders().filter(r => [...found.readers.values()].includes(r));
  if (command && skipped.length) refuse(`the core's packages are not installed, so ${skipped.map(r => READERS[r]).join(", ")} cannot be read and a baseline written now would leave out what stands there`, `run \`${installStep("all")}\` until it installs them, then run this again`);
  if (!command) return check(config, at, self, found, base, named);
  if (command === write && !fs.existsSync(config.baseline)) refuse(`there is no baseline at ${config.baseline}`, `write the project's first with node ${self} ${at} --first, and commit it`);
  return command(config, at, self, new Map([...found.entries].map(([id, e]) => [id, numbersOf(e.n)])), base, found, named);
}

if (started(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  // (a reader's own failure that says its mend, as the parser's that cannot be loaded, is told as the check's own)
  catch (e) { if (!(e instanceof Refused) && !/\. Mend: /u.test(String(e?.message))) throw e; console.error(`FAIL: ${logged(e.message)}`); process.exitCode = 1; }
}
