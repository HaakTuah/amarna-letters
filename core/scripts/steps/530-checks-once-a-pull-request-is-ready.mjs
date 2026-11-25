// The step of setup/sync-notes/530-checks-once-a-pull-request-is-ready.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { readyOnlyHolds } from "../step-checks-ready.mjs";

export default { lead: "16 November 2026, checks once a pull request is ready", cost: COST.workflow, check: readyOnlyHolds,
  partly: "whether the repository is private is GitHub's setting, not a file's: `core/scripts/fresh.mjs`, which every sync runs, lists the trigger and the condition a private project's calls lack" };
