// The step of setup/sync-notes/130-the-security-review-shown-on-every-pull-request.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { call } from "../workflow-calls.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "12 November 2026, the security review shown on every pull request", cost: COST.workflow,
  check: p => call(p, "security-review.yml") ? null
    : "The project has a `.github/workflows/security-review.yml` that calls the core's, as `core/setup/template/workflows/security-review.yml.tmpl` has it. In a private repository whose owner does not want it, the manifest's \"Differences\" says so on the owner's word.",
  partly: "that a security review its app did not post is posted as a comment opening \"Security review:\" is a session's practice, read by the review" };
