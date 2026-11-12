// Tests of the work-saved hook (work-saved.sh), run as a project registers it: through a shell, main's copy read from
// git and handed to bash, the hook's JSON on its input. In a scratch project with a remote of its own, on Linux and on
// Windows (Git Bash). Node's own modules only.
//
//   node scripts/work-saved-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const command = mode => `bash -c 'f=$(git -C "\${CLAUDE_PROJECT_DIR:-.}" --no-replace-objects show refs/remotes/origin/main:core/scripts/work-saved.sh 2>/dev/null) || exit 0; bash -c "$f" work-saved ${mode}'`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "work-saved-test-"));
const project = path.join(tmp, "project"), remote = path.join(tmp, "remote.git"), bare = path.join(tmp, "bare");
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
// (git's own variables that point at a repository are left out, so every call here lands in the scratch project,
// whatever the run was started from)
const outer = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)$/i.test(name)));
const env = { ...outer, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" };
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const hook = (mode, dir, input = "{}") => spawnSync("sh", ["-c", command(mode)], { input, encoding: "utf8", env: { ...env, CLAUDE_PROJECT_DIR: dir } });

fs.mkdirSync(path.join(project, "core", "scripts"), { recursive: true });
fs.copyFileSync(fileURLToPath(new URL("./work-saved.sh", import.meta.url)), path.join(project, "core", "scripts", "work-saved.sh"));
git(tmp, "init", "-q", "--bare", "-b", "main", remote);
git(project, "init", "-q", "-b", "main");
git(project, "add", "-A");
git(project, "commit", "-q", "-m", "the hook");
git(project, "remote", "add", "origin", remote);
git(project, "push", "-q", "-u", "origin", "main");

let r = hook("stop", project);
ok(r.status === 0 && !r.stderr, "all committed and pushed: the reply ends", r.stderr);
fs.writeFileSync(path.join(project, "note.txt"), "x\n");
r = hook("stop", project);
ok(r.status === 2 && /1 file\(s\) not committed, such as note\.txt/.test(r.stderr), "a file not committed keeps the reply from ending, and says which", `${r.status} ${r.stderr}`);
r = hook("stop", project, '{"stop_hook_active": true}');
ok(r.status === 0, "a second stop in a row goes through", `${r.status} ${r.stderr}`);
r = hook("start", project);
ok(r.status === 0 && /not committed/.test(r.stdout), "at a session's start it reports and stops nothing", `${r.status} ${r.stdout}`);
git(project, "add", "-A");
git(project, "commit", "-q", "-m", "a note");
r = hook("stop", project);
ok(r.status === 2 && /1 commit\(s\) on main not pushed/.test(r.stderr), "a commit not pushed keeps the reply from ending", `${r.status} ${r.stderr}`);
git(project, "checkout", "-q", "-b", "task");
r = hook("stop", project);
ok(r.status === 2 && /task holds 1 commit\(s\) on no remote branch/.test(r.stderr), "so does a branch with a commit on no remote branch", `${r.status} ${r.stderr}`);
git(project, "push", "-q", "-u", "origin", "task");
r = hook("stop", project);
ok(r.status === 0, "pushed, the reply ends", `${r.status} ${r.stderr}`);
// The working tree's copy is never the one that runs: an edit there changes nothing until it is merged into main.
fs.writeFileSync(path.join(project, "core", "scripts", "work-saved.sh"), "exit 0\n");
r = hook("stop", project);
ok(r.status === 2 && /not committed/.test(r.stderr), "main's copy runs, not the working tree's", `${r.status} ${r.stderr}`);
fs.mkdirSync(bare);
git(bare, "init", "-q", "-b", "main");
ok(hook("stop", bare).status === 0 && hook("stop", path.join(tmp, "nowhere")).status === 0, "where main holds no copy, or there is no folder, the reply ends");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the work-saved hook`);
process.exitCode = failed ? 1 : 0;
