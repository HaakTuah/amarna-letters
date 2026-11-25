// What the tests of the steps stand on (steps-test.mjs and the files beside it, steps-*-test.mjs): the projects the
// starter kit of this commit writes in a scratch folder, each a git repository with nothing committed, a project held
// in memory for the readers of its workflows, and the timing of a reader's "one pass". Tests only: no project and no
// workflow of the core's uses it. Node's own modules and git only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { differences, fresh, kind, report as freshReport } from "./fresh.mjs";
import { notes as manifestNotes } from "./manifest-reads.mjs";
import { STEPS, configs, notDone, project, report } from "./steps.mjs";
import { moved } from "./step-checks-moved.mjs";
import { hookCommands, readCore } from "./core-path.mjs";
import { READ, TEMPLATES, files, licences, sizes } from "./init.mjs";
import { READERS } from "./shape-readers.mjs";
import { ruleFiles } from "./rule-files.mjs";
import { hostSays, root } from "./scratch-core.mjs";

export const PIN = "a".repeat(40);
const modules = ["roles/shared", "tasks", "tools"].flatMap(d => fs.readdirSync(path.join(root, d)).filter(n => n.endsWith(".md")));

// The kit's project in `name` under `tmp`, written with `o` (init.mjs's options), as `kit(name, o, { at, library, submodule })`
// returns its folder.
export function kitIn(tmp) {
  // (`at`: where the project's copy of the core stands, as its manifest names it, "core/" the default. Its own files then
  // name that path wherever the kit wrote core/, as a project that moved its copy has them: #628. `library`: the folder of a
  // library that carries the core, its files committed here, at `at` inside it, as the manifest's line and the library's
  // own manifest say it, with the floor's own copy in floor-copy/; `submodule`: the library a submodule of the project,
  // which git lists by its commit alone)
  function kit(name, o, { at = "core/", library = null, submodule = false } = {}) {
    const dir = path.join(tmp, name);
    fs.mkdirSync(dir);
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
    hostSays(dir, o.private);
    const there = text => at === "core/" ? text : text.replace(/(?<![\w-])core\//gu, at);
    const readAt = f => at === "core/" ? f : f.replace(/^core\//u, at);
    for (const [to, text] of files({ owner: "someone-else", name, ...o }, PIN, modules, n => fs.readFileSync(path.join(root, TEMPLATES, n), "utf8"))) {
      fs.mkdirSync(path.dirname(path.join(dir, there(to))), { recursive: true });
      fs.writeFileSync(path.join(dir, there(to)), there(text));
    }
    if (library) {
      const manifest = path.join(dir, "core-manifest.md"), own = /^Core: .*$/m.exec(fs.readFileSync(manifest, "utf8"))[0];
      fs.writeFileSync(manifest, fs.readFileSync(manifest, "utf8").replace(own, `Core: ${CORE}, carried by ${library} under ${at} (never edited here).\nFloor copy: floor-copy/`));
      fs.mkdirSync(path.join(dir, library), { recursive: true });
      fs.writeFileSync(path.join(dir, library, "core-manifest.md"), `${own.replace(`under ${at}`, `under ${at.slice(library.length)}`)}\n`);
      fs.cpSync(path.join(root, "floor"), path.join(dir, "floor-copy"), { recursive: true });
    }
    if (at !== "core/") {
      // (its hooks are the commands core-path.mjs gives for that path, which stop a session whose floor cannot be read there)
      const settings = path.join(dir, ".claude/settings.json"), hooks = JSON.parse(fs.readFileSync(settings, "utf8")), commands = hookCommands(readCore(fs.readFileSync(path.join(dir, "core-manifest.md"), "utf8")));
      hooks.hooks.SessionStart[0].hooks[0].command = commands.start; hooks.hooks.PreToolUse[0].hooks[0].command = commands.helper; hooks.hooks.Stop[0].hooks[0].command = commands.stop;
      fs.writeFileSync(settings, `${JSON.stringify(hooks, null, 2)}\n`);
    }
    fs.mkdirSync(path.join(dir, "checks"), { recursive: true });
    fs.writeFileSync(path.join(dir, "checks/licences.json"), `${JSON.stringify(licences(o, () => false), null, 2)}\n`);
    // (the copy of the core the project holds, as far as its checks read it, its .gitignore too, which keeps the installed packages out of git as in a
    // synced project, where staging them cost a Windows runner over a minute; and the size marks the kit writes for it)
    for (const part of ["floor", "modules", "roles", "tasks", "tools", "scripts", ".packages", "setup", ".gitignore"]) fs.cpSync(path.join(root, part), path.join(dir, at, part), { recursive: true });
    if (submodule) {
      const lib = path.join(dir, library), git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", "-c", "protocol.file.allow=always", ...args], { cwd: lib, stdio: "ignore" });
      git("init", "-q", "-b", "main");
      git("add", "-A");
      git("commit", "-q", "-m", "the library");
      execFileSync("git", ["-c", "protocol.file.allow=always", "submodule", "add", "-q", `${lib.replace(/\\/g, "/")}-origin.git`, library.replace(/\/$/, "")], { cwd: dir, stdio: "ignore" });
    }
    // (the files the marks name stand under the copy's path; the total counts the project's own alone, as for core/)
    const marks = sizes(Object.fromEntries(READ.map(f => [f, fs.statSync(path.join(dir, readAt(f))).size])));
    marks.read = Object.fromEntries(Object.entries(marks.read).map(([f, mark]) => [readAt(f), mark]));
    fs.writeFileSync(path.join(dir, "checks/sizes.json"), `${JSON.stringify(marks, null, 2)}\n`);
    execFileSync("git", ["add", "-A"], { cwd: dir });
    // (the copies check's first baseline as the starter kit writes it, its two entry files' shared sentence listed)
    execFileSync(process.execPath, [`${at}scripts/copies.mjs`, "checks/copies.json", "--first"], { cwd: dir, stdio: "ignore" });
    fs.writeFileSync(path.join(dir, "checks/shape-baseline.json"), `${JSON.stringify({ reads: Object.keys(READERS), listed: {} }, null, 2)}\n`);
    // (the first list of what holds the project's own rules, as the starter kit writes it: #662)
    execFileSync(process.execPath, [`${at}scripts/holders.mjs`, "--own", "--write"], { cwd: dir, stdio: "ignore" });
    // (a reading of the project against the core, recorded as the pull request of its first reading records it: #464)
    execFileSync(process.execPath, [`${at}scripts/core-reading.mjs`, "--recorded"], { cwd: dir, stdio: "ignore" });
    return dir;
  }
  return kit;
}

// What a reader's "one pass" or its bound means is that its work grows in step with its text (or stops at
// its bound), never a time of its own on a real clock, which a busy machine stretches: `read(n, k)` reads a text of
// size n (its k-th, so that none is read from the reader's memory) and says whether it was read right, or does what
// needs building first and returns what then reads it, which alone is timed; the least of a few readings at each of two
// sizes, taken in turn so that a pause lands on none of them, is compared, the smaller held to at least 10 ms, below
// which a clock tells nothing; and a reader that is linear keeps the larger over the smaller near the sizes' own ratio,
// where one gone quadratic takes it to its square. The sizes are small, so that the parser's own time
// (bash-commands.mjs) stays far from its end however busy the machine. The factor of three and the smaller sizes hold
// "one pass" as "not quadratic at these sizes", a small term that shows only past them unseen.
export const linear = (read, small, large, runs = 5) => {
  read(small, -1)?.call?.(); // (the first reading starts the parser)
  const least = new Map([[small, Infinity], [large, Infinity]]);
  let right = true;
  for (let k = 0; k < runs; k++) for (const n of [small, large]) {
    let at = Date.now(), got = read(n, k);
    if (typeof got === "function") { at = Date.now(); got = got(); }
    right = got && right;
    least.set(n, Math.min(least.get(n), Date.now() - at));
  }
  const ratio = least.get(large) / Math.max(10, least.get(small));
  return { right, linear: ratio < 3 * (large / small), shown: `${small} took ${least.get(small)} ms, ${large} took ${least.get(large)} ms` };
};

// A project held in memory, as the readers of its workflows take it: `workflows` maps a file's name to the workflow's
// parsed YAML, `files` the project's other files (name to text), and `manifest` the core manifest's text.
export const inMemory = (workflows, files = {}, manifest = "") => ({ files: Object.keys(files), read: f => files[f] ?? null, manifest,
  workflows: Object.fromEntries(Object.entries(workflows).map(([f, yaml]) => [f, { text: JSON.stringify(yaml), yaml }])) });
// A workflow of one job whose one step runs `run` (with `step`, `job` and `top` beside it), and one whose job calls the
// core's workflow `name` with `inputs`.
export const stepped = (run, step = {}, job = {}, top = {}) => ({ ...top, jobs: { j: { ...job, steps: [{ run, ...step }] } } });
export const coreCall = (name, inputs) => ({ jobs: { c: { uses: `${CORE}/.github/workflows/${name}@${"0".repeat(40)}`, with: inputs } } });
// The copies check's config such a project gives, and whether the config `what` is reported not read.
export const copiesOf = (...a) => configs(inMemory(...a)).copies;
export const notRead = (what, ...a) => { const at = configs(inMemory(...a)); return at[what] === null && at.unread.length > 0; };
// The project's manifest with its differences "None" changed to `line`, a step left undone on the owner's word.
// (the manifest's line ends kept: a tree git writes with core.autocrlf holds Windows ones)
export const declare = (d, line) => fs.writeFileSync(path.join(d, "core-manifest.md"), fs.readFileSync(path.join(d, "core-manifest.md"), "utf8").replace(/^## Differences(\r?\n)(?:\r?\n)*None\.(?:\r?\n)?/m, (_, eol) => `## Differences${eol}- ${line}${eol}`));

// `kitIn(tmp)`'s kit, each read back as it is written, before any case changes it, with `ok` told what it found
// (unless `held` is false): every step done, its kind read from what it holds, no difference from a fresh start, and
// its manifest taking or leaving out each module of this commit (the core's own manifest check: a module it neither
// takes nor leaves out would be a note on a project's first day, #329). A kit made with options another already holds
// is made with held: false, which spares the suite's time its round trip.
export function heldKitIn(tmp, ok) {
  const writeKit = kitIn(tmp);
  const texts = dir => Object.fromEntries(fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith(".md")).map(n => [n, fs.readFileSync(path.join(root, dir, n), "utf8")]));
  function roundTrip(name, given, dir) {
    const missed = notDone(dir);
    ok(!missed.length && report(missed).startsWith("Every step a check reads is done"), `${name}, as the starter kit writes it: no step is reported not done`, report(missed));
    const p = project(dir);
    const { o } = kind(p);
    ok(o.owner === "someone-else" && o.name === name && o.packages === given.packages && o.nuget === given.nuget && !!o.private === !!given.private && !!o.game === !!given.game,
      `${name}: its kind is read from what it holds, as the starter kit was told it (${JSON.stringify(given)})`, JSON.stringify(o));
    const found = differences(p, fresh(p));
    ok(!found.length && freshReport(found).includes("no difference"), `${name}: beside a fresh start, no difference`, found.join("\n"));
    const moduleNotes = manifestNotes({ manifest: p.manifest, moduleTexts: { ...texts("roles/shared"), ...texts("tasks"), ...texts("tools") } });
    ok(!moduleNotes.length, `${name}: its manifest takes or leaves out each module, so the manifest check gives no note`, moduleNotes.join("\n"));
  }
  return (name, o, { held = true, ...where } = {}) => { const dir = writeKit(name, o, where); if (held) roundTrip(name, o, dir); return dir; };
}

// The steps whose lead is `lead`: a test that reads one step's answer asks for that step alone, since the others' checks,
// the agent tools' files among them, which run the copies and pointers checks on the whole project, answer nothing it
// reads, and a Windows runner pays for each.
export const only = lead => STEPS.filter(s => s.lead === lead);

// The commands that fetch or install, npx and curl, built from pieces, so that the licence check reads no tool here.
export const NPX = ["np", "x"].join(""), CURL = ["cu", "rl"].join("");

// The project's rule files and the files its agent tools take their instructions from, each with its text, as a step's
// writer must leave their words (rule-files.mjs; #1091); and whether a text after the writers kept the words of a text
// before them: the same, but for the paths into the copy (core/...), which a writer moves, and the manifest's "Paths:"
// line and its lines of modules ("Modules:", "Not taken:", "Modules to confirm:"), which it writes as the starter kit
// does (#1094).
export function ruleTexts(dir) {
  const p = project(dir);
  return Object.fromEntries(ruleFiles(p.read, d => p.files.filter(f => f.startsWith(`${d}/`)), { tools: true }).map(f => [f, p.read(f)]));
}
export const wordsKept = (before, after) => {
  // (the module lines read past in the manifest alone, where the writers write them)
  const modules = text => text.replace(/^(.*\bModules: ).*$/mu, "$1-").replace(/\r?\n(?:\r?\n)?(?:Not taken|Modules to confirm): [^\r\n]*/gu, "");
  // (a pointer's path read as one word; and a pull-in of the core's files read once where one above pulls in the same
  // file, each old path read as the file it now is, since the rules' move makes two that lead to one file one: #1248,
  // point 5. A pull-in of another file, dropped or added, still reads as words changed)
  const map = moved(), apart = moved.apart(), now = old => map[old] && !map[old].endsWith("/") && !(apart[old]?.length) ? map[old] : old;
  const once = text => text.split("\n").map(l => l.replace(/^(\s*(?:@|#\[\[file:)core\/)([\w./-]+)/u, (_, lead, f) => `${lead}${now(f)}`))
    .filter((l, i, all) => !(/^\s*(?:@|#\[\[file:)core\//u.test(l) && all.indexOf(l) < i)).join("\n");
  const words = (text, f) => (text === null || text === undefined ? null : (f === "core-manifest.md" ? modules : t => t)(once(text).replace(/core\/[\w./-]+/gu, "core/-").replace(/^Paths: .*$/mu, "Paths: -")));
  return Object.keys({ ...before, ...after }).every(f => words(before[f], f) === words(after[f], f));
};
