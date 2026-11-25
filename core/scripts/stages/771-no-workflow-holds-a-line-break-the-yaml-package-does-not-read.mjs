// The stage of scripts/steps/771-no-workflow-holds-a-line-break-the-yaml-package-does-not-read.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, write } from "../stage-helpers.mjs";

const FILE = ".github/workflows/breaks-staged.yml", TEXT = "name: breaks-staged\n\non:\n  push:\n\npermissions:\n  contents: read\n\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo a\n";

export default {
  // (a workflow with a U+2028 in a comment and one ending a plain value; the mend replaces it with a line feed, and the file goes after)
  stage: dir => write(dir, FILE, TEXT.replace("\n\non:", "\u2028\n\non:").replace("name:", "# a\u2028name:")),
  after: dir => fs.rmSync(at(dir, FILE), { force: true }),
  mend: dir => write(dir, FILE, TEXT),
};
