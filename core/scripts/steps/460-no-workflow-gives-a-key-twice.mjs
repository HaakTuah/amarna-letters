// The step of setup/sync-notes/460-no-workflow-gives-a-key-twice.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { keysOnce } from "../step-checks-workflow-text.mjs";

export default { lead: "16 November 2026, no workflow gives a key twice", cost: COST.workflow, check: keysOnce };
