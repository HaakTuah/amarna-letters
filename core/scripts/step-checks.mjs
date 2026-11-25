// What every step and every piece of the steps' readers shares (steps.mjs, beside this file, holds the steps and runs
// them): the cost words, the copy's paths, and the words of an error with no path in it. The pieces that read a project
// are in the files beside it, each named by what it reads, and each step names the file whose piece it needs:
// step-checks-tests.mjs (the tests' strength, selection and run), step-checks-ready.mjs (when the checks run: a pull
// request's draft and ready, the one job), step-checks-tool-files.mjs, step-checks-shape.mjs, step-checks-workflow-text.mjs,
// step-checks-jobs.mjs and step-checks-lookup.mjs (a workflow's jobs and what a job runs first), step-checks-hostile.mjs,
// step-checks-moved.mjs and step-checks-packages.mjs.
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { atCopy, inCopy, mendAt } from "./core-path.mjs";

export const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// (`atCopy`, `mendAt` and `inCopy` of core-path.mjs: the starter kit's and the notes' words for the copy, in the project's own)
export { atCopy, inCopy, mendAt };

// Roughly what a step costs a project where it is not done yet (a step done costs nothing).
export const COST = {
  check: "nothing while its check passes; else what the failure says, in the pull request it fails",
  line: "a line or two of a protected file: one small pull request of a builder's",
  workflow: "a workflow's change: one small pull request, with floor rule 3's two security reviews",
  read: "a read of the project's own rules or settings against the entry, and a small pull request where one differs",
  config: "a check's config and its first baseline: one small pull request of a builder's; what the baseline lists is a debt worked down by tasks, at the dose the codebase's state sets",
  owner: "the owner's yes, asked once; nothing of a session's beyond the ask",
  clean: "one cleanup lane of a builder's, once, its size set by how much of its owner's words the project holds: a pull request for its files, and its issues and comments edited on the host",
  split: "a read of which records the project's pull requests keep adding to, and one pull request of a builder's that splits each into a folder of one file per entry, its readers following",
  record: "a choice record argued in full: a session's long list and trial, three fresh sessions (the blind picker, the challenger, the judge), one pull request and one issue",
  reading: "one long session of an auditor's on the strongest tier, once, and a pull request of its report and record; after that, at each release, a reading of the rules it added or changed alone",
};

// An error's words with no path of the machine's in them (the project's root, this copy's, the temporary folder, the
// home folder), since what is printed may be pasted into a pull request's description (floor rule 1).
export function plain(message, root = process.cwd()) {
  let text = String(message);
  for (const [at, as] of [[path.resolve(root), "<the project>"], [HERE, "<the copy>"], [os.tmpdir(), "<a temporary folder>"], [os.homedir(), "<home>"]])
    if (at && at.length > 1) for (const spelling of new Set([at, at.replace(/\\/g, "/")])) text = text.split(spelling).join(as);
  return text;
}

export const PROJECT_FILES = /\.(cs|fs|vb)proj$/;

// Whether a workflow runs on every push to an open pull request: the event pull_request with no "types" that leaves out
// its opening or a push, and no "paths" or "branches" filter that could leave out the change a lookup reads.
export const everyPush = on => {
  if (!onPullRequests(on)) return false;
  const pr = on && typeof on === "object" && !Array.isArray(on) ? on.pull_request : null;
  if (!pr || typeof pr !== "object") return true;
  const types = pr.types === undefined ? null : [pr.types].flat();
  return (!types || ["opened", "synchronize"].every(t => types.includes(t))) && ["paths", "paths-ignore", "branches", "branches-ignore"].every(k => pr[k] === undefined);
};

export const onPullRequests = on => (typeof on === "string" ? on === "pull_request" : Array.isArray(on) ? on.includes("pull_request") : !!on && "pull_request" in on);

// (a file's name as the mend shows it: a control character or a backtick, which would bend a description, as "?")
export const shown = f => String(f).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029`]/gu, "?");
