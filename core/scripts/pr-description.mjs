// The description check ("Each PR has the headings" in roles/shared/work-flow.md), for every project that takes the core, on every
// PR that is not a draft: it fails a description without a heading for each part the project names, by default "What
// the owner can try" and "Readings taken". A part is there when a line of the description is a heading (one to six #)
// that starts with its words, whatever the case, with no letter or digit right after them and whatever marks before
// them: "### Readings taken (the unsure first)" and "## **Readings taken**" count. It reads no Markdown beyond that, so
// such a line counts inside a code block or a comment too: it catches the heading forgotten, which is what happens, and
// not the one faked, which a review sees. Where nothing was open, the heading stands with "None" under it, and where
// the project's report is a file of its own, with where that file is, so the check never guesses whether something
// was. It holds that the parts are there, not that they are true or whole: that stays with the reviews. Dependabot's
// own PRs are not asked (the workflow leaves them out by their author).
// It asks too the line that says what it waits on ("Nothing waits silently" in roles/shared/work-flow.md; core archive 218), in one
// of the forms waitsOn reads, as the scheduled look reads it (look.mjs, beside this file), of a pull request opened
// (PR_CREATED) on or after WAITS_SINCE where the copy on its base (BASE_SHA) already held it then: the newest commit
// from before then that changed this file there, as GitHub's API gives them through gh (GH_TOKEN, GITHUB_REPOSITORY),
// holds the line. Where any of it cannot be read, or the base's copy has not gained it (a sync's
// own pull request), nothing is asked, so a pull request that stood before the line came is never turned red by it.
// It asks in the same way, of a pull request opened since the copy on its base held READS_SINCE, the line that lists
// what its changed paths called for ("One script says what to read" in tasks/tools.md; core archive 234; #304): each
// file the reading script (reading.mjs, beside this file) gives for the paths the pull request changes, read from git
// as the merge commit against its first parent, the base, stands in backticks on the description's line "Read for
// it:". A renamed file counts by both its names, and the paths of the core's copy, in a project, by neither: a sync
// moves them, and the core's own pull request held them to their reading. A pull request whose paths call for nothing
// needs no line, and where the change cannot be read (a checkout without the base) nothing is asked. The kinds a
// project gives its own paths (its reading config) are read as the base holds them.
// It asks in the same way, of a pull request opened since the copy on its base held DONE_SINCE, how done will be judged
// (tasks/done-when.md; #305): a feature's issue it adds to the *progress file* has the heading "Done when", lines the
// description holds are in the form, and one that closes a feature's issue says what it ran and saw for each line, as
// done-when.mjs, beside this file, reads them, at most a dozen items read through gh; one it cannot read is asked
// nothing. And, of one opened since the copy on its base held PLAN_SINCE, the milestones of the *progress file*
// (tasks/planning.md; #322), as milestones.mjs, beside this file, reads them, where the manifest takes that module.
// It asks in the same way, of a pull request opened since the copy on its base held COST_SINCE, the line the cost script
// prints (session-cost.mjs, beside this file), or in its place the mark NO_COST, so that a line left out by the rule can
// be told from one forgotten ("An exemption leaves a mark" in roles/shared/work-flow.md; #302). And where the part
// "What holds it" is asked and holds more than "None", of a pull request opened since the copy on its base held
// NUMBER_SINCE, a line under it that names a rule's number in its form ("Number: findings; outcome: robust";
// outcomes.mjs's NUMBER; #303). And, since YES_SINCE, the owner's yes where the core's floor or review guidelines change
// (owner-yes.mjs, beside this file; #549), save of a file whose change only follows files it moves (path-only.mjs;
// #886, point 1) or that the design check states keeps its meaning (meaning-kept.mjs; #886, point 2). And, of one opened since the copy on its base held REASONS_SINCE that adds a
// line under the manifest's "Differences" (read from git, the merge commit against its base), the line "Reasons read:"
// (tasks/updates.md, "A question or difference about a rule of the core starts from its reasons"; #756). A line asked
// for passes where it begins in its form, whatever follows it (#750, point 4).
// And, of one opened since the copy on its base held CHANGED_SINCE, each test file it leaves with fewer lines that
// assert, or in which it skips a case, named on the line weakened.mjs, beside this file, asks, and each whose
// assertions it only changes listed for the reviewer (#307).
// Each line's check stands in a file beside this one (#888), read alone by whoever changes it, and is exported from here: the
// line "Waits on:" in pr-waits.mjs, the cost line in pr-cost.mjs, the rule's number in pr-number.mjs, "Read for it:" in
// pr-reads.mjs, "Reasons read:" in pr-reasons.mjs; this file holds the parts, the days from which each line is asked and
// the run that asks them.
// Reads only: the description comes in PR_BODY, never on the command line; gh, git and Node's own modules. Run by the
// description workflow (.github/workflows/pr-description.yml).
//
//   PR_BODY="$(...)" PR_CREATED="..." node core/scripts/pr-description.mjs ["Part one|Part two"]
//   PR_BODY="$(...)" node core/scripts/pr-description.mjs "+Part three"     the two, and that one as well
import { spawnSync } from "node:child_process";
import { doneMends, ownerAt, queueAt, readItem, takesIt } from "./done-when.mjs";
import { isPart, milestoneMends } from "./milestones.mjs";
import { asking, coreAtBase, issuesOf, textsOf, yesOf } from "./owner-yes.mjs";
import { numberOf, statedOf } from "./meaning-kept.mjs";
import { proven } from "./path-only.mjs";
import { coreAt, lineMend, pathIn, textOf } from "./reading.mjs";
import { started } from "./started.mjs";
import { changedMend, plain, testsChanged } from "./weakened.mjs";
import { NO_COST, costMend } from "./pr-cost.mjs";
import { HOLDS, numberMend } from "./pr-number.mjs";
import { calledFor } from "./pr-reads.mjs";
import { MANIFEST_MAX, REASONS, UNREADABLE, differencesAdded, reasonsMend } from "./pr-reasons.mjs";
import { WAITS, heldAt, waitsMend, waitsOn } from "./pr-waits.mjs";

// (what each line's check holds, exported from here as before they were split)
export { HOLDS, calledFor, MANIFEST_MAX, NO_COST, REASONS, UNREADABLE, WAITS, costMend, differencesAdded, heldAt, numberMend, reasonsMend, waitsMend, waitsOn };
export const WAITS_SINCE = "2026-11-16T00:00:00Z";
// The day from which the line "Read for it:" is asked, of a pull request opened since the copy on its base held this.
export const READS_SINCE = "2026-11-16T00:00:00Z";
// The day from which how done will be judged is asked (tasks/done-when.md; #305), as the two lines above are.
export const DONE_SINCE = "2026-11-17T00:00:00Z";
// The day from which a description is asked its cost line or the mark that says the script printed none ("An exemption
// leaves a mark" in roles/shared/work-flow.md; #302), as the lines above are.
export const COST_SINCE = "2026-11-17T00:00:00Z";
// The day from which the part "What holds it" is asked the number of each rule it names (AGENTS.md of the core, "Every
// rule says what holds it"; #303), as the lines above are.
export const NUMBER_SINCE = "2026-11-17T00:00:00Z";
// The day from which a description names, on weakened.mjs's line, each test file the pull request leaves with fewer
// lines that assert, or in which it skips a case (tasks/code-shape.md, "A test taken out or weakened is said"; #307), as
// the lines above are.
export const CHANGED_SINCE = "2026-11-18T00:00:00Z";

// The day from which a pull request that adds a difference is asked the line REASONS (#756), as the lines above are.
export const REASONS_SINCE = "2026-11-19T00:00:00Z";

// The day from which the owner's yes is asked of a pull request that changes the floor or the review guidelines
// (owner-yes.mjs, beside this file; #549), as the lines above are.
export const YES_SINCE = "2026-11-18T00:00:00Z";

// Whether it is asked of a pull request opened at `created` (as GitHub gives it), `then` the copy on its base when it
// opened, or null where that could not be read: only where both are on or after the day it came.
export const doneAsked = (created, then) => String(created) >= DONE_SINCE && Boolean(then?.includes("export const DONE_SINCE"));
// The day from which the milestones are asked (tasks/planning.md; #322), in the same way.
export const PLAN_SINCE = "2026-11-17T00:00:00Z";
export const planAsked = (created, then) => String(created) >= PLAN_SINCE && Boolean(then?.includes("export const PLAN_SINCE"));

// The path of the copy whose history says which lines a pull request is asked, in the checkout at `dir`, the merge commit
// against its first parent, the base: where the base's manifest puts the core (its "Core:" line, read by pathIn), or the
// core's own scripts/ where the base holds no manifest; never the head's, so that a pull request cannot move the path to
// skip the lines (#455).
export function copyAtBase(dir) {
  const r = spawnSync("git", ["show", "HEAD^1:core-manifest.md"], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 24 });
  return `${r.status === 0 ? pathIn(r.stdout) : ""}scripts/pr-description.mjs`;
}

export const PARTS = ["What the owner can try", "Readings taken"];

// The parts an argument asks for: its own, separated by |, in place of the two; led by a +, added to the two (so a
// caller that wants one more never writes the two a second time); empty or left out, the two.
export function asked(arg) {
  const text = String(arg ?? "").trim();
  const own = text.replace(/^\+/u, "").split("|").map(p => p.trim()).filter(Boolean);
  if (!own.length) return PARTS;
  return text.startsWith("+") ? [...PARTS, ...own.filter(p => !PARTS.includes(p))] : own;
}

// The parts, of those asked for, that the description has no heading for.
export function missing(body, parts = PARTS) {
  // a heading's words: what follows the #, read as milestones.mjs, beside this file, reads a part's heading
  const headings = textOf(body).split(/\r\n|\r|\n/u).map(line => /^ {0,3}#{1,6}[ \t]+(.*)$/u.exec(line)?.[1]).filter(Boolean);
  return parts.filter(part => !headings.some(h => isPart(h, part)));
}

if (started(import.meta.url)) {
  const parts = asked(process.argv[2]);
  const absent = missing(process.env.PR_BODY, parts);
  for (const part of absent) console.log(`FAIL the description has no heading "${part}". Mend: add "## ${part}" with what belongs under it ("None" where there is nothing; where a report in a file holds it, that file), and run the check again`);
  console.log(`${absent.length ? "FAIL" : "ok  "} the description's parts: ${absent.length} of ${parts.length} missing${absent.length ? ". Mend: add each heading above as it says" : ""}`);
  // (each line asked only of a pull request opened since the copy on its base gained it)
  const created = String(process.env.PR_CREATED ?? ""), base = String(process.env.BASE_SHA ?? ""), repo = String(process.env.GITHUB_REPOSITORY ?? "");
  const mends = [];
  if (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(created) && created >= WAITS_SINCE && /^[0-9a-f]{40}$/.test(base) && /^[\w-]+\/[\w.-]+$/.test(repo) && !/\/\.+$/.test(repo)) {
    const file = copyAtBase(".");
    const gh = (...a) => { const r = spawnSync("gh", ["api", ...a], { encoding: "utf8", maxBuffer: 1 << 24 }); if (r.status !== 0) throw new Error("no answer"); return r.stdout; };
    // the copy as it stood when the pull request opened, read once
    let then = null;
    try {
      const commits = JSON.parse(gh(`repos/${repo}/commits?path=${file}&sha=${base}&per_page=100`)).map(c => ({ sha: c.sha, date: c.commit?.committer?.date })).filter(c => /^[0-9a-f]{40}$/.test(c.sha));
      then = "";
      heldAt(commits, created, sha => { then = Buffer.from(JSON.parse(gh(`repos/${repo}/contents/${file}?ref=${sha}`)).content ?? "", "base64").toString("utf8"); return true; });
    } catch { then = null; }
    const why = then === null ? "whether the copy on its base held it could not be read" : "the copy on its base did not hold it when the pull request opened";
    if (then?.includes("export const WAITS_SINCE")) { const mend = waitsMend(process.env.PR_BODY); if (mend) mends.push(mend); }
    else console.log(`ok   the line "${WAITS}" is not asked here: ${why}`);
    if (created >= READS_SINCE && then?.includes("export const READS_SINCE")) {
      const called = calledFor(process.cwd());
      if (called === null) console.log("ok   the line that lists what the changed paths call for is not asked here: the change could not be read against its base");
      else {
        const mend = lineMend(process.env.PR_BODY, called, `node ${coreAt(process.cwd())}scripts/reading.mjs builder --changed --line`);
        if (mend) mends.push(mend);
        else console.log(`ok   the description lists what its changed paths call for (${called.length} file${called.length === 1 ? "" : "s"})`);
      }
    } else console.log(`ok   the line that lists what the changed paths call for is not asked here: ${why}`);
    const at = coreAt(process.cwd()) ?? "", queue = doneAsked(created, then) || planAsked(created, then) ? queueAt(process.cwd(), at) : null;
    // (one read of each item for both checks, so that a run reads a dozen at most between them)
    const owner = queue ? ownerAt(queue.manifest, at, repo) : null, seen = new Map();
    const read = item => { if (!seen.has(item)) seen.set(item, readItem(repo, item, ".", owner)); return seen.get(item); };
    if (queue && !doneAsked(created, then)) console.log(`ok   how done will be judged is not asked here: ${why}`);
    else if (queue && !takesIt(queue.manifest, at)) console.log("ok   how done will be judged is not asked here: the manifest leaves done-when.md out");
    else if (queue) {
      const done = doneMends({ body: process.env.PR_BODY, queue, read, at });
      for (const note of done.notes) console.log(`ok   ${note}`);
      if (done.mends.length) mends.push(...done.mends);
      else console.log("ok   how done will be judged: the entries this pull request queues or closes are in the form, and proved");
    } else console.log(`ok   how done will be judged is not asked here: ${doneAsked(created, then) ? "the change could not be read against its base" : why}`);
    if (queue && !planAsked(created, then)) console.log(`ok   the milestones are not asked here: ${why}`);
    else if (queue && !takesIt(queue.manifest, at, "planning.md")) console.log("ok   the milestones are not asked here: the manifest leaves planning.md out");
    else if (queue) {
      const plan = milestoneMends({ body: process.env.PR_BODY, queue, read, at, already: new Set(seen.keys()) });
      for (const note of plan.notes) console.log(`ok   ${note}`);
      if (plan.mends.length) mends.push(...plan.mends);
      else console.log("ok   the milestones of the progress file are in their form, and each one reached is named");
    } else console.log(`ok   the milestones are not asked here: ${planAsked(created, then) ? "the change could not be read against its base" : why}`);
    if (created >= COST_SINCE && then?.includes("export const COST_SINCE")) { const mend = costMend(process.env.PR_BODY); if (mend) mends.push(mend); else console.log("ok   the description has its cost line, or the mark that the script printed none"); }
    else console.log(`ok   the cost line or its mark is not asked here: ${why}`);
    if (created >= CHANGED_SINCE && then?.includes("export const CHANGED_SINCE")) {
      const found = testsChanged(process.cwd());
      if (found === null) console.log("ok   the tests this pull request edits are not asked here: the change, or the shape check's config at its base, could not be read, or that config names no tests");
      else {
        // (each file whose assertions are only changed is listed for the reviewer, and asks nothing: one made stricter is no worse)
        for (const f of found.filter(f => !f.weaker)) console.log(`ok   for the reviewer: ${plain(f.file)} has ${f.asserts.length} line${f.asserts.length === 1 ? "" : "s"} that assert changed, none fewer`);
        const mend = changedMend(process.env.PR_BODY, found, `node ${coreAt(process.cwd()) ?? ""}scripts/weakened.mjs`);
        if (mend) mends.push(mend); else console.log(`ok   the description names each test file this pull request leaves with fewer lines that assert, or in which it skips a case (${found.filter(f => f.weaker).length})`);
      }
    } else console.log(`ok   the tests this pull request edits are not asked here: ${why}`);
    // (asked only where the part is, which is where the rules change)
    if (parts.includes(HOLDS) && created >= NUMBER_SINCE && then?.includes("export const NUMBER_SINCE")) { const mend = numberMend(process.env.PR_BODY); if (mend) mends.push(mend); else console.log(`ok   the part "${HOLDS}" names a rule's number, or "None"`); }
    else if (parts.includes(HOLDS)) console.log(`ok   the number under "${HOLDS}" is not asked here: ${why}`);
    if (created >= REASONS_SINCE && then?.includes("export const REASONS_SINCE")) {
      const added = differencesAdded(process.cwd()), mend = added === null ? null : reasonsMend(process.env.PR_BODY, added, coreAt(process.cwd()) ?? "core/");
      if (mend) mends.push(mend);
      else console.log(added === null ? `ok   the line "${REASONS}" is not asked here: the change could not be read against its base` : added.length ? `ok   the description says the reasons read for the difference it adds` : `ok   the line "${REASONS}" is not asked here: no line is added under the manifest's "Differences"`);
    } else console.log(`ok   the line "${REASONS}" is not asked here: ${why}`);
    if (created >= YES_SINCE && then?.includes("export const YES_SINCE")) {
      const diff = spawnSync("git", ["diff", "--name-only", "--no-renames", "-z", "HEAD^1", "HEAD"], { encoding: "utf8", maxBuffer: 1 << 26 });
      // (where the core lies is read from the base's manifest, never the head's, which the pull request could bring)
      const at = coreAtBase(process.cwd()), paths = diff.status === 0 && at !== null ? asking(diff.stdout.split("\0").filter(Boolean), at) : null;
      if (paths === null) console.log("ok   the owner's yes is not asked here: the change could not be read against its base");
      else {
        // (a file whose change only follows files the pull request moves asks no yes: path-only.mjs; #886, point 1)
        const follow = paths.length ? proven(process.cwd(), "HEAD^1", "HEAD", paths) : [], left = paths.filter(p => !follow.includes(p));
        if (follow.length) console.log(`ok   the owner's yes is not asked of ${follow.join(", ")}: only paths that follow files the pull request moves`);
        // (nor one the design check states keeps its meaning, at the head's text: meaning-kept.mjs; #886, point 2)
        const kept = statedOf({ cwd: process.cwd(), repo, number: numberOf(process.env.GITHUB_REF), asked: left }), rest = left.filter(p => !kept.includes(p));
        if (kept.length) console.log(`ok   the owner's yes is not asked of ${kept.join(", ")}: the design check states that its meaning is unchanged`);
        const issues = issuesOf(process.env.PR_BODY), got = rest.length && issues.length ? textsOf(repo, issues) : { texts: [], read: true };
        const yes = yesOf({ paths: rest, body: process.env.PR_BODY, ...got });
        if (yes.mend) mends.push(yes.mend); else console.log(`ok   ${yes.note}`);
      }
    } else console.log(`ok   the owner's yes is not asked here: ${why}`);
  }
  for (const mend of mends) console.log(`FAIL ${mend}`);
  process.exit(absent.length || mends.length ? 1 : 0);
}
