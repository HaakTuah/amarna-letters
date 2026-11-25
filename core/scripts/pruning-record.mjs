// The record of the core's prunings and when one is due (split from pruning.mjs, #888; AGENTS.md, "Rules are pruned by
// their numbers"; #303): the file RECORD and the proposals' file UNHELD, a pruning in progress (open()), whether one is
// due (due(), said()) and the constants the parts share. pruning.mjs, beside this file, says what a pruning is and exports the names it
// exported before the split, those of this file and of the two beside it (pruning-list.mjs, pruning-read.mjs).
import fs from "node:fs";
import path from "node:path";
import { MEASURES } from "./outcomes.mjs";
import { ROOT } from "./rules.mjs";

export const RECORD = "reports/pruning.json", UNHELD = "reports/unheld.json";
export const EVERY = 2;
// The outcomes' direct measures (outcomes.mjs; #302) that a count gives, whose counts a pruning records: a median's
// measure gives only how many cases it read, not its value, so it is left out.
export const DIRECT = MEASURES.filter(m => m.direct && !m.median);
const ABOUT = "The prunings of the core's rules (scripts/pruning.mjs; AGENTS.md, \"Rules are pruned by their numbers\"): each pruning's day, the model of the session that took it, the span its counts read (from its day back to the last pruning's), each rule's number as it counted then (\"numbers\"), the count of each outcome's direct measure (\"direct\") and of each kind of correction (\"corrections\"), the failed steps of the runs on a pull request, by workflow and step (\"fired\"), each rule's citations (\"cited\"), and each staged case's verdict with the rules it holds taken out (\"without\"), and \"recorded\" once its counts are written, which ends it. Written by `node scripts/pruning.mjs --read` and `--record`; committed in a pull request of its own.";

// The record: { prunings: [{ at, model, from, numbers, direct, corrections, fired, cited, without, recorded }] }, oldest
// first, `at` the day a pruning began; `recorded` once --record has written its counts, which ends it.
export function readRecord(root = ROOT) {
  try { const r = JSON.parse(fs.readFileSync(path.join(root, RECORD), "utf8")); return Array.isArray(r.prunings) ? r : { prunings: [] }; } catch { return { prunings: [] }; }
}
export const writeRecord = (record, root = ROOT) => fs.writeFileSync(path.join(root, RECORD), `${JSON.stringify({ about: ABOUT, prunings: record.prunings }, null, 2)}\n`);
export const ordered = record => [...record.prunings].filter(p => /^\d{4}-\d\d-\d\d$/u.test(String(p?.at))).sort((a, b) => a.at.localeCompare(b.at));

// The generation of a model: the first whole number of its id or name ("claude-opus-5-5" gives 5), or null.
export const generation = model => { const m = /\d+/u.exec(String(model ?? "")); return m ? Number(m[0]) : null; };
const monthIndex = month => { const [y, m] = String(month).split("-").map(Number); return y * 12 + m - 1; };
const monthAt = i => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

// Whether a pruning is due in `month` (YYYY-MM): { due, why }. Due while one begun has no counts recorded, where none
// is recorded, where EVERY months have passed since the newest recorded, or where `model` is of a newer generation
// than its.
export function due({ month, record, model = null }) {
  const begun = ordered(record).find(x => !x.recorded), last = ordered(record).filter(x => x.recorded).at(-1);
  if (begun) return { due: true, why: `the pruning begun on ${begun.at} has no counts recorded yet` };
  if (!last) return { due: true, why: "no pruning is recorded yet" };
  const then = last.at.slice(0, 7);
  if (monthIndex(month) - monthIndex(then) >= EVERY) return { due: true, why: `the last pruning was in ${then}, and one is due with every second report` };
  const now = generation(model), was = generation(last.model);
  if (now !== null && was !== null && now > was) return { due: true, why: `the model of this session (${model}) is of a newer generation than the last pruning's (${last.model})` };
  return { due: false, why: `the last pruning was in ${then}; the next is due in ${monthAt(monthIndex(then) + EVERY)}` };
}

// The state report's lines on the pruning, for `month`.
export function said({ month, record = readRecord() }) {
  const d = due({ month, record });
  if (d.due) return [`- Due: ${d.why}. The session that takes this report prunes as the core's \`AGENTS.md\`, "Rules are pruned by their numbers", says: each staged case set with the rules it holds taken out (\`node scripts/pruning.mjs --set <case> <dir>\`), run in a fresh helper and read (\`--read\`), the counts recorded (\`--record --repo <this repository> --model <its model's id>\`), each rule with no holder given its proposal in \`${UNHELD}\`, with a form of it a check could hold or why none exists, and its checks queued worst first, and the list \`node scripts/pruning.mjs\` prints added here as a note, \`${RECORD}\` in a pull request of its own.`];
  return [`- Not due: ${d.why}, or sooner where the session that takes a report runs on a newer generation of model than the last pruning's (\`node scripts/pruning.mjs --due --model <its id>\`).`];
}

// The pruning in progress: the newest whose counts are not yet recorded, made, dated today, where there is none; so a
// pruning whose cases run past midnight stays one.
export function open(record, model, at = new Date().toISOString().slice(0, 10)) {
  let p = ordered(record).filter(x => !x.recorded).at(-1);
  if (!p) { p = { at, model: model ?? "not said" }; record.prunings.push(p); }
  if (model) p.model = model;
  return p;
}
