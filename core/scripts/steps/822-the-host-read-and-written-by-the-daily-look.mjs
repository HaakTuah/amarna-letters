// The step of setup/sync-notes/822-the-host-read-and-written-by-the-daily-look.md, which steps.mjs, beside this folder, loads with the rest
// in the order of their names.
import { COST } from "../step-checks.mjs";
import { hostRead } from "../step-checks-host.mjs";

export default { lead: "23 November 2026, the host read and written by the daily look", cost: COST.check, host: hostRead };
