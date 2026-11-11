# How work flows

How a builder goes on without waiting, and how lanes run beside the main lane. Read at the start of every task.

Waiting is lost time and, past an hour, a lost cache (core archive 10).

1. **Review in the background.** When the work is done, read the task's spec again, since it may have changed: build
   what changed, or queue it if large. Mark the draft PR ready, ask for its reviews (`modules/reviews.md`), and go on
   with what comes next. Fix every review's findings together. Once its reviews are clean on the head commit, turn on
   auto-merge (`modules/github-calls.md`) and go on: GitHub merges when the checks are green and the branch is up to
   date (core archive 135). Where it refuses, the PR already `clean` or `unstable`, merge it yourself once every check
   has passed. A push after that turns auto-merge off first, and the new commit is reviewed (floor rule 8); bringing the
   branch up to date with `main` keeps it on.
2. **The next task** goes on while this one is reviewed, on its own branch from `main`; no lane is stacked on another's.
3. **Lanes beside the main lane** (core archive 11): independent work in different files from every open lane, with no
   shared measurement and no waiting on another's result; never what the project runs *one at a time*. Claim a lane with
   a draft PR from a fresh branch off `main`, after checking the open PRs; bring it up to date before review.
4. **The polish lane** (core archive 145), in a game: what makes it feel finished without changing how it plays
   (glitches, layout, tap targets, contrast, reduced motion, wording, console errors, slow spots), beside the main lane
   and never ahead of it; where the owner frees an account whole, it spends what is left; elsewhere the brake
   (`modules/claude.md`) closes it. Finds come from every screen of the live build on a phone and desktop, and whole
   games watched at top speed; each its own small PR, with a before-and-after picture and play proven unchanged ("Same
   seed, same game"); one too big for the usage left is noted, not started.

**Sessions:** started task by task, stop when your task is merged, saying in your last message what merged and what is
next; otherwise carry on with the next task. A long task may end a session at a passed gate, with a commit and a note
in the *progress file* saying where to pick up (core archive 143).
