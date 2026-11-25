// The step of setup/sync-notes/821-pip-s-download-and-wheel-read-as-its-install.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { fetchesHeld } from "../step-checks-packages.mjs";

export default { lead: "23 November 2026, pip's download and wheel read as its install", cost: COST.check, check: fetchesHeld };
