// How the scheduled look keeps what it found (look.mjs): in issues it opens, updates, reopens and closes, with the record
// of its last run, or, where issues cannot be read and written, in files of the inbox. Split from look.mjs along what
// each part reads.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { FOLDER } from "./inbox.mjs";
import { timeOf } from "./moment.mjs";
import { TITLES } from "./look-kinds.mjs";

export const BOT = "github-actions[bot]";
export const LABELS = ["queued", "by:look"];
export const RECORD = "The scheduled look's record";
export const OWNERS = "needs-owner";

const labelsFor = owner => (owner ? [OWNERS, ...LABELS.slice(1)] : LABELS);

// The labels an issue the look keeps should carry where its state label is not the one that fits: the others as they
// stand, and needs-owner or queued; null where they fit already, and where a session gave it another state (later,
// on-hold), which the look leaves as it is.
export function relabelled(labels, owner) {
  const [want, drop] = owner ? [OWNERS, LABELS[0]] : [LABELS[0], OWNERS];
  if (labels.includes("later") || labels.includes("on-hold")) return null;
  return labels.includes(want) && !labels.includes(drop) ? null : [...labels.filter(l => l !== drop && l !== want), want];
}

// What reopening an issue the look keeps writes: its body, open, and, since what came back is a task again, its state
// label as its reader says (needs-owner where the issue is the owner's to see, else queued), whatever a session set
// while it stood before (a tripped sign's needs-owner, say); later and on-hold, a session's own, stay.
export const reopening = (issue, body, owner) => {
  const labels = relabelled(issue.labels ?? [], owner === true);
  return { body, state: "open", ...(labels ? { labels } : {}) };
};

// What updating an issue the look keeps writes: its body, and, for a reader that gives `requeue` (a line's key, null
// for none), queued in place of a needs-owner a session set, where the new body holds a line of a list ("- ") whose key
// the old one did not: something new for a session to take up first (a second choice's sign that trips), never a
// number that moved.
export const updating = (issue, body, requeue = null) => {
  const keys = text => new Set(String(text).split("\n").filter(l => l.startsWith("- ")).map(requeue).filter(k => k !== null));
  const before = requeue ? keys(issue.body ?? "") : new Set();
  const fresh = !!requeue && (issue.labels ?? []).includes(OWNERS) && [...keys(body)].some(k => !before.has(k));
  const labels = fresh ? relabelled(issue.labels, false) : null;
  return { body, ...(labels ? { labels } : {}) };
};

function write(method, route, payload) {
  const r = spawnSync("gh", ["api", "-X", method, route, "--input", "-"], { input: JSON.stringify(payload), encoding: "utf8", maxBuffer: 1 << 24 });
  if (r.status !== 0) throw new Error(`GitHub refused ${method} ${route.replace(/^repos\/[^/]+\/[^/]+\//, "")}`);
  return r.stdout ? JSON.parse(r.stdout) : {};
}

// The state label of an issue the look keeps and still holds open, kept to what its reader says of the owner: what
// was done, as lines for the look's summary.
function relabel({ repo, issue, finding, dry }) {
  if (typeof finding.owner !== "boolean" || !issue || finding.what === null || finding.unread) return [];
  const labels = relabelled(issue.labels, finding.owner);
  if (!labels) return [];
  try { if (!dry) write("PUT", `repos/${repo}/issues/${issue.number}/labels`, { labels }); } catch (e) { return [`  ${e.message}`]; }
  return [`${finding.title}: labelled ${finding.owner ? OWNERS : LABELS[0]} (#${issue.number})`];
}

// The time of the last run its record holds, or null.
export const lastRun = body => { const at = /^Last run: (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/m.exec(String(body ?? ""))?.[1]; return timeOf(at) === null ? null : at; };

// What to do with one kind: `finding` its new body or null (nothing stands), `unread` where it could not be read,
// `issue` the one it keeps ({ number, state, body }) or null. Closing never happens on what could not be read.
export function plan(finding, issue, unread = false) {
  if (unread) return "nothing";
  if (finding === null) return issue?.state === "open" ? "close" : "nothing";
  if (!issue) return "open";
  if (issue.state !== "open") return "reopen";
  return issue.body === finding ? "nothing" : "update";
}

// The issues the look keeps, from those labelled by:look: opened by GitHub's job or by the owner's account (a session's
// run), the newest of each title; and in `twins`, the older ones of a title still open, which two runs at once (GitHub's
// job and an orchestrator's) can leave, for the look to close.
export function mine(issues, owner) {
  const by = new Map(), twins = [];
  for (const i of [...issues].sort((a, b) => a.number - b.number)) {
    const login = String(i.user?.login ?? "");
    if (i.pull_request || !(login === BOT || login.toLowerCase() === String(owner).toLowerCase())) continue;
    const was = by.get(i.title);
    if (was?.state === "open") twins.push(was);
    by.set(i.title, { number: i.number, state: i.state, body: i.body ?? "", created_at: i.created_at, labels: (i.labels ?? []).map(l => l.name ?? l) });
  }
  return Object.assign(by, { twins });
}

// An issue's text as the look writes it: what it is, then where it was found and its attribution line.
const SIGNED = `---\n_Generated by [the scheduled look](https://github.com/${CORE}/blob/main/scripts/look.mjs)_\n`;
export const text = (what, carrier) => `${what}\n\nThe task is what the look finds again on the default branch (\`look.mjs --dry\`, and the script named above), not this text.\n\nFound while: the scheduled look (${carrier}).\n\n${SIGNED}`;

// What a finding becomes as a file of the owner's inbox (inbox.mjs's format), where issues cannot be reached.
export const inboxFile = (title, what, carrier) => `State: queued\nBy: look\n\n**What it is**\n${title}. ${what}\n\n**Why it matters**\nThe scheduled look keeps it in place of an issue, since issues cannot be read and written here; it is a task an agent takes alone.\n\nFound while: the scheduled look (${carrier}).\n`;
export const slug = title => `look-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;

// A file of the inbox: written with --inbox (save with --dry), else printed.
function putFile({ toInbox, dry, say }, file, content) {
  if (toInbox && !dry) { fs.mkdirSync(FOLDER, { recursive: true }); fs.writeFileSync(file, content); } else if (!toInbox) say(content);
}

// One finding, where issues cannot be reached: not read, its file gone where nothing stands, or its file.
function inboxFinding(ctx, f) {
  const { toInbox, dry, carrier, say } = ctx;
  const file = path.join(FOLDER, slug(f.title));
  if (f.unread) { say(`- ${f.title}: not read (${f.unread}).`); return; }
  if (f.what === null) {
    if (fs.existsSync(file)) { say(`- ${f.title}: nothing stands; ${file} goes.`); if (toInbox && !dry) fs.rmSync(file); }
    return;
  }
  const content = inboxFile(f.title, f.what, carrier);
  say(`- ${f.title}: ${file}${toInbox && !dry ? " written" : ""}.`);
  putFile(ctx, file, content);
}

// Where issues cannot be read and written: what the look would open goes to the inbox's folder, one file each.
export function toFolder(ctx, reach, findings, { reportTitle, reportFile, monthly }) {
  const { toInbox, dry, carrier, scripts, say } = ctx;
  say(`Issues cannot be read and written here (${reach.why}), so what the scheduled look would open goes to \`${FOLDER}/\`, one file each${toInbox ? "" : ": a session runs `node " + scripts + "/look.mjs --inbox` and commits them in a pull request of its own"}.`);
  for (const f of findings) inboxFinding(ctx, f);
  if (monthly) {
    say(`- ${reportTitle}: ${reportFile}${toInbox && !dry ? " written" : ""}.`);
    const content = inboxFile(reportTitle, monthly, carrier);
    putFile(ctx, reportFile, content);
  }
  say("Its record is kept in an issue, so here no run is recorded and none is said missed: the session that runs it on its wake is the record.");
}

// Closes an issue the look keeps, with a comment that says why.
function closeIssue(repo, number, why) {
  write("POST", `repos/${repo}/issues/${number}/comments`, { body: `From the scheduled look: ${why}\n\n${SIGNED}` });
  write("PATCH", `repos/${repo}/issues/${number}`, { state: "closed", state_reason: "completed" });
}

// What is done with one kind's issue (plan()), said in `did` and, save with --dry, written.
function act({ repo, owner, dry }, did, title, body, issue, unread, { closes = true, labels = LABELS, requeue = null } = {}) {
  const step = plan(body, issue, unread);
  const shown = step === "close" && !closes ? "nothing" : step;
  did.push(`${title}: ${unread ? `not read (${unread})` : shown}${issue ? ` (#${issue.number})` : ""}`);
  if (dry || shown === "nothing") return;
  try {
    // (an owner GitHub will not let be assigned here leaves the issue unassigned, never unopened)
    if (shown === "open") try { write("POST", `repos/${repo}/issues`, { title, body, labels, assignees: owner ? [owner] : [] }); } catch { write("POST", `repos/${repo}/issues`, { title, body, labels }); }
    else if (shown === "update") write("PATCH", `repos/${repo}/issues/${issue.number}`, updating(issue, body, requeue));
    else if (shown === "reopen") write("PATCH", `repos/${repo}/issues/${issue.number}`, reopening(issue, body, labels.includes(OWNERS)));
    else if (shown === "close") closeIssue(repo, issue.number, "nothing of this stands today, so this closes; it opens again if it comes back.");
  } catch (e) { did.push(`  ${e.message}`); }
}

// The record, written last: a closed issue of its own. With the last run, when the look last looked the packages up
// (`looked`) and last read the host (`hostRead`), which steps 600 and 820 read (step-checks-host.mjs).
export const recordBody = ({ at, carrier, looked = null, hostRead = null }) => `The scheduled look's own record (\`core/scripts/look.mjs\`): when it last ran, so that the next run says where one was missed. Nothing to do here; it stays closed.\n\nLast run: ${at} (${carrier}).\n${looked ? `Packages looked up: ${looked}.\n` : ""}${hostRead ? `Host read: ${hostRead}.\n` : ""}`;
function writeRecord(ctx, record, did) {
  const { repo, dry } = ctx;
  const body = recordBody(ctx);
  if (!dry) {
    try {
      if (record) write("PATCH", `repos/${repo}/issues/${record.number}`, { body, state: "closed" });
      else { const made = write("POST", `repos/${repo}/issues`, { title: RECORD, body, labels: ["by:look"] }); if (made.number) write("PATCH", `repos/${repo}/issues/${made.number}`, { state: "closed", state_reason: "completed" }); }
    } catch (e) { did.push(`the record: ${e.message}`); }
  }
}

// Where issues can be read and written: each kind's issue opened, updated, reopened or closed, the state report
// opened, the record written, and what was done said.
export function keepIssues(ctx, kept, record, findings, { reportTitle, monthly }) {
  const { repo, dry, carrier, at, say } = ctx;
  const did = [];
  // (an older twin of an issue it keeps, left by two runs at once, is closed: never a second issue for the same thing)
  for (const t of kept.twins ?? []) {
    did.push(`a second issue of the same thing: closed (#${t.number})`);
    if (!dry) try { closeIssue(repo, t.number, "another issue of the look's holds this same thing, so this one closes."); } catch (e) { did.push(`  ${e.message}`); }
  }
  for (const f of findings) { act(ctx, did, f.title, f.what === null ? null : text(f.what, carrier), kept.get(f.title) ?? null, f.unread, { closes: f.title !== TITLES.missed, labels: labelsFor(f.owner), requeue: f.requeue }); did.push(...relabel({ repo, issue: kept.get(f.title), finding: f, dry })); }
  if (monthly) act(ctx, did, reportTitle, text(monthly, carrier), null, null);
  writeRecord(ctx, record, did);
  say(`The scheduled look in ${repo}, ${at}${dry ? " (dry: nothing written)" : ""}:\n${did.map(d => `- ${d}`).join("\n")}`);
}
