// The stage of scripts/steps/380-hostile-tests-for-every-named-input.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import path from "node:path";
import { read, write } from "../stage-helpers.mjs";

export default {
  // (rule 5 of SECURITY.md lists an input whose hostile tests are nowhere; the mend writes them where it names them, a
  // file of cases whose ending no reader of code knows, so the project's languages and tests stay as they were and no
  // other step reads it: the mutation tool's row, step 810's, follows them)
  stage: dir => write(dir, "SECURITY.md", read(dir, "SECURITY.md").replace(/^(5\. .*\r?\n)(?:(?!\d+\. |#).*\r?\n)*/m,
    "$1   - a peer's message: its type and size checked on arrival; limits: 64 KB, one message, 5 s; its hostile tests: `tests/hostile/peer-message.cases.txt`.\n")),
  mend: dir => write(dir, "tests/hostile/peer-message.cases.txt", "// too long, the wrong type, markup, a file path, a number out of range, nothing at all\n"),
};
