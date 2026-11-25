// The step of setup/sync-notes/720-the-shape-check-reads-the-functions-of-python-on.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { writeShape } from "../step-writers.mjs";
import { shapeLeft, shapeReadsParsed } from "../step-checks-shape.mjs";

export default { lead: "19 November 2026, the shape check reads the functions of Python on the parser", cost: COST.config, check: p => shapeReadsParsed(p, "python-tree"), write: writeShape,
  left: shapeLeft };
