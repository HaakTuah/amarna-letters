// The step of setup/sync-notes/450-the-rules-in-folders-that-say-who-reads-them-or.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { movedPaths } from "../step-checks-moved.mjs";
import { writeMoved } from "../step-writers.mjs";

export default { lead: "16 November 2026, the rules in folders that say who reads them or when", cost: COST.line, check: movedPaths,
  partly: "a path the project builds from parts, or names in a file of no text, is no match a check finds", write: writeMoved };
