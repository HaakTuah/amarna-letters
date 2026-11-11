# One preview workflow for the games; obvious improvements built at once

The owner, told that one shared workflow for the games' pull-request previews waited on his yes (core archive 147):
"Why not use one shared workflow? Obvious improvements gets implemented automatically."

**The shared previews.** Both games publish a playable preview of every pull request at `pr-<number>/` on their
`gh-pages` branch, each built on its own: Amarna Letters with a publisher on `workflow_run` that never runs a PR's code,
Barkstreet Snakes inside its `pages.yml`, on `pull_request` with a write token, its branch growing by a commit on every
run. The core now holds Amarna Letters' way once:

- `.github/workflows/preview.yml` (`workflow_call`): checks the PR's number against the PR itself (same repository,
  same head commit as the build run), publishes or removes `pr-<number>/`, and keeps one comment linking it. It runs
  from main's copy of the caller and checks out main, never a PR's code, and writes only `pr-<number>/`.
- `scripts/site-publish.sh`, moved from Amarna Letters unchanged but for its header: one parentless commit per publish
  (the branch stays one commit long), pushed with a lease and redone if another run moved the branch.

What changes in every project: a game served by GitHub Pages publishes main with `core/scripts/site-publish.sh root`,
and its previews through a `preview.yml` of its own that calls the core's (`README.md`, point 5). Each game moves to it
in its own PR after its sync. The comment's marker becomes `<!-- preview -->`, so an open PR's old link comment stays
as it was, and the new one is kept up to date.

**Obvious improvements.** `modules/inbox.md`: an obvious improvement is built at once, in its own PR; other ideas are
filed as before.

Licences: `actions/download-artifact` (MIT) joins the core's audit; `gh` is now used by `preview.yml` too. The floor and
modules are 44,463 bytes of 45,056.

Reviews: this changes what runs with credentials, so Codex's code and security reviews and the fallback reviewer's
security review (floor rule 3); no yes needed beyond his word above.

Readings taken: what counts as "obvious" is left to judgement (plainly better, nothing for him to weigh); a change of
taste or of the game's rules is not obvious and still goes the usual way.

Questions for the owner: none.
