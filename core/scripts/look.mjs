// The scheduled look (roles/orchestrator.md, "The scheduled look"; core archive 218): what has stopped, what is due
// and what is overdue, kept in issues by itself, so that starting an orchestrator is all an owner does and an owner who
// never asks is shown it all the same. Run once a day from a project's root by the project's daily job (the core's
// look.yml, and core-moved.yml for a project that still calls it), on an orchestrator's wake where that job does not
// run it, and in the core by its own workflow (.github/workflows/own-look.yml). Each thing due is one issue it keeps,
// labelled queued and by:look, found again by its title among the issues with that label that the workflow's account
// or the *owner's account* opened, and never opened twice: updated while it stands, reopened when it comes back, a task
// again, its state label set as its reader says (`reopening`), closed with a comment once nothing of it stands. Each is
// a task an agent takes alone; one whose session hands it to the owner is labelled needs-owner, and one its reader says
// is the owner's to see too.
//   - Pull requests that stand idle: every open pull request of this repository's own branches, Dependabot's left out,
//     with no push for longer than stalled.mjs's hours: draft or ready, its checks, what its description says it waits
//     on (pr-description.mjs) and for how long, a draft with green checks first; and one whose line and label
//     needs-owner disagree.
//   - Checks failed on the default branch's newest commit, as GitHub lists that commit's latest check runs, so that
//     a failure no session saw is still shown (#542; tasks/tests.md, "A check that fails on the default branch has an
//     owner").
//   - Late review findings to answer (review-marks.mjs; tasks/reviews.md, "A late review is still read"): Codex's
//     findings inline of the last LATE_DAYS days made after their pull request merged, with no reply from an account
//     the host lets write.
//   - Steps of a release not done (steps.mjs), in a project.
//   - Labels and openers to mend (labels.mjs); in GitHub's job, the labels of the core's list made first (#1092); in
//     the core, beside them, a question or idea from a project that names a rule of the core and leaves its reasons
//     unsaid (reasons-said.mjs).
//   - In a project, the settings only the owner gives that the job's token reads as not given (host.mjs), with each
//     write GitHub refused the job, labelled needs-owner; the host is read once, and the steps read on it run with
//     the rest.
//   - The scheduled look missed a run: where its record shows no run for longer than MISSED hours. The look never
//     closes this one: a session closes it once it has found why.
//   - What the dose makes due (dose.mjs; tasks/cleaning.md): cleaning, while the codebase is not in standard, and an
//     audit by a reader, which the look labels needs-owner in place of queued where the project is in debt and its
//     baseline no smaller than at the last audit; in the core alone, the staged cases due (staged.mjs) and what a
//     role reads at its start, or the queue, standing past its cap (size.mjs; #750, point 6); and of the
//     choices that are hard to undo (choices.mjs), the pass over them twice a year, and a sign written in a measure the
//     shape check keeps, while it holds.
//   - Once a month, the state report (state-report.mjs, beside this file), opened once and not touched again; and, in a
//     project, the packages it holds that have gone stale (held.mjs, beside this file, run as a process of its own, since
//     it asks the registries over the network): no release within the year, gone from their registry, or their
//     repository archived, each a task.
// Its record is the body of one closed issue, "The scheduled look's record", which it writes on each run. A run by a
// session (not GitHub's job) where the record shows a run less than SOON hours before does nothing more, so an
// orchestrator's hourly wake makes one look a day. Where this repository's issues cannot be read and written
// (inbox.mjs), what it would open goes to the folder inbox/ instead, one file each: written by --inbox, which a session
// then commits in a pull request of its own; else printed, with that mend. It writes issues and, with --inbox, files
// in inbox/, nothing else, and fails nothing (exit 0), save where it is not run from a repository's root or is given a
// wrong option. gh, git and Node's own modules.
//
//   node core/scripts/look.mjs            the look (GITHUB_REPOSITORY and GH_TOKEN set by GitHub's job; else the
//                                         clone's origin and gh's own sign-in)
//   node core/scripts/look.mjs --dry      what it would open, update, reopen or close; it writes nothing (inbox.mjs's
//                                         asked() may send an empty body, which creates nothing)
//   node core/scripts/look.mjs --now      a session's run though the record shows one less than SOON hours before
//   node core/scripts/look.mjs --inbox    where issues cannot be reached, writes what it would open to inbox/

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { look as choicesDue, signs } from "./choices.mjs";
import { report as citedReport } from "./cited.mjs";
import { report as outcomesReport } from "./outcomes-read.mjs";
import { auditIsDue, cleaningDue } from "./dose.mjs";
import { asked, FOLDER, repoOf } from "./inbox.mjs";
import { check, gather, ghApi, pagesOf, report as labelsReport, sinceHere } from "./labels.mjs";
import { settingsOf, settingsTask } from "./host.mjs";
import { hostOf, recordRead, staleOf } from "./look-host.mjs";
import { reasonsUnsaid } from "./reasons-said.mjs";
import { pathIn } from "./reading.mjs";
import { ownerOf } from "./releases.mjs";
import { READ_MOST, ownFiles } from "./own-files.mjs";
import { started } from "./started.mjs";
import { due as capPassed } from "./size.mjs";
import { dueIssue as stagedCases } from "./staged.mjs";
import { line as blindLine, reader as blindSample, shareNow, TITLE as BLIND } from "./blind-sample.mjs";
import { ownReport } from "./holders.mjs";
import { before as monthBefore, copies, monthOf, pushWait, readCounts, shape, body as stateReport, TITLE as REPORT } from "./state-report.mjs";
import { STEPS, notDone, report as stepsReport } from "./steps.mjs";
import { MISSED, TITLES } from "./look-kinds.mjs";
import { idleFinding } from "./look-pulls.mjs";
import { lateFinding, redFinding, staleFinding } from "./look-checks.mjs";
import { keepIssues, lastRun, mine, RECORD, slug, toFolder } from "./look-keep.mjs";

// What the look is made of stands in the files beside this one, each read for one thing: look-kinds.mjs (the title of
// each kind of issue), look-pulls.mjs (the pull requests: idle, and the work standing still), look-checks.mjs (the
// default branch's checks, the late review findings, the stale packages) and look-keep.mjs (how it keeps them: in
// issues, or in the inbox's files). What they hold stands here too, where tests and scripts have always imported it from.
export { TITLES } from "./look-kinds.mjs";
export { checksOf, idleBody, NOTICE_LOGINS, noticesOf, stillFinding } from "./look-pulls.mjs";
export { FAILED, LATE_DAYS, LATE_PAGES, LATE_PULLS, lateFinding, redBody, staleFinding } from "./look-checks.mjs";
export { BOT, inboxFile, LABELS, lastRun, mine, OWNERS, plan, RECORD, relabelled, reopening, slug, text, updating } from "./look-keep.mjs";

// How soon a session's run after another does nothing more; MISSED, a daily look's slack, stands in look-kinds.mjs.
export const SOON = 20;
export { MISSED } from "./look-kinds.mjs";

// A project's own rules by what holds them, as holders.mjs --own reads them (#662); null where it cannot.
const ownHeld = scripts => { try { return ownReport(process.cwd(), scripts); } catch { return null; } };

// The readers of what else is due, each (ctx) => { title, body, unread, owner } or null, a body of null closing the
// issue it keeps and `unread` leaving it as it stands: the staged cases (staged.mjs) and a cap passed (size.mjs), in
// the core alone; the pass over
// the choices that are hard to undo and a sign of theirs that has tripped (choices.mjs); and the cleaning and the audit
// the dose makes due (dose.mjs); and the blind sample (blind-sample.mjs), whose draw is laid out on the first run of
// each month. One that says `owner`, true or false, has its issue's state label kept to it:
// needs-owner where true, else queued; one that gives `requeue`, the key of a line of its lists, has it put back to
// queued where an update brings a key the issue did not hold (`updating`).
export const DUE = [stagedCases, capPassed, choicesDue, signs, cleaningDue, auditIsDue, blindSample];

export const dueNow = (ctx, readers = DUE) => readers.map(read => read(ctx)).filter(Boolean).map(d => ({ title: d.title, what: d.body, unread: d.unread ?? null, owner: d.owner, ...(typeof d.requeue === "function" ? { requeue: d.requeue } : {}) }));

// Hours from one time to another, as a number with one decimal.
const hoursBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 360000) / 10;

// The steps' issue body: the steps not done, and the files the steps' reader left unread, where there is either; else
// none (#423).
const stepsBody = missed => (missed.length || missed.unread?.length ? `${stepsReport(missed)}\n\nEach step is a task an agent takes alone, in a pull request of its own; one marked the owner's is labelled needs-owner and the rest go on.` : null);

// The options the look is given, or null where one is no option of the look's, said as a failure.
function optionsOf(args) {
  const known = ["--dry", "--now", "--inbox"];
  const odd = args.find(a => !known.includes(a));
  if (odd) { console.error(`FAIL: ${odd} is no option of the look's (${known.join(", ")})`); return null; }
  return { dry: args.includes("--dry"), now: args.includes("--now"), toInbox: args.includes("--inbox") };
}

// The manifest, read as the steps read it (own-files.mjs): { manifest }, null in the core itself; or { refused }, the
// line to fail with, where one is there but no file of the project's own.
function manifestHere() {
  const manifest = ownFiles(".").read("core-manifest.md", true);
  if (manifest !== null || !fs.lstatSync("core-manifest.md", { throwIfNoEntry: false })) return { manifest };
  return { refused: `FAIL: core-manifest.md is no regular file of the project's own of at most ${READ_MOST} bytes (a link that leads out of the project, a device, a folder, or a file too large), so nothing was looked at. Mend: make it the project's own manifest, a file tracked in git, as the starter kit writes it` };
}

// Where the look runs, with its options: GitHub's job or a session's run, the time, the manifest (null in the core),
// the repository and its owner, the scripts' folder, and `say`, which prints a line and adds it to the job's summary.
function settingOf(options, manifest) {
  const job = process.env.GITHUB_ACTIONS === "true";
  const carrier = job ? "GitHub's daily job" : "a session's run";
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const repo = job && /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY ?? "") ? process.env.GITHUB_REPOSITORY
    : repoOf(spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8" }).stdout);
  const owner = ownerOf(manifest ?? "") ?? repo?.split("/")[0] ?? "";
  const scripts = manifest === null ? "scripts" : `${pathIn(manifest)}scripts`;
  const say = line => { console.log(line); if (job && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`); };
  return { ...options, job, carrier, at, manifest, repo, owner, scripts, say };
}

// Whether issues can be read and written in `repo`, as inbox.mjs asks it; null where GitHub gave no answer.
function reachOf(repo) {
  if (!repo) return { yes: false, why: "its origin is not on github.com" };
  let got = null, refused = false;
  try { got = JSON.parse(ghApi(`repos/${repo}`)); } catch (e) { refused = /\bHTTP 404\b/.test(String(e.message)); }
  return got && typeof got === "object" && got.permissions ? asked(repo, got) : refused ? { yes: false, why: "GitHub finds no such repository for this account" } : null;
}

function findingsOf(ctx, reach, last) {
  const { repo, manifest, owner, at, say } = ctx;
  const findings = [];
  const add = (title, what, unread = null) => findings.push({ title, what, unread });
  const { host, refused } = hostOf(ctx, reach);
  // pull requests that stand idle, the work standing still, and late review findings
  idleFinding(repo, add, manifest, owner);
  lateFinding(repo, add, at);
  // checks failed on the default branch
  redFinding(repo, add);
  // steps of a release not done, in a project
  let stepsLeft = null;
  if (manifest !== null) {
    try {
      const missed = notDone(process.cwd(), STEPS, host); stepsLeft = missed.length; add(TITLES.steps, stepsBody(missed));
      if (missed.hostUnread?.length) say(`Steps not read on the host this run: ${missed.hostUnread.map(u => `${u.lead} (${u.why})`).join("; ")}.`);
    } catch { add(TITLES.steps, null, "the steps could not be read here"); }
    // the settings only the owner gives, as the job's token reads them, and each write refused (#1092)
    if (host) { ctx.hostRead = at; findings.push({ title: TITLES.settings, what: settingsTask(repo, settingsOf(host, process.cwd()), refused), unread: null, owner: true }); }
    else add(TITLES.settings, null, "GitHub's answers for the repository could not be read here");
  }
  // labels and openers
  if (reach.yes) {
    try {
      const since = sinceHere(), got = gather(repo, since), core = manifest === null;
      // (in the core alone, beside them: a question or idea from a project that names a rule says which reasons do not hold)
      const found = [...check({ ...got, owner, since, core }), ...(core ? reasonsUnsaid({ issues: got.issues, owner, since }) : [])];
      add(TITLES.labels, found.length ? labelsReport(found, repo) : null);
    }
    catch { add(TITLES.labels, null, "the labels and openers could not be read"); }
  }
  // a missed run
  if (last && hoursBetween(last, at) > MISSED) add(TITLES.missed, `The look before this one ran at ${last}, ${hoursBetween(last, at)} h before this run at ${at}: over ${MISSED} h. Find why and mend it, then close this issue: GitHub switches a scheduled workflow off after 60 days with no activity in the repository (\`gh workflow enable\` turns it back on, as an orchestrator's wake does), a run can fail, and an orchestrator that carries the look may not have woken.`);
  // what else is due, as each rule that sets it comes
  findings.push(...dueNow({ repo, manifest, at }));
  return { findings, stepsLeft };
}

// (open since its last reopening, where the look reopened it: a task that came back is not one that stood)
const reopenedSince = (repo, i) => { try { return pagesOf(`repos/${repo}/issues/${i.number}/events`).filter(e => e.event === "reopened").map(e => e.created_at).sort().at(-1) ?? i.created_at; } catch { return i.created_at; } };

// The state report, once a month: its title, its file in the inbox, and `monthly`, its body where it is due, else null.
function monthlyOf({ repo, owner, manifest, at, scripts }, reach, kept, stepsLeft) {
  const month = monthOf(at), reportTitle = `${REPORT}, ${month}`;
  let monthly = null;
  // (in the inbox, a month's report is written once: while no commit has held its file)
  const reportFile = path.join(FOLDER, slug(reportTitle));
  const written = !reach.yes && spawnSync("git", ["log", "--all", "--format=%H", "-1", "--", reportFile], { encoding: "utf8" }).stdout.trim() !== "";
  if (reach.yes ? !kept.has(reportTitle) : !written && !fs.existsSync(reportFile)) {
    const previous = [...kept.entries()].filter(([t]) => t.startsWith(`${REPORT}, `) && t < reportTitle).sort(([a], [b]) => a.localeCompare(b)).at(-1)?.[1] ?? null;
    const overdue = [...kept.entries()].filter(([t, i]) => i.state === "open" && t !== RECORD && !t.startsWith(`${REPORT}, `) && hoursBetween(i.created_at, at) > 7 * 24)
      .map(([t, i]) => ({ number: i.number, title: t, since: reopenedSince(repo, i) })).filter(o => hoursBetween(o.since, at) > 7 * 24);
    const counts = manifest === null ? null : readCounts({ repo, manifest, month, steps: stepsLeft }), last = previous?.body ?? null;
    monthly = stateReport({ core: manifest === null, month, measures: copies(process.cwd(), manifest), shape: shape(process.cwd(), manifest), wait: pushWait(repo, process.cwd(), manifest), previous: last, overdue, counts, cited: citedReport({ repo, month: monthBefore(month) }), outcomes: outcomesReport({ repo, month: monthBefore(month), manifest, previous: last, blind: blindLine(shareNow(repo, kept.get(BLIND), owner)) }), ...(manifest === null ? {} : { holders: ownHeld(scripts) }), scripts });
  }
  return { reportTitle, reportFile, monthly };
}

function main(args) {
  const options = optionsOf(args);
  if (!options) return 1;
  const below = spawnSync("git", ["rev-parse", "--show-prefix"], { encoding: "utf8" });
  if (below.status !== 0 || below.stdout.trim() !== "") { console.error("FAIL: run it from the root of the project's git repository"); return 1; }
  const { manifest, refused } = manifestHere();
  if (refused) { console.error(refused); return 1; }
  const ctx = settingOf(options, manifest);
  const { job, now, at, repo, owner, scripts, say } = ctx;

  // whether issues can be read and written here, as inbox.mjs asks it: no answer, nothing is done
  const reach = reachOf(repo);
  if (!reach) { say(`The scheduled look could not ask GitHub here (gh is not installed, answers for no account, or gave no answer): nothing was looked at. Run \`node ${scripts}/look.mjs\` where gh answers.`); return 0; }

  // the record, and whether a session's run is due
  let kept = new Map();
  if (reach.yes) {
    try { kept = mine(pagesOf(`repos/${repo}/issues?state=all&labels=by%3Alook`), owner); } catch { say("The issues the scheduled look keeps could not be read: nothing was looked at."); return 0; }
  }
  const record = kept.get(RECORD) ?? null, last = lastRun(record?.body);
  if (!job && !now && last && hoursBetween(last, at) < SOON) { say(`The scheduled look ran ${hoursBetween(last, at)} h ago (${last}): nothing more to do until ${SOON} h have passed.`); return 0; }
  const stale = recordRead(ctx, record);

  const { findings, stepsLeft } = findingsOf(ctx, reach, last);
  // the state report, once a month
  const report = monthlyOf(ctx, reach, kept, stepsLeft);
  findings.push(...staleOf(ctx, report, stale));

  // what is done with each
  if (!reach.yes) { toFolder(ctx, reach, findings, report); return 0; }
  keepIssues(ctx, kept, record, findings, report);
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
