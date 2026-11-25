// The stage of scripts/steps/710-issue-and-comment-text-read-for-the-personal.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { CORE } from "../core-address.mjs";
import { at, read, write, PIN } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (the daily job's call as the starter kit wrote it before: no secret passed; where the project has no daily job
  // of the kit's, as one of a release before it came, that call written)
  stage: dir => write(dir, ".github/workflows/look.yml", fs.existsSync(at(dir, ".github/workflows/look.yml"))
    ? read(dir, ".github/workflows/look.yml").replace(/(\r?\n) {4}secrets:\r?\n {6}PERSONAL_TERMS: .*\r?\n/u, "$1")
    : `name: look\n\non:\n  schedule:\n    - cron: '41 5 * * *'\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\njobs:\n  look:\n    permissions:\n      contents: read\n      issues: write\n      pull-requests: read\n      checks: read\n      statuses: read\n    uses: ${CORE}/.github/workflows/look.yml@${PIN}\n`),
  mend: dir => write(dir, ".github/workflows/look.yml", read(dir, ".github/workflows/look.yml").replace(/^( {4}uses: .*\/\.github\/workflows\/look\.yml@.*?(\r?\n))(?! {4}secrets:)/mu, "$1    secrets:$2      PERSONAL_TERMS: ${{ secrets.PERSONAL_TERMS }}$2")),
};
