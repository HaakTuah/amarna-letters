// The step of setup/sync-notes/170-the-size-marks-count-the-same-on-every-machine.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { writeShrunk } from "../step-writers.mjs";

export default { lead: "13 November 2026, the size marks count the same on every machine", cost: COST.check, held: "the reading-size check",
  // (a mark the check fails as shrunk, lowered to what its failure gives)
  write: writeShrunk };
