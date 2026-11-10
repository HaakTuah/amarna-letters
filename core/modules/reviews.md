# Reviews

Which PR gets which review, how they are asked for, and when a PR passes. Read when a PR is reviewed. What reviewers
judge by: `modules/review-guidelines.md`.

**Which:** every PR gets Codex's security review when it is marked ready; every PR that changes the project, its tests,
tools, config or a rule file also gets Codex's code review; the *design-checked PRs* also get the design check. Docs
alone get no code review. Codex's usage can run out without a word (core archive 20), so nothing waits on it long.

1. **Ask:** a comment `@codex review` alone. Codex answers every mention of itself, even in backticks, so other text
   says "the Codex mention".
2. **No sign within about 5 minutes, or no finished review within about 20, or an answer that is not a review:** the
   fallback reviewer (`modules/claude.md`) takes the PR at once (core archive 19 and 20). A late Codex review is still
   read, but nothing waits for it.
3. **Security:** Codex runs one security review by itself when a PR is marked ready. A later commit that fixes a
   security finding, or changes what the review is for (input, a workflow, the network, saved files, a dependency), gets
   the fallback reviewer's check of that change; a security review not finished within about 30 minutes of the ready
   mark is done by the fallback reviewer over the whole diff (core archive 47 to 51). A PR that changes what runs by
   itself or with credentials (floor rule 3) gets both: Codex's and the fallback reviewer's, each over the whole diff,
   and both must pass (core archive 138).
4. **The design check:** on the design-checked PRs, once before the merge, a fresh reviewer judges the work against the
   design alone, and its "Readings taken" as the stand-in would (core archive 22).
5. **When a PR passes:** every P0 and P1 fixed; every lower point fixed if it lies in the change, otherwise filed as a
   follow-up with the reason in the PR, or answered with why it is wrong. Copilot's review, where it runs, is advisory
   (core archive 130).
6. **Rounds end:** a later round judges only the change since the last (core archive 74). After three rounds, what is
   still open goes to escalation (`modules/roles.md`); what escalation cannot settle leaves the PR unmerged and marked
   blocked, and the work goes on with the next task.
7. **The fallback reviewer's brief:** the diff, the task's text, the *review reference*, the review guidelines (the
   core's and the project's) and the project's `SECURITY.md` with the floor, and nothing else.
