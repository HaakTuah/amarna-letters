# How work flows

How a builder goes on to the next task without waiting, and how lanes run beside the main lane. Read at the start of
every task. Leans on `modules/reviews.md`; the orchestrator's part: `modules/orchestrating.md`.

Waiting is lost time and, past an hour, a lost cache (core archive 10).

1. **Review in the background.** When the work is done, read the task's spec again (what the project's `AGENTS.md` says
   to re-read), since the owner's answers can change it while you work: build what changed, or, if that is large, say so
   in the PR and queue it where the project's `AGENTS.md` says. Then mark its draft PR ready; ask for the code review
   and the design check, where the PR gets them, at once; go on with what comes next. Fix every review's findings
   together. Merge only once the suites pass and the checks are green, at a 10 from each review it gets, and only past
   the security gate (floor rule 8).
2. **The next task** goes on while this one is reviewed, branched as the project's `AGENTS.md` says; no lane is stacked
   on another's branch.
3. **Lanes beside the main lane** (core archive 11): independent work in parallel, in different files from every open
   lane, with no shared measurement and no waiting on another's result; never what the project runs *one at a time*.
   Claim a lane with a draft PR from a fresh branch off `main`, after checking the open PRs; bring it up to date with
   `main` before review; change the *progress file* only when it merges.

**Sessions:** when they are started for you task by task, stop when your task is merged, saying in your last message
what merged and what is next; otherwise carry on with the next task.
