// The stage of scripts/steps/630-a-tree-that-passed-is-not-run-again.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { write, PUSHED } from "../stage-helpers.mjs";

export default {
  // (a job of the tests that selects on a pull request and on a push alike, with nothing for the push)
  stage: dir => write(dir, ".github/workflows/tests-pushed.yml", PUSHED.replace("PASSED", "")),
  // (as the step words it: --passed on a push's first run, with the token, which reads checks)
  mend: dir => write(dir, ".github/workflows/tests-pushed.yml", PUSHED.replace("PASSED", ' ${SELECT_PASSED:+--passed "$SELECT_PASSED"}')),
};
