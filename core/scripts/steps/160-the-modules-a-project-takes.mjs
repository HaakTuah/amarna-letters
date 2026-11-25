// The step of setup/sync-notes/160-the-modules-a-project-takes.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { placing } from "../step-checks-modules.mjs";
import { writePlaced } from "../step-writers.mjs";

export default { lead: "13 November 2026, the modules a project takes", cost: COST.line,
  // (each module the list neither takes nor leaves out, but the three the steps of their own place, placed from what is
  // read exactly, the rest taken as the kit takes them and asked of the owner once: step-checks-modules.mjs; #1094)
  check: placing({ except: ["done-when.md", "planning.md", "repositories.md"] }), write: writePlaced({ except: ["done-when.md", "planning.md", "repositories.md"] }) };
