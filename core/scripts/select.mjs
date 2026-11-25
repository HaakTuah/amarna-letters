// The tests a pull request runs (tasks/tests.md, "A pull request runs the tests its change can reach"; #275), for
// every project that takes the core: of the files the pull request changes against its base, each test that can reach
// one, with the tests it adds or changes, those that failed last time (`--failed`), and those the project names as its
// proof that behaviour was kept, which are never selected out. What it ran is said, on the job's summary too.
//
// A test reaches a file where the file lies on the test's imports, followed from file to file (the shape check's
// readers: shape.mjs, beside this file, dynamic imports among them), or where a file of JavaScript or TypeScript on that
// way names it, outside a comment, by its name ("scripts/build.mjs", as a script is started by its path), or where it
// is the __init__.py of a package a file of Python on that way lies in, which Python runs on each import. A test the
// config's "select.whole" names reaches every file (one that copies or runs the whole project). It never guesses: where
// a changed file is no code the readers read and no test, a file that is gone, C# (whose types are reached by their
// full names too, with no using directive), a script of the global space, or anything the config does not name
// under "select.none" (the files no test reads), the whole suite runs, and so it does where no base is told (on main, on
// a schedule, before a release), where the shape check's config cannot be read and where the files the change holds, or
// the project's files all together, are more than the readers take in time (hurry.mjs). A fault the whole suite finds that
// the selection left out is a fault of this map, mended at once.
//
// The pathspec matcher is select-matcher.mjs and the question of a tree that passed is select-passed.mjs, beside this file.
//
// The config is the shape check's (shape.mjs, where()): its "code", "tests", "aliases" and "select" ({ "proof",
// "whole", "none" }, each git pathspecs).
//
// A project's copy of the core is read as a sync changes it (#1093, point 2): its .node-version selects the whole suite,
// any other file of it the tests that can run the copy (copyChange), and a workflow in which only the pins of calls to
// the core's workflows moved, nothing.
//
// A tree that passed is not run again (tasks/tests.md; #457): on a push, given --passed and the name of the check that
// gates the tests, where HEAD merges a pull request's head whose tree it holds (the head was up to date), the change it
// brings selects the whole suite, as that pull request's run selected it, and the check passed on that head, nothing is
// selected. Where any of that cannot be told (no merge of two, a tree that differs, a selection, no answer from the
// host, a check not passed), the whole suite runs. The check's runs are asked of GitHub (GITHUB_API_URL, the
// repository GITHUB_REPOSITORY names), with the token GH_TOKEN holds, which needs to read checks and nothing more, and
// only those GitHub Actions posted count. That the head held the default branch is read from the tree, never assumed:
// floor rule 12 lets a pull request merge without being brought up to date where users get a release.
//
//   node core/scripts/select.mjs [<config>] [--failed <file>] [--env <NAME>] [--passed <check>]
//       with SELECT_BASE the pull request's base (origin/main, fetched; or HEAD^1 of the merge a pull request's run
//       checks out): prints what it selected and why; --failed names a file of the tests that failed last time, one
//       path a line; --env appends NAME=" <test> <test> " (or NAME=all) to the file GITHUB_ENV names, for the steps
//       that follow, or NAME=none where nothing is selected; --passed, on a push alone (no SELECT_BASE), names the check
//       whose pass on the merged head lets the run select nothing. Reads only, but for those two files and that one question to the host; git and Node's own
//       modules.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CODE } from "./code-shape.mjs";
import { CORE } from "./core-address.mjs";
import { corePath } from "./core-path.mjs";
import { logged } from "./guards.mjs";
import { WORDS, mentioned, nameTrie } from "./name-trie.mjs";
import { Late, hurry } from "./hurry.mjs";
import { notLinked, parseConfig, standing, survey, where } from "./shape.mjs";
import { matcher } from "./select-matcher.mjs";
import { git, passedWhole } from "./select-passed.mjs";
import { isCode } from "./shape-readers.mjs";
import { started } from "./started.mjs";

class Refused extends Error {}
const refuse = (what, mend) => { throw new Refused(`${what}. Mend: ${mend}`); };
const PLAIN = /^[\w@+.,=-][\w@+./,=-]*$/u;

// A file of JavaScript or TypeScript without its comments, as far as a line tells them: a line that opens with one, and
// one that ends a line after a space. What is left over names more, never less.
// (a line that only a comment opens: "//", "/*", or a block's "* " and "#" in Python; a comment after code is kept, which
// names more, never less)
const uncommented = (text, py) => text.split("\n").filter(l => !(py ? /^\s*#/u : /^\s*(\/\/|\/\*|\*(\s|\/|$))/u).test(l)).join("\n");

// Each file's links to the others: its imports; from JavaScript, TypeScript or Python, each file whose name (in Python
// its dotted name too) it holds outside a comment; and from a file of Python, the __init__.py and conftest.py of its
// folder and each folder above, which Python and pytest run with no import.
const above = (name, file, texts) => ["", ...file.split("/").slice(0, -1).map((_, k, dirs) => `${dirs.slice(0, k + 1).join("/")}/`)].map(d => `${d}${name}`).filter(f => f !== file && f in texts);
// A file of Python by its dotted name too ("pkg.rules"; a package's own for __init__.py and __main__.py).
const dotted = f => f.replace(/\.py$/u, "").replace(/\/(__init__|__main__)$/u, "").split("/").join(".");
export function links(texts, tests, reach, pace = () => {}) {
  // (each name tried on each text took time in step with the count of names times the count of texts: the names are held in
  // a trie, walked once over each text, name-trie.mjs)
  const byName = nameTrie(Object.keys(texts).map(f => [path.posix.basename(f), f]));
  const byDotted = nameTrie(Object.keys(texts).filter(f => f.endsWith(".py") && dotted(f).includes(".")).map(f => [dotted(f), f]));
  const out = new Map();
  for (const [file, text] of Object.entries(texts)) {
    pace();
    const to = new Set(reach.get(file) ?? []), py = file.endsWith(".py");
    if (py || CODE.includes(path.posix.extname(file))) {
      // (a Python module's dotted name is looked for in every text of code, as its pattern was, JavaScript's that starts `python -m` too)
      const plain = uncommented(text, py), named = mentioned(byName, plain, WORDS.name, pace);
      for (const f of mentioned(byDotted, plain, WORDS.dotted, pace)) named.add(f);
      for (const f of named) if (f !== file) to.add(f);
    }
    // (Python runs a package's __init__.py on each import under it, and pytest a folder's conftest.py with no import)
    if (py) for (const run of [...above("__init__.py", file, texts), ...above("conftest.py", file, texts)]) to.add(run);
    out.set(file, to);
  }
  return out;
}

// The files each test reaches, the test itself among them; `pace` is asked as the search goes (every 256 files taken off a
// test's queue, so that many tests over many links take only the time the watch allows).
export function reached(tests, linked, pace = () => {}) {
  const out = new Map();
  let steps = 0;
  for (const t of tests) {
    pace();
    const seen = new Set([t]), queue = [t];
    while (queue.length) { if (++steps % 256 === 0) pace(); for (const next of linked.get(queue.pop()) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); } }
    out.set(t, seen);
  }
  return out;
}

// What a pull request runs: { all, why, tests }, `why` the reason for the whole suite, or for each test selected.
// `changed` the paths it changes (gone ones among them), `texts` and `tests` the project as the shape check reads it,
// `reach` its imports, `failed` the tests that failed last time, `config` the shape check's.
export function selection({ changed, texts, tests, reach, scripts = new Set(), unsure = new Set(), unread = [], failed = [], config, watch = null, copy = null, pinned = new Set() }) {
  const proof = matcher(config.select.proof), m = { whole: matcher(config.select.whole), none: matcher(config.select.none), isTest: matcher(config.tests) };
  const by = new Map(), add = (t, why) => { if (tests.has(t) && !by.has(t)) by.set(t, why); };
  const pace = watch?.pace(); // (one budget for the linking and the search from each test)
  const reaches = reached(tests, links(texts, tests, reach, pace), pace);
  // (a test that reaches an import the readers cannot follow may reach any file: it runs as one that reaches every file)
  // (and, where pytest runs a conftest.py the config does not read, each test of Python, whose fixtures may come from it)
  const blind = new Set([...reaches].filter(([t, files]) => [...files].some(f => unsure.has(f)) || (t.endsWith(".py") && unread.some(c => c.endsWith("conftest.py")))).map(([t]) => t));
  // (the tests that reach every file, told once: the config's pathspecs are tried on each test, never on each changed file's account)
  let every = null, copying = null;
  const ctx = { texts, tests, scripts, add, reaches, copy, pinned, ...m, wholes: () => (every ??= [...tests].filter(t => m.whole(t) || blind.has(t))), copyTests: () => (copying ??= copyReaching(texts, reaches, copy)) };
  for (const t of tests) if (proof(t)) add(t, "never selected out: the project's proof that behaviour was kept");
  for (const t of failed) add(t, "failed last time");
  for (const f of changed) {
    const unknown = oneChange(f, ctx);
    if (unknown) return { all: true, why: unknown, tests: [...tests].sort() };
  }
  return { all: false, why: by, tests: [...by.keys()].sort() };
}

// What one changed file selects, through `ctx.add`; the reason the whole suite runs where its reach cannot be told.
function oneChange(f, { texts, tests, scripts, add, reaches, wholes, none, isTest, copy, pinned, copyTests }) {
  if (none(f) || pinned.has(f)) return null;
  if (copy && f.startsWith(copy)) return copyChange(f, { add, wholes, copy, copyTests });
  if (isTest(f) && tests.has(f)) add(f, "added or changed"); // (and, a helper among the tests, what imports it)
  // (a file gone, a helper among the tests too, leaves no import to follow; a package's manifest, read beside the code,
  // links nothing: a change to either may reach every test)
  if (!(f in texts) || !isCode(f)) return `${f} is no code the readers follow, or is gone, so what reaches it cannot be told`;
  // (C# reaches a type by its full name with no using directive, and a script of the global space by no import at all)
  if (f.endsWith(".cs") || f.endsWith(".d.ts") || scripts.has(f)) return `${f} is C#, a declaration of types, or a script of the global space, whose users no import names, so what reaches it cannot be told`;
  for (const [t, files] of reaches) if (files.has(f)) add(t, `reaches ${f}`);
  if (!isTest(f)) for (const t of wholes()) add(t, `reaches every file (${f})`); // (a test's own file is no file of the project's a whole run tests)
  return null;
}

// A file of the project's copy of the core (#1093, point 2): its .node-version, the Node the suites run on, reaches
// every test; any other, the copy's scripts first, the tests that can run the copy (copyReaching). Names more, never less.
function copyChange(f, { add, wholes, copy, copyTests }) {
  if (f === `${copy}.node-version`) return `${f}, the Node the suites run on, changed`;
  for (const t of copyTests()) add(t, `can run the copy of the core (${f})`);
  for (const t of wholes()) add(t, `reaches every file (${f})`);
  return null;
}

// The tests that reach a file naming the copy's folder: as a path ("core/scripts/x.mjs", or with backslashes as Windows
// writes one), its last folder so too, or as a quoted piece of one (path.join("core", ...)). A test that imports the
// copy's scripts is one whose imports the readers cannot follow, which reaches every file (wholes); a test that neither
// names the copy nor imports from it cannot run it.
function copyReaching(texts, reaches, copy) {
  const esc = t => t.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&"), folder = copy.replace(/\/$/u, "");
  const naming = new RegExp(`(?:^|[^\\w.-])(?:${esc(folder).replace(/\//gu, "[\\\\/]+")}|${esc(folder.split("/").pop())})(?:[\\\\/]|["'\`])`, "u");
  const names = new Set(Object.keys(texts).filter(t => naming.test(texts[t])));
  return [...reaches].filter(([, files]) => [...files].some(x => names.has(x))).map(([t]) => t);
}

// Each workflow the change touches in which only the pins of calls to the core's workflows moved, as a sync moves
// them: a workflow is no code, and its pins no test reads (#1093, point 2). `core.yml` checks those pins.
const PIN = new RegExp(`(${CORE.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}/\\.github/workflows/[\\w.-]+\\.ya?ml)@[^\\s'"#]+`, "giu");
const unpinned = text => text.replace(PIN, "$1@");
function pinsOnly(base, changed) {
  const at = (rev, f) => { try { return git(["show", `${rev}:${f}`]); } catch { return null; } };
  return new Set(changed.filter(f => /^\.github\/workflows\/[^/]+\.ya?ml$/u.test(f)).filter(f => {
    const was = at(base, f), now = at("HEAD", f);
    return was !== null && now !== null && was !== now && unpinned(was) === unpinned(now);
  }));
}

// The path of the project's copy of the core, or null in the core's own repository, where its files are the code.
const copyOf = () => { try { return corePath(".") || null; } catch { return null; } };

const pick = ({ reach, scripts, unsure }) => ({ reach, scripts, unsure });
// The conftest.py files git holds that the config's pathspecs leave out: pytest runs them all the same.
const unreadConftests = texts => git(["ls-files", "-z", "--", ":(glob)**/conftest.py"]).split("\0").filter(f => f && !(f in texts));

// The paths a pull request changes against its base, renames as a path gone and a path added.
const changedSince = base => git(["diff", "-z", "--name-only", "--no-renames", base, "HEAD"]).split("\0").filter(Boolean);

function readFailed(file) {
  if (!file) return [];
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : refuse(`there is no file at ${file}`, "name with --failed a file of the tests that failed last time, one path a line, or leave --failed out");
  return text.split(/\r?\n/u).map(l => l.trim()).filter(Boolean);
}

function said(s, total) {
  if (s.all) return [`The selection: the whole suite, ${total} tests: ${s.why}.`];
  if (s.none) return [`The selection: none of ${total} tests: ${s.why}.`];
  const lines = [`The selection: ${s.tests.length} of ${total} tests, those the change can reach.`];
  for (const t of s.tests) lines.push(`  ${t}: ${s.why.get(t)}`);
  return lines;
}

// The words after the config: { "--failed", "--env", "--passed" }, each where given.
function options(rest, self) {
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!["--failed", "--env", "--passed"].includes(rest[i]) || rest[i + 1] === undefined) refuse(`the selection does not know ${rest.slice(i).join(" ")}`, `run node ${self} [<config>] [--failed <file>] [--env <NAME>] [--passed <check>]`);
    opts[rest[i]] = rest[i + 1];
  }
  if (opts["--env"] !== undefined && !/^[A-Z_][A-Z0-9_]*$/u.test(opts["--env"])) refuse(`--env ${JSON.stringify(opts["--env"]).slice(0, 40)} is no name of a variable`, "name it in capitals, digits and _, as RUN");
  if (opts["--env"] !== undefined && !process.env.GITHUB_ENV) refuse("--env was given and GITHUB_ENV names no file", "run it as a step of a workflow, or leave --env out");
  if (opts["--passed"] !== undefined && !/^[\w .()/-]{1,100}$/u.test(opts["--passed"])) refuse(`--passed ${JSON.stringify(opts["--passed"]).slice(0, 40)} is no name of a check`, "name the check that gates the tests on a pull request, as its job is named, such as tests");
  return opts;
}

// The base SELECT_BASE names, checked to be a commit here; "" where none is told.
function baseOf() {
  const base = process.env.SELECT_BASE || "";
  let known = true;
  if (base) try { git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]); } catch { known = false; }
  if (base && (!/^\w[\w./^~-]*$/u.test(base) || !known)) refuse(`SELECT_BASE (${JSON.stringify(base).slice(0, 80)}) is no commit here`, "set it to the pull request's base, such as origin/main fetched first, or HEAD^1 of the merge a pull request's run checks out with two commits of history");
  return base;
}

// The shape check's config, or null where it is not there or cannot be read (the whole suite then runs).
function configOf(at) {
  try { return fs.existsSync(notLinked(at)) ? parseConfig(fs.readFileSync(at, "utf8"), at) : null; } catch { return null; }
}

// What the change from `from` selects, or the whole suite where the files it changes, or the project's files all
// together, are too many or too slow to read within the time rule 5 of SECURITY.md allows (hurry.mjs; #881, #962).
function selectedFrom(from, { now, config, failed }) {
  const changed = changedSince(from), watch = hurry({ files: new Set(changed) });
  try { return selection({ changed, texts: now.texts, tests: now.tests, ...pick(survey(now.texts, config, now.tests, watch)), unread: unreadConftests(now.texts), failed, config, watch, copy: copyOf(), pinned: pinsOnly(from, changed) }); }
  catch (e) { if (e instanceof Late) return { all: true, why: e.message, tests: [...now.tests].sort() }; throw e; }
}

// What a run takes, { all, why, tests }: the whole suite where the config cannot be read or no base is told, what the
// change from the base selects, or, on a push given --passed (`passed`), nothing where the merged tree passed whole.
async function chosen({ config, at, base, passed, select }) {
  if (passed !== undefined && base) refuse("--passed was given with SELECT_BASE: a pull request's run is never skipped", "give --passed only on a push to the default branch, with SELECT_BASE empty");
  if (!config) return { all: true, why: `the shape check's config (${at}) cannot be read, so what each test reaches cannot be told` };
  if (base) return select(base);
  if (passed === undefined) return { all: true, why: "no base is told (SELECT_BASE), as on main, on a schedule and before a release" };
  const s = await passedWhole({ check: passed, selects: () => select("HEAD^1") });
  return s.none ? { ...s, all: false, tests: [] } : s;
}

async function main(argv) {
  const self = path.relative(process.cwd(), fileURLToPath(import.meta.url)).replace(/\\/gu, "/");
  const named = argv[0] && !argv[0].startsWith("--") ? argv[0] : null, opts = options(named ? argv.slice(1) : argv, self);
  const rules = ["core-manifest.md", "AGENTS.md"].find(f => fs.existsSync(f));
  const at = named ?? where(rules ? fs.readFileSync(rules, "utf8") : ""), base = baseOf(), config = configOf(at);
  const now = config ? standing(config) : null, failed = readFailed(opts["--failed"]);
  const s = await chosen({ config, at, base, passed: opts["--passed"], select: from => selectedFrom(from, { now, config, failed }) });
  // (a name the variable cannot hold as one word, a space or a line's end in it, runs the whole suite: no file's name
  // sets another variable for the steps after it)
  if (!s.all && s.tests.some(t => !PLAIN.test(t))) Object.assign(s, { all: true, why: "a test's file name holds what a list of names cannot (a space or a line's end)" });
  const lines = said(s, now ? now.tests.size : "all its");
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  // (nothing selected is "none", as everything is "all": a runner given an empty list would run every test)
  if (opts["--env"]) fs.appendFileSync(process.env.GITHUB_ENV, `${opts["--env"]}=${s.all ? "all" : s.none ? "none" : ` ${s.tests.join(" ")} `}\n`);
  return 0;
}

if (started(import.meta.url)) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (e) { if (!(e instanceof Refused)) throw e; console.error(`FAIL: ${logged(e.message)}`); process.exitCode = 1; }
}
