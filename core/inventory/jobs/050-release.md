- `scripts/release.mjs`, `scripts/release-trial.mjs`, `.github/workflows/release.yml`: cuts `release-N` on `main`'s
  newest commit once every check passed, its own run of the upgrade test on Windows, which it also runs once a day,
  cutting nothing, and the trial on a real project, whose record `release-trial.mjs` writes and reads. *Runs:* the
  runners, started by hand, and daily. *Else:* release-please, semantic-release and changesets, dropped on
  fact: they write versions and notes from commit messages, which the core does not ask. *Bugs:* 0. **Keep:** small and
  stable.
