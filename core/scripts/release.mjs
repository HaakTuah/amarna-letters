// Cuts a release of the core (README.md, "How a project takes the core", point 1; AGENTS.md, "A release is cut on the
// owner's word"): the tag `release-N`, N one past the newest release's, on the newest commit of the core's main. A
// project that follows the releases (releases.mjs, beside this file) takes the core only from such a tag, so a release
// is what the core's owner hands on to another owner's project, on purpose. Run in the core's own repository alone: in
// a project's copy it refuses, since a project cuts no release. Without --cut it says what the release would be and
// what it would ask of a project (the sync notes it carries), and cuts nothing. The owner tags nothing by hand: the
// release workflow (.github/workflows/release.yml) runs the cut, started by a session on the owner's word, and hands
// it the commit it was started on and GitHub's list of the checks that ran there; the cut is refused where main has
// moved on from that commit, or where a check on it has not passed. Git and Node's own modules only.
//
//   node scripts/release.mjs          what the next release would be, and what it carries
//   node scripts/release.mjs --cut --at <sha> --runs <file>
//                                     cuts it: the tag is pushed to the core's repository, and nothing else is. Only
//                                     where main's newest commit is <sha>, and the checks listed in <file>, GitHub's
//                                     answer to repos/<core>/actions/runs?head_sha=<sha>&branch=main&event=push, have
//                                     all passed: without the two it cuts nothing
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { NOTES, RELEASE, asksBetween, fetchCore, namedReleases, plainEnv, releasesIn } from "./releases.mjs";
import { started } from "./started.mjs";

const git = (args, cwd) => execFileSync("git", args, { cwd, env: plainEnv(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// The next release in a repository that holds the core's main and its tags: its name, the commit it would stand on,
// the release before it (null: the first), and what a sync from that one to it asks of a project. Null where the
// newest release already stands on main's newest commit: there is nothing to hand on. It is numbered after every tag
// with a release's name, one that is no release included, so its name is never taken; and it throws where that number
// would be no release's name any more, and where `at` is given and main's newest commit is another: main has moved
// on since whoever asks looked at it.
export function next(dir, at = null) {
  const tip = git(["rev-parse", "refs/heads/main"], dir);
  if (at !== null && at !== tip) throw new Error(`main's newest commit is ${tip}, not ${at}: main has moved on, so start the release again`);
  const [before] = releasesIn(dir);
  if (before?.sha === tip) return null;
  const name = `release-${(namedReleases(dir).at(-1)?.n ?? 0) + 1}`;
  if (!RELEASE.test(name)) throw new Error(`${name} is no release's name: a tag numbered too high stands in the way, and is the owner's to remove`);
  return { name, sha: tip, before: before ?? null, asks: before ? asksBetween(before.sha, tip, dir) : [] };
}

// This repository's own release workflow: its runs on a commit are no check of that commit.
export const OWN = ".github/workflows/release.yml";

// Why a release may not stand on a commit yet, each reason a line, from GitHub's list of the workflow runs that the
// push of that commit to main started (repos/<core>/actions/runs?head_sha=<sha>&branch=main&event=push); none where
// it may. It may where every such run has finished and passed, and at least one did more than skip: a run still going,
// one that failed or was cancelled, a list read only in part, and a commit no check has run on yet each hold it, so a
// release never stands on a commit whose checks the core's own main has not passed. Nothing is guessed: a list in any
// other form holds it too.
export function held(list, own = OWN) {
  const runs = list?.workflow_runs;
  if (!Array.isArray(runs) || !Number.isSafeInteger(list.total_count)) return ["the list of the checks on it could not be read"];
  if (list.total_count !== runs.length) return [`${list.total_count} runs stand on it and ${runs.length} were read`];
  const checks = runs.filter(r => r?.path !== own);
  const passed = r => r?.status === "completed" && ["success", "skipped", "neutral"].includes(r.conclusion);
  const reasons = checks.filter(r => !passed(r)).map(r => `${r?.name ?? "a check"}: ${r?.status === "completed" ? r.conclusion : r?.status ?? "unreadable"}`);
  if (!reasons.length && !checks.some(r => r.conclusion === "success")) reasons.push("no check has passed on it yet");
  return reasons;
}

// Whether this file lies in the core's own repository: its scripts/ at the root of a repository that is no project's
// copy, even a copy kept as a repository of its own (a clone or a submodule under a project's core/, with the
// project's manifest beside it).
export function inTheCore(file = fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(file), "..");
  // (asked of git as a path from the repository's root, empty at the root itself: no two spellings of one folder,
  // such as Windows' short names, are ever compared)
  try { if (git(["rev-parse", "--show-prefix"], root) !== "") return false; } catch { return false; }
  return !(path.basename(root) === "core" && fs.existsSync(path.join(root, "..", "core-manifest.md")));
}

// The value after a flag on the command line, null where the flag is not there; it throws where the flag stands last.
function after(flag, argv) {
  const i = argv.indexOf(flag);
  if (i < 0) return null;
  if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
  return argv[i + 1];
}

function main(argv) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
  if (!inTheCore()) return fail("run it in the core's own repository: a project cuts no release");
  const cut = argv.includes("--cut");
  let at, runs;
  try { at = after("--at", argv); runs = after("--runs", argv); } catch (e) { return fail(e.message); }
  // (asked before anything is fetched: a cut is never tried without the commit it is for and the checks on it)
  if (cut && (at === null || runs === null)) return fail("--cut needs --at <sha> and --runs <file>: the release workflow gives both (.github/workflows/release.yml)");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-release-"));
  try {
    fetchCore(dir);
    const release = next(dir, at);
    if (!release) { console.log(`the newest release, ${releasesIn(dir)[0].name}, already stands on main's newest commit: nothing to release`); return; }
    const { name, sha, before, asks } = release;
    console.log(`${name} at ${sha}${before ? `, after ${before.name} at ${before.sha.slice(0, 7)}: https://github.com/${CORE}/compare/${before.name}...${sha}` : ", the first release"}`);
    console.log(asks === null
      ? `What it asks of a project beyond the copy could not be read: read ${NOTES} for the entries newer than ${before.name}.`
      : asks.length
        ? `It asks more of a project than the copy (${NOTES}):\n${asks.join("\n")}`
        : before ? `It asks nothing of a project beyond the copy (${NOTES}).` : `The first release: a project reads ${NOTES} whole against where it stands.`);
    if (!cut) { console.log("Not cut: the release workflow cuts it, started on the owner's word."); return; }
    let list = null;
    try { list = JSON.parse(fs.readFileSync(runs, "utf8")); } catch { /* (held, below, says it could not be read) */ }
    const reasons = held(list);
    if (reasons.length) return fail(`${name} is not cut: the checks on ${sha.slice(0, 7)} have not all passed. Start the release again once they have.\n${reasons.map(r => `  ${r}`).join("\n")}`);
    // (the commit goes straight to the new tag on the core's repository: a tag that exists is never moved)
    git(["push", "--quiet", `https://github.com/${CORE}`, `${sha}:refs/tags/${name}`], dir);
    console.log(`${name} is cut.`);
  } catch (e) {
    fail(e.stderr?.toString().trim() || e.message);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (started(import.meta.url)) main(process.argv.slice(2));
