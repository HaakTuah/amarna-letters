# How work flows

Read at the start of every task.

1. **Review in the background.** When the work is done, read the task's spec again: build what changed, or queue it if
   large. Mark the draft PR ready and ask for its reviews (`modules/reviews.md`). Fix every review's findings together.
   Once its reviews are clean on the head commit, turn on auto-merge (`modules/github-calls.md`; a sync PR is merged by
   hand: floor rule 8) and go on: GitHub merges when the checks are green and the branch is up to date (core archive
   135). Where it refuses, the PR already `clean` or `unstable`, merge it yourself once it is up to date and every check
   has passed. A push after that turns auto-merge off first, and the new commit is reviewed (floor rule 8); bringing the
   branch up to date with `main` keeps it on.
2. **The next task** goes on while this one is reviewed, save under an orchestrator, which starts it at the merge; no
   lane is stacked on another's.
3. **Lanes beside the main lane** (core archive 11): independent work in different files from every open lane, with no
   shared measurement and no waiting on another's result; never what the project runs *one at a time*. Claim a lane with
   a draft PR from a fresh branch off `main`, after checking the open PRs; bring it up to date before review.
4. **The polish lane** (core archive 145), where people use the project through a screen: what makes it feel finished
   without changing what it does (glitches, layout, tap targets, contrast, reduced motion, wording, console errors, slow
   spots), beside the main lane and never ahead of it. Finds come from every screen of the newest build, at each size it
   is used at; each is its own small PR, with a before-and-after picture and its behaviour proven unchanged.

**Sessions:** started task by task, stop when your task is merged, saying in your last message what merged and what is
next; otherwise carry on with the next task. A long task may end a session at a passed gate, with a commit and a note in
the *progress file* saying where to pick up (core archive 143). A session of the trusted builder's (floor rule 3) that
no orchestrator started, and the orchestrator on every wake, first checks whether the core has moved
(`core/scripts/core-moved.mjs --dry`) and syncs it if so (`core/scripts/sync.mjs`, its PR never auto-merged: floor rule
8; then what `setup/sync-notes.md` asks); where checks cost money, not on a day a sync PR was already opened (core
archive 178); then both read what reviews left after a merge (`modules/reviews.md`, point 2). Another builder's session
leaves the sync to them.
