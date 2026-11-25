// The dose (tasks/cleaning.md, "The state of a codebase sets the dose"; core archive 226; #246): the state a
// codebase is in, read from the shape check's baseline (shape.mjs, beside this file), and what that state makes due.
// The state is the share of what the check reads, its functions and its imports, that the baseline lists: in debt
// past DEBT, in standard at STANDARD or under, paying down between; a project's owner may name it instead, in one
// line of the manifest (its *dose* row: `in debt`, `paying down` or `in standard`, in backticks). Two things follow
// it, each an issue the scheduled look keeps (look.mjs, DUE) and a task an agent takes alone:
//   - cleaning, while the state is not in standard: the files to clean worst first, which is where change meets
//     tangle (what the baseline lists of a file, times how often the history changed it), with the share of the work
//     the state gives the cleaning lane and the share it got: of the changes that reached the branch in the last DAYS
//     days, those that changed the baseline, which only shrinks;
//   - an audit by a reader: in debt after each cleaning batch (the baseline BATCH smaller than at the last audit),
//     and DAYS after the last at the latest, in debt and paying down; in standard only once what the check reads has
//     moved by MOVED since. Where, in debt, an audit comes due by its days and the baseline is no smaller than at
//     the last, the issue is the owner's to see (`owner`), and nothing fails.
// The numbers are first guesses, which use tunes. It reads, and with --audited writes the day and the counts of an
// audit into the baseline; it fails nothing but a run it cannot make. git and Node's own modules.
//
//   node core/scripts/dose.mjs             from a project's root: the state, the shares, what to clean first, and
//                                          whether an audit is due (in the core: node scripts/dose.mjs)
//   node core/scripts/dose.mjs --audited   record that the audit was made today: the session that takes the audit's
//                                          task runs it in the pull request that holds the audit's report
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileOf, notLinked, parseBaseline, parseConfig, standing, survey, where } from "./shape.mjs";
import { started } from "./started.mjs";

export const STATES = ["in debt", "paying down", "in standard"];
export const DEBT = 0.05, STANDARD = 0.005, DAYS = 30, BATCH = 0.1, MOVED = 0.25;
export const SHARE = { "in debt": "most of the work", "paying down": "a quarter of the work", "in standard": "none beyond what the check holds" };
export const TITLES = { cleaning: "Cleaning due: how the code is put together", audit: "An audit of how the code is put together is due" };
const FIRST = 10; // how many files the list of what to clean first names
const HISTORY = 500; // how many of the newest commits the count of changes reads

// The state a project's rules name for it (the manifest's *dose* row, or a line of the core's AGENTS.md), or null.
export const named = rules => STATES.find(s => new RegExp(`^.*\\*dose\\*.*\`${s}\`.*$`, "mu").test(String(rules ?? ""))) ?? null;

// The state: the one named, else read from the share of what the check reads that the baseline lists.
export function stateOf({ listed, read }, name = null) {
  if (name) return name;
  const share = read > 0 ? listed / read : 0;
  if (share > DEBT) return "in debt";
  return share > STANDARD ? "paying down" : "in standard";
}

const aDay = v => typeof v === "string" && /^\d{4}-\d\d-\d\d$/u.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const aCount = v => Number.isInteger(v) && v >= 0;
// The last audit a baseline records, or null where it records none the script can read.
export const auditOf = audited => (audited && aDay(audited.day) && aCount(audited.listed) && aCount(audited.read) ? audited : null);
const daysSince = (day, at) => Math.floor((Date.parse(at) - Date.parse(`${day}T00:00:00Z`)) / 86400000);

// Whether an audit by a reader is due: { why, owner } or null. `owner` where the project is in debt, the audit comes
// due by its days, and the baseline is no smaller than at the last.
export function auditDue({ state, audited, listed, read, at }) {
  const last = auditOf(audited);
  if (state === "in standard") {
    const moved = last ? Math.abs(read - last.read) / Math.max(last.read, 1) : 0;
    return moved >= MOVED ? { why: `much of the code has changed since the audit of ${last.day}: the check read ${last.read} functions and imports then, and reads ${read} now`, owner: false } : null;
  }
  if (!last) return { why: "the baseline records no audit yet", owner: false };
  const days = daysSince(last.day, at);
  if (days >= DAYS) return { why: `the audit of ${last.day} is ${days} days old`, owner: state === "in debt" && listed >= last.listed };
  const batch = state === "in debt" && listed <= last.listed * (1 - BATCH);
  return batch ? { why: `a cleaning batch is done: the baseline lists ${listed}, a tenth or more under the ${last.listed} of the audit of ${last.day}`, owner: false } : null;
}

// The file an entry of the baseline lies in, as the shape check reads it, which knows every kind of its entries.
export { fileOf };

// What to clean first: the files the baseline lists entries of, the one where change meets tangle first: its entries
// times how often the history changed it (once more, so that a file never changed still has its place after those).
export function worstFirst(ids, changes) {
  const entries = new Map();
  for (const id of ids) { const file = fileOf(id); entries.set(file, (entries.get(file) ?? 0) + 1); }
  return [...entries].map(([file, n]) => ({ file, entries: n, changes: changes.get(file) ?? 0 }))
    .sort((a, b) => b.entries * (b.changes + 1) - a.entries * (a.changes + 1) || a.file.localeCompare(b.file));
}

const SAFE = ["-c", "core.fsmonitor=false"];
const git = (args, root) => execFileSync("git", [...SAFE, ...args], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
const tolerant = (read, otherwise) => { try { return read(); } catch { return otherwise; } };

// How often each file changed in the newest commits git holds here (a merge is none), and how many it read.
function changesOf(config, root) {
  const log = tolerant(() => git(["log", "--no-merges", "-n", String(HISTORY), "--format=%x00", "--name-only", "--", ...config.code], root), "");
  const commits = log.split("\0").slice(1), changes = new Map();
  for (const c of commits) for (const f of new Set(c.split("\n").map(s => s.trim()).filter(Boolean))) changes.set(f, (changes.get(f) ?? 0) + 1);
  return { changes, commits: commits.length };
}

// The debt a baseline's text lists: how many entries, and the sum of their numbers; null where it cannot be read.
function debtOf(text) {
  const listed = tolerant(() => JSON.parse(text).listed, null);
  if (!listed || typeof listed !== "object") return null;
  const numbers = Object.values(listed).flatMap(n => (n === true ? [] : Object.values(n)));
  return { entries: Object.keys(listed).length, sum: numbers.reduce((a, b) => a + b, 0) };
}

// The share the cleaning lane got: of the changes that reached this branch in the last DAYS days, as its first parents
// show them (a merged pull request is one), those that lowered the baseline: fewer entries than before, or the same
// with smaller numbers. One that only records an audit, or moves an entry, lowered nothing.
function shareGot(config, at, root) {
  const since = new Date(Date.parse(at) - DAYS * 86400000).toISOString();
  const commits = paths => tolerant(() => git(["log", "--first-parent", `--since=${since}`, "--format=%H", "--", ...paths], root).split("\n").filter(Boolean), null);
  const all = commits(["."]), touched = commits([config.baseline]);
  if (!all || !touched) return { all: null, cleaning: null };
  const lowered = commit => {
    const [now, was] = [commit, `${commit}^`].map(c => debtOf(tolerant(() => git(["show", `${c}:${config.baseline}`], root), "")));
    return !!now && !!was && (now.entries < was.entries || (now.entries === was.entries && now.sum < was.sum));
  };
  return { all: all.length, cleaning: touched.filter(lowered).length };
}

// The project at `root` as the dose reads it: null where it has no config of the shape check yet; else its config,
// what the baseline lists, what the check reads (`found`, the survey's own: its counts and what stands today), the state
// and the last audit. It throws where the config or the baseline cannot be read, with the mend the shape check gives.
// The measures a choice's sign may name are read from it (choices-records.mjs, MEASURES).
export function reading(rules, root = ".") {
  const at = where(rules);
  if (!fs.existsSync(notLinked(at, root))) return null;
  const config = parseConfig(fs.readFileSync(path.join(root, at), "utf8"), at);
  const baseline = parseBaseline(fs.readFileSync(notLinked(config.baseline, root), "utf8"), config.baseline, "run the shape check, which says how");
  const now = standing(config, root), found = survey(now.texts, config, now.tests);
  const counts = { listed: baseline.listed.size, read: found.read.functions + found.read.imports };
  return { at, config, baseline, found, ...counts, state: stateOf(counts, named(rules)), named: named(rules) };
}

const percent = (n, of) => `${of > 0 ? Math.round(1000 * n / of) / 10 : 0}%`;
const stateLine = r => `The codebase is **${r.state}**${r.named ? " (named so in the project's rules)" : ""}: \`${r.config.baseline}\` lists ${r.listed} old breaches of how the code is put together, of ${r.read} functions and imports the shape check reads (${percent(r.listed, r.read)}).`;

// The cleaning task's text, or null where the state asks for none.
export function cleaningBody(r, { changes, commits }, got, home) {
  if (r.state === "in standard" || r.listed === 0) return null;
  const first = worstFirst([...r.baseline.listed.keys()], changes).slice(0, FIRST);
  const share = got.all === null ? "could not be read from git here" : `${got.cleaning} of the ${got.all} changes that reached this branch in the last ${DAYS} days lowered the baseline`;
  return [stateLine(r), "",
    `**The cleaning lane's share while it is so:** ${SHARE[r.state]}. What it got: ${share}. No check holds the share: it is shown, and the orchestrator hands out lanes by it.`, "",
    `**Clean first** (where change meets tangle: what the baseline lists of a file, times its changes in the newest ${commits} commits git holds here), after the files the queue's next entries will touch:`,
    ...first.map(f => `- \`${f.file.replace(/`/gu, "'")}\`: ${f.entries} listed, changed ${f.changes} times`), "",
    `**How** (\`${home}tasks/cleaning.md\`): each a small pull request of its own that proves behaviour unchanged by the tests, takes its entries out of the baseline (\`node ${home}scripts/shape.mjs --write\`) and changes nothing a user sees; where the tests cannot prove it, they come first. A fault the tests' strength baseline lists is cleaning too: a test that catches it, and the entry taken out with \`node ${home}scripts/strength.mjs --lower <its file>\`. \`node ${home}scripts/dose.mjs\` gives this list as it stands.`].join("\n");
}

// The audit task's text, or null where none is due.
export function auditBody(r, at, home) {
  const due = auditDue({ ...r, audited: r.baseline.audited, at });
  if (!due) return null;
  return { owner: due.owner, body: [`An audit by a reader is due: ${due.why}.`, "", stateLine(r), "",
    ...(due.owner ? [`**For the owner to see:** the project is in debt and its baseline is no smaller than at the last audit (${auditOf(r.baseline.audited).listed} then). Nothing fails and no work waits: the share the cleaning lane gets is the owner's to change.`, ""] : []),
    `**How** (\`${home}tasks/cleaning.md\`, "The audit's reader"): a fresh auditor (\`${home}roles/auditor.md\`), which built none of what it reads, answers the fixed questions, each with its evidence and on the one scale, from \`node ${home}scripts/code-shape.mjs\` and the code itself, and changes nothing${home ? "" : ", and in the core's own repository is also given what \`node scripts/read-total.mjs --candidates\` prints, the files several kinds of task open, most read first, to say of each whether a part of it is all most of its readers need (#469)"}; the session that takes this task writes its answers as a report beside the last one's and records the audit with \`node ${home}scripts/dose.mjs --audited\`, in one pull request. Where the project names a *mutation tool*, the same pull request holds the tests' whole run, outside the suite: \`node ${home}scripts/strength.mjs --whole\` writes their strength baseline, whose number the reader reads beside the last one's. The report holds the table of \`node ${home}scripts/test-record.mjs\` (each test's time, failures and what it alone catches), and the reader decides on each test it proposes (\`${home}tasks/tests.md\`). Once the report is written, a second fresh session that wrote no part of it reads it whole for what it missed, its finds go into the report with a line that opens "Challenged" and gives the day (\`${home}tasks/cleaning.md\`, "An inventory or an audit is challenged once for what it missed").`].join("\n") };
}

// The rules a project's dose is read from, and where its copy of the core lies: its manifest, else the core's own
// AGENTS.md.
export function rulesOf(manifest, root) {
  if (manifest !== null && manifest !== undefined) return { rules: manifest, home: "core/" };
  return { rules: tolerant(() => fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), ""), home: "" };
}

// The scheduled look's readers (look.mjs, DUE): each the issue it keeps, its body null where nothing is due, so the
// look closes one it keeps; `unread` where the project could not be read, so it leaves the issue as it stands.
const reader = (title, body) => ({ manifest, at, root = "." }) => {
  const { rules, home } = rulesOf(manifest, root);
  let r;
  try { r = reading(rules, root); } catch (e) { return { title, body: null, unread: String(e.message).split(". Mend: ")[0] }; }
  return { title, ...(r ? body(r, at, home, root) : { body: null }) };
};
export const cleaningDue = reader(TITLES.cleaning, (r, at, home, root) => ({ body: cleaningBody(r, changesOf(r.config, root), shareGot(r.config, at, root), home) }));
export const auditIsDue = reader(TITLES.audit, (r, at, home) => auditBody(r, at, home) ?? { body: null });

// The audit recorded in the baseline: its day and the counts it stood at.
function audited(r, at) {
  const raw = JSON.parse(fs.readFileSync(r.config.baseline, "utf8"));
  const { audited: _was, ...rest } = raw;
  fs.writeFileSync(r.config.baseline, `${JSON.stringify({ audited: { day: at.slice(0, 10), listed: r.listed, read: r.read }, ...rest }, null, 2)}\n`);
  return `${r.config.baseline}: the audit of ${at.slice(0, 10)} is recorded, at ${r.listed} listed of ${r.read} read.`;
}

function main(args) {
  const at = new Date().toISOString();
  const { rules, home } = rulesOf(tolerant(() => fs.readFileSync("core-manifest.md", "utf8"), null), ".");
  const r = reading(rules);
  if (!r) return `No config of the shape check at \`${where(rules)}\` yet, so no dose is read (${home}setup/sync-notes/, "how code is put together").`;
  if (args[0] === "--audited") return audited(r, at);
  const audit = auditBody(r, at, home);
  return [cleaningBody(r, changesOf(r.config, "."), shareGot(r.config, at, "."), home) ?? `${stateLine(r)}\n\nNo cleaning beyond what the shape check holds.`, "", audit ? audit.body : "No audit by a reader is due."].join("\n");
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && args[0] !== "--audited")) { console.error("FAIL: the dose does not know that. Mend: run it with no option, or with --audited"); process.exitCode = 1; }
  else try { console.log(main(args)); } catch (e) { console.error(`FAIL: the dose could not be read here (${String(e.message).replace(/^FAIL: /u, "")})${/Mend: /u.test(e.message) ? "" : ". Mend: run it from the project's root, a git repository, once the shape check passes there"}`); process.exitCode = 1; }
}
