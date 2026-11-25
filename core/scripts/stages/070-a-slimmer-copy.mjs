// The stage of scripts/steps/070-a-slimmer-copy.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { read, write } from "../stage-helpers.mjs";

export default {
  stage: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^(Paths: .*?)( or archive\/)/m, "$1, archive/ or reports/")),
  mend: dir => {
    const want = /^Paths: .*$/m.exec(fs.readFileSync(fileURLToPath(new URL("../../setup/template/core-manifest.md.tmpl", import.meta.url)), "utf8"))[0];
    write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^Paths: .*$/m, want));
  },
};
