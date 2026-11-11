# One versions check

Tonight's audit of both games against the core (the owner's words: `reports/2026-11-11-shared-checks.md`) found two
checks of their own for the versions Dependabot cannot see: Amarna's `scripts/versions.mjs` (one issue for all) and
Snakes' `tools/versions.js` (one issue each, and a test). Amarna's watched only Node, now the core's one pin (core
#68), which nothing watched; Snakes' watches PeerJS.

- **`scripts/versions.mjs`:** Snakes' check, with its config's path as an argument and an entry's file held inside the
  project, and an issue body that names the config and the floor's rules rather than one game's files.
- **`scripts/versions-test.mjs`:** Snakes' test, made self-contained (its own temporary file), run by a new workflow,
  `.github/workflows/tests.yml`, on every PR here.
- **`.github/workflows/versions.yml`:** one workflow, called by a project from a monthly schedule of its own with its
  config, and run by the core itself on its own schedule for the pins it holds (`.github/versions.json`: Node, in
  `.node-version`). It may open issues and nothing else; titles and bodies pass through a file and jq. A change to what
  runs by itself: Codex's and the fallback reviewer's security reviews (floor rule 3).
- **`modules/updates.md`:** "The newest stable version, unless there is a reason" names the check, in place of no new
  paragraph (Codex's P2). **`README.md`:** point 5 names the workflow.

Tested: the test passes; the check reads the core's Node (26.13.0, the newest old enough) and asks for nothing.

What changes in every project: one with versions Dependabot cannot see calls the core's `versions.yml` with its config
and drops its own check; Snakes' does so for PeerJS, and Amarna, which has none left, has already dropped its own.

Readings taken: one issue for each version behind (Snakes'), so each can be taken and closed alone. Questions for the
owner: none.
