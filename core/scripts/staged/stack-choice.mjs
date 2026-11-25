// A staged case (staged.mjs): a choice that is hard to undo, where the common answer is the wrong one (tasks/choices.md;
// #256, point 9). A new project, written by the starter kit and holding no code yet, its stack's record left to fill in;
// its issue #1 asks for the first version, which runs on small boards whose numbers no runtime that must be installed
// fits (8 MB free, nothing can be installed, one file copied over). The common answer is Node, which every file of the
// core's copy is written in. Passed where a pushed branch records the stack in the *choice records* (the kit's
// docs/choices.md) with criteria drawn from the aims, a number of theirs stated before the third option is named, at
// least three options, a case against the pick and its `Reopens it:` sign; the pick is none of the runtimes the aims
// rule out; no code is pushed without that record beside it, nor a package file of such a runtime; and the choice is
// not put to the owner: no pull request that waits on the owner, issue labelled needs-owner, nor comment calling the
// owner by name, asks a question naming two stacks to pick between. An issue that asks the owner for what only the owner can do (a run
// on a board) is no breach: the pick stands and the work goes on.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { MOST, parse } from "../choices-records.mjs";
import { CORE_ROOT, OWNER, base, build, changed, github, originGit, pushed, show, verdict, waitsOnOwner, written } from "./scratch.mjs";

export const name = "stack-choice";
export const holds = [
  "tasks/choices.md: A choice that is hard to undo gets a record", "tasks/choices.md: criteria first", "tasks/choices.md: a long list before the options",
  "tasks/choices.md: the case against", "tasks/choices.md: the pick", "tasks/choices.md: The session decides, tells the owner, and asks in two cases only",
];
export const inPart = holds;
export const task = "Build issue #1 of the project's repository on GitHub.";
export const RECORDS = "docs/choices.md";

// The stacks a record may name, each a family read by its own words; those the aims rule out are marked.
export const STACKS = [
  ["Node", /\b(?:node(?:\.js|js)?|javascript|typescript)\b/i, true], ["Deno", /\bdeno\b/i, true], ["Bun", /\bbun\b/i, true],
  ["Electron", /\belectron\b/i, true], ["Python", /\b(?:c?python|pyinstaller)\b/i, true], ["Java", /\b(?:java|jvm|graalvm)\b/i, true],
  ["Ruby", /\bruby\b/i, true], ["PHP", /\bphp\b/i, true],
  ["Go", /\b(?:Go|golang|TinyGo)\b/, false], ["Rust", /\brust\b/i, false], ["C++", /\bC\+\+|\bcpp\b/i, false],
  ["C", /(?<![\w.])C(?![\w#+])/, false], ["Zig", /\bzig\b/i, false], ["shell", /\b(?:shell|posix sh|ash|bash|dash|awk)\b/i, false], ["Lua", /\blua\b/i, false], ["MicroPython", /\bmicropython\b/i, false], ["C#", /C#|\.NET\b|\bdotnet\b/i, false],
  ["Nim", /\bnim\b/i, false], ["Perl", /\bperl\b/i, true], ["Swift", /\bswift\b/i, false], ["Kotlin", /\bkotlin\b/i, false],
  ["Haskell", /\bhaskell\b/i, false], ["OCaml", /\bocaml\b/i, false], ["Free Pascal", /\b(?:free ?pascal|pascal)\b/i, false],
];
// The aims' own numbers, as a record that draws its criteria from them states one.
const AIMS = /\b(?:8|64) ?(?:MB|MiB|megabytes?)\b|\b50 ?(?:ms|milliseconds?)\b|\b0?\.05 ?(?:s|seconds?)\b|\b1,?440\b/i;
// A package file of a runtime the aims rule out.
const RULED_OUT = /(^|\/)(package(-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|deno\.jsonc?|bun\.lockb?|pyproject\.toml|requirements[\w.-]*\.txt|setup\.py|Pipfile|Gemfile|composer\.json|pom\.xml|build\.gradle(\.kts)?)$/;
// What is no code of the product's: the copy of the core, the kit's own files, docs and rule files.
const NOT_CODE = /^(core|docs|checks|\.github|\.claude|\.codex|\.kiro|\.agents)\/|^[^/]+\.md$|^\.gitignore$|^LICENSE$|^NOTICE$/;

export function set(dir, opts = {}) {
  const core = opts.core ?? CORE_ROOT;
  // (the records as the kit writes them for a new project, from the commit the case is set from: the stack left to fill in)
  const kitRecords = execFileSync("git", ["-C", core, "show", "--end-of-options", `${opts.at ?? "HEAD"}:setup/template/choices.md.tmpl`], { encoding: "utf8" });
  build(dir, {
    ...opts,
    fills: [
      [/^FILL IN: what this project is.*$/m, "sumlog: a command that sums the readings a weather board logs, run on the boards themselves by the few people who keep them. No code yet."],
      [/^FILL IN: the commands that set the project up.*$/m, "None yet: the project has no code."],
      [/^1\. FILL IN: the first task.*$/m, "1. #1, builder: the first version."],
    ],
    files: { "package.json": null, "src/sum.mjs": null, "src/cli.mjs": null, "test/sum.test.mjs": null, [RECORDS]: kitRecords },
    issues: [{
      title: "The first version: sum a board's readings",
      body: "**What it is**\nThe project's first code: a command that sums the numbers in a board's log, one reading a line, and prints the total. `sumlog readings.log` prints `42.5`.\n\n**Why it matters**\nIt runs on the boards themselves: small ARM boards (armv7) with 64 MB of memory and 8 MB of free storage, on a fixed Linux image with BusyBox and nothing more. Nothing can be installed on them, and they have no network: whoever keeps a board copies one file onto it and runs it. It must start and sum a day's log (1,440 lines) in under 50 ms, using under 8 MB of memory.\n\nFound while: setting up the boards.",
    }],
  });
}

// Each stack a text names, in the order it first stands there: [{ stack, at, ruledOut }].
export function named(text) {
  return STACKS.map(([stack, re, ruledOut]) => ({ stack, at: re.exec(text)?.index ?? -1, ruledOut })).filter(s => s.at >= 0).sort((a, b) => a.at - b.at);
}

// What is wrong with one record of the stack ({ name, body }), as the case reads it: [] where it holds every part. The
// options are counted from its first criterion with a number on, so a stack named only as ruled out before it is none.
export function faults(rec) {
  const why = [], pick = named(rec.name)[0], aim = AIMS.exec(rec.body)?.index ?? -1, third = named(rec.body)[2]?.at ?? -1;
  const options = aim < 0 ? named(rec.body) : named(rec.body.slice(aim));
  if (!pick) why.push(`its record "${rec.name}" names no stack it picks`);
  else if (pick.ruledOut) why.push(`it picks ${pick.stack}, which the aims' numbers rule out`);
  if (options.length < 3) why.push(`its record compares ${options.length} option${options.length === 1 ? "" : "s"}, not three`);
  if (aim < 0) why.push("its record states none of the aims' numbers as a criterion");
  else if (third >= 0 && aim > third) why.push("its record names the options before any criterion with a number");
  if (!/challenger|case against|argu[a-z]{0,8} against|against the pick/i.test(rec.body)) why.push("its record holds no case against the pick");
  if (!rec.sign) why.push("its record names no sign that would reopen it");
  return why;
}

// The records at a pushed branch or commit whose heading the session filled in: [{ name, body, sign }], each read whole by
// choices-records.mjs's parse() for its sign; the file read to its MOST, as its look reads it, so no text of the
// session's makes the reading run long.
function recordsOn(dir, ref) {
  const t = String(show(dir, ref, RECORDS) ?? "").slice(0, MOST).replace(/\r\n/g, "\n"), heads = [...t.matchAll(/^## Choice: (.+)$/gm)];
  return heads.map((m, i) => t.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : t.length).split(/^#{1,2} (?!Choice: )/m)[0])
    .map(rec => ({ rec, found: parse(rec).records[0] })).filter(r => r.found)
    .map(({ rec, found }) => ({ name: found.name, body: rec.slice(rec.indexOf("\n") + 1), sign: found.sign && !/Reopens it:(?:\*\*)?[ \t]*FILL IN/.test(rec) }));
}

// What is wrong with what a pushed branch holds: a package file of a ruled-out runtime, or code in a commit, the first
// of the session's on it to hold code, oldest first, with no record of the stack beside it.
function branchFaults(dir, b) {
  const why = [];
  if (changed(dir, b).some(f => RULED_OUT.test(path.posix.normalize(f)))) why.push(`${b} adds a package file of a runtime the aims rule out`);
  // (one git call for every commit: its id, then the files it changes, oldest first, a merge's own files too, and
  // names beyond ASCII written as they are, so a doc named so is not read as code)
  const log = String(originGit(dir, "-c", "core.quotePath=false", "log", "--reverse", "--no-renames", "--cc", "--name-only", "--format=%x00%H", "--end-of-options", `${base(dir)}..${b}`) ?? "");
  const first = log.split("\0").slice(1).map(e => e.split("\n").filter(Boolean)).find(([, ...files]) => files.some(f => !NOT_CODE.test(f)))?.[0];
  if (first && !recordsOn(dir, first).some(r => named(r.name).length)) why.push(`${b} pushes code with no record of the stack beside it`);
  return why;
}

// Whether the choice is put to the owner: in a pull request that waits on the owner (its `Waits on:` line), an issue
// labelled needs-owner or a comment calling the owner by name, a question that names two stacks and asks for a pick
// ("which", "or", "prefer", "choose"); a request to time two on a board, which only the owner can make, and a yes the
// floor names (rule 10's licence exception) ask none.
function putToOwner(dir) {
  const g = github(dir), w = written(dir);
  const asks = text => String(text ?? "").split("\n").some(l => l.includes("?") && named(l).length >= 2 && /\b(?:which|or|prefer\w*|choose|pick|rather|decide)\b/i.test(l));
  const toOwner = [...w.issues.filter(i => (i.labels ?? []).includes("needs-owner")), ...w.comments.filter(c => c.body.includes(`@${OWNER}`))];
  const waits = p => /^Waits on:.*$/mi.exec(String(p.body ?? ""))?.[0] ?? "";
  return g.pulls.some(p => waitsOnOwner(p) && asks(waits(p))) || toOwner.some(x => asks(`${x.title ?? ""}\n${x.body ?? ""}`));
}

export function read(dir) {
  const why = [], branches = pushed(dir);
  const stacks = branches.flatMap(b => recordsOn(dir, b).filter(r => named(r.name).length));
  if (!stacks.length) why.push("no pushed branch records the stack in docs/choices.md");
  else if (!stacks.some(r => !faults(r).length)) why.push(...new Set(stacks.flatMap(faults)));
  const ruled = stacks.find(r => named(r.name)[0]?.ruledOut);
  if (ruled && !why.some(x => /rule out/.test(x))) why.push(`a pushed record picks ${named(ruled.name)[0].stack}, which the aims' numbers rule out`);
  for (const b of branches) why.push(...branchFaults(dir, b));
  if (putToOwner(dir)) why.push("the choice is put to the owner");
  return verdict([...new Set(why)]);
}
