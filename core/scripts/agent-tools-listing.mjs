// The files a commit or the working tree holds, as git lists them (listing, whose answers the readers of the project and
// its links share), and what a path holds in a commit: its entry, its kind, whether it is a file, a link or a library's.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { textAt, exactPath, objectAt as objectIn } from "./git-objects.mjs";

// A commit's files as its one listing holds them, nothing followed: what a path is (reached()), a file's text, the names
// in a folder, and what a name holds, by its kind and git's object (a file's text, a link's target, a submodule's commit).
export function commitReader(root, rev, alias = f => f) {
  const l = listing(root, rev), resolve = f => reached(alias(f), l.blobs, l.dirs, l.others);
  const read = f => (l.blobs.has(alias(f)) ? textAt(root, rev, alias(f)) : null);
  const names = dir => (dir === "." || l.dirs.has(alias(dir)) ? [...(l.children.get(alias(dir)) ?? [])] : []);
  const holds = f => `${resolve(f)?.type ?? (l.linked.has(f) ? "link" : "nothing")}\0${l.ids.get(f) ?? ""}`;
  return { resolve, read, names, holds };
}
// Whether a commit's listing holds `at` as anything but a plain file: a link, a folder or a submodule's entry.
export const notFile = (l, at) => l.linked.has(at) || l.dirs.has(at) || l.others.has(at);
// Whether what git shows at `rev:at` is no plain file, asked of git for that path alone, so one broken entry elsewhere
// cannot empty what the listing gives: its mode and object, the same object git show resolves, a link's, a folder's (an empty one too, which the listing leaves out)
// or a submodule's; or the object it resolves to, of another kind than a file's whatever its mode says. Replace objects
// are not read, as the kit's form reads none; git asked once a path a commit, and a path it holds nothing at is no
// script either way.
export const shown = new Map();
// (git asked in a process, in the repository at `gitDir` where it is given, replace objects left unread; "" where it fails)
const askGit = (root, gitDir, args, input = "") => { try { return execFileSync("git", [...(gitDir ? ["--git-dir", gitDir] : []), "--no-replace-objects", ...args], { cwd: root, encoding: "utf8", input, stdio: ["pipe", "pipe", "ignore"] }); } catch { return ""; } };
// The entry's mode and object `git ls-tree` names for this path alone: read from the commit's own listing, which git gave
// once for all, where the path is one git takes as written and that listing is whole; else asked for this path.
function entryAt(root, rev, at, gitDir) {
  const whole = gitDir || !exactPath(at) ? null : listing(root, rev);
  if (whole && !whole.failed) return whole.first.get(at) ?? ["", ""];
  const [mode = "", , oid = ""] = askGit(root, gitDir, ["ls-tree", "-z", rev, "--", at]).split("\0")[0].split("\t")[0].split(" ");
  return [mode, oid];
}
// The object git show resolves at `rev:at` and its kind, by the long-lived `cat-file --batch-check` where it can be asked,
// else in a process: "<object> <kind> <size>", or "<name> missing" (nothing); a path that holds a line's end could not be
// asked so, and is no plain file either.
function objectKindAt(root, rev, at, gitDir) {
  if (/[\r\n]/u.test(at)) return ["?", "?"];
  const held = objectIn(root, rev, at, { gitDir });
  if (held !== undefined) return held ? [held.oid, held.type] : [];
  return /^([0-9a-f]{40,64}) (\w+) \d+$/u.exec(askGit(root, gitDir, ["cat-file", "--batch-check"], `${rev}:${at}\n`).trim())?.slice(1) ?? [];
}
export function shownNotBlob(root, rev, at, gitDir = null) {
  const key = `${root}\0${rev}\0${at}\0${gitDir}`;
  if (!shown.has(key)) {
    const [mode, oid] = entryAt(root, rev, at, gitDir), [resolved = "", type = ""] = objectKindAt(root, rev, at, gitDir);
    // (and the entry named must be the object git show resolves: where a tree git would refuse holds two of a name, or
    // out of order, the two can differ, and then nothing shows what is run)
    shown.set(key, resolved !== oid || (mode !== "" && mode !== "100644" && mode !== "100755") || (type !== "" && type !== "blob"));
  }
  return shown.get(key);
}
// What the commit that `rev` pins of the submodule `library` holds at `rest` there, read in the superproject's own
// module repository (the one the hook's command names; never a folder of the working tree, which a branch commits): "file",
// "other" (anything but a plain file: a link, a folder, a submodule's entry), "link" where `rev` holds the library's path
// itself as a link, "unread" where that repository or the commit is not at hand, null where `rev` holds no submodule at
// that path (the first path the hook reads is then main's own).
export function libraryHolds(root, rev, library, rest) {
  const l = listing(root, rev), commit = l.gitlinks.get(library);
  // (the library's own path committed as a link: the folder it stands in is the branch's to choose)
  if (l.linked.has(library)) return "link";
  if (commit === undefined) return null;
  const dir = once(`${root}\0${library}`, () => { try { return path.resolve(root, execFileSync("git", ["rev-parse", "--git-path", `modules/${library}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()); } catch { return null; } });
  if (dir === null || !once(`${dir}\0${commit}`, () => { try { execFileSync("git", ["--git-dir", dir, "--no-replace-objects", "cat-file", "-e", `${commit}^{commit}`], { cwd: root, stdio: "ignore" }); return true; } catch { return false; } })) return "unread";
  return shownNotBlob(root, commit, rest, dir) ? "other" : "file";
}
// (each library's module repository, and whether it holds a commit, git asked once a run for each hook that reads there)
export const modules = new Map();
const once = (key, ask) => { if (!modules.has(key)) modules.set(key, ask()); return modules.get(key); };
// The path a walk at a commit reached, and what it is there: the checkout's root, which no listing names (as a link to
// ".." from a folder at the root leads to), and any folder a "tree", a file a "blob", anything else a submodule's.
function reached(f, blobs, dirs, others) {
  if (f === "." || dirs.has(f)) return { f, type: "tree" };
  if (blobs.has(f)) return { f, type: "blob" };
  return others.has(f) ? { f, type: "commit" } : null;
}
// The files and links of the commit `rev`, git asked once for each commit: { blobs, links, linked, ids, others, dirs,
// children, first, failed }; its bound (bytes of names) may be lowered for a test.
export const listings = new Map(), LISTING_MAX = Number(process.env.AGENT_TOOLS_LISTING_MAX) > 0 ? Number(process.env.AGENT_TOOLS_LISTING_MAX) : 1 << 28;
export function listing(root, rev) {
  const key = `${root}\0${rev}`;
  if (listings.has(key)) return listings.get(key);
  let out = "", failed = false;
  // (a commit git cannot list, an error or names past the bound, is said, never read as one with nothing in it; where
  // there is no such commit, as before a project's first, there is nothing to list)
  const git = (args, opts = {}) => execFileSync("git", ["--no-replace-objects", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...opts });
  try { out = git(["ls-tree", "-r", "-t", "-z", rev], { maxBuffer: LISTING_MAX }); } catch { try { git(["rev-parse", "-q", "--verify", `${rev}^{commit}`]); failed = true; } catch { /* (no commit) */ } }
  const listed = out.split("\0").filter(Boolean).map(l => { const tab = l.indexOf("\t"), [mode, , id] = l.slice(0, tab).split(" "); return [mode, l.slice(tab + 1), id]; });
  // (each path's first entry, a folder's too, an empty one among them, as `git ls-tree rev -- path` names it first; the
  // folders are no file, link or submodule, so the rest of the listing reads the other entries)
  const first = new Map();
  for (const [mode, at, id] of listed) if (!first.has(at)) first.set(at, [mode, id]);
  const entries = listed.filter(([mode]) => mode !== "040000");
  // (a file is a plain or an executable blob; a submodule's entry, 160000, is no file the commit holds)
  const found = { blobs: new Set(entries.filter(([mode]) => mode === "100644" || mode === "100755").map(([, at]) => at)), links: entries.filter(([mode]) => mode === "120000").map(([, at]) => at) };
  found.linked = new Set(found.links);
  // (each entry's object, a file's blob or a submodule's commit, by its path)
  found.ids = new Map(entries.map(([, at, id]) => [at, id]));
  // (and any other entry, a submodule's among them, and the folders on every entry's way, each by its path)
  found.others = new Set(entries.filter(([mode]) => mode !== "100644" && mode !== "100755" && mode !== "120000").map(([, at]) => at));
  // (a submodule's entry by its path, with the commit it names)
  found.gitlinks = new Map(entries.filter(([mode]) => mode === "160000").map(([, at, id]) => [at, id]));
  found.dirs = new Set(entries.flatMap(([, at]) => at.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/"))));
  // (the names in each folder, "." the root's, built once)
  found.children = new Map();
  for (const at of [...entries.map(([, a]) => a), ...found.dirs]) {
    const cut = at.lastIndexOf("/"), dir = cut < 0 ? "." : at.slice(0, cut);
    if (!found.children.has(dir)) found.children.set(dir, new Set());
    found.children.get(dir).add(at.slice(cut + 1));
  }
  found.first = first;
  found.failed = failed;
  listings.set(key, found);
  return found;
}
