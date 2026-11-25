// The step of setup/sync-notes/771-no-workflow-holds-a-line-break-the-yaml-package-does-not-read.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { lineBreaksMended } from "../step-checks-workflow-text.mjs";
import { writeBreaks } from "../step-writers.mjs";

export default { lead: "20 November 2026, no workflow holds a line break the YAML package does not read", cost: COST.workflow, check: lineBreaksMended, write: writeBreaks };
