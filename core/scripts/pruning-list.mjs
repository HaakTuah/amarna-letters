// The list a pruning prints (split from pruning.mjs, #888; AGENTS.md, "Rules are pruned by their numbers"; #303): pure
// functions over the rules, their numbers, the checks' steps and the record, which read nothing from the host, and the
// proposals file UNHELD. pruning.mjs, beside this file, says what the list holds and exports these.
import fs from "node:fs";
import path from "node:path";
import { NUMBER } from "./outcomes.mjs";
import { DIRECT, UNHELD, ordered } from "./pruning-record.mjs";
import { ROOT } from "./rules.mjs";

export const MARKS = ["check", "case", "move", "goes", "describes"];
export const EARLY = 20;

// The rule files' texts with the rules `keys` taken out, a rule's items with it: { texts: { file: text }, missing },
// from `all` (rules.mjs's rules) and `read(file)`; `missing`, the keys that are no rule as they stand.
export function without(keys, all, read) {
  const texts = {}, missing = [];
  for (const key of keys) {
    const r = all.find(x => x.key === key);
    if (!r) { missing.push(key); continue; }
    texts[r.file] ??= String(read(r.file)).replace(/\r\n/gu, "\n");
    // (a rule inside one already taken out went with it)
    texts[r.file] = texts[r.file].replace(r.text, "").replace(/\n{3,}/gu, "\n\n");
  }
  return { texts, missing };
}

// The steps that run the check `by` (a holder's script, or a workflow, all of whose steps do), each "<workflow>#<its
// name>", from `steps` ({ workflow: [{ name, run }] }).
export const stepsOf = (by, steps) => Object.entries(steps).flatMap(([w, list]) => list.filter(st => (by.startsWith(".github/workflows/") ? w === by : String(st.run ?? "").includes(by))).map(st => `${w}#${st.name}`));

// The checks a rule's holders name (the "holder" of an entry of scripts/holders/), each a script or workflow, or GitHub's setting.
export const checksOf = (key, named) => [named[key] ?? []].flat().map(h => /^check: (.+?)(?:, in part)?$/u.exec(String(h))?.[1]).filter(Boolean);

// A rule's number as a pruning `x` counted it, or null.
const numberAt = (x, key) => (typeof x?.numbers?.[key] === "number" ? x.numbers[key] : null);

// The sign that the number `n` of the rule `key` did not move between the last two prunings of `p`, or null.
function stood(key, n, p) {
  const now = p.at(-1), was = p.at(-2), v = numberAt(now, key);
  return n && v !== null && v === numberAt(was, key) ? `its number did not move (${v}, as at ${was.at})` : null;
}

// The sign that the number `n` of the rule `key`, a stand-in, moved at each of the last two prunings of `p` while the
// direct measures of the outcome it stands for did not; null where they moved, or where the outcome has none. A number
// that is a direct measure's own count (`correction: misread` for "asked") stands in for nothing.
function standIn(key, n, p) {
  const [, what, outcome] = (n && NUMBER.exec(n)) || [], direct = DIRECT.filter(m => m.outcome === outcome);
  if (!direct.length || direct.some(m => what === `correction: ${m.key}`) || p.length < 3) return null;
  const last = p.slice(-3), v = last.map(x => numberAt(x, key)), o = last.map(x => direct.map(m => x.direct?.[m.key]));
  if (v.includes(null) || o.flat().some(x => typeof x !== "number") || v[0] === v[1] || v[1] === v[2] || `${o[0]}` !== `${o[1]}` || `${o[1]}` !== `${o[2]}`) return null;
  return `its number moved at two prunings while its outcome, ${outcome}, did not (${direct.map((m, i) => `${m.key}: ${o[2][i]}`).join(", ")})`;
}

// Whether the rule `r`, with its number `n`, guards against rare and severe harm: one of the floor, or one whose number
// says so.
export const rare = (r, n) => r.file.startsWith("floor/") || / ?; rare harm$/u.test(String(n ?? ""));

// The sign that no step that runs a check of the rule `r` (`checks`) failed on a pull request in the newest pruning's
// span; null where one did, or where a check is run by no step known.
function silent(checks, steps, now) {
  const runs = checks.map(by => stepsOf(by, steps));
  if (!now?.fired || !runs.length || runs.some(x => !x.length) || runs.flat().some(x => now.fired[x])) return null;
  return `its check never fired from ${now.from ?? "the start"} to ${now.at} (${[...new Set(runs.flat())].join("; ")})`;
}

// The signs that a rule may go, from the prunings `p` (oldest first, the newest last), its number `n` (or undefined),
// its checks (scripts or workflows), the workflows' steps, and the staged cases that hold it.
// A rule that guards against rare and severe harm is judged by its staged case alone (point 8): no count of its own,
// which a quiet span leaves standing, lists it.
function signsOf(r, { p, n, checks, steps, cases }) {
  const now = p.at(-1), passed = cases.filter(c => now.without?.[c.name]?.verdict === "pass").map(c => `its staged case ${c.name} passed without it`);
  return [...(rare(r, n) ? [] : [stood(r.key, n, p), standIn(r.key, n, p), silent(checks, steps, now)]), ...passed].filter(Boolean);
}

// The list's closing lines: what was too early or could not be read, the citations "in use", and who decides.
function closing({ all, numbers, now, early, unread }) {
  const cited = Object.entries(now.cited ?? {}).filter(([, k]) => k > 0).sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
  const most = cited.length ? `; the most cited: ${cited.slice(0, 5).map(([k, x]) => `${k} (${x})`).join(", ")}` : "";
  return [
    ...(early.length ? [`- Too early, not judged (merged pull requests since it joined, under ${EARLY}): ${early.join("; ")}.`] : []),
    ...(unread.length ? [`- Not judged, since when it joined could not be read from git: ${unread.join("; ")}.`] : []),
    `- In use: ${cited.length} of ${all.length} rules cited in the span${most}. A citation says a rule is applied, never that it helps.`,
    `- No number named: ${all.filter(r => !numbers[r.key]).length} rules; each names one when it is next added or widened.`,
    "- The owner decides which go, a few at a time, the numbers read again before more go; a rule that goes is kept in the archive with its reason and its last number. No session removes one by its own choice.",
  ];
}

// The proposals for the rules with no holder (UNHELD's "proposals"): { proposals: { key: { mark, by, why, form, noForm } }, wrong },
// `wrong` the line of why a file that is there cannot be read, with its mend; none where there is no file.
export function readUnheld(root = ROOT) {
  const file = path.join(root, UNHELD);
  if (!fs.existsSync(file)) return { proposals: {}, wrong: null };
  try {
    const p = JSON.parse(fs.readFileSync(file, "utf8"))?.proposals;
    if (p && typeof p === "object" && !Array.isArray(p)) return { proposals: p, wrong: null };
    return { proposals: {}, wrong: `\`${UNHELD}\` holds no object "proposals". Mend: write it as an object keyed by each rule's file and bold lead, each value { mark, by, why } and, beside a case, a move or a removal, form or noForm` };
  } catch (e) { return { proposals: {}, wrong: `\`${UNHELD}\` cannot be read (${String(e.message).split("\n")[0]}). Mend: write it as JSON, its "proposals" an object keyed by each rule` }; }
}

// A value of the file as one line of plain text, so that no value can stand as a line of the list of its own.
const flat = v => String(v ?? "").replace(/\s+/gu, " ").trim();

// Beside a proposal, the form a check could hold (AGENTS.md, "A rule is written in the form a check can hold"; #887):
// its "form", a slightly different form of the rule whose breach a check reads without guessing, or its "noForm", why
// none exists. A proposal of a check, which holds the rule as worded, and one that it describes, which binds no one,
// need neither, a check's form printed where one is given, as a rewording a check would hold.
const FORM = `a form of the rule a check could hold (\`form\`), or why none exists (\`noForm\`)`;
const form = x => flat(x.form) ? ` A form a check could hold: ${flat(x.form)}.` : ["check", "describes"].includes(x.mark) ? ""
  : flat(x.noForm) ? ` No form a check could hold: ${flat(x.noForm)}.` : ` No form proposed yet: the session that takes the pruning gives ${FORM}.`;

// The list's leading lines: each rule of `all` whose key `none` (holders.mjs's rules with no holder) names, those
// `starts` or `toolStarts` (the rules of a tool's part, read at the start of that tool's sessions) names first, each with
// its proposal of `proposals`; then the proposals whose rule now has a holder or no
// longer stands.
export function unheldLines({ all, none, starts, toolStarts = new Set(), proposals, numbers = {}, wrong = null }) {
  const first = r => starts.has(r.key) || toolStarts.has(r.key);
  const without = new Set(none), keys = all.filter(r => without.has(r.key)), rest = Object.keys(proposals).filter(k => !without.has(k));
  if (!keys.length && !rest.length) return wrong ? [`- ${wrong}.`] : [];
  const say = r => {
    const x = proposals[r.key], where = starts.has(r.key) ? "read at a role's start" : toolStarts.has(r.key) ? "read at its tool's start" : "read on need";
    const harm = rare(r, numbers[r.key]);
    if (!x || !MARKS.includes(x.mark)) return `- ${r.key}: no holder, ${where}. No proposal yet: the session that takes the pruning gives it one in \`${UNHELD}\`, ${harm ? "a check or staged case that could hold it, since it guards against rare and severe harm" : "a check or staged case that could hold it, a move to a module read on need, or that it goes"}, and ${FORM}.`;
    const warn = !["check", "case"].includes(x.mark) && harm ? " It guards against rare and severe harm, so it is proposed a holder, a check or a staged case, and nothing else." : "";
    return `- ${r.key}: no holder, ${where}. Its proposal: ${x.mark}${x.by ? ` (${flat(x.by)})` : x.mark === "check" || x.mark === "case" ? ", no issue filed yet: the session files one where its upkeep pays, which joins the queue as any check for a rule that stands does" : ""}, ${flat(x.why) || "with no reason given"}.${form(x)}${warn}`;
  };
  return [
    `- No holder: ${keys.length} rule${keys.length === 1 ? "" : "s"} (\`scripts/holders.mjs\`), worst first, each with its proposal (\`${UNHELD}\`). Each check is filed as an issue, which joins the queue without a further word; the moves and removals are the owner's, a few at a time.`,
    ...(wrong ? [`- ${wrong}; until it is, every rule below reads as having no proposal.`] : []),
    ...[...keys.filter(first), ...keys.filter(r => !first(r))].map(say),
    ...(rest.length ? [`- Proposed for a rule that now has a holder or no longer stands, to take out of \`${UNHELD}\`: ${rest.map(flat).join("; ")}.`] : []),
  ];
}

// The list's lines. `all`: the rules (rules.mjs's); `named`: the entries' "holder"; `numbers`: their "number";
// `record`; `cases`: the staged cases ({ name, holds }); `steps`: the workflows' steps, { path: [{ name, run }] };
// `starts`: the keys of the rules a role reads at its start; `joined(r)`: how many merged pull requests came under the rule since it joined, or null;
// `none`: the keys of the rules with no holder (holders.mjs), and `proposals`, UNHELD's, which lead the list, those of
// `toolStarts` sorted with a role's start.
export function list({ all, named, numbers, record, cases, steps, starts, toolStarts = new Set(), joined, none = [], proposals = {}, wrong = null }) {
  const p = ordered(record), now = p.at(-1), first = unheldLines({ all, none, starts, toolStarts, proposals, numbers, wrong });
  if (!now) return [...first, "- No pruning is recorded yet: no other sign to list (`node scripts/pruning.mjs --due`)."];
  const listed = [], early = [], unread = [];
  for (const r of all) {
    const n = numbers[r.key], signs = signsOf(r, { p, n, checks: checksOf(r.key, named), steps, cases: cases.filter(c => c.holds.includes(r.key)) });
    const came = signs.length ? joined(r) : undefined;
    if (came === undefined) continue;
    if (came === null) unread.push(r.key);
    else if (came < EARLY) early.push(`${r.key} (${came})`);
    else {
      const step = starts.has(r.key) ? "1, read at a role's start: it moves first to a module read on need" : "2, read on need: it may go, one moved there only where nothing changed after its move";
      listed.push(`- ${r.key}: ${signs.join("; ")}. Its step of the pruning: ${step}. Its number: ${n ?? "none named"}; cited ${now.cited?.[r.key] ?? 0} times.`);
    }
  }
  return [
    ...first,
    `- Read: the pruning of ${now.at}, against ${p.at(-2)?.at ?? "none before it"}; ${Object.keys(now.without ?? {}).length} staged cases run with their rules taken out; counts from ${now.from ?? "the start"} (\`scripts/pruning.mjs\`).`,
    ...(listed.length ? listed : ["- Nothing listed: no rule shows a sign that it may go."]),
    ...closing({ all, numbers, now, early, unread }),
  ];
}
