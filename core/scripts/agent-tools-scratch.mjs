// What the tests of agent-tools.mjs stand on (agent-tools-test.mjs and its neighbours in tests/): the starter kit's hook files,
// a made-up project in a scratch git repository, the pull request that changes it merged into its main as GitHub's merge
// checkout has it, and the check run on it as licences.yml runs it. Tests only: no project and no check reads it.
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { scratchDir } from "./scratch-core.mjs";
import { printed } from "./agent-tools.mjs";
import { mended } from "./mend.mjs";

export const SCRIPT = fileURLToPath(new URL("../scripts/agent-tools.mjs", import.meta.url));
const template = name => fs.readFileSync(fileURLToPath(new URL(`../setup/template/${name}`, import.meta.url)), "utf8");
export const KIT = template("claude-settings.json.tmpl"), KIRO = template("kiro-hook.json.tmpl"), CODEX = template("codex-hooks.json.tmpl");
// Links (and git storing them as links) are read on Linux and macOS, where GitHub's runners run the check in a project;
// on Windows, where making one needs a right the runner may not give, those cases are left out and said so.
export const LINKS = process.platform !== "win32";
if (!LINKS) console.log("note the cases with links are run on Linux and macOS alone");
// (git's own settings of this machine left out, as the core's other tests leave them: a file that is not there, since
// Windows' git cannot open its null device as one, and line endings stored as written)
const none = scratchDir("agent-tools-");
export const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: path.join(none, "none"), GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.autocrlf", GIT_CONFIG_VALUE_0: "false" };
export const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" }).trim();
export const write = (dir, file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
export const withPlugins = plugins => JSON.stringify({ ...JSON.parse(KIT), enabledPlugins: plugins }, null, 2);
export const PLUGIN = { kind: "plugin", name: "helper@example-market", publisher: "Example Tools", version: "1.4.0" };
// A link to `to`, as a value of `files`, made as the file system makes one (git stores it as one, mode 120000).
export const LINK = Symbol("link"), link = to => ({ [LINK]: to });
// A project as the starter kit writes it: its hooks' settings and a licence config with no list. `files` replaces or
// adds files; a null removes one.
export function project(files = {}) {
  const dir = scratchDir("agent-tools-");
  git(dir, "init", "-q", "-b", "main");
  write(dir, ".claude/settings.json", KIT);
  write(dir, "checks/licences.json", JSON.stringify({ lockfiles: [] }));
  change(dir, files);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  return dir;
}
export function change(dir, files) {
  for (const [file, text] of Object.entries(files)) {
    if (text === null) fs.rmSync(path.join(dir, file), { force: true, recursive: true });
    else if (text?.[LINK] !== undefined) { fs.rmSync(path.join(dir, file), { force: true, recursive: true }); fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.symlinkSync(text[LINK], path.join(dir, file)); }
    else { try { if (fs.lstatSync(path.join(dir, file)).isSymbolicLink()) fs.rmSync(path.join(dir, file)); } catch { /* (nothing there) */ } write(dir, file, typeof text === "string" ? text : JSON.stringify(text, null, 2)); }
  }
}
// The pull request: the change committed on a branch and merged into main with --no-ff, as GitHub's merge checkout has
// it (the base is its first parent).
export function pr(dir, files) {
  git(dir, "checkout", "-q", "-B", "change"); // (-B: a second pull request on the same project starts from its main)
  change(dir, files);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "change");
  git(dir, "checkout", "-q", "main");
  git(dir, "merge", "-q", "--no-ff", "-m", "merge", "change");
  return dir;
}
// (the check is called here, as its command calls it, and what it prints read as a run of it would give it: its output,
// then its errors; the command itself, run as a program, by cli, where that is what a case reads; #715)
export const run = (dir, ...args) => {
  const { lines, status } = printed(dir, "checks/licences.json", { core: args.includes("--core") });
  const of = stream => lines.filter(([s]) => s === stream).map(([, l]) => `${l}\n`).join("");
  return { status, out: `${of("out")}${of("err")}` };
};
export const cli = (dir, ...args) => { const r = spawnSync(process.execPath, [SCRIPT, "checks/licences.json", ...args], { cwd: dir, encoding: "utf8" }); return { status: r.status, out: `${r.stdout}${r.stderr}` }; };
// ---- with a list ----
export const listing = (...entries) => ({ "checks/licences.json": { lockfiles: [], agentTools: entries } });
// ---- the pin a tool's own configuration gives (#352) ----
export const C1 = "0123456789abcdef0123456789abcdef01234567", C2 = "89abcdef0123456789abcdef0123456789abcdef";
export const withHook = command => ({ hooks: { ...JSON.parse(KIT).hooks, PostToolUse: [{ hooks: [{ type: "command", command }] }] } });
export const kitCommand = words => `bash -c 'f=$(git -C "\${CLAUDE_PROJECT_DIR:-.}" --no-replace-objects show refs/remotes/origin/main:scripts/format.sh 2>/dev/null) || exit 0; bash -c "$f"${words}'`;
export const TREE_HOOK = "bash scripts/format.sh", MAIN_HOOK = "git show refs/remotes/origin/main:scripts/format.sh | bash", KIT_HOOK = kitCommand("");
export const NOT_KIT = "is not in the starter kit's form, so nothing shows that it runs its copy on main";
export const entry = (command, extra = {}) => ({ kind: "hook", name: `PostToolUse: ${command}`, publisher: "this project", ...extra });
export const script = { "scripts/format.sh": "echo formatted\n" };
export const fromWorkingTree = { from: "the working tree" }, fromMain = { from: "main" };
// (the settings by which Claude Code runs a command of its own, read as hooks are)
export const withSetting = (key, value) => ({ ".claude/settings.json": { ...JSON.parse(KIT), [key]: value } });
// (and what else a tool runs by itself: the hooks of a skill's or a subagent's frontmatter, a remote server's and a
// marketplace's command for its headers, a marketplace's command source, and a Codex model provider, held whole)
export const front = key => `---\nname: rev\n${key}:\n  Stop:\n    - hooks:\n        - type: command\n          command: ${TREE_HOOK}\n---\n# rev\n`;
// (#647's fallback security review of 341004e: the frontmatter split as Claude Code splits it, and held whole in any
// form but a plain mapping of simple keys, in a subagent at any depth and a command too)
export const HOOKS = "        - type: command\n          command: bash x.sh";
// (#476's security review of a74309b: the command Codex runs on Windows in a hook's place is held to the kit's form too,
// and named, so its entry reads otherwise than the kit's)
export const codexHook = hook => ({ hooks: { Stop: [{ hooks: [hook] }] } });

// The assertions on a command's run that the tests of the files beside share, made from the file's own `ok`.
export const asserting = ok => {
  const passes = (r, what) => ok(r.status === 0 && !/FAIL/.test(r.out), what, r.out);
  const fails = (r, what, ...says) => ok(r.status === 1 && mended(r.out) && says.every(s => r.out.includes(s)), `${what}, and says the mend`, r.out);
  return { passes, fails };
};
