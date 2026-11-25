// The project's rule files, so the list stands in one place: those floor rule 3 names (`AGENTS.md`, `CLAUDE.md`,
// `SECURITY.md` and the core manifest, where they exist), and those its SECURITY.md adds in rule 3 (its "the rule
// files:" line, ended by ";"). With `{ tools: true }` it adds the files an agent tool takes its instructions from
// (floor rule 3; tasks/tools.md; `toolFiles`): GEMINI.md, the entry files the starter kit writes for Kiro and
// Antigravity (ENTRY_FILES, which entry-files.mjs beside this file reads), and every file git tracks under a tool's
// folders of instructions (FOLDERS). The copies and pointer checks (copies.mjs, pointers.mjs), the code-review wait and
// the state report read them all; what a project held in a tool's files before the two checks read them is kept as a
// baseline there (AGENTS.md of the core, "Nothing locks a project"; #405). Run from the project's root. Node's own
// modules and git only. `read` gives a file's text, or null where it is not there, and `list` the files git tracks
// under a folder: by default the work tree's, each a file of the project's own that no link leads out of (guards.mjs),
// and a check passes a `read` and a `list` that read a commit's tree, to hold the base's list.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { leadsOut } from "./guards.mjs";
// Each agent tool's entry file, as the starter kit writes it (tasks/tools.md, "One door in").
export const ENTRY_FILES = Object.freeze({ claude: "CLAUDE.md", kiro: ".kiro/steering/core.md", antigravity: ".agents/rules/core.md" });
// The folders a tool takes its instructions from (floor rule 3; tools/kiro.md and antigravity.md): every file in them.
export const FOLDERS = Object.freeze([".kiro/steering", ".kiro/agents", ".agents/rules", ".agent/rules"]);
// (a file of the work tree is read only where, every link on its way followed, it lies inside the project and is a
// file: one that leads out, or to a folder, reads as not there)
const inside = f => !leadsOut(process.cwd(), f);
const tracked = dir => { try { return execFileSync("git", ["ls-files", "-z", "--", dir], { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(f => f && inside(f)); } catch { return []; } };
export const readHere = f => { try { return inside(f) && fs.statSync(f).isFile() ? fs.readFileSync(f, "utf8") : null; } catch { return null; } };
export const FLOOR = Object.freeze(["AGENTS.md", "CLAUDE.md", "SECURITY.md", "core-manifest.md"]);
export const TOOL_FILES = Object.freeze(["GEMINI.md", ...Object.values(ENTRY_FILES)]);
// A reader of the files of a commit's tree, as the work tree's reader reads them, for a check that holds a pull request
// to its base: every link on a path followed, the file's own and a folder's on its way, while it leads inside that tree,
// at most 40 in all; null where one leads out of it or nowhere, and for what is no file (a folder, a submodule). Run
// from the project's root.
export function readAt(commit) {
  const run = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  let modes = null;
  const mode = f => {
    if (!modes) {
      modes = new Map();
      try { for (const e of run(["ls-tree", "-r", "-z", commit]).split("\0")) { const m = /^(\d+) \S+ \S+\t([\s\S]+)$/u.exec(e); if (m) modes.set(m[2], m[1]); } } catch { /* (no such commit: nothing there) */ }
    }
    return modes.get(f);
  };
  const show = at => { try { return run(["show", `${commit}:${at}`]); } catch { return null; } };
  return f => {
    for (let at = path.posix.normalize(f), hops = 0; hops <= 40; hops++) {
      if (at === ".." || at.startsWith("../") || at.startsWith("/")) return null;
      // (the first part of the path, its own end included, that is a link: what stands there is read through it)
      const parts = at.split("/"), k = parts.findIndex((_, i) => mode(parts.slice(0, i + 1).join("/")) === "120000");
      if (k < 0) return /^100/u.test(mode(at) ?? "") ? show(at) : null;
      const link = parts.slice(0, k + 1).join("/"), to = show(link);
      if (to === null || /^([\\/]|[A-Za-z]:)/u.test(to)) return null;
      at = path.posix.normalize(path.posix.join(path.posix.dirname(link), to.replace(/\\/gu, "/"), ...parts.slice(k + 1)));
    }
    return null;
  };
}
// The files an agent tool takes its instructions from, as `read` and `list` find them: those of TOOL_FILES, then those
// git tracks under FOLDERS, each that `read` reads (so a link that leads out of the project is none, at a commit too).
export const toolFiles = (read = readHere, list = tracked) => TOOL_FILES.concat(FOLDERS.flatMap(d => list(d))).filter(f => read(f) !== null);
// A rule file or protected folder by its name alone (floor rule 3): what a tool takes its instructions from, wherever
// it lies, the threat model, the manifest, the copy of the core, and the folders of what runs by itself.
export const RULES = /(?:^|\/)(?:AGENTS|CLAUDE|SECURITY|GEMINI|REVIEW)(?:\.[\w-]+)?\.md$|threat-model|^core-manifest\.md$|^core\/|(?:^|\/)\.(?:github|claude|agents?)\//iu;

export function ruleFiles(read = readHere, list = tracked, { tools = false } = {}) {
  const security = read("SECURITY.md");
  if (security === null) throw new Error('the project has no SECURITY.md yet, where the checks read its rule files. Mend: write it from the starter kit\'s template (core/setup/template/SECURITY.md.tmpl), its rule 3 with the line "**the rule files:** ...;"');
  const rule = /\*\*the rule files:\*\*([^;]*);/.exec(security);
  if (!rule) throw new Error('SECURITY.md, rule 3, has no "the rule files:" line, where the checks read the project\'s own. Mend: add to rule 3 the line "**the rule files:** `<each file>`, ...;" as the starter kit\'s template (core/setup/template/SECURITY.md.tmpl) writes it');
  const own = tools ? toolFiles(read, list) : [];
  return [...new Set(FLOOR.filter(f => read(f) !== null).concat(own, [...rule[1].matchAll(/`([^`]+)`/g)].map(m => m[1])))];
}
