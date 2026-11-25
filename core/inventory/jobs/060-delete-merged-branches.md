- `.github/workflows/delete-merged-branches.yml`: deletes the branches whose every commit is in `main`. *Runs:* the
  runners, started by hand. *Else:* the host's setting that deletes a pull request's branch when it merges, free, kept
  for that case and dropped for the rest, on fact: it leaves a branch that had no pull request. *Bugs:* 0. **Keep:**
  small and stable.
