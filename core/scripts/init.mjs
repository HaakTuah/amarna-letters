// The starter kit (README.md, "How a project takes the core"; setup/starter-kit.md): run from a clone of the core, in
// the root of a project that has none of these files yet, it writes what the project needs before its first task (the
// manifest, the rule files, the hooks' settings, the configs of the copies, reading-size and licence checks, the issue
// forms, Dependabot's config and its calls to the core's workflows, each pinned to the commit the manifest pins) and
// makes the first copy of the core under core/. The templates and the copy are both read from the commit the manifest
// pins, never from the clone's working folder, so what it writes is what was reviewed. It never overwrites: where one
// of its files exists, it names them and writes nothing; nor does it write through a link, which could lead outside
// the project (floor rule 13). It ends by listing what is left: the lines the project fills in itself, and the owner's
// settings. It commits and pushes nothing. Git, tar and Node's own modules only.
//
//   node <the clone>/scripts/init.mjs --owner <login> [--name <the project's name>] [--at <full SHA>]
//                                     [--npm <the folder of package-lock.json>] [--nuget <the folder of the solution>]
//                                     [--private] [--game]
//
//   --owner    the owner's GitHub login: the *owner's account* (floor rule 4), the issue forms' assignee
//   --name     the project's name in its rule files; left out, its folder's
//   --at       the commit of the core's main the project starts from; left out, the clone's own HEAD
//   --npm      its packages come from npm: the signature check and Dependabot's npm updates, for that folder
//   --nuget    its packages come from NuGet (.NET): the NuGet check and Dependabot's NuGet updates, for the folder
//              that holds its solution or project files (. for the root)
//   --private  a private repository without GitHub's paid code security: no call to the core's CodeQL and licence
//              workflows, which need it (README.md, point 5, "A private repository")
//   --game     a game: the module game-design.md with the others
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { sizeOf } from "./file-size.mjs";
import { plainEnv } from "./releases.mjs";
import { started } from "./started.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const TEMPLATES = "setup/template";
// (every call without git's own variables that point at another repository, so each lands in the folder it names:
// releases.mjs)
const raw = (args, cwd, env = plainEnv()) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
const git = (args, cwd, env) => raw(args, cwd, env).trim();
// For every call made in the project itself, whose own git settings are not the kit's to trust (a folder may come
// whole from someone else): the two settings that run a command by themselves are turned off, as work-saved.sh turns
// them off. A filter of the project's own, which would run on `git add`, cannot be turned off so: the kit refuses a
// project whose own settings hold one, before it adds anything (`filtered`, below).
const guarded = () => ({ ...plainEnv(), GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: "core.fsmonitor", GIT_CONFIG_VALUE_0: "false", GIT_CONFIG_KEY_1: "core.hooksPath", GIT_CONFIG_VALUE_1: "/dev/null" });
class Failure extends Error {}
const fail = msg => { throw new Failure(msg); };

// Each template and the file it becomes, with when it is written (left out: always). One line a file, so the kit is
// read here whole: setup/starter-kit.md says only how a template is written.
export const FILES = [
  ["core-manifest.md.tmpl", "core-manifest.md"],
  ["AGENTS.md.tmpl", "AGENTS.md"],
  ["CLAUDE.md.tmpl", "CLAUDE.md"],
  ["SECURITY.md.tmpl", "SECURITY.md"],
  ["threat-model.md.tmpl", "docs/threat-model.md"],
  ["PROGRESS.md.tmpl", "docs/PROGRESS.md"],
  ["claude-settings.json.tmpl", ".claude/settings.json"],
  ["copies.json.tmpl", "checks/copies.json"],
  ["licences-audit.json.tmpl", "checks/licences-audit.json"],
  ["dependabot.yml.tmpl", ".github/dependabot.yml"],
  ["issue-bug.md.tmpl", ".github/ISSUE_TEMPLATE/bug_report.md"],
  ["issue-idea.md.tmpl", ".github/ISSUE_TEMPLATE/feature_request.md"],
  ["workflows/core.yml.tmpl", ".github/workflows/core.yml"],
  ["workflows/copies.yml.tmpl", ".github/workflows/copies.yml"],
  ["workflows/pr-description.yml.tmpl", ".github/workflows/pr-description.yml"],
  ["workflows/security-review.yml.tmpl", ".github/workflows/security-review.yml"],
  ["workflows/personal-terms.yml.tmpl", ".github/workflows/personal-terms.yml"],
  ["workflows/delete-merged-branches.yml.tmpl", ".github/workflows/delete-merged-branches.yml"],
  ["workflows/core-moved.yml.tmpl", ".github/workflows/core-moved.yml"],
  ["workflows/codeql.yml.tmpl", ".github/workflows/codeql.yml", o => !o.private],
  ["workflows/licences.yml.tmpl", ".github/workflows/licences.yml", o => !o.private],
  ["workflows/signatures.yml.tmpl", ".github/workflows/signatures.yml", o => o.packages !== undefined],
  ["workflows/nuget.yml.tmpl", ".github/workflows/nuget.yml", o => o.nuget !== undefined],
];
// What the script makes itself, beside the templates' files: none of these may exist either.
const MADE = ["checks/sizes.json", "checks/licences.json", "checks/copies-baseline.json", "core"];
// The files every session reads at its start, as the AGENTS.md template imports them: the reading-size check's marks,
// and of the core's own (those under core/) what the core's cap counts (size.mjs).
export const READ = ["AGENTS.md", "CLAUDE.md", "docs/PROGRESS.md", "core-manifest.md", "core/floor/security.md", "core/modules/how-to-work.md",
  "core/modules/inbox.md", "core/modules/work-flow.md", "core/modules/git.md", "core/modules/claude.md", "core/modules/other-builders.md"];
const KB = 1024;

// A project's name as it may stand in a rule file's heading: letters, digits and blanks, and the few marks a name
// uses, beginning with a letter or digit and ending with no blank. Nothing a tool reads as more than a name gets in:
// no @ (Claude Code takes "@path" in a rule file for a file to read in), no line break of any kind, no control
// character, no bracket, brace, backtick or bar. The folder's name, where it serves as the project's, is held to it too.
// Read in its composed form, so a letter written as a letter and its accent (as a folder's name can be) is one letter;
// marks that belong to a letter are let in after the first, for the scripts that are written with them.
export const NAME = "at most 80 letters, digits and blanks, with . _ ' & , ( ) + ! - : # where a name needs them, beginning with a letter or digit";
export const named = text => /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._'&,()+!:#-]{0,79}$/u.test(text.normalize("NFC")) && !text.endsWith(" ");

// The commands the project's own git settings would run on `git add`: its filters, read with what its settings
// include, as names only. None is the usual case; the user's own settings, outside the project, are the user's.
export function filtered(lines) {
  return [...new Set(lines.split("\n").map(l => /^(filter\.[^\s]*\.(?:clean|smudge|process))(?:\s|$)/i.exec(l)?.[1]).filter(Boolean))];
}

// The part of a path inside the project that is a link, if any, or null: nothing is written through one, since it may
// lead outside the project. A path that does not exist yet has none from there on.
export function linked(root, to) {
  let at = root;
  for (const part of to.split("/")) {
    at = path.join(at, part);
    let found;
    try { found = fs.lstatSync(at); } catch { return null; }
    if (found.isSymbolicLink()) return path.relative(root, at).split(path.sep).join("/");
  }
  return null;
}

// The options of a command line, or a Failure that says what is wrong with it. Each value is held to its own form
// before it reaches a file: a login, a commit, a folder inside the project, a name on one line.
export function options(argv) {
  const o = {};
  const VALUE = { "--owner": "owner", "--name": "name", "--npm": "packages", "--nuget": "nuget", "--at": "at" };
  const FLAG = { "--private": "private", "--game": "game" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a in FLAG) o[FLAG[a]] = true;
    else if (a in VALUE) { if (argv[i + 1] === undefined) fail(`${a} needs a value`); o[VALUE[a]] = argv[++i]; }
    else fail(`unknown argument: ${a}`);
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(o.owner ?? "")) fail("--owner <login>: the owner's GitHub login (letters, digits and hyphens)");
  if (o.at !== undefined && !/^[0-9a-f]{40}$/.test(o.at)) fail("--at <full SHA>: the core's commit as 40 hex characters");
  if (o.name !== undefined && !named(o.name)) fail(`--name: ${NAME}`);
  o.name = o.name?.normalize("NFC");
  for (const [flag, key] of [["--npm", "packages"], ["--nuget", "nuget"]]) {
    if (o[key] === undefined) continue;
    o[key] = o[key].replace(/\\/g, "/").replace(/\/+$/, "") || ".";
    if (!/^(\.|[A-Za-z0-9_][A-Za-z0-9._-]*(\/[A-Za-z0-9_][A-Za-z0-9._-]*)*)$/.test(o[key])) fail(`${flag} <folder>: a folder inside the project, from its root (. for the root itself)`);
  }
  return o;
}

// The modules a project takes, as its manifest lists them: all of them for a game, and for any other project each but
// the games' own, by name, read from the core's own folder so the list is the core's at that commit.
export function modules(names, game) {
  return game ? "all" : names.filter(n => n !== "game-design.md").sort().map(n => `\`${n}\``).join(", ");
}

// A template's text with its words filled in; one left unfilled is a fault of the kit, and fails.
export function fill(text, words) {
  const out = text.replace(/\{\{([a-z]+)\}\}/g, (whole, word) => words[word] ?? whole);
  const left = out.match(/\{\{[a-z]+\}\}/);
  if (left) fail(`the starter kit leaves ${left[0]} unfilled`);
  return out;
}

// Every file the kit writes for these options, as [path, text], before the copy of the core: the templates' files.
// `read` gives a template's text by its name under setup/template/ (the program reads it from the pinned commit).
export function files(o, pin, moduleNames, read) {
  const words = { owner: o.owner, project: o.name, core: CORE, pin, npm: o.packages, nuget: o.nuget, modules: modules(moduleNames, o.game) };
  return FILES.filter(([, , when]) => !when || when(o)).map(([template, to]) => {
    let text = fill(read(template), words);
    // (Dependabot's own part for each installer the project named, after the part every project has)
    if (to === ".github/dependabot.yml") {
      const folder = at => at === "." ? "" : at;
      if (o.packages !== undefined) text += fill(read("dependabot-npm.yml.tmpl"), { ...words, npm: folder(o.packages) });
      if (o.nuget !== undefined) text += fill(read("dependabot-nuget.yml.tmpl"), { ...words, nuget: folder(o.nuget) });
    }
    return [to, text];
  });
}

// The reading-size check's first marks: each file every session reads at about 20 KB, and the total of the project's
// own among them (the core's copy under core/ is held to the core's own cap) at what they come to today, rounded up
// to a whole KB with one to spare, so the first task has room and the mark means something.
export function sizes(bytes) {
  const total = Object.entries(bytes).filter(([f]) => !f.startsWith("core/")).reduce((a, [, b]) => a + b, 0);
  return { each: 20 * KB, read: Object.fromEntries(Object.keys(bytes).map(f => [f, 20 * KB])), total: (Math.ceil(total / KB) + 1) * KB, split: 50 * KB, skip: [], past: {} };
}

// The licence check's first config: nothing ships yet, and of npm's files only those that stand today are named,
// since the check fails on one it cannot read. A project whose packages come from NuGet gets the NuGet check's part,
// its lock files still to be named. `has`: whether a path of the project exists.
export function licences(o, has) {
  const config = { ships: [], audit: "checks/licences-audit.json", scan: { served: [], skip: [] }, ...(o.nuget === undefined ? {} : { nuget: { ships: [], tools: [] } }) };
  if (o.packages === undefined) return config;
  const at = name => o.packages === "." ? name : `${o.packages}/${name}`;
  return { lockfiles: [at("package-lock.json")].filter(has), ...config, ignoreScriptsIn: [at(".npmrc")].filter(has) };
}

function init(argv) {
  const o = options(argv);
  const here = process.cwd();
  // (asked of git as a path from the repository's root, empty at the root itself: no two spellings of one folder,
  // such as Windows' short names, are ever compared)
  let below;
  try { below = git(["rev-parse", "--show-prefix"], here, guarded()); } catch { fail("run it in the root of the project's git repository (git init first)"); }
  if (below !== "") fail("run it in the root of the project's git repository");
  if (fs.realpathSync.native(here) === fs.realpathSync.native(ROOT)) fail("run it in the project, not in the core itself");
  o.name ??= path.basename(here).normalize("NFC");
  if (!named(o.name)) fail(`the folder's name does not serve as the project's (${NAME}): give --name`);
  let filters = "";
  try { filters = raw(["config", "--local", "--includes", "--get-regexp", "^filter\\."], here, guarded()); } catch { /* (none: git ends with 1) */ }
  if (filtered(filters).length) fail(`the project's own git settings hold ${filtered(filters).join(", ")}, which would run a command when the kit adds its files: take it out of .git/config first, or start from a fresh git init`);

  let pin;
  try { pin = git(["rev-parse", `${o.at ?? "HEAD"}^{commit}`], ROOT); } catch { fail(o.at ? `${o.at} is no commit of this clone of the core` : "run it from a clone of the core (the script's own folder is no git repository)"); }
  // (a clone knows the core's main as origin/main: where it does, the pin is held to it here; core.yml holds it always)
  let main = null;
  try { main = git(["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main"], ROOT); } catch { /* (no such ref: core.yml decides) */ }
  if (main) { try { git(["merge-base", "--is-ancestor", pin, main], ROOT); } catch { fail(`${pin} is not a commit of the core's main, as this clone knows it`); } }
  const moduleNames = git(["ls-tree", "--name-only", `${pin}:modules`], ROOT).split("\n").filter(n => n.endsWith(".md"));

  const read = name => { try { return raw(["show", `${pin}:${TEMPLATES}/${name}`], ROOT); } catch { return fail(`${pin} holds no ${TEMPLATES}/${name}: take a commit of the core that has the starter kit`); } };
  const out = files(o, pin, moduleNames, read);
  const targets = [...out.map(([to]) => to), ...MADE];
  const links = [...new Set(targets.map(to => linked(here, to)).filter(Boolean))];
  if (links.length) fail(`the project holds a link at ${links.join(", ")}: the starter kit writes through no link, and wrote nothing`);
  // (a link whose target is missing is there all the same: asked without following it)
  const taken = targets.filter(to => { try { fs.lstatSync(path.join(here, to)); return true; } catch { return false; } });
  if (taken.length) fail(`the project already has ${taken.join(", ")}: the starter kit never overwrites, and wrote nothing`);

  // ("wx": a file that has appeared since, a link too, is refused and never written over)
  const write = (to, text) => { fs.mkdirSync(path.dirname(path.join(here, to)), { recursive: true }); fs.writeFileSync(path.join(here, to), text, { flag: "wx" }); };
  for (const [to, text] of out) write(to, text);
  // the first copy, as the sync makes every copy: the core's tree at the pin, without what it keeps to itself
  fs.mkdirSync(path.join(here, "core"));
  // ("-f -": Windows' own tar reads a tape drive unless told to read its input)
  execFileSync("tar", ["-x", "-f", "-", "-C", "core"], { cwd: here, input: execFileSync("git", ["archive", pin], { cwd: ROOT, env: plainEnv(), maxBuffer: 1 << 28 }) });
  const marks = sizes(Object.fromEntries(READ.map(f => [f, sizeOf(path.join(here, f))])));
  write("checks/sizes.json", `${JSON.stringify(marks, null, 2)}\n`);
  write("checks/licences.json", `${JSON.stringify(licences(o, f => fs.existsSync(path.join(here, f))), null, 2)}\n`);
  // the copies check's first baseline: the copies that stand today (it reads the files git knows of)
  const made = [...out.map(([to]) => to), "checks/sizes.json", "checks/licences.json", "core"];
  git(["add", "--", ...made], here, guarded());
  execFileSync(process.execPath, ["core/scripts/copies.mjs", "checks/copies.json", "--first"], { cwd: here, env: guarded(), stdio: ["ignore", "ignore", "inherit"] });
  git(["add", "--", "checks/copies-baseline.json"], here, guarded());

  console.log(`The starter kit is written: ${out.length + 3} files (the last three checks/sizes.json, checks/licences.json and checks/copies-baseline.json), and core/ at ${pin.slice(0, 7)}. All of it is staged; nothing is committed.`);
  const open = out.flatMap(([to, text]) => text.split("\n").map((line, i) => line.includes("FILL IN:") ? `  ${to}:${i + 1}: ${line.slice(line.indexOf("FILL IN:") + 9).trim()}` : null).filter(Boolean));
  console.log(`\nLeft for the project, each marked FILL IN:\n${open.join("\n")}`);
  console.log(`  checks/copies.json: "code", the project's own code as git pathspecs, once it has any`);
  console.log("  checks/licences.json: \"ships\" and \"scan\", once something reaches its users; \"lockfiles\" and \"ignoreScriptsIn\", each npm lock file and .npmrc that did not stand yet");
  console.log("  where it has versions Dependabot cannot see, its versions check: the core's README, point 5");
  if (o.nuget !== undefined) console.log("  its NuGet packages: lock files turned on (RestorePackagesWithLockFile in its project files or Directory.Build.props) and committed, and each packages.lock.json named in checks/licences.json under \"nuget\", as one whose packages ship or one of tools that only run");
  if (o.private) console.log("  no call to the core's CodeQL and licence workflows was written (--private): a workflow of the project's own runs the licence check, as the core's README, point 5, \"A private repository\", says");
  console.log(`\nLeft for the owner (the core's README, "Setting up"): the ruleset on main, with the checks \`core / core\` and the project's own required;`);
  console.log("  the Actions setting that every action is pinned to a full commit SHA; the Actions secret PERSONAL_TERMS; and the security reviewer's app.");
}

if (started(import.meta.url)) {
  try { init(process.argv.slice(2)); } catch (e) {
    console.error(`FAIL: ${e instanceof Failure ? e.message : e.stack}`);
    process.exitCode = 1;
  }
}
