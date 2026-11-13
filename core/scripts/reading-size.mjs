// The reading-size check ("Read little" and "Split by meaning" in modules/how-to-work.md), for every project that takes
// the core, measured on every PR. Its marks are the project's *size marks*, a JSON file (its SECURITY.md names it under
// rule 3, among the checks on the work), and it fails:
//   - when a file every session reads ("read") is past its mark (about 20 KB, "each"; one past that has a mark of its
//     own, its size: when the file shrinks, the mark comes down with it), or their total is
//     past "total";
//   - when the PR changes a file past "split" (about 50 KB: Step 0, split it by meaning first), unless "past" lists it
//     with a mark at least its size. The copy of the core (core/, changed only by a sync PR), the paths under "skip"
//     (such as the archive: dated records, added to by every merge) and binary files are not counted.
// A PR that crosses a mark moves the mark in the config only as modules/review-guidelines.md says ("A mark on what
// every session reads", and "What blocks"). The PR's changes are those against SIZES_BASE (set by the copies workflow,
// .github/workflows/copies.yml, which runs this), else where HEAD left origin/main; in CI that is the base's tip
// against the PR's merge commit, so a run after the base moves on counts its new changes too. Node's own modules only.
// It checks the project it lies in (core/scripts/ there), whatever the directory it is started from; the config's own
// path is read from that directory.
//
//   node core/scripts/reading-size.mjs <config>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const git = args => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const MARKS = process.argv[2];
if (!MARKS) { console.error("FAIL: name the config: node core/scripts/reading-size.mjs <config>"); process.exit(1); }
const marks = JSON.parse(fs.readFileSync(MARKS, "utf8"));
const num = v => Number.isInteger(v) && v > 0, nums = o => o && typeof o === "object" && !Array.isArray(o) && Object.values(o).every(num);
const shape = [num(marks.each), nums(marks.read), num(marks.total), num(marks.split), marks.past === undefined || nums(marks.past),
  marks.skip === undefined || Array.isArray(marks.skip) && marks.skip.every(s => typeof s === "string" && s.length)];
if (shape.includes(false)) {
  console.error(`FAIL: ${MARKS} must hold "each", "total" and "split" (byte counts), "read" (each file to its mark), and may hold "past" (each file to its mark) and "skip" (paths)`);
  process.exit(1);
}
marks.past ??= {};
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
process.chdir(git(["rev-parse", "--show-toplevel"]).trim());
const tracked = new Set(git(["ls-files", "-z"]).split("\0").filter(Boolean));
const kb = n => (n / 1024).toFixed(1);
const size = f => fs.existsSync(f) ? fs.statSync(f).size : 0;
const skip = ["core/", ...(marks.skip ?? [])];
const fail = [], notes = [];

// the files every session reads
let total = 0;
for (const [f, mark] of Object.entries(marks.read)) {
  if (!tracked.has(f)) { fail.push(`${f} is listed under "read" in ${MARKS} but is no tracked file: update ${MARKS}`); continue; }
  const n = size(f);
  total += n;
  if (n > mark) fail.push(`${f} is ${n} bytes, past its mark of ${mark}: make it smaller; its mark in ${MARKS} rises only as "A mark on what every session reads" in core/modules/review-guidelines.md says`);
  else if (mark > marks.each && n < mark) fail.push(`${f} has shrunk to ${n} bytes: lower its mark in ${MARKS} from ${mark} to ${Math.max(n, marks.each)}`);
}
if (total > marks.total) fail.push(`the files every session reads total ${total} bytes, past their mark of ${marks.total}: make them smaller; the mark in ${MARKS} rises only as "A mark on what every session reads" in core/modules/review-guidelines.md says`);

// Step 0: files past the split mark that the PR changes
const big = [...tracked].filter(f => !skip.some(s => f.startsWith(s)) && size(f) > marks.split
  && !fs.readFileSync(f).subarray(0, 8000).includes(0));
let base = process.env.SIZES_BASE;
if (!base) try { base = git(["merge-base", "origin/main", "HEAD"]).trim(); } catch { base = ""; }
if (base) {
  let changed;
  try { changed = new Set(git(["diff", "--name-only", base]).split("\n")); } catch { console.error(`FAIL: ${base} is not a commit here: fetch it`); process.exit(1); }
  for (const f of big.filter(f => changed.has(f))) {
    if (!(marks.past[f] >= size(f))) fail.push(`${f} is ${size(f)} bytes, past the ${marks.split}-byte mark, and this PR changes it: split it by meaning first (Step 0, "Split by meaning" in core/modules/how-to-work.md), or list it under "past" in ${MARKS} and say why in the PR`);
  }
} else notes.push("no base to compare with (set SIZES_BASE), so the files past the split mark were not checked for changes");
for (const f of Object.keys(marks.past)) if (!big.includes(f)) fail.push(`${MARKS} lists ${f} under "past", but it is not past ${marks.split} bytes now: remove it`);

for (const n of notes) console.log(`note ${n}`);
for (const x of fail) console.error(`FAIL: ${x}`);
if (fail.length) process.exit(1);
console.log(`ok   read by every session: ${Object.keys(marks.read).map(f => `${f} ${kb(size(f))} KB`).join(", ")}; ${kb(total)} of ${kb(marks.total)} KB. `
  + `Past ${kb(marks.split)} KB: ${big.join(", ") || "none"}${base ? ", none changed here" : ""}`);
