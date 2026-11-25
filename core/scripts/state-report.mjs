// The state report (roles/orchestrator.md, "The scheduled look"; core archive 218): once a month the scheduled look
// (look.mjs, beside this file) opens it, in the core and in every project that takes it. It reports and asks nothing
// (floor rule 14): led by the five outcomes and what the work cost (outcomes.mjs, beside this file; #302), each measure that keeps a baseline against the last report, in the core the rules of the floor and
// the modules by what holds them, and in a project its own rules (#662), those with none listed (holders.mjs, beside this file), whether the rules' pruning is
// due (pruning.mjs, beside this file; #303), which rules each role cited in
// the month before (cited.mjs, beside this file), what the look keeps open past a week, and the step that files a check
// for each rule the reviews found twice and the step that adds the rounds of review the pull requests took (#477), both
// read by review-record.mjs, and the step that adds the merge line's measure (merge-line.mjs, beside this file; #702). In a project it ends with its counts for the core,
// counts and conclusions only: the commit its copy holds and how far behind the core's main that is, the steps of a
// release not done, and of the pull requests merged the month before, how many were the core's upkeep (core-cost.mjs,
// beside this file, sorts them). In the core it says that a session adds the projects' part, which --projects prints:
// the repositories the account gh answers for can reach that hold a manifest naming this core, as the owner's or a
// collaborator's (an organisation's that is neither is not read), and any other whose manifest's row *shares its
// counts* says `yes`, each with the counts from its own newest state report, the rules its roles cited among them; a project of another owner, and a private
// one, is never named, nor is anything of its code or its discussions carried over (core archive 218). It reads only.
// gh, git and Node's own modules.
//
//   node scripts/state-report.mjs --projects                 in the core, where gh answers for the owner's account
//   node scripts/state-report.mjs --projects --repo o/n ...  the same, of the repositories named alone (where gh may
//                                                            not list the account's, as in a cloud session)
import fs from "node:fs";
import path from "node:path";
import { HEADING as CITED, citedFrom, mergedIn } from "./cited.mjs";
import { CORE } from "./core-address.mjs";
import { classify } from "./core-cost.mjs";
import { HEADING as OUTCOMES, outcomesFrom } from "./outcomes.mjs";
import { pinOf } from "./core-moved.mjs";
import { reading, rulesOf } from "./dose.mjs";
import { baselineOf } from "./strength.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { counts as holderCounts, heldThere, ownHolders, report as holdersReport, shareLine } from "./holders.mjs";
import { said as pruningSaid } from "./pruning.mjs";
import { readNothing } from "./read-nothing.mjs";
import { tasks as readTasks, total as readTotal, tree as readTree } from "./read-total.mjs";
import { leftOut } from "./reading.mjs";
import { readHere, ruleFiles } from "./rule-files.mjs";
import { ROOT, rules } from "./rules.mjs";
import { started } from "./started.mjs";
import { billedLine, line as waitLine, measure as measureWait, selfHosted } from "./wait.mjs";

export const TITLE = "State report";
export const COUNTS = "Counts for the core";
export const SHARES = /^\|[ \t]*\*shares its counts\*[ \t]*\|[ \t]*`yes`[ \t]*\|[ \t]*$/m;
export const monthOf = iso => String(iso).slice(0, 7);
// The month before a month ("2026-11" gives "2026-10").
export const before = month => { const [y, m] = month.split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };

// The copies check's baseline, as the manifest's *copies check* row names its config: { at, count }, the count of old
// copies (windows) it lists; null where the project keeps none.
export function copies(root, manifest) {
  const config = /^\|[ \t]*\*copies check\*[ \t]*\|.*`([^`]+\.json)`/m.exec(manifest ?? "")?.[1];
  if (!config) return null;
  try {
    const at = JSON.parse(fs.readFileSync(path.join(root, config), "utf8")).baseline;
    const windows = JSON.parse(fs.readFileSync(path.join(root, at), "utf8")).windows ?? {};
    return { at, count: Object.keys(windows).length };
  } catch { return null; }
}

// The shape check's baseline, as the project's rules name its config (dose.mjs reads it: its manifest, or, where
// `manifest` is null, the core's own AGENTS.md): { at, count, state }, the old breaches it lists and the state the
// codebase is in; null where the project has not taken the check or it cannot be read.
export function shape(root, manifest) {
  try { const r = reading(rulesOf(manifest, root).rules, root); return r && { at: r.config.baseline, count: r.listed, state: r.state, strength: strength(root, r.config) }; } catch { return null; }
}

// The tests' strength baseline, beside the shape check's (strength.mjs): { at, count }, the faults no test catches it
// lists; null where it stands nowhere or cannot be read.
function strength(root, config) {
  const at = baselineOf(config);
  try { return { at, count: Object.values(JSON.parse(fs.readFileSync(path.join(root, at), "utf8")).listed).reduce((n, e) => n + (e.count ?? 0), 0) }; } catch { return null; }
}

// What a push waits on (wait.mjs), against the shape check's mark "wait", and the minutes GitHub bills a pull request,
// read through gh: the report's two lines, which say "not read", and why, where GitHub did not answer.
export function pushWait(repo, root, manifest, gh) {
  let mark;
  try { mark = reading(rulesOf(manifest, root).rules, root)?.config.wait; } catch { mark = undefined; }
  try { const m = measureWait({ repo, mark, ...(gh ? { gh } : {}) }); return `${waitLine(m)}\n${billedLine(m, selfHosted(root))}`; }
  catch {
    const why = "GitHub did not answer for the pull requests' checks: the look's job needs `pull-requests: read` and `checks: read`";
    return `- what a push waits on: not read (${why}).\n- billed minutes a pull request: not read (${why}).`;
  }
}

// The lines of the measures against their baselines: each with its count at the last report, where that report gave it.
function measured({ core, measures, shape: shaped, previous, wait = null }) {
  const was = (name, count) => { const then = previous ? new RegExp(`^- ${name}: (\\d+)`, "m").exec(previous)?.[1] : undefined; return then === undefined ? "" : `, ${then} at the last report`; };
  const lines = [];
  if (measures) lines.push(`- copies: ${measures.count} old copies in its baseline (\`${measures.at}\`)${was("copies")}.`);
  if (shaped) lines.push(`- how the code is put together: ${shaped.count} old breaches in its baseline (\`${shaped.at}\`)${was("how the code is put together")}; the codebase is ${shaped.state}.`);
  if (shaped?.strength) lines.push(`- how strong the tests are: ${shaped.strength.count} faults no test catches in its baseline (\`${shaped.strength.at}\`)${was("how strong the tests are")}.`);
  if (wait) lines.push(wait);
  if (lines.length) return lines;
  return [core ? "- None: in the core's own repository no baseline may stand." : "- None: no measure keeps a baseline here yet."];
}

// The pull requests merged in `month` (`pulls`, each { branch, files, ours }) sorted as core-cost.mjs sorts them.
export function share(pulls, rules) {
  const by = { sync: 0, upkeep: 0, update: 0, own: 0 };
  for (const p of pulls) by[classify(p.branch, p.files, rules, p.ours)]++;
  return { all: pulls.length, ...by };
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "none merged");

// The rules of the floor and the modules by what holds them, as holders.mjs reads them now; null where it cannot.
const heldNow = () => { try { return holdersReport(); } catch { return null; } };
// The total read (read-total.mjs, beside this file; #469), in KB, as it stands now; null where it cannot be read.
const totalNow = () => { try { return Math.round(readTotal(readTree(), readTasks()).sum / 1024); } catch { return null; } };
// The total read's lines: now, and the last report's beside it.
const TOTAL = "The total read";
function totalRead(now, previous) {
  const last = /^- Now: (\d+) KB\b/mu.exec(String(previous ?? "").split(`**${TOTAL}**`)[1] ?? "")?.[1];
  return [`**${TOTAL}**`, now === null ? "- Not read: `scripts/read-total.mjs` could not read it." : `- Now: ${now} KB, each role's start, each kind of task and the last 30 merged pull requests read by their builders and reviewers, each file opened counted as a KB (\`scripts/read-total.mjs\`).`,
    `- The last report's: ${last === undefined ? "none" : `${last} KB`}.`];
}

// The report's text. `core`: whether this is the core's own repository; `previous`: the last report's text, or null;
// `overdue`: [{ number, title, since }]; `counts` (a project): { pin, behind, steps, merged, held } as readCounts gives them;
// `holders`: the lines holders.mjs gives, in the core the rules of the floor and the modules by what holds them, read
// here where left out, and in a project its own rules (--own; #662), and null where they could not be read; `cited`: the lines cited.mjs gives for the month before,
// null where they were not counted; `outcomes`: the lines outcomes-read.mjs gives for the month before, which the report
// leads with (#302), null where they were not read; `pruning` (the core): the lines pruning.mjs gives for `month`;
// `read` (the core): the total read in KB, null where it could not be read.
export function body({ core, month, measures, shape: shaped = null, wait = null, previous, overdue, counts = null, holders = core ? heldNow() : null, cited = null, outcomes = null, pruning = core ? pruningSaid({ month }) : null, read = core ? totalNow() : null, scripts }) {
  const lines = [
    `The state of ${core ? "the core" : "this project"} for ${month}, as the scheduled look reads it on its first run of the month (\`${scripts}/state-report.mjs\`). It reports and asks nothing: whatever is due already has its task. A session that reads it files as a task anything it shows that has none, and closes it.`,
    "",
    `**${OUTCOMES} in ${before(month)}**`,
    ...(outcomes ?? [`- Not read: \`${scripts}/outcomes-read.mjs\` was not run for ${before(month)}.`]),
    "",
    "**The measures against their baselines**",
    ...measured({ core, measures, shape: shaped, previous, wait }),
    "",
    "**The rules, by what holds them**",
    ...(holders ?? [core ? "- Not read: `scripts/holders.mjs` could not read them, so the report leaves them out rather than guess."
      : `- Not read: \`${scripts}/holders.mjs --own\` could not read this project's own rules, so the report leaves them out rather than guess.`]),
    ...(pruning ? ["", "**The pruning of the rules**", ...pruning] : []),
    ...(core ? ["", ...totalRead(read, previous)] : []),
    "",
    `**${CITED}**`,
    ...(cited ?? [`- Not counted: \`${scripts}/cited.mjs\` was not run for ${before(month)}.`]),
    "",
    "**What is overdue**",
    ...(overdue.length ? overdue.map(o => `- #${o.number} ${o.title}: open since ${o.since.slice(0, 10)}.`) : ["- Nothing: no task the look keeps has stood open past a week."]),
  ];
  if (core) lines.push("", `**Changes to the floor and the review guidelines merged in ${before(month)}, and whether each quoted the owner's yes**`,
    `- Not read by GitHub's job. The session that takes this report adds, as a note, what \`node scripts/meaning-kept.mjs --month ${before(month)}\` prints, so the owner can look them over (#886, point 2).`);
  if (core) lines.push("", "**The projects that take the core**",
    "- Not read by GitHub's job, whose token reaches this repository alone. A session where gh answers for the owner's account runs `node scripts/state-report.mjs --projects` and adds what it prints here as a note; where its tool cannot reach a project, a session started in that project reads it and passes back counts and conclusions alone.",
    "", "**The security-review status against the host's record**",
    "- Not read by GitHub's job, whose token may not read the collaborators. A session where gh answers for the owner's account runs `node scripts/security-review-record.mjs`, commits what it records in a pull request of its own, and files each difference it prints as a bug (#626).");
  lines.push("", "**What the reviews found twice**",
    `- Not read by GitHub's job. The session that takes this report runs \`node ${scripts}/review-record.mjs --since ${before(month)}-01\` and, for each rule it lists under "Found twice" that no open issue takes, files an issue as \`${scripts.replace(/scripts$/u, "tasks")}/reviews.md\`, point 8, says.`,
    "", "**The rounds of review**",
    `- Not read by GitHub's job. The same session adds, as a note, the last two lines that run printed under "Rounds of review": the median over the last 30 merged pull requests beside the last report's, and the five that took the most rounds.`,
    "", "**The merge line**",
    `- Not read by GitHub's job, whose token may not read the runs. The same session adds, as a note, the line \`node ${scripts}/merge-line.mjs --repo <this repository> --measure\` prints, the pushes whose checks ran for each merged pull request and the minutes from its turn to its merge, beside the last report's (#702).`);
  if (counts) lines.push("", `**${COUNTS}**`,
    `- copy: ${counts.pin ?? "not read"}${counts.behind === null ? "" : `, ${counts.behind} commits behind the core's main`}.`,
    `- steps not done: ${counts.steps ?? "not read"}.`,
    counts.merged ? `- merged in ${before(month)}: ${counts.merged.all}, the core's share ${pct(counts.merged.sync + counts.merged.upkeep, counts.merged.all)} (sync ${counts.merged.sync}, upkeep ${counts.merged.upkeep}, update ${counts.merged.update}, own ${counts.merged.own}).`
      : `- merged in ${before(month)}: not read (the token here may not read pull requests).`,
    heldLine(counts.held));
  return lines.join("\n");
}

// A project's counts for the core, read through gh: the copy's commit and how far behind the core's main it is, and the
// pull requests merged in the month before `month` with the files each changed. Each part that cannot be read is null.
export function readCounts({ repo, manifest, month, steps, gh = ghApi }) {
  const pin = pinOf(manifest ?? "");
  let behind = null, merged = null;
  try { if (pin) behind = Number(gh(`repos/${CORE}/compare/${pin}...main`, "--jq", ".ahead_by").trim()); } catch { /* (not read) */ }
  if (!Number.isFinite(behind)) behind = null;
  try {
    const pulls = mergedIn(repo, `${before(month)}-01T00:00:00Z`, `${month}-01T00:00:00Z`, gh)
      .map(p => ({ number: p.number, branch: p.head?.ref ?? "", ours: String(p.head?.repo?.full_name ?? "").toLowerCase() === repo.toLowerCase() }));
    for (const p of pulls) p.files = pagesOf(`repos/${repo}/pulls/${p.number}/files`, gh).map(f => f.filename);
    merged = share(pulls, ruleFiles(undefined, undefined, { tools: true }));
  } catch { /* (not read) */ }
  return { pin, behind, steps, merged, held: heldHere(manifest) };
}

// The share's line, or that it was not read.
const heldLine = held => (held ? shareLine(held.own, held.there) : "- rules held by a check: not read.");

// Of the project's rules, those a check holds whole (#459, point 3): its own, by its list (holders.mjs --own), and the
// core's it takes, none counted whose every check read nothing here (read-nothing.mjs); null where they cannot be read.
export function heldHere(manifest) {
  try {
    const nothing = readNothing(process.cwd(), manifest ?? "", readHere).map(n => n.script);
    return { own: holderCounts(ownHolders(process.cwd())), there: heldThere(ROOT, nothing, leftOut(manifest ?? "")) };
  } catch { return null; }
}

// What a push waits on and the minutes GitHub bills a pull request (wait.mjs), from a state report's measures, above its
// counts: their numbers alone, each read by a whole-line form.
function waitsFrom(text) {
  const out = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    let m;
    if ((m = /^- what a push waits on: (\d{1,6}\.\d) min, the median of the last (\d{1,3}) merged pull requests' checks[,;]/.exec(line))) out.push(`a push waits ${m[1]} min (median of ${m[2]})`);
    else if ((m = /^- billed minutes a pull request: (\d{1,9}), the median of the last (\d{1,3}) merged pull requests' last push,/.exec(line))) out.push(`billed minutes a pull request: ${m[1]} (median of ${m[2]})`);
  }
  return out;
}

// A project's counts for the core, from its state report's text, as one line: each count of its own heading read by a
// whole-line form that holds numbers and fixed words alone, and written anew from what it holds, so no other text of
// the project's reaches the core's report, then, read so from its measures, what a push waits on and the minutes GitHub
// bills a pull request (wait.mjs), and after them the rules its roles cited (cited.mjs's citedFrom, which lets
// through the core's own rule names alone, `known`), and, of a public project (`open`), its outcomes (outcomes.mjs's
// outcomesFrom, which lets through its own measures' names and words alone); null where none is in its form. The commit its copy holds is kept
// only where `named` (the owner's public project).
// (each count's whole-line form, and what is written anew from it; `named`, whether the copy's commit is kept)
const COUNT_FORMS = [
  [/^- copy: ([0-9a-f]{40}|not read)(?:, (\d{1,9}) commits behind the core's main)?\.$/, (m, named) => `copy${named && m[1] !== "not read" ? ` ${m[1]}` : ""}${m[2] ? ` ${m[2]} commits behind the core's main` : m[1] === "not read" ? " not read" : ""}`],
  [/^- steps not done: (\d{1,6}|not read)\.$/, m => `steps not done: ${m[1]}`],
  [/^- merged in (\d{4}-\d\d): (\d{1,6}), the core's share (\d{1,3}%|none merged) \(sync (\d{1,6}), upkeep (\d{1,6}), update (\d{1,6}), own (\d{1,6})\)\.$/,
    m => `merged in ${m[1]}: ${m[2]}, the core's share ${m[3]} (sync ${m[4]}, upkeep ${m[5]}, update ${m[6]}, own ${m[7]})`],
  [/^- merged in (\d{4}-\d\d): not read /, m => `merged in ${m[1]}: not read`],
  [/^- rules held by a check: the project's own (\d{1,6}) of (\d{1,6}), the core's (\d{1,6}) of (\d{1,6})\.$/, m => `rules held by a check: its own ${m[1]} of ${m[2]}, the core's ${m[3]} of ${m[4]}`],
  [/^- rules held by a check: not read\.$/, () => "rules held by a check: not read"],
];
export function countsFrom(text, named, known = new Set(rules().map(r => r.key)), open = named) {
  const part = String(text ?? "").split(`**${COUNTS}**`)[1] ?? "";
  const out = [];
  for (const line of part.split(/\r?\n/)) {
    const said = COUNT_FORMS.map(([form, write]) => { const m = form.exec(line); return m && write(m, named); }).find(Boolean);
    if (said) out.push(said);
  }
  out.push(...waitsFrom(text));
  const cited = citedFrom(text, known);
  if (cited) out.push(cited);
  const outcomes = open ? outcomesFrom(text) : null; // (a private project's outcomes are not carried: #450's security review)
  if (outcomes) out.push(outcomes);
  return out.length ? out.join("; ") : null;
}

// How a project is shown in the core's public report: by name only the owner's own public project.
export const shownAs = (name, own, isPrivate) => (own && !isPrivate ? `\`${name}\`` : own ? "a private project of the owner's" : "a project of another owner");

// The state report a project's look wrote: the newest issue titled "State report, YYYY-MM" opened by GitHub's job or by
// the project owner's account, never another's.
export const reportOf = (issues, owner) => [...issues].filter(i => /^State report, \d{4}-\d\d$/.test(i.title) && !i.pull_request
  && ["github-actions[bot]", String(owner).toLowerCase()].includes(String(i.user?.login ?? "").toLowerCase())).sort((a, b) => b.title.localeCompare(a.title))[0] ?? null;

// Whether the account is a collaborator of a repository.
const collaboratorOf = (gh, account, name) => { try { gh(`repos/${name}/collaborators/${account}`); return true; } catch { return false; } };

// The repositories to read, as { private, owner, shared } by full name: the ones named, or all the account reaches.
function reached(gh, account, named) {
  const found = new Map();
  // (a named repository counts as given access where it is private and readable, or the account is its collaborator,
  // read-only too, as GitHub answers; else, a public one of another owner, only by its row)
  if (named.length) for (const name of named) {
    const r = JSON.parse(gh(`repos/${name}`)), theirs = String(r.owner?.login).toLowerCase() !== account.toLowerCase();
    found.set(r.full_name, { private: r.private, owner: r.owner?.login, shared: theirs && !r.private && !r.permissions?.push && !collaboratorOf(gh, account, r.full_name) });
  }
  else for (const r of pagesOf("user/repos?affiliation=owner,collaborator", gh)) found.set(r.full_name, { private: r.private, owner: r.owner?.login, shared: false });
  return found;
}

// The projects whose manifests say they share their counts, added to `found`.
function addSharing(gh, found) {
  try {
    const hits = JSON.parse(gh("-X", "GET", "search/code", "-f", 'q="shares its counts" filename:core-manifest.md'));
    for (const h of hits.items ?? []) if (!found.has(h.repository.full_name)) found.set(h.repository.full_name, { private: h.repository.private, owner: h.repository.owner?.login, shared: true });
  } catch { console.log("- (GitHub's code search gave no answer: projects that share their counts without giving access are not listed this time.)"); }
}

// A project's counts, as its row says them, from its newest state report.
function countsOf(gh, name, r, own) {
  let counts = "its counts could not be read here: a session started in it reads its newest state report and passes back the lines under its heading";
  try {
    const report = reportOf(pagesOf(`repos/${name}/issues?state=all&labels=by%3Alook`, gh), r.owner);
    const read = report && countsFrom(report.body, own && !r.private, undefined, !r.private);
    if (read) counts = `from its report of ${report.title.slice(-7)}: ${read}`;
    else if (!report) counts = "it has no state report yet";
  } catch { /* (the default above) */ }
  return counts;
}

// A project's row, or null where it is the core, has no readable manifest that pins one, or does not share its counts.
// Only GitHub's answer that the manifest is not there (404) reads as "not a project"; any other failure (an outage, no
// sign-in) throws, so that a reading that could not be taken is never taken for none (#1112).
export function rowOf(gh, account, name, r) {
  if (name.toLowerCase() === CORE.toLowerCase()) return null;
  let manifest;
  try { manifest = Buffer.from(JSON.parse(gh(`repos/${name}/contents/core-manifest.md`)).content ?? "", "base64").toString("utf8"); } catch (e) { if (/\(HTTP 404\)\s*$/.test(String(e?.message).trim())) return null; throw e; }
  if (!pinOf(manifest) || (r.shared && !SHARES.test(manifest))) return null;
  const own = String(r.owner).toLowerCase() === account.toLowerCase();
  const shown = shownAs(name, own, r.private);
  return `- ${shown}: ${countsOf(gh, name, r, own)}.`;
}

// --projects: each project the account reaches, with its kind and the counts from its own newest state report.
export function projects(named, gh = ghApi) {
  const account = gh("user", "--jq", ".login").trim();
  const found = reached(gh, account, named);
  if (!found.size) throw new Error("GitHub listed no repository");
  if (!named.length) addSharing(gh, found);
  const rows = [];
  for (const [name, r] of found) {
    const row = rowOf(gh, account, name, r);
    if (row) rows.push(row);
  }
  console.log([`**The projects that take the core** (read ${new Date().toISOString().slice(0, 10)} by \`node scripts/state-report.mjs --projects\`, counts and conclusions only)`, ...(rows.length ? rows : ["- None found."])].join("\n"));
}

if (started(import.meta.url)) {
  const [what, ...rest] = process.argv.slice(2);
  const named = rest.filter((a, i) => rest[i - 1] === "--repo");
  if (what !== "--projects" || rest.some((a, i) => a !== "--repo" && rest[i - 1] !== "--repo") || !named.every(n => /^[\w-]+\/[\w.-]+$/.test(n) && !/\/\.+$/.test(n))) {
    console.error("FAIL: it takes --projects, and --repo owner/name for each repository to read in place of the account's (the look writes the monthly report itself)");
    process.exitCode = 1;
  } else try { projects(named); } catch { console.error("FAIL: gh gave no answer, or none that could be read, for the account, a repository named or a manifest, so no project was read (not none found). Mend: run it again where gh answers for the owner's account, or name the repositories it can reach by --repo"); process.exitCode = 1; }
}
