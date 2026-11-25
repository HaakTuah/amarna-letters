// The stage of scripts/steps/810-the-mutation-tool-named-from-the-core-s-list.mjs: how a project that missed that step holds it, and its mend
// as the step words it. scripts/steps-stage.mjs loads it, in the order of the names.
import { spawnSync } from "node:child_process";
import { LIST, lineOf } from "../mutation-tools.mjs";
import { read, write, SLOTS } from "../stage-helpers.mjs";

const ROW = /^\| \*mutation tool\* \|.*$/mu;

export default {
  asked: true,
  // (a reason the list gives for a language the project's code is not in, so the row stands, step 420's is done, and
  // this one is not; where step 420's stage took the row out, `none` with no reason, which neither reads as done)
  stage: dir => {
    const manifest = read(dir, "core-manifest.md");
    write(dir, "core-manifest.md", ROW.test(manifest) ? manifest.replace(ROW, lineOf({ none: LIST.tools.mutmut.none })) : manifest.replace(SLOTS, "$1| *mutation tool* | `none` |\n"));
  },
  // (as the step words it: the script's writer)
  mend: dir => { spawnSync(process.execPath, ["core/scripts/mutation-tools.mjs", "--write"], { cwd: dir, encoding: "utf8" }); },
};
