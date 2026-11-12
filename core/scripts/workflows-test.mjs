// Checks the workflow check (workflows.mjs, beside this file): the forbidden trigger is found however it is written,
// and the core's own workflows pass. Run by the core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/workflows-test.mjs
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { lines, readable, reads, unlinked } from "./workflows.mjs";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const fails = text => lines(text).length > 0;

ok(!fails("on: [pull_request, push]\non:\n  pull_request:\n  workflow_run:\n    workflows: [build]\n") && !fails("") && !fails("pull_request\n_target\npull_request target\n"), "the other triggers pass, and so does the word in two halves that nothing joins");
ok(fails("on:\n  pull_request_target:\n") && fails("on: pull_request_target\n") && fails("on: [push, pull_request_target] # the labeller\n"), "the trigger fails as a key, as a value and in a list with a comment after it");
ok(fails(`on: { "pull_request_target": {} }\n`) && fails("on:\n  'pull_request_target':\n") && fails("on:\n  ? pull_request_target\n  : {}\n") && fails("x: &t pull_request_target\non: *t\n"), "quoted, in braces, written the long way or behind an alias");
ok(fails(`on: ["pull_request\\x5ftarget"]\n`) && fails(`on: ["pull_request\\u005Ftarget"]\n`) && fails(`on: ["pull_request\\U0000005ftarget"]\n`) && fails(`on: ["\\x70ull_request_target"]\n`), "a name spelled with a YAML escape is read as what it spells");
ok(fails(`on: ["pull_request_\\\n      target"]\n`) && fails(`on: ["pull_\\\n  request_\\\r\n\ttarget"]\n`) && fails(`on: ["pull_request\\x5f\\\n   target"]\n`), "a name broken over two or three lines by an escaped line break is joined, with an escape in it too");
ok(["\r", "\r\n", "\u0085", "\u2028", "\u2029"].every(br => fails(`# ci${br}on: pull_request_target${br}`) && fails(`on: ["pull_request_\\${br}  target"]${br}`)), "every line break YAML knows is one, also when it is escaped");
ok(fails("# never pull_request_target\n") && fails("      - run: echo pull_request_target\n"), "the word in a comment or in a script's text fails too: the check reads no YAML, so it cannot tell them apart");
ok(!fails("      - run: |\n          node a.mjs \\\n            --target x\n") && !fails(`      - run: echo "\\U99999999 \\xZZ \\u12"\n`), "a script's own line that goes on to the next, and an escape that spells nothing, are no finding");
ok(lines("a\nb\non: pull_request_target\n").join() === "3" && lines(`a\non: ["pull_request_\\\n  target"]\nb\non: pull_request_target\n`).join() === "3,5" && lines("pull_request_target pull_request_target\n").join() === "1", "a finding names its line, a joined word the line it ends on, and a line is named once");

ok(fails("on: { push: { branches: ['x\n  #'] }, pull_request_target: {} }\n") && fails("on:\n\u00a0# a comment\u0085  pull_request_target:\n"), "a line that only looks like a comment hides nothing");
const utf16 = Buffer.from("\ufeffon: pull_request_target\n", "utf16le").toString("utf8"), utf16be = Buffer.from("on: pull_request_target\n", "utf16le").swap16().toString("utf8");
ok(!readable(utf16) && !readable(utf16be) && !readable(Buffer.from([0x6f, 0x6e, 0x3a, 0xff, 0xfe]).toString("utf8")) && !fails(utf16), "a file in another encoding, or with bytes that are no text, is not readable (and the word in it is not found, which is why)");
ok(readable("on: push\n") && readable("\ufeffon: push # \u00e6\u00f8\u00e5 \u2713\n") && readable(""), "UTF-8 text is, with a byte order mark and letters beyond ASCII too");
const files = [".github/workflows/a.yml", ".github/workflows/b.yaml", ".github/actions/setup/action.yml", ".github/actions/setup/steps.yml", "tools/act/action.yaml", "action.yml",
  ".github/workflows/c.YML", ".github/dependabot.yml", ".github/ISSUE_TEMPLATE/config.yml", "core/.github/workflows/a.yml", "core/tools/action.yml", "tools/node_modules/a/action.yml", "docs/a.yml", "docs/reaction.yml"];
ok(reads(files).join() === files.slice(0, 7).join(), "it reads the project's own workflows and its actions wherever they lie, whatever the case of the ending, and neither the core's copy nor an installed package's");
ok(unlinked([".github", ".GitHub/workflows", ".github/workflows", ".github/dependabot.yml", "tools/act/action.yaml", "tools/act", "docs/a.yml", ".githubs", "core/.github/workflows/a.yml"]).join() === ".github,.GitHub/workflows,.github/workflows,.github/dependabot.yml,tools/act/action.yaml", "what may be no link: what it reads, and .github itself with everything in it (a linked folder is one entry to git)");

const core = fileURLToPath(new URL("..", import.meta.url));
const own = fs.readdirSync(`${core}.github/workflows`).filter(f => /\.ya?ml$/u.test(f));
ok(own.length > 0 && own.every(f => !fails(fs.readFileSync(`${core}.github/workflows/${f}`, "utf8"))), "the core's own workflows pass");
process.exit(failed ? 1 : 0);
