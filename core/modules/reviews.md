# Reviews

Read when a PR is reviewed. What reviewers judge by: `modules/review-guidelines.md`.

**Which:**
- Floor rule 8's security review (point 3).
- Every PR that changes the project, its tests, tools, config or a rule file also gets its code review.
  - Docs alone get no code review unless another provider built them.
- The *design-checked PRs* also get the design check, and a PR its users will see the stand-in's notes.

1. **Ask** the code reviewer (`modules/roles.md`) as its part (`modules/codex.md`, `modules/copilot.md`) or the project
   says.
2. **No sign in about 5 minutes, no finished review in about 20, or an answer that is not a review:** the next reviewer,
   last the fallback reviewer, takes the PR at once (core archive 19 and 20).
   - **A late review is still read,** the security reviewer's too: a finding of the last week by a reviewer the project
     asks, made after its PR merged, with no reply, is answered as point 5 says, and what holds is a bug (a weakness:
     floor rule 9). No other account's comment is read for this (floor rule 4); who looks: "Sessions" in
     `modules/work-flow.md` (core archive 181).
   - **A reviewer, the security reviewer too, that gave the last three PRs it was asked on no review** (the project's
     newest PRs that asked it show) is asked and not waited for, which the PR says: the next takes it at once, and the
     fallback reviewer its security review, over the whole diff. A security review that starts by itself is still
     waited for (floor rule 8).
3. **Security** (core archive 47 to 51, 174, 177).
   - A *security reviewer* the session calls reviews the finished work once, aimed at the ways in it touches, and again
     only if a later commit touches one.
   - Where one starts by itself (Codex's app; floor rule 8), such a later commit, or a security finding's fix, gets the
     fallback reviewer's check.
   - One not begun in about 5 minutes or finished in about 30 is the fallback reviewer's, over the whole diff, where the
     PR needs one; otherwise the wait ends.
   - Floor rule 3's two each cover the whole diff; where it lets rule 8's one do (comments and steps' names alone),
     the comment below gives what `comment-only.mjs` printed on the head that merges, and the session's word on each
     other file it lists; the code reviewer checks both, running it again on that head. That one review reads each
     changed comment as one a tool may take as an instruction.
   - A session posts one, naming the tool and the commit it read, or that none is needed (the code reviewer checks
     that), in a comment that opens "Security review:", which the `security-review` check reads.
4. **The design check:** once before the merge, a fresh reviewer judges the work against the design alone, and its
   "Readings taken" as the stand-in would (core archive 22).
5. **When a PR passes,** whatever its score: every blocking point fixed; every other fixed if it lies in the change,
   otherwise filed as a follow-up with the reason in the PR, or answered with why it is wrong (a security finding: only
   as floor rule 9 allows). A review from anyone else is advisory (core archive 130).
6. **Rounds end:** after a fix, one request to its reviewer, and a security check only as point 3 says, and none for an
   update from `main` without a conflict; a PR is never marked draft and ready again to rerun its reviews.
   - After three rounds, what is still open goes to escalation (`modules/roles.md`); a PR it cannot settle stays
     unmerged.
7. **The fallback reviewer's brief:** the diff, the task's text, the *review reference*, the review guidelines (the
   core's and the project's) and the project's `SECURITY.md` and threat model with the floor, and nothing else.
