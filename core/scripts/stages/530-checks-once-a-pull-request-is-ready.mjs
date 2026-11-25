// The stage of scripts/steps/530-checks-once-a-pull-request-is-ready.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write } from "../stage-helpers.mjs";

export default {
  // (the call to the copy check skips its job on a draft, its trigger left as it was; the mend, as the step words it,
  // lists the trigger's types with ready_for_review)
  stage: dir => write(dir, ".github/workflows/core.yml", read(dir, ".github/workflows/core.yml").replace(/, ready_for_review\]/, "]")
    .replace(/^(jobs:\r?\n {2}[\w-]+:(\r?\n))(?! {4}if:)/m, (job, _, eol) => `${job}    if: \${{ !github.event.pull_request.draft }}${eol}`)),
  mend: dir => {
    const text = read(dir, ".github/workflows/core.yml");
    write(dir, ".github/workflows/core.yml", /^ {4}types: \[/m.test(text) ? text.replace(/^( {4}types: \[[^\]\r\n]*)\]/m, "$1, ready_for_review]")
      : text.replace(/^( {2}pull_request:(\r?\n))/m, (on, _, eol) => `${on}    types: [opened, reopened, synchronize, ready_for_review]${eol}`));
  },
};
