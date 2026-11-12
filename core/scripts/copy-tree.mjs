// The tree a project's copy of the core must be: the core's at a pin, without the one folder that commit's own
// .gitattributes keeps in the core alone (the line `/reports export-ignore`, which `git archive` obeys when the sync
// makes the copy). A pin from before that line gives the whole tree, and so does any other spelling of the line: it
// is read as a whole line, byte for byte, as core.yml reads it (`grep -x`). Built in the repository at `dir`, from the
// pin's own entries. Git and Node's own modules only; proven by copy-tree-test.mjs.
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
