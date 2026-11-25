// The step of setup/sync-notes/670-the-parser-s-packages-installed-where-the-shape.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";

export default { lead: "19 November 2026, the parser's packages installed where the shape check runs", cost: COST.workflow,
  unread: "nothing is asked of a project from #1093 on: the shape check and the selection of tests install the parser's packages themselves before they read, or say they did not run and why, failing nothing" };
