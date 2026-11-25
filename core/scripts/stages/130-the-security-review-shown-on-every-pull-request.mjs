// The stage of scripts/steps/130-the-security-review-shown-on-every-pull-request.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  stage: dir => {
    const file = at(dir, ".github/workflows/security-review.yml");
    if (fs.existsSync(file)) { write(dir, ".stage/security-review.yml", fs.readFileSync(file, "utf8")); fs.rmSync(file); }
  },
  mend: dir => { write(dir, ".github/workflows/security-review.yml", read(dir, ".stage/security-review.yml")); fs.rmSync(at(dir, ".stage"), { recursive: true }); },
};
