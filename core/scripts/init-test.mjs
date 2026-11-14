// Tests of the starter kit (init.mjs and setup/template/): what a command line may hold, what each template becomes,
// that every call a template makes names a workflow the core has and gives it what it requires, and the program whole:
// from a scratch copy of the core as it stands here, it writes a scratch project, on which the core's own checks then
// run (the pointer, workflow, copies, licence and reading-size checks), so a template that no longer fits the core
// fails here and not in a project. On Linux and on Windows. Git, tar and Node's own modules only.
//
//   node scripts/init-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE, CORE_SOURCE } from "./core-address.mjs";
import { COMMAND } from "./helper-call.mjs";
import { FILES, TEMPLATES, files, fill, filtered, licences, linked, modules, named, options, sizes } from "./init.mjs";
import { scratch } from "./scratch-core.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const throws = fn => { try { fn(); return false; } catch { return true; } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = "a".repeat(40);

// the command line
ok(options(["--owner", "some-one"]).owner === "some-one" && options(["--owner", "x", "--private", "--game"]).private && options(["--owner", "x", "--game"]).game, "an owner, and the two flags");
ok(throws(() => options([])) && throws(() => options(["--owner"])) && throws(() => options(["--owner", "a b"])) && throws(() => options(["--owner", "-x"])) && throws(() => options(["--owner", "x`; rm -rf y`"])), "an owner is one GitHub login, and is asked for");
ok(throws(() => options(["--owner", "x", "--force"])) && throws(() => options(["--owner", "x", "y"])), "an argument it does not know stops it");
ok(options(["--owner", "x", "--at", A]).at === A && throws(() => options(["--owner", "x", "--at", "main"])) && throws(() => options(["--owner", "x", "--at", A.slice(1)])), "a commit is 40 hex characters");
ok(options(["--owner", "x", "--npm", "tools/"]).packages === "tools" && options(["--owner", "x", "--npm", "."]).packages === "." && options(["--owner", "x", "--npm", "a\\b"]).packages === "a/b", "the npm folder is read from the project's root, either slash");
ok(throws(() => options(["--owner", "x", "--npm", "../out"])) && throws(() => options(["--owner", "x", "--npm", "/abs"])) && throws(() => options(["--owner", "x", "--npm", "a b"])) && throws(() => options(["--owner", "x", "--npm", "a/../../b"])) && throws(() => options(["--owner", "x", "--npm", "$(x)"])), "a folder outside the project, or one that is more than a path, stops it");
ok(options(["--owner", "x", "--nuget", "src\\"]).nuget === "src" && options(["--owner", "x", "--nuget", "."]).nuget === "." && options(["--owner", "x", "--npm", "web", "--nuget", "."]).packages === "web" && throws(() => options(["--owner", "x", "--nuget", "../out"])) && throws(() => options(["--owner", "x", "--nuget"])), "the NuGet folder is held to the same form, with the npm folder or without it");
ok(options(["--owner", "x", "--name", "A fine project"]).name === "A fine project" && named("Bark & Bite (2nd), v1.0!") && named("Tr\u00e6na's tool") && named("x") && named("Snake: the game") && named("C# tools"), "a name is letters, digits and blanks, with the few marks a name uses");
ok(named("\u0939\u093f\u0928\u094d\u0926\u0940") && named("Cafe\u0301") && options(["--owner", "x", "--name", "Cafe\u0301"]).name === "Caf\u00e9" && !named("\u0301x"), "a script written with marks on its letters is a name too, a letter and its accent are read as the one letter, and a mark alone begins no name");
ok(filtered("filter.x.clean sh -c evil\nfilter.lfs.required true\nFILTER.Y.process run\nfilter.x.clean again\n").join() === "filter.x.clean,FILTER.Y.process" && filtered("").length === 0, "a project's own filters that run a command are found by name, and one that runs none is not");
for (const [what, bad] of [["a line break", "two\nlines"], ["a template's word", "{{pin}}"], ["a bar", "a | b"], ["blanks around it", " padded "], ["a blank at its end", "padded "], ["an @, which Claude Code reads as a file to take in", "Try @~/.ssh/id_rsa"], ["an @ at its start", "@AGENTS.md"], ["a tab", "a\tb"], ["a line separator", "a\u2028b"], ["a control character", "a\u0007b"], ["a backtick", "a`b"], ["an angle bracket", "a<b"], ["a dash at its start", "-x"], ["81 characters", "x".repeat(81)], ["nothing", ""]]) {
  ok(!named(bad) && throws(() => options(["--owner", "x", "--name", bad])), `a name with ${what} is refused`);
}

// what the templates become
ok(modules(["b.md", "game-design.md", "a.md"], false) === "`a.md`, `b.md`" && modules(["b.md", "game-design.md"], true) === "all", "a game takes every module, any other project each but the games' own, by name");
ok(fill("{{owner}} at {{pin}}", { owner: "x", pin: A }) === `x at ${A}` && throws(() => fill("{{owner}} {{other}}", { owner: "x" })), "a template's words are filled in, and one left unfilled fails");
const marks = sizes({ "a.md": 1000, "b.md": 1500, "core/floor/security.md": 9000 });
ok(marks.each === 20480 && marks.read["a.md"] === 20480 && marks.read["core/floor/security.md"] === 20480 && marks.total === 4096 && marks.split === 51200, "the first marks: about 20 KB a file, the project's own total a whole KB above what its files come to, with one to spare, the core's copy held to the core's own cap");
ok(JSON.stringify(licences({}, () => true)) === JSON.stringify({ ships: [], audit: "checks/licences-audit.json", scan: { served: [], skip: [] } }), "the first licence config: nothing ships, and no npm file where the project has no npm");
ok(licences({ packages: "tools" }, f => f === "tools/package-lock.json").lockfiles.join() === "tools/package-lock.json" && licences({ packages: "tools" }, () => false).lockfiles.length === 0 && licences({ packages: "." }, () => true).ignoreScriptsIn.join() === ".npmrc", "of npm's files only those that stand are named, from the project's root");

const templates = [];
const walk = dir => { for (const e of fs.readdirSync(path.join(root, TEMPLATES, dir), { withFileTypes: true })) e.isDirectory() ? walk(path.posix.join(dir, e.name)) : templates.push(path.posix.join(dir, e.name)); };
walk("");
ok(templates.every(t => t.endsWith(".tmpl")), "every file of the kit ends in .tmpl, so no tool or check takes one for the real thing", templates.filter(t => !t.endsWith(".tmpl")).join());
const listed = new Set([...FILES.map(([t]) => t), "dependabot-npm.yml.tmpl", "dependabot-nuget.yml.tmpl"]);
ok(templates.every(t => listed.has(t)) && [...listed].every(t => templates.includes(t)), "every template is listed in FILES, and every listed one is there", [...templates.filter(t => !listed.has(t)), ...[...listed].filter(t => !templates.includes(t))].join());
ok(new Set(FILES.map(([, to]) => to)).size === FILES.length, "no two templates become the same file");

// every call a template makes: to a workflow the core has, that can be called, with each input it requires
const names = fs.readdirSync(path.join(root, ".github/workflows"));
for (const [template] of FILES.filter(([t]) => t.startsWith("workflows/"))) {
  const text = fs.readFileSync(path.join(root, TEMPLATES, template), "utf8");
  const calls = [...text.matchAll(/^\s+uses: (\S+)$/gm)].map(m => m[1]);
  const name = /^\{\{core\}\}\/\.github\/workflows\/([\w.-]+\.yml)@\{\{pin\}\}$/.exec(calls[0] ?? "")?.[1];
  ok(calls.length === 1 && name && names.includes(name), `${template} makes one call, to a workflow of the core's, at the pin`, calls.join());
  if (!name || !names.includes(name)) continue;
  const called = fs.readFileSync(path.join(root, ".github/workflows", name), "utf8");
  const required = [...called.matchAll(/^ {6}(\w+):\r?\n(?: {8}.*\r?\n)*? {8}required: true/gm)].map(m => m[1]);
  ok(/^ {2}workflow_call:/m.test(called) && required.every(input => new RegExp(`^ {6}${input}: \\S`, "m").test(text)), `${template} calls a workflow that can be called, and gives it ${required.join(", ") || "nothing, as it requires nothing"}`);
  ok(!/pull_request_target/.test(text) && /^permissions:\r?\n {2}contents: read\r?\n\r?\njobs:/m.test(text), `${template} gives the whole workflow contents: read and nothing more; what a job needs beyond it, the job asks for`);
}
// what the README leaves to the templates to say (its point 5 points here for them): each workflow's triggers and permissions
const template = name => fs.readFileSync(path.join(root, TEMPLATES, "workflows", name), "utf8").replace(/\r\n/g, "\n");
ok(template("pr-description.yml.tmpl").includes("on:\n  pull_request:\n    types: [opened, edited, reopened, synchronize, ready_for_review]\n"), "the description check runs when a pull request opens, is edited, reopened, pushed to or marked ready");
ok(template("security-review.yml.tmpl").includes("on:\n  pull_request:\n    types: [opened, reopened, synchronize, ready_for_review]\n  issue_comment:\n    types: [created, edited]\n") && template("security-review.yml.tmpl").includes("    permissions:\n      contents: read\n      pull-requests: read\n      statuses: write\n"), "the security-review check has its two triggers, and its job its three permissions");
ok(/^on:\n  schedule:\n    - cron: '\d+ \d+ \* \* \*'.*\n  workflow_dispatch:\n/m.test(template("core-moved.yml.tmpl")) && template("core-moved.yml.tmpl").includes("    permissions:\n      contents: read\n      issues: write\n"), "the core-moved check runs daily or by hand, in a job that may read the repository and write issues");
const fromFolder = name => fs.readFileSync(path.join(root, TEMPLATES, name), "utf8");
const whole = files({ owner: "someone", name: "P", packages: "tools" }, A, ["git.md"], fromFolder).map(([, text]) => text).join("\n");
const dependabot = o => files({ owner: "someone", name: "P", ...o }, A, ["git.md"], fromFolder).find(([to]) => to === ".github/dependabot.yml")[1];
const ecosystems = text => (text.match(/package-ecosystem: "/g) ?? []).length;
ok(dependabot({ nuget: "." }).includes('package-ecosystem: "nuget"\n    directory: "/"\n') && ecosystems(dependabot({ nuget: "." })) === 2 && dependabot({ nuget: "src" }).includes('directory: "/src"\n') && ecosystems(dependabot({})) === 1 && !dependabot({}).includes("nuget"), "a project whose packages come from NuGet gets Dependabot's updates for them, for its folder, beside the actions' own, and one that named no installer gets the actions' alone");
const both = dependabot({ packages: "web", nuget: "." });
ok(ecosystems(both) === 3 && both.indexOf('directory: "/web"') > 0 && both.indexOf('directory: "/web"') < both.indexOf('"nuget"') && (both.match(/^version: 2$/gm) ?? []).length === 1, "a project with both installers gets both, in one config");
ok(JSON.parse(fromFolder("claude-settings.json.tmpl")).hooks.PreToolUse[0].hooks[0].command === COMMAND, "the helper hook's command in the settings template is, letter for letter, the one helper-call.mjs holds and its test runs");
ok(fs.readFileSync(path.join(root, ".claude/settings.json"), "utf8") === fromFolder("claude-settings.json.tmpl").replaceAll(":core/scripts/", ":scripts/"), "the core's own settings are the kit's, its hooks reading main's scripts/ where a project's read core/scripts/ (floor rule 3)");
ok(!/\{\{[a-z]+\}\}/.test(whole) && whole.includes("${{ secrets.PERSONAL_TERMS }}") && whole.includes(`uses: ${CORE}/.github/workflows/core.yml@${A}`) && whole.includes(`dependency-name: "${CORE}*"`), "filled in, no template word is left and GitHub's own expressions stand as written, each call is to the core's own address at the pin, and Dependabot leaves those calls alone");

// the program whole: a scratch copy of the core as it stands here, and a scratch project
const { tmp, env, git, run, core, pin, script, project } = scratch("init-test-");

const p = project("a-project", "--owner", "someone-else", "--npm", "tools");
const has = f => fs.existsSync(path.join(p.dir, f)), read = f => fs.readFileSync(path.join(p.dir, f), "utf8");
ok(p.status === 0 && p.out.includes("The starter kit is written") && p.out.includes("FILL IN"), "it writes a project and says what is left", p.out.slice(0, 600));
if (p.status === 0) {
  ok(FILES.every(([, to, when]) => has(to) === (!when || !!when({ packages: "tools" }))) && has("checks/sizes.json") && has("checks/licences.json") && has("checks/copies-baseline.json") && has("core/floor/security.md") && !has("core/reports"), "every file its options ask for is there and no other of the kit's, with the copy of the core, without what the core keeps to itself");
  const manifest = read("core-manifest.md");
  ok(new RegExp(`^Core: ${CORE_SOURCE} at ${pin}, copied whole under core/`, "m").test(manifest) && /^\| \*owner's account\* \| `someone-else` \|$/m.test(manifest), "the manifest pins the commit and names the owner's account, as core.yml reads them");
  ok(read("AGENTS.md").startsWith("# a-project\n") && read(".github/workflows/signatures.yml").includes('directory: "tools"') && read(".github/dependabot.yml").includes('directory: "/tools"') && read(".github/ISSUE_TEMPLATE/bug_report.md").includes("assignees: someone-else"), "the project's name is its folder's, and the npm folder and the owner are where they belong");
  ok(JSON.parse(read(".claude/settings.json")).hooks.PreToolUse[0].hooks[0].command.includes("core/scripts/helper-call.mjs") && JSON.parse(read("checks/licences-audit.json")).entries.length === 0, "the settings and the audit are JSON, and the hooks are the core's");
  ok(git(p.dir, "status", "--porcelain").split("\n").every(l => l.startsWith("A  ")), "everything it wrote is staged, and nothing else is touched");
  git(p.dir, "commit", "-q", "-m", "the starter kit");
  for (const [what, ...args] of [
    ["the pointer check", "core/scripts/pointers.mjs"],
    ["the workflow check", "core/scripts/workflows.mjs"],
    ["the copies check", "core/scripts/copies.mjs", "checks/copies.json"],
    ["the licence check", "core/scripts/licences.mjs", "checks/licences.json"],
    ["the reading-size check", "core/scripts/reading-size.mjs", "checks/sizes.json"],
  ]) {
    const r = spawnSync(process.execPath, args, { cwd: p.dir, env: { ...env, SIZES_BASE: "HEAD" }, encoding: "utf8" });
    ok(r.status === 0, `${what} passes on the project it wrote`, (r.stdout + r.stderr).split("\n").filter(l => /FAIL|Error/.test(l)).slice(0, 5).join("\n     "));
  }
  // (the core's copy may grow, as a sync brings it, past the project's own total, and the check still passes; the
  // project's own files may not)
  const sizeCheck = () => spawnSync(process.execPath, ["core/scripts/reading-size.mjs", "checks/sizes.json"], { cwd: p.dir, env: { ...env, SIZES_BASE: "HEAD" }, encoding: "utf8" });
  const grow = (f, n) => { const at = path.join(p.dir, f), was = fs.readFileSync(at, "utf8"); fs.writeFileSync(at, `${was}${"x".repeat(n)}\n`); return () => fs.writeFileSync(at, was); };
  let undo = grow("core/floor/security.md", 3000);
  const coreGrew = sizeCheck();
  undo();
  undo = grow("AGENTS.md", 3000);
  const ownGrew = sizeCheck();
  undo();
  ok(coreGrew.status === 0 && ownGrew.status === 1 && /project's own files every session reads total/.test(ownGrew.stderr), "the core's copy grown by a sync fails no project's total; the project's own files grown past it do", `${coreGrew.stderr}${ownGrew.stdout}`);
  // (a total set when it counted the core's copy too passes, and a note gives the mark to set, even after the core
  // grew past the room that total had left; a total of the project's own says nothing)
  const sizesAt = path.join(p.dir, "checks/sizes.json"), was = fs.readFileSync(sizesAt, "utf8"), own = JSON.parse(was).total;
  const coreBytes = Object.keys(JSON.parse(was).read).filter(f => f.startsWith("core/")).reduce((n, f) => n + Buffer.byteLength(fs.readFileSync(path.join(p.dir, f), "utf8").replace(/\r\n/g, "\n")), 0);
  const setTotal = t => fs.writeFileSync(sizesAt, JSON.stringify({ ...JSON.parse(was), total: t }));
  setTotal(own + coreBytes + 4000);
  const roomy = sizeCheck();
  setTotal(own + 3 * coreBytes);
  const roomier = sizeCheck();
  setTotal(own + coreBytes);
  undo = grow("core/floor/security.md", 2000);
  const grownPast = sizeCheck();
  undo();
  fs.writeFileSync(sizesAt, was);
  ok(roomy.status === 0 && roomy.stdout.includes(`set it to ${own + 4000}`) && grownPast.status === 0 && grownPast.stdout.includes(`set it to ${own}`) && roomier.stdout.includes(`set it to ${own}`) && !/leaves [0-9]+ bytes of room/.test(sizeCheck().stdout),
    "a total set when it counted the core's copy passes, and a note gives the mark that keeps the project's room in one step, a KB above its own at least, after the core grew past that room too; a total of the project's own says nothing", `${roomy.stdout}\n${grownPast.stdout}\n${roomier.stdout}`);
  const again = run(p.dir, script, "--owner", "someone-else");
  ok(again.status === 1 && again.out.includes("never overwrites") && git(p.dir, "status", "--porcelain") === "", "run again, it overwrites nothing and says which files stand");
}
const q = project("private-game", "--owner", "x", "--private", "--game", "--name", "A private game");
ok(q.status === 0 && !fs.existsSync(path.join(q.dir, ".github/workflows/codeql.yml")) && !fs.existsSync(path.join(q.dir, ".github/workflows/licences.yml")) && !fs.existsSync(path.join(q.dir, ".github/workflows/signatures.yml")) && fs.existsSync(path.join(q.dir, "checks/licences.json")), "a private project without npm gets no call to CodeQL, the licence workflow or the signature check, and still its licence config", q.out.slice(0, 400));
if (q.status === 0) ok(/^Floor: whole\. Modules: all\.$/m.test(fs.readFileSync(path.join(q.dir, "core-manifest.md"), "utf8")) && fs.readFileSync(path.join(q.dir, "AGENTS.md"), "utf8").startsWith("# A private game\n"), "a game takes every module, and a name given is the name used");
const t = project("a-folder-named-true", "--owner", "x", "--npm", "true");
ok(t.status === 0 && fs.readFileSync(path.join(t.dir, ".github/workflows/signatures.yml"), "utf8").includes('directory: "true"') && fs.readFileSync(path.join(t.dir, ".github/dependabot.yml"), "utf8").includes('directory: "/true"'), "a folder whose name YAML would read as something else is written in quotes, so it stays a name");
const n = project("a-dotnet-project", "--owner", "x", "--nuget", "src", "--private");
const nRead = f => fs.readFileSync(path.join(n.dir, f), "utf8");
ok(n.status === 0 && nRead(".github/workflows/nuget.yml").includes("config: checks/licences.json") && !/^\s*advisory:/m.test(nRead(".github/workflows/nuget.yml")) && JSON.stringify(JSON.parse(nRead("checks/licences.json")).nuget) === '{"ships":[],"tools":[]}' && nRead(".github/dependabot.yml").includes('directory: "/src"') && !fs.existsSync(path.join(n.dir, ".github/workflows/signatures.yml")) && n.out.includes("RestorePackagesWithLockFile"),
  "a project whose packages come from NuGet gets the call to the NuGet check, which fails from the first day, the config's part for its lock files, and is told to turn lock files on; a private one too, since that check needs nothing GitHub sells", n.out.slice(0, 400));
ok(!fs.existsSync(path.join(t.dir, ".github/workflows/nuget.yml")) && JSON.parse(fs.readFileSync(path.join(t.dir, "checks/licences.json"), "utf8")).nuget === undefined, "and one that named no NuGet folder gets neither");
ok(p.status !== 0 || /\*\*the trusted builder:\*\*\n\s+FILL IN:/.test(read("SECURITY.md")) && p.out.includes("who may change the protected files"), "who may change the protected files is left for the project to say, and listed with what is left");
// the kit is read from the commit, never from the clone's working folder: an edit not yet committed reaches no project
const edited = path.join(core, TEMPLATES, "workflows", "core.yml.tmpl");
const before = fs.readFileSync(edited, "utf8");
fs.writeFileSync(edited, before.replace("contents: read", "contents: write"));
const u = project("from-the-commit", "--owner", "x");
fs.writeFileSync(edited, before);
ok(u.status === 0 && fs.readFileSync(path.join(u.dir, ".github/workflows/core.yml"), "utf8").includes("contents: read") && !fs.readFileSync(path.join(u.dir, ".github/workflows/core.yml"), "utf8").includes("contents: write"), "a template edited in the clone and not committed is not what a project gets: it gets the commit's", u.out.slice(0, 300));

// links: nothing is written through one, wherever it leads, and nothing at all once one is found
ok(linked(tmp, "no/such/path") === null, "a path that is not there yet holds no link");
const outside = path.join(tmp, "outside");
fs.mkdirSync(outside);
const link = (name, to, dir) => { const at = path.join(tmp, name); fs.mkdirSync(at); git(at, "init", "-q", "-b", "main"); dir(at, to); return at; };
let canLink = true;
try { fs.symlinkSync(outside, path.join(tmp, "probe"), "dir"); } catch { canLink = false; }
if (!canLink) console.log("skip the links: this machine lets the test make none");
else {
  const a = link("linked-folder", outside, (at, to) => fs.symlinkSync(to, path.join(at, ".claude"), "dir"));
  ok(linked(a, ".claude/settings.json") === ".claude", "a link is found at the part of the path where it stands");
  const ra = run(a, script, "--owner", "x");
  ok(ra.status === 1 && ra.out.includes("writes through no link") && fs.readdirSync(outside).length === 0 && fs.readdirSync(a).sort().join() === ".claude,.git", "a folder of the project that is a link to elsewhere stops the kit before it writes anything, there or here", ra.out.slice(0, 300));
  const b = link("linked-file", path.join(outside, "missing.md"), (at, to) => fs.symlinkSync(to, path.join(at, "AGENTS.md"), "file"));
  const rb = run(b, script, "--owner", "x");
  ok(rb.status === 1 && fs.readdirSync(outside).length === 0 && fs.readdirSync(b).sort().join() === ".git,AGENTS.md", "so does a file that is a link to one not yet there: the file it names is never made", rb.out.slice(0, 300));
  const c = link("linked-core", outside, (at, to) => fs.symlinkSync(to, path.join(at, "core"), "dir"));
  const rc = run(c, script, "--owner", "x");
  ok(rc.status === 1 && fs.readdirSync(outside).length === 0, "and a core/ that is a link: the copy is written into no other folder", rc.out.slice(0, 300));
}
// git's own variables that point elsewhere: the kit still writes into the project it is run in, from the clone it lies in
const pointedDir = path.join(tmp, "pointed-elsewhere");
fs.mkdirSync(pointedDir);
git(pointedDir, "init", "-q", "-b", "main");
const pe = spawnSync(process.execPath, [script, "--owner", "x"], { cwd: pointedDir, env: { ...env, GIT_DIR: path.join(p.dir, ".git"), GIT_WORK_TREE: p.dir }, encoding: "utf8" });
ok(pe.status === 0 && fs.existsSync(path.join(pointedDir, "core-manifest.md")) && git(p.dir, "status", "--porcelain") === "" && git(pointedDir, "status", "--porcelain").includes("A  core-manifest.md"), "with git pointed at another project's repository, the kit writes and stages in the project it is run in, and leaves the other as it was", (pe.stdout + pe.stderr).slice(0, 300));
// a filter in the project's own git settings would run a command on `git add`: the kit refuses before it adds
const fdir = path.join(tmp, "with-a-filter");
fs.mkdirSync(fdir);
git(fdir, "init", "-q", "-b", "main");
const ran = path.join(tmp, "the-filter-ran");
git(fdir, "config", "--local", "filter.kit.clean", `${JSON.stringify(process.execPath)} -e "require('fs').writeFileSync(process.argv[1], '')" ${JSON.stringify(ran)}`);
fs.writeFileSync(path.join(fdir, ".gitattributes"), "* filter=kit\n");
const rf = run(fdir, script, "--owner", "x");
ok(rf.status === 1 && rf.out.includes("filter.kit.clean") && !fs.existsSync(ran) && !fs.existsSync(path.join(fdir, "core-manifest.md")), "a project whose own git settings hold a filter is refused before anything is written or added, and the filter never runs", rf.out.slice(0, 300));
const r = project("no-owner");
ok(r.status === 1 && fs.readdirSync(r.dir).join() === ".git", "without an owner it writes nothing");
fs.mkdirSync(path.join(p.dir, "sub"));
ok(run(path.join(p.dir, "sub"), script, "--owner", "x").status === 1 && run(tmp, script, "--owner", "x").status === 1 && run(core, script, "--owner", "x").status === 1, "it runs only in the root of a project's repository, never in a folder below it, outside one or in the core itself");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the starter kit`);
process.exitCode = failed ? 1 : 0;
