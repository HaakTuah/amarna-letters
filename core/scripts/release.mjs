// Cuts a release of the core (README.md, "How a project takes the core", point 1; AGENTS.md, "A release is cut on the
// owner's word"): the tag `release-N`, N one past the newest release's, on the newest commit of the core's main. A
// project that follows the releases (releases.mjs, beside this file) takes the core only from such a tag, so a release
// is what the core's owner hands on to another owner's project, on purpose. Run in the core's own repository alone: in
// a project's copy it refuses, since a project cuts no release. Without --cut it says what the release would be and
// what it would ask of a project (the sync notes it carries), and cuts nothing. Git and Node's own modules only.
//
//   node scripts/release.mjs          what the next release would be, and what it carries
//   node scripts/release.mjs --cut    cuts it: the tag is pushed to the core's repository, and nothing else is
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
// would be no release's name any more.
export function next(dir) {
  const tip = git(["rev-parse", "refs/heads/main"], dir);
  const [before] = releasesIn(dir);
  if (before?.sha === tip) return null;
  const name = `release-${(namedReleases(dir).at(-1)?.n ?? 0) + 1}`;
  if (!RELEASE.test(name)) throw new Error(`${name} is no release's name: a tag numbered too high stands in the way, and is the owner's to remove`);
  return { name, sha: tip, before: before ?? null, asks: before ? asksBetween(before.sha, tip, dir) : [] };
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

function main(cut) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exitCode = 1; };
  if (!inTheCore()) return fail("run it in the core's own repository: a project cuts no release");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "core-release-"));
  try {
    fetchCore(dir);
    const release = next(dir);
    if (!release) { console.log(`the newest release, ${releasesIn(dir)[0].name}, already stands on main's newest commit: nothing to release`); return; }
    const { name, sha, before, asks } = release;
    console.log(`${name} at ${sha}${before ? `, after ${before.name} at ${before.sha.slice(0, 7)}: https://github.com/${CORE}/compare/${before.name}...${sha}` : ", the first release"}`);
    console.log(asks === null
      ? `What it asks of a project beyond the copy could not be read: read ${NOTES} for the entries newer than ${before.name}.`
      : asks.length
        ? `It asks more of a project than the copy (${NOTES}):\n${asks.join("\n")}`
        : before ? `It asks nothing of a project beyond the copy (${NOTES}).` : `The first release: a project reads ${NOTES} whole against where it stands.`);
    if (!cut) { console.log("Not cut: --cut cuts it, on the owner's word."); return; }
    // (the commit goes straight to the new tag on the core's repository: a tag that exists is never moved)
    git(["push", "--quiet", `https://github.com/${CORE}`, `${sha}:refs/tags/${name}`], dir);
    console.log(`${name} is cut.`);
  } catch (e) {
    fail(e.stderr?.toString().trim() || e.message);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (started(import.meta.url)) main(process.argv.includes("--cut"));
