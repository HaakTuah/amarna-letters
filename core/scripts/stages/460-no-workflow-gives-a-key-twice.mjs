// The stage of scripts/steps/460-no-workflow-gives-a-key-twice.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, write, TWICE } from "../stage-helpers.mjs";

export default {
  // (a workflow whose step gives if: twice; the mend keeps one, with both conditions in it, and the file goes after)
  stage: dir => write(dir, ".github/workflows/twice-staged.yml", TWICE),
  after: dir => fs.rmSync(at(dir, ".github/workflows/twice-staged.yml"), { force: true }),
  mend: dir => write(dir, ".github/workflows/twice-staged.yml", TWICE.replace("        if: github.event_name == 'push'\n        if: always()\n", "        if: github.event_name == 'push' && always()\n")),
};
