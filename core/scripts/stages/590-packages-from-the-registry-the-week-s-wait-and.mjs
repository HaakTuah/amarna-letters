// The stage of scripts/steps/590-packages-from-the-registry-the-week-s-wait-and.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { licenceConfig } from "../check-configs.mjs";
import { project } from "../steps.mjs";
import { read, write } from "../stage-helpers.mjs";

export default {
  // (an .npmrc that keeps install scripts off and that stood without the week's wait; the mend adds the line the step words)
  stage: dir => {
    const file = licenceConfig(project(dir)), config = JSON.parse(read(dir, file));
    write(dir, "stage-wait/.npmrc", "ignore-scripts=true\n");
    write(dir, file, `${JSON.stringify({ ...config, ignoreScriptsIn: [...(config.ignoreScriptsIn ?? []), "stage-wait/.npmrc"] }, null, 2)}\n`);
  },
  mend: dir => write(dir, "stage-wait/.npmrc", `${read(dir, "stage-wait/.npmrc")}min-release-age=7\n`),
};
