// Installs the code of other publishers the core's scripts run (#654): each registry's from its own lock file in the
// core's dot folder .packages/, beside this file's folder, into a folder there that git does not track (a dot folder,
// so that no workspace pattern of a project's own package list takes in the copy's), taking each package at the one
// version and integrity the lock file names from its registry alone (no git, web or file address, whatever an .npmrc
// says) and running no install script (floor rule 15). The
// sync runs it after it writes the copy (sync.mjs), a session at its start, and each job before a check (README, "How
// a project takes the core"). A fetch that fails is run again once; a second failure fails, saying so (#542), save in a
// project's pull request, where each check that needs a package then says it did not run, failing nothing (#654, point 4).
//
// Each install, in REGISTRIES, with its lock file and the command that installs it; npm's first, installed where none
// is named. One a check needs alone (a large engine, say) is named by that check's job: `install.mjs <name>`. The
// parser's (parser.mjs), whose grammars' packages carry far more than a reader runs, is so: in .packages/parser/, named
// by the jobs that read another language on the parser (#719); `all` names every one, as the sync and the starter kit
// install them. PyPI's, the code scan's engine alone (#546), is named by the scan's own step and never by `all`: from
// .packages/requirements.txt into .packages/pypi/.
//
//   node core/scripts/install.mjs [<name> ... | all]      (in the core's own repository: node scripts/install.mjs)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmIgnores, npmReadsAll, npmVersion } from "./npm-reads.mjs";
import { INSTALLS, lockFaults, npmrcOthers } from "./packages.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
// (the folder of the core's own package list, lock file and .npmrc, where npm runs and so reads that .npmrc alone)
const packages = path.join(root, ".packages");
// (the folders of the npm installs below .packages/, each with its own package list, lock file and .npmrc)
const NESTED = Object.values(INSTALLS).filter(f => f.startsWith(".packages/")).map(f => f.slice(".packages/".length));
const windows = process.platform === "win32";
// (the core's own repository, which holds its tests: a copy holds none, .gitattributes keeping them out, and installs no
// package that only the core's tests run)
const own = fs.existsSync(path.join(root, "tests"));

// (each command written out, so the licence check reads what it runs; npm on Windows is a .cmd file, which Node starts
// only through the shell, and each argument is the script's own)
// (each of the core's npm installs, INSTALLS in packages.mjs, in its own folder, where npm reads that folder's .npmrc alone)
const npmCi = cwd => spawnSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--allow-git=none", "--allow-remote=none", "--allow-file=none", "--allow-directory=none", "--workspaces=false", ...(own ? [] : ["--omit=dev"])], { cwd, encoding: "utf8", shell: windows });
// (and, in the core's own repository alone, the install of its own mutation tool, Stryker, in tests/mutation/, which no
// copy carries (.gitattributes) and `all` leaves out: only the job of the strength check names it (#581, #654))
const OWN_ONLY = own ? { mutation: "tests/mutation" } : {};
export const REGISTRIES = {
  ...Object.fromEntries(Object.entries({ ...INSTALLS, ...OWN_ONLY }).map(([name, folder]) =>
    [name, { folder, lock: `${folder}/package-lock.json`, into: `${folder}/node_modules/`, run: () => npmCi(path.join(root, folder)) }])),
  // (the code scan's engine alone, #546: pip takes each wheel at the hash requirements.txt names, binaries only, none
  // of their dependencies and none of their code run, into .packages/pypi/; Python 3.10 or later, as every GitHub
  // runner holds)
  pypi: { folder: ".packages", pip: true, lock: ".packages/requirements.txt", into: ".packages/pypi/", run: () => spawnSync("python3", ["-I", "-m", "pip", "install", "--require-hashes", "--no-deps", "--only-binary=:all:", "--no-compile", "--no-input", "--disable-pip-version-check", "--upgrade", "--target", path.join(packages, "pypi"), "-r", path.join(packages, "requirements.txt")], { cwd: packages, encoding: "utf8" }) },
};

// What keeps an install from running where it could reach past the core's own files: for an npm install, a shrinkwrap
// beside the lock file, which its program reads first; any other file in its folder; an .npmrc with any line but the core's own two settings; and an
// install folder that is a link, or stands in one (.packages/, or its own folder), or holds what git tracks, which the install would empty.
// Each as the failure's words with its mend; null where none stands.
const PACKAGE_FILES = new Set(["package.json", "package-lock.json", ".npmrc", "node_modules", "requirements.txt", "pypi"]);
// A file in an install's folder beside the core's own (in .packages/, the nested installs' folders too): a shrinkwrap,
// which npm reads first, or any other, such as one npm would read as its own settings where a command names the folder.
// The failure's words with its mend; null where none stands.
// (a path is shown from the copy's root: a refusal is read back into pull request text, which holds no path of the machine)
const rel = f => path.relative(root, f).split(path.sep).join("/") || ".";
function strays(dir, at) {
  if (fs.existsSync(at("npm-shrinkwrap.json"))) return `${rel(at("npm-shrinkwrap.json"))} stands beside the lock file, and would be installed from in its place. Mend: take it out; the core's packages are named in its lock files alone`;
  const extra = fs.readdirSync(dir).filter(f => !PACKAGE_FILES.has(f) && !(dir === packages && NESTED.includes(f) && fs.lstatSync(path.join(dir, f)).isDirectory()));
  return extra.length ? `${rel(dir)} holds ${extra.map(f => JSON.stringify(f)).join(", ")} beside the package list, lock file, .npmrc and install. Mend: take ${extra.length === 1 ? "it" : "them"} out; the folder holds those alone` : null;
}
function refusal(name) {
  const { folder: own, lock, into } = REGISTRIES[name];
  const dir = path.join(root, own), at = f => path.join(dir, f);
  const folder = path.join(root, into.replace(/\/$/u, "")); // (no "/" after it, which would read the link's target)
  // (a link first, before anything is read through it: .packages/, the install's own folder, and its node_modules/)
  for (const f of [...new Set([packages, dir]), folder]) if (fs.lstatSync(f, { throwIfNoEntry: false })?.isSymbolicLink()) return `${rel(f)} is a link, which the install would write through, or empty. Mend: remove the link, then run this again`;
  // (and files git tracks in the install's folder, which it would replace, for every install, PyPI's too)
  let tracked = "";
  try { tracked = spawnSync("git", ["ls-files", "--", into], { cwd: root, encoding: "utf8" }).stdout ?? ""; } catch { /* (no git: nothing tracked) */ }
  if (tracked.trim()) return `${rel(folder)} holds files git tracks, which the install would replace. Mend: take them out of git (git rm -r --cached ${into}), then run this again`;
  if (REGISTRIES[name].pip) return null; // (what follows is npm's: pip reads the hashes in its lock file alone)
  // (what the package list and lock file hold, read before npm runs: the npm that comes with the least Node fetches
  // whatever source a spec names, and runs its prepare script, whatever setting says otherwise)
  let faults;
  try { faults = lockFaults(JSON.parse(fs.readFileSync(at("package.json"), "utf8")), JSON.parse(fs.readFileSync(at("package-lock.json"), "utf8")), { overrides: Object.hasOwn(OWN_ONLY, name) }); }
  catch (e) { faults = [`${lock} or ${own}/package.json cannot be read`]; }
  if (faults.length) return `${faults[0]}${faults.length > 1 ? `, and ${faults.length - 1} more` : ""}. Mend: write the package list and lock file as npm's own install from its registry writes them, with no other source`;
  const stray = strays(dir, at);
  if (stray) return stray;
  let npmrc = "";
  try { npmrc = fs.readFileSync(at(".npmrc"), "utf8"); } catch { /* (none: npm's own registry) */ }
  const others = npmrcOthers(npmrc);
  if (others.length) return `${rel(at(".npmrc"))} holds ${others.length === 1 ? "a line" : `${others.length} lines`} beside the core's own two settings, which npm would read: a registry, a host's token, a proxy or a certificate would send the install elsewhere. Mend: take ${others.length === 1 ? "that line" : "those lines"} out; the core's .npmrc holds ignore-scripts=true and min-release-age alone`;
  return null;
}

// Whether the install's failure is a registry that did not answer: a network error, or a server's own error, never another
// (a lock file npm cannot read, an integrity that does not match), which a pull request could bring about. Read from
// the program's own line alone, never from a message that echoes what the lock file holds (a version, an integrity),
// which could name such an error (#714): npm's line "npm error code <code>" ("npm ERR!" before npm 10), and pip's
// retry, in Python's words, of a connection it could not make or a read that timed out, where pip refused no wheel for
// its hash, since a retry that later got through ends in another failure.
const NPM_UNANSWERED = /^npm (?:ERR!|error) code (?:ETIMEDOUT|ESOCKETTIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|E5\d\d)$/mu;
const PIP_UNANSWERED = /^WARNING: Retrying \(Retry\([^)]*\)\) after connection broken by '(?:NewConnectionError|ConnectTimeoutError|ReadTimeoutError|ProtocolError)\(/mu;
const PIP_REFUSED = /^ERROR: THESE PACKAGES DO NOT MATCH THE HASHES/mu;
const unanswered = text => NPM_UNANSWERED.test(String(text ?? "")) || (PIP_UNANSWERED.test(String(text ?? "")) && !PIP_REFUSED.test(String(text ?? "")));

// Whether an npm lock file names no package, neither as an entry nor in its root's lists, which refusal() holds to the
// package list's, so that it has nothing to install and npm is not started for it: the parser's, until its packages move
// in, which every job that names `all` would otherwise pay a run of npm for; a lock whose root names a package it holds
// no entry for goes to npm, which refuses it (#719). PyPI's lock file names its packages in pip's own form.
function namesNothing(name) {
  const { lock, folder, pip } = REGISTRIES[name];
  if (pip) return false;
  const { packages: entries = {} } = JSON.parse(fs.readFileSync(path.join(root, lock), "utf8"));
  const list = JSON.parse(fs.readFileSync(path.join(root, folder, "package.json"), "utf8"));
  return Object.keys(entries).every(k => !k) && !Object.keys({ ...list.dependencies, ...list.devDependencies, ...entries[""]?.dependencies, ...entries[""]?.devDependencies }).length;
}

const named = [...new Set(process.argv.slice(2).flatMap(n => (n === "all" ? Object.keys(INSTALLS) : [n])))];
const unknown = named.filter(n => !Object.hasOwn(REGISTRIES, n));
const notAll = Object.keys(REGISTRIES).filter(n => !Object.hasOwn(INSTALLS, n)); // (what `all` leaves out: mutation, pypi)
if (unknown.length) {
  console.error(`FAIL: install.mjs knows no install ${unknown.join(", ")}. Mend: name one of ${Object.keys(REGISTRIES).join(", ")}, all for every one${notAll.length ? ` but ${notAll.join(" and ")}` : ""}, or none for the first`);
  process.exit(1);
}
const first = Object.keys(REGISTRIES)[0]; // (npm's, where none is named)
// (where an npm install runs under an npm that ignores a setting that keeps an install to the registry and to a release
// a week old, a note, never a failure ("Nothing locks a project"): the core's own installs are held to their lock files
// by refusal() above before npm runs, but a project's own install there is held by its lock file alone; #704)
if ((named.length ? named : [first]).some(n => !REGISTRIES[n].pip && fs.existsSync(path.join(root, REGISTRIES[n].lock)))) {
  const version = npmVersion(root), ignored = npmIgnores(version);
  if (ignored.length) console.log(`note npm ${version || "here, whose version could not be read,"} ignores ${ignored.map(s => (s.startsWith("allow-") ? `--${s}` : `an .npmrc's ${s}`)).join(", ")}, which npm reads from ${npmReadsAll()} on: the core's packages are held to its lock files before npm runs, but a project's own install here takes any source its lock file names, and a new package at any release however new. The core's Node, the version in its .node-version, brings an npm that reads them all`);
}
for (const name of named.length ? named : [first]) {
  const { lock, into, run } = REGISTRIES[name];
  if (!fs.existsSync(path.join(root, lock))) continue; // (a copy whose core holds no lock file of this registry)
  const refused = refusal(name);
  if (refused) { console.error(`FAIL: the core's packages were not installed: ${refused}`); process.exit(1); }
  if (namesNothing(name)) { console.log(`ok   ${lock} names no package: nothing to install`); continue; }
  const began = Date.now();
  let r = run();
  if (r.status !== 0) {
    console.error(`note the install from ${lock} failed once, and runs again: ${(r.stderr || r.error?.message || "").trim().split("\n").slice(-1)[0]}`);
    r = run();
  }
  if (r.status !== 0) {
    const why = (r.stderr || r.error?.message || "").trim().split("\n").slice(-3).join(" ");
    // (in a project's pull request, a registry that did not answer fails nothing by that alone (#654, point 4): each
    // check that needs a package says it did not run, and the job is run again before the merge)
    if (!own && unanswered(r.stderr) && /^pull_request/u.test(process.env.GITHUB_EVENT_NAME ?? "") && process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, "CORE_PACKAGES_UNREACHED=1\n");
      console.error(`note the second install from ${lock} failed too: ${why}`); // (the log alone: the warning below reaches the pull request)
      const said = `The core's packages could not be installed from ${lock}, twice, so each check that needs one did not run (the installer's own words stay in this job's log, never in this note, which reaches the pull request). Mend: run this job again before the pull request merges and read the log; if it fails again, file it as a fault`;
      console.log(`::warning::${said}`);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- Did not run: ${said.replace(/[<>&`*_[\]|]/gu, "?")}\n`);
      continue;
    }
    console.error(`note the second install from ${lock} failed too: ${why}`); // (the log alone: the FAIL line below is read back into pull request text, by packages.mjs)
    console.error(`FAIL: the core's packages could not be installed from ${lock}, twice (the installer's own words are in this job's log). Mend: run this again once the registry answers, and read the log; if it fails again, file it as a fault (it takes the program that comes with its platform, and a network that reaches its registry)`);
    process.exit(1);
  }
  console.log(`ok   the core's packages installed from ${lock} into ${into} in ${((Date.now() - began) / 1000).toFixed(1)} s`);
}
