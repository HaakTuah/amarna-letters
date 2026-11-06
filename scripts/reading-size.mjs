// The reading-size check (archive item 217): the files every session reads, each against its mark and their total
// against its own, and every file past the Step 0 mark that a PR changes ("Split by meaning" in AGENTS.md), which must
// shrink in that PR. The marks are in scripts/reading-size.json; a PR that crosses one moves it there and says why, and
// against the branch a PR merges into (READING_BASE, as the workflow sets it) a raised mark is named in the output, so
// the review sees it. Node's own modules only, so the check needs no install (.github/workflows/pointers.yml;
// scripts/test.sh runs it too, without the Step 0 part unless READING_BASE is set).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const MARKS = "scripts/reading-size.json";
const base = process.env.READING_BASE || "";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const marks = JSON.parse(fs.readFileSync(MARKS, "utf8"));
const fail = [];
let total = 0;
for (const f of marks.read) {
  const size = fs.statSync(f).size;
  const mark = marks.past[f] ?? marks.mark;
  total += size;
  console.log(`${f}: ${kb(size)} of ${kb(mark)}`);
  if (size > mark) fail.push(`${f} is ${kb(size)}, past its mark of ${kb(mark)}`);
}
console.log(`the files every session reads: ${kb(total)} of ${kb(marks.total)}`);
if (total > marks.total) fail.push(`together they are ${kb(total)}, past their mark of ${kb(marks.total)}`);

if (base) {
  let before = marks; // the marks' first PR has none to compare with
  try { before = JSON.parse(git("show", `${base}:${MARKS}`)); } catch { console.log(`${MARKS} is new in this PR`); }
  const raised = [["mark", before.mark, marks.mark], ["total", before.total, marks.total], ["step0", before.step0, marks.step0],
    ...Object.entries(marks.past).map(([f, n]) => [f, before.past?.[f] ?? before.mark, n])].filter(([, a, b]) => b > a);
  for (const [what, a, b] of raised) console.log(`RAISED: ${what} from ${kb(a)} to ${kb(b)}; the PR says why`);

  const exempt = (f) => marks.exempt.some((e) => (e.endsWith("/") ? f.startsWith(e) : f === e));
  // each added, changed, renamed or copied file, with the path it had on the base (a rename is measured against it)
  const changed = git("diff", "--name-status", "-M", "-C", "--diff-filter=ACMR", base, "HEAD").split("\n").filter(Boolean)
    .map((l) => l.split("\t")).map(([kind, from, to]) => ({ f: to ?? from, was: /^[RC]/u.test(kind) ? from : to ?? from }))
    .filter(({ f }) => !exempt(f));
  for (const { f, was } of changed) {
    const size = fs.statSync(f).size;
    if (size <= marks.step0 || fs.readFileSync(f).subarray(0, 8192).includes(0)) continue;
    let old = 0;
    try { old = Number(git("cat-file", "-s", `${base}:${was}`)); } catch { /* new in this PR */ }
    if (size >= old) fail.push(`${f} is ${kb(size)}, past ${kb(marks.step0)}, and this PR ${old ? "grows or keeps" : "adds"} it: split it by meaning first, in its own PR (Step 0)`);
  }
}

for (const f of fail) console.log(`  FAILED ${f}`);
process.exit(fail.length ? 1 : 0);
