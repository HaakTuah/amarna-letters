- `scripts/queue.mjs`: reads the *progress file* (`QUEUE.md` here) as its readers take it, a line of a closed issue
  skipped and waited on no more, takes those lines out with `--clear`, and, run here by `own-description.yml`, fails a
  ready pull request that changes the queue and leaves one, saying so of a draft (#750, point 1). *Runs:* any session
  and the runners. *Else:* GitHub Projects, whose board hides a closed item by its own workflow, dropped on fact: the
  queue is a file a pull request changes, the trust gate (`AGENTS.md`, "The queue"), and a board is no file of the
  repository. *Bugs:* 0. **Keep:** small and stable.
