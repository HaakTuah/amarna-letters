// The stage of scripts/steps/690-the-shape-check-reads-the-functions-of.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { READERS } from "../shape-readers.mjs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a baseline written before the check read JavaScript's functions on the parser, as that of C#'s above)
  stage: dir => {
    const baseline = fs.existsSync(at(dir, "checks/shape-baseline.json")) ? JSON.parse(read(dir, "checks/shape-baseline.json")) : { reads: Object.keys(READERS), listed: {} };
    write(dir, "checks/shape-baseline.json", `${JSON.stringify({ ...baseline, reads: (baseline.reads ?? []).filter(r => r !== "javascript-tree") }, null, 2)}\n`);
  },
  mend: dir => spawnSync(process.execPath, ["core/scripts/shape.mjs", "checks/shape.json", "--write"], { cwd: dir, encoding: "utf8", env: { ...process.env, SHAPE_BASE: "" } }),
};
