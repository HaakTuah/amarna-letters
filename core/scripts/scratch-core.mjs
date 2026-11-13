// What the starter kit's tests stand on (init-test.mjs, init-dotnet-test.mjs): a scratch copy of the core as it stands
// here, committed in a repository of its own, and scratch projects beside it, all in one temporary folder that is
// removed when the test ends. Every git call in it runs without the user's and the system's git settings, and without
// git's own variables that point at another repository, so a test sees only what it sets itself. Tests only: no
// project and no workflow of the core's uses it. Git and Node's own modules only.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// `prefix` names the temporary folder. It gives: `tmp`, that folder; `env`, the environment of every call; `git(dir,
// ...args)` and `run(dir, ...args)`, git and Node run in a folder (run: the script and its arguments, giving its exit
// status and what it printed); `core`, the scratch copy of the core, `pin`, its one commit, and `script`, its
// init.mjs; `fresh(name)`, a new empty repository under tmp; and `project(name, ...args)`, a new one in which the
// starter kit was run with those arguments.
export function scratch(prefix) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  // (a program a test started may hold a file a moment longer, on Windows: tried again, and never the test's failure)
  process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)$/i.test(name)));
  Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" });
  const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const run = (dir, ...args) => { const r = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
  const core = path.join(tmp, "the-core");
  fs.cpSync(root, core, { recursive: true, filter: src => path.basename(src) !== ".git" && path.basename(src) !== "node_modules" });
  git(core, "init", "-q", "-b", "main");
  git(core, "add", "-A");
  git(core, "commit", "-q", "-m", "the core as it stands");
  const pin = git(core, "rev-parse", "HEAD");
  const script = path.join(core, "scripts", "init.mjs");
  const fresh = name => { const dir = path.join(tmp, name); fs.mkdirSync(dir); git(dir, "init", "-q", "-b", "main"); return dir; };
  const project = (name, ...args) => { const dir = fresh(name); return { dir, ...run(dir, script, ...args) }; };
  return { tmp, env, git, run, core, pin, script, fresh, project };
}
