# Git and GitHub

How work reaches `main`, with nothing lost on the way. Read at the start of every task. The calls from a cloud session:
`modules/github-calls.md`.

- **Work from `main`:** each task on a branch of its own with a PR into `main`, which its builder merges (core archive 5
  and 113; when: `modules/work-flow.md`, point 1, and floor rule 12); every merge goes live or into the next release.
  Each PR says what the owner can try and whether the README is still current (core archive 16).
- **Push after every commit,** even before the PR opens (a draft if not ready), so nothing is lost if a session dies
  (core archive 6 and 15). Before pushing to a branch whose PR you opened earlier, check whether it merged; if it did,
  start a new branch and PR.
- **Updates, Dependabot and CodeQL:** `modules/updates.md`.
