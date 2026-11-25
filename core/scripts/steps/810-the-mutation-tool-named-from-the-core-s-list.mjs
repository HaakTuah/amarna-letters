// The step of setup/sync-notes/810-the-mutation-tool-named-from-the-core-s-list.md, which steps.mjs, beside this folder, loads with the rest
// in the order of their names.
import { COST } from "../step-checks.mjs";
import { named } from "../mutation-tools.mjs";

export default { lead: "23 November 2026, the mutation tool named from the core's list", cost: COST.line, check: named };
