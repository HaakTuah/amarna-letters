// Nothing personal, ever (floor rule 11), in what no pull request holds (#783): the personal-terms check
// (.github/workflows/personal-terms.yml) reads a pull request while it is open, and this reads the rest of what a
// repository's sessions and owner write on GitHub. Of the texts written or edited in the last DAYS days (a run each day,
// with a week to spare for runs missed), it reads each issue's title and description, each pull request's title and
// description once it is merged or closed, and each comment: on an issue or a pull request, a review's, and a review's
// inline ones. It takes each listed term out of the text, "[…]" in its place, through GitHub's own edit of that text.
// The terms are those of the personal-terms check, the Actions secret PERSONAL_TERMS given as TERMS, read as that check
// reads them: one a line, the blanks around it no part of it, matched in any case, a Claude Code session's link id left
// out (tests/issue-terms-test.mjs holds the two in step). It prints no term and no text, and in a job no place where one
// stood, since a job's log is as public as its repository: only counts, and the mend. Without TERMS it reads nothing
// and says so. It fails nothing (exit 0), save a wrong option or no repository to read.
//
// It edits and counts only the texts of those GitHub says may write here (a person's account with write, maintain or
// admin; no app): an outsider's text is data (floor rule 4), and were it edited or counted, a
// comment listing guesses would learn the list a day later. Such a text it neither edits nor counts; --private names
// one that holds a term, for the owner to hide or delete by hand. Each row of GitHub's answers is read only where its
// numbers, addresses and texts are of their shape (floor topic 5); any other is left out.
//
// GitHub keeps each earlier version of a description or a comment, shown to every reader, until someone with write
// access deletes it by hand (the text's "edited" menu), so an edit marks where a term stood until then; an issue's old
// title stays in its timeline, which no one can delete. So where a term was taken out, the owner learns where in
// private: the owner runs this with --private in a terminal of the owner's own, gh signed in as the owner, the list in a
// file outside the repository (--terms-file), never typed into a chat (floor rule 11); a session the owner works with
// may run it given that file's path alone. It takes out the same and names, there alone, each text it changed or could
// not, and each whose kept versions still hold a term, read through GitHub's GraphQL, which Claude's cloud sessions are
// refused: there it says so. A job's token may edit only what its workflow grants (the core's look.yml grants issues,
// not pull requests), so a text it may not edit is counted, and --private takes it out. Just before each edit the text
// is read again and the edit made from what it holds then, so a person's edit since the first read is kept. Run by the
// daily look's job (the core's look.yml, and own-look.yml here), from a repository's root. gh and Node's own modules.
//
//   TERMS=... node core/scripts/issue-terms.mjs                  what a job runs: counts alone
//   node core/scripts/issue-terms.mjs --private --terms-file F   by the owner, never a job: names them
//   ... --days N                                                 N days back in place of DAYS (a first run: --days 36500)
//   ... --dry                                                    takes nothing out; says what it would
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoOf } from "./inbox.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { writersOf } from "./security-review.mjs";
import { started } from "./started.mjs";

export const DAYS = 8;
export const MARK = "[…]";

// The terms, as the personal-terms check reads its list: one a line, the blanks around each (a carriage return among
// them) no part of it, and no empty one.
export const termsOf = raw => String(raw ?? "").split("\n").map(t => t.trim()).filter(Boolean);

// A Claude Code session's link, of its one shape alone, as the personal-terms check's `link` reads it: its random id
// (the 22 characters of base58 after session_01) is no one's personal information and is not read; a whole link,
// starting a line or after a blank or an opening mark, and ending at a blank, a mark of punctuation or the line's end.
const LINK = /(?<=^|[\s(<\["`])https:\/\/claude\.ai\/code\/session_01([1-9A-HJ-NP-Za-km-z]{22})(?=[\s.,;:!?)>"`/*]|$)/gmu;
const ids = text => [...text.matchAll(LINK)].map(m => { const from = m.index + m[0].length - 22; return [from, from + 22]; });
const escape = t => t.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// Each place a term stands in `text`, as [from, to], leftmost first, the longest term where two start at one place; none
// inside a session's link id.
export function places(text, terms) {
  if (!terms.length || typeof text !== "string" || !text) return [];
  const any = new RegExp([...terms].sort((a, b) => b.length - a.length).map(escape).join("|"), "giu");
  const out = ids(text);
  return [...text.matchAll(any)].map(m => [m.index, m.index + m[0].length]).filter(([a, b]) => !out.some(([c, d]) => a < d && c < b));
}
export const holds = (text, terms) => places(text, terms).length > 0;

// The text with each term taken out, MARK in its place; taken again until none stands, since a cut can join two parts
// into a term.
export function takeOut(text, terms) {
  let now = text;
  for (let round = 0; round < 5; round++) {
    const at = places(now, terms);
    if (!at.length) return now;
    for (const [a, b] of at.reverse()) now = `${now.slice(0, a)}${MARK}${now.slice(b)}`;
  }
  return now;
}

// The shapes a row of GitHub's answers is read in (floor topic 5): an id or a number a whole number above nought, an
// address of this repository's on github.com with no blank or control character, a node id of letters, digits, _ and -,
// a text a string of at most a mebibyte or none. (A node id may be of GitHub's older form, Base64 with its padding.)
const whole = n => Number.isSafeInteger(n) && n > 0;
const anAddress = (v, repo) => typeof v === "string" && v.length <= 500 && v.startsWith(`https://github.com/${repo}/`) && !/[\s\u0000-\u001f\u007f]/u.test(v);
const aNode = v => typeof v === "string" && /^[\w+/=-]{1,100}$/u.test(v);
const aText = v => v === null || (typeof v === "string" && v.length <= 1 << 20);
// Who may write here, of `logins`: by GitHub's answer for each (collaborators/<login>/permission), read as the
// security-review check reads it (writersOf: write, maintain or admin, a person's account); and the account the
// repository's address names, its owner, where a session's proxy refuses that answer (tasks/github-calls.md). An
// author association (MEMBER, COLLABORATOR) proves no right to write, and no app is one: what an app writes can carry
// an outsider's words, Dependabot's the release notes of another publisher, Codex's a fork's pull request it reviews,
// and GitHub's own job those of an issue or comment that started a project's workflow.
const aLogin = v => typeof v === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/u.test(v);
export function writersAmong(repo, logins, gh = ghApi) {
  const rights = [];
  for (const login of new Set(logins.filter(aLogin))) { try { rights.push(JSON.parse(gh(`repos/${repo}/collaborators/${login}/permission`))); } catch {} }
  return new Set([...writersOf(rights), repo.split("/")[0].toLowerCase()]);
}
// Each text marked an outsider's but where its author may write here and is a person; only the authors of texts that
// hold a term are asked about.
export function markOutsiders(all, terms, repo, gh = ghApi) {
  const asked = all.filter(t => !t.bot && Object.values(t.fields).some(v => holds(v, terms))).map(t => t.login);
  const writers = writersAmong(repo, asked, gh);
  for (const t of all) t.outsider = t.bot || !aLogin(t.login) || !writers.has(t.login.toLowerCase());
  return all;
}

// What is read, from GitHub's answers through `gh` (ghApi's form): each text as { kind, url, node, fields, route, method,
// outsider }, where `fields` are its texts by the name GitHub's edit takes, `route` where it is read again and edited,
// and `method` that edit's; a row not of its shape left out.
// One text, where its row is of its shape; else null.
function rowOf(repo, row, kind, fields, route, method = "PATCH") {
  if (!anAddress(row?.html_url, repo) || !aNode(row?.node_id) || !Object.values(fields).every(aText)) return null;
  return { kind, url: row.html_url, node: row.node_id, fields, route, method, login: row?.user?.login, bot: row?.user?.type !== "User", outsider: true };
}

// The reviews' own texts, which GitHub lists by pull request and not by date: every one of each pull request touched in
// the days read, since an edit moves no date GitHub gives of a review.
const reviewsOf = (repo, pulls, pages) => pulls.flatMap(p => pages(`repos/${repo}/pulls/${p.number}/reviews`)
  .filter(r => whole(r?.id))
  .map(r => rowOf(repo, r, "review", { body: r.body ?? null }, `repos/${repo}/pulls/${p.number}/reviews/${r.id}`, "PUT")));

export function texts(repo, since, gh = ghApi) {
  const pages = route => pagesOf(route, gh);
  const touched = pages(`repos/${repo}/issues?state=all&sort=updated&direction=desc&since=${since}`).filter(i => whole(i?.number));
  // (a pull request's own title and description once it is merged or closed: while it is open the personal-terms
  // check reads them)
  const own = touched.filter(i => !i.pull_request || i.state === "closed")
    .map(i => rowOf(repo, i, i.pull_request ? "pull request" : "issue", { title: i.title, body: i.body ?? null }, `repos/${repo}/issues/${i.number}`));
  const notes = pages(`repos/${repo}/issues/comments?since=${since}`).filter(c => whole(c?.id))
    .map(c => rowOf(repo, c, "comment", { body: c.body ?? null }, `repos/${repo}/issues/comments/${c.id}`));
  const inline = pages(`repos/${repo}/pulls/comments?since=${since}`).filter(c => whole(c?.id))
    .map(c => rowOf(repo, c, "review comment", { body: c.body ?? null }, `repos/${repo}/pulls/comments/${c.id}`));
  return [...own, ...notes, ...inline, ...reviewsOf(repo, touched.filter(i => i.pull_request), pages)].filter(Boolean);
}

// GitHub's edit, its text on standard input and never on a command line; refused, false, naming nothing.
export const editGh = (method, route, payload) => spawnSync("gh", ["api", "-X", method, route, "--input", "-"], { input: JSON.stringify(payload), encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }).status === 0;

// The fields of `fields` that hold a term, each with the terms taken out; null where one still holds a term once
// taken out (a term inside MARK), so it is never edited each day again.
export function payloadOf(fields, terms) {
  const payload = {};
  for (const [key, value] of Object.entries(fields)) if (holds(value, terms)) payload[key] = takeOut(value, terms);
  return Object.values(payload).some(v => holds(v, terms)) ? null : payload;
}

// Of each insider's text that holds a term, read again just before its edit and edited from what it holds then; what was
// done, by text. An outsider's is left alone.
export function clean(all, terms, { edit = editGh, dry = false, gh = ghApi } = {}) {
  const changed = [], refused = [];
  for (const t of all) {
    if (t.outsider || !Object.values(t.fields).some(v => holds(v, terms))) continue;
    if (dry) { (payloadOf(t.fields, terms) === null ? refused : changed).push(t); continue; }
    let fresh = null;
    try { fresh = JSON.parse(gh(t.route)); } catch {}
    const now = fresh && Object.fromEntries(Object.keys(t.fields).map(key => [key, fresh[key] ?? null]));
    if (!now || !Object.values(now).every(aText)) { refused.push(t); continue; }
    const payload = payloadOf(now, terms);
    if (payload !== null && !Object.keys(payload).length) continue;
    // (a review's edit takes its body alone, and an issue's what changed)
    if (payload !== null && edit(t.method, t.route, payload)) changed.push(t); else refused.push(t);
  }
  return { changed, refused };
}

// Of `nodes`, those whose earlier versions GitHub keeps hold a term, by GitHub's GraphQL (userContentEdits), fifty a
// call; one that cannot be read, or whose history runs past its first hundred, is counted unread.
export function versions(nodes, terms, gh = ghApi) {
  const held = new Set(), unread = new Set();
  const q = "query($ids:[ID!]!){nodes(ids:$ids){id ...on UserContentEditable{userContentEdits(first:100){pageInfo{hasNextPage}nodes{diff}}}}}";
  for (let i = 0; i < nodes.length; i += 50) {
    const batch = nodes.slice(i, i + 50);
    let got = null;
    try { got = JSON.parse(gh("graphql", "-f", `query=${q}`, ...batch.flatMap(id => ["-f", `ids[]=${id}`]))); } catch {}
    const rows = Array.isArray(got?.data?.nodes) ? got.data.nodes : null;
    if (!rows) { batch.forEach(id => unread.add(id)); continue; }
    // (a node GitHub gives as null, gone since it was listed, is unread by the id asked)
    rows.forEach((row, at) => { if (!row?.id && batch[at]) unread.add(batch[at]); });
    for (const row of rows.filter(r => r?.id)) {
      const edits = row?.userContentEdits?.nodes;
      if (Array.isArray(edits) && edits.some(e => holds(e?.diff, terms))) held.add(row.id);
      // (a history longer than its first page is read as unread, never as clear)
      else if (!Array.isArray(edits) || row?.userContentEdits?.pageInfo?.hasNextPage !== false) { if (row?.id) unread.add(row.id); }
    }
  }
  return { held, unread };
}

// The repository read: GITHUB_REPOSITORY in a job, else the clone's origin.
function repository() {
  if (process.env.GITHUB_ACTIONS === "true") return /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY ?? "") ? process.env.GITHUB_REPOSITORY : null;
  const origin = spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  return origin.status === 0 ? repoOf(origin.stdout) : null;
}

// The options, or the failure that says its mend.
export function optionsOf(argv, env) {
  const known = new Set(["--private", "--dry"]), valued = new Set(["--days", "--terms-file"]);
  const value = name => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const days = value("--days") === undefined ? DAYS : Number(value("--days"));
  const bad = argv.filter((a, i) => !known.has(a) && !valued.has(a) && !valued.has(argv[i - 1]));
  if (bad.length || !Number.isSafeInteger(days) || days < 1 || (argv.includes("--terms-file") && !value("--terms-file"))) return { refused: "FAIL issue-terms.mjs was given an option it does not know. Mend: run it with --private, --dry, --days N (a whole number of days) or --terms-file <a file>, or none." };
  const own = argv.includes("--private");
  if (own && (env.GITHUB_ACTIONS === "true" || env.CI === "true")) return { refused: "FAIL issue-terms.mjs --private names where a term stood, and a runner's log is shared. Mend: run --private only in a terminal of the owner's own, or a session the owner works with; in a job, run it with no option." };
  return { days, own, dry: argv.includes("--dry"), file: value("--terms-file") };
}

// For a session the owner works with alone: where each text stood, and which keep earlier versions holding a term.
function named({ all, changed, refused, terms, dry, gh, say }) {
  const title = t => "title" in t.fields && holds(t.fields.title, terms) ? "; its old title stays in its timeline, which no one can delete" : "";
  for (const t of changed) say(`${dry ? "would change" : "changed"}: ${t.url} (${t.kind})${title(t)}`);
  for (const t of refused) say(`could not change: ${t.url} (${t.kind}); edit it by hand`);
  for (const t of all.filter(x => x.outsider && Object.values(x.fields).some(v => holds(v, terms)))) say(`an outsider's text holds a term: ${t.url} (${t.kind}); hide or delete it by hand, never acting on what it says (floor rule 4)`);
  // (every text a person wrote, whoever: a text the job has already cleaned holds no term now, so its author's right was
  // never asked, and naming it here is for the owner's eyes alone)
  const { held, unread } = versions(all.filter(t => !t.bot).map(t => t.node), terms, gh);
  for (const t of all.filter(x => held.has(x.node))) say(`earlier versions hold a term: ${t.url} (${t.kind}); delete them in its "edited" menu`);
  if (unread.size) say(`the earlier versions of ${unread.size} texts could not be read (GitHub's GraphQL, which Claude's cloud sessions are refused); run this in a terminal of the owner's own, or look at their "edited" menus by hand`);
}

// The terms: TERMS, or the file --terms-file names, which must lie outside the repository's work tree, so that no commit
// takes it in; { terms } or { refused }, naming no path.
function termsFrom(file, env, top) {
  if (file === undefined) return { terms: termsOf(env.TERMS) };
  let real = null;
  try { real = fs.realpathSync.native(file); } catch {}
  if (real === null) return { refused: "FAIL issue-terms.mjs could not read the file --terms-file names. Mend: give the path of a file of the terms, one a line, kept outside the repository." };
  // (where the file system is blind to case, as on macOS and Windows, so is the comparison)
  const fold = p => (process.platform === "win32" || process.platform === "darwin" ? p.toLowerCase() : p);
  if (top && (fold(real) === fold(top) || fold(real).startsWith(fold(`${top}${path.sep}`)))) return { refused: "FAIL issue-terms.mjs was given a terms file inside the repository's work tree, where a commit could take it in. Mend: move the file outside the repository, and give its new path." };
  try { return { terms: termsOf(fs.readFileSync(real, "utf8")) }; } catch { return { refused: "FAIL issue-terms.mjs could not read the file --terms-file names. Mend: give the path of a file of the terms, one a line, kept outside the repository." }; }
}
const workTree = () => { const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }); try { return r.status === 0 ? fs.realpathSync.native(r.stdout.trim()) : null; } catch { return null; } };

// The repository's name as GitHub holds it (its full_name), since the addresses read are held to it exactly: an
// origin written in another case, or before a rename, would leave every row out and the run read as clean. Null where
// GitHub does not say.
function canonical(at, gh) {
  try { const name = JSON.parse(gh(`repos/${at}`))?.full_name; return typeof name === "string" && /^[\w.-]+\/[\w.-]+$/u.test(name) ? name : null; } catch { return null; }
}

// The owner's private run, as the job's mend and its issue word it: a window wide enough to reach the job's edits
// however late it runs.
const privateRun = env => `the owner, in a terminal of the owner's own with gh signed in as the owner, runs \`node ${env.CORE_AT ?? "core/"}scripts/issue-terms.mjs --private --days 36500 --terms-file <a file of the terms, kept outside the repository>\` (a session the owner works with may run it given that path alone; the list is never typed into a chat), which takes out what this could not and names there alone each text whose earlier versions hold a term; the owner deletes those versions by hand (the text's "edited" menu).`;

// The issue that tells the owner the private run is due, since only the owner can delete a kept version (AGENTS.md,
// "Nothing locks a project": what only the owner can do is reported and labelled needs-owner): one, kept open by its
// title among the open issues labelled by:look and needs-owner that this job or the owner opened; its body the
// counts and the run alone, never a text or an address. The job never closes it: the owner, or the session that runs the
// private run for the owner, closes it once that run is made. What was done, as a line.
export const OWED = "Personal terms: the owner's private run is due";
// (one this job or the repository's owner opened, as the look's own issues are found: a template's labels or a triage
// role can put both labels on an outsider's issue)
const opener = (issue, repo) => ["github-actions[bot]", repo.split("/")[0].toLowerCase()].includes(String(issue?.user?.login ?? "").toLowerCase());
export function owe(repo, { changed, refused, carrier = "core/" }, { gh = ghApi, send = editGh } = {}) {
  const body = `This is the issue's current text.\n\nThe daily job took a personal term out of ${changed} texts${refused ? `, and found ${refused} that hold one its token may not edit` : ""} (\`${carrier}scripts/issue-terms.mjs\`). GitHub keeps each earlier version of an edited text, term and all, shown to every reader, and only someone with write access can delete it, by hand.\n\nWhat to do: ${privateRun({ CORE_AT: carrier })} Then close this issue.\n\nFound while: the daily job's take-out of the personal terms.\n`;
  let open = [];
  try { open = pagesOf(`repos/${repo}/issues?state=open&labels=by%3Alook,needs-owner`, gh).filter(i => i?.title === OWED && whole(i?.number) && !i.pull_request && opener(i, repo)); } catch { return "The issue for the owner's private run could not be read, so none was opened or updated."; }
  if (open.length) return send("PATCH", `repos/${repo}/issues/${open[0].number}`, { body }) ? "The issue for the owner's private run is updated." : "The issue for the owner's private run could not be updated.";
  return send("POST", `repos/${repo}/issues`, { title: OWED, body, labels: ["by:look", "needs-owner"] }) ? "An issue for the owner's private run is opened, labelled needs-owner." : "The issue for the owner's private run could not be opened.";
}

// In a job, where it took a term out or could not: the mend, and the issue that tells the owner.
function told({ at, changed, refused, dry, env, gh, edit, say }) {
  if (!changed.length && !refused.length) return;
  say(`GitHub keeps each earlier version of a text edited, shown to every reader. Mend: ${privateRun(env)}`);
  if (!dry) say(owe(at, { changed: changed.length, refused: refused.length, carrier: env.CORE_AT ?? "core/" }, { gh, send: edit }));
}

export function main(argv, { env = process.env, gh = ghApi, edit = editGh, now = new Date(), repo = undefined, say = console.log, top = workTree() } = {}) {
  const options = optionsOf(argv, env);
  if (options.refused) { console.error(options.refused); return 1; }
  const { days, own, dry, file } = options;
  const given = termsFrom(file, env, top);
  if (given.refused) { console.error(given.refused); return 1; }
  const { terms } = given;
  if (!terms.length) { say("Personal terms in issues and comments: no terms are given here (TERMS, the Actions secret PERSONAL_TERMS passed to the daily job, or --terms-file), so nothing was read."); return 0; }
  const origin = repo === undefined ? repository() : repo;
  if (!origin) { console.error("FAIL issue-terms.mjs found no GitHub repository to read here. Mend: run it from a clone whose origin is on GitHub, or in GitHub's job."); return 1; }
  const at = canonical(origin, gh);
  if (!at) { say("Personal terms in issues and comments: GitHub did not say what the repository is named, so nothing was read. Mend: run it again where gh answers for an account that may read the repository."); return 0; }
  const since = new Date(now.getTime() - days * 86400000).toISOString().replace(/\.\d{3}Z$/u, "Z");
  let all;
  try { all = texts(at, since, gh); } catch { say("Personal terms in issues and comments: GitHub's issues and comments could not be read here, so nothing was read. Mend: run it again where gh answers for an account that may read them."); return 0; }
  markOutsiders(all, terms, at, gh);
  const { changed, refused } = clean(all, terms, { edit, dry, gh });
  say(`Personal terms in issues and comments: read ${all.length} texts written or edited in the last ${days} days; ${dry ? "would take a term out of" : "took a term out of"} ${changed.length}${refused.length ? `; ${refused.length} that hold one this account may not edit` : ""}.`);
  if (own) named({ all, changed, refused, terms, dry, gh, say });
  else told({ at, changed, refused, dry, env, gh, edit, say });
  return 0;
}

if (started(import.meta.url)) process.exitCode = main(process.argv.slice(2));
