// Whether a script was started by itself (`node <its file>`), not imported by another: the scripts beside this file ask
// here before they run, since one that asks wrongly runs nothing and ends as if its check had passed. Node gives a
// module the real path of its file, so the path it was started by is made real too: a project's folder reached through
// a link is the same file. The path as it was given counts as well, for a Node told to keep the link's path
// (--preserve-symlinks-main). Node's own modules only.
//
//   if (started(import.meta.url)) { ... }
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function started(url) {
  if (!process.argv[1]) return false;
  if (pathToFileURL(process.argv[1]).href === url) return true;
  try { return pathToFileURL(fs.realpathSync(process.argv[1])).href === url; } catch { return false; }
}
