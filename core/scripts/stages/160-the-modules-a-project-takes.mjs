// The stage of scripts/steps/160-the-modules-a-project-takes.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moduleNames } from "../manifest-reads.mjs";
import { MODULES } from "../reading.mjs";
import { notTakenWithout, read, write } from "../stage-helpers.mjs";
import { project } from "../steps.mjs";
import step from "../steps/160-the-modules-a-project-takes.mjs";
import confirm from "./823-the-modules-a-project-takes-placed-from-what-is-read.mjs";

const HOME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default {
  // (asked of every project whose list the core's modules outgrew since its release, which a sync of that release's
  // own program, writing nothing, leaves to a session; the mend is what the step words, its writer's lines)
  asked: true,
  // (whether the core at a commit, read by `git` with its arguments, lacked a module the core has now: a sync of that
  // commit's release leaves this step to a session)
  grew: (sha, git) => {
    const had = git(["ls-tree", "--name-only", sha, ...MODULES.map(d => `${d}/`)]).split("\n").map(f => path.basename(f));
    return moduleNames(HOME).some(n => !had.includes(n));
  },
  stage: dir => write(dir, "core-manifest.md", notTakenWithout(read(dir, "core-manifest.md"), "game-design.md")),
  // (and the modules its writer took by choice, which step 820 asks of the owner, confirmed as that step's mend words it)
  mend: dir => { step.write(project(dir), new Set()); confirm.mend(dir); },
};
