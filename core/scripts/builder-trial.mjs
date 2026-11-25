// The trials of #767 (the core's AGENTS.md, "A bug fix and a rework of tests are built on Sonnet"): of the pull
// requests merged from --since on (by default 18 November 2026), those whose work is a bug fix or a rework of tests, by
// who built them, with what review-record.mjs, beside this file, reads of each. A pull request's
//   kind      is "bug fix" where a line of its description says "Fixes #n" (or Closes, Resolves) of an issue labelled
//             `bug`, else "tests" where more than half of the lines it changes lie under tests/; a line "Trial kind:
//             bug fix", "tests" or "neither" in its description overrides what was read;
//   model     is the one of Sonnet and Opus its description's first line names (a Sonnet builder's says so:
//             tools/claude.md, "Who to call"), else the one of them its session-cost line names alone; else not read;
//   effort    is the one of "at medium" and "at high" its first line names, read with --effort alone (the second trial, Sonnet
//             at medium against Sonnet at high, whose builders' first lines name it), since no record holds it.
// The groups set against each other: Sonnet and Opus, or with --effort Sonnet at medium and Sonnet at high. For each
// kind and group it prints the pull requests and the mean, per pull request, of the findings its reviews raised
// (blocking and other, of review-record.mjs's five; a pull request with a review that ran and whose count was not read
// is left out of it), the blocking ones among them, its rounds of review, the bugs tied to it that reached `main` all
// the same, and what its session-cost line rose by (core-cost.mjs, priced: answers, output and tokens carried in), each
// over the pull requests it could be read for. Then, for each kind, on findings, rounds and bugs alone, whether the
// first group comes out worse than the second: its mean above the other's by more than twice the standard error of
// the difference. The bug fixes' verdicts decided the first trial, since tests were Sonnet's already; in the second,
// each kind's verdicts decide its own lane. Where each trial stands, and the day the second started, the rule says.
// It reads; it writes nothing. Git, gh and Node's own modules.
//
//   node core/scripts/builder-trial.mjs [--since YYYY-MM-DD] [--effort --since YYYY-MM-DD] [--owner login]
import { execFileSync } from "node:child_process";
import { DAY, grid, priced, readings } from "./core-cost.mjs";
import { REVIEWS, bugs, gather, perPull, reviewEvents } from "./review-record.mjs";
import { roundsOf } from "./review-rounds.mjs";
import { started } from "./started.mjs";
import { pages } from "./stand-in-record.mjs";

export const SINCE = "2026-11-18", WANTED = 20;
export const KINDS = ["bug fix", "tests"], BUILDERS = ["Sonnet", "Opus"];
export const GROUPS = { model: ["Sonnet", "Opus"], effort: ["Sonnet at medium", "Sonnet at high"] };
const MEASURES = [["findings", "findings"], ["blocking", "of them blocking"], ["rounds", "rounds"], ["bugs", "bugs that reached main"],
  ["answers", "answers"], ["out", "output tokens"], ["into", "tokens carried in"]];
const DECIDE = ["findings", "rounds", "bugs"]; // (#767, point 3; the cost is given beside them, and decides nothing)

const lines = body => String(body ?? "").replaceAll("\r", "").split("\n");

// The one of `names` that `text` names, or null where it names none or more than one.
const oneOf = (text, names = BUILDERS) => { const said = names.filter(b => new RegExp(`\\b${b}\\b`, "iu").test(text)); return said.length === 1 ? said[0] : null; };

// The blocking points of a pull request's reviews (review-record.mjs's perPull), and all its findings, blocking and
// other: each null where a review that ran was not read for it, since an unknown is never counted as none.
// The reviews counted, each once: review-record.mjs's rows of the posted code review by its stance are of that review,
// so they are left out, and any review added there is counted.
const BY_STANCE = ["postedAdversarial", "postedRegular"];
export const FIVE = REVIEWS.map(([key]) => key).filter(key => !BY_STANCE.includes(key));
export const blockingOf = reviews => FIVE.some(key => reviews[key].blocked === "unread") ? null : FIVE.reduce((s, key) => s + reviews[key].points, 0);
export const findingsOf = reviews => blockingOf(reviews) === null || FIVE.some(key => reviews[key].otherUnread) ? null
  : FIVE.reduce((s, key) => s + reviews[key].points + reviews[key].other, 0);

// The effort a builder's first line names ("on Sonnet at medium"), "medium" or "high", or null.
export const effortOf = body => { const said = [...(lines(body).find(l => l.trim()) ?? "").matchAll(/\bat (medium|high)\b/giu)].map(m => m[1].toLowerCase());
  return new Set(said).size === 1 ? said[0] : null; };

// The group a pull request (with its model and effort) stands in, of GROUPS' `mode`, or null where it stands in none.
export const groupOf = (p, mode) => mode === "effort" ? (p.model === "Sonnet" && p.effort ? `Sonnet at ${p.effort}` : null) : p.model;

// Who built a pull request, from its description: the first line's builder, else the cost line's, else null.
export function builderOf(body) {
  const first = lines(body).find(l => l.trim()) ?? "";
  const cost = lines(body).find(l => l.startsWith("Session so far: "));
  return oneOf(first) ?? (cost ? oneOf(/\(([^)]*)\)/u.exec(cost)?.[1] ?? "") : null);
}

// The kind of a pull request's work, from its description, the issues labelled `bug` (a Set of their numbers) and the
// lines it changes ({ tests, all }): "bug fix", "tests" or null.
export function kindOf(body, bugIssues, changed) {
  const said = lines(body).map(l => /^Trial kind: (bug fix|tests|neither)\s*$/u.exec(l.trim())?.[1]).filter(Boolean).at(-1);
  if (said) return said === "neither" ? null : said;
  const fixes = lines(body).flatMap(l => [...l.matchAll(/\b(?:Fix(?:e[sd])?|Close[sd]?|Resolve[sd]?) #([1-9]\d{0,8})\b/giu)].map(m => Number(m[1])));
  if (fixes.some(n => bugIssues.has(n))) return "bug fix";
  return changed && changed.all > 0 && changed.tests * 2 > changed.all ? "tests" : null;
}

// The lines a merge changes, all and those under tests/, from `git diff --numstat` of its first parent.
export function changedOf(numstat) {
  const out = { tests: 0, all: 0 };
  for (const row of String(numstat).split("\n").filter(Boolean)) {
    const [add, del, file] = row.split("\t");
    if (!/^\d+$/.test(add) || !/^\d+$/.test(del)) continue; // (a binary file has no lines)
    const n = Number(add) + Number(del);
    out.all += n;
    if (file.startsWith("tests/")) out.tests += n;
  }
  return out;
}

const mean = ns => ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null;
const variance = ns => { const m = mean(ns); return ns.length > 1 ? ns.reduce((s, n) => s + (n - m) ** 2, 0) / (ns.length - 1) : null; };

// Whether `sonnet`'s numbers come out worse (higher) than `opus`'s: "worse", by how much, where its mean is above
// Opus's by more than twice the standard error of the difference, "no worse within noise" where not, "too few to
// tell" where either has fewer than two.
export function verdict(sonnet, opus) {
  if (sonnet.length < 2 || opus.length < 2) return "too few to tell";
  const diff = mean(sonnet) - mean(opus), se = Math.sqrt(variance(sonnet) / sonnet.length + variance(opus) / opus.length);
  return diff > 2 * se && diff > 0 ? `worse, by ${diff.toFixed(2)} a pull request` : "no worse within noise";
}

// The printout, from `pulls` as { number, kind, group, findings, blocking, rounds, bugs, answers, out, into } (a measure
// null where it was not read), for GROUPS' `mode`.
export function print(repo, since, pulls, mode = "model") {
  const [first, second] = GROUPS[mode];
  const fmt = n => n === null ? "-" : Number.isInteger(n) ? String(n) : n.toFixed(1);
  const of = (kind, group) => pulls.filter(p => p.kind === kind && p.group === group);
  const values = (ps, key) => ps.map(p => p[key]).filter(v => v !== null);
  // (the twenty the trial waits for: Sonnet's in the first, those of both efforts together in the second)
  const built = pulls.filter(p => mode === "effort" ? p.group !== null : p.group === first), unread = pulls.filter(p => p.group === null);
  const out = [`The ${mode === "effort" ? "second trial of #767, of effort alone" : "trial of #767"} in ${repo}, from ${since}: bug fixes and reworks of tests, by who built them. ${mode === "effort" ? `${first} and ${second.replace(/^Sonnet /u, "")}` : first} built ${built.length} of the ${WANTED} the trial waits for, ${built.filter(p => p.kind === "bug fix").length} of them bug fixes.`,
    "Each a mean per pull request, over those it was read for (how many: in brackets).", ""];
  out.push(grid([["", "pull requests", ...MEASURES.map(([, name]) => name)],
    ...KINDS.flatMap(kind => [first, second].map(group => { const ps = of(kind, group);
      return [`${kind}, ${group}`, String(ps.length), ...MEASURES.map(([key]) => { const v = values(ps, key); return v.length ? `${fmt(mean(v))} (${v.length})` : "-"; })]; }))]));
  out.push("", `${first} against ${second}, kind by kind, on what decides the trial: a measure is worse where ${first}'s mean is above ${second}'s by more than twice the standard error of the difference.`);
  for (const kind of KINDS) out.push(`- ${kind}: ${DECIDE.map(key => `${MEASURES.find(([k]) => k === key)[1]} ${verdict(values(of(kind, first), key), values(of(kind, second), key))}`).join("; ")}`);
  if (unread.length) out.push("", `In neither group (no first line naming ${mode === "effort" ? "Sonnet and one effort" : "Sonnet or Opus, nor a cost line naming one alone"}): ${unread.map(p => `#${p.number}`).join(", ")}`);
  return out.join("\n");
}

// The options given: { mode, since, by }; `fail` is called with what is wrong.
function options(args, fail) {
  const value = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
  const mode = args.includes("--effort") ? "effort" : "model", since = value("--since") ?? (mode === "effort" ? null : SINCE), by = value("--owner");
  if (!DAY.test(since ?? "")) fail(`--since takes a day, YYYY-MM-DD${mode === "effort" ? ", the one the second trial started on" : ""}`);
  if (args.includes("--owner") && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(by ?? "")) fail("--owner needs the owner's account after it");
  return { mode, since, by };
}

// One merged pull request `m` as the trial reads it, or null where it is of neither kind; `read` holds what was read
// for all of them (gather's answer, the descriptions, the costs, the bugs labelled and those tied to each).
function trialRow(m, mode, read) {
  const body = read.bodies.get(m.number) ?? "";
  const kind = kindOf(body, read.bugSet, changedOf(execFileSync("git", ["diff", "--numstat", "--no-renames", `${m.sha}^1`, m.sha], { encoding: "utf8" })));
  if (!kind) return null;
  const reviews = perPull(...read.of(m)), commits = read.commitsOf(m.number), cost = read.took.get(m.number) ?? null;
  return { number: m.number, kind, group: groupOf({ model: builderOf(body), effort: effortOf(body) }, mode),
    findings: findingsOf(reviews), blocking: blockingOf(reviews), rounds: commits ? roundsOf(reviewEvents(...read.of(m)), commits).rounds : null,
    bugs: read.tied.get(m.number) ?? 0, answers: cost?.answers ?? null, out: cost?.out ?? null, into: cost?.into ?? null };
}

function main(args) {
  const fail = msg => { console.error(`FAIL: ${msg}`); process.exit(1); };
  const { mode, since, by } = options(args, fail);
  const g = gather(since, by, fail);
  const rows = pages(`repos/${g.repo}/pulls?state=all&sort=created&direction=desc`, ".[] | [.number, (.head.repo.full_name // \"\"), (.body // \"\")] | @json");
  const read = { ...g, bodies: new Map(rows.map(([number, , body]) => [number, body])), took: priced(readings(rows, g.repo, Math.min(...g.merged.map(m => m.number)))),
    bugSet: new Set(g.labelled.map(b => b.number)), tied: bugs(g.issues, g.issueComments, new Map(g.merged.map(m => [m.number, m])), g.owner).byPull };
  console.log(print(g.repo, since, g.merged.map(m => trialRow(m, mode, read)).filter(Boolean), mode));
}

if (started(import.meta.url)) main(process.argv.slice(2));
