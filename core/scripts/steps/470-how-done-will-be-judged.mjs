// The step of setup/sync-notes/470-how-done-will-be-judged.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { placing } from "../step-checks-modules.mjs";
import { writePlaced } from "../step-writers.mjs";

export default { lead: "16 November 2026, how done will be judged", cost: COST.line,
  // (whether a project's users notice its changes is the owner's to confirm: the module is taken, as the kit takes it,
  // and asked of the owner once; step-checks-modules.mjs, #1094)
  check: placing({ only: ["done-when.md"] }), write: writePlaced({ only: ["done-when.md"] }) };
