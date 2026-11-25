// The step of setup/sync-notes/400-the-nuget-check-where-it-can-matter.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";

export default { lead: "16 November 2026, the NuGet check where it can matter", cost: COST.workflow,
  unread: "nothing is asked of a project from #1093 on: a private project's NuGet check runs as a step of `core.yml`'s one job, and the sync takes out the core's `nuget.yml` whose `paths:` this step read (#1083); a `nuget.yml` the project keeps as its own is named by `core/scripts/fresh.mjs` as a difference" };
