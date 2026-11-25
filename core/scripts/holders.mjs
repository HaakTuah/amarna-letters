// What holds each rule of the floor and the modules (AGENTS.md, "Every rule says what holds it"; #235, part D), and of
// the core's own AGENTS.md, counted apart (#925): one of three, a check that fails where the rule is broken, a staged
// case (staged.mjs, beside this file), or the scheduled audit. The list is a folder, scripts/holders/, of one file for
// each rule (#750, point 1; #853), read in the order of the files' names and named from the rule's key (entryFile):
// {"rule": its file and bold lead as rules.mjs names it, or a rule file alone for its text outside any rule; "holder":
// one holder or a list of them; "behind": the keys of the core archive's items behind it ("a rule file names no item
// itself": AGENTS.md, "The archive is pointed to from the list"; a number up to 262, or "#N" or "#N.P" for one keyed by
// its issue); "number": "<findings | check fires | correction: <kind>>; outcome: <asked | fast | readable | usable |
// robust>", the count it is meant to lower and the outcome it stands for, which pruning.mjs reads}, each but "rule"
// only where the rule has one. A holder is "check: <the script, test, workflow or hook that fails a pull request or a
// step where the rule is broken, or opens an issue by itself; or GitHub's setting that refuses it>", "audit" (the
// scheduled audit reads it) or "describes" (it only points elsewhere or says what is protected, and binds no one), each
// with ", in part" where it holds some of the rule and the rest has none.
// A rule with no entry has no holder. Each staged case names the rules it holds in its own file. A rule with none is listed, in the core's monthly state report
// (state-report.mjs), until it gains one or goes on the owner's word. A hook (HOOKS) holds no rule alone: one whose
// only holders are hooks is listed with them (tasks/tools.md, "Hooks save time; checks are the guarantee"). It fails where an entry names a rule that no
// longer stands, a check whose file is not there, or a holder in no form it reads; a rule with no holder fails nothing.
// It reads too the archive's items behind each rule ("behind" in an entry; #252): it fails a key that is no rule nor
// rule file, an item's key that names no issue (#744), an item that is not in the archive, a pointer to the archive ("core archive N") written in a rule file
// itself, and the archive's two forms out of step (archive.mjs, beside this file). And the number each rule names
// ("number" in an entry; #303): it fails a key that is no rule, and a number in no form outcomes.mjs's NUMBER reads.
// The list's form, read as the one list the entries make (each part an object, a holder a string or a list of them, a list behind a rule of keys in the
// archive's form, a number a string) is its schema's, scripts/schemas/holders.json, read by ajv (schemas.mjs; #530);
// where ajv is not installed the form goes unchecked, said as a warning, and what holds its form is read as ever.
// The core's own repository alone; its tests workflow runs it on every pull request here, after the core's install.
// In a project, --own reads the project's own rules the same way (#662); that reader is holders-own.mjs, beside this
// file (#888), which this one hands --own to and whose names it exports; what both read a holder and the counts by is in
// holder-form.mjs.
//
//   node scripts/holders.mjs                     the counts, and each wrong entry with its mend
//   node scripts/holders.mjs --list              the counts, and each rule with no holder
//   node core/scripts/holders.mjs --own          from a project's root: its own rules' counts, and each with no holder
//   node core/scripts/holders.mjs --own --write  the same, after writing OWN: each rule it does not name added as "none"
import fs from "node:fs";
import path from "node:path";
import { inStep, items, KEY, LAST_NUMBERED } from "./archive.mjs";
import { FILE, HOOKS, counts, hook, holderOf } from "./holder-form.mjs";
import { OWN, ownHolders, ownMain, ownReport, writeOwn } from "./holders-own.mjs";
import { NUMBER } from "./outcomes.mjs";
import { didNotRun, installed } from "./packages.mjs";
import { FOLDERS, ROOT, rules } from "./rules.mjs";
import { shapeFaults } from "./schemas.mjs";
import { started } from "./started.mjs";
import { CASES } from "./staged.mjs";

// (what a project's own list reads, and the shared pieces, stay importable from here, as they were before the split)
export { FILE, HOOKS, OWN, counts, ownHolders, ownReport, writeOwn };
// The file of a rule's entry in FILE/, named from the rule's key, so that its name is the same wherever it is written
// and two rules never share one: the rule file's name, "--", then the lead, each in lower case with a hyphen for each
// run of anything but letters and digits ("AGENTS.md: A part is asked again" stands in agents-md--a-part-is-asked-again.json).
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
export const entryFile = key => { const i = key.indexOf(": "); return `${i < 0 ? slug(key) : `${slug(key.slice(0, i))}--${slug(key.slice(i + 2))}`}.json`; };
const ENTRY_FIELDS = ["rule", "holder", "behind", "number"];
// What the entries of FILE/ name, merged as the one list they make ({ holders, behind, numbers }, each keyed by the rule),
// and the items behind each rule, or the line of why they cannot be read (reasons.mjs, beside this file, reads it too).
// `faults`: each entry that is no file of its form, with its mend.
export function named(root) {
  const dir = path.join(root, FILE), json = { holders: {}, behind: {}, numbers: {} }, faults = [];
  let files;
  try { files = fs.readdirSync(dir).sort(); }
  catch (e) { return { named: {}, behind: {}, numbers: {}, faults, wrong: `${FILE}/ cannot be read (${e.message}). Mend: write one file for each rule in it, as the ones that stand there are written` }; }
  for (const f of files) {
    const { entry, fault } = entryOf(dir, f);
    if (fault) { faults.push(fault); continue; }
    faults.push(...entryFaults(f, entry));
    for (const [from, to] of [["holder", "holders"], ["behind", "behind"], ["number", "numbers"]]) if (from in entry) json[to][entry.rule] = entry[from];
  }
  return { json, named: json.holders, behind: json.behind, numbers: json.numbers, faults };
}

// The entry the file `f` of FILE/ holds, or the line of why it is none, with its mend.
function entryOf(dir, f) {
  if (!f.endsWith(".json")) return { fault: `${FILE}/${f} is no entry, which is a file of JSON. Mend: move it out of ${FILE}/, or write the rule's entry in a file named ${f.replace(/\.[^.]*$/u, "")}.json` };
  let e;
  try { e = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); }
  catch (x) { return { fault: `${FILE}/${f} cannot be read (${String(x.message).split("\n")[0]}). Mend: write it as JSON, an object with the rule's "rule" and its "holder", "behind" and "number"` }; }
  if (e === null || typeof e !== "object" || Array.isArray(e) || typeof e.rule !== "string" || !e.rule) return { fault: `${FILE}/${f} is no object with a "rule". Mend: write it as {"rule": "<the rule's file and lead>", "holder": ..., "behind": [...], "number": "..."}, each but "rule" only where the rule has one` };
  return { entry: e };
}

// What is wrong with an entry that is one: a part it does not read, a file not named from its rule.
function entryFaults(f, e) {
  const faults = [], extra = Object.keys(e).filter(k => !ENTRY_FIELDS.includes(k));
  if (extra.length) faults.push(`${FILE}/${f} has "${extra.join('", "')}", which an entry does not read. Mend: keep "rule", "holder", "behind" and "number", and take the rest out`);
  if (f !== entryFile(e.rule)) faults.push(`${FILE}/${f} holds the rule "${e.rule}", which stands in ${entryFile(e.rule)}. Mend: rename the file to ${entryFile(e.rule)}, so that two pull requests that add a rule never write the same file`);
  return faults;
}

// (a part of the file as it holds its form, an object, else none: the schema says what it is)
const part = v => (v !== null && typeof v === "object" && !Array.isArray(v) ? v : {});

// The rule files a pointer to the archive may not stand in: the core's AGENTS.md and the files of the floor and the
// modules, as rules.mjs reads them.
export function ruleFilesOf(root) {
  const out = fs.existsSync(path.join(root, "AGENTS.md")) ? ["AGENTS.md"] : [];
  for (const folder of FOLDERS) {
    const dir = path.join(root, folder);
    if (fs.existsSync(dir)) out.push(...fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort().map(f => `${folder}/${f}`));
  }
  return out;
}

// A key in the archive's form, as the schema reads it: a number up to the last numbered item, or "#N" or "#N.P".
const inForm = n => (Number.isInteger(n) && n >= 1 && n <= LAST_NUMBERED) || (typeof n === "string" && KEY.test(n));

// What is wrong with the items behind the rules, each a line with its mend.
function behindWrong(root, behind) {
  const wrong = [], files = ruleFilesOf(root), keys = new Set([...rules(root, { agents: true }).map(r => r.key), ...files]);
  const { reasons } = items(root);
  for (const [key, list] of Object.entries(behind)) {
    if (!keys.has(key)) { wrong.push(`${FILE}/${entryFile(key)} ("behind") names "${key}", which is no rule, nor rule file, as they stand. Mend: write the key as the rule's file and bold lead now read, or the file alone for its text outside any rule, or take it out where the rule has gone`); continue; }
    if (!Array.isArray(list)) continue; // (the schema says it is no list, and a key in no form)
    for (const n of list.filter(n => inForm(n) && !reasons.has(n))) wrong.push(`${FILE}/${entryFile(key)} ("behind"): core archive ${n} is no item of the archive. Mend: name an item that stands in archive/instructions/, or add the item first, keyed by its issue (archive/instructions.md)`);
  }
  for (const f of files) {
    fs.readFileSync(path.join(root, f), "utf8").split(/\r?\n/u).forEach((line, i) => {
      if (/\bcore\s+archive\s+#?\d/iu.test(line) || /\bcore\s+archive\s*$/iu.test(line)) wrong.push(`${f}:${i + 1} points to the archive in the rule's own text ("core archive"). Mend: take the pointer out and add its items to the rule's list under "behind" in ${FILE}`);
    });
  }
  return [...wrong, ...inStep(root)];
}

// What is wrong with the number each rule names ("numbers"), each a line with its mend: keyed as "behind" is, by a
// rule of the floor, the modules or AGENTS.md.
function numbersWrong(root, numbers) {
  const keys = new Set(rules(root, { agents: true }).map(r => r.key)), wrong = [];
  for (const [key, n] of Object.entries(numbers)) {
    if (!keys.has(key)) wrong.push(`${FILE}/${entryFile(key)} ("number") names "${key}", which is no rule as they stand. Mend: write the key as the rule's file and bold lead now read, and rename the file to match, or take it out where the rule has gone`);
    else if (typeof n === "string" && n && !NUMBER.test(n)) wrong.push(`${FILE}/${entryFile(key)} ("number"): "${n}" is in no form it reads. Mend: write "<findings | check fires | correction: <kind>>; outcome: <asked | fast | readable | usable | robust>", the count the rule is meant to lower and the outcome it stands for, with "; rare harm" at its end where the rule guards against rare and severe harm`);
  }
  return wrong;
}

// The rules whose entries would stand in one file, each set a line with its mend.
function sharedFiles(all) {
  const files = new Map();
  for (const r of all) files.set(entryFile(r.key), [...(files.get(entryFile(r.key)) ?? []), r.key]);
  return [...files].filter(([, ks]) => ks.length > 1).map(([f, ks]) => `${FILE}/${f} would be the entry of ${ks.map(k => `"${k}"`).join(" and ")}. Mend: reword the lead of one of them so that their file names differ`);
}

// Each rule of the floor and the modules with its holders ([{ kind, by, part }]), and what is wrong with the entries,
// each a line with its mend; `own`, the core's own rules, those of its AGENTS.md, the same way ({ rules, by }), counted
// apart (#925).
export function holders(root = ROOT, cases = CASES) {
  const every = rules(root, { agents: true }), all = every.filter(r => r.file !== "AGENTS.md"), mine = every.filter(r => r.file === "AGENTS.md");
  const read = named(root), wrong = read.wrong ? [read.wrong] : [...read.faults];
  if (!read.wrong) wrong.push(...(shapeFaults("holders", read.json, "", FILE) ?? []));
  const by = new Map(all.map(r => [r.key, []])), ownBy = new Map(mine.map(r => [r.key, []])), mapOf = key => by.get(key) ?? ownBy.get(key);
  for (const [key, value] of Object.entries(read.named)) {
    if (!mapOf(key)) { wrong.push(`${FILE}/${entryFile(key)} names "${key}", which is no rule of the floor, the modules or AGENTS.md as they stand. Mend: write the key as the rule's file and bold lead now read ("floor/security.md: 1. Nothing secret in the repository"), or take it out where the rule has gone`); continue; }
    for (const h of (Array.isArray(value) ? value : [value]).map(v => holderOf(key, v, root))) {
      if (typeof h === "string") wrong.push(h); else if (h) mapOf(key).push(h);
    }
  }
  for (const c of cases) for (const key of c.holds) mapOf(key)?.push({ kind: "case", by: c.name, part: c.inPart.includes(key) });
  wrong.push(...sharedFiles(every));
  if (!read.wrong) wrong.push(...behindWrong(root, read.behind), ...numbersWrong(root, read.numbers));
  return { rules: all, by, wrong, own: { rules: mine, by: ownBy } };
}

// The lines the state report carries.
export function report(root = ROOT) {
  const h = holders(root), c = counts(h);
  return [
    `- Of ${c.all} rules of the floor and the modules: ${c.check} held whole by a check, ${c.case} by a staged case, ${c.audit} by the audit, ${c.part} in part; ${c.describes} describe and bind no one; ${c.none.length} have no holder${c.hooked.length ? `, ${c.hooked.length} of them held by a hook alone, which a session of another tool never runs` : ""} (\`scripts/holders.mjs\`).`,
    coreShare(c, counts(h.own)),
    ...(c.none.length ? [`- No holder, each until it gains one or goes on the owner's word: ${c.none.join("; ")}.`] : []),
  ];
}

// The core's share (#459, point 3), as a project's report gives its own: the rules held whole by a check, of the floor
// and the modules (`c`) and of the core's own, those of its AGENTS.md (`own`; #925), each as counts() gives them.
const coreShare = (c, own) => `- rules held by a check: the floor's and the modules' ${c.check} of ${c.all}; the core's own ${own.check} of ${own.all}, those of \`AGENTS.md\`.`;

// Of the core's rules a project takes (the floor's always, a module's unless its manifest leaves it out: `out`, by the
// file's name), how many a check holds whole there, by the core's own list: { held, all }, none counted whose every
// check read nothing there (`nothing`, the scripts read-nothing.mjs names, by their path in the core, scripts/shape.mjs;
// #459, point 3). A check the core's list names that a project may not have set up (a ruleset of the host's) counts as
// the list names it: the count is the core's map less what read nothing, as AGENTS.md's "The share a check holds is
// reported" says.
export function heldThere(root, nothing, out = new Set()) {
  const h = holders(root), gone = new Set(nothing);
  const taken = h.rules.filter(r => r.file.startsWith("floor/") || !out.has(path.posix.basename(r.file)));
  const held = taken.filter(r => (h.by.get(r.key) ?? []).some(x => x.kind === "check" && !x.part && !hook(x) && !gone.has(x.by))).length;
  return { held, all: taken.length };
}

// The line a project's state report carries (state-report.mjs): its own rules a check holds whole, as counts() gives
// them of ownHolders(), and the core's, as heldThere() gives them.
export const shareLine = (own, core) => `- rules held by a check: the project's own ${own.check} of ${own.all}, the core's ${core.held} of ${core.all}.`;

// Where ajv is not installed the file's form went unchecked: said as a warning, and the check goes on.
function unchecked() {
  if (!installed("ajv")) console.log(didNotRun(`The form of ${FILE}/ was not checked`, "ajv"));
}

if (started(import.meta.url) && process.argv.includes("--own")) {
  ownMain();
} else if (started(import.meta.url)) {
  unchecked();
  const h = holders();
  const lines = report().map(l => l.slice(2));
  console.log(process.argv.includes("--list") ? lines.join("\n") : lines[0]);
  for (const w of h.wrong) console.error(`FAIL ${w}`);
  if (h.wrong.length) process.exitCode = 1;
}
