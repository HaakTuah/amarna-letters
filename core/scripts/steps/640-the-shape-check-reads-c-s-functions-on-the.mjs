// The step of setup/sync-notes/640-the-shape-check-reads-c-s-functions-on-the.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { writeShape } from "../step-writers.mjs";
import { shapeLeft, shapeReadsParsed } from "../step-checks-shape.mjs";

export default { lead: "18 November 2026, the shape check reads C#'s functions on the parser", cost: COST.config, check: p => shapeReadsParsed(p, "csharp-tree"), write: writeShape,
  left: shapeLeft };
