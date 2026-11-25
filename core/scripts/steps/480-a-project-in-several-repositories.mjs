// The step of setup/sync-notes/480-a-project-in-several-repositories.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { placing } from "../step-checks-modules.mjs";
import { writePlaced } from "../step-writers.mjs";

export default { lead: "16 November 2026, a project in several repositories", cost: COST.line,
  // (one repository, its copy whole under core/, leaves it out; a library or another path takes it: step-checks-modules.mjs, #1094)
  check: placing({ only: ["repositories.md"] }), write: writePlaced({ only: ["repositories.md"] }) };
