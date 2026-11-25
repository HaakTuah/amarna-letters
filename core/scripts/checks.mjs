// The core's pull-request checks that need no secret, from one script (#376): the steps of the job the core's
// .github/workflows/core.yml runs after its own check of the copy, and of copies.yml, pr-description.yml,
// signatures.yml and nuget.yml, which run its parts one each. A session may also start it by hand in the folder it works
// in, from the project's root: a tool, and no duty (no rule asks it before a push; #417). It runs, part by part:
//
// - copies: the copies, pointer, reading-size, workflow, entry-file, manifest, shape, choice records' and core's files' checks (what each holds, its
//   own script says; the header of .github/workflows/copies.yml says them together);
// - description: the description check (pr-description.mjs), given the pull request's description in PR_BODY or a file;
// - signatures and nuget, the package checks: first a look at whether the change touches what it reads, then npm's
//   install and signature check, or NuGet's restore, each with its licence read. Before any part, each NuGet call's
//   lookup of the packages new to the project (lookup.mjs), since a restore runs the change's own build files. They go last, and the job runs each in
//   a step of its own after the others; the NuGet restore runs the change's own build files, so it goes after all, and
//   nothing that runs after it reads what a build could have changed.
//
// Each check runs even where one before it failed, so every failure is said, each with its mend; within the package
// check a step runs only where the one before passed, as the steps of a job do. It exits 1 where any failed. What it
// does not run: the core's own check of the copy (core.yml), which runs the workflow's own shell and nothing of the
// repository's, since it is what proves this copy is the core (by hand, node core/scripts/check.mjs runs it from plain
// git, beside every other check); and personal-terms.yml, which needs a secret. By hand the package checks work in the
// project's own folder, as the job does in its checkout: npm's install replaces node_modules with packages whose
// install scripts never ran, and a restore writes obj/, so a session that needs its own build after them installs
// again, or runs them in a worktree of their own. With no
// part named, it runs each part the project's calls to the core's workflows run, with their inputs, read from its
// .github/workflows (by hand: pass --description <a file> for the description). Node's own modules; the package checks
// also npm, or bash, git, jq and the .NET SDK.
//
//   node core/scripts/checks.mjs [copies] [description] [signatures | nuget] [--base <commit, or origin/<branch>>]
//        [--copies <config>] [--sizes <marks>] [--description <file>] [--parts <headings, |-separated>]
//        [--signatures <folder of package-lock.json>] [--nuget <licence config>] [--advisory]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { MEND } from "./mend.mjs";
import { installStep, installed } from "./packages.mjs";
import { npmIgnores, npmReadsAll, npmRefusal, npmVersion } from "./npm-reads.mjs";
import { started } from "./started.mjs";
import { parseYaml } from "./parse-yaml.mjs";

export const PARTS = ["copies", "description", "signatures", "nuget"];
const OPTIONS = ["--base", "--copies", "--sizes", "--description", "--parts", "--signatures", "--nuget"];
const FLAGS = ["--advisory"];
// The checks of the part "copies", in the order its workflow ran them: each its step's name, its script, its argument
// (an option's name) and the variable that gives it the base.
export const COPIES = [
  ["No new copies", "copies.mjs", "copies", "COPIES_BASE"],
  ["Every pointer in the rule files leads somewhere", "pointers.mjs", null, "POINTERS_BASE"],
  ["The files every session reads keep to their marks", "reading-size.mjs", "sizes", "SIZES_BASE"],
  ["No workflow names the forbidden trigger or gives a key twice", "workflows.mjs", null, "WORKFLOWS_BASE"],
  ["Each agent tool's entry file pulls in every file AGENTS.md names", "entry-files.mjs", null, "ENTRY_BASE"],
  ["The manifest takes or leaves out each module and fills each slot they use (reports, never fails)", "manifest-reads.mjs", null, null],
  ["Nothing new in how the code is put together", "shape.mjs", null, "SHAPE_BASE"],
  ["Each choice record a change adds is argued in full", "choices.mjs", null, "CHOICES_BASE"],
  ["Each file and part the core marks that a change touches is as the core writes it", "converge.mjs", null, "CONVERGE_BASE"],
];

function fail(what, mend) { console.log(`FAIL ${what} ${MEND}${mend}`); process.exit(1); }

function main() {
  // (on Windows, no program is looked for in the folder a check runs in, which the change under check fills: neither by
  // Node when it starts one nor by a shell it starts; every other system looks only on the PATH)
  if (process.platform === "win32") process.env.NoDefaultCurrentDirectoryInExePath = "1";
  let root;
  try { root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { fail("this folder is in no git repository.", "run it from the project's root, in its clone."); }
  process.chdir(root);
  const o = options(process.argv.slice(2));
  if (!o.parts.length) Object.assign(o, fromCalls(root, o));
  const coreAt = copyAt(root);
  const temp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), "core-checks-"));
  const results = [];
  const check = (name, fn) => { console.log(`== ${name}`); const passed = fn(); results.push([name, passed]); return passed; };
  try {
    // (first, each NuGet call's lookup of the packages new to the project, floor topic 15: before any part runs a
    // restore, which runs the pull request's own build files, so that no config's restore runs before another's lookup)
    if (o.parts.includes("nuget")) for (const settings of runsOf(o, "nuget")) lookUp({ ...o, ...settings }, { coreAt, check });
    // (each part once for each call that runs it with settings of its own, as two calls for two lock files' folders)
    for (const part of PARTS.filter(p => o.parts.includes(p))) for (const settings of runsOf(o, part)) RUN[part]({ ...o, ...settings }, { coreAt, temp, check });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  const failed = results.filter(([, passed]) => !passed).map(([name]) => name);
  console.log(failed.length ? `${failed.length} of ${results.length} checks failed, each saying its mend above: ${failed.join("; ")}` : `ok   ${results.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}

// Where the copy of the core stands, from the project's root, ending in "/": as the workflow's step read it from the
// manifest (CORE_AT), where it holds this script; else this script's own folder, both paths made real first, since on
// Windows git names the root by its long name where Node may name a temporary folder by its short one.
function copyAt(root) {
  const here = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const at = process.env.CORE_AT;
  if (at && /\/$/.test(at) && fs.existsSync(path.join(root, at, "scripts/checks.mjs")) && fs.realpathSync.native(path.join(root, at)) === fs.realpathSync.native(here)) return at;
  return `${path.relative(fs.realpathSync.native(root), fs.realpathSync.native(here)).replace(/\\/g, "/")}/`;
}

// The parts and options given, each checked.
export function options(args) {
  const o = { parts: [], advisory: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (PARTS.includes(a)) { if (!o.parts.includes(a)) o.parts.push(a); continue; }
    if (FLAGS.includes(a)) { o.advisory = true; continue; }
    if (!OPTIONS.includes(a)) fail(`${a} is no part or option of this script.`, `name a part (${PARTS.join(", ")}) or an option the usage line at the top of scripts/checks.mjs shows.`);
    if (i + 1 >= args.length) fail(`${a} is given no value.`, "give it one, as the usage line at the top of scripts/checks.mjs shows.");
    o[a === "--parts" ? "headings" : a.slice(2)] = args[++i];
  }
  return checked(o);
}

// Each part named with what it runs with: both package checks, or one with nothing to run it with, fails.
const NEED = { copies: ["copies", "sizes"], signatures: ["signatures"], nuget: ["nuget"] };
function checked(o) {
  for (const part of o.parts) for (const opt of NEED[part] ?? []) if (!o[opt]) fail(`the part ${part} is named without --${opt}.`, `give --${opt}, as the project's call to the core gives its input ${opt}.`);
  if (o.parts.includes("description") && o.description === undefined && process.env.PR_BODY === undefined) fail("the part description is named with no description to read.", "give --description <a file that holds the pull request's description>.");
  return o;
}

// What each call to one of the core's workflows runs here: its parts, each with its settings, read from its inputs.
const FROM = {
  core: w => [w.copies && ["copies", { copies: w.copies, sizes: w.sizes }], w.description === true && ["description", { headings: w.parts }],
    w.signatures && ["signatures", { signatures: w.signatures }], w.nuget && ["nuget", { nuget: w.nuget, advisory: w.advisory }]].filter(Boolean),
  copies: w => [["copies", { copies: w.config, sizes: w.sizes }]],
  "pr-description": w => [["description", { headings: w.parts }]],
  signatures: w => [["signatures", { signatures: w.directory ?? "." }]],
  nuget: w => [["nuget", { nuget: w.config, advisory: w.advisory }]],
};

// The project's calls to those workflows, from its .github/workflows: [which, its inputs] each.
function callsHere(root) {
  const dir = path.join(root, ".github/workflows");
  const call = new RegExp(`^${CORE.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}/\\.github/workflows/(core|copies|pr-description|signatures|nuget)\\.ya?ml@`, "i");
  const read = f => { try { return parseYaml(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };
  return (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)) : []).flatMap(f => Object.values(read(f)?.jobs ?? {}))
    .map(job => [call.exec(String(job?.uses ?? ""))?.[1]?.toLowerCase(), job?.with ?? {}]).filter(([which]) => which);
}

// By hand, with no part named: what the project's own calls to the core's workflows run, each call's part with its own
// inputs, a part run once for each distinct call (runsOf), what the command line gives winning.
export function fromCalls(root, given) {
  // (the calls are read with the YAML package: with it not installed, none could be read, which is no "calls none")
  if (!installed("yaml")) fail("no part is named, and the project's calls to the core's workflows cannot be read: the core's packages are not installed.", `run \`${installStep()}\`, then this again, or name a part (${PARTS.join(", ")})`);
  const runs = [];
  for (const [part, settings] of callsHere(root).flatMap(([which, w]) => FROM[which](w))) {
    const set = Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, k === "advisory" ? v === true : String(v)]));
    if (!runs.some(r => r.part === part && JSON.stringify(r.settings) === JSON.stringify(set))) runs.push({ part, settings: set });
  }
  if (!runs.length) fail("no part is named, and the project calls none of the core's workflows these parts run.", `name a part (${PARTS.join(", ")}) with its options, as the usage line at the top of scripts/checks.mjs shows.`);
  let parts = [...new Set(runs.map(r => r.part))];
  // (the description, by hand, only where one is given)
  if (given.description === undefined && process.env.PR_BODY === undefined) {
    parts = parts.filter(p => p !== "description");
    console.log("note the description check is not run: give --description <a file that holds the pull request's description>");
  }
  return { parts, runs };
}

// The settings a part runs with, once for each call that runs it: the project's calls' (fromCalls), each with what the
// command line gives over it; or, where parts are named on the command line, that line's alone.
function runsOf(o, part) {
  if (!o.runs) return [{}];
  const given = Object.fromEntries(Object.entries(o).filter(([k, v]) => !["parts", "runs", "advisory"].includes(k) && v !== undefined));
  return o.runs.filter(r => r.part === part).map(r => ({ ...r.settings, ...given, advisory: r.settings.advisory === true || o.advisory }));
}

// The base, as a commit: what --base names, fetched where it is origin/<branch> and not here yet (a clone that lacks
// it; the core's workflows give HEAD^1, the merge's first parent, which their checkout holds, since their fetch has no
// token to sign in with: #674); "" where none is given or it is given empty. Where it cannot be had, it fails, or, given
// `exits` false, throws that failure's line.
function baseCommit(base, exits = true) {
  if (!base) return "";
  const at = () => execFileSync("git", ["rev-parse", "--verify", "-q", `${base}^{commit}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try { return at(); } catch { /* (not here yet) */ }
  const branch = /^origin\/([A-Za-z0-9._/-]+)$/.exec(base)?.[1];
  if (branch) {
    try { execFileSync("git", ["fetch", "--no-tags", "--depth=1", "origin", `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { stdio: ["ignore", "inherit", "inherit"] }); return at(); } catch { /* (below) */ }
  }
  const what = `--base ${base} is no commit here, and could not be fetched.`, mend = "give the commit the change merges into, such as origin/main after a fetch.";
  if (exits) fail(what, mend);
  throw new Error(`FAIL ${what} ${MEND}${mend}`);
}

// A program run with the variables given added to this script's own, its output passed on; whether it passed.
function run(cmd, args, { env = {}, cwd = undefined } = {}) {
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "inherit", "inherit"], shell: false });
  if (r.error) console.log(`${cmd} could not be started (${r.error.message}).`);
  return r.status === 0;
}
const node = (coreAt, script, args, opts) => run(process.execPath, [`${coreAt}scripts/${script}`, ...args], opts);
// The registry's packages installed from the lock file, running no package's install script, and their signatures
// checked: each written out whole, on Windows through its shell, where the program is a script. Whether each passed.
const shown = { stdio: ["ignore", "inherit", "inherit"] };
// (Windows' shell, by the path the system names, never a cmd.exe the checked-out folder holds)
const COMSPEC = process.env.ComSpec || "cmd.exe";
const passed = r => { if (r.error) console.log(`The package manager could not be started (${r.error.message}).`); return r.status === 0; };
// (only under an npm that reads each setting that keeps the install to the registry: an older one, npm 10 that Node 22
// brings among them, ignores them without a word and would fetch any git, web or file source the lock file names; #704)
const ALLOWS = ["allow-git", "allow-remote", "allow-file"];
function unread(cwd) {
  const version = npmVersion(cwd), ignored = npmIgnores(version, ALLOWS);
  if (!ignored.length) return false;
  // (the mend's command names the least npm written out, so the licence scan reads it; checks-test.mjs holds it to `least`)
  const least = npmReadsAll(ALLOWS);
  console.log(`FAIL ${npmRefusal(version, ignored, least)} ${MEND}from a folder outside the repository, install the version the refusal names into a folder of its own, also outside the repository, running no install script: ${"`npm install --global --prefix=<its-folder> --ignore-scripts npm@11.15.0`"}; then put that folder's bin (on Windows, the folder itself) first on the PATH and run this check again`);
  return true;
}
const install = cwd => !unread(cwd) && passed(process.platform === "win32"
  ? spawnSync(COMSPEC, ["/d", "/s", "/c", "npm ci --ignore-scripts --no-audit --no-fund --allow-git=none --allow-remote=none --allow-file=none"], { cwd, ...shown })
  : spawnSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-git=none", "--allow-remote=none", "--allow-file=none"], { cwd, ...shown }));
const signed = cwd => passed(process.platform === "win32" ? spawnSync(COMSPEC, ["/d", "/s", "/c", "npm audit signatures"], { cwd, ...shown })
  : spawnSync("npm", ["audit", "signatures"], { cwd, ...shown }));

// Where advisory, a failure said and passed.
const advised = o => passed => { if (passed) return true; if (!o.advisory) return false; console.log("Advisory: nothing fails for it yet."); return true; };
// Each package new to the project looked up in NuGet's registry (lookup.mjs, floor topic 15), for one NuGet call: run
// for every call before any part restores, its verdict recorded, and the checks after it run on its failure too.
function lookUp(o, { coreAt, check }) {
  check("Each package new to the project looked up in NuGet's registry (floor topic 15)", () => advised(o)(node(coreAt, "lookup.mjs", [o.nuget, "--nuget"],
    { env: { LOOKUP_BASE: process.env.BASE_SHA || baseCommit(o.base) } })));
}

const RUN = {
  copies(o, { coreAt, check }) {
    // (a base that cannot be had is a failure of its own, and every check still runs, each saying what it could not read;
    // one that can is given to each as its commit, so a base named from here, such as HEAD^1, names the same commit
    // wherever a check reads it; #674)
    let base = o.base ?? "";
    if (o.base) check("The base the change merges into", () => { try { base = baseCommit(o.base, false); return true; } catch (e) { console.log(e.message); return false; } });
    for (const [name, script, arg, baseVar] of COPIES) check(name, () => node(coreAt, script, arg ? [o[arg]] : [], { env: baseVar ? { [baseVar]: base } : {} }));
  },

  description(o, { coreAt, check }) {
    let body = process.env.PR_BODY;
    if (o.description !== undefined) {
      try { body = fs.readFileSync(o.description, "utf8"); } catch { fail(`--description ${o.description} cannot be read.`, "give the path of a file that holds the pull request's description."); }
    }
    const env = { PR_BODY: body, PR_CREATED: process.env.PR_CREATED || new Date().toISOString(), BASE_SHA: process.env.BASE_SHA || baseCommit(o.base) };
    check("The description has its parts", () => node(coreAt, "pr-description.mjs", [o.headings ?? ""], { env }));
  },

  // npm's own install from the lock file and its own check of the registry's signatures (.github/workflows/signatures.yml
  // says what it holds and why), where the change touches what it reads: never the core's own package list, lock file
  // and .npmrc in its copy's .packages/, which the core's own repository checks (#654), and which a sync alone changes.
  signatures(o, { coreAt, check }) {
    const dir = o.signatures || ".";
    console.log("== Does the pull request change what this check reads?");
    const look = changes(process.env.BASE_SHA || baseCommit(o.base), [":(glob)**/package.json", ":(glob)**/package-lock.json", ":(glob)**/npm-shrinkwrap.json",
      ":(glob)**/.npmrc", `${coreAt}.node-version`, ".github/workflows/signatures.yml", ...caller(), ...["package.json", "package-lock.json", ".npmrc"].flatMap(f => [`:(exclude)${coreAt}.packages/${f}`, `:(exclude)${coreAt}.packages/parser/${f}`])],
    "No package list, lock file, .npmrc, Node version or calling workflow changed: nothing to verify.");
    if (!look) return;
    if (!check("Install from the lock file, from the registry alone, running no package's install script",
      () => install(dir))) return;
    if (!check("The registry's signature on each installed name and version", () => signed(dir))) return;
    check("Each lock entry's licence and version, as the installed package says them", () => run(process.execPath, [path.resolve(`${coreAt}scripts/licence-installed.mjs`), "."], { cwd: dir }));
  },

  // NuGet's restore from each lock file alone, and each package held to its list (.github/workflows/nuget.yml says what
  // it holds and why), where the change touches what NuGet reads (scripts/nuget-look.sh).
  nuget(o, { coreAt, temp, check }) {
    const dotnet = { DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1", EnableWindowsTargeting: "true" };
    const output = path.join(temp, "look");
    fs.writeFileSync(output, "");
    const advisory = o.advisory ? ["--advisory"] : [], verdict = advised(o);
    const looked = check("Does the pull request change what NuGet reads?", () => run("bash", ["-e", `${coreAt}scripts/nuget-look.sh`], { env: {
      BASE: process.env.BASE_SHA || baseCommit(o.base), CONFIG: o.nuget, CALLER: process.env.CALLER ?? "", CORE_AT: coreAt,
      NUGET_PACKAGES: path.join(temp, "nuget-look"), GITHUB_OUTPUT: output, ...dotnet } }));
    if (!looked) return;
    const said = Object.fromEntries(fs.readFileSync(output, "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    if (said.run === "false") return;
    // (before the restore, which runs the pull request's own build files: each package's file held to its lock file's
    // content hash, and its licence read from it, in a step no build has run in; where the look restored, it is left out)
    if (said.built !== "true" && !check("Every locked package and tool, fetched before the restore and held to its list", () => {
      const fetched = path.join(temp, "nuget-fetched");
      const got = node(coreAt, "nuget-fetch.mjs", [o.nuget, "--into", fetched]);
      return verdict(node(coreAt, "nuget.mjs", [o.nuget, "--packages", fetched, "--fetched", ...advisory]) && got);
    })) return;
    const packages = path.join(temp, "nuget-packages");
    if (!check("Restore each project file from its lock file alone", () => {
      // (the project files git knows, and where packages come from, each a line as the script lists them, the registry
      // first: given to every restore, they overrule the sources any NuGet.Config names; without them nothing is restored)
      const list = args => spawnSync(process.execPath, [`${coreAt}scripts/nuget.mjs`, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
      const projects = list(["--projects"]), sources = list([o.nuget, "--sources"]);
      if (projects.status !== 0) return false;
      let passed = sources.status === 0;
      if (passed) {
        const from = sources.stdout.split(/\r?\n/).filter(Boolean).flatMap(s => ["--source", s]);
        for (const project of projects.stdout.split(/\r?\n/).filter(Boolean)) {
          // (the two properties given here overrule a project's own: its packages go to the folder the check reads, and
          // its lock file is the one beside it; each project named from the root, behind "./", so no name reads as an option)
          if (!run("dotnet", ["restore", "--locked-mode", ...from, `-p:RestorePackagesPath=${packages}`, "-p:NuGetLockFilePath=", `./${project}`], { env: { NUGET_PACKAGES: packages, ...dotnet } })) passed = false;
        }
      }
      if (!passed) console.log(`FAIL A restore from a lock file failed (dotnet's errors above): the lock file is not what the project file asks for, a package is not what its lock file names or comes from no source named here (floor rules 7 and 15), or the config names its sources wrongly. ${MEND}where the project file changed, write its lock file anew (dotnet restore --force-evaluate) and commit it, never to take in a package whose content differs from what its lock file names; take out a package no source named in the config serves; or correct the config's sources.`);
      return verdict(passed);
    })) return;
    check("Every package one exact version, and under a licence on its list", () => node(coreAt, "nuget.mjs", [o.nuget, "--packages", packages, ...advisory], { env: { NUGET_PACKAGES: packages } }));
  },
};

// The calling workflow, by its own path, where the run says it (CALLER, GitHub's workflow_ref): a change to it is one the
// package check reads.
function caller() {
  const ref = process.env.CALLER ?? "", repo = process.env.GITHUB_REPOSITORY ?? "";
  const file = repo && ref.startsWith(`${repo}/`) ? ref.slice(repo.length + 1).split("@")[0] : "";
  return file ? [`:(literal)${file}`] : [];
}

// Whether the change touches a path given, by git's own diff from the base: any doubt (no base, a base that is not here
// and cannot be fetched, a git command that fails, a listed file that is a link to another) means it does. Says why.
function changes(base, paths, none) {
  const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  try {
    if (!base) return true;
    try { git(["cat-file", "-e", `${base}^{commit}`]); } catch { git(["fetch", "--quiet", "--no-tags", "--depth=1", "origin", base]); }
    const changed = git(["diff", "--no-renames", "--name-only", base, "HEAD", "--", ...paths]).split("\n").filter(Boolean);
    if (changed.length) { console.log(`Changed:\n${changed.map(f => `- ${f}`).join("\n")}`); return true; } // (behind a dash, so no file's name starts a workflow command)
    if (/^120000 /m.test(git(["ls-files", "-s", "--", ...paths]))) { console.log("A listed file is a link to another, whose changes this step would not see."); return true; }
    console.log(none);
    return false;
  } catch { return true; }
}

// (last, so every part above is defined when it runs)
if (started(import.meta.url)) main();
