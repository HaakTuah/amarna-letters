# Running builder sessions and lanes

Read by the orchestrator, the session that starts builder sessions, when it starts.

**It builds nothing itself** (core archive 27): every lane goes to a builder session of its own, with its own brief, at
the builder's model and effort (`modules/claude.md`). Its own context stays small: claims, starting and handing over
sessions, passing on the owner's word, merging Codex's work. Only if it cannot start builder sessions does it say so and
stop.

- **On every wake,** the hourly check included (core archive 42, 44 and 124): pull `main`; if a rule file changed,
  re-read it and pass what touches them to the running builders in one message; if the core's newest `main` is past the
  project's pin, start a routine lane that runs `core/scripts/sync.mjs` and opens the sync PR (no new yes: one he gave
  on the core's PR carries over; a pure sync gets no review, and merges by the merge call at the head
  `scripts/pure-sync.mjs` passed, never by auto-merge: floor rule 8); act on what is new in the *progress file*.
- **Hand over at once:** start the next session as soon as a task merges. One session per task, continued for its review
  fixes while its context is under an hour old and small; otherwise a fresh one (core archive 10).
- **A lane for every independent entry** (core archive 11), by `modules/work-flow.md`; the brake in `modules/claude.md`
  closes lanes first.
- **A lane whose session is gone** (core archive 133): one whose session it cannot reach (started elsewhere, such as on
  another account, or ended), with no push to its branch for a few hours, goes to a fresh builder from its branch,
  without asking.
- **It asks the owner nothing** that the rules, his past words or the stand-in settle (core archive 133 and 134): it
  does it and reports it in a line. Only the yeses floor rules 3 and 14 name wait for him, and nothing else waits on
  them. Before it reports anything as waiting on him, it checks GitHub: a yes already in the PR (his or the design
  session's relay), a branch already deleted or a setting already made is never reported again (core archive 137).
- **Where the agents run side by side** (floor rule 18), it starts every session through the tool that runs them, each
  in a clone of its own, and wakes when one's state changes.
