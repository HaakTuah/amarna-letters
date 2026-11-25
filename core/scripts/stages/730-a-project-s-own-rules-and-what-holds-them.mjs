// The stage of scripts/steps/730-a-project-s-own-rules-and-what-holds-them.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { at } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a project with no list of what holds its own rules; the mend runs the command the step words, which writes it)
  stage: dir => fs.rmSync(at(dir, "checks/holders.json"), { force: true }),
  mend: dir => {
    const r = spawnSync(process.execPath, ["core/scripts/holders.mjs", "--own", "--write"], { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`holders.mjs --own --write: ${r.stderr}`);
  },
};
