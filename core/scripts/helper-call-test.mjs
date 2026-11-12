// Checks the helper hook (helper-call.mjs, beside this file): which calls it refuses, that the effort max is refused
// every time before anything else is asked, that a call refused for a field left out goes on when made again whatever
// stands in the temp folder, and the hook's whole command in a repository whose main holds the script. Run by the
// core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/helper-call-test.mjs
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMAND, defines, firstTry, refusal } from "./helper-call.mjs";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const agent = (tool_input, tool_name = "Agent", session_id = "s1") => ({ session_id, hook_event_name: "PreToolUse", tool_name, tool_input });
const text = (...args) => JSON.stringify(agent(...args));
const whole = { description: "x", prompt: "y", subagent_type: "general-purpose", model: "sonnet", effort: "medium" };
const WINDOWS = process.platform === "win32";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helper-call-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));

// which calls it refuses, with what it is asked (own: the project's types; first: the call's first try) stubbed
const why = (tool_input, own, first) => refusal(text(tool_input), own, first) ?? "";
const goes = (tool_input, own, first) => refusal(text(tool_input), own, first) === null;
let asked = 0;
const never = () => { asked++; return true; }; // for what must not be asked: it counts, and the count must stay 0
ok(goes(whole, never, never) && goes({ ...whole, effort: "xhigh" }, never, never) && refusal(text(whole, "Task"), never, never) === null && asked === 0, "a call with both goes on, at any effort but max, under the tool's old name too, with nothing else asked");
ok(/no model\b/u.test(why({ ...whole, model: undefined })) && /no effort\b/u.test(why({ ...whole, effort: " " })) && /no model and no effort.*same prompt goes on/u.test(why({ prompt: "y" })), "a call without a model, without an effort or without both is refused, told which, and told the call made again goes on");
ok(why({ ...whole, model: 5, effort: ["max"] }).includes("no model and no effort"), "a model or an effort that is no text counts as left out");
const maxes = [{ ...whole, effort: "max" }, { ...whole, effort: " MAX\n" }, { prompt: "y", effort: "Max" }, { prompt: "y", effort: "max", subagent_type: "poller" }];
ok(maxes.every(call => /effort max/u.test(why(call, never, never))) && asked === 0, "the effort max is refused before anything else is asked: with a model or without, on a type of the project's own");
const own = type => type === "poller";
ok(goes({ prompt: "y", subagent_type: "fork" }, never, never) && goes({ prompt: "y", effort: "max", subagent_type: "fork" }, never, never) && goes({ prompt: "y", subagent_type: "poller" }, own, never) && asked === 0 && !goes({ prompt: "y", subagent_type: "general-purpose" }, own) && !goes({ prompt: "y" }, own), "a fork goes on whatever its call says, which Claude Code ignores; a helper of a type the project defines goes on without the fields; another type, or none, does not");
ok(goes({ prompt: "y", subagent_type: "codex:codex-rescue" }, never, never) && goes({ prompt: "y", subagent_type: "kit:review:security", model: "opus" }, never, never) && goes({ prompt: "y", subagent_type: "codex\uff1acodex-rescue" }, never, never) && asked === 0 && /effort max/u.test(why({ prompt: "y", subagent_type: "codex:codex-rescue", effort: "max" }, never, never)) && !goes({ prompt: "y", subagent_type: "codex-rescue" }), "a helper of a plug-in's own type (a colon in its name) goes on without them, with nothing else asked, but not with max; the same name without its plug-in does not");
const boom = () => { throw new Error("failed"); };
ok(goes({ prompt: "y" }, undefined, () => false) && goes({ prompt: "y" }, boom) && goes({ prompt: "y" }, undefined, boom), "a field left out is refused only where its first try is counted: a step that fails or throws lets it through");
const shapes = ["", "not json", "null", "5", "[1]", "{}", text(null), text("x"), text([{ prompt: "y" }]), text({ command: "ls" }, "Bash"), text({ prompt: "y" }, "agent")];
ok(shapes.every(t => refusal(t) === null) && refusal(undefined) === null, "another tool's call, and input of no known shape, go on");
ok(/no model and no effort/u.test(refusal('{"tool_name":"Agent","tool_input":{"__proto__":{"model":"m","effort":"high"},"prompt":"y"}}') ?? ""), "fields hidden under a key named __proto__ are not read as given");

// whether the project defines a type
const project = path.join(tmp, "project");
fs.mkdirSync(path.join(project, ".claude", "agents"), { recursive: true });
fs.writeFileSync(path.join(project, ".claude", "agents", "poller.md"), "---\nname: poller\nmodel: haiku\neffort: low\n---\n");
fs.writeFileSync(path.join(project, "secret.md"), "x");
ok(defines(project, "poller") && !defines(project, "Poller") && !defines(project, "Explore") && !defines(project, "../secret") && !defines(project, "../../secret") && !defines(project, "") && !defines(project, undefined) && !defines(project, "plugin:poller"), "the project defines a type by a file of that very name among its agents; a path, a plugin's type or another case is none of its own");
const odd = path.join(tmp, "odd");
fs.mkdirSync(odd);
fs.writeFileSync(path.join(odd, ".claude"), "x");
// (Windows says "no such folder" of a path under a file, so there the odd project defines none, as one without the folder)
ok(!defines(path.join(tmp, "nowhere"), "poller") && defines(odd, "poller") === !WINDOWS, "a project with no agents folder defines none; one whose folder cannot be read is let through");

// the count of first tries
const marks = path.join(tmp, "marks");
fs.mkdirSync(marks);
const one = agent({ prompt: "y" }), other = agent({ prompt: "z" });
ok(firstTry(one, marks) && firstTry(other, marks) && !firstTry(one, marks) && firstTry(one, marks) && !firstTry(other, marks), "a first try is counted, and the call made again goes on, once; made again after that it is a first try anew; each prompt by itself");
ok(!firstTry(agent({ prompt: "y", model: "opus", subagent_type: "Explore" }), marks) && firstTry(agent({ prompt: "y" }, "Agent", "s2"), marks), "the call made again is known by its session and prompt alone: one that adds a model or changes its type is the same call; another session's is its own");
ok(firstTry(agent({ prompt: "odd" }, "Agent", "../../a/b"), marks) && firstTry(agent({ prompt: "odd" }, "Agent", ""), marks) && fs.readdirSync(marks).every(f => /^helper-call-[0-9a-f]{32}$/u.test(f) && fs.statSync(path.join(marks, f)).size === 0) && fs.readdirSync(tmp).sort().join() === "marks,odd,project", "a mark is an empty file in the temp folder named by a hash alone, whatever shape the session has");
ok([agent({ prompt: "y" }, "Agent", 5), { tool_name: "Agent", tool_input: { prompt: "y" } }, agent({ prompt: 5 }), agent({}), agent(null), null].every(input => !firstTry(input, marks)) && !firstTry(one, path.join(tmp, "none")) && !firstTry(one, path.join(project, "secret.md")), "a call it cannot name (no session or no prompt as text), or a mark it cannot make (no temp folder, a file in its place), is never counted, so never refused");
const markFor = input => { const dir = fs.mkdtempSync(path.join(tmp, "m-")); firstTry(input, dir); return path.join(dir, fs.readdirSync(dir)[0]); };
const there = file => fs.lstatSync(file, { throwIfNoEntry: false });
const target = path.join(tmp, "target"), linked = markFor(agent({ prompt: "link" }));
fs.writeFileSync(target, "keep");
fs.unlinkSync(linked);
fs.symlinkSync(target, linked);
ok(!firstTry(agent({ prompt: "link" }), path.dirname(linked)) && !there(linked) && firstTry(agent({ prompt: "link" }), path.dirname(linked)) && there(linked).isFile() && fs.readFileSync(target, "utf8") === "keep", "a link planted at a mark's name counts as the mark: it is removed, never followed or written through");
const fifo = markFor(agent({ prompt: "fifo" }));
fs.unlinkSync(fifo);
if (WINDOWS) console.log("skip a pipe planted at a mark's name: Windows has no pipe that stands at a file's name");
else {
  execFileSync("mkfifo", [fifo]);
  ok(!firstTry(agent({ prompt: "fifo" }), path.dirname(fifo)) && !there(fifo), "a pipe planted at a mark's name counts as the mark: it is removed, never opened");
}
const folder = markFor(agent({ prompt: "dir" }));
fs.unlinkSync(folder);
fs.mkdirSync(folder);
ok(!firstTry(agent({ prompt: "dir" }), path.dirname(folder)) && !firstTry(agent({ prompt: "dir" }), path.dirname(folder)) && there(folder).isDirectory(), "a folder at a mark's name, which cannot be taken away, lets the call through every time");

// as a program
const file = fileURLToPath(new URL("./helper-call.mjs", import.meta.url));
const env = { ...process.env, CLAUDE_PROJECT_DIR: project, TMPDIR: marks };
const run = (input, args = []) => spawnSync(process.execPath, [file, ...args], { input, encoding: "utf8", env });
const first = run(text({ prompt: "y" }, "Agent", "f1"));
ok(first.status === 2 && /no model and no effort/u.test(first.stderr) && run(text({ prompt: "y" }, "Agent", "f1")).status === 0 && run(text(whole, "Agent", "f2")).status === 0, "as a file: exit 2 with the reason on stderr, exit 0 for the same call again and for a call with both");
ok([{ ...whole, effort: "max" }, { prompt: "m", effort: "max" }].every(call => [1, 2, 3].every(() => { const out = run(text(call, "Agent", "f3")); return out.status === 2 && /effort max/u.test(out.stderr); })), "the effort max is refused every time, the same call again too, and with no model as well");
ok(run(text({ prompt: "y", subagent_type: "poller" }, "Agent", "f4")).status === 0 && ["not json", "", "[1]"].every(input => run(input).status === 0), "run in a project, it lets that project's own type through; input that is not a hook's JSON is let through");
const deep = (effort, n = 20_000) => `{"session_id":"f5","tool_name":"Agent","tool_input":{"prompt":"deep","effort":${effort},"x":${"[".repeat(n)}${"]".repeat(n)}}}`;
ok(run(deep('"max"')).status === 2 && run(deep('"max"')).status === 2 && run(deep("null")).status === 2 && run(deep("null")).status === 0, "a deeply nested call is judged like any other: max refused every time, a field left out once");
const huge = text({ prompt: "p".repeat(8_000_000) }, "Agent", "f6");
ok(run(huge).status === 2 && run(huge).status === 0, "a call with a huge prompt is refused once and goes on when made again");
const twins = await Promise.all(Array.from({ length: 4 }, () => new Promise(done => {
  const child = spawn(process.execPath, [file], { env, stdio: ["pipe", "ignore", "ignore"] });
  child.on("close", done);
  child.stdin.end(text({ prompt: "twins" }, "Agent", "f7"));
})));
ok(twins.every(code => code === 0 || code === 2) && twins.includes(0), "the same call made several times at once: at least one goes on, in whatever order they run");
const nowhere = input => spawnSync(process.execPath, [file], { input, encoding: "utf8", env: { ...env, TMPDIR: path.join(tmp, "none"), TEMP: path.join(tmp, "none"), TMP: path.join(tmp, "none") } }); // (TEMP and TMP: Windows' names for it)
ok(nowhere(text({ prompt: "y" }, "Agent", "f8")).status === 0 && nowhere(text({ prompt: "y", effort: "max" }, "Agent", "f8")).status === 2, "where no mark can be made, a call with a field left out goes on at once, and max is still refused");
ok(JSON.parse(run("", ["--command"]).stdout) === COMMAND && !COMMAND.includes("\n"), "--command prints the hook's command, one line, as a settings file holds it");

// the hook's whole command, as a shell runs it, in a repository whose main holds the script (and whose working tree
// holds another, which must not be the one that runs)
const repo = path.join(tmp, "repo"), bare = path.join(tmp, "bare");
const git = (cwd, args) => execFileSync("git", args, { cwd, stdio: "ignore" });
const commit = cwd => { git(cwd, ["init", "-q"]); git(cwd, ["add", "-A"]); git(cwd, ["-c", "user.email=a@b.example", "-c", "user.name=test", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "x"]); git(cwd, ["update-ref", "refs/remotes/origin/main", "HEAD"]); };
fs.mkdirSync(path.join(repo, "core", "scripts"), { recursive: true });
fs.copyFileSync(file, path.join(repo, "core", "scripts", "helper-call.mjs"));
commit(repo);
fs.writeFileSync(path.join(repo, "core", "scripts", "helper-call.mjs"), "process.exit(0);\n");
fs.mkdirSync(bare);
fs.writeFileSync(path.join(bare, "README.md"), "x\n");
commit(bare);
const shell = { ...env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` };
const hook = (input, dir) => spawnSync("sh", ["-c", COMMAND], { input, encoding: "utf8", env: { ...shell, CLAUDE_PROJECT_DIR: dir } });
const refused = hook(text({ prompt: "y" }, "Agent", "h1"), repo);
ok(refused.status === 2 && /no model and no effort/u.test(refused.stderr) && hook(text({ prompt: "y" }, "Agent", "h1"), repo).status === 0 && hook(text(whole, "Agent", "h2"), repo).status === 0 && hook(text({ ...whole, effort: "max" }, "Agent", "h3"), repo).status === 2, "the hook's command, whole, runs main's copy and not the working tree's: it refuses, lets the same call through again, lets a call with both through, and refuses max");
ok(hook(text({ prompt: "y" }, "Agent", "h4"), path.join(tmp, "nowhere")).status === 0 && hook(text({ prompt: "y" }, "Agent", "h5"), project).status === 0 && hook(text({ prompt: "y" }, "Agent", "h6"), bare).status === 0, "where there is no folder, no repository, or a main that holds no copy, the call goes on");
process.exitCode = failed ? 1 : 0;
