// The step of setup/sync-notes/390-secret-scanning-with-push-protection.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { scanning, scanningOwner } from "../step-checks-host.mjs";

// (`owner`: the owner's in a private repository, where it may be billed; a session's in a public one: floor topic 9)
export default { lead: "16 November 2026, secret scanning with push protection", cost: COST.read, host: scanning, owner: scanningOwner };
