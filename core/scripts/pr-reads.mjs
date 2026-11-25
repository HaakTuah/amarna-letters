// What the paths a pull request changes call for, for the line "Read for it:" (split from pr-description.mjs, #888; "One
// script says what to read" in tasks/tools.md). pr-description.mjs, beside this file, runs it and exports it.
import { spawnSync } from "node:child_process";
import { OWN, calledByPaths, coreAt, leftOut, library, ownOf, ownPaths, taken } from "./reading.mjs";

// What the paths a pull request changes call for, [{ file, why }], in the checkout at `dir`, the merge commit against
// its first parent, the base: each file by its path from the root (under core/ in a project). The kinds a project
// gives its own paths, and the modules its manifest leaves out, are read as the base holds them, so that a pull request
// does not set either for itself; the
// modules' own lines are the copy's, which core.yml holds to the core's. Null where the change cannot be read.
export function calledFor(dir) {
  const git = (...args) => { const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26 }); return r.status === 0 ? r.stdout : null; };
  const prefix = coreAt(dir), diff = prefix === null ? null : git("diff", "--name-only", "--no-renames", "-z", "HEAD^1", "HEAD");
  if (diff === null) return null;
  const own = prefix ? ownPaths(OWN.map(f => git("show", `HEAD^1:${f}`)).find(text => text !== null)) : [];
  const lib = taken(library(dir, prefix), leftOut(prefix ? git("show", "HEAD^1:core-manifest.md") : ""));
  return calledByPaths(lib, ownOf(diff.split("\0").filter(Boolean), prefix), own).map(c => ({ ...c, file: `${prefix}${c.file}` }));
}
