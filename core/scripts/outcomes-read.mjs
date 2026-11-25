// The outcomes' reading (outcomes.mjs, beside this file, holds the measures and says what each reads): what GitHub
// gives of a repository, through gh, page by page, as the measures take it, and the lines the monthly state report
// (state-report.mjs) leads with. Of the SAMPLE newest merged tasks of the span it reads each one's commits, and, for a
// commit after the pull request was ready that no finding came before, the checks of the commit before it. It reads
// only. gh and Node's own modules.
//
//   node scripts/outcomes-read.mjs --repo owner/name --month YYYY-MM     the lines for a month (the state report's)
//   node scripts/outcomes-read.mjs --repo owner/name --from YYYY-MM-DD --to YYYY-MM-DD [--corrections file.json]
//                                       a fixed span, as the first reading took it, the corrections given as
//                                       [{ at, pull, kind }] where they were found by reading, and with
//                                       --root <folder> how the code grows in that checkout
import fs from "node:fs";
import { blockingOf, codexFind, otherOf, postedKind } from "./review-record.mjs";
import { priced, reading as costOf, sessionOf } from "./core-cost.mjs";
import { reading as shapeReading, rulesOf } from "./dose.mjs";
import { parseBounded } from "./guards.mjs";
import { ghApi, pagesOf } from "./labels.mjs";
import { FIRST, LABEL, LEAST, MEASURES, MONTHS, SAMPLE, corrections, growth, lines, measure, same, windowOf } from "./outcomes.mjs";
import { ownerOf } from "./releases.mjs";
import { started } from "./started.mjs";

const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) #(\d{1,9})\b/giu;

// What is read of `repo` from `from` to `to` (ms), through gh, as the measures take it: the pull requests and issues of
// the span, listed, and item by item only what the measures need, so that the calls stay bounded however busy the
// repository is (the look's token has an hourly limit): the notes on each issue labelled `correction`, the events of
// the LEAST newest issues closed as done (for when each joined the queue), and the sample's own reads.
//
// The look's job stops after five minutes, and its token has an hourly limit: a run of `read` spends at most CALLS of
// gh's calls and SECONDS of time (`budget`); the span's two listings must fit in it, or nothing is read, and the
// items one by one are read only while it lasts, each line saying how many it read.
export const CALLS = 150, SECONDS = 90;
export const spending = (gh, budget = { calls: CALLS, ms: SECONDS * 1000 }) => {
  const until = Date.now() + budget.ms;
  let left = budget.calls;
  const spend = (...a) => { if (left <= 0 || Date.now() > until) throw new RangeError("the budget is spent"); left--; return gh(...a); };
  spend.left = () => left > 0 && Date.now() <= until;
  return spend;
};

export function read(repo, from, to, owner = repo.split("/")[0], ghRaw = ghApi, budget = undefined) {
  const gh = spending(ghRaw, budget);
  const iso = new Date(from).toISOString().replace(/\.\d{3}Z$/u, "Z");
  const pulls = [];
  // (newest updated first: a pull request merged in the span was updated in it, however long before it was opened)
  for (let page = 1; page <= 200; page++) {
    const rows = JSON.parse(gh(`repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`) || "[]");
    pulls.push(...rows);
    if (rows.length < 100 || rows.every(p => String(p.updated_at) < iso)) break;
  }
  const issues = pagesOf(`repos/${repo}/issues?state=all&since=${iso}`, gh).filter(i => !i.pull_request);
  const notes = n => pagesOf(`repos/${repo}/issues/${n}/comments`, gh).map(c => ({ issue: n, at: c.created_at, login: c.user?.login, user: c.user, body: c.body ?? "" }));
  const events = n => pagesOf(`repos/${repo}/issues/${n}/events`, gh).map(e => ({ event: e.event, at: e.created_at, number: n, label: e.label?.name ?? null }));
  return gather({ repo, owner, to, pulls, issues, notes, events, gh });
}

const labelsOf = i => (i.labels ?? []).map(l => (typeof l === "string" ? l : l.name));
const newest = (list, key, n = SAMPLE) => [...list].sort((a, b) => String(b[key]).localeCompare(String(a[key]))).slice(0, n);

// The data the measures read, from what GitHub gave: `notes(n)` and `events(n)` read an item's comments and events,
// and `gh` the sample's commits and checks; the sample is the SAMPLE newest merged tasks before `to` (ms), and the
// queue's time is read of the LEAST newest issues closed as done before it.
export function gather({ repo, owner, to = Infinity, pulls, issues, notes = () => [], events = () => [], gh = null }) {
  const labelled = new Map(issues.map(i => [i.number, labelsOf(i)]));
  const { merged, reverts } = merges(repo, pulls, labelled);
  const done = issues.filter(i => i.state === "closed" && i.state_reason === "completed");
  const bugs = done.filter(i => labelled.get(i.number).includes("bug")).map(i => ({ at: i.created_at, closed: i.closed_at }));
  // (item by item while the budget lasts: the corrections' notes first, then the queue's events of the LEAST newest
  // issues closed as done, one call each, then the sample, several each)
  const comments = whileLeft(issues.filter(i => labelled.get(i.number).includes(LABEL)), i => notes(i.number), gh).flat();
  const queued = whileLeft(newest(done.filter(i => Date.parse(i.closed_at) < to), "closed_at", LEAST), i => ({ joined: events(i.number).filter(e => e.event === "labeled" && e.label === "queued").map(e => e.at).sort()[0], done: i.closed_at }), gh).filter(q => q.joined);
  const sample = whileLeft(newest(merged.filter(p => Date.parse(p.when) < to), "when"), p => sampled(p, { repo, owner, gh, notes, events }), gh);
  return { merged, reverts, queued, bugs, sample, corrections: corrections(issues, comments, owner) };
}

// Each of `items` read by `one` while the budget of `gh` (spending's) lasts; an item the budget ran out within is left out.
function whileLeft(items, one, gh) {
  const out = [];
  for (const item of items) {
    if (gh?.left && !gh.left()) break;
    try { out.push(one(item)); } catch (e) { if (e instanceof RangeError) break; throw e; }
  }
  return out;
}

// The merged tasks, Dependabot's left out, each with whether it closes a bug or a correction (`labelled`: each issue's
// label names) and what it was priced at; and the reverts, each with the pull request it undid.
function merges(repo, pulls, labelled) {
  const took = priced(pulls.filter(p => same(p.head?.repo?.full_name, repo)).map(p => ({ number: p.number, session: sessionOf(p.body), reading: costOf(p.body) })));
  const mends = body => [...String(body ?? "").matchAll(CLOSES)].some(m => (labelled.get(Number(m[1])) ?? []).some(l => l === "bug" || l === LABEL));
  const merged = pulls.filter(p => p.merged_at && !same(p.user?.login, "dependabot[bot]")).map(p => ({ number: p.number, when: p.merged_at, created: p.created_at, mends: mends(p.body), took: took.get(p.number) ?? null }));
  const reverts = pulls.filter(p => p.merged_at && /^Revert "/u.test(p.title ?? "")).map(p => ({ when: p.merged_at, of: Number(/\bReverts [\w.-]+\/[\w.-]+#(\d{1,9})\b/u.exec(p.body ?? "")?.[1] ?? NaN) }));
  return { merged, reverts };
}

// One pull request of the sample: its events (its comments, those on its lines, GitHub's events and its commits), and
// each commit after it was ready by cause.
function sampled(p, { repo, owner, gh, notes, events }) {
  const lines = gh ? pagesOf(`repos/${repo}/pulls/${p.number}/comments`, gh).map(c => ({ at: c.created_at, user: c.user, body: c.body ?? "", in_reply_to_id: c.in_reply_to_id ?? null })) : [];
  const mine = [...notes(p.number), ...lines], own = events(p.number);
  const ready = own.filter(e => e.event === "ready_for_review" && e.at <= p.when).map(e => e.at).sort().at(-1) ?? p.created;
  const commits = gh ? pagesOf(`repos/${repo}/pulls/${p.number}/commits`, gh).map(c => ({ sha: c.sha, at: c.commit?.committer?.date, base: (c.parents ?? []).length > 1 })) : [];
  const found = mine.filter(c => codexFind(c) || (same(c.user?.login, owner) && ["security", "code", "design"].includes(postedKind(c.body)) && ((blockingOf(c.body) ?? 0) + (otherOf(c.body) ?? 0)) > 0)).map(c => c.at);
  const after = [];
  commits.forEach((c, i) => {
    if (!(c.at > ready)) return;
    if (c.base) { after.push("base"); return; }
    const before = i ? commits[i - 1] : null, since = before && before.at > ready ? before.at : ready;
    if (found.some(at => at > since && at <= c.at)) after.push("finding");
    else if (before && failedOn(repo, before.sha, gh)) after.push("check");
    else after.push("neither");
  });
  return { ...p, events: [...mine.map(c => c.at), ...own.map(e => e.at), ...commits.map(c => c.at)].filter(Boolean), after };
}
const failedOn = (repo, sha, gh) => { try { return JSON.parse(gh(`repos/${repo}/commits/${sha}/check-runs?per_page=100`)).check_runs?.some(r => r.conclusion === "failure") ?? false; } catch (e) { if (e instanceof RangeError) throw e; return false; } };

// The first reading's texts for `repo`, by key, from the core's own file (a project's copy holds no reports/, and a file
// of a project's is never read for it); null where it holds none for it, or none in its form.
export function firstOf(repo, root = ".") {
  try {
    const got = parseBounded(fs.readFileSync(`${root}/${FIRST}`, "utf8")).repos?.[repo];
    return got && typeof got === "object" ? Object.fromEntries(Object.entries(got).filter(([, v]) => typeof v === "string" && v.length <= 300)) : null;
  } catch { return null; }
}

// The lines for the state report of `repo` for `month`, the owner's account its manifest's (`manifest`; null in the
// core, whose account is its own); one line that says why where GitHub did not answer.
export function report({ repo, month, manifest = null, root = ".", previous = null, share = null, blind = null, gh = ghApi }) {
  let data;
  try { data = read(repo, windowOf(month, MONTHS).from, windowOf(month).to, ownerOf(manifest ?? "") ?? repo.split("/")[0], gh); }
  catch (e) { return [e instanceof RangeError ? `- Not read: the pull requests and issues of the months to ${month} took more than the ${CALLS} calls and ${SECONDS} seconds a run may spend.` : `- Not read: GitHub did not answer for the pull requests, issues and events of ${month} (the look's job needs \`issues: read\` and \`pull-requests: read\`).`]; }
  let grown = null;
  try { grown = growth(shapeReading(rulesOf(manifest, root).rules, root), root); } catch { grown = null; }
  return lines({ rows: measure(data, month), grown, share, first: manifest ? null : firstOf(repo, root), previous, blind });
}

// How the code grows in the project at `root` (its manifest's shape check, or the core's AGENTS.md where it has no
// manifest); null where it cannot be read.
export function grownAt(root) {
  let manifest = null;
  try { manifest = fs.readFileSync(`${root}/core-manifest.md`, "utf8"); } catch { /* the core's own */ }
  try { return growth(shapeReading(rulesOf(manifest, root).rules, root), root); } catch { return null; }
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2), at = f => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
  const repo = at("--repo"), month = at("--month"), from = at("--from"), to = at("--to"), given = at("--corrections"), dir = at("--root");
  const day = /^\d{4}-\d\d-\d\d$/u;
  if (!/^[\w-]+\/(?!\.+$)[\w.-]+$/u.test(repo ?? "") || !(month ? /^\d{4}-(?:0[1-9]|1[0-2])$/u.test(month) : day.test(from ?? "") && day.test(to ?? "")) || (args.includes("--root") && !fs.existsSync(dir ?? ""))) {
    console.error("FAIL: it takes --repo owner/name and either --month YYYY-MM or --from and --to YYYY-MM-DD, and --root only with a folder that stands. Mend: name the repository and the span, as `node scripts/outcomes-read.mjs --repo owner/name --month 2026-10`");
    process.exitCode = 1;
  } else if (month) console.log(report({ repo, month }).join("\n"));
  else {
    const w = { from: Date.parse(`${from}T00:00:00Z`), to: Date.parse(`${to}T00:00:00Z`) };
    const data = read(repo, w.from, w.to, undefined, ghApi, { calls: 20000, ms: 3600e3 }); // (a session's one reading of history, no job's run)
    if (given) data.corrections = JSON.parse(fs.readFileSync(given, "utf8"));
    const rows = MEASURES.map(m => ({ key: m.key, outcome: m.outcome, direct: m.direct, label: m.label, text: m.of(data, w).text, months: 1 }));
    const grown = dir ? grownAt(dir) : null;
    console.log(lines({ rows, grown }).join("\n"));
    console.log(JSON.stringify(Object.fromEntries([...rows.map(r => [r.key, r.text]), ...(grown ? [["size", `${grown.kb} KB in ${grown.files} files, ${grown.large} of them over 20 KB`], ["functions", Object.entries(grown.over).map(([k, n]) => `${n} over ${grown.marks[k]} ${k}`).join(", ")]] : [])])));
  }
}
