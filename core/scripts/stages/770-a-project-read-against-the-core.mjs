// The stage of scripts/steps/770-a-project-read-against-the-core.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { at } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a project with no reading recorded; the mend runs the command the step words, which the session that took the
  // reading's task runs once its report is written)
  stage: dir => fs.rmSync(at(dir, "checks/core-reading.json"), { force: true }),
  mend: dir => {
    const r = spawnSync(process.execPath, ["core/scripts/core-reading.mjs", "--recorded"], { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`core-reading.mjs --recorded: ${r.stderr}`);
  },
};
