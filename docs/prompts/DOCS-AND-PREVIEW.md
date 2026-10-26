# Docs and preview pass

The first step of build order item 5+ in the design document, before the TypeScript conversion
(`docs/CONVERSION-PLAN.md`). Not before 26 October 2026, when usage resets; Haakon sets the session's usage limit
when he starts it (since 26 October: the 90% rule, "Usage" in the builder rules). Haakon's instructions are quoted word for word, with his corrections and additions, followed by
what was found while preparing the pass.

## Status (26 October 2026)

Part of this pass was done on 26 October 2026, when the repository was set up for cloud sessions (PR "Cloud setup"):
- **Step 1** is done: `CLAUDE.md` holds the "How to work" rules below word for word, with the working rules that keep
  to them.
- **Step 3** is done: `DESIGN-NOTES.md` is split into `docs/design/`, one file per topic, word for word, and
  `DESIGN-NOTES.md` is now its short index, so old references still work.
- **Splitting the design document into tabs** is replaced by a copy of the document in the repository, one file per
  section (`docs/intent/`), with a check against the live document at the start of each item. It gives builders the
  same small reads, and the docs tools could only move text between tabs by retyping it. Haakon left the choice to
  Claude on 26 October ("You handle the details", `docs/archive/instructions.md`). The finished items' details were
  already in `docs/BUILD-PROGRESS.md`; its history now lives in `docs/archive/build-log.md`.
- `docs/BUILD-PROGRESS.md` has the row for 5+, split into this pass, the conversion and the fix pass.

Left for the pass: step 2 (archiving the round reports), step 4 (previews), point 8 (tidy-up), the sizes before and
after, and the merge exception. The brief is `docs/items/docs-and-preview.md`.

## The task (Haakon, 21 October 2026)

```
Make development in this repo cheaper in usage, and give me playable previews.
One session, no subagents or workflows.
No engine code changes: a conversion to TypeScript is coming, so only docs, CLAUDE.md
and the preview workflow.

1. Add this to CLAUDE.md under "How to work":
   - A question is a question. Answer it; don't act on it unless I say so.
   - Match effort to the task. Docs, READMEs, small fixes and config: one pass, no subagents.
   - Don't use more than 2 agents unless the build order's documented process calls for it.
     Simulation runs and the build order's review steps may use as many agents as their
     process calls for. Never stop to ask about this: pick the cheaper way, and say in
     the PR what you chose.
   - Usage is limited. Prefer the cheapest approach that does the job well.
   - Read only the parts of large files the task needs. Round reports in docs/archive/
     are history: read them only when I ask.
   - Long simulations: run them in the background and wait for the completion notice.
     Don't poll, and don't keep agents alive just to wait for a run.
   - At each milestone, open a PR I can play, say in it what to try, and carry on with
     the next item without waiting for me to review or merge.

2. Move the round reports in docs/rounds/ to docs/archive/rounds/. Check that every
   decision they led to is also in DESIGN-NOTES.md or BUILD-PROGRESS.md; list any that
   aren't in the PR instead of copying them over.

3. Split DESIGN-NOTES.md into one file per topic under docs/design/, with a short index.
   Move the text as it is; don't rewrite it. Update links that point into it.

4. Add a GitHub Action that builds every PR and publishes it as a playable preview on
   GitHub Pages at its own address (for example /pr-<number>/), with the base path set
   so the app loads there, puts the link in the PR, and removes the preview when the PR
   is closed. The game's current Pages address must keep showing main exactly as before,
   and every push to main must build the app and update the site root automatically,
   so the published game never stops updating. Keep the build step separate and simple,
   so it can be swapped for the TypeScript build after the conversion. If a Pages setting
   has to be changed by me, say exactly what in the PR and carry on.

On a branch, with one PR. Say in the PR what the sizes were before and after.
Then carry on with the build order as before.
```

"Carry on with the build order" means the TypeScript conversion next, then the fix pass for "Found during the
port", then item 6 (Haakon, 21 October 2026).

## Corrections and additions (Haakon, 21 October 2026)

Correction to the archiving step in the docs and preview PR:
- Don't archive docs/rounds/2026-10-18-sleep-and-simulation.md. The design document's
  builder rules name it as a specification for items still to come ("question N"), so it
  stays where it is until every item that refers to it is built. Archive the other round
  reports as planned, and update any reference to a moved file.

Also in the docs and preview PR:
- Split the design document into tabs to save context: a Build order tab with only the
  remaining items and a short list of finished ones (move the finished items' details
  to BUILD-PROGRESS.md), and the rest in thematic tabs. Move text word for word; don't
  rewrite it, and keep section names, so references like "Engine rules under Tech stack"
  still find their section. Then add to CLAUDE.md: read the Build order tab every
  session, other tabs only when the item needs them.

On moving text between tabs: the design document has no comment threads, so a copy is
fine. Copy each section exactly, formatting included, into its new tab, then remove it
from the main tab. Before removing anything, compare the plain text of the copy with the
original; they must be identical. Only if a section can't be copied exactly, leave it
where it is, say so in the PR, and carry on with the rest.

Archiving the prompt file with the other round reports is fine: the design document
doesn't refer to it.

8: Yes, tidy up in the docs PR. Remove a worktree or branch only if it has no
uncommitted or unpushed work, and list any you keep in the PR.

- 5: in the archiving step, check only each report's decision and review-question
  sections against DESIGN-NOTES.md and BUILD-PROGRESS.md, not the whole reports.

On 4: I don't think the docs PR has to be merged before previews work. On a PR from this
repo, GitHub runs the workflows in the PR's own branch, so the preview workflow should
run on the docs PR itself and on every later PR that includes it; only publishing main
to the site root needs it on main. Check it on the docs PR, and note the result in the
docs pass instead of the assumption.

One exception to "main is never touched", for the docs and preview PR only: when it's
done and its own preview link works, merge it into main yourself. Then check that the
site root still shows the game from main as before. If it doesn't, revert the merge,
say so in the PR, and carry on without previews. Every other PR into main stays mine
to merge.

Revised the same day, because the preview publisher runs only from `main` and so can't show this PR's own preview
before it is merged (see "The docs PR's own preview" below): "Merge the docs PR once its build and tests pass, then
check the site root shows main and check previews on the next PR; fix previews in a follow-up if needed."

(The exception was also recorded in the progress file's builder rules, now `docs/archive/build-log.md`. It applies to this one PR only.)

(Haakon's point 5, adding `docs/CONVERSION-PLAN.md` in this PR, was done ahead of it: the file was committed on
`develop` on 21 October 2026, together with this one.)

## Findings while preparing the pass (21 October 2026; check them again before relying on them)

**Pages and previews.**
- **The approach (Haakon, 21 October 2026, word for word):**

  ```
  On the deploy step: GitHub Pages has one deployment per site, so a PR deployed with the
  standard Pages action would replace the whole site, not add a folder beside it. Use a
  publishing branch instead, the same approach as Barkstreet Snakes: main built to the
  branch's root, each PR to its own /pr-<number>/ folder, removed when the PR closes, and
  Pages serving from that branch. A PR must never be able to replace the site root.
  Write this into the docs pass spec. I won't change any Pages or environment setting
  now: if the chosen approach needs a setting changed, the PR says exactly which one.
  ```

- **So that a PR can never replace the root,** no PR's own code runs with write access to the publishing branch
  (`gh-pages`, which does not exist yet):
  - A PR run builds its preview with a read-only token and uploads it as an artifact.
  - Only workflows that run from `main` write to the branch. A push to `main` rebuilds the root and keeps every
    `pr-*` folder. A publisher started by `workflow_run` copies a PR's artifact into `pr-<number>/` only, with the
    number checked to be digits, and comments the link on the PR. Closing a PR removes that folder only.
    `workflow_run` always uses `main`'s copy of the publisher, so a PR cannot change what it does.
  - Every write to the branch is pushed with a lease, and retried if another run moved the branch first.
- **Settings (left to Haakon; the PR says exactly which).** On 21 October Pages served from GitHub Actions
  (`build_type: workflow`). Serving from the branch needs Settings → Pages → Build and deployment → Source: "Deploy
  from a branch", branch `gh-pages`, folder `/ (root)`. On 21 October the `github-pages` environment allowed
  deployments only from `main`. If GitHub's own deployment from `gh-pages` is refused once the source is switched,
  the PR also names Settings → Environments → `github-pages` → Deployment branches and tags: add `gh-pages`.
- **The game never stops updating.** Until the source is switched, the push to `main` also deploys the branch's
  contents with the Pages action, which runs from `main` and is allowed. That shows the root and every preview. Once
  the Pages API reports the branch source, that step is skipped.
- **Jekyll.** A site served from a branch goes through Jekyll, which drops folders that start with an underscore
  (`_framework`). A `.nojekyll` file at the branch root prevents that.
- **The docs PR's own preview.** The publisher runs only from `main`, so the docs PR's own preview appears only
  after it is merged. The merge exception asked for its own preview link to work first, so Haakon changed its
  condition (21 October 2026, word for word): "Merge the docs PR once its build and tests pass, then check the site
  root shows main and check previews on the next PR; fix previews in a follow-up if needed."
- `src/Amarna.Web/wwwroot/service-worker.published.js` answers every navigation inside its scope with the cached
  root `index.html`, so `/pr-N/` would show main to anyone who has visited the game. It needs a two-line skip for
  `pr-<n>/` paths. Previews must not register a service worker of their own: leave `service-worker.js` out of the
  preview folder, or its activate step deletes the root's `offline-cache-*` caches.
- Pages serves only the root `404.html`, so a deep link inside a preview falls through to main. A short redirect
  snippet in the root 404 sends it to the preview's start.
- The base path is set today by `sed` on `<base href="/" />` in `.github/workflows/pages.yml`.

**References to moved files.**
- `docs/rounds` is named in README.md (the screenshots), BUILD-PROGRESS.md (15 times), DESIGN-NOTES.md (13),
  ROUND-PROMPT.md, SIMULATION-PROMPT.md, `docs/prompts/VISUAL-OVERHAUL.md`, `sim/README.md`, and three engine code
  comments (Geography.cs, MapData.cs, TurnEngine.Sieges.cs; leave those, since the pass makes no engine changes).
  Most point at the report that stays (`2026-10-18-sleep-and-simulation.md`).
- DESIGN-NOTES.md is named in README.md, BUILD-PROGRESS.md, ROUND-PROMPT.md and ROUND-PROMPT-ADDITIONS.md. Keeping
  DESIGN-NOTES.md as the short index keeps old references working.

**Sizes before the pass (21 October 2026).** DESIGN-NOTES.md 307,824 bytes; the round reports in docs/rounds about
960 KB in all (the one that stays is 312,967 bytes); BUILD-PROGRESS.md 22,987 bytes; no CLAUDE.md.

**Tidy-up candidates (21 October 2026).** The worktrees under `.claude/worktrees/` (relaxed-clarke, stoic-liskov,
trusting-stonebraker); worktrees in old session scratch folders (main-before, scratch-review-H, wt-ids); the merged
`docs/player-first-readme`; old feature, round and item branches.

## Notes for the pass

(26 October 2026: the tab split was replaced by the copy in `docs/intent/`, and the 5+ rows are in
`docs/BUILD-PROGRESS.md`; see "Status" above. These notes stay for the record.)

- "5+. TypeScript conversion" is not finished, so it stays in the Build order tab with its label. Items 1 to 5
  go to the short list of finished ones, with their details moved to BUILD-PROGRESS.md.
- BUILD-PROGRESS.md gets a row for 5+ (TypeScript conversion, not started), matching the design document.
- Before moving text between tabs, read the docs connector's guide (`topic.tabs` and `topic.editing`).
