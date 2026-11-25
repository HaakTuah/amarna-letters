// What the step of the rules' move reads: which of the paths the rules left a project's own files still name
// (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words they share). Each piece takes the
// project as steps.mjs's `project` reads it and returns the mend, or null where the step is done; a step names the
// ones it needs, none runs by itself, and the step's writer (step-writers.mjs) reads the project with the same pieces. It reads only. Node's own modules and git only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { copiesConfig, marksConfig } from "./check-configs.mjs";
import { BEGIN, BLOCKS, END } from "./core-owned.mjs";
import { atCopy } from "./core-path.mjs";
import { ruleFiles } from "./rule-files.mjs";
import { copyAt } from "./workflow-calls.mjs";
import { HERE, shown } from "./step-checks.mjs";

// The core's files that moved to folders that say who reads them or when (#304, point 8), old path to new, as the
// files that point from the old paths say it themselves: each says, under its title, which file or folder "holds these
// rules now", as a link whose text is the path from the core's root, in backticks.
export function moved(core = HERE) {
  const out = {};
  for (const old of [...(fs.existsSync(path.join(core, "modules")) ? fs.readdirSync(path.join(core, "modules")).filter(f => f.endsWith(".md")).map(f => `modules/${f}`) : []), "floor/topics.md"]) {
    let text = "";
    try { text = fs.readFileSync(path.join(core, old), "utf8"); } catch { continue; }
    const to = /^\[`([^`\s]+)`\]\([^)\s]+\) holds these rules now/mu.exec(text)?.[1];
    if (to) out[old] = to;
  }
  return out;
}
// The modules that left modules/, by their old name, each to the path its text went to: { "<name>.md": path }, which
// names a manifest's "Modules:" line may still hold (#1259, point 1).
export const movedModules = (core = HERE) => Object.fromEntries(Object.entries(moved(core)).filter(([old]) => old.startsWith("modules/")).map(([old, to]) => [old.slice("modules/".length), to]));
// What a file at an old path says stands elsewhere than the rest of it, in its lines "Now in [`<path>`](..): **<lead>**.":
// { old path: [{ lead, to }] }.
moved.apart = (core = HERE) => Object.fromEntries(Object.keys(moved(core)).map(old => {
  let text = "";
  try { text = fs.readFileSync(path.join(core, old), "utf8"); } catch { /* (gone since it was listed) */ }
  return [old, [...text.matchAll(/^Now in \[`([^`\s]+)`\]\([^)\s]+\): \*\*([^*]+?)\*\*\.$/gmu)].map(m => ({ to: m[1], lead: m[2] }))];
}).filter(([, parts]) => parts.length));

// The folder of the modules as a copies config's pattern names it, and the patterns of the folders the rules stand in
// now, which join it: the copies check lets a config read more, never less, so the old pattern stays while the files
// that point stand at the old paths.
export const MOVED_GLOB = '"core/modules/*.md"', NEW_GLOBS = ['"core/floor/topics/*.md"', '"core/roles/*.md"', '"core/roles/shared/*.md"', '"core/tasks/*.md"', '"core/tools/*.md"'], MOVED_GLOBS = NEW_GLOBS.join(", ");

// A dated record of the project's own, which stays as it stands: a file of prose (.md or .txt) whose name opens with a
// day (2026-11-16...), or one in a folder named archive, reports or records. What lies at the root under a name that
// opens with a dot is read all the same (namers): there a host and the tools keep what they read.
const dated = f => /\.(md|txt)$/u.test(f) && (/(^|\/)\d{4}-\d{2}-\d{2}[^/]*$/u.test(f) || /(^|\/)(archive|reports|records)\//u.test(f));

// The project's own files that may name a file of the core and that a check, a tool or a session reads as they stand
// now: each rule file and each file a tool takes its instructions from, whatever its name or folder; every file at the
// root whose name, or whose folder's, opens with a dot, where tools keep what they read, whatever its name; and every
// other file of text that is no dated record. Left out: what git's attributes mark as a tool's output (`generated`),
// save a rule file, which a tool reads all the same.
const rulesOf = p => {
  try { return ruleFiles(p.read, dir => p.files.filter(f => f.startsWith(`${dir}/`)), { tools: true }); } catch { return []; } // (no list of rule files yet: the files of text alone)
};
export function namers(p) {
  const rules = rulesOf(p);
  const some = p.files.filter(f => !f.startsWith(copyAt(p)) && (rules.includes(f) || /^\.[^/]/u.test(f) || (/\.(?:md|json|ya?ml|mjs|cjs|js|ts|sh|txt|toml)$/u.test(f) && !dated(f))));
  const { made } = attributed(p.root, some);
  return some.filter(f => rules.includes(f) || !made.has(f));
}

// Of `files`, as the project's git attributes give `linguist-generated` and `linguist-vendored`, as GitHub reads them:
// `made`, those either marks (a tool writes them, and the project keeps them as it writes them, so no path in them is the
// step's to name: #1248, point 5), and `own`, those either gives a value that marks them not (unset or false), so the
// project says they are its own (#1272, point 3). Where git cannot say (no repository), none of either.
function attributed(root, files) {
  const made = new Set(), own = new Set();
  if (!root || !files.length) return { made, own };
  const r = spawnSync("git", ["check-attr", "-z", "--stdin", "linguist-generated", "linguist-vendored"], { cwd: root, input: files.join("\0"), encoding: "utf8", maxBuffer: 1 << 28 });
  const parts = r.status === 0 ? r.stdout.split("\0") : [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    if (["unset", "false"].includes(parts[i + 2])) own.add(parts[i]);
    else if (parts[i + 2] !== "unspecified") made.add(parts[i]);
  }
  for (const f of made) own.delete(f);
  return { made, own };
}

// A text cut round the core's part (#1272, point 1): [before, part, after] where its marks stand once each, in order;
// [text] where it has none; null where they stand more than once or apart, so that which part is the core's cannot be
// told.
export function cut(text) {
  const b = text.indexOf(BEGIN), e = text.indexOf(END);
  if (b < 0 && e < 0) return [text];
  return b < 0 || e < b || text.includes(BEGIN, b + 1) || text.includes(END, e + 1) ? null : [text.slice(0, b), text.slice(b, e + END.length), text.slice(e + END.length)];
}
// The file `f`'s text cut so: only the root's AGENTS.md and CLAUDE.md hold a part, which the one process writes
// (converge.mjs) and no step's writer does; in any other file the marks are the project's text, read whole.
export const partCut = (f, text) => (BLOCKS.includes(f) ? cut(text) : [text]);
// (a file's own text: what lies outside the core's part, the whole where the part cannot be told apart)
const ownText = (f, text) => { const c = partCut(f, text); return c?.length === 3 ? `${c[0]}\n${c[2]}` : text; };

// The step's own configs, which its writer writes as the step words them: the size marks, the copies check's config and
// the manifest, each where it can be read.
const configs = p => new Set(["core-manifest.md", ...[marksConfig, copiesConfig].flatMap(c => { try { return [c(p)]; } catch { return []; } })]);
// Of `files`, those the step's writer writes (step-writers.mjs, writeMoved): each rule file, each at the root under a
// dot and each of the step's configs; any other only where the project's git attributes mark it, by itself, as no
// tool's output, since until then a tool's output cannot be told from the project's own source (#1272, point 3).
export function sure(p, files) {
  const rules = new Set(rulesOf(p)), configured = configs(p), { own } = attributed(p.root, files);
  // (floor rule 3's rule files in any folder, even where SECURITY.md gives no list yet)
  return files.filter(f => rules.has(f) || /(?:^|\/)(?:AGENTS|CLAUDE|GEMINI)\.md$/u.test(f) || /^\.[^/]/u.test(f) || configured.has(f) || own.has(f));
}

// Of those, the files that name each old path outside the core's part: Map(old path -> [file]).
function namedStill(p, map) {
  const found = new Map(), old = new RegExp(`core/(${Object.keys(map).map(f => f.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|")})(?![\\w/-])`, "gu");
  for (const f of namers(p)) for (const m of ownText(f, p.read(f) ?? "").matchAll(old)) found.set(m[1], [...new Set([...(found.get(m[1]) ?? []), f])]);
  return found;
}

// A copies config that reads the old folder and not yet each folder the rules stand in, however its patterns are laid out.
// (the patterns as a project whose copy stands at `copy` holds them: #628)
export const readsOldAlone = (p, f, copy) => f.endsWith(".json") && (p.read(f) ?? "").includes(atCopy(MOVED_GLOB, copy)) && !NEW_GLOBS.every(g => (p.read(f) ?? "").includes(atCopy(g, copy)));

// Where two old paths now lead to one file, the word that it is named once; and, where a file a tool takes its
// instructions from by pulling files in (Kiro's steering, Antigravity's rules) still names an old path, that the step
// comes before any other task, since such a session reads each rule on one line's word until then.
const once = (found, map) => [...found.keys()].filter(a => [...found.keys()].some(b => b < a && map[b] === map[a])).map(a => `a file that named \`core/${a}\` beside the other path that now leads to \`core/${map[a]}\` names that file once`);

const first = found => ([...found.values()].flat().some(f => /^\.(kiro|agents?)\//u.test(f)) ? "Before any other task, since a tool whose entry file pulls the core's files in follows no further import, and its sessions read each rule on one line's word until this is done: in" : "In");

// Where a project's own files still name an old path of the core's, a copies config of its own the old folder's pattern
// alone, and its manifest's "Paths:" line the old folders: the mend, naming each file and each path's new one; null
// where none does.
export function movedPaths(p) {
  const map = moved(), found = Object.keys(map).length > 0 ? namedStill(p, map) : new Map(), said = files => files.map(f => `\`${shown(f)}\``).join(", ");
  const apart = from => (moved.apart()[from] ?? []).map(a => `, but its "${a.lead}" is now in \`core/${a.to}\``).join("");
  const wrong = [...found].map(([from, files]) => `\`core/${from}\` is now \`core/${map[from]}\`${map[from].endsWith("/") ? ", a file a topic: name the topic's own file" : ""}${apart(from)} (in ${said(files)})`).concat(once(found, map));
  const globs = Object.keys(map).length > 0 ? namers(p).filter(f => readsOldAlone(p, f, copyAt(p))) : [];
  if (globs.length) wrong.push(`after the pattern ${MOVED_GLOB} add the patterns ${MOVED_GLOBS}, leaving it where it is, since a copies config may read more and never less (in ${said(globs)})`);
  if (!/^Paths:.*\btasks\/.*\btools\//mu.test(p.manifest)) wrong.push('the "Paths:" line of `core-manifest.md` reads "one into floor/, roles/, tasks/, tools/, scripts/, setup/ or archive/ is under core/"');
  const named = [...new Set([...found.values()].flat())], written = new Set(sure(p, named)), unsure = named.filter(f => !written.has(f));
  const marks = unsure.length ? ` The step's writer (\`node core/scripts/steps.mjs --write\`) leaves ${said(unsure)}, since until the project's \`.gitattributes\` gives a file \`linguist-generated\` or \`linguist-vendored\` it cannot tell a tool's output from the project's own source: add to it the line \`* -linguist-generated\`, after it mark each folder a tool writes \`linguist-generated\` (or \`linguist-vendored\`), and run it again.` : "";
  return wrong.length ? `${first(found)} one pull request, name each of the core's files by the path it now has: ${wrong.join("; ")}.${marks}` : null;
}
