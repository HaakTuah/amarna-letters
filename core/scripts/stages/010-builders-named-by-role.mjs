// The stage of scripts/steps/010-builders-named-by-role.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write, SLOTS } from "../stage-helpers.mjs";

export default {
  stage: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(SLOTS, "$1| *Codex's checks* | the project's own tests |\n")),
  mend: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^\| \*Codex's checks\* \|.*\r?\n/m, "")),
};
