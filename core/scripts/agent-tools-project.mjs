// A project's agent tools as one commit holds them: what is configured there, the tool files it reads, and each problem
// a link, a letter case or a submodule makes of them (agent-tools-links.mjs).
import fs from "node:fs";
import path from "node:path";
import { commitReader, listing, notFile, shownNotBlob, libraryHolds, LISTING_MAX } from "./agent-tools-listing.mjs";
import { configured } from "./agent-tools-configured.mjs";
import { commitProblems } from "./agent-tools-links.mjs";
import { fold } from "./agent-tools-entries.mjs";
import { ignoredAt, ignoredDone } from "./git-objects.mjs";

// The project at `root`, at its working tree or at a commit `rev`: configured()'s answer. Nothing is read through a
// link, at a commit (where git lists nothing below one) or in the working tree: each link where a tool reads its files
// is a problem of its own (linkProblems()), so what it leads to is never read, and the head and the base read alike.
export function readProject(root, rev = null, linkedOnMain = () => false, alias = f => f, base = null) {
  const commit = rev ? commitReader(root, rev, alias) : null;
  // (in the working tree, a path with a link anywhere on its way is read as holding nothing: a link of the file system's,
  // or one git's HEAD holds, which a checkout with core.symlinks off writes as a plain file of the link's text)
  const linkedAtHead = rev ? null : listing(root, "HEAD").linked;
  const viaLink = f => f.split("/").some((_, i, parts) => { const p = parts.slice(0, i + 1); if (linkedAtHead.has(p.join("/"))) return true; try { return fs.lstatSync(path.join(root, ...p)).isSymbolicLink(); } catch { return false; } });
  // (in the working tree, a file git ignores is a person's or a machine's own, as a .claude/settings.local.json mostly
  // is, and no file of the project's: floor rule 18)
  const read = rev ? commit.read
    : f => {
      if (viaLink(f)) return null;
      let text;
      try { text = fs.readFileSync(path.join(root, f), "utf8"); } catch { return null; }
      return ignoredAt(root, f) ? null : text;
    };
  // (the names in a folder of the project, at the commit or in the working tree)
  const names = dir => {
    if (rev) return commit.names(dir);
    if (dir !== "." && viaLink(dir)) return [];
    try { return fs.readdirSync(path.join(root, dir)); } catch { return []; }
  };
  const skills = () => names(".claude/skills").filter(n => read(`.claude/skills/${n}/SKILL.md`) !== null);
  // (whether the project holds a path as a link: git's mode 120000 at a commit, a link in the working tree)
  // (or on main, as `linkedOnMain` says: the base, which a hook fetches from until the pull request merges)
  // (anything but a plain file: a link, a folder or a submodule, in the commit's listing; in the working tree, the
  // commit it stands on too, where a submodule shows as an empty folder)
  const own = at => notFile(listing(root, rev ?? "HEAD"), at) || shownNotBlob(root, rev ?? "HEAD", at) || (!rev && (() => { try { const st = fs.lstatSync(path.join(root, at)); return st.isSymbolicLink() || st.isDirectory(); } catch { return false; } })());
  const linked = at => own(at) || linkedOnMain(at);
  const commitRev = rev ?? "HEAD";
  // (with `alias`, each path read from another, as mendedIds() reads a link's files in its place: its Markdown files too)
  // (the file a library's commit holds at a path, at this commit's pin and at the base's, which a hook reads until the pull
  // request merges: anything but a plain file at either is the answer, else what this commit's pin reads as)
  const inLibrary = (library, rest) => { const held = [commitRev, ...(base ? [base] : [])].map(r => libraryHolds(root, r, library, rest)); return held.includes("link") ? "link" : held.includes("other") ? "other" : held[0]; };
  // (the working tree read, git's process of what it ignores is stopped: what it read is as of now, and it holds the folder)
  let project;
  try { project = configured(read, skills, names, linked, () => [...agentMarkdown(root, commitRev), ...(alias.markdown ?? [])], inLibrary); } finally { if (!rev) ignoredDone(root); }
  // (read at the commit, the working tree's at HEAD, the pull request's head: a file not committed, ignored or not, is
  // no file of the project's, and the base is read the same way)
  for (const [problem, text] of commitProblems(root, commitRev)) { project.problems.push(problem); project.texts.set(problem, text); project.baselined.add(problem); }
  if (!rev && listing(root, "HEAD").failed) project.problems.push(`the commit HEAD cannot be listed by git (an error, or names past ${LISTING_MAX} bytes), so this check cannot read the tools' files there. Mend: run the check again; where it fails the same way, take out of this pull request what makes its tree too large to list`);
  return project;
}
// Claude Code's folders of agents and commands, and each Markdown file the commit `rev` holds below one, in whatever case
// the folder stands, which Claude Code reads.
const AGENT_DIRS = [".claude/agents", ".claude/commands"];
export const agentFile = at => { const parts = at.split("/"); return parts.length > 2 && AGENT_DIRS.includes(fold(parts.slice(0, 2).join("/"))) && /\.md$/iu.test(at); };
function agentMarkdown(root, rev) {
  return [...listing(root, rev).blobs].filter(agentFile).sort();
}
