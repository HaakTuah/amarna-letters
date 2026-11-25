// The rules of the floor and the modules, as a machine reads them (AGENTS.md, "Every rule says what holds it"; #235,
// part D): each paragraph or item of a list in the floor's files, the roles' and the modules' whose text opens with a bold lead is a rule,
// named by its file and that lead ("floor/security.md: 1. Nothing secret in the repository"). Its text runs to the next
// rule at its own depth or above, a heading, or a line that leaves its item, so an item's own items are part of it as
// well as rules of their own. What holds each is named in scripts/holders/, beside this file (holders.mjs); a staged case
// names the rules it holds (staged/, staged.mjs). Node's own modules, and reading.mjs beside it for the files.
//
//   import { rules, ruleKey } from "./rules.mjs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { leftOut, realFiles, regular } from "./reading.mjs";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FOLDERS = ["floor", "floor/topics", "roles", "roles/shared", "tasks", "tools"];

// A line that opens a rule: its depth (the spaces before its marker, or -1 for a paragraph) and its lead.
const OPENS = /^( *)(?:(?:[-*]|\d+\.) +)?\*\*(.+?)\*\*/u;
const ITEM = /^( *)(?:[-*]|\d+\.) /u;

// The lead as a rule is named by it: the bold text, its closing stop, colon or comma left out.
export const leadOf = bold => bold.replace(/\s+/gu, " ").trim().replace(/[.:,;]+$/u, "").trim();

export const ruleKey = (file, lead) => `${file}: ${lead}`;

// The rules of one file's text: [{ file, lead, key, text }], in the order they stand.
export function rulesOf(file, text) {
  const lines = String(text).replace(/\r\n/gu, "\n").split("\n");
  const out = [];
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^ *```/u.test(lines[i])) fence = !fence;
    if (fence) continue;
    const m = OPENS.exec(lines[i]);
    if (!m) continue;
    const listed = ITEM.test(lines[i]);
    const depth = listed ? m[1].length : -1;
    // (a bold word inside a paragraph's running text opens nothing: only one at a line's start, after its marker)
    if (!listed && m[1].length) continue;
    let end = i + 1;
    for (; end < lines.length; end++) {
      const l = lines[end];
      if (/^#/u.test(l)) break;
      // (a paragraph's rule runs to the next paragraph that opens one; an item's, to the next line not indented under it)
      if (depth < 0) { if (/^\*\*/u.test(l)) break; continue; }
      const next = l.trim() ? l : lines.slice(end + 1).find(x => x.trim());
      if (next === undefined || /^ */u.exec(next)[0].length <= depth) break;
    }
    const lead = leadOf(m[2]);
    out.push({ file, lead, key: ruleKey(file, lead), text: lines.slice(i, end).join("\n").trimEnd() });
  }
  return out;
}

// Every rule of the floor and the modules under `root` (the core's own, by default); with `agents`, the core's own
// rules in its AGENTS.md as well, which a staged case may hold.
export function rules(root = ROOT, { agents = false } = {}) {
  const out = [];
  // (only real folders and files are read, a link at any depth read as nothing, as reading.mjs reads them; #848)
  const own = agents ? regular(root, "AGENTS.md") : null;
  if (own !== null) out.push(...rulesOf("AGENTS.md", own));
  for (const folder of FOLDERS) for (const f of realFiles(root, folder, new Set())) out.push(...rulesOf(`${folder}/${f}`, regular(root, `${folder}/${f}`) ?? ""));
  return out;
}

// Of `all`, the rules a project takes: the floor's, and those of each module its manifest's text `manifest` does not
// leave out (reading.mjs, leftOut).
export function takenRules(all, manifest) {
  const out = leftOut(manifest);
  return all.filter(r => r.file.startsWith("floor/") || !out.has(path.posix.basename(r.file)));
}

// The same rules as they stand in a commit of the git repository at `root`, read from git and never from its working
// folder: what a staged case set from that commit gave its session. The name asked is resolved to its commit's id, and
// what was read from that id is kept, for each root, id and `agents`: a commit never changes, so the staged cases set
// from one commit read it once, and a name that moves (a branch, HEAD) is a new id and is read again (#812). `git`
// runs git in `root` and gives what it printed; a test hands in its own.
const AT = new Map();
const gitAt = root => (...a) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] });
export function rulesAt(root, commit, { agents = false, git = gitAt(root) } = {}) {
  const id = git("rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`).trim();
  const key = JSON.stringify([path.resolve(root), id, agents]);
  if (!AT.has(key)) AT.set(key, rulesAtRead(git, id, agents));
  return AT.get(key).map(r => ({ ...r }));
}
function rulesAtRead(git, commit, agents) {
  const files = git("ls-tree", "-r", "--name-only", "--end-of-options", commit, "--", ...FOLDERS).split("\n")
    .filter(f => FOLDERS.includes(path.posix.dirname(f)) && f.endsWith(".md")).sort();
  if (agents && git("ls-tree", "--name-only", "--end-of-options", commit, "--", "AGENTS.md").trim()) files.unshift("AGENTS.md");
  return files.flatMap(f => rulesOf(f, git("show", `${commit}:${f}`)));
}

// A short fingerprint of a rule's text, which changes when any word of it does: what a staged case's run records, so
// that a change to a rule it holds makes the case due again.
export const fingerprint = text => crypto.createHash("sha256").update(String(text).replace(/\s+/gu, " ").trim()).digest("hex").slice(0, 12);
