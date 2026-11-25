// The step of setup/sync-notes/770-a-project-read-against-the-core.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { RECORD, due, said } from "../core-reading.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "20 November 2026, a project read against the core",
  cost: COST.reading,
  // (the record of the readings, core-reading.mjs's RECORD, covers every rule the project takes as the copy holds it;
  // what the reading finds is the project's to work down at the dose, which nothing fails)
  check: p => said(due(p.manifest, p.read(RECORD))) };
