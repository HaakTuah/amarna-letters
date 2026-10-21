# Docs and preview pass

The first step of build order item 5+ in the design document, before the TypeScript conversion
(`docs/CONVERSION-PLAN.md`). Not before 26 October 2026, when usage resets; Haakon sets the session's usage limit
when he starts it. Haakon's instructions are quoted word for word, with his corrections and additions, followed by
what was found while preparing the pass.

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

(Haakon's point 5, adding `docs/CONVERSION-PLAN.md` in this PR, was done ahead of it: the file was committed on
`develop` on 21 October 2026, together with this one.)

## Findings while preparing the pass (21 October 2026; check them again before relying on them)

**Pages and previews.**
- Pages uses the GitHub Actions source (`build_type: workflow`). The `github-pages` environment allows deploys
  only from `main` (a custom branch policy). A `pull_request` job therefore can't deploy, but a `workflow_run` job
  (whose ref is `main`) can, so no Pages setting needs to change.
- The plan that follows: the PR workflow builds the site and uploads it as an artifact. A `workflow_run` workflow
  assembles the site in a `gh-pages` storage branch (main at the root, each preview in `pr-N/`) and deploys the
  whole tree with deploy-pages. Deploys are serialised with a concurrency group, and pushes to the storage branch
  use a lease. The `gh-pages` branch does not exist yet.
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

- "5+. TypeScript conversion" is not finished, so it stays in the Build order tab with its label. Items 1 to 5
  go to the short list of finished ones, with their details moved to BUILD-PROGRESS.md.
- BUILD-PROGRESS.md gets a row for 5+ (TypeScript conversion, not started), matching the design document.
- Before moving text between tabs, read the docs connector's guide (`topic.tabs` and `topic.editing`).
