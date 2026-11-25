// The step of setup/sync-notes/080-a-sync-and-the-project-s-own-suites.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { suitesOnPins } from "../step-checks-ready.mjs";

export default { lead: "12 November 2026, a sync and the project's own suites", cost: COST.workflow, check: suitesOnPins,
  partly: "which suites a project's workflows run for a change under `core/` is their own logic, and a workflow that selects through `core/scripts/select.mjs` in one job is passed whole, though another of its jobs may run a suite unfiltered: both read by the review" };
