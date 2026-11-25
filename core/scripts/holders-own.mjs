// A project's own rules and what holds them (#662; split from holders.mjs, #888): the reader of a project's list,
// checks/holders.json, which holders.mjs keeps apart from its own list of the core's rules.
// In a project, --own reads the project's own rules the same way as holders.mjs reads the core's: those of the rule
// files its sessions read, as the project's own files name them (floor rule 3's, the files an agent tool takes its
// instructions from, what its SECURITY.md adds, and the files its AGENTS.md and CLAUDE.md pull in by an "@" line, none
// of the core's copy, where its manifest places it), against its list OWN, which names for each its check, test,
// simulation or script, "audit", "describes" or "none". It fails nothing there, a wrong entry of the list included: the
// project's monthly state report lists each rule with no holder, those read at a session's start first, and its sessions
// work them down as tasks.
//
//   (node core/scripts/holders.mjs --own [--write] hands it to ownMain() here; holders.mjs gives the usage)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { copyOf } from "./core-path.mjs";
import { inProject, leadsOut, oneLine } from "./guards.mjs";
import { counts, holderOf } from "./holder-form.mjs";
import { FLOOR, ruleFiles, toolFiles } from "./rule-files.mjs";
import { rulesOf } from "./rules.mjs";

export const OWN = "checks/holders.json";
// (text from a project's files as the report and the log carry it: on one line, in a code span, so that no line break,
// workflow command or mention in it acts: floor rule 5)
const span = t => `\`${oneLine(t).replace(/`/gu, "'")}\``;
// (a check's name that is a path of the project: a file name with its extension, or one with a folder)
const OWN_PATHS = /^(?:[\w.@-]+\/)+[\w.@-]+$|^[\w-]+\.\w+$/u;
// Whom a rule of the project's own is about (#484, point 9), as the list's "about" names it, keyed as "holders" is.
const ABOUT = /^(?:this project|every project|its kind: (\S.{0,79}))$/u;
const ABOUT_FORMS = '"this project", "its kind: <the kind>" or "every project"';

// The project's own rule files under `root`: [{ file, start }], `start` where a session reads it at its start (its
// AGENTS.md and CLAUDE.md, and the files they pull in by an "@" line); and `read`, a file's text or null.
function ownRuleFiles(root) {
  const read = f => { try { const at = path.join(root, f); return inProject(f) && !leadsOut(root, at) && fs.statSync(at).isFile() ? fs.readFileSync(at, "utf8") : null; } catch { return null; } };
  // (the core's copy where the manifest places it, core/ by default: its rules are the core's, never the project's)
  const copy = copyOf(root), mine = f => !`${path.posix.normalize(f)}/`.startsWith(copy) && read(f) !== null;
  const list = dir => { try { return execFileSync("git", ["-C", root, "ls-files", "-z", "--", dir], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean); } catch { return []; } };
  const pulled = ["AGENTS.md", "CLAUDE.md"].flatMap(f => [...(read(f) ?? "").matchAll(/^@(\S+\.md)[ \t]*\r?$/gmu)].map(m => path.posix.normalize(m[1])));
  let listed;
  try { listed = ruleFiles(read, list, { tools: true }); } catch { listed = [...FLOOR, ...toolFiles(read, list)]; }
  const start = new Set(["AGENTS.md", "CLAUDE.md", ...pulled]);
  return { files: [...new Set([...listed, ...pulled])].filter(mine).map(file => ({ file, start: start.has(file) })), read };
}

// The project's own rules and what its list names for each, as holders() gives the core's: { rules, by, wrong, start,
// list }, `start` the keys of the rules read at a session's start, `list` whether OWN stands, `wrong` each line of the
// list that is wrong, with its mend.
export function ownHolders(root = process.cwd()) {
  const { files, read } = ownRuleFiles(root), all = files.flatMap(f => rulesOf(f.file, read(f.file)));
  const start = new Set(all.filter(r => files.find(f => f.file === r.file).start).map(r => r.key));
  const by = new Map(all.map(r => [r.key, []])), wrong = [], text = read(OWN);
  let named = {};
  if (text !== null) {
    try { named = JSON.parse(text).holders ?? {}; if (typeof named !== "object" || Array.isArray(named)) throw new Error('its "holders" is no object'); }
    catch (e) { named = {}; wrong.push(`${OWN} cannot be read (${span(String(e.message).split("\n")[0])}). Mend: write it as JSON, its "holders" an object keyed by each rule's file and lead`); }
  }
  for (const [key, value] of Object.entries(named)) {
    if (!by.has(key)) { wrong.push(`${OWN} names ${span(key)}, which is no rule of the project's own rule files as they stand. Mend: write the key as the rule's file and bold lead now read, or take it out where the rule has gone`); continue; }
    for (const v of (Array.isArray(value) ? value : [value]).filter(v => v !== "none")) {
      const h = holderOf(key, v, root, OWN, OWN_PATHS, span);
      // (a review reads what a session judged, and fails nothing by itself: it holds no rule)
      // (a holder that is no text, or an empty one, named once for its key however many it has)
      if (h === null) { const w = `${OWN}: ${span(key)} has a holder that is no text or an empty one. Mend: write each holder as "check: <its test, check, simulation or script>", "audit", "describes" or "none"`; if (!wrong.includes(w)) wrong.push(w); }
      else if (typeof h !== "string" && h.kind === "check" && /\breview/iu.test(h.by)) wrong.push(`${OWN}: ${span(key)} is held by ${span(h.by)}, a review, which holds no rule. Mend: name the test, check, simulation or script that fails where the rule is broken, or write "none"`);
      else if (typeof h === "string") wrong.push(h); else by.get(key).push(h);
    }
  }
  return { rules: all, by, wrong, start, list: text !== null, about: answersOf(text, by, wrong) };
}

// The list's answers of whom each rule is about (#484, point 9), by the rule's key, those in no form pushed to `wrong`
// with their mend; none where the list is not there or cannot be read (said with its holders).
function answersOf(text, by, wrong) {
  const about = new Map();
  let answers = {};
  try { answers = text === null ? {} : JSON.parse(text).about ?? {}; } catch { return about; }
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) { wrong.push(`${OWN}: its "about" is no object. Mend: write it as an object keyed by each rule's file and lead, as "holders" is, each value ${ABOUT_FORMS}`); return about; }
  for (const [key, value] of Object.entries(answers)) {
    if (!by.has(key)) wrong.push(`${OWN}'s "about" names ${span(key)}, which is no rule of the project's own rule files as they stand. Mend: write the key as the rule's file and bold lead now read, or take it out where the rule has gone`);
    else if (typeof value !== "string" || !ABOUT.test(value)) wrong.push(`${OWN}: ${span(key)} is said to be about ${span(String(value))}. Mend: write ${ABOUT_FORMS}`);
    else about.set(key, value);
  }
  return about;
}

// The lines a project's state report carries: its own rules by what holds them, those with none worst first (read at a
// session's start before those read on need), and each wrong line of its list; `scripts`: where the core's scripts are.
export function ownReport(root = process.cwd(), scripts = "core/scripts") {
  const h = ownHolders(root), c = counts(h), files = [...new Set(h.rules.map(r => r.file))];
  if (!h.rules.length) return ["- The project's own rule files hold no rule with a bold lead, so none is counted."];
  const none = [...c.none.filter(k => h.start.has(k)), ...c.none.filter(k => !h.start.has(k))];
  const unanswered = h.rules.map(r => r.key).filter(k => !h.about.has(k)), wider = [...h.about].filter(([, v]) => v !== "this project");
  return [
    `- Of ${c.all} rules of the project's own (${files.map(span).join(", ")}): ${c.check} held whole by a check, ${c.audit} by the audit, ${c.part} in part; ${c.describes} describe and bind no one; ${c.none.length} have no holder (\`node ${scripts}/holders.mjs --own\`, its list \`${OWN}\`${h.list ? "" : ", not written yet"}).`,
    ...(none.length ? [`- No holder, worst first (read at a session's start, then on need): the session that takes this report files each as a task at the project's pace, a check where one can read its breach exactly, named in \`${OWN}\`; a move to where it is read on need; or a proposal that it goes, which is the owner's to decide. Where its file is a copy made from elsewhere, the change goes to whoever writes that source. Nothing fails meanwhile: ${none.map(span).join("; ")}.`] : []),
    // (whom each rule is about: #484, point 9, as #459's note adds it)
    ...(unanswered.length ? [`- Whom a rule is about, ${h.about.size} of ${c.all} answered: the session that takes this report answers of each of the rest whether it is about this project, its kind or every project, in \`${OWN}\`'s "about", keyed as "holders" is, ${ABOUT_FORMS}: ${unanswered.map(span).join("; ")}.`] : []),
    ...(wider.length ? [`- About a kind or every project: the session that takes this report files each to the core as an idea where none is filed yet (search first), naming the kind, written for the kind and holding nothing of the project (\`${scripts.replace(/scripts\/?$/u, "")}README.md\`, "Reporting to the core"): ${wider.map(([k, v]) => `${span(k)}, ${span(v)}`).join("; ")}.`] : []),
    ...h.wrong.map(w => `- ${w}.`),
  ];
}

// Writes OWN: each rule of the project's own it does not name yet added as "none", what it names kept.
export function writeOwn(root = process.cwd()) {
  const h = ownHolders(root), at = path.join(root, OWN);
  if (leadsOut(root, at)) throw new Error(`${OWN} leads out of the project. Mend: take out the link on its way, then run it again`);
  let j = {};
  if (fs.existsSync(at)) { try { j = JSON.parse(fs.readFileSync(at, "utf8")); } catch (e) { throw new Error(`${OWN} cannot be read (${span(String(e.message).split("\n")[0])}). Mend: write it as JSON, or take it out and run this again`); } }
  const named = j.holders && typeof j.holders === "object" && !Array.isArray(j.holders) ? j.holders : {};
  for (const r of h.rules) named[r.key] ??= "none";
  fs.mkdirSync(path.dirname(at), { recursive: true });
  fs.writeFileSync(at, `${JSON.stringify({ ...j, holders: named }, null, 2)}\n`);
}

// The CLI of --own: its counts and each rule with no holder; with --write, OWN written first.
export function ownMain() {
  if (process.argv.includes("--write")) { try { writeOwn(); } catch (e) { console.error(`FAIL ${e.message}`); process.exitCode = 1; } }
  console.log(ownReport().map(l => l.slice(2)).join("\n"));
}
