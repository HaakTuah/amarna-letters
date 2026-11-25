// The starter kit (README.md, "How a project takes the core"; setup/starter-kit.md): run from a clone of the core, in
// the root of a project that has none of these files yet, it writes what the project needs before its first task (the
// manifest, the rule files, the hooks' settings, the configs of the copies, shape, reading-size and licence checks, the issue
// forms, the choice records, Dependabot's config and its calls to the core's workflows, each pinned to the commit the
// manifest pins) and makes the first copy of the core under core/. The templates and the copy are both read from the
// commit the manifest pins, never from the clone's working folder, so what it writes is what was reviewed. It never
// overwrites (#1083): of a file of its own that the project holds already it takes what the core owns alone, as every
// sync does (converge.mjs), its part of AGENTS.md and CLAUDE.md, or a whole file the core marks or the kit writes, and
// names each it leaves as the project's; a project that holds the core already is taken by the sync (sync.mjs), run
// from the same clone; it writes through no link, which could lead outside the project (floor rule 13), and refuses a
// folder core/ that no manifest names. It ends by listing what is left: the lines the project fills in itself, and the
// owner's settings. It commits and pushes nothing. Git, tar and Node's own modules only.
//
//   node <the clone>/scripts/init.mjs --owner <login> [--name <the project's name>] [--at <full SHA>]
//                                     [--npm <the folder of package-lock.json>] [--nuget <the folder of the solution>]
//                                     [--private] [--game] [--pages <its build workflow's name>] [--versions]
//
//   --owner    the owner's GitHub login: the *owner's account* (floor rule 4), the issue forms' assignee
//   --name     the project's name in its rule files; left out, its folder's
//   --at       the commit of the core's main the project starts from; left out, the clone's own HEAD
//   --npm      its packages come from npm: the signature check and Dependabot's npm updates, for that folder
//   --nuget    its packages come from NuGet (.NET): the NuGet check and Dependabot's NuGet updates, for the folder
//              that holds its solution or project files (. for the root)
//   --private  (read from the host where it answers; the flag overrides) a private repository without GitHub's paid code security: no call to the core's CodeQL and licence
//              workflows, which need it (README.md, point 5, "A private repository"), its checks without a secret as
//              steps of core.yml's one job (oneJob), and each pull-request check started only once a pull request is
//              no draft (READY_ONLY)
//   --game     a game: the module game-design.md with the others
//   --pages    (with --game) a game served by GitHub Pages: its preview.yml, which calls the core's once the build of
//              that name has run on a pull request (README.md, point 5, "A game served by GitHub Pages")
//   --versions it has versions Dependabot cannot see: its versions.yml, monthly, with the config checks/versions.json
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { sizeOf } from "./file-size.mjs";
import { everyInstall } from "./packages.mjs";
import { MODULES } from "./reading.mjs";
import { plainEnv, untar } from "./releases.mjs";
import { started } from "./started.mjs";
import { MARK, converged, marked } from "./core-owned.mjs";
import { privateOf } from "./host-private.mjs";
import { LIST as MUTATION, NO_TESTS, leftFor, lineOf, readProject, rowFor, setUp } from "./mutation-tools.mjs";

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

// A game's build workflow, by the name its preview.yml runs after (#1095, point 6): written into that file in double
// quotes, so its form keeps it one YAML string that no expression or quote can leave.
const BUILD_FORM = "the name of its build workflow: at most 100 letters, digits and blanks, with . _ ( ) - where it needs them, beginning with a letter or digit";
export const BUILD = /^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,99}$/;
// The versions check's config, where the kit writes it and its versions.yml names it.
export const VERSIONS = "checks/versions.json";
const VERSIONS_START = { about: "The versions this project pins that Dependabot cannot see, read by the core's scripts/versions.mjs from where each is written (its header gives an entry's form); the monthly versions.yml opens an enhancement issue for each one behind.", entries: [] };

// Each template and the file it becomes, with when it is written (left out: always). One line a file, so the kit is
// read here whole: setup/starter-kit.md says only how a template is written.
export const FILES = [
  ["core-manifest.md.tmpl", "core-manifest.md"],
  ["AGENTS.md.tmpl", "AGENTS.md"],
  ["CLAUDE.md.tmpl", "CLAUDE.md"],
  ["kiro-steering.md.tmpl", ".kiro/steering/core.md"],
  ["antigravity-rule.md.tmpl", ".agents/rules/core.md"],
  ["kiro-hook.json.tmpl", ".kiro/hooks/work-saved.json"],
  ["codex-hooks.json.tmpl", ".codex/hooks.json"],
  ["SECURITY.md.tmpl", "SECURITY.md"],
  ["threat-model.md.tmpl", "docs/threat-model.md"],
  ["PROGRESS.md.tmpl", "docs/PROGRESS.md"],
  ["choices.md.tmpl", "docs/choices.md"],
  ["claude-settings.json.tmpl", ".claude/settings.json"],
  ["copies.json.tmpl", "checks/copies.json"],
  ["shape.json.tmpl", "checks/shape.json"],
  ["licences-audit.json.tmpl", "checks/licences-audit.json"],
  ["dependabot.yml.tmpl", ".github/dependabot.yml"],
  ["issue-bug.md.tmpl", ".github/ISSUE_TEMPLATE/bug_report.md"],
  ["issue-idea.md.tmpl", ".github/ISSUE_TEMPLATE/feature_request.md"],
  ["workflows/core.yml.tmpl", ".github/workflows/core.yml"],
  // (a private repository's checks without a secret run as steps of core.yml's one job instead: oneJob, #376)
  ["workflows/copies.yml.tmpl", ".github/workflows/copies.yml", o => !o.private],
  ["workflows/pr-description.yml.tmpl", ".github/workflows/pr-description.yml", o => !o.private],
  ["workflows/security-review.yml.tmpl", ".github/workflows/security-review.yml"],
  ["workflows/personal-terms.yml.tmpl", ".github/workflows/personal-terms.yml"],
  ["workflows/delete-merged-branches.yml.tmpl", ".github/workflows/delete-merged-branches.yml"],
  ["workflows/look.yml.tmpl", ".github/workflows/look.yml"],
  ["workflows/codeql.yml.tmpl", ".github/workflows/codeql.yml", o => !o.private],
  ["workflows/licences.yml.tmpl", ".github/workflows/licences.yml", o => !o.private],
  ["workflows/signatures.yml.tmpl", ".github/workflows/signatures.yml", o => o.packages !== undefined && !o.private],
  ["workflows/nuget.yml.tmpl", ".github/workflows/nuget.yml", o => o.nuget !== undefined && !o.private],
  ["workflows/preview.yml.tmpl", ".github/workflows/preview.yml", o => o.pages !== undefined],
  ["workflows/versions.yml.tmpl", ".github/workflows/versions.yml", o => o.versions !== undefined],
];
// What the script makes itself, beside the templates' files: none of these may exist either.
const MADE = ["checks/sizes.json", "checks/licences.json", "checks/copies-baseline.json", "checks/shape-baseline.json", "checks/holders.json", VERSIONS, "core"];
// What a builder's session reads at its start in a project the kit writes at any commit, as the kit's own entry files
// there name it: the files of READ that are the project's own, each file of the core its AGENTS.md and CLAUDE.md pull
// in on a line of its own, and the part for every tool but Claude beside Claude's: the reading-size check's marks. For
// the kit as it stands it is READ.
export function startOf(written) {
  return [...new Set([...READ.filter(f => !f.startsWith("core/")), ...pulledIn([written["AGENTS.md"] ?? "", written["CLAUDE.md"] ?? ""]).filter(f => f.startsWith("core/"))])];
}
// What rule files at the root pull in, from the root, and the core's file for every other tool beside Claude's part,
// which Claude reads too: the size marks' step reads it of the core's part (step-marks-start.mjs; #1272, point 4).
export function pulledIn(texts) {
  const pulled = [...texts.join("\n").matchAll(/^@([\w./-]+\.md)[ \t]*$/gmu)].map(m => m[1]), claude = pulled.find(f => f.endsWith("/claude.md"));
  return [...pulled, ...(claude ? [claude.replace(/claude\.md$/u, "other-builders.md")] : [])];
}
// The files every session reads at its start, as the AGENTS.md template of the kit as it stands imports them, and of
// the core's own (those under core/) what the core's cap counts (size.mjs).
export const READ = ["AGENTS.md", "CLAUDE.md", "docs/PROGRESS.md", "core-manifest.md", "core/floor/security.md", "core/roles/builder.md", "core/roles/shared/how-to-work.md",
  "core/roles/shared/inbox.md", "core/roles/shared/work-flow.md", "core/tools/claude.md", "core/tools/other-builders.md"];
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
  const VALUE = { "--owner": "owner", "--name": "name", "--npm": "packages", "--nuget": "nuget", "--at": "at", "--pages": "pages" };
  const FLAG = { "--private": "private", "--game": "game", "--versions": "versions" };
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
  callsAsked(o);
  for (const [flag, key] of [["--npm", "packages"], ["--nuget", "nuget"]]) {
    if (o[key] === undefined) continue;
    o[key] = o[key].replace(/\\/g, "/").replace(/\/+$/, "") || ".";
    if (!/^(\.|[A-Za-z0-9_][A-Za-z0-9._-]*(\/[A-Za-z0-9_][A-Za-z0-9._-]*)*)$/.test(o[key])) fail(`${flag} <folder>: a folder inside the project, from its root (. for the root itself)`);
  }
  return o;
}

// A game's previews and the versions check, where asked (#1095, point 6): the build's name held to its form, for a game
// alone, and the versions check given the kit's config.
function callsAsked(o) {
  if (o.pages !== undefined && !(o.game && BUILD.test(o.pages))) fail(`--pages <name>: with --game, ${BUILD_FORM}`);
  if (o.versions) o.versions = VERSIONS;
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

// A game's own rows of its manifest: the slots tasks/game-design.md uses, each left for the project to fill (#329).
export const GAME_ROWS = [
  ["computer players", "what the game calls its computer players, and where their logic lives"],
  ["measured players", "the computer players the measurement plays, and where they live"],
  ["what they are shown", "what the computer players are shown of the game, and where it is made"],
  ["use-against-ignore measurement", "the command that plays a feature used against it ignored, and what it prints"],
  ["where the numbers go", "where that measurement's numbers are kept"],
  ["where rules are taught", "where a player learns the rules, such as the help screen's file"],
];

// The modules' names as a commit of the core holds them: in the folders that say who reads them or when, or, at a commit
// from before the rules moved there, in modules/.
function modulesAt(pin) {
  const namesIn = d => { try { return git(["ls-tree", "--name-only", `${pin}:${d}`], ROOT).split("\n").filter(n => n.endsWith(".md")); } catch { return []; } };
  return MODULES.some(d => namesIn(d).length) ? MODULES.flatMap(namesIn) : namesIn("modules");
}
// Every file the kit writes for these options, as [path, text], before the copy of the core: the templates' files.
// `read` gives a template's text by its name under setup/template/ (the program reads it from the pinned commit).
export function files(o, pin, moduleNames, read) {
  const words = { owner: o.owner, project: o.name, core: CORE, pin, npm: o.packages, nuget: o.nuget, modules: modules(moduleNames, o.game), declined: o.game ? "" : "\nNot taken: `game-design.md` (the project is no game).",
    games: o.game ? GAME_ROWS.map(([slot, what]) => `\n| *${slot}* | FILL IN: ${what} |`).join("") : "",
    // (the mutation tool the core's list gives the project's code and tests, read by the kit; #1107)
    mutation: lineOf(o.mutation ?? { none: NO_TESTS }),
    // (a game's build, and the versions check's config, where the project has them: #1095, point 6)
    build: o.pages === undefined ? undefined : JSON.stringify(o.pages), versions: o.versions };
  return FILES.filter(([, , when]) => !when || when(o)).map(([template, to]) => {
    let text = fill(read(template), words);
    // (Dependabot's own part for each installer the project named, after the part every project has)
    if (to === ".github/dependabot.yml") {
      const folder = at => at === "." ? "" : at;
      if (o.packages !== undefined) text += fill(read("dependabot-npm.yml.tmpl"), { ...words, npm: folder(o.packages) });
      if (o.nuget !== undefined) text += fill(read("dependabot-nuget.yml.tmpl"), { ...words, nuget: folder(o.nuget) });
    }
    if (to === ".github/workflows/core.yml" && o.private) text = oneJob(text, o);
    if (READY_ONLY.includes(to) && o.private) text = readyOnly(text);
    return [to, marked(to) ? `${MARK}\n${text}` : text];
  });
}

// A private repository's checks without a secret as steps of core.yml's one job (#376), where each job is a billed
// minute: its call given the copies check's config and marks, the description check, whose types it takes, and the
// package check, last: the signature check, for the folder of package-lock.json, in quotes since a folder named true or
// null is still a folder's name, or the NuGet check, with the licence check's config. A public repository's minutes are
// free, so it keeps a call of its own to each.
export const oneJob = (text, o) => `${text.replace(/^ {2}pull_request:(\r?\n)/m, (on, eol) => `${on}    types: [opened, edited, reopened, synchronize, ready_for_review]${eol}`)
}    with:\n      copies: checks/copies.json\n      sizes: checks/sizes.json\n      description: true\n${o.packages !== undefined ? `      signatures: ${JSON.stringify(o.packages)}\n` : ""}${
  o.nuget !== undefined ? "      nuget: checks/licences.json\n" : ""}`;

// A private repository's pull-request checks start only once a pull request is ready (#375): each of these calls also
// triggers when one is marked ready, and its job is skipped on a draft, so a push to a draft bills no job and marking
// it ready runs each once. The trigger and the condition stand together in the project's own file, so a project that
// keeps its calls as they were runs every check as before (AGENTS.md, "Nothing locks a project").
export const READY_ONLY = ["core.yml", "personal-terms.yml"].map(f => `.github/workflows/${f}`);
export const READY = "${{ !github.event.pull_request.draft }}";
export const readyOnly = text => text
  // (the trigger's own types, where it lists them, gain the one more; else it lists them: GitHub's three and that one)
  .replace(/^ {2}pull_request:(\r?\n)((?: {4}.*\r?\n)*)/m, (on, eol, block) => /^ {4}types: \[/m.test(block)
    ? /^ {4}types: \[[^\]\r\n]*\bready_for_review\b/m.test(block) ? on : on.replace(/^( {4}types: \[[^\]\r\n]*)\]/m, "$1, ready_for_review]")
    : `  pull_request:${eol}    types: [opened, reopened, synchronize, ready_for_review]${eol}${block}`)
  .replace(/^(jobs:\r?\n {2}[\w-]+:(\r?\n))/m, (job, _, eol) => `${job}    if: ${READY}${eol}`);

// The reading-size check's first marks: each file every session reads at about 20 KB, and the total of the project's
// own among them (the core's copy under core/ is held to the core's own cap) at what they come to today, rounded up
// to a whole KB with one to spare, so the first task has room and the mark means something; under "skip", `skip`, the
// files the kit's scripts write that only a script reads (#1247, point 2).
export function sizes(bytes, skip = []) {
  const total = Object.entries(bytes).filter(([f]) => !f.startsWith("core/")).reduce((a, [, b]) => a + b, 0);
  return { each: 20 * KB, read: Object.fromEntries(Object.keys(bytes).map(f => [f, 20 * KB])), total: (Math.ceil(total / KB) + 1) * KB, split: 50 * KB, skip, past: {} };
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

// The first baselines of the copies check and the shape check: what stands today, which each reads from the files git
// knows of, so the kit's own are added first; and the first list of what holds the project's own rules (#662).
function firstBaselines(here) {
  const made = [];
  for (const check of ["copies", "shape"]) {
    if (fs.existsSync(path.join(here, `checks/${check}-baseline.json`))) continue;
    made.push(`checks/${check}-baseline.json`);
    execFileSync(process.execPath, [`core/scripts/${check}.mjs`, `checks/${check}.json`, "--first"], { cwd: here, env: guarded(), stdio: ["ignore", "ignore", "inherit"] });
    git(["add", "--", `checks/${check}-baseline.json`], here, guarded());
  }
  // (a pin from before #662 holds a holders.mjs with no --own: the list is then the sync's step, and nothing is run)
  if (!fs.readFileSync(path.join(here, "core/scripts/holders.mjs"), "utf8").includes("--own") || fs.existsSync(path.join(here, "checks/holders.json"))) return made;
  execFileSync(process.execPath, ["core/scripts/holders.mjs", "--own", "--write"], { cwd: here, env: guarded(), stdio: ["ignore", "ignore", "inherit"] });
  git(["add", "--", "checks/holders.json"], here, guarded());
  return [...made, "checks/holders.json"];
}

// The project the kit is run in, held to what the kit writes into: the root of its git repository, not the core, a
// name that serves, and no filter of its own that `git add` would run. Its name is set where --name left it out.
function checkProject(o, here) {
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
}

// The commit of the core the project starts from: --at, or the clone's own HEAD.
function pinOf(o) {
  let pin;
  try { pin = git(["rev-parse", `${o.at ?? "HEAD"}^{commit}`], ROOT); } catch { fail(o.at ? `${o.at} is no commit of this clone of the core` : "run it from a clone of the core (the script's own folder is no git repository)"); }
  // (a clone knows the core's main as origin/main: where it does, the pin is held to it here; core.yml holds it always)
  let main = null;
  try { main = git(["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main"], ROOT); } catch { /* (no such ref: core.yml decides) */ }
  if (main) { try { git(["merge-base", "--is-ancestor", pin, main], ROOT); } catch { fail(`${pin} is not a commit of the core's main, as this clone knows it`); } }
  return pin;
}

// A Failure where a path the kit writes is a link, or where the copy's folder stands already: it then writes nothing.
function refuseTaken(here, out) {
  const targets = [...out.map(([to]) => to), ...MADE];
  const links = [...new Set(targets.map(to => linked(here, to)).filter(Boolean))];
  if (links.length) fail(`the project holds a link at ${links.join(", ")}: the starter kit writes through no link, and wrote nothing`);
  // (a link whose target is missing is there all the same: asked without following it)
  const there = to => { try { fs.lstatSync(path.join(here, to)); return true; } catch { return false; } };
  if (there("core")) fail("the project already has core/, and no core-manifest.md that names a copy there: the starter kit never overwrites a folder of the project's own, and wrote nothing. Mend: move that folder, or write the manifest's \"Core:\" line for it and run the sync");
}

// The kit's files, the first copy of the core, and the checks' first configs and baselines, written and staged. A file
// the project holds already is never written over: of the kit's files it takes the core's part alone, as every sync
// takes it (converge.mjs, `converged`), and what is left as the project's is said; a config or baseline that stands is
// kept.
function writeKit(o, here, pin, out) {
  const there = to => fs.existsSync(path.join(here, to));
  // ("wx": a file that has appeared since, a link too, is refused and never written over)
  const write = (to, text, flag = "wx") => { fs.mkdirSync(path.dirname(path.join(here, to)), { recursive: true }); fs.writeFileSync(path.join(here, to), text, { flag }); };
  const written = [], left = [];
  for (const [to, text] of out) {
    if (!there(to)) { write(to, text); written.push(to); continue; }
    const r = converged(to, fs.readFileSync(path.join(here, to), "utf8"), text);
    if (r.text !== undefined) { write(to, r.text, "w"); written.push(to); }
    if (r.left) left.push(`${to} ${r.left}`);
  }
  // the first copy, as the sync makes every copy: the core's tree at the pin, without what it keeps to itself
  fs.mkdirSync(path.join(here, "core"));
  untar(path.join(here, "core"), execFileSync("git", ["archive", pin], { cwd: ROOT, env: plainEnv(), maxBuffer: 1 << 28 }));
  // (and its packages, installed from its lock file as the sync installs them, into core/.packages/node_modules/, which the copy's
  // own .gitignore keeps out of the commit; a failure leaves the kit written and says the mend: #654)
  const installer = path.join(here, "core", "scripts", "install.mjs");
  if (fs.existsSync(installer)) {
    // (every install of the copy's, an older pin's (--at) as its installer knows them: #719)
    const r = spawnSync(process.execPath, [installer, ...everyInstall(path.join(here, "core"))], { cwd: here, encoding: "utf8" });
    if (r.status !== 0) console.log(`note the core's packages are not installed: ${(r.stderr ?? "").trim().split("\n").slice(-1)[0]}. Mend: none is needed for the checks, which install them themselves before they read (#1093); to install them now, run \`if [ -f core/scripts/install.mjs ]; then node core/scripts/install.mjs; fi\``);
  }
  // (the folder of the mutation tool the manifest names, its package list and npm config written as mutation-tools.mjs
  // --write writes them, before the licence check's config, which names that npm config)
  const tool = setUp(here, o.mutation), mutation = MUTATION.tools[o.mutation?.tool];
  const made = [...tool.written];
  // (the shape check's baseline and the tool's lock file, which a script writes and a split of answers nothing, skipped)
  const skip = ["checks/shape-baseline.json", ...(mutation?.folder ? [`${mutation.folder}/package-lock.json`] : [])];
  if (!there("checks/sizes.json")) { write("checks/sizes.json", `${JSON.stringify(sizes(Object.fromEntries(startOf(Object.fromEntries(out)).filter(there).map(f => [f, sizeOf(path.join(here, f))])), skip), null, 2)}\n`); made.push("checks/sizes.json"); }
  // (the versions check's config, with no entry yet: the project names each version Dependabot cannot see; #1095, point 6)
  if (o.versions && !there(VERSIONS)) { write(VERSIONS, `${JSON.stringify(VERSIONS_START, null, 2)}\n`); made.push(VERSIONS); }
  let config = null;
  if (!there("checks/licences.json")) {
    config = withTool(licences(o, there), mutation, there);
    write("checks/licences.json", `${JSON.stringify(config, null, 2)}\n`); made.push("checks/licences.json");
  }
  git(["add", "--", ...written, ...made, "core"], here, guarded());
  // (what is left for the tool: where the licence check's config stood, the project's own, each entry it would name is asked)
  return { written, left, made: [...made, ...firstBaselines(here)], tool: [tool.blocked, ...leftFor(mutation, there, config)].filter(Boolean) };
}

// The licence check's first config with what the mutation tool needs of it: its npm config, where it stands, and the
// packages of data its lock brings under CC-BY, which floor rule 10 allows for data (#1247, point 1).
function withTool(config, tool, there) {
  if (tool?.folder && there(`${tool.folder}/.npmrc`)) config.ignoreScriptsIn = [...(config.ignoreScriptsIn ?? []), `${tool.folder}/.npmrc`];
  if (tool?.data?.length) config.data = [...new Set([...(config.data ?? []), ...tool.data])];
  return config;
}

// What the kit wrote, and what it leaves for the project and for the owner.
function sayLeft(o, pin, out, { written, left, made, tool }) {
  const list = m => m.length > 1 ? `${m.slice(0, -1).join(", ")} and ${m.at(-1)}` : m.join("");
  console.log(`The starter kit is written: ${written.length + made.length} files${made.length ? ` (the checks' first configs and baselines ${list(made)} among them)` : ""}, and core/ at ${pin.slice(0, 7)}. All of it is staged; nothing is committed.`);
  if (left.length) console.log(`\nLeft as the project's, never written over (each a difference the manifest's "Differences" declares on the owner's word, or a task the project's agents take):\n${left.map(l => `  ${l}`).join("\n")}`);
  const open = out.filter(([to]) => written.includes(to)).flatMap(([to, text]) => text.split("\n").map((line, i) => line.includes("FILL IN:") ? `  ${to}:${i + 1}: ${line.slice(line.indexOf("FILL IN:") + 9).replace(/\s*\|\s*$/, "").trim()}` : null).filter(Boolean));
  console.log(`\nLeft for the project, each marked FILL IN:\n${open.join("\n")}`);
  console.log(`  checks/copies.json: "code", the project's own code as git pathspecs, once it has any`);
  for (const l of tool) console.log(`  the mutation tool the manifest names: ${l}`);
  console.log(`  checks/shape.json: "systems", each system the project has, by its name, with its paths, what it uses and its entrance, once it has any; "tests", its test files (core/tasks/code-shape.md)`);
  console.log("  checks/licences.json: \"ships\" and \"scan\", once something reaches its users; \"lockfiles\" and \"ignoreScriptsIn\", each npm lock file and .npmrc that did not stand yet");
  console.log("  where it has versions Dependabot cannot see, its versions check: the core's README, point 5");
  console.log("  its labels, once its repository is on GitHub: node core/scripts/labels.mjs --make, which makes those of core/scripts/labels.json (core/roles/shared/inbox.md)");
  if (o.nuget !== undefined) console.log("  its NuGet packages: lock files turned on (RestorePackagesWithLockFile in its project files or Directory.Build.props) and committed, and each packages.lock.json named in checks/licences.json under \"nuget\", as one whose packages ship or one of tools that only run");
  if (o.private) console.log("  no call to the core's CodeQL and licence workflows was written (--private): a workflow of the project's own runs the licence check, as the core's README, point 5, \"A private repository\", says");
  // (the settings only the owner gives, in one checklist the owner takes in one sitting: the copy's owner-settings.mjs,
  // run here, where the copy holds it; #1085)
  const settings = path.join("core", "scripts", "owner-settings.mjs");
  const r = fs.existsSync(settings) ? spawnSync(process.execPath, [settings], { encoding: "utf8", timeout: 600000 }) : null;
  console.log(r?.status === 0 && r.stdout.trim() ? `\nLeft for the owner:\n${r.stdout.trim()}` : `\nLeft for the owner: the settings in the core's README, "Setting up (the owner's part)".`);
  console.log("\nWhat owning this project asks of the owner, in one plain page: core/setup/owner-guide.md");
}

function init(argv) {
  const o = options(argv);
  const here = process.cwd();
  checkProject(o, here);
  // (a project that holds the core already, its manifest naming a copy, is taken the one way every such project is:
  // the sync, run from this clone, which writes what the core owns as this kit would; #1083)
  if (/^Core: /m.test(fs.existsSync(path.join(here, "core-manifest.md")) ? fs.readFileSync(path.join(here, "core-manifest.md"), "utf8") : "")) {
    console.log("The project holds the core already (core-manifest.md names a copy): taken by the sync, as every such project is.");
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "sync.mjs"), ...(o.at ? [o.at] : [])], { cwd: here, stdio: "inherit" });
    if (r.status !== 0) process.exitCode = r.status ?? 1;
    return;
  }
  // (a manifest of the project's own with no "Core:" line would name no copy the kit writes: every later sync, step
  // and check would refuse on it)
  if (fs.existsSync(path.join(here, "core-manifest.md"))) fail("the project holds a core-manifest.md of its own with no \"Core:\" line, so the copy the starter kit writes would be named by no manifest, and it wrote nothing. Mend: move that file aside and run the starter kit again, which writes the manifest, then carry its rows over; or write its \"Core:\" line as the kit writes it and run the sync");
  // (whether the repository is private, as its host says it, as a sync reads it: host-private.mjs, #1095; --private
  // overrides, and where the host cannot say and the flag is not given, the kit writes it as public and says so)
  if (!o.private) {
    const host = privateOf(here);
    if (host.private) o.private = true;
    else if (host.unread) console.log(`note ${host.unread}; the kit writes it as a public repository: give --private for a private one`);
  }
  const pin = pinOf(o);
  const moduleNames = modulesAt(pin);
  // (the manifest's row *mutation tool*, from the core's list for the code and tests the project holds already; #1107)
  const project = readProject(here, "");
  if (project) o.mutation = rowFor(project);

  const read = name => { try { return raw(["show", `${pin}:${TEMPLATES}/${name}`], ROOT); } catch { return fail(`${pin} holds no ${TEMPLATES}/${name}: take a commit of the core that has the starter kit`); } };
  const out = files(o, pin, moduleNames, read);
  refuseTaken(here, out);
  sayLeft(o, pin, out, writeKit(o, here, pin, out));
}

if (started(import.meta.url)) {
  try { init(process.argv.slice(2)); } catch (e) {
    console.error(`FAIL: ${e instanceof Failure ? e.message : e.stack}`);
    process.exitCode = 1;
  }
}
