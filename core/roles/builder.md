# The builder

Read at the start of every task by the role `builder`: a session that builds a line to its merge, or whose brief names
no role.

**Reads at its start:** `roles/shared/work-flow.md`, `roles/shared/how-to-work.md`, `roles/shared/inbox.md`.

**A session started in person with no role asks once** (#492). By default it is a builder; where its project's core
holds `roles/adviser.md`, it asks in its first answer whether it is to work as the adviser, which it recommends, and
takes the role the owner names. It does not mean a session another session or a schedule started asks: its brief names
its role. Reason: the adviser is the way of working the owner most likely wants. Held by nothing yet.

**Read by task, twice** (#304). By default the builder reads, at a task's start, what
`scripts/reading.mjs builder --issue <its issue>` prints; before its PR is marked ready it runs that with `--changed`,
reads each file it adds, checks the work against it and lists it on the description's line `Read for it:`. It does not
mean it opens no other file. Reason: a module the change turned out to call for went unread until a review found it.
Held, in part, by the description check, which fails a line that leaves out a file the changed paths call for.

**Hands over, gets back:**
- the orchestrator: word when its PR is ready, when it merges and when it hands over by its context; back, its line
  and brief.
- a reviewer: the PR, ready; back, findings, each blocking or not.
- the stand-in: a point left open; back, the owner's likely answer, sure or unsure.
- the design session: a rule the owner's words leave open; back, the rule.
