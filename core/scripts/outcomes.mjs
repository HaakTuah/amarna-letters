// The outcomes and what they cost (#302; core archive 244): the part the monthly state report (state-report.mjs,
// beside this file) leads with, in the core and in every project that takes it. It names the five outcomes the owner
// named and gives under each its direct measure, or says it has none yet, then every other number under the one it
// stands for, and last what the work cost, which stands for none of the five. Each count is given with the range
// chance alone would give (twice its square root), and where a count is under LEAST the months before are added, up to
// MONTHS, and said. No number here is a target (tasks/cleaning.md, "No process number is a builder's goal").
// What it reads, through gh, with no book-keeping by hand:
//   - corrections: an issue labelled `correction`, and a note of the owner's account on one, holding a line
//     "Correction: <kind>" (KINDS) and the line "Brought in by: #N" that the bug form ends with (review-record.mjs
//     reads it), the one way a pull request is named; a bug labelled `correction` with no kind line is of the kind
//     "does not work". Only the owner's account is read (floor rule 4);
//   - merged tasks: the pull requests merged, Dependabot's left out; the time from an issue's first label `queued` to
//     its closing as done, of the LEAST newest so closed; the merges a correction named, or a revert undid, within two
//     weeks; the merges that
//     close a bug or a correction (unplanned mending); a bug's time from its filing to its closing as done, which is
//     when its fix reached the default branch;
//   - cost: the line session-cost.mjs prints, priced as core-cost.mjs prices it, and the tokens carried into each
//     answer (what was read, cache included, for each answer);
//   - of the SAMPLE newest merged tasks: the open hours that lay in a gap of over an hour with no event (a commit, a
//     comment, an event of GitHub's), and the commits after the pull request was ready, by cause: a finding came
//     before it, else a check failed on the commit before it, else neither (measuring again, or the builder's own);
//     a merge of the base, bringing the branch up to date, is counted apart;
//   - how the code grows, from the working folder: the size of the code the shape check reads, its files over SPLIT,
//     and its functions over each mark (dose.mjs reads the check); dropped errors are not measured yet (#309).
// The first reading (#302, point 3) was taken from history for the two months to 15 November 2026, the corrections
// found by reading; it stands in the core's reports/ (FIRST), and each line here says what it read then. This file
// holds the measures and the lines; outcomes-read.mjs, beside it, reads GitHub for them and runs them. Node's own
// modules and git.
import { broughtBy } from "./review-record.mjs";
import { seen } from "./guards.mjs";
import { standing } from "./shape.mjs";
import { isCode } from "./shape-readers.mjs";

export const OUTCOMES = [["asked", "The product does what was asked"], ["fast", "It is fast"], ["readable", "A newcomer can read and change it"],
  ["usable", "A new user can use it"], ["robust", "It does not break"], ["cost", "What the work cost (no outcome: the price of the five)"]];
export const KINDS = ["misread", "looks wrong", "does not work", "rule missing"];
export const LABEL = "correction";
// The number a rule names (AGENTS.md of the core, "Every rule says what holds it"; #303): the count it is meant to
// lower, `findings` (the review findings that name it), `check fires` (the pull requests its check failed) or
// `correction: <kind>`, the one of the five outcomes it stands for, and "; rare harm" where it guards against rare and
// severe harm; held in the "number" of a rule's entry in scripts/holders/ and on a description's line "Number:" (pr-description.mjs), both beside
// this file, in this one form.
export const NUMBER = new RegExp(`^(findings|check fires|correction: (?:${KINDS.join("|")})); outcome: (${OUTCOMES.slice(0, 5).map(([k]) => k).join("|")})(; rare harm)?$`, "u");
export const LEAST = 30, MONTHS = 3, SAMPLE = 60, SPLIT = 20 * 1024, DAYS = 14, HOUR = 3600e3;
export const FIRST = "reports/outcomes-first-reading.json";
export const HEADING = "The outcomes";
// The line of the blind sample's share (blind-sample.mjs, beside this file; #594), which the report gives first.
export const BLIND = "the share of the blind sample approved";
const KIND = /^Correction: (misread|looks wrong|does not work|rule missing)[ \t]*$/u;
export const same = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
const ms = iso => Date.parse(iso);

// The kind a text declares (its last "Correction:" line, as its reader sees it), or null.
export const kindOf = body => seen(body).split("\n").map(l => KIND.exec(l.replaceAll("\r", "").trim())?.[1]).filter(Boolean).at(-1) ?? null;

// The corrections, each { at, pull, kind }: `issues` as GitHub gives them (labels, body, created_at, user), `comments`
// [{ issue, at, login, body }]. Each issue labelled `correction` that the owner's account filed is one, and each note of
// the owner's account on one that declares a kind of its own; the pull request named in it, else in the issue's body,
// else in the newest note of the owner's that names one.
export function corrections(issues, comments, owner) {
  const out = [];
  for (const i of issues) {
    const labels = (i.labels ?? []).map(l => (typeof l === "string" ? l : l.name));
    if (!labels.includes(LABEL) || i.pull_request) continue;
    const notes = comments.filter(c => c.issue === i.number && same(c.login, owner));
    // (the pull request named in the body, else in the newest note of the owner's that names one)
    const pull = broughtBy(i.body) ?? notes.map(c => broughtBy(c.body)).filter(n => n !== null).at(-1) ?? null;
    if (same(i.user?.login, owner)) out.push({ at: i.created_at, pull, kind: kindOf(i.body) ?? (labels.includes("bug") ? "does not work" : null) });
    for (const c of notes) {
      const kind = kindOf(c.body);
      if (kind) out.push({ at: c.at, pull: broughtBy(c.body) ?? pull, kind });
    }
  }
  return out;
}

// A count with the range chance alone gives it.
export const counted = n => `${n} (± ${Math.round(2 * Math.sqrt(n))})`;
export const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "none");
const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : null; };
const hours = h => (h === null ? "none" : h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h / 24 * 10) / 10} days`);
const big = n => Math.round(n).toLocaleString("en-US");
const within = (iso, w) => ms(iso) >= w.from && ms(iso) < w.to;

// Each measure: its outcome, its label, and from the data and a window { from, to } (ms) its count and its value.
// `direct` marks the outcome's direct measure; `median`, one whose count is only how many cases it read.
export const MEASURES = [
  { key: "misread", outcome: "asked", direct: true, label: "corrections that the task was misread, for every ten merged tasks", of: (d, w) => perTen(d, w, ["misread"]) },
  { key: "missing", outcome: "asked", label: "corrections that a rule was missing, for every ten merged tasks", of: (d, w) => perTen(d, w, ["rule missing"]) },
  { key: "queued", outcome: "asked", label: "from joining the queue to merged, the median", of: (d, w) => spanOf(d.queued.filter(q => within(q.done, w)).map(q => (ms(q.done) - ms(q.joined)) / HOUR)) },
  { key: "looks", outcome: "usable", label: "corrections that it looks or feels wrong, for every ten merged tasks", of: (d, w) => perTen(d, w, ["looks wrong"]) },
  { key: "failed", outcome: "robust", direct: true, label: "merges followed within two weeks by a fix or a revert", of: (d, w) => failed(d, w) },
  { key: "live", outcome: "robust", direct: true, median: true, label: "from a bug's report to its fix live, the median", of: (d, w) => spanOf(d.bugs.filter(b => within(b.closed, w)).map(b => (ms(b.closed) - ms(b.at)) / HOUR)) },
  { key: "broke", outcome: "robust", label: "corrections that it does not work, for every ten merged tasks", of: (d, w) => perTen(d, w, ["does not work"]) },
  { key: "mending", outcome: "robust", label: "merged work that was unplanned mending", of: (d, w) => { const t = tasks(d, w), m = t.filter(p => p.mends).length; return { n: m, text: `${counted(m)} of ${t.length}, ${pct(m, t.length)}` }; } },
  { key: "corrected", outcome: "cost", label: "corrections of every kind, for every ten merged tasks", of: (d, w) => perTen(d, w, KINDS) },
  { key: "cost", outcome: "cost", label: "the cost of a merged task, in answers and output tokens, the mean", of: (d, w) => cost(d, w) },
  { key: "uncorrected", outcome: "cost", label: "the cost of a task merged and not corrected after, the mean", of: (d, w) => cost(d, w, true) },
  { key: "carried", outcome: "cost", label: "tokens carried into each answer, the median", of: (d, w) => { const v = tasks(d, w).filter(p => p.took?.answers).map(p => p.took.into / p.took.answers); return { n: v.length, text: v.length ? `${big(median(v))} (of ${v.length} priced)` : "none priced" }; } },
  { key: "idle", outcome: "cost", label: "open hours with no event for over an hour", of: (d, w) => idle(d, w) },
  { key: "rework", outcome: "cost", label: "commits after a pull request was ready, by cause", of: (d, w) => rework(d, w) },
];

const tasks = (d, w) => d.merged.filter(p => within(p.when, w));
function perTen(d, w, kinds) {
  const t = tasks(d, w).length, c = d.corrections.filter(c => kinds.includes(c.kind) && within(c.at, w)).length;
  return { n: c, text: `${counted(c)} of ${t} merged, ${t ? Math.round((1000 * c) / t) / 100 : "none"} for every ten` };
}
const spanOf = v => ({ n: v.length, text: v.length ? `${hours(median(v))} (of ${v.length})` : "none" });
function failed(d, w) {
  const t = tasks(d, w), after = p => x => ms(x) >= ms(p.when) && ms(x) - ms(p.when) <= DAYS * 24 * HOUR;
  const hit = t.filter(p => d.corrections.some(c => c.pull === p.number && after(p)(c.at)) || d.reverts.some(r => r.of === p.number && after(p)(r.when))).length;
  return { n: hit, text: `${counted(hit)} of ${t.length}, ${pct(hit, t.length)}` };
}
function cost(d, w, uncorrected = false) {
  const t = tasks(d, w), p = t.filter(x => x.took);
  if (!p.length) return { n: 0, text: `none priced, of ${t.length}` };
  const sum = k => p.reduce((s, x) => s + x.took[k], 0);
  const n = uncorrected ? p.filter(x => !d.corrections.some(c => c.pull === x.number)).length : p.length;
  return { n, text: n ? `${big(sum("answers") / n)} answers, ${big(sum("out") / n)} output tokens (of ${p.length} priced${uncorrected ? `, ${n} not corrected` : ""})` : `none, every priced task corrected` };
}
function idle(d, w) {
  const s = d.sample.filter(p => within(p.when, w));
  let open = 0, gaps = 0;
  for (const p of s) {
    const t = [p.created, ...p.events, p.when].map(ms).filter(x => x >= ms(p.created) && x <= ms(p.when)).sort((a, b) => a - b);
    open += t.at(-1) - t[0];
    for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] > HOUR) gaps += t[i] - t[i - 1];
  }
  return { n: s.length, text: s.length ? `${pct(gaps, open)} of ${big(open / HOUR)} open hours (of the ${s.length} newest merged)` : "none read" };
}
function rework(d, w) {
  const s = d.sample.filter(p => within(p.when, w)), by = { finding: 0, check: 0, neither: 0, base: 0 };
  for (const p of s) for (const c of p.after ?? []) by[c]++;
  const n = by.finding + by.check + by.neither;
  return { n, text: `${counted(n)} in ${s.length} pull requests: a review finding ${by.finding}, a failed check ${by.check}, neither (measuring again, or the builder's own) ${by.neither}; and ${by.base} bringing the branch up to date` };
}

// The window of `months` months that ends with `month` (YYYY-MM), as { from, to } in ms.
export function windowOf(month, months = 1) {
  const [y, m] = month.split("-").map(Number);
  return { from: Date.UTC(y, m - months, 1), to: Date.UTC(y, m, 1) };
}

// How the code grows, from the shape check's reading (dose.mjs's `reading`) and the code it reads in the working
// folder at `root`, tests left out: its size, its files over SPLIT, its functions over each mark; null where the check
// is not taken or cannot be read.
export function growth(r, root = ".") {
  if (!r) return null;
  const { texts, tests } = standing(r.config, root);
  const sizes = Object.entries(texts).filter(([f]) => isCode(f) && !tests.has(f)).map(([, t]) => Buffer.byteLength(t));
  const marks = { lines: 60, depth: 4, branches: 15, ...(r.config.marks ?? {}) }, over = { lines: 0, depth: 0, branches: 0 };
  for (const e of r.found.entries.values()) if (e.kind === "function") for (const k of Object.keys(over)) if ((e.n?.[k] ?? 0) > marks[k]) over[k]++;
  return { kb: Math.round(sizes.reduce((s, n) => s + n, 0) / 1024), large: sizes.filter(n => n > SPLIT).length, files: sizes.length, over, marks };
}

// The report's lines: `rows` [{ key, outcome, label, text, months }] as `measure` gives them, `grown` as growth gives
// it, `first`: the first reading's texts by key, or null, `previous`: the last report's text, or null, `blind`: the blind
// sample's line (blind-sample.mjs), which follows the five, or null where it was not read.
export function lines({ rows, grown, share = null, first = null, previous = null, blind = null }) {
  const was = label => { const m = previous ? new RegExp(`^ *- ${label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}: ([^\n]*?)\\.(?: At the |$)`, "mu").exec(previous) : null; return m ? ` At the last report: ${m[1]}.` : ""; };
  const line = r => `- ${r.label}: ${r.text}${r.months > 1 ? `, over the last ${r.months} months${r.small ? `, still under ${LEAST}` : ""}` : ""}.${first?.[r.key] ? ` At the first reading: ${first[r.key]}.` : ""}${was(r.label)}`;
  const out = [`The five outcomes the owner named, each led by its direct measure or said to have none yet, then what stands for it; last what the work cost. A count stands with the range chance alone gives it (±), and where it is under ${LEAST} the months before are added. None is a target (\`scripts/outcomes.mjs\`; #302).`];
  for (const [key, name] of OUTCOMES) {
    const mine = rows.filter(r => r.outcome === key);
    out.push(`- **${name}**${mine.some(r => r.direct) || key === "cost" ? "" : ": no direct measure yet"}`);
    for (const r of mine) out.push(`  ${line(r)}`);
    if (key === "readable" && grown) {
      out.push(`  ${line({ key: "size", label: "the code's size", text: `${grown.kb} KB in ${grown.files} files, ${grown.large} of them over ${SPLIT / 1024} KB` })}`);
      out.push(`  ${line({ key: "functions", label: "functions over each mark", text: Object.entries(grown.over).map(([k, n]) => `${n} over ${grown.marks[k]} ${k}`).join(", ") })}`);
    } else if (key === "readable") out.push("  - the code's size: not read (the shape check is not taken here, or could not be read).");
    if (key === "robust") out.push("  - dropped errors: not measured yet (#309).");
    if (key === "cost") out.push(`  - the core's share of merged work: ${share ?? "in the core, all of it; in a project, as its counts for the core below give it"}.`);
  }
  out.push("- **Approved if shown blind** (what the core is for: README.md)", `  ${blind ?? `- ${BLIND}: not read here.`}`);
  out.push(`- The first reading, from history for the two months to 15 November 2026, stands in the core's \`${FIRST}\` and its report beside it.`);
  return out;
}

// The rows for a month: each measure over the month, the months before added while its count is under LEAST, up to
// MONTHS in all.
export function measure(data, month) {
  return MEASURES.map(m => {
    let months = 1, got = m.of(data, windowOf(month));
    while (got.n < LEAST && months < MONTHS) got = m.of(data, windowOf(month, ++months));
    return { key: m.key, outcome: m.outcome, direct: m.direct, label: m.label, text: got.text, months, small: got.n < LEAST };
  });
}


// The words a measure's value is written in, all that outcomesFrom lets through beside numbers and marks.
const WORDS = new Set(("of merged for every ten none h days answers output tokens priced not corrected open hours the newest in pull requests a "
  + "review finding failed check neither measuring again or builder's own and bringing branch up to date kb files them over lines depth branches "
  + "months last still under it read all answered drawn from yet here").split(" "));
const NAMES = new Set([...MEASURES.map(m => m.label), "the code's size", "functions over each mark", BLIND]);
const VALUE = /^[\p{L}\d ±%().,;:'-]{1,300}$/u;

// A project's outcomes, from its state report's text, as one part of the line the core's report carries: each line of
// its own heading whose measure is one of these, and whose value holds numbers, marks and WORDS alone, written anew;
// null where none is in its form. Nothing else of the project's text reaches the core's report.
export function outcomesFrom(text) {
  const part = String(text ?? "").split(`**${HEADING} in `)[1]?.split(/\n\*\*/u)[0] ?? "", out = [];
  for (const l of part.split(/\r?\n/u).slice(1)) {
    const m = /^ {2}- ([^:]{1,120}): (.{1,300}?)\.(?: At the |$)/u.exec(l);
    if (!m || !NAMES.has(m[1]) || !VALUE.test(m[2])) continue;
    if (!(m[2].toLowerCase().match(/\p{L}[\p{L}']*/gu) ?? []).every(w => WORDS.has(w))) continue;
    out.push(`${m[1]} ${m[2]}`);
  }
  const month = /^(\d{4}-\d\d)\*\*/u.exec(part)?.[1];
  return out.length ? `outcomes${month ? ` in ${month}` : ""}: ${out.join("; ")}` : null;
}
