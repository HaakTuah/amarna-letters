// The step of setup/sync-notes/370-how-code-is-put-together.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { writeShape } from "../step-writers.mjs";
import { shapeLeft, shapeWritten } from "../step-checks-shape.mjs";

export default { lead: "16 November 2026, how code is put together", cost: COST.config, check: shapeWritten,
  partly: "which folders hold the project's code, which files are its tests and what its systems are is a reading of the project, which its audit's first question answers", write: writeShape,
  left: shapeLeft };
