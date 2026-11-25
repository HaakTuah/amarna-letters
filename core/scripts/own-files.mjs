// A project's own files, read as every script that reads a project's text before it acts reads them (#423, #446): the
// steps (steps.mjs), the sync (sync.mjs, its manifest and workflows) and the scheduled look (look.mjs, its manifest).
// Node's own modules and git only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MANIFEST, manifestText, readCore } from "./core-path.mjs";

// The most a file read so may hold: past any rule file, config, workflow, audit or baseline a project writes.
export const READ_MOST = 64 << 20;

// The project at `root`: `listed`, its files as git lists them (committed or not, ignored ones left out); `read(f)`, a
// file's text, or null where it is not one of its own (`read(f, true)` keeps its line ends); `safe(f)`, whether another
// script may be given the path; and `unread`, the files left unread for their size. Git runs with core.fsmonitor off,
// so that no command a repository's own config names runs when its files are listed.
export function ownFiles(root) {
  const listed = execFileSync("git", ["-c", "core.fsmonitor=false", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\0").filter(f => f && fs.existsSync(path.join(root, f)));
  // (the files of the library that carries the core, where the manifest's line says it is a submodule, at their paths from
  // here, as git lists them with --recurse-submodules, which it gives for the committed files alone: that library brings
  // the copy (core-path.mjs), and without this git lists it by its commit only. No submodule outside that library is read; #628)
  const text = manifestText(path.join(root, MANIFEST)), core = text === null ? null : readCore(text);
  if (core?.form === "carried" && fs.existsSync(path.join(root, ".gitmodules"))) {
    try {
      const have = new Set(listed);
      for (const f of execFileSync("git", ["-c", "core.fsmonitor=false", "ls-files", "--cached", "--recurse-submodules", "-z", "--", core.library], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).split("\0"))
        if (f && !have.has(f) && fs.existsSync(path.join(root, f))) listed.push(f);
    } catch { /* (a submodule that is not checked out is listed by its commit alone) */ }
  }
  // (what is read is a regular file of the project's own, at most READ_MOST bytes, by a path that, every link on it
  // followed, ends inside the project (#362, #423): a path or link that leads out, a device, a pipe or a folder reads as
  // missing, and a file past the size as missing too, named in `unread`, so that no file the project holds stops the
  // report; a link to a file of its own reads as that file, as the project's tools read it, and only to one git lists
  // as the project's: never git's own folder nor a file it ignores, a person's or a machine's own)
  const home = fs.realpathSync(root), unread = [], known = new Set(listed);
  const within = to => { const rel = path.relative(home, to); return !!rel && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
  const file = f => { // the regular file of the project's own a path leads to, as { real, size }, or null
    const to = path.resolve(home, f);
    if (!within(to)) return null;
    try {
      const real = fs.realpathSync(to), stat = fs.statSync(real);
      return within(real) && known.has(path.relative(home, real).split(path.sep).join("/")) && stat.isFile() ? { real, size: stat.size } : null;
    } catch { return null; }
  };
  // (its line ends as "\n", or, `ends` given, as the file holds them, for a caller that writes the text back)
  const read = (f, ends = false) => {
    const at = file(f);
    if (!at) return null;
    if (at.size > READ_MOST) { if (!unread.includes(f)) unread.push(f); return null; }
    try { const text = fs.readFileSync(at.real, "utf8"); return ends ? text : text.replace(/\r\n/g, "\n"); } catch { return null; }
  };
  // (whether another script may be given the path to read as this reader would: nothing there, or what it reads)
  const safe = f => {
    try { if (!fs.lstatSync(path.resolve(home, f), { throwIfNoEntry: false })) return true; } catch { return false; }
    return (file(f)?.size ?? Infinity) <= READ_MOST;
  };
  return { listed, read, safe, unread };
}
