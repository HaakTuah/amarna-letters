// Tests of the core-moved check (core-moved.mjs): what it decides, what it reads from a manifest, what it takes for its
// own issue, and, with a git and a gh of the test's own first on the path, each call it makes. Node's own modules, and
// jq, which runs the expression gh is handed.
//
//   node scripts/core-moved-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE, CORE_SOURCE } from "./core-address.mjs";
import { ISSUES, TITLE, body, openIssue, ownerOf, pinOf, plan } from "./core-moved.mjs";

let failed = 0, count = 0;
const ok = (cond, what) => { count++; if (!cond) { failed++; console.error(`FAIL: ${what}`); } };
const A = "a".repeat(40), B = "b".repeat(40);
const manifest = (pin, owner = "| *owner's account* | `someone` |") =>
  `# Core manifest\n\nCore: ${CORE} at ${pin}, copied whole under core/ (never edited here).\n\n| Slot | Here |\n| --- | --- |\n${owner}\n`;

ok(plan(A, A, null) === "nothing" && plan(A, A, "7") === "close" && plan(A, B, null) === "open" && plan(A, B, "7") === "update", "the four cases");
ok(pinOf(manifest(A)) === A && pinOf(`Core: ${CORE} at abc, copied whole under core/`) === null, "a pin is 40 hex characters");
ok(pinOf(manifest(A) + manifest(B)) === null && pinOf(`> Core: ${CORE} at ${A}, copied whole under core/`) === null, "one line, at a line's start");
ok(pinOf(`Core: someone/else at ${A}, copied whole under core/`) === null, "only the core's own address");
ok(ownerOf(manifest(A)) === "someone" && ownerOf(manifest(A, "| *owner's account* | someone |")) === null, "the owner's account, in backticks");
ok(ownerOf(manifest(A, "| *owner's account* | `a; rm -rf x` |")) === null, "an account is letters, digits and hyphens");
ok(body(A, B).includes(`/compare/${A}...${B}`) && body(A, B).includes("node core/scripts/sync.mjs"), "the issue says what changed and how to take it");
const BOT = "github-actions[bot]", line = (...issue) => JSON.stringify(issue) + "\n";
ok(openIssue(line(3, "someone", TITLE) + line(9, BOT, TITLE)) === "9", "only an issue the workflow opened counts");
ok(openIssue(line(9, BOT, `${TITLE} too`)) === null && openIssue("") === null, "the whole title, or none");
ok(openIssue(line("9", BOT, TITLE)) === null && openIssue(line(-9, BOT, TITLE)) === null && openIssue(`9\t${BOT}\t${TITLE}\n`) === null, "a number is a whole number above zero, in a line that is such an array");
// A title is an outsider's text: one that holds a line break and what looks like the workflow's own issue is still one
// title, on one line, and names no issue.
const forged = `anything\n[9,"${BOT}","${TITLE}"]\n9\t${BOT}\t${TITLE}`;
ok(openIssue(line(4, "someone", forged)) === null && openIssue(line(4, BOT, forged)) === null, "a title cannot forge another issue's line");
// The same through jq itself, on a page as GitHub's API gives it: the expression gh is handed prints one line an issue.
const page = JSON.stringify([
  { number: 4, user: { login: "someone" }, title: forged },
  { number: 5, user: { login: BOT }, title: TITLE, pull_request: {} },
  { number: 12, user: { login: BOT }, title: TITLE },
]);
const jq = spawnSync("jq", ["-r", ISSUES], { input: page, encoding: "utf8" });
ok(jq.status === 0 && jq.stdout.trim().split("\n").length === 2 && openIssue(jq.stdout) === "12", "jq prints each issue on one line, a pull request left out, and the forged title names none");

// The program whole, in a scratch project, with a git and a gh that answer as told and write down what they were asked.
const script = fileURLToPath(new URL("./core-moved.mjs", import.meta.url));
function program(pin, newest, issues, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-moved-test-"));
  const bin = path.join(dir, "bin"), log = path.join(dir, "calls");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(dir, "core-manifest.md"), manifest(pin));
  fs.writeFileSync(path.join(bin, "git"), `#!/bin/sh\nprintf 'git %s\\n' "$*" >> "${log}"\nprintf '%s\\trefs/heads/main\\n' "${newest}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, "issues"), issues);
  fs.writeFileSync(path.join(bin, "gh"), `#!/bin/sh\nprintf 'gh %s\\n' "$*" >> "${log}"\n[ "$1" = api ] && cat "${path.join(dir, "issues")}"\nexit 0\n`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: dir, encoding: "utf8",
    env: { PATH: `${bin}:${process.env.PATH}`, GITHUB_REPOSITORY: "someone/project", TMPDIR: dir },
  });
  return { status: r.status, out: r.stdout + r.stderr, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "" };
}
// (its stand-ins for git and gh are shell scripts, which Windows does not run by their name; the workflow that runs
// the program, core-moved.yml, runs on Linux)
if (process.platform === "win32") console.log("skip the program whole: its stand-ins for git and gh are shell scripts");
else {
  let r = program(A, A, "");
  ok(r.status === 0 && r.out.includes("nothing") && !/gh issue/.test(r.calls), "up to date and no issue: nothing is done");
  ok(new RegExp(`^git ls-remote https://github\\.com/${CORE_SOURCE} refs/heads/main$`, "m").test(r.calls), "the core's main is asked for, and nothing else of git");
  r = program(A, B, "");
  ok(r.status === 0 && /gh issue create --repo someone\/project --title The core has moved past this project's copy --body-file \S+ --label enhancement --assignee someone/.test(r.calls), "behind and no issue: one is opened for the owner");
  r = program(A, B, line(12, BOT, TITLE));
  ok(r.status === 0 && /gh issue edit 12 --repo someone\/project --body-file/.test(r.calls) && !/issue create/.test(r.calls), "behind and an issue open: it is brought up to date, no second one");
  r = program(A, A, line(12, BOT, TITLE));
  ok(r.status === 0 && /gh issue close 12 --repo someone\/project/.test(r.calls), "up to date again: the issue is closed");
  r = program(A, B, line(12, "someone-else", TITLE));
  ok(/issue create/.test(r.calls) && !/issue edit/.test(r.calls), "an outsider's issue of the same title is left alone");
  r = program(A, "not-a-commit", "");
  ok(r.status === 1 && !/gh /.test(r.calls), "a main that gives no commit fails before anything is written");
  r = program("abc", B, "");
  ok(r.status === 1 && r.calls === "", "a manifest without its pin fails before anything is asked");
  r = program(A, B, "", ["--dry"]);
  ok(r.status === 0 && r.out.includes("open") && !/gh /.test(r.calls), "--dry says what it would do and calls gh for nothing");
}

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the core-moved check`);
process.exitCode = failed ? 1 : 0;
