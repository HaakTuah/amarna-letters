// The stage of scripts/steps/080-a-sync-and-the-project-s-own-suites.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { callers, project } from "../steps.mjs";
import { at, write, SUITE } from "../stage-helpers.mjs";

// (`last`, so that its mend, which lists the files that hold only calls to the core's workflows, sees every such file
// the other stages and mends write)
export default {
  last: true,
  stage: dir => write(dir, ".github/workflows/suites-staged.yml", SUITE),
  after: dir => fs.rmSync(at(dir, ".github/workflows/suites-staged.yml"), { force: true }),
  mend: dir => write(dir, ".github/workflows/suites-staged.yml", SUITE.replace("      - 'core-manifest.md'\n", `      - 'core-manifest.md'\n${callers(project(dir)).map(f => `      - '${f}'\n`).join("")}`)),
};
