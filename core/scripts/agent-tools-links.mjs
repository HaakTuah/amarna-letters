// No link is followed, since what a tool reaches through one differs by the system that resolves it: a link (git's mode
// 120000) where a tool reads its files, at a tool's file or folder, on the way to one or below a tool's folder, in
// whatever case, fails where the pull request adds or changes it, whatever it leads to; one the base held, the same link
// to the same target, is noted, and fails only where the pull request changes what stands at the path its text names,
// read as a string (sortBehind(), in agent-tools-base.mjs), and one into what an install fills is reported; one replaced
// with the very files it named is its mend, what they configure standing as the base's. A tool's file, or a folder on its way, in another
// letter case, as the commit holds it, fails, as the tool may read it, save one the base held while what the tool reads
// through it stands; so does a submodule where a tool reads its files, save one the base held at that commit. So does a
// variable a tool's settings set (Claude Code's "env", Codex's shell environment policy) but those KEPT lists, in
// agent-tools-codex.mjs, any other of which may change how the programs a hook runs start, save one the base held while
// its entry stands.
import path from "node:path";
import { corePath } from "./core-path.mjs";
import { fold, show } from "./agent-tools-entries.mjs";
import { listing, commitReader } from "./agent-tools-listing.mjs";

// The problems read from the commit `rev` itself, each as [its problem, what holds it]: a link where a tool reads its
// files, a tool's file in another case, a submodule where a tool reads, and a folder of Claude Code's below the root.
export const commitProblems = (root, rev) => [...linkProblems(root, rev), ...caseProblems(root, rev), ...submodules(root, rev), ...nestedClaude(root, rev)];
// Whether a path, in whatever case, is where an agent tool reads its files: a tool's file or folder, a step on the way to
// one, or anything below a tool's folder.
export const whereToolsRead = at => { const low = fold(at); return WAYS.has(low) || TOOL_FOLDERS.some(d => low.startsWith(d)); };
// Each link where an agent tool reads its files, as [its problem, the link and its target]. Git's own record says what
// is a link (its mode 120000), and nothing is followed: a tool reaches through a link whatever the system it runs on
// resolves (Linux, Windows, a file system that ignores case or folds Unicode's forms, an install that fills
// node_modules), which no reading here can match. So a link the pull request adds or changes fails, whatever it leads to;
// one the base held, at the same path to the same target, is noted while it stands (heldBefore()), what it leads to unread;
// and in the core's own repository none may stand.
function linkProblems(root, rev) {
  const l = listing(root, rev);
  return l.links.filter(whereToolsRead).map(at => [`${show(at)} is a link where an agent tool reads its files, and this check follows no link, so nothing it leads to is read. Mend: replace the link with the file or folder it leads to, committed in the project, in this pull request`, `${at}\0${l.ids.get(at)}`]);
}
// Each path on the way to a tool's file that stands in another case at the commit `rev`, as [its problem, what the tool
// reads through it], so one the base held is noted only while that stands letter for letter.
function caseProblems(root, rev) {
  const { resolve, names, holds } = commitReader(root, rev), typeOf = f => resolve(f)?.type;
  const below = p => belowDir(root, rev, p);
  return misnamed(toolPaths(names, typeOf, below)).map(([at, want]) =>
    [`${at} is ${want} in another case, which an agent tool reads in its place where the file system ignores case, as macOS's and Windows' do, while this check reads ${want} alone. Mend: rename it to ${want}, in this pull request`, through(at, want, holds, names, typeOf, below)]);
}
// Each submodule where an agent tool reads its files, in whatever case, as [its problem, the commit it names]: git gives
// this check none of what it holds, and a clone that brings in its submodules gives the tool all of it, so one the base
// held is noted while it names that commit.
function submodules(root, rev) {
  return [...listing(root, rev).gitlinks].filter(([at]) => whereToolsRead(at)).map(([at, id]) => [`${at} is a submodule where an agent tool reads its files, and this check reads none of what it holds. Mend: put those files in the project itself, or take the submodule out, in this pull request`, `${at}\0${id}`]);
}
// Each folder of Claude Code's below the project's root, in whatever case, a folder, a link or a submodule, as [its
// problem, all it holds]: Claude Code reads its settings, agents, skills and commands where it works in that folder, and
// this check reads only the root's, so one the base held is noted while all it holds stands, each entry the commit lists
// there by its object.
// The core's copy, where the manifest names one, is left out: core.yml holds it to the core's own commit, whose .claude is
// the core's. With no manifest, as in the core's own repository, nothing is left out.
function nestedClaude(root, rev) {
  const l = listing(root, rev), found = new Set(), copy = corePath(root);
  for (const at of l.ids.keys()) {
    if (copy && at.startsWith(copy)) continue;
    // (found a name at a time, so a name in any normal form is cut where it stands)
    const parts = at.split("/"), i = parts.findIndex((n, k) => k > 0 && fold(n) === ".claude");
    if (i > 0) found.add(parts.slice(0, i + 1).join("/"));
  }
  const holds = at => [at, l.ids.get(at) ?? "", ...entriesBelow(l, at).map(p => `${p}\0${l.ids.get(p)}`)].join("\0");
  return [...found].sort().map(at => [`${at} is a folder of Claude Code's below the project's root, whose settings, agents, skills and commands it reads where it works in that folder, while this check reads only the project root's. Mend: move what it holds into the root's .claude folder, or take it out, in this pull request`, holds(at)]);
}
// Each entry a listing holds below the folder `dir` ("" the root), from the listing's names sorted once, by a binary
// search for where they begin, so a folder's entries cost what they are, not the whole listing.
function entriesBelow(l, dir) {
  l.sorted ??= [...l.ids.keys()].sort();
  const prefix = dir ? `${dir}/` : "", out = [];
  let lo = 0, hi = l.sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (l.sorted[mid] < prefix) lo = mid + 1; else hi = mid; }
  for (let i = lo; i < l.sorted.length && l.sorted[i].startsWith(prefix); i++) out.push(l.sorted[i]);
  return out;
}
// What the commit holds below the folder `p`, each entry but a folder, from its one listing, where `p` is a folder the
// commit holds; else null.
function belowDir(root, rev, p) {
  const l = listing(root, rev);
  return l.dirs.has(p) ? entriesBelow(l, p) : null;
}
// The tools' files this check reads, and their folders, as each tool names them.
export const TOOL_FILES = [".claude/settings.json", ".claude/settings.local.json", ".mcp.json", ".kiro/settings/mcp.json", ".codex/hooks.json", ".codex/config.toml"];
const TOOL_FOLDERS = [".claude/skills/", ".claude/agents/", ".claude/commands/", ".kiro/hooks/"];
// Each step on the way to a tool's file or folder (.codex, .kiro/settings, .claude/skills and the files themselves).
const WAYS = new Set([...TOOL_FILES, ...TOOL_FOLDERS.map(d => d.slice(0, -1))].flatMap(f => f.split("/").map((_, i, parts) => parts.slice(0, i + 1).join("/"))));
// Each path of `paths`, or step on its way, a folder or a link among them, that names one of those in another case, and
// each hook file of Kiro's whose ".json" is, and each skill's SKILL.md, as [the path, the name the check reads]: a file
// system that ignores case gives the tool what this check passes by.
function misnamed(paths) {
  const out = new Map();
  for (const at of paths) {
    const parts = at.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const step = parts.slice(0, i).join("/"), low = fold(step);
      if (WAYS.has(low) && step !== low) { out.set(step, low); break; }
    }
    if (path.posix.dirname(at) === ".kiro/hooks" && /\.json$/iu.test(at) && !at.endsWith(".json")) out.set(at, at.replace(/\.json$/iu, ".json"));
    if (/^\.claude\/(?:agents|commands)\//u.test(at) && /\.md$/iu.test(at) && !at.endsWith(".md")) out.set(at, at.replace(/\.md$/iu, ".md"));
    if (parts.length === 4 && at.startsWith(".claude/skills/") && fold(parts[3]) === "skill.md" && parts[3] !== "SKILL.md") out.set(at, `${parts.slice(0, 3).join("/")}/SKILL.md`);
  }
  return [...out];
}
// What a tool reads through `at`, a path in another case that stands for `want`: each tool file under it, and each entry
// of a tool folder under it with its text (and a skill's SKILL.md), so one the base held is noted only while that stands.
// Each step below `at` is found among its folder's own names, in whatever case they stand, as a file system that
// ignores case finds it, every one that matches.
function through(at, want, holds, names, typeOf, below = () => null) {
  const under = f => f === want || f.startsWith(`${want}/`);
  // (an entry on the way that is neither a folder nor a file, a link out or a submodule's among them, stops the walk
  // there and is held by what stands there, as a tool's file is)
  const stops = new Set(), plain = new Set();
  const found = (from, rest) => rest.split("/").filter(Boolean).reduce((dirs, step, i, steps) => dirs.flatMap(d => names(d).filter(n => fold(n) === fold(step)).sort().map(n => `${d}/${n}`)).filter(p => {
    // (a plain file on the way gives the tool nothing to read there, so it is held by standing there alone, not by its
    // text)
    const type = typeOf(p);
    if (i === steps.length - 1 || type === "tree") return true;
    (type === "blob" ? plain : stops).add(p);
    return false;
  }), [from]);
  // (each entry by what it holds, a file's text or what else stands there, so one added, taken out or changed is seen)
  const text = (name, a) => [`${name}\0${a}\0${holds(a)}`];
  const files = TOOL_FILES.filter(under).flatMap(f => found(at, f.slice(want.length)).flatMap(a => text(f, a)));
  // (of a tool folder's entries, only what the tool reads there: a hook file of Kiro's, a skill's SKILL.md, and the
  // skill's folder itself where it is neither a file nor a folder, by what stands there, a link's target or a
  // submodule's commit)
  const folders = TOOL_FOLDERS.filter(d => under(d.slice(0, -1))).flatMap(d => found(at, d.slice(want.length, -1)).flatMap(dir => typeOf(dir) !== "tree" ? text(d, dir) : names(dir).sort().flatMap(n => {
    // (a Markdown file of Claude Code's agents or commands at any depth, as it finds them)
    // (below agents or commands, each Markdown file and link a folder the commit holds holds, from its listing, a link
    // being held by what stands there; a folder reached otherwise, by what stands there)
    const md = p => (typeOf(p) !== "tree" ? (/\.md$/iu.test(p) ? [p] : []) : (below(p) ?? [p]).filter(q => q === p || /\.md$/iu.test(q) || typeOf(q) !== "blob"));
    const reads = d === ".kiro/hooks/" ? (/\.json$/iu.test(n) ? [`${dir}/${n}`] : []) : d !== ".claude/skills/" ? md(`${dir}/${n}`, 0) : [...(["blob", "tree"].includes(typeOf(`${dir}/${n}`)) ? [] : [`${dir}/${n}`]), ...found(`${dir}/${n}`, "SKILL.md")];
    return reads.flatMap(a => text(`${d}${n}`, a));
  })));
  return [at, holds(at), ...files, ...folders, ...[...stops].sort().flatMap(a => text("on the way", a)), ...[...plain].sort().map(a => `a file on the way\0${a}`)].join("\0\0");
}
// The entries on the way to a tool's file, in whatever case they stand: each one the walk reaches as no folder, whose
// name folded is a step of WAYS or lies in a tool folder, a few deep, found through `names`, so a link inside the
// checkout is followed as the rest of the check follows it.
const MD_DIR = /^\.claude\/(?:agents|commands)\//u;
export const READS = /^(?:\.kiro\/hooks\/[^/]+\.json|\.claude\/(?:agents|commands)\/(?:[^/]+\/)*[^/]+\.md|\.claude\/skills\/[^/]+\/skill\.md)$/u, SKILL_DIR = /^\.claude\/skills\/[^/]+$/u;
// Whether a path, folded, is looked at: a step of WAYS, and, in a tool folder, only what the tool reads there, a skill's
// folder on its way, or a folder of agents or commands at any depth.
const looked = (low, inFolder) => (inFolder ? READS.test(low) || SKILL_DIR.test(low) || MD_DIR.test(low) : WAYS.has(low));
function toolPaths(names, typeOf, below = () => null) {
  const out = [], folders = TOOL_FOLDERS.map(d => d.slice(0, -1));
  const visit = (at, depth) => {
    for (const n of names(at || ".")) {
      const p = at ? `${at}/${n}` : n, low = fold(p), inFolder = folders.some(d => low.startsWith(`${d}/`));
      if (!looked(low, inFolder)) continue;
      // (whatever the walk reaches that is no folder is named, a file, a link that leads nowhere or out, a submodule's
      // entry; in a tool folder, only what the tool reads there, a hook file, a skill's SKILL.md, and a skill's folder
      // that is neither a folder nor a file, through which the tool may read a SKILL.md this check cannot)
      const type = typeOf(p), folder = type === "tree";
      if (!folder && (!inFolder || READS.test(low) || (SKILL_DIR.test(low) && type !== "blob"))) out.push(p);
      // (below a folder of agents or commands, each Markdown file a folder the commit holds holds, at any depth, from its
      // listing, a link there failing of its own (mdLinks()); any other way a few deep)
      if (folder && MD_DIR.test(low)) out.push(...(below(p) ?? []).filter(q => READS.test(fold(q))));
      else if (folder && depth < 10) visit(p, depth + 1);
    }
  };
  visit("", 0);
  return out;
}
