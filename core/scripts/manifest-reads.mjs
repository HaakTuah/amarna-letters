// The manifest against the modules, and the README's table of slots against its marks (#157, #481; AGENTS.md, "Nothing
// locks a project" and "What can be read is never asked or declared"). A project's `core-manifest.md` names every
// module of the core in its "Modules:" line, where that is a list and not "all", takes or leaves out with a reason. It
// REPORTS and never fails in a project: a list that was missing before this check came is no breach of the project's
// own, and each note says the line to add. The copies workflow runs it, a step of a job that already runs, so no job
// is added. A slot asks the project for no row: each is read by a script or has a default, as its mark says, and a row
// only overrides it.
//
// A module a list leaves out is named in a line of the manifest, `Not taken: ` and each module as `<name>.md` in
// backticks followed by its reason in brackets, as: Not taken: `game-design.md` (the project is no game).
//
// In the core's own repository (`--core`) each slot of its README's table carries one mark in its third column:
// "read:" naming in backticks a reader that stands in the core, "choice:" with its default ("left out, ..."), or
// "cannot be read:" with its reason and then its default; a slot with none, or a mark short of its part, fails, saying
// the mend. Node's own modules and git only.
//
//   node core/scripts/manifest-reads.mjs    from a project: the notes, or that none is needed; exits 0
//   node scripts/manifest-reads.mjs --core  in the core's own repository: fails a slot's mark short of its part
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logged, unrooted } from "./guards.mjs";
import { MODULES } from "./reading.mjs";
import { started } from "./started.mjs";
import { copyOf, projectAt, readCore } from "./core-path.mjs";
import { movedModules } from "./step-checks-moved.mjs";

const plain = s => s.toLowerCase().replace(/[‘’]/gu, "'").replace(/\s+/gu, " ").trim();
// (a phrase in italics may run over one line break, as a module's text wraps it: "*where the numbers\n  go*"; the
// wrapped part starts at its first character that is no blank, so a long blank line is read once, not tried each way)
const italics = text => [...String(text).matchAll(/(?<![*\w])\*([^*\n]+?(?:\n[ \t]*[^*\s][^*\n]*?)?)\*(?![*\w])/gu)].map(m => plain(m[1]));
const section = (lines, title) => {
  const at = lines.findIndex(l => l === title);
  if (at < 0) return [];
  const end = lines.findIndex((l, i) => i > at && /^#{1,2} /u.test(l));
  return lines.slice(at + 1, end < 0 ? lines.length : end);
};
const rows = lines => lines.filter(l => l.startsWith("|")).map(l => l.split("|").slice(1, -1).map(c => c.trim()))
  .filter(r => r.length >= 2 && !/^[-: ]+$/u.test(r[0]) && !/^slot$/iu.test(r[0]));

// The README's "Slots" table: each slot's name, what a project fills in, and its mark, as the third column gives it.
export function slotTable(readme) {
  const out = new Map();
  for (const [first, what, mark = ""] of rows(section(String(readme).split(/\r?\n/u), "## Slots"))) {
    for (const name of italics(first)) out.set(name, { what, mark });
  }
  return out;
}

// What a mark lacks, or "" where it has each part: "read:" names a reader, in backticks, that `stands(path)` finds in
// the core; "choice:" gives its default, "left out, " and what; "cannot be read:" gives its reason, then its default.
export function markGap(mark, stands) {
  const kind = /^(read|choice|cannot be read):\s*(.*)$/su.exec(mark);
  if (!kind) return `carries none of the three marks ("read:", "choice:" or "cannot be read:")`;
  const [, what, rest] = kind;
  if (what === "read") {
    const named = [...rest.matchAll(/`([\w./-]+\.(?:mjs|js|sh|yml|json))`/gu)].map(m => m[1]);
    if (!named.length) return `is marked "read:" and names no reader, a script or workflow in backticks`;
    const gone = named.filter(f => !stands(f));
    return gone.length ? `is marked "read:" by ${gone.map(f => `\`${f}\``).join(", ")}, which the core does not hold` : "";
  }
  const at = rest.search(/\bleft out, \S/u);
  if (at < 0) return `is marked "${what}:" with no default ("left out, " and what stands in its place)`;
  return what === "cannot be read" && !/\w/u.test(rest.slice(0, at)) ? `is marked "cannot be read:" with no reason before its default` : "";
}

// The core's own: each slot of its README's table whose mark lacks a part, with the mend.
export function markGaps(readme, stands) {
  const slots = slotTable(readme);
  if (!slots.size) return [`README.md has no "## Slots" table, which names each slot and its mark. Mend: write it back, a row a slot: its name in italics, what a project fills in, and its mark`];
  const out = [];
  for (const [name, { mark }] of slots) {
    const gap = markGap(mark, stands);
    if (gap) out.push(`README.md, "Slots": *${name}* ${gap}. Mend: give its row's third column "read:" and its reader where a script reads it, else "choice:" or "cannot be read:" with the reason, each with its default ("left out, ..."), as AGENTS.md, "What can be read is never asked or declared", says`);
  }
  return out;
}

// The modules the manifest's line "Not taken:" leaves out, each with its reason ("" where it names none).
function notTakenOf(manifest) {
  const notTaken = new Map(), nt = /^Not taken:\s*(.*)$/mu.exec(String(manifest))?.[1] ?? "";
  for (const m of nt.matchAll(/`(?:[\w-]+\/)*([\w.-]+?)(?:\.md)?`(?:\s*\(([^)]*)\))?/gu)) notTaken.set(`${m[1]}.md`, (m[2] ?? "").trim());
  return notTaken;
}

// What the manifest's "Modules:" line takes: "all", the names of a list, or null where it is neither. And the modules
// it leaves out, each with its reason ("" where it names none), and the names its list holds, as written, that are
// neither in `known` nor in `movedTo` (`unknown`). A list names its modules in backticks, with or without their folder
// and ".md"; or bare, parted by commas, read only where each name is in `known` (the core's modules, as `<name>.md`) or
// `movedTo` (the modules the core moved, by their old name: step-checks-moved.mjs, `movedModules`), so that a line of
// words is never read as a list (#1248, point 1); in either form a name the core moved is read as one, and an empty
// list as taking no module (#1259, point 1).
export function modulesOf(manifest, known = null, movedTo = {}) {
  const at = /\bModules:\s*([^\n]*)/u.exec(String(manifest)), line = at?.[1].trim() ?? "";
  const names = text => [...text.matchAll(/`(?:[\w-]+\/)*([\w.-]+?)(?:\.md)?`/gu)].map(m => `${m[1]}.md`);
  const list = at ? listOf(`Modules: ${line}`) : null, items = list?.items ?? [], read = n => known?.includes(n) || Object.hasOwn(movedTo, n);
  const bare = !line.includes("`") && known && list ? items.map(i => i.name) : null;
  const taken = /^all\b/iu.test(line) ? "all" : names(line).length ? new Set(names(line))
    : bare && bare.every(read) ? new Set(bare) : null;
  return { taken, notTaken: notTakenOf(manifest), line, unknown: known ? items.filter(i => i.name && !read(i.name)).map(i => i.raw.trim()) : [] };
}
// The module that holds a moved module's text now (`to`, the path it went to), or null where it went to a file no
// project takes as a module, a role's (#1259, point 1).
export const heldIn = (to, known) => { const base = path.posix.basename(to); return MODULES.some(d => to === `${d}/${base}`) && known.includes(base) ? base : null; };
// A "Modules:" line's list as it is written: the line's text before it (`head`) and after it (`tail`), and each name, as
// written (`raw`) and as a module's file (`name`), with whether they stand in backticks; an empty list where the line
// names nothing, as one a moved name's move empties (#1259, point 1); null where it holds no such list ("all", or a
// bare name that is no plain name).
const MODULE_NAME = /^(?:[\w-]+\/)*([\w.-]+?)(?:\.md)?$/u;
export function listOf(line) {
  const [, head, body] = /^(.*?\bModules:\s*)(.*)$/u.exec(line) ?? [];
  if (body === undefined || /^all\b/iu.test(body)) return null;
  if (/^\.?\s*$/u.test(body)) return { head, list: "", tail: body, ticks: false, items: [] };
  const ticks = body.includes("`");
  const [, list, tail] = (ticks ? /^(.*`)(.*)$/u : /^(.*?)(\.?\s*)$/u).exec(body);
  const raws = ticks ? [...list.matchAll(/`([^`\n]*)`/gu)].map(m => m[1]) : list.split(/\s*,\s*(?:and\s+)?|\s+and\s+/u);
  const items = raws.map(raw => ({ raw, name: (m => m && `${m[1]}.md`)(MODULE_NAME.exec(raw.trim())) }));
  return items.length && (ticks || items.every(i => i.name)) ? { head, list, tail, ticks, items } : null;
}

// The lines of the manifest's "Differences", each that holds more than space (steps.mjs and the description check,
// beside this file, read them here).
export const differencesOf = manifest => (/^## Differences\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/mu.exec(String(manifest ?? ""))?.[1] ?? "").split(/\r?\n/u).filter(l => l.trim());

// Where each module a list neither takes nor leaves out goes (#1094): where a fact of the project read exactly decides
// it, it is taken, or left out with that fact as its reason; where none does, its taking is the owner's choice: it is
// taken, as the starter kit takes it, and named on the manifest's line "Modules to confirm:", which asks the owner once
// (the steps of the sync notes 160, 470, 480 and 500 write them, step-writers.mjs's writeModules; that of 23 November
// 2026 asks the confirmation). A module the line "Not taken:" names, with a reason or without, is never taken.
//
// The facts (`factsOf`): `game`, the manifest's slots hold a game's row (one of `gameSlots`, the kit's rows for a game);
// `oneRepository`, its "Core:" line has the copy whole under core/ (false where a library carries it or it stands
// elsewhere, null where the line cannot be read); `screen`, the project holds a file a screen is made of (SCREEN_FILE).
export const CONFIRM = "Modules to confirm:";
export const SCREEN_FILE = /\.(?:html?|jsx|tsx|vue|svelte|xaml|axaml|razor|cshtml|storyboard|xib)$/iu;
export function factsOf({ manifest, files = [], gameSlots = [] }) {
  const slots = new Set(rows(section(String(manifest ?? "").split(/\r?\n/u), "## Slots")).flatMap(([first]) => italics(first)));
  const core = readCore(manifest);
  return { game: gameSlots.some(s => slots.has(plain(s))), oneRepository: core.wrong ? null : core.form === "copied" && core.path === "core/", screen: files.some(f => SCREEN_FILE.test(f)) };
}
// One module's place from the facts: { take, why } where a fact decides it, { take: true, choice: true } where none does.
export function placeOf(name, facts) {
  if (name === "game-design.md") return facts.game ? { take: true, why: "a game's row in the manifest" } : { take: false, why: "the project is no game: its manifest holds no game's row" };
  if (name === "repositories.md" && facts.oneRepository !== null) return facts.oneRepository ? { take: false, why: "one repository, which no library carries the core into" } : { take: true, why: "its \"Core:\" line names a library or a path other than core/" };
  if (name === "screens.md" && facts.screen) return { take: true, why: "the project holds a file a screen is made of" };
  return { take: true, choice: true };
}
// Each module of `names` (`only`: of those alone) the manifest's list neither takes nor names on its line "Not taken:",
// with its place: [{ name, take, why, choice }], in the order of the names; [] where the line says "all"; null where
// it cannot be read. `known`: the core's modules, by which a bare list is read (modulesOf).
export function toPlace(manifest, names, facts, only = null, known = names) {
  const { taken, notTaken } = modulesOf(manifest, known);
  if (taken === "all") return [];
  if (taken === null) return null;
  return [...names].sort().filter(n => (!only || only.includes(n)) && !taken.has(n) && !notTaken.has(n)).map(name => ({ name, ...placeOf(name, facts) }));
}
// The modules the manifest's line "Modules to confirm:" names.
export const toConfirm = manifest => new Set([...(new RegExp(`^${CONFIRM}\\s*(.*)$`, "mu").exec(String(manifest ?? ""))?.[1] ?? "").matchAll(/`(?:[\w-]+\/)*([\w.-]+?)(?:\.md)?`/gu)].map(m => `${m[1]}.md`));
// The manifest with each module of `places` in its place: added to the "Modules:" list, or to the line "Not taken:" with
// its reason, and each taken by choice to the line "Modules to confirm:" too, a line made under the "Modules:" line
// where it is not yet; the rest of the text as it stood. A name added to the list takes the form the names there take,
// in backticks or bare, with ".md" or, where none has it, without (#1248, point 2). Throws where the "Modules:" line
// holds no list to add to.
export function placed(manifest, places) {
  const eol = /\r\n/u.test(manifest) ? "\r\n" : "\n", lines = String(manifest).split(/\r?\n/u);
  const at = lines.findIndex(l => /\bModules:/u.test(l)), list = at < 0 ? null : listOf(lines[at]);
  if (!list) throw new Error('its "Modules:" line names no module to add to');
  const named = list => list.map(p => `\`${p.name}\``).join(", ");
  const take = places.filter(p => p.take), out = places.filter(p => !p.take), chosen = places.filter(p => p.choice);
  // (a list in order, as the kit writes it, stays in order; any other gains the names at its end)
  if (take.length) {
    const { head, tail, ticks, items } = list, noExt = items.every(i => !/\.md$/u.test(i.raw.trim()));
    const shown = names => names.map(n => ticks ? `\`${n}\`` : n).join(", ");
    const raws = items.map(i => i.raw), added = take.map(p => noExt ? p.name.replace(/\.md$/u, "") : p.name);
    const inOrder = list.list === shown(raws) && raws.every((n, i) => !i || raws[i - 1] <= n);
    lines[at] = `${head}${inOrder ? shown([...raws, ...added].sort()) : `${list.list}, ${shown(added)}`}${tail}`;
  }
  // (a line added to, its last full stop moved after what it gains; "Not taken:" made under the last of the module
  // lines, and the line to confirm made a paragraph of its own after theirs, so the kit's paragraph stays as it writes it)
  const add = (head, what) => {
    const i = lines.findIndex(l => l.startsWith(head));
    if (i >= 0) { lines[i] = `${lines[i].replace(/\.?\s*$/u, "")}, ${what}.`; return; }
    let after = at;
    if (head === CONFIRM) while ((lines[after + 1] ?? "").trim()) after++;
    else while (/^Not taken:/u.test(lines[after + 1] ?? "")) after++;
    lines.splice(after + 1, 0, ...(head === CONFIRM ? ["", `${head} ${what}.`] : [`${head} ${what}.`]));
  };
  if (out.length) add("Not taken:", out.map(p => `\`${p.name}\` (${p.why})`).join(", "));
  if (chosen.length) add(CONFIRM, named(chosen));
  return lines.join(eol);
}

// What a project's manifest lacks, one note each, with the mend: the modules of `moduleTexts` ({ name: text }) its list
// neither takes nor leaves out; a name the core moved (`movedTo`, as modulesOf takes it) says where its text went.
export function notes({ manifest, moduleTexts, where = {}, movedTo = {} }) {
  const out = [];
  const names = Object.keys(moduleTexts).sort();
  const { taken, notTaken, line } = modulesOf(manifest, names, movedTo);
  if (taken === null) out.push(`core-manifest.md: its "Modules:" line (${line ? `"${line}"` : "none found"}) is neither "all" nor a list of the core's modules, each as \`<name>.md\` in backticks or by its bare name, parted by commas, so the modules it takes cannot be read; write it as the README's "The manifest's format" has it ("Modules: all." or a list)`);
  if (taken instanceof Set) {
    for (const n of [...taken].filter(n => !names.includes(n)).sort()) {
      const to = Object.hasOwn(movedTo, n) ? movedTo[n] : null, module = to && heldIn(to, names);
      const now = to ? `; its text moved to core/${to}, ${module ? `so \`${module}\` takes its place there` : "which no project takes as a module"}` : "";
      out.push(`core-manifest.md: its "Modules:" line names ${n}, which is no module of the core (${MODULES.map(d => `core/${d}/`).join(", ")})${now}; take it out of the line${to ? " (`node core/scripts/steps.mjs --write` does so)" : ""}`);
    }
    for (const n of names.filter(n => !taken.has(n) && !notTaken.get(n))) {
      out.push(`core-manifest.md: core/${where[n] ?? "tasks"}/${n} is neither on the "Modules:" line nor left out with a reason; add \`${n}\` to the line where the project takes it, or add it to a line "Not taken: \`${n}\` (<why it does not apply here>)." under it`);
    }
  }
  return out;
}

const readDir = dir => Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort().map(f => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
// The names of the modules of the core, or of a copy of it, at `home`.
export const moduleNames = home => MODULES.flatMap(d => fs.readdirSync(path.join(home, d)).filter(f => f.endsWith(".md"))).sort();

// The notes of the project at `root` whose copy is at `home`, read against the copy's modules (attached.mjs reads them
// too); throws where either cannot be read.
export function projectNotes(root, home) {
  // (the modules, by name, from each folder that holds them)
  const where = Object.fromEntries(MODULES.flatMap(d => Object.keys(readDir(path.join(home, d))).map(n => [n, d])));
  const moduleTexts = Object.assign({}, ...MODULES.map(d => readDir(path.join(home, d))));
  return notes({ manifest: fs.readFileSync(path.join(root, "core-manifest.md"), "utf8"), moduleTexts, where, movedTo: movedModules(home) });
}

function main() {
  const core = process.argv.includes("--core");
  const here = path.dirname(fileURLToPath(import.meta.url));
  let root = path.resolve(here, core ? ".." : "../..");
  try {
    root = projectAt(here).root || execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const home = core ? root : path.join(root, copyOf(root));
    if (core) {
      const found = markGaps(fs.readFileSync(path.join(home, "README.md"), "utf8"), f => !path.isAbsolute(f) && !f.split("/").includes("..") && fs.existsSync(path.join(home, f)));
      for (const f of found) console.error(`FAIL: ${logged(f)}`);
      if (found.length) return 1;
      console.log("each slot of the README's table carries its mark: read by a reader that stands here, or a default");
      return 0;
    }
    const found = projectNotes(root, home);
    // (a manifest's text is data: a control character, a lone carriage return too, would start a line of its own in the
    // log, and a line led by "::" is a command to the runner)
    for (const f of found) console.log(`note ${logged(f)}`);
    console.log(found.length ? `note ${found.length} lines of the manifest to add; nothing fails over them (AGENTS.md of the core, "Nothing locks a project")` : "ok   the manifest takes or leaves out each module");
  } catch (e) {
    // (a project that cannot be read this way is told so, never failed over it)
    // (the error is Node's, which names the file by its place on this machine: it is named from the project's root)
    const said = logged(unrooted(e.message, root));
    if (core) { console.error(`FAIL: the core's README.md could not be read (${said}). Mend: run it from a clone of the core, where it stands`); return 1; }
    console.log(`note the manifest could not be read against the modules (${said})`);
  }
  return 0;
}

if (started(import.meta.url)) process.exitCode = main();
