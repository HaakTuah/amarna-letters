# Reviews

Read when a PR is reviewed. What reviewers judge by: `modules/review-guidelines.md`.

**Which:** floor rule 8's security review (point 3); every PR that changes the project, its tests, tools, config or a
rule file also gets its code review; the *design-checked PRs* also get the design check, and a PR its users will see the
stand-in's notes (`modules/inbox.md`). Docs alone get no code review unless another provider built them, and a pure sync
PR none at all.

1. **Ask** the code reviewer (`modules/roles.md`) as its part (`modules/codex.md`, `modules/copilot.md`) or the project
   says.
2. **No sign in about 5 minutes, no finished review in about 20, or an answer that is not a review:** the next reviewer,
   last the fallback reviewer (`modules/claude.md`), takes the PR at once (core archive 19 and 20). A late review is
   still read. A reviewer, the security reviewer too, that gave the last three PRs it was asked on no review (the
   project's newest PRs that asked it show) is asked and not waited for, which the PR says: the next takes it at once,
   and the fallback reviewer its security review, over the whole diff.
3. **Security** (core archive 47 to 51, 174, 177). A *security reviewer* the session calls reviews the finished work
   once, aimed at the ways in it touches, and again only if a later commit touches one. One that starts by itself
   (Codex's app) is waited for and read as floor rule 8 says; there such a later commit, or a security finding's fix,
   gets the fallback reviewer's check. One not begun in about 5 minutes or finished in about 30 is the fallback
   reviewer's, over the whole diff, where the PR needs one; otherwise the wait ends. Floor rule 3's two each cover the
   whole diff. A session posts one, naming the tool and the commit it read, or that none is needed (the code reviewer
   checks that), in a comment that opens "Security review:", which the `security-review` check reads.
4. **The design check:** on the design-checked PRs, once before the merge, a fresh reviewer judges the work against the
   design alone, and its "Readings taken" as the stand-in would (core archive 22).
5. **When a PR passes,** whatever its score: every blocking point fixed; every other fixed if it lies in the change,
   otherwise filed as a follow-up with the reason in the PR, or answered with why it is wrong (a security finding: only
   as floor rule 9 allows). A review from anyone else is advisory (core archive 130).
6. **Rounds end:** after a fix, one request to its reviewer, and a security check only as point 3 says, and none for an
   update from `main` without a conflict; a PR is never marked draft and ready again to rerun its reviews. After three
   rounds, what is still open goes to escalation (`modules/roles.md`); a PR it cannot settle stays unmerged.
7. **The fallback reviewer's brief:** the diff, the task's text, the *review reference*, the review guidelines (the
   core's and the project's) and the project's `SECURITY.md` and threat model with the floor, and nothing else.
