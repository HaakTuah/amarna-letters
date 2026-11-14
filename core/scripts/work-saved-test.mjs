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
// with no node on the path, the start says in a line that the helper hook is off, and stops nothing
const noNode = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(d => d && !["node", "node.exe"].some(n => fs.existsSync(path.join(d, n)))).join(path.delimiter);
const pathKey = Object.keys(env).find(k => k.toUpperCase() === "PATH") ?? "PATH";
const bare2 = spawnSync("sh", ["-c", command("start")], { input: "{}", encoding: "utf8", env: { ...env, [pathKey]: noNode, CLAUDE_PROJECT_DIR: project } });
ok(bare2.status === 0 && /The helper hook is off here: Node is not on the path/.test(bare2.stdout) && /not committed/.test(bare2.stdout), "with no Node on the path, the start says in a line that the helper hook is off, beside what it reports, and stops nothing", `${bare2.status} ${bare2.stdout}${bare2.stderr}`);
ok(!/helper hook is off/.test(r.stdout), "with Node on the path it says nothing of it", r.stdout);
// the owner's stop switch: the branch agents-stop on origin, said at the start where it stands, and not where it is gone
git(project, "push", "-q", "origin", "main:agents-stop");
const stopped = hook("start", project);
ok(stopped.status === 0 && /The owner's stop switch is set/.test(stopped.stdout), "with the branch agents-stop on origin, the start says the owner's stop switch is set, and stops nothing itself", `${stopped.status} ${stopped.stdout}`);
git(project, "push", "-q", "origin", "--delete", "agents-stop");
ok(!/stop switch/.test(hook("start", project).stdout), "deleted, it says nothing of it");
git(project, "push", "-q", "origin", "main:claude/agents-stop");
ok(!/stop switch/.test(hook("start", project).stdout), "a branch of another name that ends in agents-stop is no switch");
git(project, "push", "-q", "origin", "--delete", "claude/agents-stop");
// where origin cannot be asked, that is said, after the report, which never waits on it
git(project, "remote", "set-url", "origin", path.join(tmp, "nowhere.git"));
let unread = hook("start", project);
ok(unread.status === 0 && /could not be read/.test(unread.stdout) && /not committed/.test(unread.stdout) && unread.stdout.indexOf("not committed") < unread.stdout.indexOf("could not be read"), "where origin cannot be asked, the start says the switch could not be read, after its report", unread.stdout);
if (process.platform === "win32") console.log("skip an origin that hangs and one that runs a command: run on Linux, as the hook's sh and ssh are Git Bash's here");
else {
  // (an origin that never answers, as an ssh asking for a host's key or a passphrase: the start ends in seconds, its
  // report said, well inside Claude Code's 30 seconds for the hook)
  const bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "ssh"), "#!/bin/sh\nsleep 45\n", { mode: 0o755 });
  git(project, "remote", "set-url", "origin", "git@github.example:o/r.git");
  const began = Date.now();
  unread = spawnSync("sh", ["-c", command("start")], { input: "{}", encoding: "utf8", env: { ...env, PATH: `${bin}${path.delimiter}${env.PATH}`, CLAUDE_PROJECT_DIR: project } });
  ok(unread.status === 0 && Date.now() - began < 15000 && /not committed/.test(unread.stdout) && /could not be read/.test(unread.stdout), "an origin that never answers holds the start no more than eight seconds, and its report is said", `${Date.now() - began}ms ${unread.stdout}`);
  // (the user's own way to ssh, GIT_SSH among them, is kept)
  const marker = path.join(tmp, "own-ssh-ran");
  fs.writeFileSync(path.join(bin, "own-ssh"), `#!/bin/sh\ntouch '${marker}'\nexit 1\n`, { mode: 0o755 });
  spawnSync("sh", ["-c", command("start")], { input: "{}", encoding: "utf8", env: { ...env, GIT_SSH: path.join(bin, "own-ssh"), CLAUDE_PROJECT_DIR: project } });
  ok(fs.existsSync(marker), "the user's own GIT_SSH is the one that asks origin", "");
  // (an origin whose settings would run a command: set aside)
  git(project, "config", "protocol.ext.allow", "always");
  git(project, "remote", "set-url", "origin", `ext::sh -c touch% ${path.join(tmp, "ran-by-hook")}`);
  hook("start", project);
  ok(!fs.existsSync(path.join(tmp, "ran-by-hook")), "an origin's ext:: address runs nothing", "");
  git(project, "config", "--unset", "protocol.ext.allow");
}
git(project, "remote", "set-url", "origin", remote);
// (with no origin there is no switch, and nothing is said of it)
git(project, "remote", "rename", "origin", "elsewhere");
ok(!/stop switch/.test(hook("start", project).stdout), "with no origin, nothing is said of the switch");
git(project, "remote", "rename", "elsewhere", "origin");
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
