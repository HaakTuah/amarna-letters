// Tests of the core's releases (releases.mjs) and of cutting one (release.mjs): what a project follows, which tags are
// releases, which is the newest and whether it is past a pin, what a sync between two commits asks, and what the next
// release would be. In a scratch repository that stands in for the core, fetched as the scripts fetch the core; on
// Linux and on Windows. Git and Node's own modules only.
//
//   node scripts/releases-test.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CORE, OWNER } from "./core-address.mjs";
import { inTheCore, next } from "./release.mjs";
import { NOTES, RELEASE, asksBetween, elsewhere, fetchCore, followsOf, namedReleases, newestRelease, ownerOf, past, releasesIn } from "./releases.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };

// what a project follows
const manifest = (owner, row = "") =>
  `# Core manifest\n\nCore: ${CORE} at ${"a".repeat(40)}, copied whole under core/ (never edited here).\n\n| Slot | Here |\n| --- | --- |\n| *owner's account* | \`${owner}\` |\n${row}`;
ok(ownerOf(manifest("someone")) === "someone" && ownerOf("no manifest") === null, "the owner's account is read from its one row");
ok(followsOf(manifest(OWNER)) === "main" && followsOf(manifest(OWNER.toUpperCase())) === "main", "with no row, the core's own owner's project follows main, however the login is cased");
ok(followsOf(manifest("someone-else")) === "releases", "with no row, another owner's project follows the releases");
ok(followsOf(manifest(OWNER, "| *follows* | `releases` |\n")) === "releases" && followsOf(manifest("someone-else", "| *follows* | `main` |\n")) === "main", "a row decides it, either way");
ok(followsOf(manifest("someone-else", "|*follows*|  `main`  |\n")) === "main", "the row is read whatever its blanks");
ok(followsOf(manifest(OWNER, "| *follows* | releases |\n")) === null && followsOf(manifest(OWNER, "| *follows* | `main` or `releases` |\n")) === null && followsOf(manifest(OWNER, "| *follows* | `tags` |\n")) === null, "a row that says anything else, or says it without backticks, gives no answer");
ok(followsOf(manifest(OWNER, "| *follows* | `main` |\n| *follows* | `releases` |\n")) === null, "two rows give no answer");
ok(followsOf("| *owner's account* | someone |\n") === null, "no row and no owner's account to go by give no answer");
ok(RELEASE.test("release-1") && RELEASE.test("release-120") && !RELEASE.test("release-0") && !RELEASE.test("release-01") && !RELEASE.test("release-1a") && !RELEASE.test("v1") && !RELEASE.test("release-1\n"), "a release's name is the word and a whole number above zero");

// a scratch core: main with four commits, a side branch, and tags
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "releases-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
// (git's own variables that point at a repository are left out, so every call lands in the scratch one)
for (const name of Object.keys(process.env)) if (elsewhere.test(name)) delete process.env[name];
Object.assign(process.env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" });
// (the test's own calls never take a variable that points elsewhere, even while one is set to try the scripts)
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !elsewhere.test(name))), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const core = path.join(tmp, "core");
fs.mkdirSync(path.join(core, path.dirname(NOTES)), { recursive: true });
git(core, "init", "-q", "-b", "main");
let n = 0;
const commit = (notes) => {
  fs.writeFileSync(path.join(core, NOTES), notes);
  fs.writeFileSync(path.join(core, "n"), String(++n));
  git(core, "add", "-A");
  git(core, "commit", "-q", "-m", `commit ${n}`);
  return git(core, "rev-parse", "HEAD");
};
const head = "# What a sync asks of a project\n\n";
const c1 = commit(head), c2 = commit(`${head}- **First.** Done when one.\n`);
git(core, "checkout", "-q", "-b", "side");
const side = commit(`${head}- **First.** Done when one.\n- **Aside.** Never on main.\n`);
git(core, "checkout", "-q", "main");
const c3 = commit(`${head}- **First.** Done when one.\n- **Second.** Done when two.\n`), c4 = commit(`${head}- **First.** Done when one.\n- **Second.** Done when two.\n`);
const fetched = () => { const dir = fs.mkdtempSync(path.join(tmp, "fetched-")); fetchCore(dir, core); return dir; };

let dir = fetched();
ok(releasesIn(dir).length === 0 && newestRelease(c1, dir) === null, "a core with no tag has no release");
ok(next(dir).name === "release-1" && next(dir).sha === c4 && next(dir).before === null && next(dir).asks.length === 0, "the first release would stand on main's newest commit");
ok(past(c1, c3, dir) && past(c3, c3, dir) && !past(c3, c1, dir) && !past("0".repeat(40), c3, dir) && !past("not-a-commit", c3, dir), "a commit is past the ones it came from, and itself; what is no commit there is past nothing");

git(core, "tag", "release-1", c2);
git(core, "tag", "-a", "-m", "the second", "release-2", c3); // (a tag with a message of its own: its commit is what counts)
git(core, "tag", "release-3", side); // (on a commit that is not main's: no release)
git(core, "tag", "release-04", c4); // (not a release's name)
git(core, "tag", "v9", c4);
dir = fetched();
ok(releasesIn(dir).map(r => `${r.name}@${r.sha}`).join() === `release-2@${c3},release-1@${c2}`, "the releases are the tags of that name on main's commits, the newest first", releasesIn(dir).map(r => r.name).join());
ok(newestRelease(c1, dir).name === "release-2" && newestRelease(c1, dir).sha === c3 && newestRelease(c1, dir).moved, "a pin before the newest release is behind it");
ok(!newestRelease(c3, dir).moved && !newestRelease(c4, dir).moved, "a pin at the newest release, or past it on main, has nothing to take");
ok(!newestRelease(side, dir).moved && !newestRelease("f".repeat(40), dir).moved, "a pin that is no commit of main moves nowhere (core.yml fails such a project by itself)");
ok(asksBetween(c1, c3, dir).join("|") === "- **First.** Done when one.|- **Second.** Done when two." && asksBetween(c3, c4, dir).length === 0, "a sync asks what the notes gained between the two commits");
ok(asksBetween("f".repeat(40), c3, dir) === null, "notes that cannot be read give no all-clear");
const coming = next(dir);
ok(coming.name === "release-4" && coming.sha === c4 && coming.before.name === "release-2" && coming.asks.length === 0, "the next release stands on main's newest commit, numbered after every tag with a release's name, the one that is no release too, so its name is never taken");

// a tag of a tag, and a number out of main's order
git(core, "tag", "-a", "-m", "inner", "inner", c4);
git(core, "tag", "-a", "-m", "a tag of a tag", "release-5", "inner");
git(core, "tag", "release-6", c1); // (numbered newest, on main's oldest commit: a mistake)
dir = fetched();
const five = releasesIn(dir)[0];
ok(five.name === "release-5" && five.sha === c4 && git(dir, "cat-file", "-t", five.sha) === "commit", "a release made as a tag of a tag is the commit it leads to, never a tag", JSON.stringify(five));
ok(!releasesIn(dir).some(r => r.name === "release-6") && namedReleases(dir).at(-1).name === "release-6" && newestRelease(c1, dir).name === "release-5", "a tag numbered newest on an older commit is no release: the newest by number is the newest in main's history");
ok(next(dir) === null, "with the newest release on main's newest commit there is nothing to release");
commit(`${head}- **First.** Done when one.\n- **Second.** Done when two.\n- **Third.** Done when three.\n`);
dir = fetched();
ok(next(dir).name === "release-7" && next(dir).before.name === "release-5" && next(dir).asks.join() === "- **Third.** Done when three.", "the next one is numbered past the mistaken tag, and carries what the notes gained since the newest release");
git(core, "tag", "release-999999999", c1);
let refused = false;
try { next(fetched()); } catch { refused = true; }
ok(refused, "a tag numbered so high that the next would be no release's name stops the cut, and says so");
git(core, "tag", "-d", "release-999999999");

// git's own variables that point elsewhere: a project's repository is never touched, and the guard is not fooled
const victim = path.join(tmp, "victim");
fs.mkdirSync(path.join(victim, "core", "scripts"), { recursive: true });
git(victim, "init", "-q", "-b", "main");
fs.writeFileSync(path.join(victim, "f"), "x");
git(victim, "add", "-A");
git(victim, "commit", "-q", "-m", "its own");
const own = git(victim, "rev-parse", "HEAD");
process.env.GIT_DIR = path.join(victim, ".git");
process.env.GIT_WORK_TREE = victim;
let pointed, fooled;
try {
  pointed = fs.mkdtempSync(path.join(tmp, "pointed-"));
  fetchCore(pointed, core);
  fooled = inTheCore(path.join(victim, "core", "scripts", "release.mjs"));
} finally { delete process.env.GIT_DIR; delete process.env.GIT_WORK_TREE; }
ok(releasesIn(pointed)[0]?.name === "release-5" && git(victim, "rev-parse", "HEAD") === own && git(victim, "config", "--get", "core.bare") === "false" && git(victim, "tag").trim() === "", "with git pointed at a project's repository, the core is still fetched into its own folder and the project's is left as it was");
ok(fooled === false, "and a project's copy is still no place to cut a release from");

// where a release may be cut
ok(inTheCore(), "this file lies in the core's own repository");
const project = path.join(tmp, "project");
fs.mkdirSync(path.join(project, "core", "scripts"), { recursive: true });
git(project, "init", "-q");
ok(!inTheCore(path.join(project, "core", "scripts", "release.mjs")), "a copy under a project's core/ is not the core: a project cuts no release");
ok(!inTheCore(path.join(tmp, "nowhere", "scripts", "release.mjs")), "nor is a folder that is no repository");
// a copy kept as a repository of its own under a project's core/, the project's manifest beside it
const nested = path.join(tmp, "nested");
fs.mkdirSync(path.join(nested, "core", "scripts"), { recursive: true });
fs.writeFileSync(path.join(nested, "core-manifest.md"), "# Core manifest\n");
git(path.join(nested, "core"), "init", "-q");
ok(!inTheCore(path.join(nested, "core", "scripts", "release.mjs")), "nor is a clone or submodule of the core under a project's core/");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the core's releases`);
process.exitCode = failed ? 1 : 0;
