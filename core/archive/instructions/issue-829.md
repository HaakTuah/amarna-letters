# The reasons behind the core: issue #829

The index, and how an item is written: `archive/instructions.md`.

#829. **19 November 2026**, #829. A pull request's description is written in as few edits as the work allows: its
     draft opens with its first line and the line that says what it waits on, the rest is written in one edit after the
     last push and before it is marked ready, and later edits come only where what it says changes, gathered into one.
     Each edit starts the checks that read the description, two jobs in the core and about 76 an hour that day (#820),
     which hold runner slots and, on a private repository's free plan, bill a whole minute each. The orchestrator had
     given it as an order for the core's own sessions; a chat session recommended it as a rule for every project, since
     a project on a private repository pays most and the order did not reach it, and the owner agreed to it as a rule
     for every project, to come in that release. It stands behind "A description is written in as few edits as the
     work allows" in `roles/shared/work-flow.md`.
