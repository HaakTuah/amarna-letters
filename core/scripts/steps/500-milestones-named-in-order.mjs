// The step of setup/sync-notes/500-milestones-named-in-order.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { placing } from "../step-checks-modules.mjs";
import { writePlaced } from "../step-writers.mjs";

export default { lead: "16 November 2026, milestones named in order", cost: COST.line,
  // (whether a project names milestones is the owner's to confirm: the module is taken, as the kit takes it, and asked
  // of the owner once; step-checks-modules.mjs, #1094)
  check: placing({ only: ["planning.md"] }), write: writePlaced({ only: ["planning.md"] }) };
