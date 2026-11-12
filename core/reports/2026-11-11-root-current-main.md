# The root is published only from main's newest commit

**What:** `scripts/site-publish.sh root` now fetches `main` before each attempt and skips the publish when the run's
`GITHUB_SHA` is not main's newest commit.

**Why:** Codex's code review of a game's switch to the shared preview found that an older run of main's build, re-run
after a newer commit went live, would publish its older build over the live game: a re-run keeps its own `GITHUB_SHA`,
and the publisher refreshed only `gh-pages`, never `main`. The game's old workflow had published main as it stood at
publish time, which this keeps for every game.

**What it changes in every project:** a game's publish of main skips with "root skipped" instead of rolling the live
game back; previews (`pr-<n>`) are unchanged. Nothing for a builder to do but take the sync.

**Checked:** against a local bare repository, a root publish with an older `GITHUB_SHA` skips and leaves `gh-pages`
untouched, one with main's newest publishes, and a preview publishes whatever the run.
