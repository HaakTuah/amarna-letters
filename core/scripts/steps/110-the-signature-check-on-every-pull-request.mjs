// The step of setup/sync-notes/110-the-signature-check-on-every-pull-request.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { readable } from "../workflow-calls.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "12 November 2026, the signature check on every pull request", cost: COST.workflow,
  check: p => {
    const file = p.workflows["signatures.yml"];
    if (!file) return null;
    readable({ workflows: { "signatures.yml": file } }, () => true);
    // (`on:` as GitHub takes it: one event's name, a list of names, or a mapping of each to its filters)
    const on = file.yaml?.on;
    const pr = on === "pull_request" || (Array.isArray(on) && on.includes("pull_request")) ? {} : on && typeof on === "object" && !Array.isArray(on) ? on.pull_request : undefined;
    if (!file.yaml || pr === undefined) return "`.github/workflows/signatures.yml` runs on every pull request (`on: pull_request:`), as the core's `signatures.yml` asks of its call.";
    return pr && (pr.paths || pr["paths-ignore"]) ? "`.github/workflows/signatures.yml` has no `paths:` or `paths-ignore:` under `pull_request:`: the core's workflow looks itself whether a package file changed." : null;
  } };
