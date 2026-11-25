// The step of setup/sync-notes/680-the-project-s-tests-at-the-pace-of-a-release.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { testsWhenReady } from "../step-checks-ready.mjs";

export default { lead: "19 November 2026, the project's tests at the pace of a release", cost: COST.workflow, check: testsWhenReady,
  partly: "that the check the ruleset requires fails on a draft rather than being skipped, a suite started inside a workflow a job calls, which suites are the platform suites and on what schedule they run, how the runs on the default branch wait for the one in progress, only a waiting one giving way to a newer merge's, where the tests that guard only what a release brings run (#715), whether the host still asks an up-to-date branch where users get a release, a workflow that publishes otherwise than by `actions/deploy-pages` (a package registry, a store, a script of its own), whether the workflow a publishing one waits on holds every check run on the default branch and its one branch is the default one, and whether a tag, a release or a person's dispatch publishes only a green commit are read by the session that syncs, with `core/scripts/runners.mjs` and `core/scripts/merge-line.mjs`, not by a file" };
