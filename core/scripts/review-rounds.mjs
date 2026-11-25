// The rounds of review a pull request took (#477), which review-record.mjs, beside this file, prints: each head of the
// pull request a review was asked or posted on is a round, the first among them, and an update from the default branch
// (a merge whose second parent is no commit of the pull request's) counts with the commit before it, as a review of that
// commit stands for it (security-review.mjs, standsFrom). A round found something blocking where a review on it did.
// It is a count, read at the reviews of the core the owner asks for and at the pruning of the rules: nothing fails or
// waits for it. What a comment says (which review it is, the head it names, whether it blocks) review-record.mjs reads;
// this file folds those heads into rounds. Node's own modules.
import { standsFrom } from "./security-review.mjs";

export const LAST = 30, MOST = 5;

// The commit of the pull request's that a SHA names: a whole one, or a short one (seven characters or more) that one
// commit alone starts with; null where none does. `commits`: the pull request's, as GitHub gives them.
export function commitOf(commits, sha) {
  if (typeof sha !== "string" || !/^[0-9a-f]{7,40}$/iu.test(sha)) return null;
  const all = commits.filter(c => typeof c.sha === "string" && c.sha.startsWith(sha.toLowerCase()));
  return all.length === 1 ? all[0].sha : null;
}

// The head at `at` (an ISO time): the commit its committer made last by then, or null where none was made by then. A
// commit is pushed after it is made, so a review asked between the two is read as on that commit: a round of its own
// only where no review is asked or posted on it afterwards.
export function headAt(commits, at) {
  const when = Date.parse(at);
  let head = null, latest = -Infinity;
  for (const c of commits) {
    const made = Date.parse(c.at);
    if (made <= when && made >= latest) { head = c.sha; latest = made; }
  }
  return head;
}

// The rounds of one pull request, from `events` ({ sha, at, blocking }: the commit a review names, else the time it
// was asked or posted) and its commits ({ sha, at, parents: [{ sha }] }): { rounds, blocking }, blocking the rounds in
// which a review found something blocking. An event whose commit cannot be told is left out.
export function roundsOf(events, commits) {
  const by = new Map(), chain = sha => [...standsFrom({ commits: commits.length }, commits, sha)].at(-1);
  for (const e of events) {
    const sha = commitOf(commits, e.sha) ?? (e.at ? headAt(commits, e.at) : null);
    if (!sha) continue;
    const round = chain(sha);
    by.set(round, by.get(round) === true || e.blocking === true);
  }
  return { rounds: by.size, blocking: [...by.values()].filter(Boolean).length };
}

export function median(ns) {
  const s = [...ns].sort((a, b) => a - b), m = s.length >> 1;
  return !s.length ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// The LAST merged before `since` (a day, YYYY-MM-DD), as the last report read them, or null where no day is given.
// `all`: every merge read, as { number, when }, newest first.
const mergedBefore = (all, since) => since ? all.filter(m => Date.parse(m.when) < Date.parse(`${since}T00:00:00Z`)).slice(0, LAST) : null;

// The pull requests whose rounds are counted, by number: those counted (`counted`), the last LAST merged, and, given
// `since`, the LAST merged before it.
export const wanted = (counted, all, since) => new Set([...counted, ...all.slice(0, LAST), ...mergedBefore(all, since) ?? []].map(m => m.number));

const one = (n, r) => `#${n}${r.blocking ? ` (${r.blocking} blocking)` : ""}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The median over `pulls`' rounds where a review was read, and of how many: "median N over M", or why there is none.
function medianOf(pulls, rounds) {
  const read = pulls.map(m => rounds.get(m.number)).filter(r => r && r.rounds > 0).map(r => r.rounds);
  return read.length ? `median ${median(read)} over the ${read.length} on which a review was read` : "no review read";
}

// The lines review-record.mjs prints: `counted` and `all` as wanted() takes them, `rounds` a Map of number to roundsOf's
// answer, or null where the pull request's commits could not be read.
export function roundsLines(counted, all, since, rounds) {
  const read = counted.filter(m => rounds.get(m.number)?.rounds > 0), none = counted.filter(m => rounds.get(m.number)?.rounds === 0);
  const unread = counted.filter(m => !rounds.get(m.number));
  const by = new Map();
  for (const m of read) { const r = rounds.get(m.number); by.set(r.rounds, [...(by.get(r.rounds) ?? []), one(m.number, r)]); }
  const last = all.slice(0, LAST), before = mergedBefore(all, since);
  const most = last.filter(m => rounds.get(m.number)?.rounds > 0).sort((a, b) => rounds.get(b.number).rounds - rounds.get(a.number).rounds).slice(0, MOST) // (stable: of equal rounds, the newest first)
    .map(m => { const r = rounds.get(m.number); return `#${m.number} ${plural(r.rounds, "round")}${r.blocking ? `, ${r.blocking} blocking` : ""}`; });
  return [
    "Rounds of review: each head a review was asked or posted on is one, the first among them, an update from the default branch counted with the commit before it; \"blocking\", the rounds in which a review found something blocking. A count: nothing fails or waits for it.",
    `- of the ${counted.length} pull requests counted: ${medianOf(counted, rounds)}; ${read.filter(m => rounds.get(m.number).blocking).length} with a round that found something blocking.`,
    ...[...by].sort((a, b) => b[0] - a[0]).map(([n, ps]) => `- ${plural(n, "round")}: ${ps.join(", ")}`),
    ...(none.length ? [`- no review asked or posted that the count reads: ${none.map(m => `#${m.number}`).join(", ")}`] : []),
    ...(unread.length ? [`- not read (GitHub gave no commits): ${unread.map(m => `#${m.number}`).join(", ")}`] : []),
    `- the last ${last.length} merged: ${medianOf(last, rounds)}${!before ? "" : before.length ? `; the ${before.length} merged before ${since}, as the last report read them: ${medianOf(before, rounds)}` : `; none merged before ${since} was read`}.`,
    `- the most rounds among them: ${most.length ? most.join("; ") : "none read"}.`,
  ].join("\n");
}
