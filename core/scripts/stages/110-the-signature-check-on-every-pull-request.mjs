// The stage of scripts/steps/110-the-signature-check-on-every-pull-request.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { CORE } from "../core-address.mjs";
import { at, read, write, PIN } from "../stage-helpers.mjs";

export default {
  stage: dir => write(dir, ".github/workflows/signatures.yml", fs.existsSync(at(dir, ".github/workflows/signatures.yml"))
    ? read(dir, ".github/workflows/signatures.yml").replace(/^  pull_request:[ \t]*$/m, "  pull_request:\n    paths: [\"package-lock.json\"]")
    : `name: signatures\n\non:\n  pull_request:\n    paths: ["package-lock.json"]\n\npermissions:\n  contents: read\n\njobs:\n  signatures:\n    uses: ${CORE}/.github/workflows/signatures.yml@${PIN}\n`),
  mend: dir => write(dir, ".github/workflows/signatures.yml", read(dir, ".github/workflows/signatures.yml").replace(/^    paths: .*\r?\n/m, "")),
};
