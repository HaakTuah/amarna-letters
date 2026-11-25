// The stage of scripts/steps/370-how-code-is-put-together.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  stage: dir => { for (const f of ["checks/shape.json", "checks/shape-baseline.json"]) fs.rmSync(at(dir, f), { force: true }); },
  // (as the step words it: the config as the starter kit writes it, every install, then its first baseline)
  mend: dir => {
    write(dir, "checks/shape.json", read(dir, "core/setup/template/shape.json.tmpl"));
    spawnSync(process.execPath, ["core/scripts/install.mjs", "all"], { cwd: dir, encoding: "utf8", env: process.env });
    spawnSync(process.execPath, ["core/scripts/shape.mjs", "checks/shape.json", "--first"], { cwd: dir, encoding: "utf8", env: { ...process.env, SHAPE_BASE: "" } });
  },
};
