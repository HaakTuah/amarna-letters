// The stage of scripts/steps/360-an-agent-s-own-tools-listed.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  // (a plug-in turned on and listed nowhere; the mend lists it, with its publisher and one exact version)
  stage: dir => {
    const file = ".claude/settings.json", settings = fs.existsSync(at(dir, file)) ? JSON.parse(read(dir, file)) : {};
    write(dir, file, `${JSON.stringify({ ...settings, enabledPlugins: { ...settings.enabledPlugins, "staged@example-market": true } }, null, 2)}\n`);
  },
  mend: dir => {
    const config = JSON.parse(read(dir, "checks/licences.json"));
    write(dir, "checks/licences.json", `${JSON.stringify({ ...config, agentTools: [...(config.agentTools ?? []), { kind: "plugin", name: "staged@example-market", publisher: "Example Tools", version: "1.0.0" }] }, null, 2)}\n`);
  },
};
