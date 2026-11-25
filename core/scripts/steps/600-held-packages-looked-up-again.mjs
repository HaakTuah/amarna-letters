// The step of setup/sync-notes/600-held-packages-looked-up-again.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { lookedUp } from "../step-checks-host.mjs";

export default { lead: "17 November 2026, held packages looked up again", cost: COST.read, host: lookedUp };
