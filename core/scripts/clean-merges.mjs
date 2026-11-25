#!/usr/bin/env node
// Which updates from main of a pull request are the merges git makes (#323)? The review statuses
// (scripts/security-review.mjs and scripts/code-review-wait.mjs) let a review of an earlier commit stand for the head
// where only updates from main follow it, merges whose second parent is no commit of the pull request's; read by their
// parents alone, such a merge could carry a change of its own that no review saw. This proves, of each merge that walk
// passes (standsFrom), that git's own merge of its two parents (`git merge-tree --write-tree`, git 2.38 and later, the
// strategy GitHub's "Update branch" uses too) makes it without a conflict and writes the merge's own tree. A merge it
// cannot prove so (a conflict resolved by hand, a change of its own, parents other than GitHub says, an object
// missing, a git too old) is left out, and the statuses stop there: a review of that merge or of a later commit is
// then what stands. Run by the core's workflow security-review.yml from the default branch's copy, inside a clone of its
// own that holds the head's commits and checks nothing out, so that nothing of the pull request's runs; it reads git's
// objects and writes only the trees git's merge makes into that clone. It prints, as JSON, the SHAs of the merges proved
// ([] where none is). Git and Node's own modules only.
//
// Usage (in that clone):  node scripts/clean-merges.mjs <the pull request, as GitHub's API gives it> <its commits, the same>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { standsFrom } from "./security-review.mjs";
import { started } from "./started.mjs";

const SHA = /^[0-9a-f]{40}$/u;
const flat = (pages) => (Array.isArray(pages) ? pages.flat() : []).filter((entry) => entry !== null && typeof entry === "object");
const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 }).trim();

// whether git's merge of the commit's two parents, as the pull request's list gives them, is the commit's own tree
export function isGits(at, parents, cwd) {
  if (![at, ...parents].every((sha) => typeof sha === "string" && SHA.test(sha)) || parents.length !== 2) return false;
  try {
    // (its parents as git holds them, so that a list that names others proves nothing; a conflict exits 1, and throws)
    if (git(["show", "-s", "--format=%P", at], cwd) !== parents.join(" ")) return false;
    const made = git(["merge-tree", "--write-tree", "--no-messages", parents[0], parents[1]], cwd).split("\n")[0];
    return SHA.test(made) && made === git(["rev-parse", `${at}^{tree}`], cwd);
  } catch {
    return false;
  }
}

// the merges proved, of those the walk from the head passes: each in turn, from the head, until one is not, since the
// walk stops there
export function proved(pull, commits, cwd) {
  const head = pull?.head?.sha;
  if (typeof head !== "string" || !SHA.test(head)) return [];
  const list = flat(commits);
  const by = new Map(list.filter((commit) => typeof commit.sha === "string").map((commit) => [commit.sha, commit]));
  const out = [];
  for (const at of standsFrom(pull, list, head)) {
    const parents = by.get(at)?.parents;
    if (!Array.isArray(parents) || parents.length !== 2 || by.has(parents[1]?.sha)) break;
    if (!isGits(at, parents.map((parent) => parent?.sha), cwd)) break;
    out.push(at);
  }
  return out;
}

if (started(import.meta.url)) {
  const [pullFile, commitsFile] = process.argv.slice(2);
  if (!pullFile || !commitsFile) {
    console.error("usage: node scripts/clean-merges.mjs <the pull request, as JSON> <its commits, as JSON>");
    process.exit(2);
  }
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  console.log(JSON.stringify(proved(read(pullFile), read(commitsFile), process.cwd())));
}
