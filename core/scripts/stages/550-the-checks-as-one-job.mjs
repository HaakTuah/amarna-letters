// The stage of scripts/steps/550-the-checks-as-one-job.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write } from "../stage-helpers.mjs";
import other from "./530-checks-once-a-pull-request-is-ready.mjs";

export default {
  // (the call to core.yml folds the description check and leaves the copies checks out, their own call taken out too;
  // the mend, as the step words it, passes core.yml their config and marks. Its trigger starts it once a pull request
  // is ready, as the starter kit's does, so the description check it folds, which skips a draft, breaks no other step;
  // where a draft skip was staged already, that step is broken as it stood)
  stage: dir => {
    const call = read(dir, ".github/workflows/core.yml").replace(/^ {6}(copies|sizes|description): .*\r?\n/gm, "");
    write(dir, ".github/workflows/core.yml", /^ {4}with:/m.test(call) ? call.replace(/^( {4}with:\r?\n)/m, "$1      description: true\n")
      : call.replace(/^( {4}uses: \S+\/\.github\/workflows\/core\.yml@\S+.*\r?\n)/m, "$1    with:\n      description: true\n"));
    if (!/ready_for_review|github\.event\.pull_request\.draft/.test(read(dir, ".github/workflows/core.yml"))) other.mend(dir);
    for (const f of ["copies.yml", "pr-description.yml"]) fs.rmSync(at(dir, `.github/workflows/${f}`), { force: true });
  },
  mend: dir => write(dir, ".github/workflows/core.yml", read(dir, ".github/workflows/core.yml").replace(/^( {4}with:\r?\n)/m, "$1      copies: checks/copies.json\n      sizes: checks/sizes.json\n")),
};
