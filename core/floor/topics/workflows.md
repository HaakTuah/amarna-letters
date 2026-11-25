# The floor, by topic: the workflows

Read before a task touches a workflow, and by a security review: the kinds `workflow` and `security-review`; the path
`.github/workflows/`.

**2. The workflows** (`.github/workflows/`).
- Never `pull_request_target`.
- `workflow_run` only after checking that the run's head repository is this one, never running a PR's code with a write
  token.
- A fork's PR gets no secret and no write token, and its code never runs where one is available.
- Each job asks for the fewest permissions it needs.
- No untrusted text (a PR's title or body, a branch name, a comment, a label) is written into a `run:` script: it is
  only passed through `env:` and quoted.
- Only GitHub's own actions (`actions/*`), or another pinned to a full commit SHA.
