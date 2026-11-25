// The trial of a release on a real project before it is cut (#1084; AGENTS.md, "A release is cut on the owner's word"):
// a run of check.mjs --verdicts before an update set beside one after it, the record of the trial, which holds counts
// alone, and what that record says of the release release.mjs would cut. Git and Node's own modules only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leadsOut } from "./guards.mjs";

// The key check.mjs --verdicts adds where it was run from outside the project, a clone of the core (check.mjs's RUN_FROM,
// which the test holds to this one; #1244): no job's place.
const RUN_FROM = "(run from)";

// The record of the trial: counts alone, never a project's name, its jobs or its code.
export const TRIAL = "reports/release-trial.json";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// A run of check.mjs --verdicts before an update set beside one after it, each job by its place, in a class of COUNTS
// (#1245, point 10): passed both; fixed after, failed before; failed both, standing before the update; failed after,
// where it passed before, the update's; failed after alone, where it did not run before, the update's too, since a check
// it adds may not fail what stood (AGENTS.md, "Nothing locks a project"); stopped after, behind another's failure,
// which measured nothing of it (point 2); ran after alone, passed; ran before alone, passed, and failed before alone,
// which an update may fold into another's steps; and unrun after, on another system or wanting a program this machine
// lacks (points 8 and 9), apart where it ran before, since the update then kept it from being measured. A job stopped or unrun before ran not then, and one whose place a job stopped or unread after holds, or that holds such a job, is
// counted with that one. What check.mjs could not read is not measured (#1263, point 2, as #1257 sets it): unread after
// where it ran before (`ranThen`), a whole file unread after counted with its
// jobs of before; unread before and failed after, where its own key, or a place before that holds it, was unread, or
// failed whole where the run after gives its jobs, as an older check.mjs wrote a file it could not read, that place
// before counted with them, never as failed before; and unread after where it ran not before, read in neither run.
export const COUNTS = ["passedBoth", "fixedAfter", "failedBoth", "failedAfter", "failedAfterAlone", "stoppedAfter", "ranAfterAlone", "ranBeforeAlone", "failedBeforeAlone", "unrunAfter", "unrunAfterRan", "unreadAfter", "unreadBefore", "unreadNeither"];
export function compared(before, after) {
  const later = jobsOf(after);
  const stopped = later.filter(([, v]) => v === "stopped").map(([job]) => job), unreadNow = later.filter(([, v]) => v === "unread").map(([job]) => job);
  const lost = job => [...stopped, ...unreadNow].some(s => within(job, s) || within(s, job));
  const { wholes, unreadThen } = unreadBefore(before, after);
  const out = Object.fromEntries(COUNTS.map(k => [k, []]));
  const was = Object.fromEntries(Object.entries(ranIn(before)).filter(([job]) => !wholes.includes(job)));
  out.stoppedAfter = stopped;
  for (const job of unreadNow) out[ranThen(before, wholes, job) ? "unreadAfter" : "unreadNeither"].push(job);
  for (const [job] of later.filter(([, v]) => v === "unrun")) out[was[job] ? "unrunAfterRan" : "unrunAfter"].push(job);
  for (const [job, v] of Object.entries(was)) if (!Object.hasOwn(after ?? {}, job) && !lost(job)) out[v === "passed" ? "ranBeforeAlone" : "failedBeforeAlone"].push(job);
  for (const [job, v] of Object.entries(ranIn(after))) out[v === "failed" && unreadThen(job) ? "unreadBefore" : ranClass(v, was[job])].push(job);
  return out;
}

// A run's jobs, [place, verdict] each, the key that says where check.mjs ran from left out; those that ran, by place.
const jobsOf = run => Object.entries(run ?? {}).filter(([job]) => job !== RUN_FROM);
const ranIn = run => Object.fromEntries(jobsOf(run).filter(([, v]) => v === "passed" || v === "failed"));
// Whether a job ran before, by its key or a place that holds it or that it holds; a job or a call failed before is read
// as run, since its key cannot say which it was, and a whole file failed before, among `wholes`, as not.
const ranThen = (before, wholes, job) => Object.keys(ranIn(before)).some(k => (k.includes("/") || !wholes.includes(k)) && (k === job || within(job, k) || within(k, job)));
// Whether a job's place lies under another's: a job of its file or call, or, with `matrix`, a combination of its matrix.
const within = (job, place, matrix = true) => job.startsWith(`${place}/`) || (matrix && job.startsWith(`${place} (`));

// The places before that measured nothing of the jobs the run after gives under them (`wholes`): unread, or failed whole,
// as an older check.mjs wrote a file it could not read; and whether a job was not read before (`unreadThen`), by its own
// key or under such a place.
function unreadBefore(before, after) {
  const now = jobsOf(after).map(([job]) => job);
  const whole = jobsOf(before).filter(([job, v]) => (v === "unread" || v === "failed") && !Object.hasOwn(after ?? {}, job) && now.some(a => within(a, job, v === "unread")));
  return { wholes: whole.map(([job]) => job), unreadThen: job => before?.[job] === "unread" || whole.some(([place, v]) => within(job, place, v === "unread")) };
}

// The class of a job that ran after, by its verdict then and the one it had before, where it ran before.
const ranClass = (now, then) => {
  const by = now === "passed" ? { passed: "passedBoth", failed: "fixedAfter" } : { passed: "failedAfter", failed: "failedBoth" };
  return by[then] ?? (now === "passed" ? "ranAfterAlone" : "failedAfterAlone");
};

// The record of a trial at `sha` on the day `day`: each project's runs, [before, after], counted, and how many baselines
// the release's check.mjs took from a clone of the core, where the copy's could not (#1244); no pair where no project
// that takes the core allowed one.
export function trialRecord(sha, day, pairs) {
  const counts = Object.fromEntries(COUNTS.map(k => [k, 0]));
  for (const [before, after] of pairs) for (const [k, jobs] of Object.entries(compared(before, after))) counts[k] += jobs.length;
  return { commit: sha, day, projects: pairs.length, ...counts, baselineFromClone: pairs.filter(([before]) => Object.hasOwn(before ?? {}, RUN_FROM)).length };
}

// Whether a record is in the form --trial writes: the commit, the day, and counts, all none where no project was tried.
function formed(r) {
  if (r === null || typeof r !== "object") return false;
  const counts = [...COUNTS, "baselineFromClone"].map(k => r[k]);
  return /^[0-9a-f]{40}$/.test(String(r.commit)) && /^\d{4}-\d\d-\d\d$/.test(String(r.day)) && [r.projects, ...counts].every(n => Number.isInteger(n) && n >= 0)
    && (r.projects > 0 || counts.every(n => n === 0)) && r.baselineFromClone <= r.projects;
}

// How the runs are taken, for a mend that asks a trial: check.mjs from the project's clone, before the update and after,
// and, where the copy holds none, or one without --verdicts, the baseline by the release's, from a clone of the core.
export const RUNS = "in a clone of the project, `node core/scripts/check.mjs --base <its main> --own --verdicts <a file outside every repository>` before the update and after it; where the copy holds no check.mjs, or one without --verdicts, the run before with `node <a clone of the core at the commit tried>/scripts/check.mjs` and the same options, from the project's clone";

// What the trial's record says of the release at `sha`, read through `git` (its arguments give its output), and why it
// holds the cut, or null: the record stands for the commit where it names it, or one before it from which the release
// changes the record alone; it holds the cut where it does not stand, where a check failed after the update that passed
// before it or did not run then, and where one was not measured, run before and unread after or unread before and
// failed after (#1263, point 2; #1257); one stopped after, or unrun after though it ran before, is named beside the
// counts, and one read in neither run is counted and holds nothing (#1257).
export function trialAt(sha, git) {
  let r = null;
  try { r = JSON.parse(git(["show", `${sha}:${TRIAL}`])); } catch { /* (not there, or not read) */ }
  const again = `try the release on a copy of a project that takes the core and whose owner allows it, before the release workflow is started, as AGENTS.md says ("A release is cut on the owner's word"): ${RUNS}; record it with \`node scripts/release.mjs --trial <the commit tried> <before> <after>\` (\`--trial <the commit>\` alone where no project allows one), in a pull request of its own; then start the release again`;
  if (!formed(r)) return { said: `The trial on a real project has not run for ${sha.slice(0, 7)}: ${TRIAL} ${r === null ? "is not there or cannot be read" : "is in no form this script writes"}.`, held: `the trial on a real project has not run for ${sha.slice(0, 7)}. Mend: ${again}` };
  let more;
  try { git(["merge-base", "--is-ancestor", r.commit, sha]); more = git(["diff", "--no-renames", "--name-only", r.commit, sha]).split("\n").map(f => f.trim()).filter(f => f && f !== TRIAL); } catch { more = null; }
  if (more === null || more.length) return { said: `The trial on a real project ran on ${r.commit.slice(0, 7)}, and this commit changes more since.`, held: `the trial's record stands for ${r.commit.slice(0, 7)}, and ${sha.slice(0, 7)} ${more ? `changes more than the record since (${more.slice(0, 3).join(", ")}${more.length > 3 ? ", …" : ""})` : "does not follow it"}. Mend: ${again}` };
  const failed = r.failedAfter + r.failedAfterAlone, unread = r.unreadAfter + r.unreadBefore;
  const why = [
    failed && `${plural(failed, "check")} failed after the release in the trial on a real project, ${r.failedAfter} of them passing before it and ${r.failedAfterAlone} not run before. Mend: find the release's fault from the trial's run after the update, mend it in the core in a pull request of its own, and ${again}`,
    unread && `${plural(unread, "check")} ${unread === 1 ? "was" : "were"} not measured in the trial on a real project, ${r.unreadAfter} of them run before and not read after the update and ${r.unreadBefore} not read before it and failed after. Mend: teach the core's workflow runner (scripts/workflow-run.mjs) each form the run after's FAIL lines name as one it cannot read, in a pull request of its own; where only the run before could not read it, take the run before the update again with the release's check.mjs from a clone of the core, run from the project's clone; and ${again}`,
  ].filter(Boolean);
  return { said: trialSaid(r), held: r.projects === 0 || !why.length ? null : why.join("; and ") };
}

// What a record in its form says.
const trialSaid = r => (r.projects === 0
  ? `No project that takes the core allowed a trial of this release (${TRIAL}, ${r.day}), so none ran.`
  : `The trial on a real project ran on ${r.commit.slice(0, 7)} on ${r.day}, in ${plural(r.projects, "project")}: ${plural(r.passedBoth, "check")} passed before and after the update, ${r.fixedAfter} failed before and passed after, ${r.failedBoth} failed before and after (standing before the release), ${r.failedAfter} passed before and failed after (the release's), ${r.failedAfterAlone} ran after alone and failed (the release's too), ${r.stoppedAfter} stopped after it behind a failure, ${r.unreadAfter} run before and not read after it and ${r.unreadBefore} not read before it and failed after (not measured), ${r.unreadNeither} read in neither run (not measured, holding nothing), ${r.ranAfterAlone} ran after alone and passed, ${r.ranBeforeAlone} ran before alone and passed, ${r.failedBeforeAlone} ran before alone and failed, ${r.unrunAfter} not run after on this machine, and ${r.unrunAfterRan} not run after it there though they ran before; ${r.baselineFromClone} of the baselines taken by the release's check.mjs from a clone of the core, the copy's holding none that writes verdicts.${lost(r)}`);

// The checks the trial measured nothing of after the update, stopped or unrun there, named beside the counts for the
// session that starts the release to read first; they do not hold the cut, which a check failed after does (AGENTS.md),
// and one run before and not read after (#1263, point 2; #1257), which the cut's reason names.
const lost = r => (r.stoppedAfter + r.unrunAfterRan ? ` Read before the release workflow is started: ${plural(r.stoppedAfter + r.unrunAfterRan, "check")} measured nothing after the update, ${r.stoppedAfter} stopped behind a failure and ${r.unrunAfterRan} that ran before not run after on the trial's machine; find why from the trial's run after the update.` : "");

// How many of the owner's own projects take the core, as scripts/state-report.mjs --projects lists them (a line each,
// another owner's named as such), or null where it could not read them.
function ownProjects() {
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "state-report.mjs"), "--projects"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return ownCount(r.stdout);
}

// Of what state-report.mjs --projects prints, how many lines name a project of the owner's: each project is a line
// "- <how shownAs names it>: <its counts>.", another owner's named "a project of another owner"; its other lines (a
// heading, "None found.", a note in brackets) name none. releases-test.mjs holds it to shownAs's words.
export const ownCount = printed => printed.split("\n").filter(l => /^- (`[^`]+`|a private project of the owner's): /.test(l)).length;


// --trial <sha> [<before> <after>]...: writes the trial's record, each pair one project's runs of check.mjs --verdicts.
export function trial([sha, ...files], fail) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? "") || files.length % 2) return fail(`--trial needs the full SHA of the commit tried, then for each project tried the file check.mjs --verdicts wrote before the update and the one it wrote after (${RUNS}); no file where no project allowed a trial`);
  const inside = files.find(f => !leadsOut(ROOT, f));
  if (inside) return fail(`${inside} lies in the core's own repository, where a project's job names could be committed: write the runs' verdicts to a scratch folder outside every repository, and give those files`);
  if (!files.length) { const own = ownProjects(); if (own === null || own > 0) return fail(own === null ? "which of the owner's projects take the core could not be read (scripts/state-report.mjs --projects), and nothing read is not none found. Mend: run it where gh answers for the owner's account, then --trial again" : `${plural(own, "project")} of the owner's take the core, as scripts/state-report.mjs --projects finds them. Mend: try the release on one of them, and record its runs before and after`); }
  const pairs = [];
  for (let i = 0; i < files.length; i += 2) {
    const verdict = ([job, x]) => (job === RUN_FROM ? typeof x === "string" : ["passed", "failed", "stopped", "unrun", "unread"].includes(x));
    const read = f => { try { const v = JSON.parse(fs.readFileSync(f, "utf8")); return v && typeof v === "object" && !Array.isArray(v) && Object.entries(v).every(verdict) ? v : null; } catch { return null; } };
    const pair = [read(files[i]), read(files[i + 1])];
    if (pair.includes(null)) return fail(`${pair[0] === null ? files[i] : files[i + 1]} is no run's verdicts: give the files check.mjs --verdicts wrote`);
    if (Object.keys(pair[0]).some(j => j !== RUN_FROM) && !Object.keys(pair[1]).some(j => j !== RUN_FROM)) return fail(`${files[i + 1]} holds no job, where the run before the update held some: check.mjs ran nothing after it, so run it again and give what it writes`);
    pairs.push(pair);
  }
  const record = trialRecord(sha, new Date().toISOString().slice(0, 10), pairs);
  fs.writeFileSync(path.join(ROOT, TRIAL), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${TRIAL} written. ${trialSaid(record)}`);
}
