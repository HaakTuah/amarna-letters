// The step of setup/sync-notes/710-issue-and-comment-text-read-for-the-personal.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { calls } from "../workflow-calls.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "19 November 2026, issue and comment text read for the personal terms", cost: COST.workflow,
  // (each call of the core's daily job passes it the personal-terms check's secret, by name or by `inherit`; a project
  // with no such call, whose orchestrator runs the look, has nothing to do)
  check: p => calls(p, "look.yml").every(job => job.secrets === "inherit" || /^\$\{\{\s*secrets\.PERSONAL_TERMS\s*\}\}$/u.test(String(job.secrets?.PERSONAL_TERMS ?? "").trim())) ? null
    : "Each job of the project's that calls the core's `look.yml` passes it the secret, as `core/setup/template/workflows/look.yml.tmpl` has it: under its `uses:`, `secrets:` and below it `PERSONAL_TERMS: ${{ secrets.PERSONAL_TERMS }}`.",
  partly: "whether the owner has set the secret `PERSONAL_TERMS` is the repository's setting, which no file holds" };
