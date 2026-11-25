// The step of setup/sync-notes/824-the-size-marks-read-what-the-core-s-part-imports.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { startCounted, writeStart } from "../step-marks-start.mjs";

export default { lead: "24 November 2026, the size marks read what the core's part imports", cost: COST.line, check: startCounted, write: writeStart };
