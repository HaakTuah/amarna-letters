// The step of setup/sync-notes/220-the-security-review-check-in-a-private.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { privateReview } from "../step-checks-host.mjs";

export default { lead: "13 November 2026, the security-review check in a private repository", cost: COST.workflow, host: privateReview };
