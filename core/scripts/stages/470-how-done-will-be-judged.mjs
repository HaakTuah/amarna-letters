// The stage of scripts/steps/470-how-done-will-be-judged.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { modulesWith, modulesWithout, read, write } from "../stage-helpers.mjs";

export default {
  // (asked of every project whose list was written before the module came, as a sync of an older release leaves it)
  asked: true,
  // (a list of modules written before the module came, which neither takes it nor leaves it out; the mend takes it, as
  // the step words it: its line "Modules to confirm:", the owner's to answer, is the stage of 23 November 2026's)
  stage: dir => write(dir, "core-manifest.md", modulesWithout(read(dir, "core-manifest.md"), "done-when.md")),
  mend: dir => write(dir, "core-manifest.md", modulesWith(read(dir, "core-manifest.md"), "done-when.md")),
};
