// The stage of scripts/steps/821-pip-s-download-and-wheel-read-as-its-install.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { licenceConfig } from "../check-configs.mjs";
import { project } from "../steps.mjs";
import { read, write } from "../stage-helpers.mjs";

const FILE = "stage-fetch/wheels.sh";

export default {
  // (a script that fetches wheels by pip, which no entry of the audit names; the mend writes the entry the step words)
  stage: dir => write(dir, FILE, "pip download --require-hashes -r requirements.txt -d wheels\n"),
  mend: dir => {
    const file = JSON.parse(read(dir, licenceConfig(project(dir)))).audit, audit = JSON.parse(read(dir, file));
    const entry = { name: "Mosspy", kind: "tool", licence: "MIT", files: [FILE], used: "stage-fetch/wheels.sh fetches its wheels." };
    write(dir, file, `${JSON.stringify({ ...audit, entries: [...audit.entries, entry] }, null, 2)}\n`);
  },
};
