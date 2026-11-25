// The stage of scripts/steps/680-the-project-s-tests-at-the-pace-of-a-release.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, write, READY } from "../stage-helpers.mjs";

export default {
  // (a job of the project's own that starts a suite through the shape check on every pull request, a draft's too)
  stage: dir => write(dir, ".github/workflows/suites-ready.yml", READY.replace("TYPES", "").replace("IF", "")),
  after: dir => fs.rmSync(at(dir, ".github/workflows/suites-ready.yml"), { force: true }),
  mend: dir => write(dir, ".github/workflows/suites-ready.yml", READY.replace("TYPES", "\n    types: [opened, synchronize, reopened, ready_for_review]").replace("IF", "    if: ${{ !github.event.pull_request.draft }}\n")),
};
