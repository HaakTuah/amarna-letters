// The step of setup/sync-notes/560-a-team-s-owners-read-from-the-host.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { reviewers } from "../step-checks-host.mjs";

export default { lead: "17 November 2026, a team's owners read from the host", cost: COST.workflow, host: reviewers };
