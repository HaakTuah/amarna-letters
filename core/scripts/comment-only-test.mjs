// Tests of the proof that a change to what runs by itself is only comments and steps' names (comment-only.mjs; floor
// rule 3): first its reading of two versions of a workflow, against each way a change can hide where a comment seems
// to be (a block scalar's # lines, a heredoc's, a quoted or plain value that runs on, [ ] or { }, an input, a matrix
// entry, a job or the workflow named `name`, an expression in a step's name, a composite action's steps, every
// character YAML reads as a line break or this proof does not read); then each workflow of this repository, a comment
// and a step's name changed in it where it reads; then the script run end to end, as its builder runs it, on a pull
// request's branch in a scratch clone: what it reads under .github/ and .claude/ (any case, any depth) and a project's
// own action.yml, a file added,
// deleted or its mode changed, a file not YAML, text not UTF-8, the working tree left unread, and a later commit read
// against the one reviewed. On Linux and on Windows. Git and Node's own modules only.
//
//   node scripts/comment-only-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RUNS, RUNS_TOO, proof, readYaml } from "./comment-only.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 1200).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "comment-only.mjs");

const BASE = `# A workflow for the test
name: t
on:
  pull_request:
    types: [opened, synchronize] # the kinds
permissions:
  contents: read
jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: one
            os: ubuntu-latest
    steps:
      - uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v7.0.1
        with:
          persist-credentials: false
          name: an-input
      - name: The check
        if: \${{ !cancelled() }}
        run: |
          # the shell's own comment
          echo "a #b"
          cat <<EOF
          # data, not a comment
          EOF
        env:
          X: "y" # a quoted value
      - name: "Quoted \${{ github.ref }}"
        run: echo hi
      - name: 'Single'
        shell: bash
        run: >-
          echo folded
`;
const edit = (from, to, text = BASE) => { if (!text.includes(from)) throw new Error(`no ${JSON.stringify(from)} in the text`); return text.replace(from, to); };
const passes = (after, what, before = BASE) => { const r = proof(before, after); ok(r.same === true, what, r.why); };
const fails = (after, what, why = "", before = BASE) => { const r = proof(before, after); ok(r.same !== true && (!why || r.why.includes(why)), what, r.why ?? "passed"); };

// ---- what passes: comments, blank lines between entries, steps' names ----
ok(readYaml(BASE).unread.length === 0, "the test's workflow reads", readYaml(BASE).unread.join("; "));
passes(BASE, "a file unchanged");
passes(edit("# A workflow for the test", "# Another note"), "a comment line changed");
passes(edit("      - name: The check", "      # before the check\n      - name: The check"), "a comment line added between steps");
passes(edit("# A workflow for the test\n", ""), "a comment line taken out");
passes(edit('"y" # a quoted value', '"y" # the value, quoted'), "a line's own comment changed");
fails(edit("# v7.0.1", "# v7.0.2"), "the note beside an action's version, which reviewers trust", "the note beside an action's version");
fails(edit("# the kinds", "# shellcheck disable=SC2086"), "a comment a linter reads as an instruction", "a tool may read as an instruction");
fails(edit("      - name: The check", "      # zizmor: ignore[template-injection]\n      - name: The check"), "a comment line that silences a check", "a tool may read as an instruction");
passes(edit("# the kinds", "# the kinds"), "a silencing comment taken out", edit("# the kinds", "# codeql[actions/x] the kinds"));
fails(edit("# the kinds", "# nosemgrep"), "a semgrep marker", "instruction");
fails(edit("# the kinds", "# checkov:skip=CKV_GHA_7"), "a checkov marker", "instruction");
const two = "jobs:\n  a:\n    steps:\n      # codeql[actions/x]\n      - run: echo \"${{ github.event.issue.title }}\" # zizmor: ignore[template-injection]\n      - run: echo \"${{ github.event.pull_request.title }}\"\n";
passes(two, "silencing comments where they stood", two);
fails(two.replace(" # zizmor: ignore[template-injection]\n", "\n").replace("pull_request.title }}\"\n", "pull_request.title }}\" # zizmor: ignore[template-injection]\n"), "a silencing comment moved to another line", "added or moved", two);
fails(two.replace("      # codeql[actions/x]\n", "").replace("      - run: echo \"${{ github.event.pull_request", "      # codeql[actions/x]\n      - run: echo \"${{ github.event.pull_request"), "a silencing comment line moved before another line", "added or moved", two);
passes(two.replace(" # zizmor: ignore[template-injection]", ""), "a silencing comment taken off its line", two);
const steps2 = "jobs:\n  a:\n    steps:\n      # nosemgrep: run-shell-injection\n      - name: One # zizmor: ignore[template-injection]\n        run: echo one\n      - name: Two\n        run: echo \"${{ github.event.pull_request.title }}\"\n";
fails(steps2.replace("      # nosemgrep: run-shell-injection\n", "").replace("      - name: Two", "      # nosemgrep: run-shell-injection\n      - name: Two"), "a silencing comment line moved from one step to another, their names read alike", "added or moved", steps2);
fails(steps2.replace("One # zizmor: ignore[template-injection]", "One").replace("- name: Two", "- name: Two # zizmor: ignore[template-injection]"), "a silencing note moved from one step's name to another's", "added or moved", steps2);
passes(steps2.replace("- name: One #", "- name: First #"), "a step renamed beside its silencing note", steps2);
passes(edit(' # a quoted value', ""), "a comment after a quoted value taken out");
passes(edit("[opened, synchronize] # the kinds", "[opened, synchronize] # what starts it"), "a comment after [ ] changed");
passes(edit("      - name: The check", "\n\n      - name: The check").replace("permissions:", "\npermissions:"), "blank lines between entries");
passes(edit("        env:", "        # about env, after the block\n        env:"), "a comment after a block scalar, less indented than its text");
passes(edit("        run: >-", "        run: >- # folded"), "a comment on a block scalar's header");
passes(edit("      - name: The check", "      - name: The checks, all of them"), "a step's name changed");
passes(edit("'Single'", '"Double, quoted"'), "a step's name quoted another way and changed");
passes(edit("      - name: The check", "      - name: Checked # with a comment").replace("# the kinds", "# kinds of event"), "a step's name and comments changed together");
passes(edit("      - name: The check", "      - name: Nullable check"), "a step's name that only begins with a word YAML reserves");
for (const name of ["null", "~", "true", "Yes", "off", "123", "1st check", "''", '""']) fails(edit("      - name: The check", `      - name: ${name}`), `a step's name YAML may read as no text, or none: ${name}`);
const compact = "jobs:\n  a:\n    steps:\n    - name: First\n      run: echo\n    - uses: x # pinned\n";
passes(compact.replace("First", "Second"), "a step's name in steps written at their key's own indentation", compact);

// ---- what fails: text, not comments; keys named `name` that are no step's; anything not read for sure ----
fails(edit("# the shell's own comment", "# the shell's comment, changed"), "a # line inside a run block is the script's text", "more than a comment");
fails(edit("# data, not a comment", "# other data"), "a heredoc's # line inside a run block");
fails(edit('echo "a #b"', 'echo "a #c"'), "text after # inside a run block");
fails(edit("          echo folded", "          # a line\n          echo folded"), "a # line added inside a block scalar");
fails(edit("        run: echo hi", "        run: |\n          echo hi"), "a value turned into a block scalar");
fails(edit("          EOF\n", "          EOF\n\n"), "a blank line added inside a block scalar");
fails(BASE.replace(/\n$/u, ""), "the last line's break taken off a block scalar");
fails(edit("          - name: one", "          - name: two"), "a matrix entry's name");
fails(edit("          name: an-input", "          name: another-input"), "an input named `name`");
fails(edit("    name: Build", "    name: Built"), "a job's name");
fails(edit("name: t", "name: u"), "the workflow's name");
fails(edit("github.ref }}", "github.sha }}"), "a step's name with an expression");
fails(edit("      - name: The check", "      - name: ${{ secrets.X }}"), "an expression put into a step's name");
fails(edit("'Single'", '"\\x24{{ toJSON(secrets) }}"'), "an expression spelt with an escape in a quoted step's name");
fails(edit("'Single'", '"a \\\\ b"'), "any backslash in a step's name");
fails(edit("runs-on: ubuntu-latest", "runs-on: windows-latest"), "a value");
fails(edit("        shell: bash\n", ""), "a line taken out");
fails(edit("persist-credentials: false", "persist-credentials: false#x"), "a # with no space before it is text");
fails(edit('X: "y"', 'X: "y # z"'), "a # inside quotes is text");
fails(edit("        run: echo hi", "        name: also\n        run: echo hi").replace("        name: also", "        name: other"), "a step's name that is not its first key",
  "", edit("        run: echo hi", "        name: also\n        run: echo hi"));
const composite = "name: c\nruns:\n  using: composite\n  steps:\n    - name: First # a note\n      shell: bash\n      run: echo\n";
passes(composite.replace("# a note", "# another"), "a composite action's comment", composite);
fails(composite.replace("First", "Second"), "a composite action's step's name", "", composite);
const nested = "jobs:\n  a:\n    with:\n      steps:\n        - name: x\n";
fails(nested.replace("x", "y"), "a `name` under steps that are no job's", "", nested);

const unread = (text, what, why) => { const r = readYaml(text); ok(r.unread.length > 0 && r.unread.join(" ").includes(why), what, r.unread.join("; ") || "read"); fails(text, `${what}: no proof`, "", text); };
unread(edit("        run: echo hi", '        run: "echo a\n          # in the string"'), "a double-quoted value that runs on", "runs on");
unread(edit("        run: echo hi", "        run: 'echo a\n          # in the string'"), "a single-quoted value that runs on", "runs on");
unread(edit("        if: ${{ !cancelled() }}", "        if: github.a &&\n          github.b"), "a plain value that runs on", "runs on");
unread(edit("        if: ${{ !cancelled() }}", "        if: github.a &&\n          - github.b"), "a plain value that runs on to a line that looks like an item", "runs on");
unread(edit("          name: an-input", "          name: an-input\n            - name: more"), "a value that runs on to a line that looks like a step's name", "runs on");
unread(edit("        run: echo hi", "        run:\n          echo hi"), "a value on a line of its own", "a line of its own");
unread(edit("[opened, synchronize]", '["opened", synchronize]'), "a quote inside [ ]", "inside [ ] or { }");
unread(edit("[opened, synchronize] # the kinds", "[opened, # the kinds\n      synchronize]"), "[ ] that runs on to the next line", "inside [ ] or { }");
unread(edit("[opened, synchronize] # the kinds", "[opened,\n      synchronize]"), "[ ] that runs on to the next line, with no #", "runs on");
unread(edit("  contents: read", "  contents: &r read"), "an anchor", "anchor");
unread(edit("  contents: read", "  contents: *r"), "an alias", "alias");
unread(edit("  contents: read", "  <<: *r"), "a merge key", "alias");
unread(edit("  contents: read", "  contents: !!str read"), "a tag", "tag");
unread(edit("  contents: read", "  ? contents\n  : read"), "an explicit key", "explicit key");
unread(`---\n${BASE}`, "a document marker", "document marker");
unread(edit("  contents: read", "  contents: read: write"), "two keys on one line", "two keys");
unread(edit("          echo folded", "          echo folded\n        # less indented\n          echo after"), "text after a less indented comment in a block", "a line of its own");
for (const [ch, name] of [["\t", "a tab"], ["\r", "a carriage return"], ["\u2028", "a line separator"], ["\u2029", "a paragraph separator"], ["\u0085", "a next line"], ["\ufeff", "a byte order mark"], ["\u0000", "a null"]]) {
  unread(edit("# A workflow for the test", `# A workflow ${ch}for the test`), `${name}, even in a comment`, "control character");
}
const fixed = "jobs:\n  a:\n    steps:\n      - run: |2\n          # text\n        echo\n";
fails(fixed.replace("# text", "# other"), "a # line in a block scalar with its indentation given", "", fixed);
passes(fixed.replace("      - run: |2", "      # before\n      - run: |2"), "a comment before a block scalar with its indentation given", fixed);

// ---- this repository's own workflows: each that reads takes a comment and a step's name ----
const files = execFileSync("git", ["ls-files", "-z", ".github/workflows"], { cwd: root, encoding: "utf8" }).split("\0").filter(f => /\.ya?ml$/iu.test(f));
const own = files.map(f => [f, fs.readFileSync(path.join(root, f), "utf8").replace(/\r\n/gu, "\n")]).filter(([, text]) => readYaml(text).unread.length === 0);
ok(own.length > 0, `${own.length} of this repository's ${files.length} workflows read`);
for (const [f, text] of own) {
  const r = proof(text, `# a comment added\n${text}`);
  const named = readYaml(text).lines.find(l => l.stepName);
  const renamed = named ? text.split("\n").map((line, i) => (i + 1 === named.n ? `${line.slice(0, named.valueAt)}Renamed for the test` : line)).join("\n") : text;
  const s = proof(text, renamed);
  ok(r.same === true && s.same === true, `${f}: a comment added${named ? " and a step renamed" : ""}`, r.why ?? s.why);
}

// ---- which files it reads, and which outside it refuses (a short name tried here, not on a disk: Windows would write
// CLAUDE~1/settings.json into .claude/) ----
ok([".github/workflows/x.yml", ".GitHub/x.md", "a/.claude/b", ".claude", "sub/.github", "action.yml", "tools/act/Action.YAML"].every(f => RUNS.test(f))
  && !["github/x.yml", "x.github/y", "my-action.yml", "action.yml.md"].some(f => RUNS.test(f)), "what it reads: .github/ and .claude/, the folders themselves too, at any depth and in any case, and every action.yml");
ok(["CLAUDE~1/settings.json", "GITHUB~1/workflows/x.yml", "a/b~2c/d", ".mcp.json", "x/package.json", "yarn.lock", ".vscode/settings.json", "core/x", "Dockerfile.ci", ".gitmodules",
  "Directory.Build.targets", "src/App.csproj", "Directory.Packages.props", "NuGet.Config", "global.json", ".config/dotnet-tools.json", "src/packages.lock.json",
  ".yarnrc.yml", ".npmrc", ".node-version", ".nvmrc", ".devcontainer.json", ".husky/pre-commit", ".pre-commit-config.yaml", ".envrc", "Makefile", "GNUmakefile", "justfile", "Taskfile.yml", ".tool-versions", "mise.toml", ".mise.toml"].every(f => RUNS_TOO.test(f))
  && !["docs/about~notes.md", "src/core/x.mjs", "README.md", "scripts/x.mjs", "packages.md"].some(f => RUNS_TOO.test(f)), "what it refuses outside: a short name with ~ and a digit, the tools', packages' and builds' files, git's hooks, a task runner's file, the copy of the core");

// ---- the script end to end, on a pull request's branch ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "comment-only-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$)|TOKEN|SECRET|PASSWORD|CREDENTIAL/iu.test(name)));
Object.assign(env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid",
  GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_ALLOW_PROTOCOL: "file", GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.autocrlf", GIT_CONFIG_VALUE_0: "false" });
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const write = (dir, f, text) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
const origin = path.join(tmp, "origin.git"), work = path.join(tmp, "work");
git(tmp, "init", "-q", "--bare", "-b", "main", origin);
git(tmp, "clone", "-q", origin, work);
const WF = ".github/workflows/t.yml";
write(work, WF, BASE);
write(work, ".claude/settings.json", "{}\n");
write(work, ".github/CODEOWNERS", "* @someone\n");
write(work, "tools/.Claude/notes.md", "notes\n");
write(work, "README.md", "readme\n");
const ACTION = "name: a\nruns:\n  using: composite\n  steps:\n    - name: First # a note\n      shell: bash\n      run: echo\n";
write(work, "action.yml", ACTION);
git(work, "add", "-A");
git(work, "commit", "-q", "-m", "main");
git(work, "push", "-q", "origin", "HEAD:main");
const MAIN = git(work, "rev-parse", "HEAD");
const branch = (name, change, add = true) => { git(work, "checkout", "-q", "-f", "-B", name, MAIN); change(); if (add) git(work, "add", "-A"); git(work, "commit", "-q", "-m", name); return git(work, "rev-parse", "HEAD"); };
const run = (...args) => { const r = spawnSync(process.execPath, [script, ...args], { cwd: work, env, encoding: "utf8" }); return { status: r.status, out: `${r.stdout}${r.stderr}` }; };

const COMMENTS = edit("# the kinds", "# what starts it", edit("- name: The check", "- name: Checked"));
let head = branch("comments", () => write(work, WF, COMMENTS));
let r = run();
ok(r.status === 0 && r.out.includes(`comments and steps' names alone in .github/, .claude/ and actions, ${MAIN.slice(0, 7)}..${head.slice(0, 7)}: ${WF}`)
  && r.out.includes(`checked head ${head}`) && !r.out.includes("also changed"), "a comment and a step's name changed, nothing else: proven, the head printed", r.out);
write(work, WF, edit("runs-on: ubuntu-latest", "runs-on: windows-latest"));
r = run();
ok(r.status === 0, "the working tree is not read: the head commit is", r.out);
git(work, "checkout", "-q", "--", WF);

head = branch("and-outside", () => { write(work, WF, COMMENTS); write(work, "scripts/x.mjs", "// a script\n"); });
r = run();
ok(r.status === 2 && r.out.includes(`: ${WF}`) && r.out.includes("also changed, outside what this proof reads: scripts/x.mjs")
  && r.out.includes("says of each of these why it runs neither by itself nor with credentials") && r.out.includes(`checked head ${head}`),
  "a file changed outside what it reads: proven for what it reads, the file listed, and not passed (2) until the session says of it", r.out);
for (const file of [".mcp.json", "package.json", "web/package-lock.json", ".vscode/tasks.json", ".devcontainer/devcontainer.json", "core/scripts/x.mjs", ".gitattributes", "Dockerfile"]) {
  branch(`too-${file.replace(/\W/gu, "-")}`, () => { write(work, WF, COMMENTS); write(work, file, "{}\n"); });
  r = run();
  ok(r.status === 1 && r.out.includes(`NOT ALONE ${file}: a file that runs by itself or decides what does`), `${file}, which runs by itself or decides what does: refused`, r.out);
}

branch("code", () => write(work, WF, edit("echo hi", "echo bye")));
r = run();
ok(r.status === 1 && r.out.includes(`NOT ALONE ${WF}: more than a comment`) && r.out.includes("floor rule 3's two security reviews"), "a run line changed: refused", r.out);

branch("added", () => write(work, ".github/workflows/new.yml", "# only a comment\n"));
r = run();
ok(r.status === 1 && r.out.includes("NOT ALONE .github/workflows/new.yml: added, deleted"), "a workflow added: refused", r.out);

branch("deleted", () => fs.rmSync(path.join(work, WF)));
r = run();
ok(r.status === 1 && r.out.includes(`NOT ALONE ${WF}: added, deleted`), "a workflow deleted: refused", r.out);

branch("mode", () => git(work, "update-index", "--chmod=+x", WF), false);
r = run();
ok(r.status === 1 && r.out.includes(`NOT ALONE ${WF}: added, deleted, or its mode`), "a workflow's mode changed: refused", r.out);

branch("settings", () => write(work, ".claude/settings.json", '{ "hooks": {} }\n'));
r = run();
ok(r.status === 1 && r.out.includes("NOT ALONE .claude/settings.json: not a YAML file"), "Claude Code's settings changed: refused", r.out);

branch("owners", () => write(work, ".github/CODEOWNERS", "* @someone-else\n"));
r = run();
ok(r.status === 1 && r.out.includes("NOT ALONE .github/CODEOWNERS: not a YAML file"), "a file under .github/ that is not YAML: refused", r.out);

branch("nested", () => write(work, "tools/.Claude/notes.md", "notes, changed\n"));
r = run();
ok(r.status === 1 && r.out.includes("NOT ALONE tools/.Claude/notes.md"), "a .claude folder deeper down and in another case: read as one", r.out);

branch("action-code", () => write(work, "action.yml", ACTION.replace("run: echo", "run: echo more")));
r = run();
ok(r.status === 1 && r.out.includes("NOT ALONE action.yml: more than a comment"), "a project's own action outside .github/: its run line read", r.out);
head = branch("action-comment", () => write(work, "action.yml", ACTION.replace("# a note", "# another note")));
r = run();
ok(r.status === 0 && r.out.includes(`and actions, ${MAIN.slice(0, 7)}..${head.slice(0, 7)}: action.yml`), "a project's own action: a comment alone proven", r.out);

branch("binary", () => fs.writeFileSync(path.join(work, WF), Buffer.from([0x23, 0x20, 0xff, 0xfe, 0x0a])));
r = run();
ok(r.status === 1 && r.out.includes(`NOT ALONE ${WF}: not text in UTF-8`), "a workflow that is not UTF-8: refused", r.out);

head = branch("outside", () => write(work, "README.md", "readme, changed\n"));
r = run();
ok(r.status === 2 && r.out.includes("nothing changed in .github/, .claude/ or an action.yml") && r.out.includes("also changed, outside what this proof reads: README.md"), "nothing changed under .github/ or .claude/: said, and the files outside listed", r.out);

const reviewed = branch("later", () => write(work, WF, edit("echo hi", "echo bye")));
write(work, WF, edit("# A workflow for the test", "# A note added after the review", edit("echo hi", "echo bye")));
git(work, "commit", "-q", "-am", "a comment");
head = git(work, "rev-parse", "HEAD");
r = run(reviewed);
ok(r.status === 0 && r.out.includes(`${reviewed.slice(0, 7)}..${head.slice(0, 7)}: ${WF}`), "a later commit read against the one reviewed: only what it changes", r.out);
r = run();
ok(r.status === 1, "the same branch against main: refused, for the change reviewed before", r.out);
r = run(git(work, "rev-parse", "comments"));
ok(r.status === 1 && r.out.includes("is no commit before the head that it grew from"), "a commit given that the head did not grow from: refused", r.out);

// a link where it reads, on the side reviewed: what it points to is not read
const linked = branch("link", () => { const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], { cwd: work, env, input: "hooks.yml" }).toString().trim(); git(work, "update-index", "--add", "--cacheinfo", `120000,${blob},.claude/hooks.yml`); }, false);
write(work, WF, COMMENTS);
git(work, "add", "--", WF);
git(work, "commit", "-q", "-m", "a comment after the link");
r = run(linked);
ok(r.status === 1 && r.out.includes(`NOT ALONE .claude/hooks.yml: a link or submodule, at ${linked.slice(0, 7)}`), "a link under .claude/ on the side reviewed: refused", r.out);

// a link named .claude deeper down, on the side reviewed
const linkedFolder = branch("link-folder", () => { const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], { cwd: work, env, input: "cfg" }).toString().trim(); git(work, "update-index", "--add", "--cacheinfo", `120000,${blob},sub/.claude`); }, false);
write(work, WF, COMMENTS);
git(work, "add", "--", WF);
git(work, "commit", "-q", "-m", "a comment after the link");
r = run(linkedFolder);
ok(r.status === 1 && r.out.includes("NOT ALONE sub/.claude: a link or submodule"), "a link that is itself named .claude: refused", r.out);
r = run("HEAD");
ok(r.status === 1 && r.out.includes("is no commit before the head"), "the head given as the commit reviewed: refused, nothing being read", r.out);

// main moves on: a head not up to date with it is not the head that merges
git(work, "checkout", "-q", "-f", "-B", "moved", MAIN);
write(work, "README.md", "main moved on\n");
git(work, "commit", "-q", "-am", "main moves on");
git(work, "push", "-q", "origin", "HEAD:main");
branch("behind", () => write(work, WF, COMMENTS));
r = run();
ok(r.status === 1 && r.out.includes("the head is not up to date with main"), "a head behind main: refused until it is brought up to date", r.out);

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the proof that a change is comments and steps' names alone`);
process.exitCode = failed ? 1 : 0;
