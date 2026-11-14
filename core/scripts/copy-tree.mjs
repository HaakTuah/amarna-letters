// The tree a project's copy of the core must be: the core's at a pin, without the one folder that commit's own
// .gitattributes keeps in the core alone (the line `/reports export-ignore`, which `git archive` obeys when the sync
// makes the copy). A pin from before that line gives the whole tree, and so does any other spelling of the line: it
// is read as a whole line, byte for byte, as core.yml reads it (`grep -x`). Built in the repository at `dir`, from the
// pin's own entries. And how two trees are compared, here and in core.yml alike (core archive 201): entry by entry,
// by git's object ids and types, so a file's content, a link and a submodule each count, while the executable bit
// does not: a copy made on Windows records every file 100644, and nothing runs a file of the copy by its mode (each of
// its scripts is started through bash or node). This is the one place that reason is written; core.yml and
// pure-sync.mjs point here. Git and Node's own modules only; proven by copy-tree-test.mjs.
import { execFileSync } from "node:child_process";

const KEPT = "/reports export-ignore";
const git = (args, cwd, input) =>
  execFileSync("git", args, { cwd, input, encoding: "utf8", stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"], maxBuffer: 1 << 26 });

export function copyTree(pin, dir) {
  let attributes = "";
  try { attributes = git(["show", `${pin}:.gitattributes`], dir); } catch { /* (none at that pin) */ }
  if (!attributes.split("\n").includes(KEPT)) return git(["rev-parse", `${pin}^{tree}`], dir).trim();
  const entries = git(["ls-tree", "-z", pin], dir).split("\0").filter((entry) => entry && entry.slice(entry.indexOf("\t") + 1) !== "reports");
  return git(["mktree", "-z"], dir, entries.map((entry) => `${entry}\0`).join("")).trim();
}

/** A tree's entries, one line each, "mode type id<TAB>path" with every file's mode as 100644, in git's order and with
 *  each path quoted as git quotes it (so no name holding a line's end can pass for two entries), as core.yml lists
 *  them: two copies are the same where these are. `tree` names a tree in the repository at `dir`. */
export function entries(tree, dir) {
  return git(["-c", "core.quotePath=true", "ls-tree", "-r", "--full-tree", tree], dir).split("\n").filter(Boolean).map((e) => e.replace(/^100755 blob /, "100644 blob ")).join("\n");
}

/** Whether `core` in the commit `rev`, in the repository at `dir`, is a folder: a tree entry, never a submodule's
 *  pointer (whose id may name a tree all the same) nor a file or a link. */
export function coreIsFolder(rev, dir) {
  try {
    return git(["ls-tree", rev, "--", "core"], dir) === `040000 tree ${git(["rev-parse", "--verify", "-q", `${rev}:core`], dir).trim()}\tcore\n`;
  } catch {
    return false;
  }
}
