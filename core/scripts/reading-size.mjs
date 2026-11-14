// The reading-size check ("Read little" and "Split by meaning" in modules/how-to-work.md), for every project that takes
// the core, measured on every PR. Its marks are the project's *size marks*, a JSON file (its SECURITY.md names it under
// rule 3, among the checks on the work), and it fails:
//   - when a file every session reads ("read") is past its mark (about 20 KB, "each"; one past that has a mark of its
//     own, its size: when the file shrinks, the mark comes down with it), or the project's own among them total past
//     "total" (the core's copy under core/, which the core's check holds to the core's tree, is left out: the core's
//     own cap, scripts/size.mjs there, holds what of it every session reads, so that no sync fails a project over what
//     the core grew, the core's AGENTS.md, "Nothing locks another owner's project"; where "total" leaves room above the
//     project's own files for more than half that copy, a note gives the mark to set);
//   - when the PR changes a file past "split" (about 50 KB: Step 0, split it by meaning first), unless "past" lists it
//     with a mark at least its size. The copy of the core (core/, changed only by a sync PR), the paths under "skip"
//     (such as the archive: dated records, added to by every merge) and binary files are not counted.
// A PR that crosses a mark moves the mark in the config only as modules/review-guidelines.md says ("A mark on what
// every session reads", and "What blocks"). The PR's changes are those against SIZES_BASE (set by the copies workflow,
// .github/workflows/copies.yml, which runs this), else where HEAD left origin/main; in CI that is the base's tip
// against the PR's merge commit, so a run after the base moves on counts its new changes too. Node's own modules only.
// A file's size is its bytes without each carriage return before a line feed (file-size.mjs, beside this file), so it
// is the same on a machine where git converts line endings on checkout as on GitHub.
// It checks the project it lies in (core/scripts/ there), whatever the directory it is started from; the config's own
// path is read from that directory.
//
//   node core/scripts/reading-size.mjs <config>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { sizeOf as size } from "./file-size.mjs";

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
const skip = ["core/", ...(marks.skip ?? [])];
const fail = [], notes = [];

// the files every session reads; their total, the project's own alone (the core's copy under core/ left out)
let total = 0, core = 0;
for (const [f, mark] of Object.entries(marks.read)) {
  if (!tracked.has(f)) { fail.push(`${f} is listed under "read" in ${MARKS} but is no tracked file: update ${MARKS}`); continue; }
  const n = size(f);
  if (f.startsWith("core/")) core += n; else total += n;
  if (n > mark) fail.push(`${f} is ${n} bytes, past its mark of ${mark}: make it smaller; its mark in ${MARKS} rises only as "A mark on what every session reads" in core/modules/review-guidelines.md says`);
  else if (mark > marks.each && n < mark) fail.push(`${f} has shrunk to ${n} bytes: lower its mark in ${MARKS} from ${mark} to ${Math.max(n, marks.each)}`);
}
// (a total that leaves room above the project's own files for more than half of what the core's copy every session
// reads comes to, as one set when it counted that copy does however the core grew since: said, with the mark to set
// in one step, never failed. The mark takes that copy off as often as the room holds it, keeping what room is left,
// and is never below a KB above the project's own files, as the starter kit writes one)
const least = (Math.ceil(total / 1024) + 1) * 1024;
const over = marks.total - total - core / 2;
const to = core && over > 0 ? Math.max(marks.total - Math.ceil(over / core) * core, least) : marks.total;
if (to < marks.total) notes.push(`the total in ${MARKS}, ${marks.total}, leaves ${marks.total - total} bytes of room above the project's own files, more than half what the core's copy every session reads comes to (${core}), which the core's own cap holds: set it to ${to} (core/setup/sync-notes.md, 14 November 2026)`);
if (total > marks.total) fail.push(`the project's own files every session reads total ${total} bytes, past their mark of ${marks.total}: make them smaller; the mark in ${MARKS} rises only as "A mark on what every session reads" in core/modules/review-guidelines.md says`);

// Step 0: files past the split mark that the PR changes
// (a file is read to be counted only where its bytes on disk are past the mark: counted, it is never larger)
const big = [...tracked].filter(f => !skip.some(s => f.startsWith(s)) && fs.existsSync(f) && fs.statSync(f).size > marks.split
  && !fs.readFileSync(f).subarray(0, 8000).includes(0) && size(f) > marks.split);
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
console.log(`ok   read by every session: ${Object.keys(marks.read).map(f => `${f} ${kb(size(f))} KB`).join(", ")}; the project's own ${kb(total)} of ${kb(marks.total)} KB. `
  + `Past ${kb(marks.split)} KB: ${big.join(", ") || "none"}${base ? ", none changed here" : ""}`);
