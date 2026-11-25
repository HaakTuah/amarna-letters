// The records of the choices that are hard to undo, as every reader of them reads them (tasks/choices.md; core archive
// 222 and 231; split from choices.mjs, #912): where a project keeps them (the *choice records*, a row of the manifest's
// slots or, in the core, a slot of its AGENTS.md; left out, the starter kit's file, KIT), the file or the folder of
// files they are read from, and what a file holds. A record is a heading "## Choice: " and what was chosen, its sign on
// a line that opens "Reopens it:", and, where that sign is a measure a check keeps, a line that opens "Trips when:" with
// each condition in backticks: one of MEASURES, an operator of OPS and a number (`files > 150`); the file's line
// "Read whole:" holds the day of its last pass, in the form 2026-11-15. A record is argued on lines that open ARGUED
// (#515). The records' check a pull request runs is choices-check.mjs, the scheduled look's readers are
// choices-look.mjs, and choices.mjs, beside them, is the script that runs either. Nothing here runs anything a records
// file says, which is no protected file while the look's job holds a token that writes issues (#330). Node's own
// modules.
import fs from "node:fs";
import path from "node:path";

export const KIT = "docs/choices.md";

// The line of a records file that names the folder its records stand in, a file each, read in the order of their names
// (AGENTS.md, "A record pull requests add to is a folder of one file per entry"; #870): the folder is a plain path
// from the project's root.
export const POINTER = /^Its records stand in `([\w][\w.-]*(?:\/[\w][\w.-]*)*)\/`, a file each, read in the order of their names\.$/u;
// The records file's text with each line POINTER reads replaced by the records `partsOf(folder)` gives (their texts), a
// blank line between; a folder a second line names again is read once.
export const wholeOf = (text, partsOf) => { const seen = new Set(); return String(text).split("\n").map(line => { const m = POINTER.exec(line.replace(/\r$/u, "")); if (!m) return line; if (seen.has(m[1])) return ""; seen.add(m[1]); return partsOf(m[1]).join("\n\n"); }).join("\n"); };
const trimmed = text => text.replace(/\r?\n$/u, "");
// The records of one folder, in the order of the files' names: the texts `read(name)` gives of those of `names` that end
// ".md", each without its last line ending (the one place the order and the trim stand, for the disk, a commit and a
// project's files alike).
export const inFolder = (names, read) => names.filter(n => n.endsWith(".md")).sort().map(n => trimmed(String(read(n) ?? "")));

// The path a project's rules name for its *choice records* (the manifest's row, or a line of the core's AGENTS.md that
// gives the slot), else KIT; null where the name is no plain path inside the project.
export function where(rules) {
  const named = /\*choice records\*\s*(?:\|\s*|:\s*)`([^`\n]+)`/u.exec(String(rules ?? ""))?.[1] ?? KIT;
  return /^[\w][\w.-]*(\/[\w][\w.-]*)*$/u.test(named) ? named : null;
}

// (control characters, and those that reorder or hide text, so a name reads as its bytes)
export const plain = text => String(text ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu, " ").trim().slice(0, 120);

// The measures a line "Trips when:" may name, each [what it counts, how it is read from the dose's reading]: numbers
// the shape check reads on every run (shape.mjs, survey()), never a command.
export const MEASURES = {
  files: ["files of code the shape check reads", r => r.found.read.files],
  functions: ["functions it reads", r => r.found.read.functions],
  imports: ["imports it reads", r => r.found.read.imports],
  listed: ["old breaches its baseline lists", r => r.listed],
  debt: ["the share of what it reads that its baseline lists, in percent", r => (r.read > 0 ? 100 * r.listed / r.read : 0)],
  cycles: ["imports that lie on a cycle between files", r => [...r.found.entries.keys()].filter(id => id.startsWith("cycle: ")).length],
  unnamed: ["files of code that lie in no system", r => r.found.read.unnamed],
};
export const OPS = { ">": (a, b) => a > b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, "<=": (a, b) => a <= b };
const CONDITION = /^([a-z]+) *(>=|<=|>|<) *(\d{1,9}(?:\.\d{1,3})?)$/u;
const measured = said => { const m = CONDITION.exec(said); return m && Object.hasOwn(MEASURES, m[1]) ? { measure: m[1], op: m[2], limit: Number(m[3]) } : null; };


// A record's line "Trips when:": the conditions it names that the look reads, and, quoted, what else it holds in
// backticks, or the line itself where it holds none.
function tripsOf(body) {
  const line = /^[ \t]*(?:[-*][ \t]+)?(?:\*\*)?Trips when:(?:\*\*)?(.*)$/mu.exec(body)?.[1];
  if (line === undefined) return { conditions: [], unknown: [] };
  const said = [...line.matchAll(/`([^`\n]*)`/gu)].map(m => m[1].trim());
  if (!said.length) return { conditions: [], unknown: [line.trim()] };
  return { conditions: said.map(measured).filter(Boolean), unknown: said.filter(c => !measured(c)) };
}

// The lines a record is argued on (tasks/choices.md, "A choice that is hard to undo gets a record"; #515): the
// challenger's search for what the list lacks, the pick of a session that never saw the record, and the judge's.
export const ARGUED = ["Looked for:", "The blind pick:", "The judgment:"];
// The line a record of a choice of stack closes with (tasks/choices.md, "A choice of stack ends with what the core cannot
// read in it"; #486, point 1): which of the core's checks cannot yet read the stack picked, each with the issue filed to
// the core for it, or "none". A record is of a stack where its heading names one ("## Choice: the project's stack", as
// the starter kit writes it). The line is its record's last that is not blank, and it names an issue (#12,
// owner/repo#12, or an address under /issues/) or says "none" and nothing more.
export const UNREAD = "The core cannot read:";
export const STACK = /\bstacks?\b/iu;
const closesGaps = body => {
  const last = body.split("\n").filter(l => l.trim()).at(-1) ?? "";
  const said = new RegExp(`${labelled(UNREAD)}(\\S.*)$`, "u").exec(last)?.[1].trim();
  return !!said && (/^["`*]*none["`*]*\.?$/iu.test(said) || /(?:#|\/issues\/)\d+\b/u.test(said));
};
// (the label bold whole, or plain and not followed by the bold's close, then content: an empty bold label is none)
const labelled = label => { const l = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); return `^[ \\t]*(?:[-*][ \\t]+)?(?:\\*\\*${l}\\*\\*|${l}(?!\\*))[ \\t]*`; };
const opens = (body, label) => new RegExp(`${labelled(label)}\\S`, "mu").test(body);

// The heading's end of the record of what a project would be built on today (tasks/choices.md, "What the project would
// be built on today"; #515), whose line "The suggestion:" names the issue filed to the project's owner.
export const TODAY = /judged again as if written today\s*$/u;

// What a records file holds: each record's name (cut to its printed length), whether its whole heading ends as TODAY's
// (`today`), whether it names its sign, the lines of ARGUED it lacks (`lacks`), whether it records a choice already made
// (a line "Stood before:"), the issue its line "The suggestion:" names ("#12", or null), and its line "Trips when:"
// (`conditions`, `unknown`); the day of the last pass (null where the line is missing or holds no day); and how many
// lines are still left to fill in (FILL IN). A record whose heading is still the starter kit's, left to fill in, is no
// record yet, so a new project's file makes no pass due.
export function parse(text) {
  const t = String(text ?? "").replace(/\r\n/gu, "\n");
  const heads = [...t.matchAll(/^## Choice: (.+)$/gmu)];
  const records = heads.map((m, i) => {
    const body = t.slice(m.index + m[0].length, i + 1 < heads.length ? heads[i + 1].index : t.length).split(/^#{1,2} /mu)[0];
    return { name: plain(m[1]), today: TODAY.test(m[1]), sign: opens(body, "Reopens it:"), lacks: ARGUED.filter(label => !opens(body, label)),
      gaps: !STACK.test(m[1]) || closesGaps(body),
      stood: opens(body, "Stood before:"), suggestion: new RegExp(`${labelled("The suggestion:")}(#\\d+)\\b`, "mu").exec(body)?.[1] ?? null, ...tripsOf(body) };
  }).filter(r => !r.name.startsWith("FILL IN:"));
  const read = /^(?:\*\*)?Read whole:(?:\*\*)?[ \t]*(\d{4}-\d\d-\d\d)\b/mu.exec(t)?.[1] ?? null;
  return { records, read: read && Number.isFinite(Date.parse(`${read}T00:00:00Z`)) ? read : null, open: (t.match(/FILL IN:/gu) ?? []).length };
}

// The most a records file is read to: a handful of records a year is a few KB.
export const MOST = 256 * 1024;

// The records of the project at `root`, read from inside it alone: { file, text } (text null where there is no such
// file), or { file, unread } where its name or the file cannot be read so: no link is followed, at the file, at any
// folder on its way or at a folder a line POINTER names, and no file past MOST is read, nor a folder's whole past it.
export function records(rules, root = ".") {
  const file = where(rules);
  if (!file) return { file: null, unread: "the *choice records* named in the rules is no plain path inside the project" };
  const parts = file.split("/");
  for (let i = 1; i <= parts.length; i++) {
    let stat;
    try { stat = fs.lstatSync(path.join(root, ...parts.slice(0, i))); } catch { return { file, text: null }; }
    if (stat.isSymbolicLink()) return { file, unread: `${file} is no regular file (a link stands on its way)` };
    if (i === parts.length && !stat.isFile()) return { file, unread: `${file} is no regular file (a folder)` };
    if (i === parts.length && stat.size > MOST) return { file, unread: `${file} is past ${MOST} bytes` };
  }
  let text, unread = null, total = 0;
  try { text = fs.readFileSync(path.join(root, file), "utf8"); } catch { return { file, unread: `${file} could not be read` }; }
  total = Buffer.byteLength(text);
  text = wholeOf(text, folder => {
    const at = folder.split("/");
    try {
      for (let i = 1; i <= at.length; i++) {
        const stat = fs.lstatSync(path.join(root, ...at.slice(0, i)));
        if (stat.isSymbolicLink() || (i === at.length && !stat.isDirectory())) throw new Error("no plain folder");
      }
      const names = fs.readdirSync(path.join(root, folder), { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name);
      return inFolder(names, name => {
        if ((total += fs.statSync(path.join(root, folder, name)).size) > MOST) throw new RangeError("past");
        return fs.readFileSync(path.join(root, folder, name), "utf8");
      });
    } catch (e) {
      unread ??= e instanceof RangeError ? `${file} with ${folder}/ is past ${MOST} bytes` : `${folder}/ is no plain folder, or could not be read (a link, or none, stands on its way)`;
      return [];
    }
  });
  return unread ? { file, unread } : { file, text };
}
