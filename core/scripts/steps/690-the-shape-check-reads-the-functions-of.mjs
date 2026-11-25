// The step of setup/sync-notes/690-the-shape-check-reads-the-functions-of.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { writeShape } from "../step-writers.mjs";
import { shapeLeft, shapeReadsParsed } from "../step-checks-shape.mjs";

export default { lead: "19 November 2026, the shape check reads the functions of JavaScript and TypeScript on the parser", cost: COST.config, check: p => shapeReadsParsed(p, "javascript-tree"), write: writeShape,
  left: shapeLeft };
