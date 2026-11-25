// The measures of how a codebase is put together (#245): the audit's numbers kept as a script, so the next audit is a
// run and not a study. It reads the JavaScript and TypeScript files git holds and prints a summary; with --json it
// writes every number. It measures and fails nothing: what is held of it, and how, is the shape check's (shape.mjs,
// beside this file, which reads with this file's readers; tasks/code-shape.md). Node's own modules, git and the
// parser's installed packages.
//
// What it gives, of the files it reads:
//   - imports: how many, how many cross a folder, those of code that lead to no file, and the pairs of folders that
//     import each other both ways (no layer is declared yet, so a pair that runs both ways is the sign of an import
//     against the grain that needs none);
//   - import cycles, between files and between folders, of what runs (a dynamic import, or one of types alone, which
//     TypeScript erases, makes none), and between files with those of types counted too;
//   - hubs: the files most others import, and the names each gives them;
//   - shared global names: in a file with no import, export or require, what its top level declares, and the names
//     more than one such file declares;
//   - functions: how many lines each spans, how deep its blocks nest (if, for, while, switch, catch, else, try, do; a
//     function within it is measured on its own) and how often it branches: each if, loop (for, while), case and
//     catch, and each and (&&), or (||, ??) and choice (? :) within a line;
//   - which files change together in the history (commits that touch more than 30 of them, such as a move, are left
//     out, and so is every merge);
//   - with --suite, how long each named suite takes when it runs alone, and whether it passed.
// Its functions are read on the parser the core installs (javascript-functions.mjs, whose definition they keep): a
// file whose functions it cannot tell is counted with none. Its imports and a script's names are read by a lexer, not a
// parser: it knows comments, strings, template literals, regular expressions and the elements of JSX (in .jsx, .tsx
// and JavaScript's own files; jsxIn), so a bracket in one of them is not counted. Files in other languages are counted
// and named, and not measured here: the shape check reads C# and Python with readers of their own (shape-readers.mjs).
// The lexer and the readers of imports and names stand in code-shape-lexer.mjs and code-shape-readers.mjs; this file
// re-exports them, so an import from it is unchanged, and holds the measures, the history and the command.
//
//   node core/scripts/code-shape.mjs [<pathspec>...] [--repo <folder>] [--depth <n>] [--history <n>]
//                                    [--suite "<command>"]... [--json <file>]
//
//   <pathspec>   git pathspecs of the code to measure (":!" leaves a path out); left out, the whole repository but for
//                a copy of the core (core/, or where the manifest names it), where the script runs from that copy or measures another repository
//   --repo       the repository to measure, a clone this script does not lie in (one read for an audit); left out, the
//                one it lies in. Its suites, where --suite names them, run its own code
//   --depth      a folder is the first n parts of a file's path (packages/engine, for 2); left out, its whole folder
//   --history    how many of the newest commits the count of what changes together reads; 500 if left out
//   --suite      a command that runs one suite, run alone from the repository's root and timed; may be repeated
//   --json       the file every number is written to, as JSON
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { started } from "./started.mjs";
import { copyOf, projectAt } from "./core-path.mjs";
import { javascriptFunctions } from "./javascript-functions.mjs";
import { jsxIn, tokens } from "./code-shape-lexer.mjs";
import { CODE, append, cycles, globals, imports, isModule, packageName, resolve } from "./code-shape-readers.mjs";

// The lexer and the readers stand in files of their own (#973); this file stays the one entrance of the measures.
export { COMMENT_READ, NEST, commentLines, isId, isP, jsxIn, tokens } from "./code-shape-lexer.mjs";
export { CODE, append, cycles, globals, holdsUnder, imports, isModule, lyingUnder, nameTree, packageName, resolve } from "./code-shape-readers.mjs";

export const OTHER = [".cs", ".fs", ".vb", ".py", ".go", ".rs", ".java", ".kt", ".scala", ".swift", ".dart", ".gd", ".lua", ".c", ".cpp", ".h", ".rb", ".php"];
// git's settings that run a command by themselves, off: a folder measured with --repo may hold a .git it was handed
const SAFE = ["-c", "core.fsmonitor=false"];
const BULK = 30; // a commit that touches more of the measured files than this is a move or a sweep, not a sign

const folderOf = (file, depth) => { const parts = path.posix.dirname(file).split("/"); return (depth ? parts.slice(0, depth) : parts).join("/") || "."; };
const quantile = (sorted, q) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0;
const addEdge = (graph, a, b) => { if (!graph.has(a)) graph.set(a, new Set()); graph.get(a).add(b); };

// The packages the files declare, by name: { dir, main } of each package.json that has a name.
function packagesOf(texts) {
  const packages = new Map();
  for (const [file, text] of Object.entries(texts)) if (path.posix.basename(file) === "package.json") {
    try { const p = JSON.parse(text); if (typeof p.name === "string") packages.set(p.name, { dir: path.posix.dirname(file), main: typeof p.main === "string" ? p.main : null }); } catch { /* not a package's */ }
  }
  return packages;
}


// Every measure of the files given ({ path: text }), with the history's commits (lists of the paths each touched,
// newest first) and the suites' runs.
export function measure(texts, { depth = 0, commits = [], suites = [], other = {} } = {}) {
  const files = new Set(Object.keys(texts));
  const code = [...files].filter(f => CODE.includes(path.posix.extname(f))).sort();
  const book = {
    files, packages: packagesOf(texts), depth, fileGraph: new Map(), withTypes: new Map(), folderGraph: new Map(),
    folderEdges: new Map(), offered: new Map(), external: new Map(), unresolved: [], total: 0, crossing: 0,
  };
  const fns = [], scripts = [];
  for (const file of code) {
    const toks = tokens(texts[file], jsxIn(file));
    for (const fn of javascriptFunctions(file, texts[file]) ?? []) fns.push({ file, ...fn });
    if (!isModule(toks)) scripts.push({ file, names: globals(toks) });
    for (const imp of imports(toks)) noteImport(book, file, imp);
  }
  return {
    files: { code: code.length, other },
    imports: importsSummary(book),
    cycles: { files: cycles(book.fileGraph), folders: cycles(book.folderGraph), filesWithTypes: cycles(book.withTypes) },
    hubs: hubsOf(book.offered),
    globals: globalsSummary(scripts),
    functions: functionsSummary(fns),
    changedTogether: changedTogether(commits, new Set(code)),
    suites,
  };
}

// An import of `file` set in the book: counted, and either where it leads in the repository or what it leaves out.
function noteImport(book, file, imp) {
  book.total++;
  const to = resolve(file, imp.spec, book.files, book.packages);
  if (to) noteEdges(book, file, to, imp);
  else noteLeftOut(book, file, imp.spec);
}

// An import that leads to no file: a relative one that should have (named a file, or none by its extension) is listed
// as unresolved; a package from outside is counted by name.
function noteLeftOut(book, file, spec) {
  if (/^\.\.?(\/|$)/.test(spec)) {
    if (!/\.[A-Za-z0-9]+$/.test(spec) || CODE.includes(path.posix.extname(spec))) book.unresolved.push(`${file}: ${spec}`);
    return;
  }
  const name = packageName(spec);
  book.external.set(name, (book.external.get(name) ?? 0) + 1);
}

// The edges an import from `file` to the file `to` adds: between files, with the imports of types alone left out of
// the graphs of what runs (a dynamic import makes none), and between folders.
function noteEdges(book, file, to, imp) {
  const runs = imp.kind !== "dynamic";
  if (runs) addEdge(book.withTypes, file, to);
  if (runs && !imp.types) addEdge(book.fileGraph, file, to);
  if (!book.offered.has(to)) book.offered.set(to, { by: new Set(), names: new Set() });
  book.offered.get(to).by.add(file);
  for (const n of imp.names) book.offered.get(to).names.add(n);
  const a = folderOf(file, book.depth), b = folderOf(to, book.depth);
  if (a === b) return;
  book.crossing++;
  if (runs && !imp.types) addEdge(book.folderGraph, a, b);
  const key = `${a}\u0000${b}`;
  book.folderEdges.set(key, (book.folderEdges.get(key) ?? 0) + 1);
}

function importsSummary(book) {
  const { total, crossing, offered, external, unresolved } = book;
  return {
    total, crossingAFolder: crossing, intoTheRepository: [...offered.values()].reduce((s, o) => s + o.by.size, 0),
    external: Object.fromEntries([...external].sort((a, b) => b[1] - a[1])), unresolved,
    foldersBothWays: foldersBothWays(book.folderEdges),
  };
}

// The pairs of folders that import each other, the pair that does so least often last.
function foldersBothWays(folderEdges) {
  const bothWays = [];
  for (const [key, n] of folderEdges) {
    const [a, b] = key.split("\u0000"), back = folderEdges.get(`${b}\u0000${a}`);
    if (back && a < b) bothWays.push({ folders: [a, b], imports: [n, back] });
  }
  return bothWays.sort((x, y) => Math.min(...y.imports) - Math.min(...x.imports));
}

// The files more than one file imports, most imported first, with the names each gives them.
function hubsOf(offered) {
  const hubs = [...offered].map(([file, o]) => ({ file, importedBy: o.by.size, names: [...o.names].sort() }))
    .sort((x, y) => y.importedBy - x.importedBy || x.file.localeCompare(y.file));
  return hubs.filter(h => h.importedBy > 1);
}

// The scripts' ({ file, names }) global names, and those more than one of them declares.
function globalsSummary(scripts) {
  const declared = new Map();
  for (const s of scripts) for (const n of s.names) append(declared, n, s.file);
  const inMoreThanOne = [...declared].filter(([, f]) => f.length > 1).map(([name, f]) => ({ name, files: f.sort() }))
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));
  return { scripts: scripts.length, names: scripts.reduce((s, x) => s + x.names.length, 0), inMoreThanOne };
}

function functionsSummary(fns) {
  const lengths = fns.map(f => f.lines).sort((a, b) => a - b);
  const byLength = [...fns].sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file) || a.line - b.line);
  const byDepth = [...fns].sort((a, b) => b.depth - a.depth || b.lines - a.lines || a.file.localeCompare(b.file));
  const lines = { median: quantile(lengths, 0.5), p90: quantile(lengths, 0.9), max: lengths.at(-1) ?? 0 };
  return {
    count: fns.length, lines, over50Lines: fns.filter(f => f.lines > 50).length, over100Lines: fns.filter(f => f.lines > 100).length,
    depth4OrMore: fns.filter(f => f.depth >= 4).length, ...branching(fns), longest: byLength.slice(0, 20),
    deepest: byDepth.filter(f => f.depth > 0).slice(0, 20),
  };
}

// How the functions branch: how many do so more than 15 and more than 30 times, and the twenty that branch most.
function branching(fns) {
  const most = fns.filter(f => f.branches > 0).sort((a, b) => b.branches - a.branches || a.file.localeCompare(b.file) || a.line - b.line);
  return { over15Branches: fns.filter(f => f.branches > 15).length, over30Branches: fns.filter(f => f.branches > 30).length, mostBranching: most.slice(0, 20) };
}

// The pairs of files changed in the same commits, most often first: how often, and what share of the rarer one's
// changes that is.
export function changedTogether(commits, measured) {
  const changes = new Map(), pairs = new Map();
  let read = 0;
  for (const commit of commits) {
    const touched = [...new Set(commit)].filter(f => measured.has(f)).sort();
    if (touched.length > BULK) continue;
    read++;
    for (const f of touched) changes.set(f, (changes.get(f) ?? 0) + 1);
    for (let a = 0; a < touched.length; a++) for (let b = a + 1; b < touched.length; b++) {
      const key = `${touched[a]}\u0000${touched[b]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  const list = [...pairs].filter(([, n]) => n >= 3).map(([key, n]) => {
    const files = key.split("\u0000");
    return { files, together: n, share: Math.round(100 * n / Math.min(...files.map(f => changes.get(f)))) / 100 };
  }).sort((x, y) => y.together - x.together || y.share - x.share || x.files[0].localeCompare(y.files[0]));
  const mostChanged = [...changes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([file, n]) => ({ file, changes: n }));
  return { commits: read, pairs: list.slice(0, 50), mostChanged };
}

// The project's root: the repository named, or the one this copy stands in, a project's whose library carries its core
// in a submodule included (core-path.mjs).
const rootOf = (repo, here) => (repo ? "" : projectAt(here).root) || execFileSync("git", [...SAFE, "rev-parse", "--show-toplevel"], { cwd: repo ?? here, encoding: "utf8" }).trim();

// What is read where none is named: the whole repository, but the core's copy where this script stands in one (the path
// from the root to it as git itself says it, since a path worked out from two folders' names can differ in spelling,
// as a short name of Windows' does from the long one git gives; core-path.mjs), and another repository's, at the path its
// manifest names (core/ where it has none, or its line cannot be read).
const specsOf = (repo, here, root) => {
  const copy = repo ? copyOf(root) : projectAt(here).prefix.replace(/scripts\/$/u, "");
  return copy ? [".", `:!${copy}`] : ["."];
};

function main(argv) {
  const opts = parseArguments(argv);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = rootOf(opts.repo, here), specs = opts.specs.length ? opts.specs : specsOf(opts.repo, here, root);
  const listed = execFileSync("git", [...SAFE, "ls-files", "-z", "--", ...specs], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  const { texts, other } = readFiles(root, listed);
  const log = execFileSync("git", [...SAFE, "log", "--no-merges", "-n", String(opts.history), "--format=%x00", "--name-only", "--", ...specs], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
  const commits = log.split("\0").slice(1).map(c => c.split("\n").map(s => s.trim()).filter(Boolean));
  const suites = opts.suites.map(command => runSuite(root, command));
  const m = measure(texts, { depth: opts.depth, commits, suites, other });
  if (opts.json) fs.writeFileSync(opts.json, JSON.stringify(m, null, 2) + "\n");
  print(m);
}

function parseArguments(argv) {
  const opts = { specs: [], suites: [], depth: 0, history: 500, json: null, repo: null };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    const value = () => { if (k + 1 >= argv.length) fail(`${a} needs a value`); return argv[++k]; };
    if (a === "--depth") opts.depth = whole(value(), a);
    else if (a === "--history") opts.history = whole(value(), a);
    else if (a === "--suite") opts.suites.push(value());
    else if (a === "--json") opts.json = path.resolve(value());
    else if (a === "--repo") opts.repo = path.resolve(value());
    else if (a.startsWith("--")) fail(`unknown option ${a}`);
    else opts.specs.push(a);
  }
  return opts;
}

// The text of each code file listed, and the count of files in other languages by extension.
function readFiles(root, listed) {
  const texts = {}, other = {};
  for (const f of listed) {
    const ext = path.posix.extname(f);
    if (CODE.includes(ext) || path.posix.basename(f) === "package.json") { // never through a link, which may lead outside
      try { if (!fs.lstatSync(path.join(root, f)).isSymbolicLink()) texts[f] = fs.readFileSync(path.join(root, f), "utf8"); } catch { /* listed, not on disk */ }
    }
    else if (OTHER.includes(ext)) other[ext] = (other[ext] ?? 0) + 1;
  }
  return { texts, other };
}

function runSuite(root, command) {
  const start = process.hrtime.bigint();
  const r = spawnSync(command, { cwd: root, shell: true, stdio: "ignore" });
  return { command, seconds: Math.round(Number(process.hrtime.bigint() - start) / 1e8) / 10, passed: r.status === 0 };
}

function print(m) {
  const say = s => console.log(s);
  say(`files: ${m.files.code} read${Object.keys(m.files.other).length ? `; not measured here: ${Object.entries(m.files.other).map(([e, n]) => `${n} ${e}`).join(", ")}` : ""}`);
  say(`imports: ${m.imports.total}, ${m.imports.crossingAFolder} crossing a folder; folders that import each other both ways: ${m.imports.foldersBothWays.length}`);
  for (const b of m.imports.foldersBothWays.slice(0, 5)) say(`  ${b.folders[0]} <-> ${b.folders[1]} (${b.imports[0]} and ${b.imports[1]})`);
  say(`cycles: ${m.cycles.files.length} between files, ${m.cycles.folders.length} between folders; ${m.cycles.filesWithTypes.length} between files where imports of types alone count too`);
  for (const c of m.cycles.files.slice(0, 5)) say(`  ${c.length} files: ${c.slice(0, 4).join(", ")}${c.length > 4 ? ", ..." : ""}`);
  say(`hubs (imported by most): ${m.hubs.slice(0, 5).map(h => `${h.file} (${h.importedBy})`).join(", ") || "none"}`);
  say(`files with no import: ${m.globals.scripts}, declaring ${m.globals.names} global names, ${m.globals.inMoreThanOne.length} of them in more than one file`);
  const f = m.functions;
  say(`functions: ${f.count}; lines median ${f.lines.median}, 90th percentile ${f.lines.p90}, longest ${f.lines.max}; over 50 lines ${f.over50Lines}, over 100 ${f.over100Lines}; nesting 4 deep or more ${f.depth4OrMore}; branching more than 15 times ${f.over15Branches}, more than 30 ${f.over30Branches}`);
  for (const x of f.longest.slice(0, 5)) say(`  ${x.file}:${x.line} ${x.name}, ${x.lines} lines, ${x.depth} deep, ${x.branches} branch points`);
  const t = m.changedTogether;
  say(`changed together (${t.commits} commits): ${t.pairs.slice(0, 5).map(p => `${p.files.join(" + ")} ${p.together}x`).join("; ") || "no pair 3 times"}`);
  for (const s of m.suites) say(`suite: ${s.command}: ${s.seconds} s, ${s.passed ? "passed" : "FAILED"}`);
}

function whole(v, name) { if (!/^[0-9]+$/.test(v)) fail(`${name} takes a whole number`); return Number(v); }
function fail(msg) { console.error(`FAIL: ${msg}`); process.exit(1); }

if (started(import.meta.url)) main(process.argv.slice(2));
