// Who wrote an item and what state it is in, and how an agent's comment opens (roles/shared/inbox.md, "Labels and openers say
// who wrote what"; core archive 217): the list is labels.json, beside this file, its shape held by its schema
// (schemas/labels.json, which the labels test reads; #530). Run from a project's root, it asks
// GitHub, through gh, for the repository origin names, and reports, each with its mend, worded so an agent acts on it
// alone with no rule file open:
//   - the labels of the list the repository lacks, or holds in another colour or description;
//   - an open issue without exactly one state label, and one the *owner's account* filed without exactly one sender
//     label (another account's issue needs none: GitHub shows its login);
//   - from the day the project's copy gained this file (never before SINCE; --since moves it), an issue an agent filed (the owner's account, with an agent's attribution line)
//     without its "Found while:" line; an agent's comment on an open issue or pull request that opens with no line of
//     the list; and, in an item of the owner's voice (by:owner, by:chat, by:design), a heading that names a view and is
//     not "The session's view (not a decision)";
//   - an open issue labelled `correction` that the owner's account filed without the lines that name the pull request
//     it corrects and its kind, in its body or a note of that account (outcomes.mjs, beside this file, counts them);
//   - a queued issue whose newest verdict is the stand-in's sure yes, with no note in the owner's voice after it,
//     that lacks the mark `stand-in-yes`, and one that keeps the mark after such a note (save in the core's own
//     repository, where no verdict queues an issue);
//   - a queued issue with SEVERAL notes in the owner's voice newer than its current text (its description, or its
//     newest note from the owner's account that says "This is the issue's current text.", as last edited, or that
//     says the description above was updated in the same step and is the issue's current text).
// It reads only and fails nothing (exit 0), save where it is not run from a repository's root or is given a wrong
// option; where gh gives no answer, nothing is asked, and it says so. With --make it makes the labels the repository
// lacks and sets those of the list to its colour and description, naming what each was, touching no other label and no issue. The owner's
// account: --owner, else the manifest's *owner's account*, else the repository's own account. Run at each sync
// (sync.mjs) and on the scheduled look. gh and Node's own modules.
//
//   node core/scripts/labels.mjs [--make] [--owner login] [--since 2026-11-16T00:00:00Z]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { seen } from "./guards.mjs";
import { repoOf } from "./inbox.mjs";
import { KINDS, LABEL, kindOf } from "./outcomes.mjs";
import { broughtBy } from "./review-record.mjs";
import { timeOf } from "./moment.mjs";
import { ownerOf } from "./releases.mjs";
import { VERDICT, byAgent, verdict } from "./stand-in-record.mjs";
import { started } from "./started.mjs";

export const LIST = JSON.parse(fs.readFileSync(new URL("./labels.json", import.meta.url), "utf8"));
export const STATES = Object.keys(LIST.state), SENDERS = Object.keys(LIST.sender);
const OWN_VOICE = ["by:owner", "by:chat", "by:design"];
// Items and comments before the rule came stand as they were written: those before the day the project's copy gained
// this file, and never before SINCE. Labels are read on every open issue.
export const SINCE = "2026-11-16T00:00:00Z";
export const cameOn = dates => [SINCE, ...String(dates ?? "").split("\n").map(d => d.trim()).filter(d => timeOf(d) !== null).map(d => new Date(timeOf(d)).toISOString().replace(/\.\d{3}Z$/, "Z"))].sort().at(-1);
// "Several" notes newer than an issue's current text: the issue's own count (#244, part F) was three to six.
export const SEVERAL = 3;

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// (each read line by line, trimmed, with no pattern that backtracks: a body of any shape takes time in step with its length)
const lines = body => String(body ?? "").split("\n").map(l => l.trim());
export { byAgent };
const first = body => String(body ?? "").split("\n").find(l => l.trim()) ?? "";
const OPENER = new RegExp(`^(?:${LIST.openers.map(esc).join("|")})(?:, on #\\d+)?:`);
// Whether a comment opens with a line of the list: an opener (with the task, ", on #241", where there is one), the
// stand-in's verdict line that stand-in-record.mjs reads, or a call to a reviewer's app ("@codex review",
// "@codex security review").
export const opens = body => { const line = first(body).trim(); return OPENER.test(line) || /^@[\w-]+ (?:security )?review\b/.test(line) || (!line.startsWith(">") && VERDICT.test(line)); };
// Whether an agent's issue says "Found while:", as its reader sees it: never in an HTML comment or a fenced block of code.
export const found = body => lines(seen(body)).some(l => l.startsWith(LIST.headings.found) || l.startsWith(`**${LIST.headings.found}`));
// The headings of a text: a Markdown heading, or a line wholly in bold.
const heading = l => {
  const hashes = l.length - l.replace(/^#+/, "").length;
  if (hashes >= 1 && hashes <= 6 && /\s/.test(l[hashes] ?? "")) { let end = l.length; while (end > hashes && l[end - 1] === "#") end--; return l.slice(hashes, end).trim(); }
  const inner = l.startsWith("**") ? (l.endsWith("**:") ? l.slice(2, -3) : l.endsWith("**") ? l.slice(2, -2) : null) : null;
  return inner && !inner.includes("*") ? inner.trim() : null;
};
const headings = body => lines(body).map(heading).filter(Boolean);
export const strayViews = body => headings(body).filter(h => /\bviews?\b/i.test(h) && h !== LIST.headings.view);
const ownVoiceNote = body => !byAgent(body) || /^From (?:a chat session with the owner|the owner's design session)\b/.test(first(body).trim());

// The labels to make or set: those of the list the repository (`have`: [{ name, color, description }]) lacks or holds
// otherwise. Names are compared as GitHub does, ignoring case.
export function toMake(have) {
  // (a list that is none, and an entry that is no label, are read as no labels: GitHub's answer shapes them)
  const by = new Map((Array.isArray(have) ? have : []).filter(l => l && typeof l === "object" && typeof l.name === "string").map(l => [l.name.toLowerCase(), l]));
  return Object.entries({ ...LIST.state, ...LIST.sender, ...LIST.mark }).flatMap(([name, want]) => {
    const l = by.get(name.toLowerCase());
    if (!l) return [{ name, ...want, how: "make" }];
    return String(l.color).toLowerCase() !== want.color || (l.description ?? "") !== want.description || l.name !== name ? [{ name, ...want, how: "set", was: l.name }] : [];
  });
}

// The corrections to mend, as check gives them: each open issue labelled `correction` that the owner's account filed
// (`mine`) and that lacks, in its body and that account's notes on it, the line naming the pull request it corrects, or
// its kind where it is no bug.
function unmarked(issues, comments, mine, names) {
  const lacks = i => {
    const texts = [i.body, ...comments.filter(c => c.issue === i.number && mine(c.user)).map(c => c.body)];
    return !texts.some(t => broughtBy(t) !== null) || (!names(i).includes("bug") && !texts.some(t => kindOf(t)));
  };
  const items = issues.filter(i => mine(i.user) && names(i).includes(LABEL) && lacks(i)).map(i => `#${i.number}`);
  return items.length ? [{ what: `On each open issue labelled ${LABEL} (core/roles/shared/inbox.md, "A correction is marked"), the lines that name what it corrects, "Brought in by: #<the merged pull request>", and its kind, "Correction: " and one of ${KINDS.join(", ")} (a bug's kind is does not work where it says none): edit the issue, or add a note of the owner's account that holds them`, items }] : [];
}

// What is to be mended, each { what, items }. `issues`: the open issues, not pull requests, as GitHub gives them;
// `comments`: comments on open issues and pull requests, each with `issue` (its number); `notes`: for each queued
// issue's number, all its comments; `owner`: the owner's account; `have`: the repository's labels.
// `core`: whether this is the core's own repository, where no verdict of the stand-in's queues an issue (the core's
// AGENTS.md, "The queue"), so the mark stand-in-yes is not asked.
export function check({ issues, comments = [], notes = new Map(), owner, have, since = SINCE, core = false }) {
  const mine = u => String(u?.login ?? "").toLowerCase() === String(owner).toLowerCase();
  const names = i => (Array.isArray(i?.labels) ? i.labels : []).map(l => (typeof l === "string" ? l : l?.name)).filter(n => typeof n === "string");
  const count = (i, list) => names(i).filter(n => list.includes(n)).length;
  const fresh = at => String(at ?? "") >= since;
  const ctx = { issues, comments, notes, have, mine, names, count, fresh };
  const found = [listedLabels, stateLabels, senderLabels, foundLines, commentOpeners, strayViewItems, ...(core ? [] : [standInMarks]), currentTexts]
    .map(part => part(ctx)).filter(f => f.items.length);
  return [...found, ...unmarked(issues, comments, mine, names)];
}

// (each part of check below reads the same context and gives { what, items }, which check keeps where it has items)
function listedLabels({ have }) {
  const missing = toMake(have ?? []);
  return { what: `The labels of the list (core/scripts/labels.json), made or set to its colour and description: run \`node core/scripts/labels.mjs --make\``, items: missing.map(l => `${l.name} (${l.how === "make" ? "missing" : "otherwise"})`) };
}

function stateLabels({ issues, count }) {
  return { what: `One state label on each open issue, of ${STATES.join(", ")}: the one its last verdict gives it (the stand-in's, core/roles/shared/inbox.md; a bug is queued from its filing; another account's issue needs-owner until the owner's own comment takes it up), the others taken off`,
    items: issues.filter(i => count(i, STATES) !== 1).map(i => `#${i.number}`) };
}

function senderLabels({ issues, mine, count }) {
  return { what: `One sender label on each issue the owner's account filed, of ${SENDERS.join(", ")}: the sender its text names, by:owner only where the owner typed it`,
    items: issues.filter(i => mine(i.user) && count(i, SENDERS) !== 1).map(i => `#${i.number}`) };
}

function foundLines({ issues, mine, fresh }) {
  return { what: `A "${LIST.headings.found}" line in each issue an agent filed, saying the role and the task it was on ("${LIST.headings.found} fixing #241 (a builder session)"): edit the issue to add it`,
    items: issues.filter(i => mine(i.user) && byAgent(i.body) && fresh(i.created_at) && !found(i.body)).map(i => `#${i.number}`) };
}

function commentOpeners({ comments, mine, fresh }) {
  return { what: `An opening line from the list on each agent's comment (${LIST.openers.map(o => `"${o}:"`).join(", ")}, with ", on #<n>" for the task where there is one; the stand-in's verdict line; or a call such as "@codex review"): edit the comment to open with the one that says who wrote it`,
    items: comments.filter(c => mine(c.user) && byAgent(c.body) && fresh(c.created_at) && !opens(c.body)).map(c => c.html_url ?? `#${c.issue}`) };
}

function strayViewItems({ issues, comments, mine, names, fresh }) {
  const voiced = issues.filter(i => names(i).some(n => OWN_VOICE.includes(n)));
  return { what: `A session's view in an item of the owner's voice stands under the heading "${LIST.headings.view}", not under another heading that names a view: edit the heading`,
    items: [...voiced.filter(i => fresh(i.created_at) && strayViews(i.body).length).map(i => `#${i.number}`),
      ...comments.filter(c => voiced.some(i => i.number === c.issue) && mine(c.user) && byAgent(c.body) && fresh(c.created_at) && strayViews(c.body).length).map(c => c.html_url ?? `#${c.issue}`)] };
}

// The notes of an issue's thread that the owner's account wrote, oldest first.
const ownerNotes = (notes, mine, i) => [...(notes.get(i.number) ?? [])].filter(c => mine(c.user)).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

function standInMarks({ issues, notes, mine, names }) {
  // (the stand-in's mark: its newest verdict a sure yes and no note in the owner's voice after it)
  const onYes = i => {
    const all = ownerNotes(notes, mine, i);
    const last = all.findLastIndex(c => verdict(c.body));
    return last >= 0 && verdict(all[last].body).kind === "yes" && verdict(all[last].body).sure === "sure" && !all.slice(last + 1).some(c => ownVoiceNote(c.body));
  };
  const queued = issues.filter(i => names(i).includes("queued") && notes.has(i.number));
  return { what: "The mark stand-in-yes, where the project lets the stand-in's sure yes queue an idea (core/roles/shared/inbox.md), on a queued issue whose newest verdict is that yes with no note in the owner's voice after it; off once the owner's own word confirms or corrects it",
    items: [...queued.filter(i => onYes(i) && !names(i).includes("stand-in-yes")).map(i => `#${i.number} (to mark)`),
      ...issues.filter(i => names(i).includes("stand-in-yes") && notes.has(i.number) && !onYes(i)).map(i => `#${i.number} (to take off)`)] };
}

// A note that says the description is the issue's current text, as a chat session's note writes it when it updates the
// description in the same step ("The description above is updated in the same step and is the issue's current text").
const NAMES_CURRENT = /\bThe description above is updated in the same step and is the issue's current text\b/;

function currentTexts({ issues, notes, mine, names }) {
  return { what: `A current text newer than the notes that change what the issue asks: where ${SEVERAL} or more notes in the owner's voice stand after it, an agent gathers them in a note that says at its top "${LIST.headings.current}", the older notes kept as they are (core/roles/shared/inbox.md)`,
    items: issues.filter(i => names(i).includes("queued") && notes.has(i.number)).filter(i => {
      const all = ownerNotes(notes, mine, i);
      // (the current text counts from its last edit, since a note that changes what the issue asks updates it; a note
      // that says the description is the issue's current text, updated in the same step, dates the description's edit)
      const current = all.filter(c => String(c.body ?? "").includes(LIST.headings.current) || NAMES_CURRENT.test(String(c.body ?? ""))).at(-1);
      const at = current ? current.updated_at ?? current.created_at : i.created_at;
      return all.filter(c => String(c.created_at) > String(at) && ownVoiceNote(c.body)).length >= SEVERAL;
    }).map(i => `#${i.number}`) };
}

export const report = (found, repo) => found.length
  ? [`The labels and openers in ${repo} (core/scripts/labels.mjs): ${found.length} kind(s) to mend, each a task an agent takes alone; nothing fails or waits on it.`,
    ...found.map(f => `- ${f.what}: ${f.items.join(", ")}.`)].join("\n")
  : `The labels and openers in ${repo}: every label of the list stands, each open issue has its state and sender, and each agent's item and comment since the rule came opens as the list says.`;

// The day the rule came for the copy here, as git's history holds it: the day the copy gained this file (the core's own
// path, or a project's copy), never before SINCE. A shallow clone shows its oldest commits adding every file: an add
// found on one of them is not read, so there the rule's own day holds.
export function sinceHere() {
  const out = (...a) => String(spawnSync("git", a, { encoding: "utf8" }).stdout ?? "").trim();
  let bounds = "";
  try { bounds = fs.readFileSync(out("rev-parse", "--git-path", "shallow"), "utf8"); } catch { /* (not shallow) */ }
  return cameOn(out("log", "--diff-filter=A", "--format=%H %cI", "--", "core/scripts/labels.mjs", "scripts/labels.mjs").split("\n")
    .filter(l => l && !bounds.includes(l.split(" ")[0])).map(l => l.split(" ")[1]).join("\n"));
}

// gh's api, as this check calls it: the output, or an Error with gh's words where it fails.
export const ghApi = (...a) => { const r = spawnSync("gh", ["api", ...a], { encoding: "utf8", maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error(`${r.stderr ?? r.error}`.trim()); return r.stdout; };

// Every row of a list GitHub gives page by page, through `gh` (ghApi's form).
export function pagesOf(route, gh = ghApi) {
  const rows = [];
  for (let page = 1; page <= 500; page++) {
    const got = JSON.parse(gh(`${route}${route.includes("?") ? "&" : "?"}per_page=100&page=${page}`) || "[]");
    if (!Array.isArray(got)) throw new Error(`GitHub gave no list for ${route}`);
    rows.push(...got);
    if (got.length < 100) break;
  }
  return rows;
}

// What the check reads of `repo` through `gh` (ghApi's form), page by page, since a cloud session's gh cannot follow
// pages by itself: the repository's labels (`have`), its open issues, the comments since `since` on its open issues and
// pull requests, and every comment of each queued or marked issue (`notes`). Also read by the scheduled look (look.mjs).
export function gather(repo, since, gh = ghApi) {
  const pages = route => pagesOf(route, gh);
  const have = pages(`repos/${repo}/labels`);
  const open = pages(`repos/${repo}/issues?state=open`);
  const issues = open.filter(i => !i.pull_request);
  const numbers = new Set(open.map(i => i.number));
  const comments = pages(`repos/${repo}/issues/comments?since=${since}`).map(c => ({ ...c, issue: Number(String(c.issue_url).split("/").at(-1)) })).filter(c => numbers.has(c.issue));
  const notes = new Map(issues.filter(i => (i.labels ?? []).some(l => l.name === "queued" || l.name === "stand-in-yes")).map(i => [i.number, pages(`repos/${repo}/issues/${i.number}/comments`)]));
  return { have, issues, comments, notes };
}

const fail = msg => { console.error(`FAIL: ${msg}`); return 1; };

// The wrong option given, as the words of its failure, or null where the options are right.
function optionError(args, at, by, since) {
  if (at >= 0 && !/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d:\d\dZ)?$/.test(since ?? "")) return "--since needs a date after it, as 2026-11-16 or 2026-11-16T00:00:00Z";
  if (by >= 0 && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(args[by + 1] ?? "")) return "--owner needs the owner's account after it";
  return null;
}

// --make, and the daily look's job (look.mjs; #1092): the labels the repository lacks made, those of the list set to its
// colour and description, through `gh` (ghApi's form), each line said by `say`; the names made or set. A write GitHub
// refuses throws, with gh's words, and what was made before it stands.
export function makeLabels(repo, gh = ghApi, say = console.log) {
  const have = pagesOf(`repos/${repo}/labels`, gh);
  const todo = toMake(have);
  // (a label set anew is named with what it was before it is set, so a project that used the name otherwise can
  // restore it, even where a later call fails)
  const was = new Map(have.map(l => [String(l.name).toLowerCase(), l]));
  for (const l of todo) {
    if (l.how === "set") say(`Setting ${l.name}: it was ${l.was}, colour ${was.get(l.name.toLowerCase())?.color}, "${was.get(l.name.toLowerCase())?.description ?? ""}".`);
    if (l.how === "make") gh("-X", "POST", `repos/${repo}/labels`, "-f", `name=${l.name}`, "-f", `color=${l.color}`, "-f", `description=${l.description}`);
    else gh("-X", "PATCH", `repos/${repo}/labels/${encodeURIComponent(l.was)}`, "-f", `new_name=${l.name}`, "-f", `color=${l.color}`, "-f", `description=${l.description}`);
  }
  say(todo.length ? `Made or set in ${repo}: ${todo.map(l => l.name).join(", ")}.` : `Every label of the list stands in ${repo} as it says.`);
  return todo.map(l => l.name);
}

// What is said where gh gave no list: issues switched off, or no answer at all.
function unreadMessage(repo, e) {
  // (gh's own words are not printed: they may name a path of the machine, and this goes into a sync PR's description)
  if (/\bHTTP 410\b/.test(String(e.message))) return `The labels and openers in ${repo} were not read: its issues are switched off, so the inbox's files carry state and sender as two lines (core/scripts/inbox.mjs).`;
  return `The labels and openers in ${repo} could not be read here (gh is not installed, answers for no account, or gave no answer). Run \`node core/scripts/labels.mjs\` where gh answers, or read them with this session's own GitHub tools as core/scripts/labels.json says.`;
}

function main(args) {
  const at = args.indexOf("--since"), by = args.indexOf("--owner"), make = args.includes("--make");
  const since = at >= 0 ? args[at + 1] : sinceHere();
  const bad = optionError(args, at, by, since);
  if (bad) return fail(bad);
  const below = spawnSync("git", ["rev-parse", "--show-prefix"], { encoding: "utf8" });
  if (below.status !== 0 || below.stdout.trim() !== "") return fail("run it from the root of the project's git repository");
  const repo = repoOf(spawnSync("git", ["config", "--get", "remote.origin.url"], { encoding: "utf8" }).stdout);
  if (!repo) { console.log("The labels and openers were not read: the repository's origin is not on github.com, so it has no labels; the inbox's files carry state and sender as two lines (core/scripts/inbox.mjs)."); return 0; }
  let manifest = "";
  try { manifest = fs.readFileSync("core-manifest.md", "utf8"); } catch { /* (the core itself, or no manifest yet) */ }
  const owner = by >= 0 ? args[by + 1] : ownerOf(manifest) ?? repo.split("/")[0];
  const core = !manifest && fs.existsSync("scripts/labels.mjs"); // (the core's own repository: its scripts at the root)
  try {
    if (make) makeLabels(repo);
    else console.log(report(check({ ...gather(repo, since), owner, since, core }), repo));
  } catch (e) {
    console.log(unreadMessage(repo, e));
  }
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
