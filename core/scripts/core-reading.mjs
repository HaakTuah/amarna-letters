// A project read against the core (tasks/cleaning.md, "A project is read against the core once, then for what each
// release changes"; #464): the rules the project takes, the floor's and its modules' as rules.mjs reads them from its
// copy, against RECORD, the record of the readings made: the day of the last and a mark of each rule of the copy at
// that reading, made from its key and its text, so that a rule a release adds or changes is no longer covered. Every
// rule of the copy is marked, not only those taken, so that a module the project takes later is read for what a
// release changes in it, as the rest are, and taking it in asks nothing by itself. What is due:
// a whole reading where no record stands or it cannot be read, else the rules no reading covered, each by its key.
// The sync's step (steps/, beside this file) reads it, and so the scheduled look's issue of steps not done; it fails
// nothing (AGENTS.md of the core, "Nothing locks a project"). The core's own repository takes no copy: there it reads
// nothing (#259 is that reading). Node's own modules.
//
//   node core/scripts/core-reading.mjs             from a project's root: what is due, each rule to read by its key
//   node core/scripts/core-reading.mjs --rules     every rule the project takes, by its key: what a whole reading reads
//   node core/scripts/core-reading.mjs --recorded  record the reading made today, marking every rule of the copy
//                                                  as it stands: the session that took the reading's task runs it in
//                                                  the pull request that holds the reading's report
import fs from "node:fs";
import path from "node:path";
import { copyOf } from "./core-path.mjs";
import { READ_MOST } from "./own-files.mjs";
import { fingerprint, ROOT, rules, takenRules } from "./rules.mjs";
import { started } from "./started.mjs";

export const RECORD = "checks/core-reading.json";
const DAY = /^\d{4}-\d\d-\d\d$/u, MARK = /^[0-9a-f]{12}$/u;
const markOf = r => fingerprint(`${r.key}\n${r.text}`);

// The record's text read: { day, marks } where it is in its form, false where it is not, null where there is none.
export function recordOf(text) {
  if (text === null || text === undefined) return null;
  let r;
  try { r = JSON.parse(text); } catch { return false; }
  const ok = r && typeof r === "object" && DAY.test(r.day) && Array.isArray(r.read) && r.read.every(m => MARK.test(m));
  return ok ? { day: r.day, marks: new Set(r.read) } : false;
}

// What is due in a project whose manifest's text is `manifest` and whose record's text is `text` (null where it has
// none), against the rules of the copy at `root`: null where nothing is; { whole, why } for a whole reading; else
// { day, keys }, the rules no reading covered.
export function due(manifest, text, root = ROOT) {
  const record = recordOf(text);
  if (record === null) return { whole: true, why: `no reading of the project against the core is recorded (\`${RECORD}\`)` };
  if (record === false) return { whole: true, why: `\`${RECORD}\` cannot be read as JSON with a "day" (YYYY-MM-DD) and a list "read" of marks` };
  const keys = takenRules(rules(root), manifest).filter(r => !record.marks.has(markOf(r))).map(r => r.key);
  return keys.length ? { day: record.day, keys } : null;
}

// What is due, in words a session acts on with no rule file open; null where nothing is. `copy`, the copy's path.
export function said(d, copy = "core/") {
  if (!d) return null;
  const how = `a fresh auditor (\`${copy}roles/auditor.md\`) answers for each rule met, partly, not met or not applicable, with its evidence and what holds it in the project, and, for each of the project's own rules that says what one of them says or goes against it, each check of its own (a workflow, a script, a hook) that does the job of one of the core's, each page of its own that restates the core's text in other words, and each finding \`node ${copy}scripts/twice.mjs\` lists for the auditor, the same, stricter or narrower, different, contradicting or unsure; the session that took the task writes its answers as a report in the project's *audits*, named by its day, files each gap as a task taken at the dose, and records the reading with \`node ${copy}scripts/core-reading.mjs --recorded\`, in one pull request (\`${copy}tasks/cleaning.md\`, "A project is read against the core once, then for what each release changes"); then it runs \`node ${copy}scripts/twice.mjs --fix\`, which corrects what is exact, in a pull request of its own, and does what each answer of the second kind asks (\`${copy}tasks/cleaning.md\`, "The reading asks what a project holds twice")`;
  if (d.whole) return `A whole reading of the project against the core is due: ${d.why}. Read it against every rule it takes, as \`node ${copy}scripts/core-reading.mjs --rules\` lists them: ${how}.`;
  return `${d.keys.length === 1 ? "A rule" : `${d.keys.length} rules`} the project takes ${d.keys.length === 1 ? "was" : "were"} added or changed since the reading of ${d.day}, which no reading has covered: ${d.keys.map(k => `\`${k}\``).join("; ")}. Read the project against ${d.keys.length === 1 ? "it" : "them"}: ${how}.`;
}

// The reading recorded: every rule of the copy as it stands, marked, with the day.
export function record(day, root = ROOT) {
  const marks = [...new Set(rules(root).map(markOf))].sort();
  return `${JSON.stringify({ day, read: marks }, null, 2)}\n`;
}

// The path of `file` under `cwd`, where neither it nor a folder on its way is a link and, where it stands, it is a plain
// file no larger than READ_MOST: the record is read and written only as a plain file of the project's own, never
// through a link to another file, in the project or outside it (floor rule 13), nor a folder, a pipe or a device, which
// would fail or hang (#961's review). It throws, with the mend, where one is. Every link is refused, one that stays in
// the project too, where own-files.mjs follows it to read: this writes, and a write through any link is refused.
function plain(file, cwd) {
  const parts = file.split("/");
  for (let i = 1; i <= parts.length; i++) {
    let found;
    try { found = fs.lstatSync(path.join(cwd, ...parts.slice(0, i)), { throwIfNoEntry: false }); } catch { found = undefined; }
    if (found?.isSymbolicLink()) throw new Error(`${file} is reached through a link (${parts.slice(0, i).join("/")}), which is read and written through by nothing here. Mend: make it a plain file of the project's own, in a plain folder, or take the link out`);
    if (i === parts.length && found && (!found.isFile() || found.size > READ_MOST)) throw new Error(`${file} is not a plain file of at most ${READ_MOST >> 20} MB, which is all that is read or written here. Mend: take out what stands at ${file}, then run it again`);
  }
  return path.join(cwd, file);
}

// What the command prints, run in `cwd` with `args`; it writes the record with --recorded.
export function main(args, cwd = process.cwd()) {
  const read = f => { const at = plain(f, cwd); return fs.existsSync(at) ? fs.readFileSync(at, "utf8") : null; };
  const manifest = read("core-manifest.md");
  if (manifest === null) return "No core-manifest.md here: the core's own repository takes no copy, so it is read against nothing (#259 is its reading); run this from a project's root.";
  if (args[0] === "--recorded") {
    const at = plain(RECORD, cwd);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    // opened with no link followed, so a link put in its place after the check is not written through either
    const fd = fs.openSync(at, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0));
    try { fs.writeFileSync(fd, record(new Date().toISOString().slice(0, 10))); } finally { fs.closeSync(fd); }
    return `${RECORD}: the reading of today is recorded, marking every rule of the copy.`;
  }
  if (args[0] === "--rules") return takenRules(rules(), manifest).map(r => r.key).join("\n");
  return said(due(manifest, read(RECORD)), copyOf(cwd)) ?? "No reading of the project against the core is due: every rule it takes is covered by one.";
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !["--rules", "--recorded"].includes(args[0]))) { console.error("FAIL: the reading against the core does not know that. Mend: run it with no option, with --rules or with --recorded"); process.exitCode = 1; }
  else try { console.log(main(args)); } catch (e) {
    const message = e.message.split(process.cwd()).join("<the project>"); // no path of the machine's in a line a session may paste
    console.error(/Mend: /u.test(message) ? `FAIL: ${message}` : `FAIL: what is due could not be read here (${message}). Mend: run it from the project's root, beside core-manifest.md`); process.exitCode = 1;
  }
}
