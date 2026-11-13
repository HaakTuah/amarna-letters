# Running builder sessions and lanes

Read by the orchestrator (`modules/roles.md`) when it starts.

**It builds nothing itself** (core archive 27): every lane goes to a builder session of its own, with its own brief,
another provider's first (`modules/roles.md`), at the builder's model and effort (`modules/claude.md`). Its own context
stays small: claims, starting and handing over sessions, passing on the owner's word. Only if it cannot start builder
sessions does it say so and stop.

- **On every wake,** the hourly check included (on the owner's computer only one the owner set up: floor rule 8; core
  archive 42, 44 and 124): pull `main`; if a rule file changed, re-read it and pass what touches them to the running
  builders in one message; if `setup/sync-notes.md` gained entries, a lane does what they ask; sync the core in a
  routine lane and read the late reviews, as "Sessions" in `modules/work-flow.md` says; turn back on any scheduled
  workflow GitHub switched off for want of activity (`gh workflow enable`); act on what is new in the *progress file*;
  once an open idea has waited a week with no verdict of the stand-in's, call the stand-in (`modules/inbox.md`).
- **Hand over at once:** start the next session as soon as a task merges. One session per task, continued for its review
  fixes while its context is under an hour old and small; otherwise a fresh one (core archive 10).
- **A finished session is archived** by the orchestrator, never by itself, where the tool that runs the sessions can
  (core archive 185): once its task merged, or it stopped with its work pushed and its note in the *progress file* (for
  usage too: a fresh builder picks up from the branch), its last message read and nothing scheduled bound to it. It
  first checks that the session cleaned up ("Sessions" in `modules/work-flow.md`) and does so for one that could not.
  Never deleted; never one the owner works in or that waits only on the owner's yes.
- **A lane for every independent entry** (core archive 11), by `modules/work-flow.md`.
- **A stalled lane** (core archive 133), looked for on every wake: an open PR with no push to its branch for a few
  hours, whose session has ended, cannot be reached (started elsewhere, such as on another account) or sits idle, goes
  to a fresh builder from its branch, the old session told to stop; not one that waits only on the owner's yes.
- **It asks the owner nothing** but floor rule 14's yeses (core archive 133 and 134): it does it and reports it in a
  line. Before it reports anything as waiting on the owner (floor rule 14), it checks GitHub: a yes already in the PR
  (the owner's or the design session's relay), a branch already deleted or a setting already made is never reported
  again (core archive 137).
- **Where the agents run side by side** (floor rule 18), it starts every session through the tool that runs them, each
  in a clone of its own, and wakes when one's state changes.
