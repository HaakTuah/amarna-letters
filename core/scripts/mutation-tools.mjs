// The mutation tool a project's manifest names, read from the core's list (mutation-tools.json, beside this file;
// tasks/code-shape.md, "How strong the tests are"; #1107): the row *mutation tool* is filled by the starter kit at the
// first copy, and by --write after it, from what can be read exactly, never asked: the languages of the project's code
// (the files of its shape check's "code" that are no test, by their endings), whether it has tests (its "tests"), and,
// for a tool that runs the tests in set ways, how the project runs them (the test script of its package.json) and, for
// a runner the project installs, whether the npm lock file at its root holds it (vitest: #1274). The row
// names the tool's command where every language of the code has the same tool and that tool fits; else `none` with
// the reason, which says what is missing. Each tool of the list is one of development only, its licence on the
// floor's list (floor/topics/licences.md, rule 10) and its exact version pinned where the core gives a command for
// it, as its test holds.
//
// A row the project wrote is never written over: --write fills one that is not there, a `none` with no reason, or one
// that holds a reason this script or the starter kit gave (`none`: no tests yet, or a reason of the list's), so a project's owner turns the
// measure off with `none` and a reason of the owner's own, and nothing else does (#1107, point 3).
//
//   node core/scripts/mutation-tools.mjs           what it read, and the row the list gives the project
//   node core/scripts/mutation-tools.mjs --write   that row written into core-manifest.md, where it is not the project's own,
//                                                  and the package list and npm config of the folder the tool is installed
//                                                  in, each where none stands, and its lock file under the size marks'
//                                                  "skip", with what is left to do: its lock file, the licence check's
//                                                  entries for both and its data packages, any audit the project keeps
//                                                  of its own lock files, and the job's install and step
// Run from the project's root. Reads the project; --write writes the row and those two files, each through no link.
// git and Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyOf } from "./core-path.mjs";
import { READ_MOST, ownFiles } from "./own-files.mjs";
import { notLinked, parseConfig, where } from "./shape.mjs";
import { started } from "./started.mjs";
import { measuredCode, toolOf } from "./strength.mjs";
import { installIn } from "./stryker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LIST = JSON.parse(fs.readFileSync(path.join(HERE, "mutation-tools.json"), "utf8"));
const ROW = "*mutation tool*";
const MANIFEST = "core-manifest.md";
// (the reasons the kit and this script give where there are no tests or no code yet: a row that says one is filled again)
export const NO_TESTS = "no tests yet; the tool is named from the core's list once there are (`node core/scripts/mutation-tools.mjs --write`)";
const NO_CODE = "no code yet in a language the core knows by its ending; the tool is named from the core's list once there is (`node core/scripts/mutation-tools.mjs --write`)";
// (the reason the kit wrote before #1107, filled again the same way)
const OLD_KIT = "no tests yet; the builder who adds the first names the tool here (`core/tasks/code-shape.md`)";
// (the reasons rowFor gives with a part that varies, each matched whole, so that an owner's own reason in other words
// that starts the same is never taken for one)
const GIVEN = [
  /^its code holds files ending .+, of a language the core's list gives no mutation tool for \(`.*scripts\/mutation-tools\.json`\)$/u,
  /^its code is in .+, and the row names one tool$/u,
  /^its tests run by `.+` \(package\.json's test script\), and the core runs .+ only on tests run by `.+ <file>` \(`.*scripts\/stryker\.mjs`\)$/u,
  /^its tests run by `.+` \(package\.json's test script\) with more than `.+`, which the core does not give each test's run: .+$/u,
  /^its tests run by `.+` \(package\.json's test script\), and no package-lock\.json at the project's root holds .+, which is read to know it is installed: .+$/u,
];
// The npm config written beside the tool's package list, as the core's own folder holds it (tests/mutation/.npmrc): no
// install script runs, and no release under a week old is taken (floor rules 7 and 15).
export const NPMRC = "ignore-scripts=true\nmin-release-age=7\n";

// The language of a file by its ending, as the list names it, or the ending itself where the list names none.
const languageOf = file => LIST.languages.find(l => l.endings.includes(path.posix.extname(file)))?.name ?? path.posix.extname(file);
const toolFor = language => LIST.languages.find(l => l.name === language)?.tool ?? null;

// The test script of the project's root package.json, its words joined by one space, or null where it gives none.
function scriptOf(packageJson) {
  let test;
  try { test = JSON.parse(packageJson ?? "null")?.scripts?.test; } catch { return null; }
  return typeof test === "string" && test.trim() ? test.trim().split(/\s+/u).join(" ") : null;
}

// What the project's root package.json runs its tests with: the first word of its test script, or null where it gives
// none; where that word is node and it starts a program of a package (node node_modules/jest/bin/jest.js), that
// program too, since a runner started through node runs its tests otherwise than node <file> does.
export function testRunner(packageJson) {
  const script = scriptOf(packageJson);
  if (!script) return null;
  const words = script.split(" "), program = words.find(w => /(?:^|[/\\])node_modules[/\\]/u.test(w));
  return words[0] === "node" && program ? `node ${program}` : words[0];
}

// Whether the npm lock file at the project's root (its text, `lock`) holds `name` installed at the root, where the
// project's own scripts find it; false where it does not, or cannot be read.
export function lockHolds(lock, name) {
  try { return Boolean(JSON.parse(lock ?? "null")?.packages?.[`node_modules/${name}`]); } catch { return false; }
}

// The row the list gives a project: { command, tool, rest } or { none } (its reason), from `code` (its files of code that
// are no test), `tests` (whether it has any), `runner` (testRunner's word), `locked` (whether the root's npm lock file
// holds the runner, for one the project installs), `plain` (whether the test script is one the list gives that runner
// as plain, where it gives any) and `copy` (the copy's path, "core/"). Code in
// the languages of more than one tool, or of one the list knows none for, is measured in its main language, that of the
// tool whose languages hold the most of its files, and `rest` names the others, not measured (#1247, point 5); where
// two lead with as many files, none, since its main language cannot be told.
export function rowFor({ code, tests, runner, locked = false, plain = true, copy }) {
  if (!tests) return { none: NO_TESTS };
  if (!code.length) return { none: NO_CODE };
  const groups = new Map();
  for (const f of code) {
    const l = languageOf(f), key = toolFor(l) ?? l, g = groups.get(key) ?? { files: 0, languages: new Set() };
    groups.set(key, { files: g.files + 1, languages: g.languages.add(l) });
  }
  const ranked = [...groups].map(([key, g]) => ({ key, files: g.files, languages: [...g.languages].sort() })).sort((a, b) => b.files - a.files || a.key.localeCompare(b.key));
  const [lead] = ranked, tied = ranked.filter(g => g.files === lead.files);
  if (tied.length > 1) return { none: `its code is in ${tied.map(g => `${g.languages.join(", ")} (${toolFor(g.languages[0]) ?? "no tool"})`).join(" and ")}, ${lead.files} file${lead.files === 1 ? "" : "s"} each, and the row names one tool` };
  if (!toolFor(lead.languages[0])) return { none: `its code holds files ending ${lead.key}, of a language the core's list gives no mutation tool for (\`${copy}scripts/mutation-tools.json\`)` };
  const tool = LIST.tools[lead.key], rest = ranked.slice(1).flatMap(g => g.languages).sort();
  if (tool.none) return { none: tool.none };
  const ran = runWith(lead.key, tool, { runner, locked, plain, copy });
  return ran.none ? ran : { tool: lead.key, command: tool.command.replaceAll("{copy}", copy).replaceAll("{runner}", ran.words), ...(rest.length ? { rest } : {}) };
}

// How the tool `key` (its list entry `tool`) runs the project's tests: { words } its command is given, none for a tool
// with no runners, or { none } where it runs none of the project's runner's, the test script gives the runner words
// each test's run would lose (--globals, say), or the runner is one the project installs and its root's npm lock file
// does not hold it (#1274).
function runWith(key, tool, { runner, locked, plain, copy }) {
  if (!tool.runners) return { words: "" };
  const how = tool.runners[runner ?? "node"], told = `its tests run by \`${runner}\` (package.json's test script)`;
  if (!how) return { none: `${told}, and the core runs ${key} only on tests run by ${Object.values(tool.runners).map(r => `\`${r.named}\``).join(" or ")} (\`${copy}scripts/stryker.mjs\`)` };
  if (!plain) return { none: `${told} with more than \`${how.plain.at(-1)}\`, which the core does not give each test's run: move its options into vitest's config, or name the tool in this row by hand` };
  if (how.locked && !locked) return { none: `${told}, and no package-lock.json at the project's root holds ${how.locked}, which is read to know it is installed: commit the lock file npm writes, or, for another package manager, name the tool in this row by hand` };
  return { words: how.words };
}

// The row's line in the manifest, naming the code of the languages its tool does not measure.
export const lineOf = row => (row.command ? `| ${ROW} | \`${row.command}\`: ${row.tool}, from the core's list (\`mutation-tools.json\`)${row.rest ? `; its ${row.rest.join(" and ")} code not measured` : ""} |` : `| ${ROW} | \`none\`: ${row.none} |`);

// Whether the row the manifest holds is the kit's or this script's to fill again: none there, a `none` with no reason,
// which turns nothing off (the owner's `none` gives the owner's reason), or a `none` with a reason the kit, this script
// or the list gives. A command, or a `none` with a reason of the project's own, is the project's.
export function fillable(manifest) {
  const now = toolOf(manifest);
  if (!now) return true;
  if (now.none === undefined) return false;
  if (!now.none) return true;
  const ours = [NO_TESTS, NO_CODE, OLD_KIT, ...Object.values(LIST.tools).map(t => t.none).filter(Boolean)];
  return ours.includes(now.none) || GIVEN.some(r => r.test(now.none));
}

// The package list of the folder a tool is installed in, as the core's own (tests/mutation/package.json), or null for
// a tool the core installs no other way (only a tool of the npm registry has a folder in the list).
export function packageList(tool) {
  if (!tool.folder) return null;
  return `${JSON.stringify({ name: "mutation-tool", private: true, devDependencies: { [tool.package]: tool.version }, overrides: tool.overrides }, null, 2)}\n`;
}

// The folder the row's tool is installed in, set up at `root`: its package list and its npm config (NPMRC) each written
// where nothing stands at its path, as { written, blocked }, the paths written and, where nothing could be, the line that
// says so. The starter kit and --write each set it up. Each step of the folder's path is a folder of the project's own,
// made where it is not there: where one is a link or no folder, nothing is written (floor rule 13: no link leads the
// write out of the project). No entry for Dependabot is asked: its config is the core's, written whole, and the tool's
// version is the core's list's, which follows the core's own folder (tests/mutation/, which the core's versions check
// proposes updates of); step 810 names a package list behind the list's.
export function setUp(root, row) {
  const tool = LIST.tools[row?.tool], list = tool && packageList(tool);
  const files = list ? [[`${tool.folder}/package.json`, list], [`${tool.folder}/.npmrc`, NPMRC]] : [];
  const missing = files.filter(([at]) => !fs.lstatSync(path.join(root, at), { throwIfNoEntry: false }));
  if (missing.length && !foldersWithin(root, tool.folder)) return { written: [], blocked: `make ${tool.folder} a folder of the project's own (a step of its path is a link or a file, so nothing was written there), then run node core/scripts/mutation-tools.mjs --write again` };
  for (const [at, text] of missing) fs.writeFileSync(path.join(root, at), text, { flag: "wx" });
  return { written: missing.map(([at]) => at), blocked: null };
}

// Whether each step of `folder` (a path with "/") below `root` is a folder, none a link, each made where it is not there.
function foldersWithin(root, folder) {
  let at = root;
  for (const part of folder.split("/")) {
    at = path.join(at, part);
    const stat = fs.lstatSync(at, { throwIfNoEntry: false });
    if (!stat) fs.mkdirSync(at);
    else if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
  }
  return true;
}

// The folder of the project's a row's command installs the tool from, as the list's Stryker command names it after
// `--tool` (`command`, the row's words), or null where it runs no tool through the core's script of one.
export function folderOf(command) {
  const words = command ?? [], at = words.indexOf("--tool");
  return words.some(w => /(?:^|\/)scripts\/stryker\.mjs$/u.test(w)) && at >= 0 && words[at + 1] ? words[at + 1] : null;
}

// What is left to do for the tool the row names, `has(f)` whether the project holds a file, `config` its licence
// check's config (null where none can be read) and `at` that config's path, as the project's licence check is given it
// (null where it cannot be read: #1247, point 3): the lock file, the config's entries for it, for the npm config and for
// the packages of data the lock brings (`data` in the list: CC-BY, which floor rule 10 allows for data and assets, so
// the check reads each so named under that list, as the core's own config does; #1247, point 1), any audit of the
// project's own of its lock files (#1265, point 3), and the job's install and step, each worded so a session acts on
// it with no rule file open. Nothing once all stand.
export function leftFor(tool, has, config = null, at = "checks/licences.json") {
  if (!tool?.folder) return [];
  const lock = `${tool.folder}/package-lock.json`, npmrc = `${tool.folder}/.npmrc`, names = (key, f) => Array.isArray(config?.[key]) && config[key].includes(f);
  const data = (tool.data ?? []).filter(n => !names("data", n)), it = at ? `the licence check's config (${at})` : "the config the project's licence check is given";
  const left = [];
  if (!has(lock)) left.push(`commit ${tool.folder}/package.json with its lock file, written from it with no install scripts by npm install --package-lock-only --ignore-scripts --prefix ${tool.folder}`);
  if (!names("lockfiles", lock)) left.push(`name ${lock} under "lockfiles" in ${it}, so that check reads the licence of every package it installs (floor rule 10)`);
  // (an audit of the project's own that reads its lock files, a workflow's npm audit say, which the core cannot read
  // exactly, is named while the lock joins, since it reads the tool's packages from then on: #1265, point 3)
  if (!has(lock) || !names("lockfiles", lock)) left.push(`have any audit the project keeps of its own lock files read ${lock} too (a workflow or script of the project's own that audits each lock file, npm audit say), since the tool's packages join what it reads; where one fails on them, mend it in the same pull request as the lock file`);
  if (!names("ignoreScriptsIn", npmrc)) left.push(`name ${npmrc} under "ignoreScriptsIn" in that config, so that check holds it to ignore-scripts=true and min-release-age=7 (floor rules 7 and 15)`);
  if (data.length) left.push(`name ${data.join(", ")} under "data" in that config: ${data.length > 1 ? "packages" : "a package"} of data the lock brings under CC-BY, which floor rule 10 allows for data and assets, so that check reads ${data.length > 1 ? "each" : "it"} under that list`);
  if (!has(lock)) left.push(`in the project's own job that runs its tests on a pull request, after them, add two steps: the install, ${installIn(tool.folder)}, and node core/scripts/strength.mjs with STRENGTH_BASE set to the pull request's base (origin/<its base branch>, fetched first). A change to a workflow, it passes two security reviews (floor rule 3); until it is made the strength check reports that it did not measure, and fails nothing`);
  return left;
}

// The manifest's text with the row written: in place of the one that stands, or after the last row of its slots.
// Its line ends are the manifest's own, "\r\n" where it holds them.
export function written(manifest, row) {
  const end = manifest.includes("\r\n") ? "\r\n" : "\n", lines = manifest.split(/\r?\n/u), line = lineOf(row), at = lines.findIndex(l => l.includes(ROW));
  if (at >= 0) { lines[at] = line; return lines.join(end); }
  const slots = lines.findIndex(l => /^## Slots\s*$/u.test(l));
  let last = slots;
  for (let i = slots + 1; slots >= 0 && i < lines.length && !lines[i].startsWith("## "); i++) if (lines[i].startsWith("| *")) last = i;
  if (last < 0) return `${manifest.replace(/(?:\r?\n)*$/u, "")}${end}${end}## Slots${end}| Slot | Here |${end}| --- | --- |${end}${line}${end}`;
  lines.splice(last + 1, 0, line);
  return lines.join(end);
}

// What the project at `root` holds that the row is read from, its manifest's text `manifest`; its files read by `read`,
// own-files.mjs's reader by default, which reads only a regular file of the project's own of a bounded size, so that
// no pipe, device or link out of the project that a project holds stops the steps or the sync (floor topic 5).
export function readProject(root, manifest, read = ownReader(root)) {
  const at = where(manifest), text = read(at) ?? fs.readFileSync(path.join(HERE, "..", "setup/template/shape.json.tmpl"), "utf8");
  let config;
  try { config = parseConfig(text, at); } catch { return null; }
  const copy = copyOf(root), own = f => !f.startsWith(copy);
  const code = measuredCode(config, root).filter(own);
  const tests = config.tests.length > 0 && measuredTests(config, root).some(own);
  const json = read("package.json"), runner = testRunner(json), how = LIST.tools.Stryker.runners[runner];
  return { code, tests, runner, locked: Boolean(how?.locked) && lockHolds(read("package-lock.json"), how.locked), plain: !how?.plain || how.plain.includes(scriptOf(json)), copy };
}

// own-files.mjs's reader of the project at `root`; where git cannot list its files, one that reads nothing.
function ownReader(root) {
  try { return ownFiles(root).read; } catch { return () => null; }
}

// The test files the config's "tests" name, as strength.mjs lists the code (git's files, tracked or not, none ignored).
function measuredTests(config, root) {
  return measuredCode({ code: config.tests, tests: [] }, root);
}

// The step of the sync notes that asks for the row (steps.mjs; the project `p` as it reads it): null where the row is
// the project's own, or what the list gives with its tool's package list standing at the list's version, the reasons of
// nothing to measure yet (no tests, no code) read as one; null too where there is no row, which step 420 asks for, or
// the shape check's config cannot be read, which step 370's does; else the mend.
export function named(p) {
  const now = toolOf(p.manifest), line = p.manifest.split(/\r?\n/u).find(l => l.includes(ROW)), read = p.read ?? ownReader(p.root);
  const project = now && (fillable(p.manifest) || now.command) ? readProject(p.root, p.manifest, read) : null;
  if (!project) return null;
  const row = rowFor(project), yet = reason => /^no (?:tests|code) yet/u.test(reason ?? "");
  const tool = LIST.tools[row.tool], list = tool?.folder && `${tool.folder}/package.json`, write = `node ${project.copy}scripts/mutation-tools.mjs --write`;
  if (line === lineOf(row)) return list ? listNamed(read(list), list, row.tool, write) : null;
  if (!fillable(p.manifest) || (yet(row.none) && yet(now.none))) return null;
  return `The manifest's row *mutation tool* is not what the core's list gives this project: ${lineOf(row)}. Mend: run \`${write}\`, which writes it, and do what it prints as left to do (for Stryker, the lock file of checks/mutation/, its entries in the licence check's config, and the job's install and strength step); to keep the measure off, the owner writes \`none\` with a reason of the owner's own in that row`;
}

// Of the package list `list` the tool `name` is installed from, its text `text` (null where it is no file of the
// project's own): null where it names the tool at the list's version, else the mend, `write` the writer's command.
function listNamed(text, list, name, write) {
  const tool = LIST.tools[name];
  if (text === null) return `The manifest's row *mutation tool* names ${name} from the core's list, and ${list}, the package list it is installed from, is not there as a file of the project's own. Mend: run \`${write}\`, which writes it, and do what it prints as left to do`;
  let version;
  try { version = JSON.parse(text)?.devDependencies?.[tool.package]; } catch { version = undefined; }
  return version === tool.version ? null : `${list} names ${tool.package} at ${version ?? "no version"}, where the core's list gives ${tool.version}. Mend: take ${list} out and run \`${write}\`, which writes it at the list's version and overrides, then write its lock file afresh as it prints`;
}

// The manifest's path, reached through no link (shape.mjs, notLinked: floor rule 13), as { at }, or { fail } with its mend.
function manifestAt() {
  try { return { at: notLinked(MANIFEST) }; } catch (e) { return { fail: String(e.message) }; }
}

// The manifest's text, with its line ends, the project's reader, and what the project holds that the row is read from;
// or the failure, with its mend. The manifest is read through own-files.mjs's reader, as a regular file of the project's
// own of a bounded size.
function readHere(argv) {
  if (argv.length > 1 || (argv.length && argv[0] !== "--write")) return { fail: "the script does not know that. Mend: run node core/scripts/mutation-tools.mjs, or with --write" };
  const { at, fail } = manifestAt();
  if (fail) return { fail };
  if (!fs.lstatSync(at, { throwIfNoEntry: false })) return { fail: `there is no ${MANIFEST} here. Mend: run it from the project's root, beside its manifest` };
  const read = ownReader("."), manifest = read(MANIFEST, true);
  if (manifest === null) return { fail: `${MANIFEST} cannot be read as a file of the project's own: it is no regular file, is past ${READ_MOST} bytes, or git does not list it in this repository. Mend: make it a plain file of the project's own, in the project's git repository, then run this again` };
  const project = readProject(".", manifest, read);
  if (!project) return { fail: `the shape check's config (${where(manifest)}) cannot be read, and the code and tests are read from it. Mend: mend it as node ${copyOf(".")}scripts/shape.mjs says, then run this again` };
  return { manifest, read, project };
}

// The licence check's config as the project's licence check is given it (check-configs.mjs), { at, config }: `at` null
// where its path cannot be read, `config` null where it cannot be read as JSON. The steps' reader of the project is
// loaded once the row is to be written, since the steps load this script.
async function licencesOf() {
  const [{ project }, { licenceConfig }] = await Promise.all([import("./steps.mjs"), import("./check-configs.mjs")]), p = project(".");
  let at = null, config = null;
  try { at = licenceConfig(p); config = JSON.parse(p.read(at) ?? "null"); } catch { /* (said in what is left: the config the check is given) */ }
  return { p, at, config };
}

// The row and the tool's folder written, each through no link, and what is left said; 1 where the manifest is reached
// through a link by now. The tool's lock file, which a package manager writes and only a script reads, is named under
// "skip" in the size marks where they can be written (step-writers.mjs, `skipWritten`; #1247, point 2).
async function writeRow(manifest, row) {
  const now = written(manifest, row);
  if (now !== manifest) {
    const { at, fail } = manifestAt();
    if (fail) { console.error(`FAIL: ${fail}`); return 1; }
    fs.writeFileSync(at, now);
  }
  console.log(now === manifest ? `${MANIFEST} holds that row already.` : `${MANIFEST}: the row written.`);
  const { written: made, blocked } = setUp(".", row), tool = LIST.tools[row.tool], { p, at, config } = await licencesOf();
  for (const f of made) console.log(f.endsWith("package.json") ? `${f}: written, ${tool.package} at ${tool.version}.` : `${f}: written, no install script and no release under a week old.`);
  if (tool?.folder) {
    const { held, skipWritten } = await import("./step-writers.mjs");
    for (const f of skipWritten(p, [`${tool.folder}/package-lock.json`], held("."))) console.log(`${f}: ${tool.folder}/package-lock.json named under "skip", a lock file no split lets anyone read less.`);
  }
  for (const l of [blocked, ...leftFor(tool, f => fs.existsSync(path.join(".", f)), config, at)].filter(Boolean)) console.log(`Left to do: ${l}.`);
  return 0;
}

async function main(argv) {
  const { fail, manifest, project: p } = readHere(argv);
  if (fail) { console.error(`FAIL: ${fail}`); return 1; }
  const row = rowFor(p), languages = [...new Set(p.code.map(languageOf))].sort();
  console.log(`Read: ${p.code.length} files of code (${languages.join(", ") || "none"}), ${p.tests ? "tests" : "no tests"}, the tests run by ${p.runner ?? "no script of package.json's"}.`);
  console.log(`The list gives: ${lineOf(row)}`);
  const line = manifest.split(/\r?\n/u).find(l => l.includes(ROW));
  if (!fillable(manifest) && line !== lineOf(row)) console.log(`${MANIFEST}'s row is the project's own, and stays: ${line}`);
  else if (argv[0] === "--write") return writeRow(manifest, row);
  return 0;
}

// (no top-level await: the steps' reader, loaded while the row is written, loads this script again, which must have ended)
if (started(import.meta.url)) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
