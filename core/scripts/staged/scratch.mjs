// What every staged case stands on (staged.mjs; AGENTS.md, "Staged cases hold what no check reads"; #235): a scratch
// project in a folder of its own, written by the core's starter kit from a commit of the core, with a small program in
// it, its origin a bare repository beside it, and a stand-in for GitHub (gh.cjs, beside this file) answering from a file
// beside it: `<dir>/project`, `<dir>/origin.git`, `<dir>/bin/gh` and `<dir>/github.json`, with a stand-in for starting a
// session of one's own (session.cjs, as `<dir>/bin/session`) that records into that file. And the readers each case
// reads the outcome with: what the session pushed, what it left in the project, and what it wrote to GitHub; never what
// it says of itself. This file is the one entrance of its three parts (#938), each read on its own:
//   scratch-setup.mjs    the set-up of a case: the names, the kit's project, the origin, the stand-in's state;
//   scratch-reader.mjs   the sealed reader of what a session left (a security reading) and the seal a case keeps;
//   scratch-outcome.mjs  the readers a case's verdict uses, built on the sealed reader; it runs the session's program, so a
//                        security reading takes it too.
export { BUG, CORE_ROOT, LABELS, OWNER, PASSER, PROGRAM, REPO, URL, build, carry, fakeKey, folderFit, git, keepKits, kitIntact, put, queueLine } from "./scratch-setup.mjs";
export { LIMITS, Unreadable, base, branchesOf, github, memo, memoOf, originGit, readGit, seal, sealOf, sealed } from "./scratch-reader.mjs";
export { added, adds, changed, fixed, gone, heldAtBase, inCommits, onGitHub, printed, pulls, pushed, runAt, show, testPasses, touched, verdict, waitsOnOwner, words, written } from "./scratch-outcome.mjs";
