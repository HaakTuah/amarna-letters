// The step of setup/sync-notes/380-hostile-tests-for-every-named-input.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { hostileTests } from "../step-checks-hostile.mjs";

export default { lead: "16 November 2026, hostile tests for every named input", cost: COST.read, check: hostileTests,
  partly: "whether every input is listed, whether its limits are those its reader holds, whether it carries a version number its item does not speak of, and whether its tests try each case, is a reading of the project, held by the security review" };
