// The stage of scripts/steps/200-the-nuget-check-fails-from-the-first-day.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write, folds, NUGET } from "../stage-helpers.mjs";

export default {
  // (where core.yml's one job runs the NuGet check, on that call: #376)
  stage: dir => folds(dir, "nuget") ? write(dir, ".github/workflows/core.yml", read(dir, ".github/workflows/core.yml").replace(/^( {6}nuget: .*\r?\n)/m, "$1      advisory: true\n"))
    : write(dir, ".github/workflows/nuget-staged.yml", `${NUGET.replace("name: nuget", "name: nuget-staged")}      advisory: true\n`),
  mend: dir => { for (const f of ["nuget-staged.yml", "core.yml"]) if (fs.existsSync(at(dir, `.github/workflows/${f}`))) write(dir, `.github/workflows/${f}`, read(dir, `.github/workflows/${f}`).replace(/^      advisory: true\r?\n/m, "")); },
};
