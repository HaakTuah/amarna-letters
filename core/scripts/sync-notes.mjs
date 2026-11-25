// The sync notes, read whole (AGENTS.md, "A record pull requests add to is a folder of one file per entry"; #750, point
// 1): setup/sync-notes.md holds what it says of itself and a line naming the folder its entries stand in, a file an
// entry (setup/sync-notes/NNN-<name>.md), read in the order of their names, each with its step of the same name in
// scripts/steps/ (steps.mjs, beside this file). A copy from before the folder holds its entries in the file itself,
// and is read the same way, so that the notes of any two commits compare. Reads only; Node's own modules.
//
//   node core/scripts/sync-notes.mjs     the notes whole, as one text, each entry in its place, from the copy it stands in
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { started } from "./started.mjs";

export const NOTES = "setup/sync-notes.md", FOLDER = "setup/sync-notes";
export const POINTER = "Its entries stand in `setup/sync-notes/`, a file each, read in the order of their names.";
// How the notes' one line that is no entry opens: the notice that a sync from a copy older than the folder prints, its
// reader taking what a diff of the file alone adds, which sends the session that syncs to the folder.
export const NOTICE = "- A sync that brings `core/setup/sync-notes/` to a copy that did not hold it ran the copy's older script";

// The notes whole, from `read(file)` (its text, null where it is not there) and `list(folder)` (the names of the files
// in it): the file's text, the line naming the folder replaced by the folder's entries; null where the file is not.
export function notesFrom(read, list) {
  const text = read(NOTES);
  if (text === null) return null;
  return text.split("\n").map(line => (line.replace(/\r$/u, "") !== POINTER ? line
    : list(FOLDER).filter(f => f.endsWith(".md")).sort().map(f => (read(`${FOLDER}/${f}`) ?? "").replace(/\r?\n$/u, "")).join("\n"))).join("\n");
}

// The notes whole in the core, or a copy of it, at `root`.
export const notes = (root = ".") => notesFrom(
  f => { try { return fs.readFileSync(path.join(root, f), "utf8"); } catch { return null; } },
  dir => { try { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name); } catch { return []; } });

// The notes whole at commit `rev`, through `run`, which runs git with the arguments it is given in the repository
// that holds it and returns what git printed (or throws).
export const notesAt = (rev, run) => notesFrom(
  f => { try { return run(["cat-file", "blob", `${rev}:${f}`]); } catch { return null; } },
  dir => { try { return run(["ls-tree", "--name-only", `${rev}:${dir}`]).split("\n").filter(Boolean); } catch { return []; } });

// The entries of notes read whole: each line that opens an item of the list.
export const entries = text => String(text ?? "").split("\n").map(l => l.replace(/\r$/u, "")).filter(l => l.startsWith("- "));

// The entries at commit `rev` (through `run`, as notesAt) whose step says it asks nothing of what stands (#1094): the
// step's file under scripts/steps/ gives its object the field `asks: "nothing"` (never the words in a comment or in
// another field's text), and its entry, of the same name, stays in the notes but leaves the report a sync prints. A set
// of their lines; empty where the commit holds no such step or cannot be read.
export const QUIET = 'asks: "nothing"';
export const quiet = text => /^(?!\s*\/\/)[^\n]*?(?:^|[{,])\s*asks:\s*"nothing"\s*(?:,|\}|$)/mu.test(String(text ?? ""));
export function quietAt(rev, run) {
  let names;
  try { names = run(["ls-tree", "--name-only", `${rev}:scripts/steps`]).split("\n").filter(f => f.endsWith(".mjs")); } catch { return new Set(); }
  const read = f => { try { return run(["cat-file", "blob", `${rev}:${f}`]); } catch { return ""; } };
  return new Set(names.filter(f => quiet(read(`scripts/steps/${f}`))).flatMap(f => entries(read(`${FOLDER}/${f.replace(/\.mjs$/u, ".md")}`))));
}

// (run, it reads the core or the copy it stands in, from wherever it is run: a project runs it as core/scripts/...)
if (started(import.meta.url)) process.stdout.write(notes(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) ?? "");
