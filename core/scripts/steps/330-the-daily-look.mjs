// The step of setup/sync-notes/330-the-daily-look.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { daily } from "../step-checks-host.mjs";

export default { lead: "16 November 2026, the daily look", cost: COST.workflow, host: daily };
