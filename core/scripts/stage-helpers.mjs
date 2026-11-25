// What the stages of scripts/stages/ share, for the tests alone: the files they write into a project, and the text of
// the workflows they stage. Node's own modules.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";
import { copiesConfig } from "./check-configs.mjs";
import { project } from "./steps.mjs";

export const at = (dir, f) => path.join(dir, f);
export const read = (dir, f) => fs.readFileSync(at(dir, f), "utf8");
export const write = (dir, f, text) => { fs.mkdirSync(path.dirname(at(dir, f)), { recursive: true }); fs.writeFileSync(at(dir, f), text); };
// The manifest's line "Not taken:" without the module named, the line gone where it names no other.
export const notTakenWithout = (text, name) => text.replace(/^Not taken: (.*?)\.?(\r?\n|$)/m, (all, items, end) => {
  const kept = items.split(/, (?=`)/).filter(i => !i.startsWith(`\`${name}\``));
  return kept.length ? `Not taken: ${kept.join(", ")}.${end}` : "";
});
// A module taken off the manifest's "Modules:" list, as a list written before it came stands, and taken back onto it
// after the list's first name, as the step that places it words its mend (the stages of 470 and 500).
export const modulesWithout = (text, name) => text.split(`\`${name}\`, `).join("");
export const modulesWith = (text, name) => text.replace(/^(Floor: whole\. Modules: `[^`]+`)/m, `$1, \`${name}\``);
export const SLOTS = /^(\| Slot \| Here \|\r?\n\| --- \| --- \|\r?\n)/m;

export const PIN = "0".repeat(40);
// (whether the project's call to core.yml runs the NuGet check in its one job: #376)
export const folds = (dir, key) => fs.existsSync(at(dir, ".github/workflows/core.yml")) && new RegExp(`^ {6}${key}: `, "m").test(read(dir, ".github/workflows/core.yml"));
export const NUGET = `name: nuget\n\non:\n  pull_request:\n\npermissions:\n  contents: read\n\njobs:\n  nuget:\n    uses: ${CORE}/.github/workflows/nuget.yml@${PIN}\n    with:\n      config: checks/licences.json\n`;

// (a suite of the project's own that reads the core's scripts, run on a change to them and to its own code)
export const SCRIPTS = "name: scripts-staged\n\non:\n  pull_request:\n    paths:\n      - 'src/**'\n      - 'core/scripts/**'\n\npermissions:\n  contents: read\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo test\n";
// (a suite of the project's own whose path filter leaves the copy and the manifest out, as it was told, and not the
// files that hold only calls to the core's workflows, whose pins a sync moves)
export const SUITE = "name: suites-staged\n\non:\n  pull_request:\n    paths-ignore:\n      - 'core/**'\n      - 'core-manifest.md'\n\npermissions:\n  contents: read\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo the suite\n";

// (a rule file of an agent tool's, which the copies and pointer checks read since #405)
export const STAGED = ".agents/rules/staged.md";
export const copies = (dir, flag) => spawnSync(process.execPath, ["core/scripts/copies.mjs", copiesConfig(project(dir)), flag], { cwd: dir, encoding: "utf8", env: { ...process.env, COPIES_BASE: "" } });

// (a workflow of the project's own with a key twice in a step, which GitHub refuses)
export const TWICE = "name: twice-staged\n\non:\n  push:\n\npermissions:\n  contents: read\n\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo a\n        if: github.event_name == 'push'\n        if: always()\n";

// A job of the tests on a pull request and on a push, which selects them; PASSED is where --passed stands (#457). It
// names no SELECT_BASE, which the step of the tests a change can reach reads, so that staging this one leaves that
// one's reading as it was.
export const PUSHED = "name: tests-pushed\n\non:\n  pull_request:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  tests:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      checks: read\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 2\n          persist-credentials: false\n      - run: node core/scripts/install.mjs all\n      - run: node core/scripts/select.mjs --env RUNPASSED\n        env:\n          SELECT_PASSED: ${{ github.event_name == 'push' && github.run_attempt == 1 && 'tests' || '' }}\n          GH_TOKEN: ${{ github.event_name == 'push' && github.token || '' }}\n      - run: if [ \"$RUN\" = all ]; then node --test; elif [ \"$RUN\" != none ]; then node --test $RUN; fi\n";

// A job of the project's own that starts a suite through the shape check (#733, point 7): TYPES, its trigger's types,
// and IF, its job's condition, filled in by the stage and the mend.
export const READY = "name: suites-ready\n\non:\n  pull_request:TYPES\n\npermissions:\n  contents: read\n\njobs:\n  test:\nIF    runs-on: ubuntu-latest\n    steps:\n      - run: node core/scripts/install.mjs all\n      - run: node core/scripts/shape.mjs checks/shape.json --suite unit -- node --test\n";
