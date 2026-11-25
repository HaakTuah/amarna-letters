// The step of setup/sync-notes/780-the-workflow-check-runs-zizmor-and-actionlint.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { workflowFindings } from "../step-checks-fetched.mjs";

export default { lead: "20 November 2026, the workflow check runs zizmor and actionlint", cost: COST.check,
  unread: "the findings that stood are read by the two tools alone, which the workflow check's job fetches on the host's runners and a session only where its set-up fetched them (`bash core/scripts/workflow-tools.sh`, its lines set in the environment), and first on the sync pull request's own run, after the steps were read; each run of the check notes each finding the base held, and the session that syncs files the task that names those of the sync pull request's run, which no file a step reads holds",
  // (where the session's set-up fetched both tools: the findings that stand, which the one task names, or done where none
  // stands; a task filed already is read by no file a step reads, so the step reads not done until they are worked down)
  fetched: { tools: ["ZIZMOR", "ACTIONLINT"], check: p => {
    const found = workflowFindings(p);
    return found && `File one task, an issue, that names each finding the workflow check holds against the project's workflows and actions, by file, line and audit, unless one names them already, so that what stood is a debt the agents work down at the dose the codebase's state sets: ${found}.`;
  } } };
