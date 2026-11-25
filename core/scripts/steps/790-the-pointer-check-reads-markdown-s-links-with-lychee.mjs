// The step of setup/sync-notes/790-the-pointer-check-reads-markdown-s-links-with-lychee.md, which steps.mjs, beside this folder, loads with the rest in the order
// of their names.
import { COST } from "../step-checks.mjs";
import { linkFindings } from "../step-checks-fetched.mjs";

export default { lead: "20 November 2026, the pointer check reads Markdown's links with lychee", cost: COST.check,
  unread: "the links that stood broken are read by lychee alone, which the pointer check's job fetches on the host's runners and a session only where its set-up fetched it (`bash core/scripts/lychee.sh`, its line set in the environment), and first on the sync pull request's own run, after the steps were read; each run of the check notes each the base held, and the session that syncs files the task that names those of the sync pull request's run, which no file a step reads holds",
  // (where the session's set-up fetched lychee: the broken links that stand, which the one task names, or done where none
  // stands, as the step of 780 reads its tools)
  fetched: { tools: ["LYCHEE"], check: p => {
    const found = linkFindings(p);
    return found && `File one task, an issue, that names each link the pointer check finds broken in the project's rule files, by file, line and link, unless one names them already, so that what stood is a debt the agents work down at the dose the codebase's state sets: ${found}.`;
  } } };
