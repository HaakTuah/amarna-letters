// The step of setup/sync-notes/310-the-owner-s-inbox-where-issues-cannot-be-reached.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { inbox } from "../step-checks-host.mjs";

export default { lead: "15 November 2026, the owner's inbox where issues cannot be reached", cost: COST.read, host: inbox };
