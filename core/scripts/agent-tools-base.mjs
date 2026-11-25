// What a pull request changes against its base, for the agent-tools check: a pin, a source or an entry that differs from
// what the base held, and a link or a hook the base held the same way, each found by reading the base's own files
// (agent-tools-project.mjs, agent-tools-listing.mjs).
import path from "node:path";
import { execFileSync } from "node:child_process";
import { textAt, objectAt as objectIn } from "./git-objects.mjs";
import { canonical, show, markOf, fold, describe } from "./agent-tools-entries.mjs";
import { listing, LISTING_MAX } from "./agent-tools-listing.mjs";
import { whereToolsRead, TOOL_FILES, READS } from "./agent-tools-links.mjs";
import { agentFile, readProject } from "./agent-tools-project.mjs";

// The config as the base held it, parsed, or null where it held none as a JSON object.
export function configAtBase(root, base, file) {
  if (!base) return null;
  try {
    const held = JSON.parse(textAt(root, base, path.relative(root, path.resolve(root, file)).split(path.sep).join("/")) ?? "null");
    return held && typeof held === "object" && !Array.isArray(held) ? held : null;
  } catch { return null; }
}
// What stood before the check read more, which is noted, not failed, where a list stands and a base is read (never in
// the core's own repository): a tool the base held as it stands, which its list did not name either, and a tool's
// file's problem the base held, the file's text the same letter for letter (Kiro's and Codex's files are read since #407).
export function heldBefore(checked, { head, baseProject, baseList, held, core, mended = null }) {
  if (core || !baseProject) return new Set();
  // (a file's problem as the base held it, or as it held it with a link's files read in the link's place: mendedBase())
  const sameUnread = p => head.texts.has(p) && [baseProject, mended].some(b => b?.texts.get(p) === head.texts.get(p));
  // (and an entry nothing configures where the base, read alike, configured nothing of that name either: a tool behind a
  // link the base held, which no reading here follows, among them)
  const unseen = checked.unconfigured.filter(([k]) => baseList?.keys.has(k) && !baseProject.tools.has(k));
  return new Set([...checked.missing.filter(([k]) => held(k) && !baseList?.keys.has(k)).map(([, problem]) => problem), ...unseen.map(([, problem]) => problem), ...head.problems.filter(sameUnread)]);
}
// Each pin breach into `fail` or `notes`: one the base held as it stands (or with a link's files in its place), the tool's whole configuration (its source or
// package, not only its pin) and its entry both unchanged, is noted, and so is each where there is no base, as on a
// push; in the core's own repository none may stand. A list written for the first time is held to an exact pin at once,
// its entry being the pull request's own text, while a tool its base fetched at no fixed version is noted.
export function sortPins(pins, { head, list, baseProject, baseList, core, mended = null }, fail, notes) {
  for (const [k, problem] of pins) {
    const entry = baseList ? baseList.versions.get(k) === list.versions.get(k) : !head.pins.get(k).pin;
    // (as the base pinned it, or as it pinned it with a link's files read in the link's place: mendedBase())
    const same = baseProject && [baseProject, mended].some(b => b && canonical(b.pins.get(k) ?? null) === canonical(head.pins.get(k))) && entry;
    if (core || (baseProject && !same)) fail.push(problem);
    else notes.push(`${baseProject ? "as the base held it" : "with no base to read against"}, nothing fails here: ${problem.replace(". Mend: ", ". To mend: ")}`);
  }
}
// Each hook that takes a file of the project from the working tree into `fail` or `notes`. One that stood in the base,
// the same hook taking the same files, is noted, and so is each where there is no base: unmarked where the base did
// not mark it either (the list unwritten, or written before the check read where a hook's command comes from), and
// marked in its entry, "from": "the working tree", or "main" where its command fetches from main, which lists it in the
// baseline. A new one fails, marked or not, and so does one whose mark the pull request took out while it stands: the
// baseline only shrinks. In the core's own repository none may stand.
export function sortSources({ sources, marked }, { head, baseProject, baseList, core, file, mended = null }, fail, notes) {
  // (as the base held it, or as it held it with a link's files read in the link's place, where the pull request replaced
  // it with them: mendedBase())
  const held = heldBy(head, baseProject, mended), stood = k => !!baseProject && held(k) && (baseProject.sources.has(k) || !!mended?.sources.has(k));
  for (const [k, problem] of sources) {
    if (!core && !baseProject) notes.push(`with no base to read against, nothing fails here: ${problem.replace(". Mend: ", ". To mend: ")}`);
    else if (!core && stood(k) && !baseList?.from.has(k)) notes.push(`as the base held it, nothing fails here: ${problem.replace(". Mend: ", ". To mend: ")}; or, to list it in the baseline, give its entry in ${file} "from": ${show(markOf(head.sources.get(k)))}`);
    else fail.push(problem);
  }
  // (each with its own mend: a setting no starter kit writes is taken out or moved, a hook rewritten in the kit's form)
  for (const [k, said, how, mark] of marked) {
    if (core) fail.push(`${said}, and in the core's own repository none may stand. Mend: ${how}, and take "from" out of its entry, in this pull request`);
    else if (!baseProject || stood(k)) notes.push(`${said}: its entry lists it in the baseline ("from": ${show(mark)}), to be worked down`);
    else fail.push(`${said}, and its entry says "from": ${show(mark)}, but the base held no such hook, and the baseline lists only what stood before. Mend: ${how}, and take "from" out of its entry, in this pull request`);
  }
}
// The way the text `text` of the link `at` names from the checkout's root, read as a string and nothing followed: as
// Linux reads it, a backslash part of a name, and with `win`, as Windows does, either slash a separator; as { to, via },
// `to` the path it ends at ("." the checkout's root) and `via` each path a ".." steps back out of on the way, which Linux
// reads as what stands there, a link among them; null where it leaves the checkout or is a whole path.
function namedWay(at, text, win = false) {
  if (text === null || path.posix.isAbsolute(text) || path.win32.isAbsolute(text) || /^[A-Za-z]:/u.test(text)) return null;
  const here = path.posix.dirname(at).split("/").filter(n => n && n !== "."), via = [];
  for (const n of (win ? text.replace(/\\/gu, "/") : text).split("/")) {
    if (n === "" || n === ".") continue;
    if (n !== "..") { here.push(n); continue; }
    if (!here.length) return null;
    via.push(here.join("/"));
    here.pop();
  }
  return { to: here.join("/") || ".", via };
}
// The object git holds at `rev:at`, a folder's or a file's; null where it holds none there. Taken from the long-lived
// `cat-file --batch-check` where it finds one, else asked of `git rev-parse` alone (the batch says "missing" of a
// submodule's commit, which rev-parse names).
function objectAt(root, rev, at) {
  const held = objectIn(root, rev, at)?.oid;
  if (held) return held;
  try { return execFileSync("git", ["--no-replace-objects", "rev-parse", "-q", "--verify", `${rev}:${at}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null; } catch { return null; }
}
// Each link the base held where a tool reads its files that the pull request replaced with the very file or folder it
// named, as [the link's path, the path its text names]: what HEAD holds at its path is git's same object as what the
// base held at that path, each step on its way a plain folder of the base's.
function replaced(root, base) {
  const was = listing(root, base), now = listing(root, "HEAD"), out = [];
  for (const at of was.links.filter(p => whereToolsRead(p) && !now.linked.has(p))) {
    const text = textAt(root, base, at) ?? null, here = objectAt(root, "HEAD", at);
    // (each step a ".." steps back out of a plain folder of the base's, so the text's words name what Linux reads too)
    const way = here && [false, true].map(win => namedWay(at, text, win)).find(w => w && w.to !== "." && w.via.every(v => was.dirs.has(v)) && objectAt(root, base, w.to) === here), to = way?.to;
    if (to) out.push([at, to]);
  }
  return out;
}
// The base as it configures its tools with each such link's files read in its place (replaced()), or null where the pull
// request replaced none, or there is no base: a tool the pull request configures there, and a hook that takes a file from the working tree, is
// the base's only where it is the same, read with all the base's other files, so a file of the pull request's that makes
// it another (a plug-in's marketplace, say) is new.
export function mendedBase(root, base) {
  const mended = base ? replaced(root, base) : [];
  if (!mended.length) return null;
  const alias = f => { const m = mended.find(([at]) => f === at || f.startsWith(`${at}/`)); return m ? `${m[1]}${f.slice(m[0].length)}` : f; };
  const { blobs } = listing(root, base);
  alias.markdown = mended.flatMap(([at, to]) => [...blobs].filter(b => b === to || b.startsWith(`${to}/`)).map(b => `${at}${b.slice(to.length)}`)).filter(agentFile);
  return readProject(root, base, () => false, alias);
}
// Each tool's id a project as read() gives it configures.
const idsOf = project => new Set(project ? [...project.ids.values()].flatMap(set => [...set]) : []);
// Each link the base held where a tool reads its files, standing as it stood (noted, never failed), into `fail` where the
// pull request changes what stands where its text leads, read as a string as Linux reads it and again as Windows does,
// nothing followed (namedWay()): an entry on that way, a link or submodule below where it ends, or a file there whose path
// through the link is one a tool reads. One whose way the commit holds a link on is reported past it, and one that leaves
// the checkout or names a whole path is reported, never failed.
export function sortBehind(root, base, fail, notes) {
  const was = listing(root, base), now = listing(root, "HEAD");
  const standing = now.links.filter(at => whereToolsRead(at) && was.linked.has(at) && was.ids.get(at) === now.ids.get(at));
  if (!standing.length) return;
  // (each entry the pull request changes, by its path and its modes before and after: `git diff --raw`, renames as an
  // entry taken out and one put in, and every submodule's change shown whatever the project's .gitmodules says)
  let raw = "";
  try { raw = execFileSync("git", ["--no-replace-objects", "diff", "--raw", "--no-renames", "--ignore-submodules=none", "-z", base, "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: LISTING_MAX }); } catch { raw = null; }
  const parts = raw?.split("\0") ?? [], changed = [];
  for (let i = 0; i + 1 < parts.length; i += 2) changed.push({ modes: parts[i].slice(1).split(" ").slice(0, 2), at: parts[i + 1] });
  // (each path either commit holds, a folder or an entry, folded, so a way that ends where neither holds anything is
  // known: where an install puts what a tool reads, as node_modules or a virtual environment)
  const holds = new Set([was, now].flatMap(l => [...l.dirs, ...l.ids.keys()]).map(fold));
  for (const at of standing) {
    const text = textAt(root, "HEAD", at) ?? null, ways = [false, true].map(win => namedWay(at, text, win));
    for (const key of new Set(ways.map(w => JSON.stringify(w)))) behindOne(at, JSON.parse(key), { was, now, raw, changed, holds }, fail, notes);
  }
}
// One such link `at`, by the way `way` its text names, as sortBehind() reads it.
function behindOne(at, way, { was, now, raw, changed, holds }, fail, notes) {
  const odd = m => m === "120000" || m === "160000", reads = low => TOOL_FILES.includes(low) || READS.test(low);
  const said = `${show(at)} is a link where an agent tool reads its files, which the base held`;
  if (!way) { notes.push(`${said}, and its text leaves the checkout or names a whole path, so what this pull request changes where it leads is not read: reported, never failed. Replace the link with the file or folder it leads to, committed in the project`); return; }
  if (raw === null) { fail.push(`${said}, and git cannot say what this pull request changes, so what changes behind the link is not read. Mend: run the check again; where it fails the same way, replace the link with the file or folder it leads to, committed in the project, in this pull request`); return; }
  const t = way.to === "." ? "" : fold(way.to), below = t ? `${t}/` : "", steps = [...way.via, ...(t ? t.split("/").map((_, i, s) => s.slice(0, i + 1).join("/")) : [])];
  const unread = steps.some(p => was.linked.has(p) || now.linked.has(p));
  // (an entry changed on the way, at a step a ".." steps back out of, or where the way ends, a link put there among them,
  // fails; and below where it ends, a link or submodule, or a file a tool reads there through the link)
  const hit = changed.find(c => {
    const low = fold(c.at);
    if (steps.map(fold).some(s => low === s || s.startsWith(`${low}/`))) return true;
    return low.startsWith(below) && (c.modes.some(odd) || reads(`${fold(at)}/${low.slice(below.length)}`));
  });
  // (and where the way ends where neither commit holds anything, an install fills it, from files no list here can name
  // in full, so what a tool reads there is reported, never failed)
  const filled = !!t && !holds.has(t);
  if (hit) fail.push(`${said}, and this pull request changes ${show(hit.at)}, which an agent tool reads through it while this check follows no link. Mend: replace the link with the file or folder it leads to, committed in the project, in this pull request`);
  else if (unread) notes.push(`${said}, and the way to what its text names passes a link, which this check does not follow, so what this pull request changes past it is not read: reported, never failed. Replace the link with the file or folder it leads to, committed in the project`);
  else if (filled) notes.push(`${said}, and its text names a path neither commit holds anything at: one an install fills (node_modules, a virtual environment), so what an install puts there, which this check cannot read, may change what an agent tool reads through it, or one where nothing stands at all: reported, never failed. Replace the link with the file or folder it leads to, committed in the project`);
}
// Whether the base held the tool `k` the head configures: as it stands, or as the base configures it with a link's files
// read in its place, where the pull request put in that link's place the very files it named (mendedBase()), since
// replacing such a link is its mend, and what was behind it stood before.
export function heldBy(head, baseProject, mended) {
  const before = idsOf(baseProject), after = idsOf(mended);
  return k => [...head.ids.get(k)].every(id => before.has(id) || after.has(id));
}
// Each tool configured where no list is written yet, into `fail` or `notes`: the base counts as the list, so one it
// held is noted, as each is where there is no base, and one new in the pull request fails.
export function sortUnlisted(unlisted, { head, base, held, file }, fail, notes) {
  if (!unlisted.length) return;
  if (!base) {
    notes.push(`${file} holds no "agentTools" yet, so nothing fails here; not listed: ${unlisted.map(describe).join(", ")}. Write the list as the sync note of 16 November 2026 says`);
    return;
  }
  for (const k of unlisted) {
    if (held(k)) continue;
    fail.push(`${describe(k)}, configured in ${head.tools.get(k)}, is new in this pull request and listed nowhere. Mend: list it under "agentTools" in ${file}, with every tool the project configures, each with its publisher and, for a plug-in or tool server, one exact version, in this pull request, where its task names it; else take it out`);
  }
  if (unlisted.some(held)) notes.push(`not listed, as the base held them: ${unlisted.filter(held).map(describe).join(", ")}. Write the list as the sync note of 16 November 2026 says`);
}
