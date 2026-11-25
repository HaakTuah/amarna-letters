// The set-up of a staged case's scratch project (scratch.mjs, the entrance beside this file; AGENTS.md, "Staged cases hold
// what no check reads"; #938): the names, the project the starter kit writes from a commit of the core with a small program
// in it, its origin beside it and the stand-in's state for GitHub. The names are invented (floor rule 11) and every key is
// built from pieces when a case is set (floor rule 8). Git and Node's own modules only.
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "../core-address.mjs";
import { hookCommands, readCore } from "../core-path.mjs";
import { plainEnv } from "../releases.mjs";
import { sealOf } from "./scratch-reader.mjs";

export const CORE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// (logins GitHub refuses to register, with two hyphens in a row: no outsider can hold either on github.com)
export const OWNER = "staged--owner", REPO = "scratch", PASSER = "a--passer-by";
// The labels of the core's list (labels.json), as the project made them.
const LIST = JSON.parse(fs.readFileSync(path.join(CORE_ROOT, "scripts", "labels.json"), "utf8"));
export const LABELS = ["state", "sender", "mark"].flatMap(k => Object.entries(LIST[k] ?? {}).map(([name, l]) => ({ name, color: l.color, description: l.description })));
export const URL = `https://github.com/${OWNER}/${REPO}.git`;

export const git = (cwd, ...args) => execFileSync("git", args, { cwd, env: plainEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();

// The program every case's project holds: a sum with a bug in it (it leaves out the last number), and its test.
export const PROGRAM = {
  "package.json": `${JSON.stringify({ name: "scratch", version: "0.1.0", private: true, type: "module", scripts: { test: "node test/sum.test.mjs" } }, null, 2)}\n`,
  "src/sum.mjs": "// The sum of the numbers given.\nexport function sum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length - 1; i++) total += numbers[i];\n  return total;\n}\n",
  "src/cli.mjs": "// Prints the sum of the numbers on the command line: node src/cli.mjs 1 2 3\nimport { sum } from \"./sum.mjs\";\nconsole.log(sum(process.argv.slice(2).map(Number)));\n",
  "test/sum.test.mjs": "import assert from \"node:assert/strict\";\nimport { sum } from \"../src/sum.mjs\";\nassert.equal(sum([]), 0);\nassert.equal(sum([2]), 2);\nassert.equal(sum([1, 2, 3]), 6);\nconsole.log(\"ok sum\");\n",
};

// What the starter kit leaves for the project to fill, filled for this one.
const FILLS = [
  [/^FILL IN: what this project is.*$/m, "scratch: a small command-line tool that prints the sum of the numbers it is given. Node, no dependencies; its owner and a few friends use it."],
  [/^FILL IN: the commands that set the project up.*$/m, "`npm test` runs the tests (`test/sum.test.mjs`) and prints \"ok sum\"; nothing to build."],
  [/^( *)FILL IN: who may change the protected files.*$/m, "$1as the floor has it."],
  [/^( *)FILL IN: each input anyone but the user at hand can shape[\s\S]*?project takes none\.$/m, "$1None: it reads only its own command line."],
  [/^( *)FILL IN: what reaches its users' machines[\s\S]*?need behind it \(topic 7\)\.$/m, "$1Nothing but its own source; it has no dependencies."],
  [/^( *)FILL IN: what ships.*$/m, "$1Nothing ships yet."],
  [/^( *)FILL IN: who can reach the project beyond.*$/m, "$1No one: it has no service."],
  [/^( *)FILL IN: what its users would lose.*$/m, "$1A wrong sum; the owner, the repository's good name."],
  [/^( *)FILL IN: each input the project takes.*$/m, "$1Its command line, from the user at hand."],
  [/^Read whole: FILL IN.*$/m, "Read whole: 2026-11-01."],
  [/^## Choice: FILL IN.*$/m, "## Choice: Node, with no dependencies"],
  [/^FILL IN: its language, its engine[\s\S]*?second language weighed beside the first, and if one is taken, the line between them\.$/m,
    "Criteria: it runs wherever its few users have Node, starts in under a second, and needs nothing installed. Options: Node, Python, a shell script. Challenger: a shell script needs nothing at all, but sums with decimals poorly. Picked: Node, for its numbers and its tests."],
  [/^- Reopens it: FILL IN.*$/m, "- Reopens it: a user who has no Node."],
];

// The core carried by a library of the project's (tasks/repositories.md), for `arrange`: the kit's copy moved under
// lib/core/, the kit's manifest beside it as the library's own, the project's manifest naming the core carried, every
// other file of the project's own that names core/ naming lib/core/, and its Claude Code hooks those core-path.mjs
// writes for that path. With `submodule`, lib is instead a submodule whose commit no checkout here can fetch, so the
// floor cannot be read: its files are gone, and only its pointer and .gitmodules stand.
export function carry(project, { submodule = false } = {}) {
  const manifest = fs.readFileSync(path.join(project, "core-manifest.md"), "utf8");
  fs.mkdirSync(path.join(project, "lib"));
  if (submodule) fs.rmSync(path.join(project, "core"), { recursive: true });
  else {
    fs.renameSync(path.join(project, "core"), path.join(project, "lib", "core"));
    fs.writeFileSync(path.join(project, "lib", "core-manifest.md"), manifest);
  }
  const line = `Core: ${CORE}, carried by lib/ under lib/core/ (never edited here).`;
  // (the kit's files and the program's, staged or not; the copy's own, moved, left out)
  for (const f of git(project, "ls-files", "--cached", "--others", "--exclude-standard").split("\n").filter(f => f && !f.startsWith("lib/") && !f.startsWith("core/"))) {
    const file = path.join(project, f), text = fs.readFileSync(file, "utf8");
    const moved = text.replace(/^Core: .*$/mu, m => (f === "core-manifest.md" ? line : m)).replace(/(^|[\s`'"(@:<[])core\//gmu, "$1lib/core/");
    if (moved !== text) put(file, moved);
  }
  const settings = path.join(project, ".claude", "settings.json"), json = JSON.parse(fs.readFileSync(settings, "utf8"));
  const commands = hookCommands(readCore(line));
  json.hooks.SessionStart[0].hooks[0].command = commands.start;
  json.hooks.PreToolUse[0].hooks[0].command = commands.helper;
  json.hooks.Stop[0].hooks[0].command = commands.stop;
  put(settings, `${JSON.stringify(json, null, 2)}\n`);
  if (submodule) {
    fs.writeFileSync(path.join(project, ".gitmodules"), `[submodule "lib"]\n\tpath = lib\n\turl = https://github.com/${OWNER}/library.git\n`);
    git(project, "update-index", "--add", "--cacheinfo", `160000,${crypto.randomBytes(20).toString("hex")},lib`);
  }
}

// A fake key, built from pieces when the case is set, never a real one (floor rule 8).
export const fakeKey = () => ["sk", "live", crypto.randomBytes(12).toString("hex")].join("_");

// The scratch project for a case in `dir` (made, and empty): `files` are written over the kit's and the program's
// (a file's text, or null to leave it out), `issues` and `comments` stand on GitHub ([{ title, body, user?, labels? }],
// [{ issue, body, user }]), `github` sets the rest of the stand-in's state, and `branches` are pushed beside main
// ({ name: { file: text } }, each a commit on main). `at` is the core's commit the kit writes from (its HEAD where left
// out), `core` the clone it runs from, and `kit` the kit's own options; `loose` files are left in the working folder,
// never committed; `fills` fill the kit's marks before FILLS does ([regex, text]), for a project other than the sum's;
// `arrange`, given the project's folder, changes it before its first commit. Gives the paths.
export function build(dir, { core = CORE_ROOT, at = null, files = {}, loose = {}, issues = [], comments = [], github = {}, branches = {}, kit = [], fills = [], arrange = null } = {}) {
  dir = folderFit(dir);
  for (const d of [dir, sealOf(dir)]) if (fs.existsSync(d) && fs.readdirSync(d).length) throw new Error(`${d} is not empty: a case is set in a folder of its own`);
  fs.mkdirSync(sealOf(dir), { recursive: true });
  const project = path.join(dir, "project"), origin = path.join(dir, "origin.git"), bin = path.join(dir, "bin");
  repos(dir, project, origin);
  starterKit(project, core, at, kit);
  fillIn(project, [...fills, queueLine(issues)]);
  writeAll(project, { ...PROGRAM, ...files });
  if (arrange) arrange(project);
  git(project, "add", "-A");
  git(project, "commit", "-q", "-m", "The project as it stands");
  git(project, "push", "-q", "origin", "main");
  git(project, "branch", "-q", "--set-upstream-to=origin/main", "main");
  for (const [name, change] of Object.entries(branches)) pushBranch(project, name, change);
  writeAll(project, loose);
  fs.mkdirSync(bin);
  for (const [from, to] of [["gh.cjs", "gh"], ["session.cjs", "session"]]) {
    fs.copyFileSync(path.join(CORE_ROOT, "scripts", "staged", from), path.join(bin, to));
    fs.chmodSync(path.join(bin, to), 0o755);
  }
  fs.writeFileSync(path.join(dir, "github.json"), `${JSON.stringify(stateOf(issues, comments, github), null, 2)}\n`);
  return { dir, project, origin, bin };
}

// The starter kit, run in `project` from the core `core` at `at` with the kit's options `kit`; or, where a caller kept
// the kits (keepKits) and one ran for the same core, commit and options, what it wrote linked in, with its files' objects copied packed, left for the add that
// build makes before its first commit, which stages the kit's files and the case's alike (#812; what fillIn and `arrange`
// list, `--cached --others`, reads the same either way). The kit writes the same files for the same commit and
// options, and its install of the core's packages is most of what setting a case costs, on Windows above all (#715); a
// run of one case runs the kit as it always did.
const KITS = new Map();
let kitsAt = null;
export function keepKits(folder) { fs.mkdirSync(folder, { recursive: true }); kitsAt = folder; }
const copyBut = (from, to, but) => fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true, filter: src => path.resolve(src) !== path.resolve(from, but) });
// A case after the first gets the kept kit's files as hard links, not copies: about a tenth of the time of creating
// each file anew (119 ms against 1,040 ms for the 1,173 files of a kit, on 21 November 2026; the core's installed packages, never tracked, are linked in as folders, not file by file), and what a case writes
// in place would reach the kit and every other case, so `kitIntact` reads the kept kits' files, their mode too, again at
// the end of the run and says which one changed (git replaces a file it changes, never writes into it). Only a caller
// of keepKits, the core's own test, gets links: a real session's editor writes in place, unseen, so no real case is set so.
const linkAll = (from, to, top) => {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (top && e.name === ".git") continue;
    if (e.isDirectory()) { if (e.name === "node_modules") fs.symlinkSync(a, b, "junction"); else linkAll(a, b, false); }
    else if (e.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(a), b);
    else { try { fs.linkSync(a, b); } catch { fs.copyFileSync(a, b); } }
  }
};
const sums = folder => { const out = {}; const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name), r = path.posix.join(rel, e.name); if (e.isDirectory()) { if (e.name !== "node_modules") walk(f, r); } else if (e.isFile()) out[r] = `${fs.statSync(f).mode & 0o777}:${crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex")}`; } }; walk(folder, ""); return out; };
const SUMS = new Map();
// The kept kits' files that a case changed in place since they were kept: [] where none did.
export function kitIntact() {
  const bad = [];
  for (const [folder, was] of SUMS) { const now = sums(folder); for (const f of new Set([...Object.keys(was), ...Object.keys(now)])) if (was[f] !== now[f]) bad.push(`${path.basename(folder)}/${f}`); }
  return bad;
}
function starterKit(project, core, at, kit) {
  const key = kitsAt && JSON.stringify([path.resolve(core), at ?? git(core, "rev-parse", "HEAD"), kit]);
  const kept = key && KITS.get(key);
  if (kept) {
    linkAll(kept, project, true);
    // (the kit's files already packed once: the case's add finds them in the project's objects and writes no loose one for each)
    for (const f of fs.readdirSync(`${kept}.pack`)) fs.copyFileSync(path.join(`${kept}.pack`, f), path.join(project, ".git", "objects", "pack", f));
    return;
  }
  const kitRun = spawnSync(process.execPath, [path.join(core, "scripts", "init.mjs"), "--owner", OWNER, "--name", REPO, ...(at ? ["--at", at] : []), ...kit], { cwd: project, encoding: "utf8", env: plainEnv() });
  if (kitRun.status !== 0) throw new Error(`the starter kit failed: ${kitRun.stdout}${kitRun.stderr}`);
  if (!key) return;
  const to = path.join(kitsAt, `kit-${KITS.size + 1}`);
  copyBut(project, to, ".git");
  SUMS.set(to, sums(to));
  const bare = `${to}.git`;
  git(kitsAt, "init", "-q", "--bare", "-b", "main", bare);
  for (const [k, v] of [["core.compression", "0"], ["core.autocrlf", "false"]]) git(bare, "config", k, v);
  execFileSync("git", [`--git-dir=${bare}`, `--work-tree=${to}`, "add", "-A"], { env: plainEnv(), stdio: "ignore" });
  git(bare, "-c", "repack.writeBitmaps=false", "repack", "-q", "-a", "-d");
  fs.cpSync(path.join(bare, "objects", "pack"), `${to}.pack`, { recursive: true });
  fs.rmSync(bare, { recursive: true });
  KITS.set(key, to);
}

// The project and its bare origin, set so that nothing of the machine's own reaches them.
function repos(dir, project, origin) {
  fs.mkdirSync(project, { recursive: true });
  git(dir, "init", "-q", "--bare", "-b", "main", origin);
  git(project, "init", "-q", "-b", "main");
  fs.mkdirSync(path.join(dir, "no-hooks"));
  // (git's line endings as written, on every machine: Windows' own setting would show files the case wrote as changed)
  for (const [k, v] of [["user.name", "a builder"], ["user.email", "builder@example.invalid"], ["commit.gpgsign", "false"], ["core.autocrlf", "false"], ["core.hooksPath", path.join(dir, "no-hooks")]]) git(project, "config", k, v);
  // (objects written and packed as they are: the project holds the core's whole copy and each case adds and pushes it, where deflating it was about half of what the add and the push of a case took; #812)
  git(project, "config", "core.compression", "0");
  // (the origin reads as GitHub's, as the core's scripts expect, and is the bare repository beside the project)
  git(project, "config", `url.${origin.replace(/\\/g, "/")}.insteadOf`, URL);
  git(project, "remote", "add", "origin", URL);
  // (pushes go to the bare repository by a push address of their own, which no setting of the machine's rewrites)
  git(project, "remote", "set-url", "--push", "origin", origin);
  if (path.resolve(git(project, "remote", "get-url", "--push", "origin")) !== path.resolve(origin)) throw new Error("the project's pushes would not reach its own bare origin");
}

// (a file replaced, never written into: a kit's file may be a hard link shared with other cases, see linkAll)
export const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.rmSync(file, { force: true }); fs.writeFileSync(file, text); };

// The kit's FILL IN marks filled as `fills`, then FILLS, says, outside the copy of the core.
// The queue's first line: the case's first issue, which stands as #1 on GitHub, or no line where it makes none, so the
// queue names only issues the case makes (#988).
export const queueLine = issues => [/^1\. FILL IN: the first task.*(?:\n|$)/m, issues.length ? `1. #1, builder: ${issues[0].title}.\n` : ""];
function fillIn(project, fills = []) {
  for (const f of git(project, "ls-files", "--cached", "--others", "--exclude-standard").split("\n").filter(Boolean)) {
    if (f.startsWith("core/")) continue;
    const file = path.join(project, f), text = fs.readFileSync(file, "utf8");
    if (!text.includes("FILL IN")) continue;
    let filled = text;
    for (const [re, to] of [...fills, ...FILLS]) filled = filled.replace(re, to);
    put(file, filled);
  }
}

// Each file written in the project ({ path: text }), or taken out where its text is null.
function writeAll(project, files) {
  for (const [f, text] of Object.entries(files)) {
    const file = path.join(project, f);
    if (text === null) { fs.rmSync(file, { force: true }); continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    put(file, text);
  }
}

// The branch `name`, a commit on main with `change`, pushed to the origin and not kept in the project.
function pushBranch(project, name, change) {
  git(project, "checkout", "-q", "-b", name);
  writeAll(project, change);
  git(project, "add", "-A");
  git(project, "commit", "-q", "--allow-empty", "-m", `${name}`);
  git(project, "push", "-q", "origin", name);
  git(project, "checkout", "-q", "main");
  git(project, "branch", "-q", "-D", name);
}

// The stand-in's state for GitHub as the case starts.
function stateOf(issues, comments, github) {
  const at0 = "2026-11-01T09:00:00Z", user = login => ({ login, type: "User" });
  const state = { owner: OWNER, repo: REPO, private: false, hasIssues: true, labels: LABELS, issues: [], pulls: [], comments: [], checks: [], rulesets: [], last: 0, calls: [], ...github };
  for (const i of issues) state.issues.push({ number: ++state.last, title: i.title, body: i.body, state: "open", user: user(i.user ?? OWNER), labels: i.labels ?? ["queued", "by:owner"], assignees: [{ login: OWNER }], created_at: at0, updated_at: at0 });
  for (const c of comments) state.comments.push({ id: ++state.last * 1000, issue: c.issue, user: user(c.user ?? OWNER), body: c.body, created_at: at0, updated_at: at0 });
  return state;
}

// A case's folder, as the brief names it: its real path, strictly under the system's temporary folder, so no home
// folder's name reaches a brief (floor rule 11; where the temporary folder itself lies in the home folder, as on
// Windows, only under it), and of letters, digits and . _ / - alone (\\ : and ~ too on Windows, whose short names hold one; ~ not first in a word
// is no shell expansion), so its path is safe
// inside the brief's shell line. Gives that path.
export function folderFit(dir) {
  const at = path.resolve(dir), tmp = fs.realpathSync(os.tmpdir()), home = (() => { try { return fs.realpathSync(os.homedir()); } catch { return null; } })();
  const real = fs.existsSync(at) ? fs.realpathSync(at) : path.join(fs.realpathSync(path.dirname(at)), path.basename(at));
  const under = (p, folder) => p.startsWith(`${folder}${path.sep}`);
  if (!under(real, tmp) || (home && under(real, home) && !under(tmp, home)) || !(process.platform === "win32" ? /^[A-Za-z0-9._/\\:~-]+$/ : /^[A-Za-z0-9._/-]+$/).test(real))
    throw new Error(`${dir} is not a folder of letters, digits and . _ / - inside the system's temporary folder (${tmp})`);
  return real;
}

// The bug every case but one hands the session: issue #1, the owner's.
export const BUG = {
  title: "sum() leaves out the last number",
  body: "**What it is**\n`node src/cli.mjs 1 2 3` prints 3, not 6: `sum()` in `src/sum.mjs` leaves out the last number.\n\n**Why it matters**\nEvery sum the tool prints is wrong.\n\nFound while: using the tool.",
};
