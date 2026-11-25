// The step of setup/sync-notes/550-the-checks-as-one-job.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { oneJobHolds } from "../step-checks-ready.mjs";

export default { lead: "17 November 2026, the checks as one job", cost: COST.workflow, check: oneJobHolds,
  partly: "whether the repository is private, and whether a ruleset requires a check by a name the change takes away, are GitHub's settings, not files: `core/scripts/fresh.mjs`, which every sync runs, lists the one call a project's calls differ from, and a required check's name is the owner's to move" };
