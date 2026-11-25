# What a sync asks of a project

Most changes to the core reach a project by the copy and what the core's one process writes from its kit at each
sync (`core/scripts/converge.mjs`). An entry stands here when a project must change something
of its own for a change to hold: a row of its manifest, a line of a rule file, a workflow, an audit.
`core/scripts/sync.mjs` prints the entries a sync brings, then every step not done, a standing one too, by
`core/scripts/steps.mjs`, where each entry has a step that tells it done exactly, what the steps' writers wrote where
a script does a step exactly (a check's config or baseline, a pointer's path, the manifest's module lines, never another word of a rule; #1091, #1094), set
aside in a stash that the PR after the sync's commits, and every difference from what the starter kit writes today (`core/scripts/fresh.mjs`); an orchestrator gives each a lane (`core/roles/orchestrator.md`). Each is done in a PR of its own once the sync PR is merged (a pure sync holds the
copy, its pins and what that process writes alone: floor rule 8), or filed for the *progress file*'s queue where it is large; none waits for the owner beyond what
the floor names. Each entry says how to tell it is done, and its step reads it, so a
project unsure where it stands runs `node core/scripts/steps.mjs`, and one already done asks nothing.

**A copy older than release-1 syncs once with the release's full SHA:** `node core/scripts/sync.mjs <the release's full
SHA>`, which the core's owner names when handing the release on. Its own sync script, run with no SHA, takes the core's
newest `main`, knows no release and prints none of this file: it would land on a commit no release holds, bring core
code no release carries into a project that follows the releases, and `pure-sync.mjs` would refuse the sync. From that
sync on, the copy's own script takes the releases by itself (the entry "13 November 2026, what a project follows").

Newest last, each on one line in a file of its own, named to stand after the entry before it (`NNN-<name>.md`), its
step in `scripts/steps/` under the same name, so that two pull requests that add an entry never edit the same lines
(#750, point 1); `node core/scripts/sync-notes.mjs` reads the notes whole.

- A sync that brings `core/setup/sync-notes/` to a copy that did not hold it ran the copy's older script, which reads what a sync asks from this file alone, where no entry stands now, and printed nothing else a sync prints: the session that syncs runs `node core/scripts/sync.mjs <the manifest's pin>` once more in the sync's branch, which at the same pin moves nothing, installs the copy's packages, writes what the core owns, and prints what the sync asks since the pin before and every report a sync prints, for the sync pull request's description (#1246); it commits what that run writes in the sync's pull request, and does what the project lacks of each entry in a pull request of its own, as `core/scripts/steps.mjs` reports and beyond.

Its entries stand in `setup/sync-notes/`, a file each, read in the order of their names.
