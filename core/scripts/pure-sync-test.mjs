// Tests of the sync (sync.mjs) and of the proof that a sync PR is pure (pure-sync.mjs), the two programs run end to end
// as a project runs them: in a scratch copy of the core with a short history on its main (three commits, the newest the
// core as it stands here) and one commit off it, reached through the core's own address by a git rewrite, so neither
// script changes for the test and no call reaches the network. A project makes its first copy with the sync script from
// a clone of the core, syncs, and the sync is pure; then each way a sync branch can be made to carry more than the copy
// and its pins is tried, and the proof refuses each (the alterations the outside audit's probe tried, core archive 201,
// and more): a job added or removed, a workflow added or deleted, a file outside core/ edited, a hook's settings added,
// core/ edited, added to, made a link or a submodule (one whose id is the copy's own tree too), a workflow's mode,
// another manifest line, a call moved to an older commit of main or renamed to another core workflow, the pin off main,
// text beside a pin, carriage returns, a root .gitattributes, the pin moved backwards; each is refused for the reason
// it means, so a check of pure-sync.mjs's gone fails the suite. Where the change lies under core/, the core's own
// core.yml job, run as GitHub runs it (workflow-run.mjs), fails it too; a file's executable bit alone is no difference
// to either (copy-tree.mjs). And the sync script's own refusals, and its following of the core's releases: a project
// that follows them takes a commit that is no release only through review. On Linux and on Windows. Git, tar, bash and
// Node's own modules.
//
//   node scripts/pure-sync-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE, OWNER } from "./core-address.mjs";
import { copyTree, entries } from "./copy-tree.mjs";
import { checkoutStandIn, scratchEnv } from "./scratch-core.mjs";
import { runWorkflow } from "./workflow-run.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 1200).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pure-sync-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const slash = p => p.replace(/\\/g, "/");
const theCore = path.join(tmp, "the-core");
const env = scratchEnv(theCore, tmp);
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
const node = (dir, ...args) => { const r = spawnSync(process.execPath, args, { cwd: dir, env, encoding: "utf8" }); return { status: r.status, out: `${r.stdout}${r.stderr}` }; };
const write = (dir, f, text) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };
const read = (dir, f) => fs.readFileSync(path.join(dir, f), "utf8");

// ---- the core: Z, A and B on its main, B the core as it stands; a commit off main ----
fs.cpSync(root, theCore, { recursive: true, filter: src => !["/.git", "/node_modules"].some(x => slash(src).endsWith(x)) });
git(theCore, "init", "-q", "-b", "main");
const NOTE_LINE = "- **13 November 2026, a note for the test.** Done when nothing: an entry that B gains over A.\n";
const notes = read(theCore, "setup/sync-notes.md");
const terms = read(theCore, ".github/workflows/personal-terms.yml");
const commit = (message) => { git(theCore, "add", "-A"); git(theCore, "commit", "-q", "--allow-empty", "-m", message); return git(theCore, "rev-parse", "HEAD"); };
write(theCore, "z.md", "only in Z\n");
write(theCore, ".github/workflows/personal-terms.yml", `${terms}# Z\n`);
const Z = commit("Z");
fs.rmSync(path.join(theCore, "z.md"));
write(theCore, ".github/workflows/personal-terms.yml", `${terms}# A\n`);
const A = commit("A");
write(theCore, ".github/workflows/personal-terms.yml", terms);
write(theCore, "setup/sync-notes.md", `${notes}${NOTE_LINE}`);
const B = commit("B");
const SIDE = git(theCore, "commit-tree", `${B}^{tree}`, "-p", B, "-m", "off main");
const SHA = sha => sha.slice(0, 7);

// ---- a project, its first copy made from a clone of the core at A ----
const clone = path.join(tmp, "core-clone");
git(tmp, "clone", "-q", theCore, clone);
git(clone, "checkout", "-q", A);
const origin = path.join(tmp, "project.git"), p = path.join(tmp, "project");
git(tmp, "init", "-q", "--bare", "-b", "main", origin);
fs.mkdirSync(p);
git(p, "init", "-q", "-b", "main");
git(p, "remote", "add", "origin", origin);
const manifest = (owner, pin = A) => `# Core manifest\n\nCore: ${CORE} at ${pin}, copied whole under core/ (never edited here).\nFloor: whole. Modules: all.\n\n## Slots\n| Slot | Here |\n| --- | --- |\n| *owner's account* | \`${owner}\` |\n`;
write(p, "core-manifest.md", manifest(OWNER));
const first = node(p, path.join(clone, "scripts", "sync.mjs"));
ok(first.status === 0 && first.out.includes("the first copy"), "the first copy: the sync script, run from a clone of the core, writes core/ at the manifest's pin", first.out);
write(p, ".github/workflows/core.yml", `name: core\non:\n  pull_request:\njobs:\n  core:\n    uses: ${CORE}/.github/workflows/core.yml@${A}\n  terms:\n    uses: ${CORE}/.github/workflows/personal-terms.yml@${A}\n    secrets: inherit\n`);
write(p, "README.md", "# A project\n");
git(p, "add", "-A");
git(p, "commit", "-q", "-m", "base");
git(p, "push", "-q", "origin", "main");
const base = git(p, "rev-parse", "HEAD");
ok(entries(git(p, "rev-parse", "HEAD:core"), p) === entries(copyTree(A, theCore), theCore), "  core/ is the core's tree at A, without the folder it keeps to itself");

// ---- the sync ----
git(p, "checkout", "-q", "-b", "sync");
const s = node(p, "core/scripts/sync.mjs");
const calls = read(p, ".github/workflows/core.yml");
ok(s.status === 0 && s.out.includes(`${SHA(A)} -> ${SHA(B)}`) && read(p, "core-manifest.md") === manifest(OWNER, B), "the sync takes a project that follows main to the core's newest commit, and moves the manifest's pin", s.out);
ok(calls.includes(`personal-terms.yml@${B}`) && calls.includes(`core.yml@${A}`) && s.out.includes("personal-terms.yml"), "  it moves a call whose workflow changed, and leaves one whose workflow did not", calls);
ok(s.out.includes("a note for the test"), "  and prints the sync notes the core gained between the two pins", s.out);
git(p, "add", "-A");
git(p, "commit", "-q", "-m", "sync");
const LEGIT = git(p, "rev-parse", "HEAD");
ok(entries(git(p, "rev-parse", "HEAD:core"), p) === entries(copyTree(B, theCore), theCore), "  core/ is now the core's tree at B");

// the proof, from the core at B, and the core's own check of the copy, as GitHub runs core.yml
const pure = () => node(p, path.join(theCore, "scripts", "pure-sync.mjs"));
const coreCheck = () => {
  const sha = git(p, "rev-parse", "HEAD");
  git(p, "push", "-q", "-f", "origin", "HEAD:refs/heads/check");
  const github = { event_name: "pull_request", repository: "someone/project", event: { repository: { default_branch: "main", private: false }, pull_request: { base: { sha: base } } } };
  const [job] = runWorkflow(read(theCore, ".github/workflows/core.yml"), { github, base: env, temp: tmp,
    workspace: () => { const ws = fs.mkdtempSync(path.join(tmp, "ws-")); git(ws, "clone", "-q", "--no-checkout", origin, "."); git(ws, "checkout", "-q", "--detach", sha); return ws; },
    uses: { "actions/checkout": checkoutStandIn(env, tmp) } });
  return { passed: job.passed, out: job.steps.map(x => x.out).join("") };
};
const legit = pure();
ok(legit.status === 0 && legit.out.includes(`sha=${LEGIT}`), "the sync as the script makes it is pure, and the proof names the head it read", legit.out);
ok(coreCheck().passed, "  and the core's own check of the copy passes it");

// each way a sync branch can be made to carry more: refused, and where it lies under core/, failed by core.yml too
let canLink = true;
try { fs.symlinkSync("nowhere", path.join(tmp, "probe")); } catch { canLink = false; }
// (each with the refusal it means, so that a case refused for another reason, its own check gone, fails: pure-sync.mjs's
// words, and where the change lies under core/, core.yml's)
const NOT_COPY = "is not a folder holding the core's tree", DIFFERS = "core/ differs", NO_FOLDER = "core/ is no folder";
const removeCore = () => { git(p, "rm", "-q", "-r", "--cached", "core"); fs.rmSync(path.join(p, "core"), { recursive: true, force: true }); };
const outside = path.join(tmp, "same-outside.md");
const tries = [
  ["a job added to a workflow", () => write(p, ".github/workflows/core.yml", calls.replace("jobs:\n", "jobs:\n  evil:\n    runs-on: ubuntu-latest\n    steps: [{run: \"echo evil\"}]\n")), "lines added or removed, not only a pin moved"],
  ["a job removed from a workflow", () => write(p, ".github/workflows/core.yml", calls.replace(/  terms:\n[^]*$/u, "")), "lines added or removed, not only a pin moved"],
  ["a new workflow", () => write(p, ".github/workflows/new.yml", "on: push\n"), "a file created, deleted or given a new mode"],
  ["a workflow deleted", () => fs.rmSync(path.join(p, ".github/workflows/core.yml")), "a file created, deleted or given a new mode"],
  ["a file outside core/ edited", () => write(p, "README.md", "# A project, changed\n"), "README.md: not the core's copy, its pin or a workflow"],
  ["a hook's settings added", () => write(p, ".claude/settings.json", "{}\n"), ".claude/settings.json: not the core's copy, its pin or a workflow"],
  ["core/ edited", () => write(p, "core/README.md", `${read(p, "core/README.md")}x\n`), NOT_COPY, DIFFERS],
  ["a file added under core/", () => write(p, "core/extra.md", "x\n"), NOT_COPY, DIFFERS],
  ["a mode change on a workflow", () => { git(p, "update-index", "--chmod=+x", ".github/workflows/core.yml"); return "staged"; }, "a file created, deleted or given a new mode"],
  ["another manifest line changed", () => write(p, "core-manifest.md", read(p, "core-manifest.md").replace("Modules: all.", "Modules: none.")), "a changed line with no pin, or one not the new pin"],
  ["a call moved to an older commit of the core's main, not the new pin", () => write(p, ".github/workflows/core.yml", calls.replace(`personal-terms.yml@${B}`, `personal-terms.yml@${Z}`)), "a changed line with no pin, or one not the new pin"],
  ["a call renamed to another core workflow at the pin", () => write(p, ".github/workflows/core.yml", calls.replace(`personal-terms.yml@${B}`, `security-review.yml@${B}`)), "a change beyond a pin"],
  ["the manifest and a call pinned to a commit not on the core's main", () => { write(p, "core-manifest.md", manifest(OWNER, SIDE)); write(p, ".github/workflows/core.yml", calls.replace(`personal-terms.yml@${B}`, `personal-terms.yml@${SIDE}`)); }, `${SIDE} is not a commit of the core's main`],
  ["text added beside a pin", () => write(p, ".github/workflows/core.yml", calls.replace(`personal-terms.yml@${B}`, `personal-terms.yml@${B} # ok`)), "a change beyond a pin"],
  ["every workflow line given a carriage return", () => write(p, ".github/workflows/core.yml", calls.replace(/\n/g, "\r\n")), "a changed line with no pin, or one not the new pin"],
  ["a .gitattributes added at the root", () => write(p, ".gitattributes", "* text eol=crlf\n"), ".gitattributes: not the core's copy, its pin or a workflow"],
  ["core/ made a submodule", () => { removeCore(); git(p, "update-index", "--add", "--cacheinfo", `160000,${B},core`); return "staged"; }, NOT_COPY, NO_FOLDER],
  ["core/ made a submodule's pointer whose id is the copy's own tree", () => { const tree = git(p, "rev-parse", "HEAD:core"); removeCore(); git(p, "update-index", "--add", "--cacheinfo", `160000,${tree},core`); return "staged"; }, NOT_COPY, NO_FOLDER],
  ...(canLink ? [["a file of core/ made a link to an identical file outside the project", () => { fs.copyFileSync(path.join(p, "core/README.md"), outside); fs.rmSync(path.join(p, "core/README.md")); fs.symlinkSync(path.relative(path.join(p, "core"), outside), path.join(p, "core/README.md")); }, NOT_COPY, DIFFERS]] : []),
];
if (!canLink) console.log("skip the link: this machine lets the test make none");
for (const [what, alter, refused, coreFails] of tries) {
  if (alter() !== "staged") git(p, "add", "-A"); // (a change made in the index alone is not undone by an add)
  git(p, "commit", "-q", "-m", what);
  const r = pure();
  ok(r.status === 1 && r.out.includes(`NOT PURE`) && r.out.includes(refused) && !r.out.includes("merge it with"), `${what}: not a pure sync ("${refused}")`, r.out);
  if (coreFails) { const c = coreCheck(); ok(!c.passed && c.out.includes(coreFails), `  and the core's own check of the copy fails it ("${coreFails}")`, c.out); }
  git(p, "reset", "-q", "--hard", LEGIT);
  git(p, "clean", "-q", "-fd");
}
// a file's executable bit alone: no difference to either (a copy made on Windows records none)
git(p, "update-index", "--chmod=+x", "core/README.md");
git(p, "update-index", "--chmod=-x", "core/scripts/work-saved.sh");
git(p, "commit", "-q", "-m", "modes");
const modes = pure();
ok(modes.status === 0 && git(p, "ls-files", "-s", "core/scripts/work-saved.sh").startsWith("100644"), "a copy whose files' executable bits differ from the core's, as one made on Windows, is still pure", modes.out);
ok(coreCheck().passed, "  and the core's own check of the copy passes it");
git(p, "reset", "-q", "--hard", LEGIT);

// the pin moved backwards, as the sync script itself would move it given an older commit
git(p, "checkout", "-q", "-B", "back", base);
const back = node(p, "core/scripts/sync.mjs", Z);
git(p, "add", "-A");
git(p, "commit", "-q", "-m", "back");
const backwards = pure();
ok(back.status === 0 && backwards.status === 1 && backwards.out.includes("the pin goes back"), "the pin moved backwards: not a pure sync", `${back.out}\n${backwards.out}`);

// ---- the sync script's own refusals, and the releases ----
git(p, "checkout", "-q", "-B", "more", base);
const short = node(p, "core/scripts/sync.mjs", "main");
ok(short.status === 1 && short.out.includes("full SHA") && git(p, "status", "--porcelain") === "", "a commit given otherwise than as a full SHA is refused, and nothing is written", short.out);
const off = node(p, "core/scripts/sync.mjs", SIDE);
ok(off.status === 1 && off.out.includes("not a commit of the core's main") && git(p, "status", "--porcelain") === "", "so is one off the core's main", off.out);
const same = node(p, "core/scripts/sync.mjs", A);
ok(same.status === 0 && same.out.includes("already at") && git(p, "status", "--porcelain") === "", "at the pin already, there is nothing to sync", same.out);
write(p, "core-manifest.md", manifest("someone-else"));
git(p, "commit", "-q", "-am", "another owner");
const other = git(p, "rev-parse", "HEAD");
git(p, "push", "-q", "-f", "origin", "HEAD:main"); // (the project of another owner is now main's own)
const none = node(p, "core/scripts/sync.mjs");
ok(none.status === 0 && none.out.includes("no release yet") && git(p, "status", "--porcelain") === "", "a project of another owner follows the releases: where the core has cut none, it takes nothing", none.out);
git(theCore, "tag", "release-1", A);
const atOne = node(p, "core/scripts/sync.mjs");
ok(atOne.status === 0 && atOne.out.includes("release-1") && git(p, "status", "--porcelain") === "", "where the newest release is the project's own pin, it takes nothing", atOne.out);
git(theCore, "tag", "release-2", B);
const atTwo = node(p, "core/scripts/sync.mjs");
ok(atTwo.status === 0 && atTwo.out.includes(`${SHA(A)} -> ${SHA(B)} (release-2)`) && read(p, "core-manifest.md") === manifest("someone-else", B), "and once a newer release is cut, it takes that release", atTwo.out);
git(p, "commit", "-q", "-am", "to release-2");
const released = pure();
ok(released.status === 0 && released.out.includes("a pure sync"), "  a sync to a release, in a project that follows the releases, is pure", released.out);
// (it takes a commit of main that is no release only through review: the sync is made, and is no pure sync; core archive 201)
write(theCore, "c.md", "only in C\n");
const C = commit("C");
git(p, "checkout", "-q", "-B", "unreleased", other);
const toC = node(p, "core/scripts/sync.mjs", C);
git(p, "commit", "-q", "-am", "to C");
const unreleased = pure();
ok(toC.status === 0 && read(p, "core-manifest.md") === manifest("someone-else", C) && unreleased.status === 1 && unreleased.out.includes(`${C} is no release of the core: the sync is reviewed like any PR`),
  "a sync to a commit that is no release, in a project that follows the releases, is made, and is no pure sync: it is reviewed like any PR", `${toC.out}\n${unreleased.out}`);
// (and a manifest that does not say what it follows, two rows of it, is read as following nothing: no sync to a commit
// that is no release is pure there either)
git(p, "checkout", "-q", "-B", "unclear", other);
write(p, "core-manifest.md", `${manifest("someone-else")}| *follows* | \`main\` |\n| *follows* | \`releases\` |\n`);
git(p, "commit", "-q", "-am", "two rows");
git(p, "push", "-q", "-f", "origin", "HEAD:main");
const toCAgain = node(p, "core/scripts/sync.mjs", C);
git(p, "commit", "-q", "-am", "to C");
const unclear = pure();
ok(unclear.status === 1 && unclear.out.includes(`does not say what it follows, and ${C} is no release of the core`), "a sync to a commit that is no release, in a project whose manifest does not say what it follows, is no pure sync either", `${toCAgain.out}\n${unclear.out}`);

// (a release tag on a commit off the core's main comes in with the tags, so that commit is there to read: a pin at it is
// still no commit of main)
git(p, "push", "-q", "-f", "origin", `${base}:main`);
git(p, "checkout", "-q", "-B", "side", LEGIT);
git(theCore, "tag", "release-3", SIDE);
write(p, "core-manifest.md", manifest(OWNER, SIDE));
write(p, ".github/workflows/core.yml", calls.replace(`personal-terms.yml@${B}`, `personal-terms.yml@${SIDE}`));
git(p, "commit", "-q", "-am", "to the side");
const tagged = pure();
ok(tagged.status === 1 && tagged.out.includes(`${SIDE} is not a commit of the core's main`), "a pin at a commit off the core's main that a release tag names is no commit of main all the same", tagged.out);

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the sync and the proof that it is pure`);
process.exitCode = failed ? 1 : 0;
