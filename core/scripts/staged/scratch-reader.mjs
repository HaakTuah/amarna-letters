// The sealed reader of what a session left in a staged case (scratch.mjs, the entrance beside this file; AGENTS.md,
// "Staged cases hold what no check reads"; #938): the git it runs, the files it reads as plain files and nothing else, its
// own repository over the session's objects, and the seal a case keeps of itself. A security reading: what the session
// wrote (its git config, hooks, links, attributes) is never run or followed. It takes scratch-outcome.mjs with it, which
// runs the session's program and calls git through this file's SAFE_ and QUIET_. Node's own modules only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The environment the readers run the session's code in: no variable of the machine's but where programs are found,
// so no sign-in or token reaches code the session wrote.
export const BARE = Object.freeze({ PATH: process.env.PATH ?? "", ...(process.platform === "win32" ? { SystemRoot: process.env.SystemRoot ?? "" } : {}) });

// The readers' git. The readers never run git in the session's repositories, whose config, attributes, hooks and
// links the session could have written: they read the refs and reflogs there as plain files, refusing a link, and
// read the objects through a repository of their own, made afresh in the temporary folder and pointed at the session's
// objects (view). Each call also points git's hooks, templates and user config at nothing (quiet), turns off what
// else runs a command, writes no index, runs with no variable of the
// machine's but where programs are found (no sign-in or token), and stops after a time; every ref it is given follows
// --end-of-options at the call. Gives the output, or null where git failed.
export const LIMITS = { run: 20000 };
// Where git is told to find no hooks, no templates and no config of the user's. On Linux and macOS, the null device,
// which nothing can write into. Git for Windows takes no hooks folder or config file at that device's name, so there
// an empty folder and an empty file of the readers' own are made under a name of the system's choosing, checked
// before every use to be still empty, the file a link of its own (no hard link to another), and made afresh after each
// run of the session's code (afresh, below): code of the session's that the readers run could otherwise plant a hook
// there (a failed check makes the reading fail, as Unreadable).
let quietFolder = null;
const quiet = () => {
  if (process.platform !== "win32") return { hooks: os.devNull, config: os.devNull, templates: "" };
  if (!quietFolder) {
    const made = fs.mkdtempSync(path.join(os.tmpdir(), "staged-quiet-"));
    process.once("exit", () => fs.rmSync(made, { recursive: true, force: true }));
    fs.mkdirSync(path.join(made, "no-hooks"));
    fs.writeFileSync(path.join(made, "no-config"), "");
    quietFolder = made;
  }
  const hooks = path.join(quietFolder, "no-hooks"), config = path.join(quietFolder, "no-config");
  const h = fs.lstatSync(hooks), c = fs.lstatSync(config);
  if (!h.isDirectory() || fs.readdirSync(hooks).length || !c.isFile() || c.size || c.nlink !== 1) throw new Unreadable(`the readers' own empty folder was written into while the case was read`);
  return { hooks, config, templates: hooks };
};
export const SAFE_ = () => ["-c", "core.fsmonitor=false", "-c", "diff.external=", "-c", "core.pager=cat", "-c", `core.hooksPath=${quiet().hooks}`, "-c", "core.untrackedCache=false", "-c", "log.showSignature=false",
  // (nothing of the session's that would change what git reads: its commit-graph, pack indexes and bitmaps go unread)
  "-c", "core.commitGraph=false", "-c", "core.multiPackIndex=false", "-c", "pack.useBitmaps=false",
  // (and no .gitattributes of any tree's: attributes are read from git's empty tree alone)
  "-c", "attr.tree=4b825dc642cb6eb9a060e54bf8d69288fbee4904"];
export const QUIET_ = () => { const q = quiet(); return { ...BARE, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: q.config, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0", GIT_TEMPLATE_DIR: q.templates, GIT_NO_REPLACE_OBJECTS: "1" }; };
export const readGit = (cwd, ...args) => {
  const r = spawnSync("git", [...SAFE_(), ...args], { cwd, env: QUIET_(), encoding: "utf8", maxBuffer: 1 << 28, timeout: LIMITS.run });
  return r.status === 0 ? r.stdout : null;
};

// A folder or file of the session's, read only where it is what it says: a real folder or file, never a link (one could
// lead out of the case), nor a git folder that names another as its common one.
export class Unreadable extends Error {}
const real = (p, kind) => {
  let st;
  try { st = fs.lstatSync(p); } catch { return false; }
  if (st.isSymbolicLink() || (kind === "dir" ? !st.isDirectory() : !st.isFile())) throw new Unreadable(`${p} is not a plain ${kind === "dir" ? "folder" : "file"}`);
  return true;
};
// A JSON file of the case's (github.json, a memo of its seal), read through one descriptor: a plain file, never a link
// (refused as it is opened, where the system can, and opened without waiting, so that a pipe swapped in stops nothing)
// nor a second name of another file, of 16 MB or less; anything else, and text that is no JSON, is Unreadable, its
// message naming the file and quoting none of its text (#435).
const JSON_MAX = 16 << 20;
const jsonOf = at => {
  if (!real(at, "file")) throw new Unreadable(`${at} is not there`);
  let fd;
  try { fd = fs.openSync(at, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0)); } catch { throw new Unreadable(`${at} is not a plain file`); }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.nlink !== 1 || st.size > JSON_MAX) throw new Unreadable(`${at} is not a plain file of its own, of 16 MB or less`);
    let text;
    try { text = fs.readFileSync(fd, "utf8"); } catch { throw new Unreadable(`${at} could not be read`); }
    try { return JSON.parse(text); } catch { throw new Unreadable(`${at} is not JSON`); }
  } finally { fs.closeSync(fd); }
};
const SHA = /^[0-9a-f]{40}$/;
// Every ref of a git folder, as its files hold them (loose refs over packed ones), and with `reflog` each commit its
// reflogs name, as refs of their own; a link anywhere fails the reading.
export function refsIn(gitDir, { reflog = false } = {}) {
  if (!real(gitDir, "dir")) throw new Unreadable(`${gitDir} is not there`);
  if (fs.existsSync(path.join(gitDir, "commondir"))) throw new Unreadable(`${gitDir} names another git folder as its common one`);
  const out = {}, NAME = /^refs\/[A-Za-z0-9._/-]+$/;
  // (the name is the session's text, carried into a verdict and a pull request's description: cut, and shown in plain
  // characters alone)
  const named = r => { if (!NAME.test(r) || /\.\.|\/\/|\.lock$|\/\./.test(r)) throw new Unreadable(`${gitDir} holds the ref "${r.slice(0, 200).replace(/[^A-Za-z0-9._/-]/g, "?")}", of no plain name`); return r; };
  // (a file of at most 1 MB, a folder at most 32 deep: nothing else, a pipe or a device least of all, is read)
  const small = p => { const st = fs.lstatSync(p); if (!st.isFile() || st.size > 1 << 20) throw new Unreadable(`${p} is not a small plain file`); return fs.readFileSync(p, "utf8"); };
  if (real(path.join(gitDir, "packed-refs"), "file")) for (const l of small(path.join(gitDir, "packed-refs")).split("\n")) { const m = /^([0-9a-f]{40}) (refs\/\S+)$/.exec(l); if (m) out[named(m[2])] = m[1]; }
  const walk = (folder, rel, each, depth = 0) => {
    if (!real(folder, "dir")) return;
    if (depth > 32) throw new Unreadable(`${folder} is nested too deep`);
    for (const e of fs.readdirSync(folder)) {
      const p = path.join(folder, e), st = fs.lstatSync(p);
      if (st.isDirectory()) walk(p, `${rel}/${e}`, each, depth + 1);
      else if (st.isFile()) each(p, `${rel}/${e}`);
      else throw new Unreadable(`${p} is neither a plain file nor a folder`);
    }
  };
  walk(path.join(gitDir, "refs"), "refs", (p, rel) => { const t = small(p).trim(); if (SHA.test(t)) out[named(rel)] = t; });
  if (!real(path.join(gitDir, "HEAD"), "file")) throw new Unreadable(`${gitDir} has no HEAD`);
  const head = small(path.join(gitDir, "HEAD")).trim();
  out.HEAD = SHA.test(head) ? head : out[/^ref: (\S+)$/.exec(head)?.[1]] ?? null;
  if (reflog) { let n = 0; walk(path.join(gitDir, "logs"), "logs", p => { for (const l of small(p).split("\n")) for (const sha of l.split(" ").slice(0, 2)) if (SHA.test(sha) && !/^0+$/.test(sha)) out[`refs/reflog/${n++}`] = sha; }); }
  return out;
}

// The reader's own repository for one of the case's (`origin.git`, or the project's `.git` with its reflogs), made
// afresh for what the refs now are and removed when the process ends: its config is the reader's, its objects the
// session's, borrowed (alternates), its refs those read above. Gives its git folder, or throws Unreadable.
const views = new Map();
process.on("exit", () => { for (const v of views.values()) fs.rmSync(path.dirname(v.at), { recursive: true, force: true }); });
// After each run of the session's code: every view, and the Windows quiet folder, dropped, to be made afresh, so that
// what that code may have written beside them is never read.
export function afresh() {
  for (const v of views.values()) fs.rmSync(path.dirname(v.at), { recursive: true, force: true });
  views.clear();
  if (quietFolder) { fs.rmSync(quietFolder, { recursive: true, force: true }); quietFolder = null; }
}
export function view(dir, which) {
  const gitDir = which === "origin" ? path.join(dir, "origin.git") : path.join(dir, "project", ".git");
  if (which === "project") real(path.join(dir, "project"), "dir");
  const refs = refsIn(gitDir, { reflog: which === "project" }), key = `${gitDir}\n${JSON.stringify(refs)}`, was = views.get(gitDir);
  if (was?.key === key) return was.at;
  if (was) fs.rmSync(path.dirname(was.at), { recursive: true, force: true });
  real(path.join(gitDir, "objects"), "dir");
  const at = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "staged-read-")), "view.git");
  const run = (args, input) => spawnSync("git", [...SAFE_(), ...args], { env: QUIET_(), encoding: "utf8", input, timeout: LIMITS.run });
  const made = run(["init", "-q", "--bare", at]);
  if (made.status !== 0) throw new Unreadable(`the reader's own repository could not be made (git: ${String(made.stderr || made.error || "no answer").trim().slice(0, 300)})`);
  // (its HEAD names a ref the reader never writes; attributes come from the empty tree in any case, SAFE_'s attr.tree)
  run([`--git-dir=${at}`, "symbolic-ref", "HEAD", "refs/staged-reader/none"]);
  fs.writeFileSync(path.join(at, "objects", "info", "alternates"), `${fs.realpathSync(path.join(gitDir, "objects")).replace(/\\/g, "/")}\n`);
  const lines = Object.entries(refs).filter(([r, sha]) => r !== "HEAD" && !r.startsWith("refs/replace/") && sha).map(([r, sha]) => `update ${r} ${sha}\n`).join("");
  if (lines && run([`--git-dir=${at}`, "update-ref", "--stdin"], lines).status !== 0) throw new Unreadable(`${gitDir} holds a ref to no object it has`);
  views.set(gitDir, { key, at, refs });
  return at;
}
export const viewGit = (dir, which, ...args) => readGit(dir, `--git-dir=${view(dir, which)}`, ...args);
export const originGit = (dir, ...args) => viewGit(dir, "origin", ...args);

// GitHub's state as the stand-in holds it now (#435).
export const github = dir => jsonOf(path.join(dir, "github.json"));

// The origin's branches and their commits: { name: sha }, read from its files.
export function branchesOf(dir) {
  return Object.fromEntries(Object.entries(refsIn(path.join(dir, "origin.git"))).filter(([r]) => r.startsWith("refs/heads/")).map(([r, sha]) => [r.slice("refs/heads/".length), sha]));
}

// What the case keeps of itself, in a folder beside the case's own (`<dir>.seal`), which the brief does not name: the
// origin's branches as the case left them once set (staged.mjs seals them), what the session's work is read against,
// and each case's own memo.
export const sealOf = dir => `${path.resolve(dir)}.seal`;
export const memo = (dir, name, value) => fs.writeFileSync(path.join(sealOf(dir), `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
// (the seal's own folder a real one, never a link to another holding memos of the session's making)
export const memoOf = (dir, name) => {
  if (!real(sealOf(dir), "dir")) throw new Unreadable(`${sealOf(dir)} is not there`);
  return jsonOf(path.join(sealOf(dir), `${name}.json`));
};
// (the project's git objects by their files' names: a commit made and then undone, its reflog cleared, still leaves one)
// (a plain folder, none of its own folders a link, at most a few deep, as git writes it: anything else is Unreadable)
export const objectsOf = dir => {
  const at = path.join(dir, "project", ".git", "objects"), out = [];
  if (!real(at, "dir")) throw new Unreadable(`${at} is not there`);
  const walk = (f, rel, depth) => {
    if (depth > 4) throw new Unreadable(`${at} holds folders deeper than git writes`);
    for (const e of fs.readdirSync(f)) { const p = path.join(f, e), st = fs.lstatSync(p); if (st.isDirectory()) walk(p, `${rel}${e}/`, depth + 1); else out.push(`${rel}${e}`); }
  };
  walk(at, "", 0);
  return out.sort();
};
export const seal = dir => {
  memo(dir, "refs", branchesOf(dir));
  memo(dir, "objects", objectsOf(dir));
  memo(dir, "reflog", [...new Set(Object.entries(refsIn(path.join(dir, "project", ".git"), { reflog: true })).filter(([r]) => r.startsWith("refs/reflog/")).map(([, sha]) => sha))]);
};
export const sealed = dir => memoOf(dir, "refs");

// The commit main stood on when the case was set.
export const base = dir => sealed(dir).main;
