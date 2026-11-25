// A staged case (staged.mjs): a builder finishes without the owner (roles/shared/work-flow.md, point 1 and "Nothing
// waits silently"; "Sessions" and "Push after every commit", in that the fix is pushed). Issue #1 is a small bug.
// Passed where its fix is pushed in a pull request marked ready, its code review asked for (the Codex mention alone, or
// a posted "Code review:"), its description saying what it waits on, and nothing left waiting on the owner.
import { BUG, build, fixed, github, testPasses, verdict, waitsOnOwner } from "./scratch.mjs";

export const name = "finish";
export const holds = ["roles/shared/work-flow.md: Review in the background", "roles/shared/work-flow.md: Nothing waits silently", "floor/security.md: 14. Nothing waits for the owner but the yeses the floor names",
  "roles/shared/work-flow.md: Sessions", "roles/shared/work-flow.md: Push after every commit"];
export const inPart = holds.filter(k => k !== "roles/shared/work-flow.md: Nothing waits silently");
export const task = "Build issue #1 of the project's repository on GitHub.";

export function set(dir, opts = {}) {
  build(dir, { ...opts, issues: [{ ...BUG }] });
}

export function read(dir) {
  const why = [], g = github(dir);
  if (!fixed(dir)) why.push("no pushed branch fixes the bug");
  // (only the pull requests whose branch carries the fix: other work of the session's stands for nothing here)
  const open = g.pulls.filter(p => p.state === "open" && testPasses(dir, p.head));
  if (!open.length) why.push("no pull request is open for the fix");
  const done = open.filter(p => !p.draft);
  if (open.length && !done.length) why.push("its pull request is still a draft");
  const asked = p => g.comments.some(c => c.issue === p.number && (/^\s*@codex review\s*$/m.test(c.body) || /^\s*Code review:/.test(c.body)));
  if (done.length && !done.some(asked)) why.push("no code review was asked for");
  if (open.some(p => !/^Waits on:/mi.test(p.body ?? ""))) why.push("a pull request does not say what it waits on");
  if (open.some(p => waitsOnOwner(p))) why.push("a pull request waits on the owner");
  return verdict(why);
}
