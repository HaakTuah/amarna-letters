// What the core offers one agent tool, it offers each (tasks/tools.md, "What the core offers one tool, it offers each";
// #467): the table there has a row for each thing the core offers and a column for each tool of the list
// (staged-tools.json, beside this file), and each cell says one of three: "carried: " and the file that carries it,
// "cannot: <the page of the tool's documentation>, read <day month year>", or "not yet", its issue the column's cell in the
// table's last row ("Its issue for what is not yet carried"), or "not yet: #<its issue>" where it names its own. It fails an empty
// cell or one in no such form, a file a cell names that is not there, a tool of the list with no column, a map of the
// tiers whose part says no day it was read, a carried cell of the row of a session of its own whose file holds no line
// *Starts a session:* with its day (#492), and a file of a tool's own that no cell names: each part under tools/, each
// template of the starter kit (init.mjs, beside this file) written into a tool's folder or as a tool's entry file, each
// hook script (holders.mjs's HOOKS), and each file the core holds in a tool's folder, named by itself or by the template
// that writes it; and a part a column's heading names that does not say how the tool is asked for a review by each way,
// in the order of tasks/reviews.md, point 1 (WAYS; #397); and a part of tasks/ways.md, a way of running sessions, out
// of the form ways.mjs reads (tasks/ways.md, "A way of running sessions has a part of its own"). With --open it asks gh, as the account it answers for,
// whether each issue a "not yet" names is open, and fails one that is not; where gh cannot answer, it says so and fails nothing for it. The core's own repository
// alone, run by its tests workflow. Git, gh and Node's own modules.
//
//   node scripts/tools-offer.mjs [--open]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOOKS } from "./holders.mjs";
import { FILES, TEMPLATES } from "./init.mjs";
import { ENTRY_FILES } from "./rule-files.mjs";
import { started } from "./started.mjs";
import { MODULE as WAYS_MODULE, readWays } from "./ways.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const TABLE = "tasks/tools.md";
// The folders a tool keeps its own files in, and the files at a project's root a tool reads first.
export const TOOL_DIRS = [".claude", ".codex", ".kiro", ".agents", ".agent"];
const TOOL_ROOT = ["GEMINI.md", ...Object.values(ENTRY_FILES)];
const ofTool = f => TOOL_DIRS.some(d => f.startsWith(`${d}/`)) || TOOL_ROOT.includes(f);
const DAY = String.raw`\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}`;
const FORMS = [/^carried: \S.*$/u, new RegExp(String.raw`^cannot: \S.*, read ${DAY}$`, "u"), /^not yet(?:: #\d+)?$/u];
const ISSUES = /^Its issue for what is not yet carried$/u;
const MAP = /^The map of the tiers/u;
// The row of a session of its own (tasks/tools.md, "Each tool's part says whether it starts a session of its own";
// #492): its file holds the line *Starts a session:*, as a list item's lead or at a paragraph's start, which says,
// before the next item, paragraph or heading, the day its documentation was read.
const STARTS = /^Starts a session of its own/u;
const LABEL = "*Starts a session:*";
const LEADS = [/^[ \t]*- \*Starts a session:\*/mu, /(?:^|\n[ \t]*\n)[ \t]*\*Starts a session:\*/u];
const startsDated = text => { const at = Math.min(...LEADS.map(r => r.exec(text)?.index ?? Infinity)); return at < Infinity && new RegExp(`read on ${DAY}`, "u").test(text.slice(at).replace(/^\s+/u, "").split(/\n\s*\n|\n\s*- |\n[ \t]*#{1,6}[ \t]/u)[0]); };
// The ways a review is asked, in the order a session takes them (tasks/reviews.md, point 1; #397): each a label in
// italics in each tool's part, the project's own way named in tasks/reviews.md alone.
export const WAYS = ["*Side by side:*", "*Through a plug-in:*", "*On the host:*"];

// What is wrong with a tool's part, `text`, on the ways: a label of WAYS it leaves out, or the labels out of order.
export function ways(part, text) {
  const at = WAYS.map(w => String(text).indexOf(w));
  const missing = WAYS.filter((_, i) => at[i] < 0);
  if (missing.length) return [`${part} does not say how the tool is asked for a review by the way${missing.length > 1 ? "s" : ""} ${missing.map(w => `"${w}"`).join(", ")}. Mend: add the label in italics, in the order ${WAYS.join(" ")}, saying how a code review and a security review are asked of the tool that way, what comes back and whether it takes a brief, or "none" where the tool has no such way`];
  return at.every((n, i) => !i || n > at[i - 1]) ? [] : [`${part} names the ways a review is asked out of order. Mend: put its labels in the order ${WAYS.join(" ")}, the order a session asks in (tasks/reviews.md, point 1)`];
}

// The table: { tools: [{ name, part, issue }], rows: [{ what, cells: [text] }] }, `issue` the column's cell of the row
// ISSUES ("#<n>", "none", or "" where there is no such row), which is no row of what is offered; or null where TABLE
// holds none.
export function table(text) {
  const lines = String(text).split(/\r?\n/u), at = lines.findIndex(l => /^\|\s*What the core offers\s*\|/u.test(l));
  if (at < 0) return null;
  const cells = l => l.trim().replace(/^\||\|$/gu, "").split("|").map(c => c.trim());
  const tools = cells(lines[at]).slice(1).map(h => ({ name: h.replace(/\s*\(.*\)\s*$/u, ""), part: /`([^`]+)`/u.exec(h)?.[1] ?? null }));
  const rows = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.trim().startsWith("|")) break;
    const c = cells(l);
    if (ISSUES.test(c[0])) tools.forEach((t, i) => { t.issue = c[i + 1] ?? ""; });
    else rows.push({ what: c[0], cells: tools.map((_, i) => c[i + 1] ?? "") });
  }
  for (const t of tools) t.issue ??= "";
  return { tools, rows };
}

// The files of a tool's own the core holds: [{ file, by }], `by` the names that count as naming it.
export function toolFiles(root, tracked) {
  const parts = fs.readdirSync(path.join(root, "tools")).filter(f => f.endsWith(".md")).map(f => ({ file: `tools/${f}`, by: [`tools/${f}`] }));
  const templates = FILES.filter(([, to]) => ofTool(to)).map(([from, to]) => ({ file: `${TEMPLATES}/${from}`, by: [`${TEMPLATES}/${from}`], to }));
  const own = tracked.filter(ofTool).map(f => ({ file: f, by: [f, ...templates.filter(t => t.to === f).map(t => t.file)] }));
  const hooks = [...HOOKS].map(f => ({ file: f, by: [f] }));
  return [...parts, ...templates.map(({ file, by }) => ({ file, by })), ...hooks, ...own];
}

// What is wrong with the files a cell that says "carried" names: one not there, a map whose part says no day, and a file
// of a session of its own with no dated line *Starts a session:*.
function carriedWrong({ root, what, cell, where, read }) {
  const out = [];
  for (const m of cell.matchAll(/`([^`]+\/[^`]+|[^`/]+\.(?:md|json|mjs|sh|tmpl))`/gu)) {
    if (!fs.existsSync(path.join(root, m[1]))) out.push(`${where} names ${m[1]}, which is not there. Mend: name the file that carries it as it now stands`);
    else if (MAP.test(what) && m[1].startsWith("tools/") && !new RegExp(`read on ${DAY}`, "u").test(fs.readFileSync(path.join(root, m[1]), "utf8"))) out.push(`${where}: its map, ${m[1]}, says no day its documentation was read. Mend: write in it "read on <the day>", the day the models were read from the tool's documentation`);
    else if (STARTS.test(what) && !startsDated(read(m[1]))) out.push(`${where}: ${m[1]} holds no line ${LABEL} that says the day its documentation was read. Mend: write in it the line ${LABEL}, whether and how a session of the tool starts a session of its own and whether that one goes on once its starter is archived, from the tool's documentation, ending with its pages and "read on <the day>"`);
  }
  return out;
}

// What is wrong with the table at `root`, each a line with its mend. `tools`: the list; `tracked`: the files git holds;
// `isOpen(n)`: whether issue n is open, null where it cannot be read (no --open: never asked).
// `text`: the table's file as it stands, read from `root` where left out; `read(file)`: a tool's part, read from `root`
// where left out.
export function wrong({ root = ROOT, text = fs.readFileSync(path.join(root, TABLE), "utf8"), tools, tracked, isOpen = () => null, read = f => fs.readFileSync(path.join(root, f), "utf8") }) {
  const t = table(text);
  if (!t) return { wrong: [`${TABLE} holds no table whose first heading is "What the core offers". Mend: put back the table of "What the core offers one tool, it offers each", a row for each thing the core offers and a column for each tool of scripts/staged-tools.json`], unread: [] };
  const out = [], unread = [], named = new Set();
  for (const name of tools.filter(n => !t.tools.some(x => x.name === n))) out.push(`${TABLE}: the tool ${name}, of scripts/staged-tools.json, has no column in the table. Mend: add its column, its part in the heading ("${name} (\`tools/<its part>.md\`)"), and fill each cell as carried, cannot or not yet`);
  for (const x of t.tools) if (x.part) {
    named.add(x.part);
    const at = path.resolve(root, x.part);
    if (!at.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(at) || !fs.statSync(at).isFile()) out.push(`${TABLE}: the column ${x.name} names its part ${x.part}, which is no file in the repository. Mend: name in the heading the tool's part as it stands under tools/`);
    else out.push(...ways(x.part, read(x.part)));
  }
  for (const r of t.rows) r.cells.forEach((cell, i) => {
    const where = `${TABLE}, the row "${r.what}", the column ${t.tools[i].name}`;
    for (const m of cell.matchAll(/`([^`]+)`/gu)) named.add(m[1]);
    if (!cell) { out.push(`${where} is empty. Mend: write "carried: " and the file that carries it, "cannot: <the page of its documentation>, read <the day>", or "not yet: #<an open issue>"`); return; }
    if (!FORMS.some(f => f.test(cell))) { out.push(`${where} says "${cell}", in none of the three forms. Mend: write "carried: " and the file that carries it, "cannot: <the page of its documentation>, read <the day, as 18 November 2026>", or "not yet: #<an open issue>"`); return; }
    if (cell.startsWith("carried")) out.push(...carriedWrong({ root, what: r.what, cell, where, read }));
    let n = /^not yet: #(\d+)$/u.exec(cell)?.[1];
    if (cell === "not yet") {
      n = /^#(\d+)$/u.exec(t.tools[i].issue)?.[1];
      if (!n) { out.push(`${where} says "not yet", and the column's cell in the row "Its issue for what is not yet carried" names no issue. Mend: write there "#<the open issue that carries what this column has not yet>", filing one where none does, or name one in the cell as "not yet: #<n>"`); return; }
    }
    if (n) { const open = isOpen(Number(n)); if (open === false) out.push(`${where} names #${n}, which is not open. Mend: carry it or write the tool cannot, or name the open issue that takes it, filing one where none does`); else if (open === null) unread.push(n); }
  });
  let waysText = null;
  try { waysText = read(WAYS_MODULE); } catch { out.push(`${WAYS_MODULE} cannot be read. Mend: put back the module of the ways of running sessions, a part for each way`); }
  if (waysText !== null) out.push(...readWays(waysText).problems);
  for (const f of toolFiles(root, tracked).filter(f => !f.by.some(b => named.has(b)))) out.push(`${f.file} is a file of a tool's own that no cell of the table in ${TABLE} names. Mend: name it in the cell of the row it carries, or add the row for what it offers and fill that row for each tool`);
  return { wrong: out, unread: [...new Set(unread)] };
}

const gitFiles = root => execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
// What GitHub's API answers of an issue's state (floor rule 5): true for "open", false for "closed", and null, read as
// not answered, for anything else, a long, empty or other text among it.
export const openFrom = answer => { const a = typeof answer === "string" && answer.length <= 20 ? answer.trim() : null; return a === "open" ? true : a === "closed" ? false : null; };
const ghOpen = n => { try { return openFrom(execFileSync("gh", ["api", `repos/{owner}/{repo}/issues/${n}`, "--jq", ".state"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20000 })); } catch { return null; } };

if (started(import.meta.url)) {
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/staged-tools.json"), "utf8")).tools;
  const r = wrong({ tools, tracked: gitFiles(ROOT), isOpen: process.argv.includes("--open") ? ghOpen : () => null });
  console.log(`The table of what the core offers each tool: ${tools.length} tools, ${r.wrong.length} wrong${r.unread.length && process.argv.includes("--open") ? `; gh could not say whether ${r.unread.map(n => `#${n}`).join(", ")} ${r.unread.length > 1 ? "are" : "is"} open, so nothing fails for ${r.unread.length > 1 ? "them" : "it"}` : ""}.`);
  for (const w of r.wrong) console.log(`FAIL ${w}`);
  if (r.wrong.length) process.exitCode = 1;
}
