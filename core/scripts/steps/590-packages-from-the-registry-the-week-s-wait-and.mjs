// The step of setup/sync-notes/590-packages-from-the-registry-the-week-s-wait-and.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { packagesHeld } from "../step-checks-packages.mjs";

export default { lead: "17 November 2026, packages from the registry, the week's wait and pinned downloads", cost: COST.check, check: packagesHeld };
