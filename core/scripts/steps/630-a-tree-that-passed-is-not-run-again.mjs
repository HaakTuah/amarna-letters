// The step of setup/sync-notes/630-a-tree-that-passed-is-not-run-again.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { passedRuns } from "../step-checks-tests.mjs";

export default { lead: "18 November 2026, a tree that passed is not run again", cost: COST.workflow, check: passedRuns,
  partly: "which check gates a project's tests is the project's own, as its ruleset names it, and which entries of a job's matrix a pull request leaves out is a reading of its expressions" };
