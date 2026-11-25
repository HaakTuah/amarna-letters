// The stage of scripts/steps/540-a-new-package-looked-up.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write } from "../stage-helpers.mjs";

export default {
  // (a project that runs the exact-versions and NuGet checks from a workflow of its own, without either lookup; its
  // workflow runs no licence or agent-tools script, whose own steps a workflow running them beside these would answer)
  stage: dir => write(dir, ".github/workflows/packages-own.yml", "name: packages-own\n\non:\n  pull_request:\n\npermissions:\n  contents: read\n\njobs:\n  packages:\n    runs-on: ubuntu-latest\n    steps:\n      - run: node core/scripts/install.mjs\n      - run: node core/scripts/exact-versions.mjs checks/licences.json\n      - run: node core/scripts/nuget.mjs checks/licences.json --packages packages\n"),
  mend: dir => write(dir, ".github/workflows/packages-own.yml", read(dir, ".github/workflows/packages-own.yml").replace("    steps:\n      - run: node core/scripts/install.mjs\n", "    steps:\n      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 2\n          persist-credentials: false\n      - run: node core/scripts/install.mjs\n      - run: node core/scripts/lookup.mjs checks/licences.json --nuget\n      - run: node core/scripts/lookup.mjs checks/licences.json\n")),
};
