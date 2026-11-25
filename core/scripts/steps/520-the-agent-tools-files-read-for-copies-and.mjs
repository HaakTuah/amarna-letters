// The step of setup/sync-notes/520-the-agent-tools-files-read-for-copies-and.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { toolFilesListed } from "../step-checks-tool-files.mjs";
import { writeToolCopies } from "../step-writers.mjs";

export default { lead: "16 November 2026, the agent tools' files read for copies and pointers", cost: COST.config, check: toolFilesListed, write: writeToolCopies };
