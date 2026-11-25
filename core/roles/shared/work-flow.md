# How work flows

Read at the start of every task.

1. **Review in the background.**
   - When the work is done, read the task's spec again: build what changed, or queue it if large.
   - Ask its reviews and mark it ready in `tasks/reviews.md`'s order (point 10). Fix all findings together.
   - Once every review the order names has answered on the head commit with no finding open, turn on auto-merge
     (`tasks/github-calls.md`; a sync PR is merged by hand: floor rule 8) and go on: GitHub merges when the checks are
     green and, where asked, the branch is up to date. Where it refuses, the PR already `clean` or `unstable`, merge it
     yourself as floor rule 12 says. A check that then fails on `main` is yours while you run (`tasks/tests.md`).
   - A push after that turns auto-merge off first; bringing the branch up to date with `main` keeps it on.
   - **Ready pull requests merge in a line** (#702). By default only the first whose reviews answered with no
     finding open is brought up to date; one in a round of fixes keeps its place and lets the next go first. The
     orchestrator keeps the order; with none, the oldest goes first, and each builder brings its own up to date once
     the one ahead merged. Where the host's merge queue is on, it keeps the line (`tasks/hosts.md`). It does not
     mean a builder holds back its own fixes, nor that anything waits where no up-to-date branch is asked. Reason:
     each merge makes every open PR stale and each brought up to date runs its tests again; a line waiting on its
     front stands still while it is fixed. Held by the state report's measure (`scripts/merge-line.mjs`).
2. **The next task** goes on while this one is reviewed, save under an orchestrator; no lane is stacked on another's.
3. **Lanes beside the main lane:** independent work in different files from every open lane, with no
   shared measurement and no waiting on another's result; never what the project runs *one at a time*.
   - Claim a lane with a draft PR from a fresh branch off `main`, after checking the open PRs.
4. **The polish lane,** where people use the project through a screen: what makes it feel finished
   without changing what it does (glitches, layout, tap targets, contrast, reduced motion, wording, console errors, slow
   spots), beside the main lane and never ahead of it.
   - Finds come from every screen of the newest build, at each size it is used at; each is its own small PR, with a
     before-and-after picture and its behaviour proven unchanged.

**The owner's stop switch:** the branch `agents-stop` on the project's own repository, which the
owner creates from any device to stop its agents and deletes to let them go on.
- Every session reads it at its start and before each commit (`git ls-remote origin refs/heads/agents-stop`).
- Where it stands, no task starts, and a running one stops, saying so.
  - It never stops what the owner then asks a session for in person.
- Where it cannot be read, the session says so.
- It stops only that repository's agents, and no agent creates or deletes it.

**Sessions:**
- Started task by task, stop when your task is merged, saying in your last message what merged and what is next (with
  no orchestrator, also that it can be archived); otherwise carry on with the next task.
- Before that message, on a machine that outlives the session, clean up what you made: what later
  work needs is pushed, what you started is stopped, and your own worktree or clone, scratch files and local branches
  go, save what holds anything uncommitted or unpushed, which you push or leave and name in the message.
- A session runs the *quick check* before its first change; a failure there is a bug outside its task ("Bugs don't
  wait"), and the task goes on with what does not hang on it. It does not mean the whole suite. Reason: one that
  starts on a broken `main` cannot tell its own faults from those it inherited.
- **A builder hands over by its context** (#750, point 7). By default a builder carries its task to its merge in one
  session; once its context passes about 250,000 tokens (a first guess), as `core/scripts/session-cost.mjs --context`
  prints it, it stops at its next passed gate (checks green, a review answered) with its hand-off note in its pull
  request's description, as any session that stops mid-task commits and writes it (`tasks/tools.md`), and the
  orchestrator starts a fresh one from that note. It does not mean it stops mid-step, nor where the script prints
  nothing, nor that one no orchestrator started stops. Reason: each step costs more as a context grows; one builder
  ran to 553,000. Held by no check; that reading shows it.
- A builder session that no orchestrator started, and the orchestrator on every wake, first checks whether the core
  has moved (`core/scripts/core-moved.mjs --dry`) and syncs it if so (`core/scripts/sync.mjs`, then each step and
  difference it reports), between tasks, a floor change at once (`tasks/planning.md`); where checks cost money, not on a day a sync PR was already opened. Then both read what reviews left after a merge (`tasks/reviews.md`, point 2), and take up a check failed on `main`'s newest commit that no running session owns (`tasks/tests.md`).

## Git and GitHub

The calls from a cloud session: `tasks/github-calls.md`.

- **Work from `main`:** each task on a branch of its own with a PR into `main` (floor rule 12).
- **Each PR has the headings** "What the owner can try" (with whether the README is current) and "Readings taken", and ends, above its attribution line, with the line `scripts/session-cost.mjs` prints, never
  worked out by hand.
- **An exemption leaves a mark** (#302): where a rule lets a PR leave a thing out, its builder says so
  in its description in a word, so what is missing can be counted; where the cost script prints nothing, "No cost line:
  the script printed none." It does not mean a thing left out is wrong. Reason: the cost line stood on 58% to 74% of
  PRs, and nothing told one left out by the rule from one forgotten.
- **Nothing waits silently:** above that line stands one that says what the PR waits on, `Waits on:`
  `nothing`, `a review`, `checks`, `#<n>` or `the owner: <the question, in one sentence>?`, with the label
  `needs-owner` on the PR where it is the owner; its builder edits it whenever that changes. Reason: a finished draft stood still and no one was shown it.
- **A description is written in as few edits as the work allows** (#829). By default a builder opens its draft
  pull request with a short description (its first line and the line `Waits on:`), writes the full description in one
  edit after its last push and before it marks the pull request ready, and after that edits it only where what it says
  changes (a review's fix, what it waits on), gathering the changes that come together into one edit. It does not mean
  that a description is left untrue to save an edit. Reason: each edit of a description starts the checks that read it
  (two jobs in the core, about 76 an hour on 19 November 2026, #820), which hold runner slots and, on a private
  repository's free plan, bill a whole minute each. Held by nothing yet.
- **Push after every commit,** even before the PR opens (a draft if not ready).
  - Before pushing to a branch whose PR you opened earlier, check whether it merged; if it did, start a new branch and
    PR.
- **Updates, Dependabot and CodeQL:** `tasks/updates.md`.
