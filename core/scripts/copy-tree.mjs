// The tree a project's copy of the core must be: the core's at a pin, without the folders that commit's own
// .gitattributes keeps in the core alone (the lines `/reports export-ignore`, `/words export-ignore` and
// `/tests export-ignore`, which `git archive` obeys when the sync makes the copy; #252, #527). A pin from before such a
// line keeps that folder, and so does any other spelling of the line: each is read as a whole line, byte for byte, as
// core.yml reads it (`grep -x`). Only these names are read, the same list as core.yml's (copy-tree-test.mjs holds the
// two and .gitattributes to it), so a line for another folder needs both changed first. Built in the repository whose git folder is
// `gitDir` (a bare repository's own folder, or a clone's .git), from the pin's own entries: each call names that folder
// outright, as releases.mjs says a bare repository must be. And how two trees are compared, here and in core.yml alike
// (core archive 201): entry by entry, by git's object ids and types, so a file's content, a link and a submodule each
// count, while the executable bit does not: a copy made on Windows by a sync from before #1093 records every file 100644,
// and such a copy is the core's all the same. From #1093 the sync records the bits the core marks (`recordModes`, below),
// and pure-sync.mjs refuses a bit the core does not mark (`executable`, below), so a sync widens no file's mode beyond
// the core's. This is the one place that reason is written; core.yml and pure-sync.mjs point here. Git and Node's own modules only; proven by copy-tree-test.mjs.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { inBare } from "./releases.mjs";

export const KEPT = ["reports", "words", "tests"];
const git = (args, gitDir, input) =>
  inBare(gitDir, args, { input, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"], maxBuffer: 1 << 26 });

export function copyTree(pin, gitDir) {
  let attributes = "";
  try { attributes = git(["show", `${pin}:.gitattributes`], gitDir); } catch { /* (none at that pin) */ }
  const lines = attributes.split("\n"), kept = KEPT.filter((name) => lines.includes(`/${name} export-ignore`));
  if (!kept.length) return git(["rev-parse", `${pin}^{tree}`], gitDir).trim();
  const entries = git(["ls-tree", "-z", pin], gitDir).split("\0").filter((entry) => entry && !kept.includes(entry.slice(entry.indexOf("\t") + 1)));
  return git(["mktree", "-z"], gitDir, entries.map((entry) => `${entry}\0`).join("")).trim();
}

/** A tree's entries, one line each, "mode type id<TAB>path" with every file's mode as 100644, in git's order and with
 *  each path quoted as git quotes it (so no name holding a line's end can pass for two entries), as core.yml lists
 *  them: two copies are the same where these are. `tree` names a tree in the repository whose git folder is `gitDir`. */
export function entries(tree, gitDir) {
  return git(["-c", "core.quotePath=true", "ls-tree", "-r", "--full-tree", tree], gitDir).split("\n").filter(Boolean).map((e) => e.replace(/^100755 blob /, "100644 blob ")).join("\n");
}

/** The files a tree marks executable (mode 100755), one path each, as git quotes it, in git's order. `tree` names a
 *  tree in the repository whose git folder is `gitDir`. */
export function executable(tree, gitDir) {
  return git(["-c", "core.quotePath=true", "ls-tree", "-r", "--full-tree", tree], gitDir).split("\n").filter((e) => e.startsWith("100755 blob ")).map((e) => e.slice(e.indexOf("\t") + 1));
}

/** Records in git's index, run from the project's root, the executable bit of each file of the copy at `dir` as the
 *  core's commit `pin` in `gitDir` marks it (#1093): a copy written on Windows records none, so a workflow that runs a
 *  script of it by its path would fail with "Permission denied". Each file the core marks so is given its bit on disk,
 *  where the file system keeps one, and staged with it, and one the index marks so that the core does not loses it
 *  both ways: the bit on disk too, since where git reads it (core.fileMode) a later `git add` would stage it back. Where
 *  git refuses, it says so and fails nothing: the copy is written all the same. The sync (sync.mjs) calls it. */
export function recordModes(dir, pin, gitDir) {
  // (a plain file alone, with no link on its path below the copy's folder, so no bit is set or staged beyond the copy)
  let root; try { root = fs.realpathSync(dir); } catch { /* (no copy: nothing to mark) */ }
  const file = (f) => { try { return fs.lstatSync(f).isFile() && fs.realpathSync(f) === path.join(root, path.relative(dir, f)); } catch { return false; } };
  const marked = git(["ls-tree", "-r", "-z", pin], gitDir).split("\0").filter((e) => e.startsWith("100755 blob ")).map((e) => `${dir}/${e.slice(e.indexOf("\t") + 1)}`).filter(file);
  // (with core.fsmonitor off, as own-files.mjs reads the index: no command of the project's settings runs)
  const run = (args) => execFileSync("git", ["-c", "core.fsmonitor=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  // (x wherever r, as git checks out a 100755 file; a file system that keeps no bit leaves it to the index)
  const chmod = (f, on) => { try { const m = fs.lstatSync(f).mode & 0o777; fs.chmodSync(f, on ? m | ((m & 0o444) >> 2) : m & ~0o111); } catch { /* (no bit kept) */ } };
  try {
    const stray = run(["ls-files", "-s", "-z", "--", dir]).split("\0").filter((e) => e.startsWith("100755 ")).map((e) => e.slice(e.indexOf("\t") + 1)).filter((f) => !marked.includes(f) && file(f));
    for (const f of marked) chmod(f, true);
    for (const f of stray) chmod(f, false);
    if (marked.length) run(["update-index", "--add", "--chmod=+x", "--", ...marked]);
    if (stray.length) run(["update-index", "--chmod=-x", "--", ...stray]);
  } catch {
    console.log(`note the copy is written, but git did not record the executable bits the core marks (git refused the update of its index). Mend: run \`git update-index --add --chmod=+x -- ${marked.join(" ")}\` from the project's root.`);
  }
}

/** Whether the copy's folder `at` (the manifest's path without its last "/": core-path.mjs) in the commit `rev`, in the
 *  repository whose git folder is `gitDir`, is a folder: a tree entry, never a submodule's pointer (whose id may name a
 *  tree all the same) nor a file or a link. */
export function coreIsFolder(rev, gitDir, at = "core") {
  try {
    return git(["ls-tree", rev, "--", at], gitDir) === `040000 tree ${git(["rev-parse", "--verify", "-q", `${rev}:${at}`], gitDir).trim()}\t${at}\n`;
  } catch {
    return false;
  }
}
