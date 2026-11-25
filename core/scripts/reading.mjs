// What a session reads, by its role and its task (tasks/roles.md, "A file for each role"; tasks/tools.md, "One
// script says what to read"; core archive 234; #304). Given a role and a task (its issue, its kinds, or the paths
// changed so far), it prints the files to read: at the start the floor (floor/security.md, whole, whatever the role),
// the role's own file under roles/ and the files that file names on its line "Reads at its start:" (a role's file
// named there brings what it names too), with the part of each tool given; then, of the other modules, those the task
// calls for. A module says when it is read in its opening paragraph, which begins "Read", in words matched here:
//   the kind `screen`, the kinds `screen` and `polish`       a kind of task: given with --kind, by a label of that
//                                                              name on the task's issue, or under its "What to read"
//   the path `.github/workflows/`, the paths `a`, `b`         a changed path: a folder (ending in /), a file's name
//                                                              wherever it lies (no /), or a path from the root (* and **)
//   the tool `claude`, every tool but `claude`                the agent tool a session runs in or hands work to
//   at the start, at its start                                read at a role's start: a role's file names it
// A role's file opens "Read ... by the role `<its file's name>`". A project gives its own paths a kind in a config of
// its own, checks/reading.json (or .github/reading.json): { "paths": { "src/screens/": "screen" } }; the paths of the
// core's copy are no change of the project's, and call for nothing; a module its manifest leaves out is never named.
// It needs only that a tool can run a command and read a file: no tool's own import or hook. A hook may call it:
// work-saved.sh, beside this file, does at a session's start, handing node the copy merged into main, so this file
// stands alone (Node's own modules, git and gh only, nothing beside it), and with --hook it reads the roles, the
// modules and the config from main's own tree, never from the checked-out branch, so that nothing a branch holds
// reaches a session's start by this line but the fact that a path changed. It reads only, with the git settings that
// run commands turned off, and what it reads of an issue is data: a label or a word there picks among the core's own
// files and can name no other.
//
//   node core/scripts/reading.mjs <role> [--tool <t>]... [--kind <k>]... [--issue <n or an inbox file>] [--path <p>]...
//   node core/scripts/reading.mjs <role> --changed [<base>]   for the paths changed since <base> (where the branch
//                                                             left origin/main); with --line, the line
//                                                             "Read for it:" for the pull request's description
//   node core/scripts/reading.mjs --kinds                     each kind, with the files it calls for
//   node scripts/reading.mjs --check                          in the core: every module and role says when it is read
//   ... | node --input-type=module - --hook                   the start hook's line: what the branch's changed paths
//                                                             call for, and nothing where they call for none
// From a project's root (the core's copy under core/), or the core's own.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const FLOOR = "floor/security.md";
export const START = "Reads at its start:";
// The line of a pull request's description that lists what its changed paths called for (pr-description.mjs asks it).
export const READ_LINE = "Read for it:";
// A description as text: one that is none (left out, or of another type) is read as empty, never as its String().
export const textOf = body => (typeof body === "string" ? body : "");
// The folders of the units a task calls for or a role's file names, each file saying when it is read: who (a role's
// shared files, a tool's part) or when (a kind of task, a topic of the floor).
export const UNITS = ["roles/shared", "tasks", "tools", "floor/topics"];
// Of those, the folders of the modules: the units a project takes or leaves out by name, each name standing once.
export const MODULES = ["roles/shared", "tasks", "tools"];
// What a path any project may hold is of, whatever its folders: a lock file of any package manager is an update. The
// patterns stand here once, and each file an update calls names the kind alone.
export const KINDS_BY_PATH = ["*.lock", "*.lockb", "*.lock.json", "*-lock.json", "*-lock.yaml", "*-shrinkwrap.json", "go.sum"].map(pattern => ({ path: pattern, kind: "update" }));
// The floor's threat model, read with a security review, whose words are not changed to say so.
export const FLOOR_WHEN = { "floor/threat-model.md": { kinds: ["security-review"], paths: [] } };
const WORD = /^[a-z][a-z0-9-]{0,39}$/u;
const ticks = text => [...String(text).matchAll(/`([^`\n]+)`/gu)].map(m => m[1]);
const LIST = "((?:`[^`\\n]+`(?:,? (?:and |or )?)?)+)";
const clause = (said, lead) => [...said.matchAll(new RegExp(`\\b${lead} ${LIST}`, "gu"))].flatMap(m => ticks(m[1]));

// A file's opening paragraph: the first after its title.
export function opening(text) {
  const lines = String(text ?? "").replace(/\r\n/gu, "\n").split("\n");
  let i = lines.findIndex(l => /^# /u.test(l)) + 1;
  while (i < lines.length && !lines[i].trim()) i++;
  const para = [];
  for (; i < lines.length && lines[i].trim(); i++) para.push(lines[i].trim());
  return para.join(" ");
}

// When a file says it is read: { start, kinds, paths, tools, others (every tool but these), roles }, or null where its
// opening paragraph does not begin "Read".
export function whenOf(text) {
  const said = opening(text);
  if (!/^Read\b/u.test(said)) return null;
  return { start: /\bat (?:the|its) start\b/u.test(said), kinds: clause(said, "the kinds?"), paths: clause(said, "the paths?"),
    tools: clause(said, "the tools?"), others: clause(said, "every tool but"), roles: clause(said, "the roles?") };
}

// The files a role's file names after a lead ("Reads at its start:"), up to the first stop or semicolon.
export function readsOf(text, lead) {
  const lines = String(text ?? "").replace(/\r\n/gu, "\n").split("\n");
  const at = lines.findIndex(l => l.startsWith(`**${lead}**`));
  if (at < 0) return null;
  let end = at;
  while (end + 1 < lines.length && lines[end + 1].trim()) end++;
  const said = lines.slice(at, end + 1).join(" ").slice(lead.length + 4);
  return ticks(said.split(/[;.](?:\s|$)/u)[0]).filter(f => f.endsWith(".md"));
}

// Whether a changed path matches a pattern of a module's line.
// A pattern as its parts: each character a literal, `*` any run of characters but "/", `**` (with a "/" after it, which
// it takes) any run at all, a line's end included. Matched by walking the path once for each part, never by a regular
// expression, whose backtracking takes time that grows exponentially with the stars a pattern a branch writes holds side
// by side; stars side by side are one part (`**` where either is), so a run of them costs one walk.
const partsOf = p => {
  const out = [], wild = part => { const last = out[out.length - 1]; if (last === STAR || last === ANY) out[out.length - 1] = last === ANY || part === ANY ? ANY : STAR; else out.push(part); };
  for (let i = 0; i < p.length; i++) { if (p[i] !== "*") out.push(p[i]); else if (p[i + 1] === "*") { wild(ANY); i += p[i + 2] === "/" ? 2 : 1; } else wild(STAR); }
  return out;
};
const STAR = Symbol("*"), ANY = Symbol("**");
// What one reading's tries may take, in steps (#673). A reading (a run of this script, a pull request's description, a
// tree the total read sums) is given a budget of its own and makes its patterns ready in it, never in one another
// reading spent, so that no answer hangs on what was read before it. Making a pattern ready costs MAKE and TRY for each
// of its characters, and making the parts for its walk TRY for each again, each once a reading; a try, TRY and what it
// compares, at most the path's length and the pattern's; and a walk, two for each part for each character of the
// path. Once a step cannot be paid, that try and every try after it in the reading match, which calls for more
// reading, never less: beyond reading its patterns and its paths once, a reading's tries then take at most STEPS, some
// tens of milliseconds, whatever their count and length, and each of the core's own readings takes under a tenth.
export const STEPS = 1 << 24, TRY = 16, MAKE = 1024;
export const budget = (steps = STEPS) => ({ left: steps, over: false, made: new Map() });
const paid = (within, steps) => {
  if (!within.over && steps <= within.left) { within.left -= steps; return true; }
  within.over = true;
  within.left = 0;
  return false;
};
// A pattern made ready for the reading `within`, or null where that cannot be paid: a folder (ending in /), which holds
// every path under it; one with no star, which is the path, or its name, exactly; any other, its literal runs (the text
// between its stars, as partsOf reads them), which must stand in the path in their order (a check in one pass that
// turns away nearly every path before the walk), the first at its start and the last at its end; and its parts, made
// for its first walk.
const WILD = /\*\*\/|\*\*|\*/u;
function patternOf(given, within) {
  if (!within.made.has(given)) {
    if (!paid(within, MAKE + TRY * given.length)) return null;
    const p = given.startsWith("./") ? given.slice(2) : given, runs = p.split(WILD), whole = p.includes("/");
    within.made.set(given, p.endsWith("/") ? { folder: p } : runs.length === 1 ? { whole, exact: p }
      : { p, whole, exact: null, runs: runs.filter(Boolean), first: runs[0], last: runs[runs.length - 1], parts: null });
  }
  return within.made.get(given);
}
// A changed path as a pattern reads it: its separators "/", a leading "./" taken off, and its name, what follows its
// last "/".
const pathOf = file => {
  const f = String(file), slashed = f.includes("\\") ? f.replaceAll("\\", "/") : f, whole = slashed.startsWith("./") ? slashed.slice(2) : slashed;
  return { whole, name: whole.slice(whole.lastIndexOf("/") + 1) };
};
function inOrder(runs, s) { let from = 0; for (const r of runs) { const at = s.indexOf(r, from); if (at < 0) return false; from = at + r.length; } return true; }
function globbed(parts, s) {
  let at = new Uint8Array(s.length + 1);
  at[0] = 1;
  for (const part of parts) {
    const next = new Uint8Array(s.length + 1);
    if (typeof part === "string") { for (let j = 0; j < s.length; j++) if (at[j] && s[j] === part) next[j + 1] = 1; }
    else for (let j = 0; j <= s.length; j++) next[j] = at[j] || (j > 0 && next[j - 1] && (part === ANY || s[j - 1] !== "/")) ? 1 : 0;
    at = next;
  }
  return at[s.length] === 1;
}
// One try of a pattern on a path, both made ready, its steps paid from `within`: whether it matches, true where they
// cannot be paid.
function tried(g, n, within) {
  if (g.folder !== undefined) return !paid(within, TRY + Math.min(g.folder.length, n.whole.length)) || n.whole.startsWith(g.folder);
  const s = g.whole ? n.whole : n.name;
  if (g.exact !== null) return !paid(within, TRY + (s.length === g.exact.length ? s.length : 0)) || s === g.exact;
  if (!paid(within, TRY + Math.min(s.length, g.first.length + g.last.length))) return true;
  if (!s.startsWith(g.first) || !s.endsWith(g.last)) return false;
  if (!paid(within, s.length + g.p.length)) return true;
  if (!inOrder(g.runs, s)) return false;
  if (g.parts === null) { if (!paid(within, TRY * g.p.length)) return true; g.parts = partsOf(g.p); }
  return !paid(within, 2 * g.parts.length * (s.length + 1)) || globbed(g.parts, s);
}
// Whether a changed path matches a pattern, the steps paid from `within`, the reading's budget, which every caller gives
// (none given is refused, so no caller tries patterns outside a reading's bound), or true where they cannot be paid.
export function matches(pattern, file, within) {
  if (!within || typeof within.left !== "number" || !(within.made instanceof Map)) throw new TypeError("matches(): no reading's budget given. Mend: pass the reading's budget(), as calledByPaths does");
  const g = patternOf(String(pattern), within), name = String(file);
  return g === null || !paid(within, name.length) || tried(g, pathOf(name), within);
}

// The core's roles and modules as they say when they are read: `read(file)` gives a file's text or null, `list(folder)`
// the Markdown files of a folder of the core, by their paths in it.
export function gather(read, list) {
  const roles = {}, modules = {};
  for (const f of list("roles")) { const text = read(f); roles[f] = { name: path.posix.basename(f, ".md"), when: whenOf(text), start: readsOf(text, START) }; }
  for (const f of UNITS.flatMap(list)) modules[f] = whenOf(read(f));
  return { roles, modules };
}

// The path of the core a manifest's text names, "core/" where its "Core:" line names none: core-path.mjs reads the line
// whole, and this its path alone, since the start hook runs this file from git with no file beside it to import
// (core-path-test.mjs holds the two to each other).
export const pathIn = manifest => /^Core: \S+(?: at [0-9a-f]{40}, copied whole|, carried by (?:[A-Za-z0-9_][A-Za-z0-9._-]*\/)+) under ((?:[A-Za-z0-9_][A-Za-z0-9._-]*\/)+)(?= |$)/mu.exec(String(manifest ?? ""))?.[1] ?? "core/";
// Where the core lies under `dir`: the manifest's path in a project (core/ as a rule), "" in the core's own repository,
// null where neither holds its roles and floor.
export function coreAt(dir) {
  const manifest = regular(dir, "core-manifest.md"); // (null: the core's own root, or no project)
  return [...(manifest === null ? [] : [pathIn(manifest)]), ""].find(prefix => real(dir, `${prefix}roles`) === "folder" && real(dir, `${prefix}${FLOOR}`) === "file") ?? null;
}
// What stands at the path `rel` under `dir`: "file" or "folder" where it and each folder on the way to it is a real one,
// "link" where any of them is a symbolic link, null where one is missing, a pipe or a device. Each part is read with
// lstat, so no link is followed at any depth, as a fork's branch may make any of them one (#848); `dir` itself is the
// caller's. A path that leaves `dir` is null. Its parts are split where the system splits a path, "/" alone where a
// backslash is a letter of a name, and `at` is the path the walk read, which is the one a reader opens.
function walk(dir, rel) {
  let at = dir, kind = "folder";
  for (const part of String(rel).split(path.sep === "\\" ? /[\\/]+/u : /\/+/u).filter(p => p && p !== ".")) {
    if (kind !== "folder" || part === "..") return { kind: null, at };
    at = path.join(at, part);
    let s;
    try { s = fs.lstatSync(at); } catch { return { kind: null, at }; }
    if (s.isSymbolicLink()) return { kind: "link", at };
    kind = s.isDirectory() ? "folder" : s.isFile() ? "file" : null;
  }
  return { kind, at };
}
export const real = (dir, rel) => walk(dir, rel).kind;
// A file's text where it is a regular file of the checkout's own, else null: a link (to a pipe, which never answers, to
// an endless device or to a file outside the checkout), at its own place or on the way to it, a device, a pipe or a
// folder reads as no file (#848).
export const regular = (dir, rel) => { try { const w = walk(dir, rel); return w.kind === "file" ? fs.readFileSync(w.at, "utf8") : null; } catch { return null; } };
// The Markdown files of a real folder of the checkout, by their paths under `dir`; each link met, in the folder or on the
// way to it, goes into `links` and is listed as no file.
export function realFiles(dir, folder, links) {
  const kind = real(dir, folder);
  if (kind === "link") links.add(folder);
  if (kind !== "folder") return [];
  let entries;
  try { entries = fs.readdirSync(walk(dir, folder).at, { withFileTypes: true }); } catch { return []; }
  for (const e of entries) if (e.isSymbolicLink()) links.add(path.posix.join(folder, e.name));
  return entries.filter(e => e.isFile() && e.name.endsWith(".md")).map(e => e.name).sort();
}
// The core's roles and modules under `dir` and `prefix`, and `links`: each symbolic link met where they stand, by its
// path under `dir`, read as nothing and refused by the reader (main, below).
export function library(dir, prefix) {
  const links = new Set();
  const read = f => regular(dir, `${prefix}${f}`);
  const list = folder => realFiles(dir, `${prefix}${folder}`, links).map(f => `${folder}/${f}`);
  const lib = gather(read, list);
  // (the floor's own folder and the core's AGENTS.md hold rules too, which rules.mjs reads: a link there is refused as well)
  realFiles(dir, `${prefix}floor`, links);
  if (real(dir, `${prefix}AGENTS.md`) === "link") links.add(`${prefix}AGENTS.md`);
  return { ...lib, links: [...links].sort() };
}

// The modules a project's manifest leaves out, by their names: its "Modules:" line is a list that does not name the
// module, and its "Not taken:" line does. Where the line says "all", or cannot be read, none is left out: in doubt a
// module is taken (manifest-reads.mjs reads the two lines the same way).
export function leftOut(manifest) {
  const text = String(manifest ?? ""), NAME = "`(?:[\\w-]+\\/)*([\\w.-]+?)(?:\\.md)?`";
  const names = (t, after) => [...t.matchAll(new RegExp(NAME + after, "gu"))].map(m => `${m[1]}.md`);
  const line = /\bModules:\s*([^\n]*)/u.exec(text)?.[1].trim() ?? "", taken = new Set(/^all\b/iu.test(line) ? [] : names(line, ""));
  // (a name's reason, in the brackets after it, names no module, whatever it holds in backticks)
  return new Set(taken.size ? names(/^Not taken:\s*(.*)$/mu.exec(text)?.[1] ?? "", "(?:\\s*\\([^)]*\\))?").filter(n => !taken.has(n)) : []);
}
// The core's roles and units without the modules a project leaves out; a topic of the floor is never left out.
export const taken = (lib, out) => ({ roles: lib.roles, modules: Object.fromEntries(Object.entries(lib.modules).filter(([f]) => f.startsWith("floor/") || !out.has(path.posix.basename(f)))) });

// The kinds a project gives its own paths, [{ path, kind }], from its config's text ({ "paths": { "<path>": "<kind>" } }).
export const OWN = ["checks/reading.json", ".github/reading.json"];
export function ownPaths(text) {
  let paths = null;
  try { paths = JSON.parse(String(text ?? "")).paths; } catch { /* (no config, or none that reads: no path of its own has a kind) */ }
  return Object.entries(paths !== null && typeof paths === "object" && !Array.isArray(paths) ? paths : {}).filter(([p, k]) => p && typeof k === "string" && WORD.test(k)).map(([p, kind]) => ({ path: p, kind }));
}

// Every kind the modules name, each with the files it calls for.
export function kindsOf(lib) {
  const out = new Map();
  const put = (kind, file) => out.set(kind, [...(out.get(kind) ?? []), file]);
  for (const [f, w] of Object.entries(FLOOR_WHEN)) for (const k of w.kinds) put(k, f);
  for (const [f, w] of Object.entries(lib.modules)) for (const k of w?.kinds ?? []) put(k, f);
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)));
}

// A changed path as it is printed: as it is spelled, or, where it holds a control character (a line break, an escape),
// in quotes with that character written out, so that no path's name reads as a line of this script's own.
export const shown = p => (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(p) ? JSON.stringify(p).replace(/[\u007f-\u009f\u2028\u2029]/gu, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`) : p);
// What the changed paths call for, whatever the role: [{ file, why }], each file once, by the first path that called it.
// Its tries spend `within`, the reading's budget (a budget of its own where none is given); a file called once it is
// spent says so, as PAST.
export const PAST = "the changed paths, past the steps a reading tries them for, where each pattern left counts as matching";
export function calledByPaths(lib, paths, own = [], within = budget()) {
  const out = new Map(), kinds = new Map(), ready = paths.map(pathOf);
  // (the first path some of the patterns match: each kind's patterns, and each module's, are tried together, so that
  // past the budget, where every try matches, each answers at once, with the first path)
  const first = patterns => {
    if (!patterns.length || !paths.length) return undefined;
    const made = [];
    for (const p of patterns) { const g = within.over ? null : patternOf(String(p), within); if (g === null) return paths[0]; made.push(g); }
    return paths[ready.findIndex(n => made.some(g => tried(g, n, within)))];
  };
  const why = (hit, rest = "") => `${within.over ? PAST : `the path ${shown(hit)}`}${rest}`;
  const byKind = (rules, rest) => {
    const of = new Map();
    for (const r of rules) if (!kinds.has(r.kind)) { if (!of.has(r.kind)) of.set(r.kind, []); of.get(r.kind).push(r.path); }
    for (const [kind, patterns] of of) { const hit = first(patterns); if (hit !== undefined) kinds.set(kind, why(hit, rest(kind))); }
  };
  byKind(KINDS_BY_PATH, () => "");
  byKind(own, kind => `, of the kind ${kind} by the project's reading config`);
  for (const [f, w] of [...Object.entries(FLOOR_WHEN), ...Object.entries(lib.modules)]) {
    if (!w) continue;
    const hit = first(w.paths), kind = w.kinds.find(k => kinds.has(k));
    if (hit !== undefined) out.set(f, why(hit)); else if (kind) out.set(f, kinds.get(kind));
  }
  return [...out].map(([file, why]) => ({ file, why }));
}

// What the kinds given call for ([{ kind, why }]): [{ file, why }], the floor's topics among them.
function calledByKinds(lib, given) {
  return [...Object.entries(FLOOR_WHEN), ...Object.entries(lib.modules)].map(([file, w]) => ({ file, why: given.find(g => w?.kinds.includes(g.kind))?.why })).filter(c => c.why);
}
// The part of each tool given: the modules that name it, or name every tool but others, as { start: [file], task: [{ file, why }] }.
function toolParts(lib, tools) {
  const start = [], task = [];
  for (const [file, w] of Object.entries(lib.modules)) {
    const tool = w ? tools.find(t => w.tools.includes(t) || (w.others.length && !w.others.includes(t))) : undefined;
    if (tool !== undefined) (w.start ? start : task).push(w.start ? file : { file, why: `the tool ${tool}` });
  }
  return { start, task };
}

// What a session reads: { start: [file], task: [{ file, why }] }, or { error } where the role has no file. `tools`,
// `kinds` ([{ kind, why }] or names), `paths` and `named` (files an issue names) are the task; `within`, the budget its
// paths' tries spend, a fresh one where none is given.
export function reading(lib, { role, tools = [], kinds = [], paths = [], named = [], own = [], within }) {
  const file = Object.keys(lib.roles).find(f => lib.roles[f].name === role);
  if (!file) return { error: `"${role}" is no role the core has a file for. Mend: give one of ${Object.values(lib.roles).map(r => r.name).join(", ")} (the builder, where your brief names none)` };
  const start = [FLOOR], task = new Map(), parts = toolParts(lib, tools);
  // (a role's file named on another's line brings what it names too)
  const take = f => { if (start.includes(f)) return; start.push(f); for (const g of lib.roles[f]?.start ?? []) take(g); };
  take(file);
  for (const f of parts.start) take(f);
  const call = c => { if (!start.includes(c.file) && !task.has(c.file)) task.set(c.file, c.why); };
  parts.task.forEach(call);
  for (const f of named) call({ file: f, why: "the issue names it" });
  calledByKinds(lib, kinds.map(k => (typeof k === "string" ? { kind: k, why: `the kind ${k}` } : k))).forEach(call);
  calledByPaths(lib, paths, own, within).forEach(call);
  return { start, task: [...task].map(([f, why]) => ({ file: f, why })) };
}

// What is wrong, one line each with its mend, with how the core's roles and modules say when they are read.
const FORM = "the kind `<a word>`, the path `<a path>` or the tool `<its name>`";
function roleFaults(f, r, exists) {
  const found = [];
  if (!WORD.test(r.name)) found.push(`${f}: its name is no word a session can give as its role. Mend: name the file in small letters, digits and hyphens`);
  if (!r.when?.roles.includes(r.name)) found.push(`${f} does not say when it is read. Mend: open it, under its title, with a paragraph that begins "Read" and holds "the role \`${r.name}\`"`);
  if (!r.start) found.push(`${f} names no file its role reads at its start. Mend: give it a paragraph that opens "**${START}**" and names each shared file in backticks, by its path in the core`);
  for (const g of r.start ?? []) {
    if (!exists(g)) found.push(`${f} names ${g}, which is no file of the core. Mend: name the file as it now stands, or take it out`);
    if (g === FLOOR) found.push(`${f} names ${FLOOR}, which every role reads whatever its file names. Mend: take it out of the line`);
  }
  return found;
}
function moduleFaults(f, w, named) {
  if (!w) return [`${f} does not say when it is read. Mend: open it, under its title, with a paragraph that begins "Read" and says when, in words the reading script matches: ${FORM}; or have a role's file name it`];
  const found = w.kinds.filter(k => !WORD.test(k)).map(k => `${f}: \`${k}\` is no kind the script can match. Mend: write the kind as one word of small letters, digits and hyphens`);
  const tool = w.tools.length + w.others.length;
  if (!(w.kinds.length + w.paths.length + tool) && !named) found.push(`${f} says "Read" but not when in words the reading script matches, and no role's file names it. Mend: add to its opening paragraph ${FORM}, or name it on a role's line "${START}"`);
  if (w.start && !named && !tool) found.push(`${f} says it is read at the start, and no role's file names it. Mend: name it on the line "${START}" of each role that reads it then (roles/), or say when a task calls for it`);
  return found;
}
export function faults(lib, exists) {
  const named = new Set(Object.values(lib.roles).flatMap(r => r.start ?? []));
  return [...Object.entries(lib.roles).flatMap(([f, r]) => roleFaults(f, r, exists)), ...Object.entries(lib.modules).flatMap(([f, w]) => moduleFaults(f, w, named.has(f)))];
}

// The files a description's line lists: its last line that starts "Read for it:", or null where there is none.
export function listed(body) {
  const line = textOf(body).split(/\r\n|\r|\n/u).map(l => l.trim()).filter(l => l.startsWith(READ_LINE)).at(-1);
  return line === undefined ? null : ticks(line);
}
// What a description's line lacks of what the changed paths called for, as the failure with its mend; null where
// nothing: the paths called for nothing, or the line lists each file.
export function lineMend(body, called, command) {
  const has = listed(body) ?? [], lacks = called.filter(c => !has.includes(c.file));
  if (!lacks.length) return null;
  return `the description's line "${READ_LINE}" ${listed(body) ? "does not list" : "is missing; it must list"} ${lacks.map(c => `\`${c.file}\` (${c.why})`).join(", ")}, which the changed paths call for. Mend: read each of those files whole, check the change against it, then add it in backticks to a line "${READ_LINE} ..." of the description (${command} prints the line)`;
}

// git, read only: its output, or null where it fails. The settings that run commands (fsmonitor, hooks) are turned
// off; it never asks for a sign-in, never fetches what a clone made without its files lacks, and is given ten seconds
// a call, the hook's line eight for all of them, so that a session's start is held no longer than that.
const QUIET = { GIT_TERMINAL_PROMPT: "0", GIT_NO_LAZY_FETCH: "1", GCM_INTERACTIVE: "never" };
let until = Infinity; // (the hook's line has eight seconds for all its calls together: past them each call fails at once)
const git = (dir, ...args) => {
  const left = until - Date.now();
  if (left <= 0) return null;
  const r = spawnSync("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"], timeout: Math.min(10000, left), env: { ...process.env, ...QUIET } });
  return r.status === 0 ? r.stdout : null;
};
// The project's main as its remote holds it, by its whole name: a tag or a branch named origin/main stands for nothing.
const MAIN = "refs/remotes/origin/main";
// The paths of a change that are the project's own: in a project, not those of the core's copy, which a sync moves and
// the core's own pull request held to its reading.
export const ownOf = (paths, prefix) => (prefix ? paths.filter(p => !p.startsWith(prefix)) : paths);
// The paths changed since `base` (a commit; left out, where the branch left the remote's main): committed or not, new
// files too, a renamed file by both its names, each as it is spelled (-z: git quotes none of them).
export function changed(dir, base) {
  const from = base || git(dir, "merge-base", MAIN, "HEAD")?.trim();
  if (!from) return null;
  const diff = git(dir, "diff", "--name-only", "--no-renames", "-z", "--end-of-options", from), fresh = git(dir, "ls-files", "--others", "--exclude-standard", "-z");
  return diff === null ? null : [...new Set(`${diff}\0${fresh ?? ""}`.split("\0").filter(Boolean))];
}

// The section "What to read" of an issue's text (a heading, or a line in bold as the issue forms write it): its words
// in backticks, up to the next heading or line in bold.
export function asked(body) {
  const lines = String(body ?? "").split(/\r\n|\r|\n/u), head = l => /^\s*(?:#{1,6}\s+\S|\*\*[^*]+\*\*\s*$)/u.test(l);
  const at = lines.findIndex(l => head(l) && /^\s*(?:#{1,6}\s+|\*\*)What to read\b/iu.test(l));
  if (at < 0) return [];
  const end = lines.findIndex((l, i) => i > at && head(l));
  return ticks(lines.slice(at + 1, end < 0 ? lines.length : end).join("\n"));
}
// An issue as the task: its labels and its text, by gh for a number, from the file for an item of the inbox's folder.
function issue(dir, which) {
  // (an item of the inbox's folder: a regular file of the checkout, as the rule files are, else none)
  if (!/^\d{1,9}$/u.test(which)) { const body = regular(dir, path.relative(dir, path.resolve(dir, which))); return body === null ? null : { labels: [], body }; }
  const origin = git(dir, "remote", "get-url", "origin")?.trim() ?? "";
  const repo = process.env.GITHUB_REPOSITORY || /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/u.exec(origin)?.[1] || /\/git\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/u.exec(origin)?.[1];
  if (!repo || !/^[\w.-]+\/[\w.-]+$/u.test(repo) || repo.split("/").some(part => /^\.+$/u.test(part))) return null;
  const r = spawnSync("gh", ["api", `repos/${repo}/issues/${which}`], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 24 });
  try { const got = JSON.parse(r.status === 0 ? r.stdout : "null"); return got && { labels: (got.labels ?? []).map(l => String(l?.name ?? "")), body: String(got.body ?? "") }; } catch { return null; }
}

const many = (argv, flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? [argv[i + 1]] : []));
// The task the arguments give: its kinds ([{ kind, why }]), the files its issue names, its paths, and what to note.
function taskOf(argv, dir, lib, self) {
  const kinds = kindsOf(lib), notes = [], given = many(argv, "--kind").map(k => ({ kind: k, why: `the kind ${k}` })), named = [];
  for (const k of given) if (!kinds.has(k.kind)) notes.push(`no module is read for the kind "${k.kind}" (${self} --kinds lists them)`);
  for (const which of many(argv, "--issue")) {
    const got = issue(dir, which);
    if (!got) { notes.push(`the issue ${which} could not be read: give its kinds with --kind (${self} --kinds lists them)`); continue; }
    given.push(...got.labels.filter(l => kinds.has(l)).map(l => ({ kind: l, why: `the kind ${l}, the issue's label` })));
    for (const word of asked(got.body)) {
      const f = word.replace(/^core\//u, "");
      if ([lib.modules, lib.roles, FLOOR_WHEN].some(of => Object.hasOwn(of, f))) named.push(f);
      else if (kinds.has(word)) given.push({ kind: word, why: `the kind ${word}, which the issue names` });
      else if (WORD.test(word)) notes.push(`the issue names "${word}" under "What to read", which is no kind or file of the core`);
    }
  }
  const paths = many(argv, "--path");
  if (argv.includes("--changed")) {
    const got = changed(dir, many(argv, "--changed")[0]);
    if (got === null) notes.push("the changed paths could not be read from git: give each with --path");
    else paths.push(...got);
  }
  return { kinds: given, named, paths: ownOf(paths, coreAt(dir)), notes };
}
// The start hook's line: what the paths changed on the checked-out branch call for, by the roles, modules and config
// of main's own tree (the copy at the manifest's path where main holds one), named by main's files alone; null where
// they call for nothing, or main cannot be read.
// How the start hook reads a file or folder of the core: git's `command` ("show", or "ls-tree" with `flag`) on `f`, a
// path within the core, from main's tree, or, where the manifest says a library carries the core and main holds it as
// a submodule, from the library's commit main pins, in the submodule's own repository, both with no replaced objects.
function treeOf(dir, manifest, prefix) {
  const library = /^Core: \S+, carried by ((?:[A-Za-z0-9_][A-Za-z0-9._-]*\/)+) under /mu.exec(String(manifest ?? ""))?.[1] ?? "";
  const ask = (at, rev, command, flag, f) => git(at, "--no-replace-objects", command, ...(flag ? [flag] : []), `${rev}:${f}`);
  let pin; // (the library's commit main pins, looked up once)
  return (command, flag, f) => {
    const own = ask(dir, MAIN, command, flag, `${prefix}${f}`);
    if (own !== null || !library) return own;
    pin ??= git(dir, "--no-replace-objects", "rev-parse", `${MAIN}:${library.slice(0, -1)}`)?.trim() ?? "";
    return /^[0-9a-f]{40}$/u.test(pin ?? "") ? ask(path.join(dir, library), pin, command, flag, `${prefix.slice(library.length)}${f}`) : null;
  };
}
export function hookLine(dir, ms = 8000) {
  until = Date.now() + ms;
  const read = f => git(dir, "--no-replace-objects", "show", `${MAIN}:${f}`);
  const manifest = read("core-manifest.md"), prefix = manifest === null ? "" : pathIn(manifest);
  // (the core's files from main's tree, or, where a library's submodule carries the core, from the library's commit main
  // pins, in the submodule's own repository: tasks/repositories.md)
  const inCore = treeOf(dir, manifest, prefix);
  const list = folder => (inCore("ls-tree", "--name-only", folder) ?? "").split("\n").filter(f => /^[a-z0-9-]+\.md$/u.test(f)).map(f => `${folder}/${f}`);
  const lib = taken(gather(f => inCore("show", null, f), list), leftOut(manifest ?? "")), paths = ownOf(changed(dir) ?? [], prefix);
  const called = calledByPaths(lib, paths, prefix ? ownPaths(OWN.map(read).find(text => text !== null)) : []);
  const late = Date.now() >= until;
  until = Infinity;
  // (out of time, nothing is said: a list read in part would name too little)
  return called.length && !late ? `What this branch has changed calls for ${called.map(c => `\`${prefix}${c.file}\``).join(", ")}: read each whole before going on (\`node ${prefix}scripts/reading.mjs <your role> --changed\` says why).` : null;
}
// The modes that print of the core alone: the check, the kinds. Null where the arguments ask neither.
function alone(argv, dir, prefix, lib) {
  if (argv.includes("--check")) {
    const found = faults(lib, f => real(dir, `${prefix}${f}`) === "file");
    for (const f of found) console.error(`FAIL: ${f}`);
    if (!found.length) console.log(`each of the ${Object.keys(lib.modules).length} modules and ${Object.keys(lib.roles).length} roles says when it is read, in words the reading script matches`);
    return found.length ? 1 : 0;
  }
  if (!argv.includes("--kinds")) return null;
  for (const [k, files] of kindsOf(lib)) console.log(`${k.padEnd(16)} ${files.map(f => `${prefix}${f}`).join(", ")}`);
  return 0;
}

// Where the core lies under `dir`, its roles and modules, and the project's manifest; the exit code, said, where the
// core is not there or a link stands where its rules do.
function located(dir) {
  const prefix = coreAt(dir);
  if (prefix === null) { console.error("FAIL: the core's roles/ and floor/ are not here as a real folder and file, none of them or the folders above them a link. Mend: run it from the project's root, where core-manifest.md names the core's path, or from the core's own root; where the core's copy is a link, put the copy itself in its place"); return 1; }
  const manifest = prefix ? regular(dir, "core-manifest.md") : null; // (leftOut reads none as no line)
  const all = library(dir, prefix);
  for (const l of all.links) console.error(`FAIL: ${shown(l)} is a symbolic link where the core's rules stand, and is read as nothing. Mend: put the file or folder itself in its place, or take the link out`);
  if (all.links.length) return 1;
  return { prefix, all, manifest };
}

function main(argv) {
  const dir = process.cwd();
  if (argv.includes("--hook")) { const line = hookLine(dir); if (line) console.log(line); return 0; }
  const core = located(dir);
  if (typeof core === "number") return core;
  const { prefix, all, manifest } = core;
  const lib = taken(all, leftOut(manifest)), at = f => `${prefix}${f}`, self = `node ${prefix}scripts/reading.mjs`;
  const mode = alone(argv, dir, prefix, lib);
  if (mode !== null) return mode;
  const role = argv[0] && !argv[0].startsWith("--") ? argv[0] : "", tools = many(argv, "--tool"), task = taskOf(argv, dir, lib, self);
  const config = prefix ? OWN.find(f => real(dir, f) === "file") : undefined, own = config ? ownPaths(regular(dir, config)) : [];
  if (argv.includes("--line")) {
    const called = calledByPaths(lib, task.paths, own);
    console.log(`${READ_LINE} ${called.length ? called.map(c => `\`${at(c.file)}\``).join(", ") : "nothing its paths call for"}`);
    return 0;
  }
  const got = reading(lib, { role, tools, kinds: task.kinds, paths: task.paths, named: task.named, own });
  if (got.error) { console.error(`FAIL: ${got.error}`); return 1; }
  const notes = [...task.notes];
  if (prefix && argv.includes("--changed") && !config) notes.push(`no path of this project's own has a kind: to have a changed screen or the like call its module, name each folder in ${OWN[0]} as { "paths": { "<folder>/": "<kind>" } } (${self} --kinds lists the kinds)`);
  print(role, got, at, tools.length > 0, notes);
  return 0;
}
// What a session reads, printed: the start, then what the task calls for with why, then the notes.
function print(role, got, at, tool, notes) {
  console.log(`Read at the start, in the role ${role} (each whole):`);
  for (const f of got.start) console.log(`  ${at(f)}`);
  if (!tool) console.log("  and your tool's part: give --tool <its name> (a module names its tool in its opening line)");
  console.log(got.task.length ? "Read for this task:" : "Nothing more is called for by this task as given.");
  for (const t of got.task) console.log(`  ${at(t.file).padEnd(34)} ${t.why}`);
  for (const n of notes) console.log(`note ${n}`);
}

// (started by its own file, as started.mjs beside it tells, or handed to node on its input, as the start hook hands it:
// node then names it "[eval1]" and its first argument is "-"; imported, or named in a `node -e`, it runs nothing)
const direct = () => { try { return process.argv[1] === "-" ? import.meta.url.endsWith("/[eval1]") : Boolean(process.argv[1]) && [process.argv[1], fs.realpathSync(process.argv[1])].some(p => import.meta.url === pathToFileURL(p).href); } catch { return false; } };
if (direct()) process.exitCode = main(process.argv.slice(2));
