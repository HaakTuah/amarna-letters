// The step of setup/sync-notes/420-how-strong-the-tests-are.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { strengthNamed } from "../step-checks-tests.mjs";

export default { lead: "16 November 2026, how strong the tests are", cost: COST.workflow, check: strengthNamed,
  partly: "which mutation tool fits the project's language is a reading of the project; the row says it, or `none` with its reason" };
