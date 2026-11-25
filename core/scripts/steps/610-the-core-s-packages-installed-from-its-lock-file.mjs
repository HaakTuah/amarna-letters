// The step of setup/sync-notes/610-the-core-s-packages-installed-from-its-lock-file.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";

export default { lead: "18 November 2026, the core's packages installed from its lock file", cost: COST.workflow,
  unread: "nothing is asked of a project from #1093 on: each script of the copy installs the core's packages itself before it reads, or says it did not run and why, failing nothing" };
