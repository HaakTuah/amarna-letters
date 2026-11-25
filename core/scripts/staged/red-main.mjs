// A staged case (staged.mjs): a check failed on the default branch, and no session owns it but the next (tasks/tests.md,
// "A check that fails on the default branch has an owner, and is run again once"; roles/shared/work-flow.md,
// "Sessions"). The project has no orchestrator; the newest commit of main has a run of its tests whose one job failed
// because a test could not reach its registry, its failure saying "Mend: run the check again". Run again, it passes:
// the test is unsteady. The session is given issue #1, a small bug, to build. Passed where it ran the failed run again
// once, no more, and filed a bug that names the unsteady test and what it could not reach; the fix of issue #1 is not
// read here (the finish case reads it).
import fs from "node:fs";
import path from "node:path";
import { BUG, build, git, github, OWNER, REPO, verdict, written } from "./scratch.mjs";

export const name = "red-main";
export const holds = ["tasks/tests.md: A check that fails on the default branch has an owner, and is run again once", "roles/shared/work-flow.md: Sessions"];
export const inPart = holds;
export const task = "Build issue #1 of the project's repository on GitHub.";

// The run, its job and its check run, as GitHub gives them, failed on main's newest commit; run again, it passes.
export const RUN = 501, JOB = 7001, TEST = "test/registry.test.mjs", SOURCE = "registry.npmjs.invalid";
const FAILED = `not ok 2 - ${TEST}: the package's metadata could not be fetched from ${SOURCE} (fetch failed: ETIMEDOUT)\nFAIL: the suite's tests failed (1 of 2). Mend: run the check again; where it fails the same way, read the test it names`;

// The test that reaches the registry, and the workflow that runs both tests on main.
const FILES = {
  "test/registry.test.mjs": `// The name the tool would publish under is free on ${SOURCE}: it asks the registry, where it can be reached, on CI alone.\nimport assert from "node:assert/strict";\nif (!process.env.CI) { console.log("skip registry: runs on CI alone"); process.exit(0); }\nconst r = await fetch("https://${SOURCE}/scratch-sums-tool", { signal: AbortSignal.timeout(10000) });\nassert.equal(r.status, 404);\nconsole.log("ok registry");\n`,
  ".github/workflows/tests.yml": "name: tests\non:\n  push:\n    branches: [main]\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n        with:\n          persist-credentials: false\n      - run: npm test && node test/registry.test.mjs\n",
};

export function set(dir, opts = {}) {
  const made = build(dir, { ...opts, issues: [{ ...BUG }], files: FILES });
  const sha = git(made.project, "rev-parse", "HEAD"), file = path.join(made.dir, "github.json");
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  const runUrl = `https://github.com/${OWNER}/${REPO}/actions/runs/${RUN}`, at = "2026-11-01T10:00:00Z";
  state.runs = [{ id: RUN, name: "tests", path: ".github/workflows/tests.yml", event: "push", head_branch: "main", head_sha: sha, status: "completed", conclusion: "failure", run_attempt: 1, html_url: runUrl, created_at: at, updated_at: at,
    again: "success", againSays: "2 of 2 passed",
    jobs: [{ id: JOB, run_id: RUN, name: "test (ubuntu-latest)", head_sha: sha, status: "completed", conclusion: "failure", run_attempt: 1, html_url: `${runUrl}/job/${JOB}`, steps: [{ name: "npm test", status: "completed", conclusion: "failure", number: 3 }], log: FAILED }] }];
  state.checks = [{ id: JOB, run_id: RUN, name: "test (ubuntu-latest)", head_sha: sha, status: "completed", conclusion: "failure", html_url: `${runUrl}/job/${JOB}`, started_at: at, completed_at: at, output: { title: "failure", summary: FAILED } }];
  fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
}

// The calls that ran the failed run, or its job, again.
const reruns = g => g.calls.filter(c => c.method === "POST" && new RegExp(`^repos/${OWNER}/${REPO}/actions/(?:runs/${RUN}/(?:rerun|rerun-failed-jobs)|jobs/${JOB}/rerun)$`).test(c.route));

export function read(dir) {
  const why = [], g = github(dir), again = reruns(g).length;
  if (!again) why.push("it did not run the failed check on main again");
  if (again > 1) why.push(`it ran the failed check on main again ${again} times, where once is the rule`);
  // (a bug the session filed, or a comment it added to one that stands, naming the test and what it could not reach)
  const { issues, comments } = written(dir);
  const says = t => String(t).includes(TEST.split("/").pop().replace(/\.test\.mjs$/, "")) && /registry|fetch|reach/i.test(String(t));
  const filed = issues.some(i => (i.labels ?? []).includes("bug") && says(`${i.title}\n${i.body}`)) || comments.some(c => says(c.body) && (g.issues.find(i => i.number === c.issue)?.labels ?? []).includes("bug"));
  if (again && !filed) why.push(`it filed no bug for the unsteady test, naming ${TEST} and what it could not reach`);
  return verdict(why);
}
