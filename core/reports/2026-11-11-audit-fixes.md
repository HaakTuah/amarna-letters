# The final audit's findings in the core

An independent audit of the core and both games, run once the licence scan had merged, found these in the core:

- **`scripts/licence-commands.mjs`:** the scan missed a fetcher whose program was written as a quoted word: `"pip"
  install`, `'curl' https://...`, `"$here/tools/node_modules/.bin/playwright" install`. One such fetch stood in a game's
  cloud setup with no hand audit. `OTHER_FETCHER` now reads a program's name either as a bare word or as a quoted word
  of its own, a path before it allowed. Seven forms are added to `licence-fetch-test.mjs`. In `licence-scan-test.mjs`, a
  quoted name followed by plain words still passes. The fallback reviewer found the same miss for a quoted subcommand
  (`pip "install"`) and for a quoted program inside a string of code (`\"pip\"`); both are read now, with seven more
  forms. `bunx` counts only before what can start an argument (a word, a path, a quote, a variable, a backslash or a
  backtick), so code that names `"bunx"` in a comparison or a list passes.
- **`scripts/licences.mjs`:** every audit entry that ships, but the owner's own, must have its notice (floor rule 10). A
  project that builds its notices from the audit gives the entry a `notice`. A project that keeps a notices file names
  that file in its config (`notices`), and the entry's name must appear in it. Each game had checked this in a script of
  its own. A notices file the config names but the project lacks, or a folder there, fails once. Seven tests cover it in
  `licence-scan-test.mjs`, four of them the config's mistakes.
- **`.github/licences-audit.json`:** `jq`, which `versions.yml` runs beside `gh`.
- **`modules/how-to-work.md`:** "The smallest setup that tests the rule" now also says that a test runs only where a
  change can affect it (core archive 9). That item was given for both games, yet no rule cited it, and each game quoted
  the owner's words in its own workflow.
- **`.github/workflows/delete-merged-branches.yml`:** its job runs one at a time for each project. Both games had
  written the same group in their callers, as they had also done for `personal-terms.yml`, whose job already has one.
  These workflow changes alter what runs by itself, so they get Codex's and the fallback reviewer's security reviews
  (floor rule 3).

What changes in every project, after its sync:
- Each audit entry that ships carries a `notice`, or the project's licence config names its `notices` file.
- Its `delete-merged-branches.yml` and `personal-terms.yml` callers drop their own concurrency groups.
- Its workflows point to the rule on where tests run instead of quoting the owner.
- A game's own notices check goes, since the core's holds it.
- A fetcher written as a quoted word, or with its subcommand quoted, needs its hand audit like any other.

Readings taken:
- The core's `tests` job is not among the checks its `main` requires, so a failing test does not block a merge here.
  Requiring it is the owner's setting; the PR names it.
- Each game's PR preview stays its own. One game builds its preview and publishes it through a `workflow_run`
  workflow; the other serves its files as they are. A shared workflow that writes `gh-pages` with a write token would
  be a larger change to what runs with credentials, so it is filed as an idea.

Questions for the owner: none.
