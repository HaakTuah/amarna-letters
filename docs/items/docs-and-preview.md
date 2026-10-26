# Brief: the rest of the docs and preview pass (item 5+, step 1 of 3)

**Spec:** `docs/prompts/DOCS-AND-PREVIEW.md`, Haakon's words. Read "Status (26 October 2026)" first, then "The task",
"Corrections and additions" and, for the previews, "Findings while preparing the pass". **Effort:** medium.

## First, check the cloud machine (report the results in the PR's first lines)

1. `scripts/cloud-setup.sh` if `dotnet` is missing, then `scripts/test.sh`. If .NET cannot be installed, say what
   failed and which domain or setting would fix it, and go on with what needs no build.
2. `scripts/usage.sh`. If it says "unknown", this session cannot see weekly usage: say so plainly at the top of the PR,
   because the 90% rule then depends on Haakon watching usage himself.
3. Whether Playwright's Chromium works (the conversion's phone measurements need it).

## Then the steps left

- **Step 2:** move the round reports from `docs/rounds/` to `docs/archive/rounds/`, except
  `2026-10-18-sleep-and-simulation.md`, which stays (the builder rules cite it). `docs/ROUND-PROMPT.md` and
  `docs/ROUND-PROMPT-ADDITIONS.md` may go with them. Check only each report's decision and review-question sections
  against `docs/design/` and `docs/BUILD-PROGRESS.md` (whose history is now `docs/archive/build-log.md`); list in the PR
  any decision recorded in neither, rather than copying it. Update references to moved files; leave the three engine code
  comments the spec names.
- **Step 4:** the preview workflow, with the publishing-branch approach the spec gives word for word. A PR must never be
  able to replace the site root.
- **Point 8:** tidy up remote branches. Remove one only if all its work is in `develop` or `main`; list the ones kept.
  `round/simulation-fixes-bots`, `-memory`, `-kit` and `wip/scratch-review-H` were pushed from Haakon's computer on
  26 October as backups: their commits were cherry-picked into `develop` on 18 and 19 October (same subjects, new
  hashes), except `wip/scratch-review-H`, an untested probe test. Say in the PR what you did with each.
- **Sizes:** before and after, in the PR. The spec's "before" figures are of 21 October; `DESIGN-NOTES.md` was split on
  26 October.
- **Merge:** the one exception to "main is never touched" applies to this PR only, as the spec says.

**Done when:** the spec's steps are done or listed as blocked, the PR says how to try the previews, and the 5+ row in
`docs/BUILD-PROGRESS.md` is updated. Then go on with the conversion (`docs/items/conversion.md`).
