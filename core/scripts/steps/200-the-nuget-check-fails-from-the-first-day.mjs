// The step of setup/sync-notes/200-the-nuget-check-fails-from-the-first-day.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { given } from "../workflow-calls.mjs";
import { COST } from "../step-checks.mjs";

export default { lead: "13 November 2026, the NuGet check fails from the first day", cost: COST.workflow,
  check: p => {
    return [...given(p, "nuget.yml", "advisory"), ...given(p, "core.yml", "advisory")].some(({ value }) => value === true || value === "true")
      ? "The project's call to the core's `nuget.yml` (or `core.yml`) no longer passes `advisory: true` (it stays only while a fault of the check's own is reported to the core)." : null;
  },
  partly: "whether its audit holds an entry of \"kind\": \"nuget\" for a package that ships is read by the NuGet check where it counts" };
