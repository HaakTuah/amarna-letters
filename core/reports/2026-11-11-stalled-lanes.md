# The orchestrator looks for stalled lanes on every wake

**What:** the orchestrating module's rule for a lane whose session is gone now also covers a session that is still
there but idle, and is looked for on every wake: an open PR with no push for a few hours, its session ended,
unreachable or idle, goes to a fresh builder from its branch; not one that waits only on the owner's yes.

**Why:** on 11 November both games had a lane stalled for hours (a balance-pass draft and a hunger change with failing
suites) whose sessions had stopped working; the orchestrators, which were running, did not restart them until the owner
alerted them. The rule covered only a session the orchestrator could not reach, and did not say when to look.

**What it changes in every project:** an orchestrator restarts such a lane by itself, on its next wake.
