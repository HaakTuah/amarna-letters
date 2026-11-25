// The step of setup/sync-notes/320-labels-and-openers.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { labels } from "../step-checks-host.mjs";

export default { lead: "15 November 2026, labels and openers", cost: COST.read, host: labels };
