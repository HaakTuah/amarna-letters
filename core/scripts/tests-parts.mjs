// The jobs a run of the core's tests started by hand runs where it names parts (#954). The start by hand of
// .github/workflows/tests.yml takes the input "only": words naming a system (linux, windows) and the parts its jobs
// carry (each suites job's list "parts", and the upgrade job's two names, upgrade and staged). It runs, of the jobs of a
// full run, those of a named system where one is named that carry a named part where one is named; with no input the
// workflow runs in full and this script is not run. The full run's jobs are read from the workflow itself, the last
// list of each job's matrix, so they stand in one place. A run so narrowed is named NARROWED and its words, and is never
// read as a full run (release.mjs, fullRun; the hourly run's skip in the workflow), which a start by hand is only where
// it bears the workflow's own name, FULL. Node's own modules only.
//
//   node scripts/tests-parts.mjs "<words>" [--output <file>]
//       prints the jobs it picks; with --output, adds the lines suites=<json> and upgrade=<json> to the file, as
//       GitHub reads a step's outputs. Fails, saying its mend, where no word is given, a word names nothing, or the
//       words pick no job.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { started } from "./started.mjs";
export const WORKFLOW = ".github/workflows/tests.yml";
// (the name a narrowed run is given; a run started by hand is read as full only where it bears the workflow's own name,
// FULL, which GitHub gives it where run-name is empty, so a name that cannot be read either way is never read as full)
export const NARROWED = "tests, only ";
export const FULL = "tests";
const SYSTEMS = { "ubuntu-latest": "linux", "windows-latest": "windows" };

// The jobs of a full run in the workflow's text: { suites, upgrade }, each the last list its job's matrix holds, which
// the matrix takes where no other event's list applies; null where either cannot be read.
export function fullLists(text) {
  const lists = {};
  let job = null;
  for (const line of String(text).split(/\r?\n/u)) {
    const head = /^ {2}([\w-]+):\s*$/u.exec(line);
    if (head) { job = head[1]; continue; }
    if (!["suites", "upgrade"].includes(job) || !/^\s+include: \$\{\{ fromJSON\(/u.test(line)) continue;
    // (the list that ends the expression, which no event's term guards)
    const last = /\|\| '(\[[^']*\])'\) \}\}\s*$/u.exec(line);
    try { lists[job] = last ? JSON.parse(last[1]) : null; } catch { lists[job] = null; }
  }
  return Array.isArray(lists.suites) && Array.isArray(lists.upgrade) ? { suites: lists.suites, upgrade: lists.upgrade } : null;
}

// The words a job answers to: a suites job's parts; an upgrade job's name, as the workflow names it (staged on Windows
// and in the Linux part of that name, upgrade otherwise).
const wordsOf = (job, x) => job === "suites" ? String(x?.parts ?? "").split(" ").filter(Boolean)
  : [x?.os === "windows-latest" || x?.part === "staged" ? "staged" : "upgrade"];

// What the input `only` picks of the full run's `lists`: { suites, upgrade }, or { refused } with what is wrong and its
// mend.
export function pick(lists, only) {
  const words = String(only ?? "").toLowerCase().split(/[\s,]+/u).filter(Boolean);
  const parts = [...new Set(["suites", "upgrade"].flatMap(job => lists[job].flatMap(x => wordsOf(job, x))))].sort();
  const known = `a system (${[...new Set(Object.values(SYSTEMS))].join(", ")}) and the parts (${parts.join(", ")})`;
  if (!words.length) return { refused: `the input "only" names no part. Mend: leave it empty for the tests in full, or name ${known}` };
  // (letters, and spaces or commas between them, nothing before or after, so the run's name is the words as they stand)
  if (!/^[a-z]+(?:[ ,]+[a-z]+)*$/iu.test(String(only))) return { refused: `the input "only", ${JSON.stringify(String(only))}, holds more than words of letters with spaces or commas between them. Mend: start the run again naming ${known}, as such words alone` };
  const unknown = words.filter(w => !parts.includes(w) && !Object.values(SYSTEMS).includes(w));
  if (unknown.length) return { refused: `the input "only" names what no job carries: ${unknown.join(", ")}. Mend: start the run again naming ${known}` };
  const systems = words.filter(w => Object.values(SYSTEMS).includes(w)), named = words.filter(w => parts.includes(w));
  const picked = job => lists[job].filter(x => (!systems.length || systems.includes(SYSTEMS[x?.os]))
    && (!named.length || wordsOf(job, x).some(w => named.includes(w))));
  const out = { suites: picked("suites"), upgrade: picked("upgrade") };
  if (!out.suites.length && !out.upgrade.length) return { refused: `the input "only", ${words.join(" ")}, picks no job: no job of that system carries those parts. Mend: start the run again naming a part a job of that system carries, or no system` };
  // (a run so named is never read as full, so words that pick every job would spend a full run's minutes for nothing)
  if (out.suites.length === lists.suites.length && out.upgrade.length === lists.upgrade.length) return { refused: `the input "only", ${words.join(" ")}, picks every job of the full run, which a run so named is never read as. Mend: leave it empty for the tests in full` };
  return out;
}

// The command line: its words, as the workflow hands them in, read against the workflow's text; what it prints, each
// line, to `log` and `err`; 0 where it picked, 1 where it failed, saying its mend.
export function run(argv, text, { log = console.log, err = console.error } = {}) {
  const fail = msg => { err(`FAIL: ${msg}`); return 1; };
  const at = argv.indexOf("--output"), output = at >= 0 ? argv[at + 1] : null;
  const rest = argv.filter((_, i) => at < 0 || (i !== at && i !== at + 1));
  if ((at >= 0 && !output) || rest.length !== 1) return fail(`give the words as one argument. Mend: run node scripts/tests-parts.mjs "<words>" [--output <file>], as ${WORKFLOW} does`);
  const lists = fullLists(text);
  if (!lists) return fail(`${WORKFLOW}: the jobs of a full run could not be read from the matrices of its jobs suites and upgrade. Mend: keep each job's matrix one line "include: \${{ fromJSON(... || '<the full run's list>') }}", its last list the full run's`);
  const got = pick(lists, rest[0]);
  if (got.refused) return fail(got.refused);
  log(`the run "${NARROWED}${rest[0].trim()}" runs these jobs alone, on both Nodes where the full run does:`);
  for (const x of got.suites) log(`  suites (${x.os}, ${x.parts}${x.node === ".node-least" ? ", the least Node" : ""})`);
  for (const x of got.upgrade) log(`  ${wordsOf("upgrade", x)[0]} (${x.os}, ${x.part})`);
  if (output) fs.appendFileSync(output, `suites=${JSON.stringify(got.suites)}\nupgrade=${JSON.stringify(got.upgrade)}\n`);
  return 0;
}

if (started(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let text;
  try { text = fs.readFileSync(path.join(root, WORKFLOW), "utf8"); } catch { text = ""; }
  process.exitCode = run(process.argv.slice(2), text);
}
