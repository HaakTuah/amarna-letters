// The line "Reasons read:" a pull request that adds a difference carries (split from pr-description.mjs, #888; tasks/updates.md, "A question or difference about a rule of the core starts from its reasons"; #756). pr-description.mjs,
// beside this file, says what the check asks as a whole, runs this one and exports what it holds.
import { spawnSync } from "node:child_process";
import { differencesOf } from "./manifest-reads.mjs";
import { textOf } from "./reading.mjs";

export const REASONS = "Reasons read:";

// The lines a pull request adds under the manifest's "Differences", in the checkout at `dir`, the merge commit against
// its first parent, the base (every line where the base holds no manifest, as a project's first, or one git cannot give
// whole): [] where the head holds none, UNREADABLE where it holds one git cannot give whole (a link, a folder, a
// submodule, past MANIFEST_MAX bytes) or git fails, which fails rather than passes, and null where there is no base to
// read against.
export const UNREADABLE = "unreadable";
export const MANIFEST_MAX = 1 << 24;
export function differencesAdded(dir) {
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8", maxBuffer: MANIFEST_MAX });
  if (git("rev-parse", "--verify", "--quiet", "HEAD^1").status !== 0) return null;
  // (absent: ""; there, but no plain file git can give whole, or git failed: null)
  const read = at => {
    const entry = git("ls-tree", "-z", "--full-tree", at, "--", "core-manifest.md");
    if (entry.status !== 0 || entry.error) return null;
    if (entry.stdout === "") return "";
    const [, mode, sha] = /^(\d+) blob ([0-9a-f]+)\tcore-manifest\.md\0$/u.exec(entry.stdout) ?? [];
    const r = mode === "100644" || mode === "100755" ? git("cat-file", "blob", sha) : null;
    return r && r.status === 0 && !r.error ? r.stdout : null;
  };
  const head = read("HEAD");
  if (head === null) return UNREADABLE;
  const was = new Set(differencesOf(read("HEAD^1") ?? "").map(l => l.trim()));
  return differencesOf(head).map(l => l.trim()).filter(l => !was.has(l) && !/^None\.?$/iu.test(l));
}

// The mend where a pull request adds a difference and its description has no line REASONS with something after it;
// null where it has one, or adds none. `at` is where the core's copy stands, as the manifest's "Core:" line puts it.
export function reasonsMend(body, added, at = "core/") {
  if (added === UNREADABLE) return `the pull request's core-manifest.md cannot be read whole (a link, a folder, a submodule, or past ${MANIFEST_MAX} bytes), so what it adds under "Differences" cannot be told. Mend: keep core-manifest.md a text file in the manifest's form, far under that size, and push again`;
  if (!Array.isArray(added) || !added.length) return null;
  // (blanks and invisible format characters after the label are nothing)
  if (textOf(body).split(/\r\n|\r|\n/u).some(l => l.trim().startsWith(REASONS) && l.trim().slice(REASONS.length).replace(/[\s\p{Cf}]/gu, ""))) return null;
  return `it adds ${added.length === 1 ? "a line" : `${added.length} lines`} under the manifest's "Differences" ("${added[0].replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, " ").slice(0, 80)}"), and the description has no line "${REASONS}". Mend: for each rule of the core it departs from, run \`node ${at}scripts/reasons.mjs "<the rule's file and lead>"\`, read the archive items and the issues it prints, and add a line "${REASONS} <those items and issues>, and which of their reasons does not hold for this project, and why"; where a line departs from no rule of the core (a step of the sync notes, a file the starter kit writes), say so on that line`;
}
