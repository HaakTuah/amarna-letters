// Which files two merged pull requests each added to within a week, over the last month (#860): the reading the sync
// note setup/sync-notes/741-a-project-s-records-one-file-per-entry.md asks for, to find the records a project splits
// into a folder of one file per entry (core/tasks/planning.md, "Each entry of a busy record stands in a file of its
// own"). It reads the host's record of each pull request merged into the default branch and the files it added lines
// to, never the clone's history, so a shallow clone, a squash, a merge commit and a rebase merge's several commits all
// count one pull request once. Which of the files it lists are records, and which stay whole, is the session's to say.
// It reads only, through gh; the host's answers are data, each refused where it nests too deep or is not of the form
// read, and a file's name printed on one line. Node's own modules.
//
//   node core/scripts/busy-records.mjs                       from a project's root, the last 31 days
//   node core/scripts/busy-records.mjs --repo owner/name --days 35
import { parseArgs } from "node:util";
import { mergedIn } from "./cited.mjs";
import { repoOf } from "./core-cost.mjs";
import { aRepository, oneLine, parseBounded } from "./guards.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { started } from "./started.mjs";

const DAY = 864e5, WEEK = 7 * DAY, MOST = 3650;

// `gh`, its every answer refused where it nests deeper than the core reads (guards.mjs).
const bounded = gh => route => { const text = gh(route); parseBounded(text); return text; };
const shaped = (what, ok) => x => { if (ok(x)) return true; throw new TypeError(`the host's answer holds ${what} not of the form read`); };

// The files `pull` added lines to, as the host lists them (a file only deleted from, or removed, adds no entry).
export const addedTo = (repo, pull, gh = ghApi) => pagesOf(`repos/${repo}/pulls/${pull}/files`, bounded(gh))
  .filter(shaped("a file", f => typeof f?.filename === "string" && Number.isInteger(f.additions)))
  .filter(f => f.additions > 0).map(f => f.filename);

// Each file two pull requests merged within a week of each other both added to: [{ file, pulls: [number] }], the
// pulls of every such pair, oldest merge first; the files by name. `merged` is [{ number, at, files }].
export function busy(merged) {
  const by = new Map();
  for (const p of merged) for (const f of new Set(p.files)) { if (!by.has(f)) by.set(f, []); by.get(f).push(p); }
  const out = [];
  for (const [file, list] of by) {
    const sorted = list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), pulls = new Set();
    for (let i = 1; i < sorted.length; i++)
      if (Date.parse(sorted[i].at) - Date.parse(sorted[i - 1].at) <= WEEK) pulls.add(sorted[i - 1].number).add(sorted[i].number);
    if (pulls.size) out.push({ file, pulls: sorted.map(p => p.number).filter(n => pulls.has(n)) });
  }
  return out.sort((a, b) => (a.file < b.file ? -1 : 1)); // (each file stands once)
}

// What is read of `repo` for the `days` before `now`: the pull requests merged into its default branch, each with the
// files it added to.
export function read(repo, days, now = Date.now(), gh = ghApi) {
  const to = new Date(now).toISOString(), from = new Date(now - days * DAY).toISOString();
  const base = parseBounded(gh(`repos/${repo}`))?.default_branch;
  shaped("a default branch", b => typeof b === "string" && b !== "")(base);
  return mergedIn(repo, from, to, bounded(gh))
    .filter(shaped("a pull request", p => Number.isInteger(p?.number) && typeof p.merged_at === "string" && typeof p.base?.ref === "string"))
    .filter(p => p.base.ref === base)
    .map(p => ({ number: p.number, at: p.merged_at, files: addedTo(repo, p.number, gh) }));
}

// The lines it prints.
export const report = (found, merged, days) => [
  `${merged} pull request(s) merged into the default branch in the last ${days} days; ${found.length} file(s) two of them added to within a week:`,
  ...found.map(f => `  ${oneLine(f.file)}  (#${f.pulls.join(", #")})`),
];

// The repository and the days to read, from the command line, or why they cannot be.
export function options(argv, here = repoOf) {
  let values;
  try { ({ values } = parseArgs({ args: argv, options: { repo: { type: "string" }, days: { type: "string", default: "31" } } })); }
  catch (e) { return { why: e.message }; }
  const repo = values.repo ?? here(), days = Number(values.days);
  if (!repo) return { why: "no repository named, and none read from this clone" };
  if (!aRepository(repo)) return { why: `--repo ${oneLine(repo)} is no owner/name` };
  return Number.isInteger(days) && days > 0 && days <= MOST ? { repo, days } : { why: `--days ${oneLine(values.days)} is no whole number of days from 1 to ${MOST}` };
}

// A run on `argv`: what it prints, through `out` and `err`, and its exit code.
export function main(argv, { gh = ghApi, here = repoOf, now = Date.now(), out = console.log, err = console.error } = {}) {
  const { repo, days, why } = options(argv, here);
  if (why) {
    err(`FAIL: busy-records: ${why}. Mend: run it from the project's root, or give --repo owner/name and --days <a whole number from 1 to ${MOST}>`);
    return 1;
  }
  let merged;
  try { merged = read(repo, days, now, gh); } catch (e) {
    err(`FAIL: busy-records: the host's record of ${repo}'s pull requests could not be read: ${oneLine(e.message.split("\n")[0])}. Mend: sign gh in for the repository and run it again; where the project's host is not GitHub, read the same from the host's own list of the merged pull requests and their files`);
    return 1;
  }
  for (const l of report(busy(merged), merged.length, days)) out(l);
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
