# Reviews

Which PR gets which review, how Codex's is asked for, the security gate, and why only a 10 passes. Read when a PR is
reviewed. Leans on `modules/review-guidelines.md` and `modules/roles.md`.

## Codex reviews

Codex's usage can run out without a word (core archive 20), so nothing waits on it long.

**Which PR gets which review:** the *design-checked PRs* get the code review and the design check, at once (point 5);
every other PR that changes the project, its data, tests, tools or config, and Dependabot's updates, the code review;
docs-only PRs none, unless one changes a protected file (`floor/security.md`, rule 3), which gets
the code review (core archive 47); every PR, its one security review when it is marked ready (point 6); a PR Codex
built, the fallback reviewer in place of Codex's code review.

1. **Ask:** a comment `@codex review` alone. Codex reads the PR's description, so the task's text and the sections it
   names go there. **Write the Codex mention only to ask for a code review:** any other request starts a task in its
   cloud, which cannot push (`modules/codex-building.md`, "Status"), and its bot answers every mention it finds, even in
   backticks, so text that only talks about it says "the Codex mention".
2. **It starts within seconds** (its 👀 reaction and a "Codex Review Summary" comment) **and finishes within
   minutes.** No sign within about 5 minutes, or an answer that is not a review (no usage left, an error): the fallback
   reviewer takes the PR at once (core archive 19 and 20).
3. **Still running after about 15 minutes:** ask once more. No finished review about 5 minutes after that: the fallback
   reviewer takes it. A late Codex review is still read, but nothing waits for it.
4. **Its 10 is nothing open:** its 👍 or "Didn't find any major issues", or every finding fixed or moved out as "Only a
   10 passes" says.
5. **The design check, with a score:** on the design-checked PRs, once before the merge, the design checker, given its
   brief ("The briefs" below), scores the work against the design alone, since Codex looks for faults and security, and
   the broad feedback on the design is the design check's (core archive 22). **The readings too:** it judges the PR's
   "Readings taken" as the stand-in does (`modules/inbox.md`): one the owner would likely answer otherwise is a
   finding, built as the stand-in answers it and sent to him with that answer.
6. **Security reviews: Codex's one by itself, then the fallback reviewer** (core archive 47, 48, 50 and 51). Codex runs
   one security review by itself when a PR is opened for review or a draft is marked ready, never while a draft and
   never twice on one commit; asking in a comment runs a code review alone, so no builder asks (core archive 51). When
   a later commit changes what a security review is for (input from users, models or files, a workflow, the network,
   saved files or exports, a dependency newly added or moved up a major version), or fixes a security finding, the
   fallback reviewer reviews that change against the project's `SECURITY.md` with the floor, and its threat model, once,
   on the round expected to be the last, and the PR says so; never for a change proven unchanged in what it does (a
   split by meaning, unused code removed, a rename) nor for docs. **A security review ran only if Codex's summary lists
   "🔒 Security Review" as completed, or the fallback reviewer's review is in the PR;** one with no findings posts
   nothing else. Its findings count as a code review's; a Codex finding fixed by a later commit is closed by the
   fallback reviewer's check of that commit, its thread answered and resolved. **The security gate** is floor rule 8: if
   no completed security review appears within about 30 minutes of the ready mark, the fallback reviewer reviews the
   whole diff the same way, the PR says so, and it may merge on that.
7. **Measured claims** (core archive 25): Codex's review reads the diff but runs nothing, so CI and the fallback
   reviewer check the *measurements* a PR's claims rest on.

## Only a 10 passes

Every review, in either direction, passes the work only at a 10 (for Codex, nothing open), with two guards: the rounds
come to an end, and what a 10 means never slips (core archive 18 and 23).

1. **The list decides the score,** as "How a review passes" in `modules/review-guidelines.md` defines it.
2. **Every point is fixed, or moved out with a reason.** A point within the task is always fixed. One outside it may
   become a follow-up (a `bug` issue if a bug, otherwise an entry in the *progress file*), with the reason in the PR: a
   follow-up finishes work already done, so it needs no word from the owner, while one that would add something new is
   an idea (`modules/inbox.md`). A point the builder thinks wrong is answered in the PR with why. The next round's
   reviewer rules on each.
3. **Later rounds judge the change, and only the change** (core archive 74): the diff since the last round, the earlier
   lists and answers, and "How a review passes" and "What blocks" from the guidelines, with the same model and effort;
   a file the change touches may be read when the diff alone cannot settle a point.
4. **At most three rounds for each review, Codex's included, then escalation, then blocked.** What is still open goes to
   escalation (`modules/roles.md`) with a self-contained brief, which fixes each point or rules it outside the task or
   wrong, with reasons. If anything is still open, the PR is **not merged:** it is marked blocked in the *progress file*
   and filed as a `question` issue linked under "Questions for the owner", and the work goes on with the next task that
   does not depend on it.
5. **The bar does not slip:** the checks on the reviewers themselves, run as lanes of their own:
   `modules/calibration.md`.
6. **One line in each PR:** `Review: <category> · <builder> · <each round's result>`, a score, or Codex's verdict
   (`clean`, or findings such as `P1×2`): `Review: rules · Claude · 7, 9, 10`.
7. **The briefs.** A reviewer starts cold and gets its brief and nothing more. **The fallback reviewer's:** the diff,
   the task's text, the *review reference*, the review guidelines (the core's and the project's), whole, and the
   project's `SECURITY.md` with the floor. **The design checker's:** the same, and what the project's guidelines add for
   it. **A later round's:** point 3's. **An escalation's:** `modules/roles.md`.
