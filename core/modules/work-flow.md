# How work flows

How a builder goes on without waiting, and how lanes run beside the main lane. Read at the start of every task.

Waiting is lost time and, past an hour, a lost cache (core archive 10).

1. **Review in the background.** When the work is done, read the task's spec again, since it may have changed: build
   what changed, or queue it if large. Mark the draft PR ready, ask for its reviews (`modules/reviews.md`), and go on
   with what comes next. Fix every review's findings together. Once Codex's reviews are clean on the head commit, turn
   on auto-merge (`modules/github-calls.md`) and go on: GitHub merges when the checks are green and the branch is up to
   date (core archive 135). A push after that turns auto-merge off first, and the reviews run again on the new head
   (floor rule 8); bringing the branch up to date with `main` keeps it on.
2. **The next task** goes on while this one is reviewed, on its own branch from `main`; no lane is stacked on another's.
3. **Lanes beside the main lane** (core archive 11): independent work in different files from every open lane, with no
   shared measurement and no waiting on another's result; never what the project runs *one at a time*. Claim a lane with
   a draft PR from a fresh branch off `main`, after checking the open PRs; bring it up to date before review.

**Sessions:** started task by task, stop when your task is merged, saying in your last message what merged and what is
next; otherwise carry on with the next task.
