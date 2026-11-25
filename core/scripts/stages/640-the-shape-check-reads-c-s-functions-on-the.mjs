// The stage of scripts/steps/640-the-shape-check-reads-c-s-functions-on-the.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { READERS } from "../shape-readers.mjs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a baseline written before the check read C# on the parser: that reader's name taken out of "reads")
  // (where the step of 16 November has taken the config and the baseline out, a baseline that names every reader but
  // that one, which that step's mend then keeps)
  stage: dir => {
    const baseline = fs.existsSync(at(dir, "checks/shape-baseline.json")) ? JSON.parse(read(dir, "checks/shape-baseline.json")) : { reads: Object.keys(READERS), listed: {} };
    write(dir, "checks/shape-baseline.json", `${JSON.stringify({ ...baseline, reads: (baseline.reads ?? []).filter(r => r !== "csharp-tree") }, null, 2)}\n`);
  },
  // (as the step words it: the baseline written again)
  mend: dir => spawnSync(process.execPath, ["core/scripts/shape.mjs", "checks/shape.json", "--write"], { cwd: dir, encoding: "utf8", env: { ...process.env, SHAPE_BASE: "" } }),
};
