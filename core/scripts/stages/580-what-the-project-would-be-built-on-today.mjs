// The stage of scripts/steps/580-what-the-project-would-be-built-on-today.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { where } from "../choices-records.mjs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  // (a record that stood before the rule, argued on none of its lines; the mend writes the record as the step words
  // it, argued in full, so the records' check passes the pull request that adds it)
  stage: dir => {
    const file = where(read(dir, "core-manifest.md"));
    write(dir, file, `${(fs.existsSync(at(dir, file)) ? read(dir, file) : "# Choices\n").replace(/\n*$/, "\n")}\n## Choice: one language\n\n- Reopens it: a test takes over a minute.\n`);
  },
  mend: dir => {
    const file = where(read(dir, "core-manifest.md"));
    write(dir, file, `${(fs.existsSync(at(dir, file)) ? read(dir, file) : "# Choices\n").replace(/\n*$/, "\n")}\n## Choice: the project's foundations, judged again as if written today\n\n- Looked for: none the list lacked, in the registry and on the web.\n- The blind pick: the same stack.\n- The judgment: it stands; staying is the answer.\n- The suggestion: #1\n- Reopens it: a need in numbers the stack misses.\n`);
  },
};
