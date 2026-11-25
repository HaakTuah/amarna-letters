// What the core's own tests stand on. For any test: the core's root, a tally of its assertions and a scratch folder
// removed when it ends, or by the next test's start where it was stopped; and, for one that runs a workflow calling gh
// (clean-merges-test.mjs, pure-sync-test.mjs), a stand-in for GitHub's API. For the starter kit's (init-test.mjs,
// init-dotnet-test.mjs): a scratch copy of the core as it stands here, committed in a repository of its own, and
// scratch projects beside it, all in one temporary folder that is removed when the test ends. Every git call in it runs
// without the user's and the system's git settings, and without git's own variables that point at another repository,
// so a test sees only what it sets itself. For the tests of a sync or of a core workflow (pure-sync-test.mjs,
// core-yml-test.mjs, upgrade-test.mjs): the environment they run git and a workflow's steps in, reaching their scratch
// core through the core's own address (a git rewrite), with the runner's git, GitHub, Claude Code, npm and NuGet
// variables and credentials left out (one filter for the three) and no transport but local files, so no call reaches
// the network or the real core, and with git finding no bare repository by itself (safe.bareRepository=explicit, Git
// 3.0's default), so a script that makes one must name it (releases.mjs), save where a test runs older releases'
// scripts; and the stand-in for actions/checkout the first two hand workflow-run.mjs. Tests only: no project and no
// workflow of the core's uses it. Git and Node's own modules only.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";

/** The core's root, where these scripts stand. */
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** A test's tally: `ok(cond, what, detail)` prints "ok" or "FAIL" and what is asserted, with up to 800 characters of
 *  the detail under a failure; `done(what)` prints how many failed, or the count of assertions on `what`, and sets the
 *  exit code. */
export function tally() {
  let failed = 0, count = 0;
  return {
    ok: (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 800).replace(/\n/g, "\n     ")}`}`); } },
    done: what => { console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on ${what}`); process.exitCode = failed ? 1 : 0; },
  };
}

/** The file in a scratch folder that names the machine and the process it belongs to, as `host:pid`. */
export const OWNER = ".scratch-owner";
const owner = () => `${os.hostname()}:${process.pid}`;

// (only "no such process" is gone: one that may not be signalled, EPERM, or a pid of no valid form, counts as alive)
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== "ESRCH"; } };

let swept = false;
const made = new Set();

/** The scratch folders in the temporary folder whose process is gone (a test the mutation tool or a time-out stopped
 *  with SIGKILL, which no handler sees) taken away; one whose process still runs, or that another machine's process
 *  made (a temporary folder shared across containers), is left, and so is anything that is no real folder of this
 *  user's with a plain owner file of this user's. Done once for a process, as its first scratch folder is made. */
function sweep() {
  if (swept) return;
  swept = true;
  const base = os.tmpdir(), me = process.getuid?.(), host = os.hostname();
  let names = [];
  try { names = fs.readdirSync(base); } catch { /* (nothing to read) */ }
  for (const name of names) {
    const dir = path.join(base, name);
    try {
      const st = fs.lstatSync(dir);
      if (!st.isDirectory() || (me !== undefined && st.uid !== me)) continue;
      const mark = fs.lstatSync(path.join(dir, OWNER));
      if (!mark.isFile() || mark.size > 300 || (me !== undefined && mark.uid !== me)) continue;
      const [, from, pid] = /^(.*):(\d+)$/.exec(fs.readFileSync(path.join(dir, OWNER), "utf8")) ?? [];
      if (from !== host || !(Number(pid) > 0) || alive(Number(pid))) continue;
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch { /* (not one of ours, already gone, or held a moment longer: left to the next start) */ }
  }
}

/** A temporary folder named from `prefix`, removed when the test ends; one a stopped test left (its process gone) is
 *  removed as the next test makes its own. */
export function scratchDir(prefix) {
  sweep();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.writeFileSync(path.join(tmp, OWNER), owner());
  made.add(tmp);
  // (one listener for all of a process's folders: a test that makes one for each of its cases would pass Node's limit of ten)
  if (made.size === 1) process.on("exit", () => {
    // (a program a test started may hold a file a moment longer, on Windows: tried again, and never the test's failure)
    for (const dir of made) { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } }
  });
  return tmp;
}

// The host's answers for the scratch projects, whether each is private (scripts/host-private.mjs, #1095): one file a
// test process, named by CORE_HOST_ANSWERS in its environment and so in every run's. `dir` given, its answer is set.
let answers = null;
export function hostSays(dir, isPrivate) {
  if (!answers) { answers = path.join(scratchDir("host-answers-"), "answers.json"); fs.writeFileSync(answers, "{}"); process.env.CORE_HOST_ANSWERS = answers; }
  if (dir) fs.writeFileSync(answers, JSON.stringify({ ...JSON.parse(fs.readFileSync(answers, "utf8")), [dir]: { private: !!isPrivate } }));
  return answers;
}

// (the address git writes into each scratch commit: an invented account's no-reply one, its id 0, which GitHub gives
// no account; the personal-terms check passes it in a pull request's commits, as a project's own runs see them: #460,
// point 2)
const ADDRESS = `0+t@${["users", "noreply", "github", "com"].join(".")}`;

// `prefix` names the temporary folder. It gives: `tmp`, that folder; `env`, the environment of every call; `git(dir,
// ...args)` and `run(dir, ...args)`, git and Node run in a folder (run: the script and its arguments, giving its exit
// status and what it printed); `core`, the scratch copy of the core, `pin`, its one commit, and `script`, its
// init.mjs; `fresh(name)`, a new empty repository under tmp; and `project(name, ...args)`, a new one in which the
// starter kit was run with those arguments. The host says each is public, a project's run with --private private
// (`hostSays`).
export function scratch(prefix) {
  hostSays();
  const tmp = scratchDir(prefix);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)$/i.test(name)));
  Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: ADDRESS, GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: ADDRESS, GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" });
  const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const run = (dir, ...args) => { const r = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
  const core = path.join(tmp, "the-core");
  fs.cpSync(root, core, { recursive: true, filter: src => path.basename(src) !== ".git" && path.basename(src) !== "node_modules" });
  git(core, "init", "-q", "-b", "main");
  git(core, "add", "-A");
  git(core, "commit", "-q", "-m", "the core as it stands");
  const pin = git(core, "rev-parse", "HEAD");
  const script = path.join(core, "scripts", "init.mjs");
  const fresh = name => { const dir = path.join(tmp, name); fs.mkdirSync(dir); git(dir, "init", "-q", "-b", "main"); hostSays(dir, false); return dir; };
  const project = (name, ...args) => { const dir = fresh(name); hostSays(dir, args.includes("--private")); return { dir, ...run(dir, script, ...args) }; };
  return { tmp, env, git, run, core, pin, script, fresh, project };
}

/** A copy, under `tmp`, of npm's cache on this machine, where it holds one, else null: what the job's own installs left
 *  there, which a test that installs the core's packages into a scratch project reads before it asks npm's registry, so
 *  it passes with the network cut off and reads what a copy made on the machine holds (#772). A copy, never the cache
 *  itself, so no test writes into it, and only where the run's network is cut off (CORE_OFFLINE, which scripts/offline.sh sets):
 *  elsewhere none, and the installs ask the registry. `env` is what npm is run with to find the cache; by default this process's. */
export function npmCacheCopy(tmp, env = process.env) {
  if (!process.env.CORE_OFFLINE) return null; // (the copy is made only where the network is cut off, scripts/offline.sh: elsewhere a cache may be gigabytes, and the registry answers)
  const r = spawnSync("npm", ["config", "get", "cache"], { env, encoding: "utf8", shell: process.platform === "win32" });
  const dir = r.status === 0 ? r.stdout.trim() : "";
  if (!dir || !fs.existsSync(dir)) return null;
  const copy = path.join(tmp, "npm-cache");
  fs.cpSync(dir, copy, { recursive: true });
  return copy;
}

/** The npm for npm-once.mjs's `real`, with the cache's copy handed in: a program of its own, in `tmp`, that runs this
 *  machine's npm with the same arguments, its cache the copy `npmCacheCopy` makes and the registry asked only for what
 *  that holds not (npm's prefer-offline), with no retry of a fetch the cut refuses, which a test that expects npm to fail would wait out. A test whose installs read the machine's copy reaches the registry for
 *  nothing it already has; where the machine holds no cache, or the run's network is not cut off (npmCacheCopy), undefined, and npm-once.mjs runs the first npm on the PATH
 *  as it did. The settings are the wrapper's, set where npm starts, so npm-once.mjs, which the licence scan passes
 *  over, passes on the environment it was given as before (#772). */
export function npmWithCache(tmp, env = process.env) {
  const windows = process.platform === "win32", program = `npm${windows ? ".cmd" : ""}`;
  const real = machineNpm(env);
  const cache = real && npmCacheCopy(tmp, env);
  if (!cache) return undefined;
  const dir = path.join(tmp, "npm-cached"), wrapper = path.join(dir, program);
  fs.mkdirSync(dir);
  if (windows) fs.writeFileSync(wrapper, `@set "npm_config_cache=${cache}"\r\n@set "npm_config_prefer_offline=true"\r\n@set "npm_config_fetch_retries=0"\r\n@call "${real}" %*\r\n`);
  else fs.writeFileSync(wrapper, `#!/bin/sh\nnpm_config_cache=${shWord(cache)} npm_config_prefer_offline=true npm_config_fetch_retries=0 exec ${shWord(real)} "$@"\n`, { mode: 0o755 });
  return wrapper;
}

/** This machine's npm: the first on the PATH of `env`, by an absolute entry alone, so no folder a test starts in is
 *  searched; undefined where none is there. */
export function machineNpm(env = process.env) {
  const program = `npm${process.platform === "win32" ? ".cmd" : ""}`, key = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
  return (env[key] ?? "").split(path.delimiter).filter(d => path.isAbsolute(d)).map(d => path.join(d, program)).find(f => fs.existsSync(f));
}

/** `text` as one word of a POSIX shell script, in single quotes, so nothing in it expands. */
export const shWord = text => `'${text.replace(/'/g, "'\\''")}'`;

/** The lines of a stand-in for curl (a shell script on a scratch PATH) that serve Betterleaks' release from a folder: where
 *  the fetched address is one of that project's releases on github.com and CORE_ARCHIVES names a folder holding a file
 *  of the name the address ends in, the file is copied to the one `-o` names and curl answers as it did. The run's own set-up fetches the archives while the network is up (the tests
 *  workflow's step "Betterleaks' release"), so a test of a step that downloads a tool at its pin runs that step whole, the
 *  archive held to its SHA-256 by the step itself, with the network cut off (#772). Else the lines do nothing. */
export const ARCHIVE_SERVER = `out=; prev=; url=
for a in "$@"; do [ "$prev" = -o ] && out=$a; prev=$a; url=$a; done
case "$url" in https://github.com/betterleaks/betterleaks/releases/download/v*/*) [ -n "$CORE_ARCHIVES" ] && [ -n "$out" ] && [ -f "$CORE_ARCHIVES/\${url##*/}" ] && cp "$CORE_ARCHIVES/\${url##*/}" "$out" && exit 0 ;; esac
`;

/** Where the run's network is cut off (CORE_OFFLINE, set by scripts/offline.sh) on x64 Linux, where the tests workflow's
 *  set-up step fetches Betterleaks' archive, and the folder CORE_ARCHIVES names holds none: the mend for a test of the
 *  personal-terms check to fail with, naming the step; else null. A test that serves the archive from the folder asks it, so
 *  a download that failed does not show as the check's own failure to fetch it (#772). */
export function archivesMissing() {
  if (!process.env.CORE_OFFLINE || process.platform !== "linux" || process.arch !== "x64") return null;
  const dir = process.env.CORE_ARCHIVES;
  if (dir && fs.existsSync(dir) && fs.readdirSync(dir).length > 0) return null;
  return "Betterleaks' archive was not fetched for this run. Mend: run `bash scripts/test-downloads.sh archives` where the network is up and name the folder it prints in CORE_ARCHIVES (the tests workflow's step \"Betterleaks' release, its archive fetched at the check's pin for the tests of the personal-terms check\" does)";
}

const slash = (p) => p.replace(/\\/g, "/");

/** The environment for a test whose scratch core is the repository at `theCore`, under the folder `tmp`. `findsBare`
 *  lets git find a bare repository by itself, for a test that runs the scripts of releases cut before they named theirs
 *  (upgrade-test.mjs). */
export function scratchEnv(theCore, tmp, { findsBare = false } = {}) {
  hostSays();
  const url = `https://github.com/${CORE}`;
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$|CLAUDE_|GH_|NPM_|NUGET_|DOTNET_CLI_HOME$)|^npm_|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(name)));
  Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: ADDRESS, GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: ADDRESS,
    GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_ALLOW_PROTOCOL: "file",
    GIT_CONFIG_COUNT: "2", GIT_CONFIG_KEY_0: `url.${slash(theCore)}.insteadOf`, GIT_CONFIG_VALUE_0: url, GIT_CONFIG_KEY_1: `url.${slash(theCore)}.insteadOf`, GIT_CONFIG_VALUE_1: `${url}.git` });
  if (!findsBare) Object.assign(env, { GIT_CONFIG_COUNT: "3", GIT_CONFIG_KEY_2: "safe.bareRepository", GIT_CONFIG_VALUE_2: "explicit" });
  return env;
}

/** The stand-in for actions/checkout: the job's own checkout is the workspace the test made; any other repository is
 *  cloned from its address on GitHub (which the rewrite alone can reach) at the ref the step names, into its path. */
export function checkoutStandIn(env, tmp) {
  return (w, ws) => {
    if (String(w["persist-credentials"]) !== "false") throw new Error("a checkout that keeps the token (persist-credentials not false)");
    if (!w.repository) return;
    if (String(w["fetch-depth"]) !== "0") throw new Error(`the checkout of ${w.repository} without its whole history (fetch-depth not 0)`);
    const to = path.join(ws, w.path);
    const git = (cwd, ...args) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    git(tmp, "clone", "-q", "--no-checkout", `https://github.com/${w.repository}`, to);
    git(to, "checkout", "-q", "--detach", w.ref);
  };
}

/** The stand-in for GitHub's API, for a test that runs a workflow calling gh
 *  (clean-merges-test.mjs, pure-sync-test.mjs): a `gh` first on the PATH that answers a GET from the JSON file
 *  `ghData` (a route's pattern to its answer; none found: gh's own "Not Found"), and logs each call with -X, its route
 *  and what it was sent, to `ghLog`; and the project's address, https://github.com/someone/project, rewritten to the
 *  repository `origin`. It gives `env`, the environment to run the workflow in, with the paths of the two files. */
export function ghStandIn(env, tmp, origin) {
  const stubs = path.join(tmp, "bin"), ghData = path.join(tmp, "gh-data.json"), ghLog = path.join(tmp, "gh-log");
  fs.mkdirSync(stubs);
  fs.writeFileSync(path.join(stubs, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const a = process.argv.slice(2), data = JSON.parse(fs.readFileSync(process.env.GH_DATA, "utf8"));
const route = a.find((x, i) => i > 0 && !x.startsWith("-") && !["-X", "--input", "--jq"].includes(a[i - 1]));
if (a.includes("-X")) { fs.appendFileSync(process.env.GH_LOG, route + " " + fs.readFileSync(0, "utf8") + "\\n"); process.exit(0); }
const found = Object.entries(data).find(([pattern]) => new RegExp(pattern).test(route));
if (!found) { console.error("gh: Not Found (HTTP 404)"); process.exit(1); }
console.log(JSON.stringify(a.includes("--slurp") ? [found[1]] : found[1]));
`, { mode: 0o755 });
  const PATHKEY = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
  const n = Number(env.GIT_CONFIG_COUNT);
  return { ghData, ghLog, env: { ...env, [PATHKEY]: `${stubs}${path.delimiter}${env[PATHKEY]}`, GH_DATA: ghData, GH_LOG: ghLog,
    GIT_CONFIG_COUNT: String(n + 1), [`GIT_CONFIG_KEY_${n}`]: `url.${slash(origin)}.insteadOf`, [`GIT_CONFIG_VALUE_${n}`]: "https://github.com/someone/project.git" } };
}
