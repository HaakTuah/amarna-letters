# Git and GitHub

How work reaches `main`. Read at the start of every task. The calls from a cloud session:
`modules/github-calls.md`.

- **Work from `main`:** each task on a branch of its own with a PR into `main`, which its builder merges (core archive 5
  and 113; when: `modules/work-flow.md`, point 1, and floor rule 12); every merge goes live or into the next release.
  Each PR has the headings "What the owner can try" (with whether the README is current) and "Readings taken" (core
  archive 16 and 153).
- **Push after every commit,** even before the PR opens (a draft if not ready), so nothing is lost if a session dies
  (core archive 6 and 15). Before pushing to a branch whose PR you opened earlier, check whether it merged; if it did,
  start a new branch and PR.
- **Updates, Dependabot and CodeQL:** `modules/updates.md`.
