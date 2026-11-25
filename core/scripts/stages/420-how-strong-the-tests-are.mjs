// The stage of scripts/steps/420-how-strong-the-tests-are.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { spawnSync } from "node:child_process";
import { read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  stage: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").split(/\r?\n/).filter(l => !l.includes("*mutation tool*")).join("\n")),
  // (as the step words it: the script's writer, which writes the row the core's list gives the project)
  mend: dir => { spawnSync(process.execPath, ["core/scripts/mutation-tools.mjs", "--write"], { cwd: dir, encoding: "utf8" }); },
};
