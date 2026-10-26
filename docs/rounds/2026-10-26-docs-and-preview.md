# Item 5+, step 1: the rest of the docs and preview pass (26 October 2026)

Brief: `docs/items/docs-and-preview.md`; spec: `docs/prompts/DOCS-AND-PREVIEW.md` (Haakon's words). Branch
`docs/archive-and-preview`. One session, no subagents or workflows, as the spec asks. So this pass has no separate
reviewer: I read my own diff before merging.

## The cloud machine

- **.NET** was already installed. `scripts/test.sh`: all 1,008 tests pass (688 game, 288 engine, 32 web).
- **Usage:** `scripts/usage.sh` says "unknown": this session cannot see weekly usage, so the 90% rule depends on
  Haakon watching it.
- **Playwright's Chromium** launches and drives the published app (used below to check the previews).
- **The live design document** has no changes since the copy's revision (main tab 542). The Ideas tab was not
  needed for this step.
- **The GitHub API's Pages and environment endpoints** are refused by this session's proxy, so the Pages settings
  could not be read. The workflows below work under either setting (see "Settings").

## Step 2: the round reports archived

Moved to `docs/archive/rounds/`: every report in `docs/rounds/` except `2026-10-18-sleep-and-simulation.md` (the
builder rules cite it), plus that round's prompt, the visual overhaul's screenshots, `docs/ROUND-PROMPT.md` and
`docs/ROUND-PROMPT-ADDITIONS.md`. Every reference to a moved file now points at its new path: README.md (the
screenshots), `sim/README.md`, `docs/SIMULATION-PROMPT.md`, `docs/BUILD-PROGRESS.md`, the design notes,
the report that stayed, and `CLAUDE.md`; `docs/archive/build-log.md` keeps the old paths, since it is history word for word. The three engine code comments the spec names
point at the report that stayed, so nothing needed changing there. `docs/archive/README.md` lists the new folder.

**The check.** I checked each report's decision, readings and review-question sections against `docs/design/`,
`docs/BUILD-PROGRESS.md` and `docs/archive/build-log.md`. Almost everything is in the design notes or the build log.
These six are recorded in neither, and are listed here rather than copied over:

1. Item 4, decision 4: the script worker keeps only the newest game's kings, and drops requests still queued for a
   game the page has left; a king whose code fails answers with an error, and the runner's stand-in answers for it.
2. Item 4, decision 5, a trap for the next builder: the .NET loader takes over a worker whose `onmessage` is set when
   `dotnet.js` loads, and waits forever for a main runtime; the worker listens with `addEventListener` instead
   (there is a comment in `js/script-worker.js`). This is worth knowing for the conversion, which replaces that
   worker.
3. Fix pass, review question 1 (follow-up): "Lists are offers, not questions". Fields that need an answer are asked
   only when they apply, but lists that may be empty stay in every schema, and the orders schema is the same for
   every king and season. The alternative was an orders schema made for each view.
4. Fix pass, review question 2 (follow-up): schemas now vary more per call; whether that costs prompt-cache hits was
   not measured.
5. Fix pass, standing orders for every seat, reading 6: "better" in the standing-order measurement counts troops
   first, then land.
6. Simulation-fixes round: "Risen above X" (the treasury trigger) was read as "at or above X". No such trigger is in
   today's code or design notes, so this one is moot.

## Step 4: previews

The approach is the one Haakon gave word for word in the spec: a publishing branch, `gh-pages`, with `main` built to
its root and each PR to its own `pr-<number>/` folder, removed when the PR closes.

- **`.github/workflows/pages.yml`** ("Build, test and publish") runs on every PR (into any branch) and every push to
  `main`. It tests, builds (one line, `dotnet publish`, to be swapped for the TypeScript build), and prepares the
  site with `scripts/site-prepare.sh`, which sets the base path. A PR's run has a read-only token: it uploads its
  site and its number as an artifact, and nothing else. A push to `main` writes the root of `gh-pages` with
  `scripts/site-publish.sh root`, which keeps every `pr-*` folder.
- **`.github/workflows/preview.yml`** ("Publish preview") is started by `workflow_run`, so it always runs `main`'s
  copy and never the PR's code. Before writing anything it checks the uploaded number against the PR itself through
  the API: it must be digits, and the PR must be in this repository (no forks: a preview runs on the game's own
  origin, where browser storage is kept) with this run's head commit. An open PR gets `pr-<number>/` and a comment
  with the link, updated in place on later pushes. A closed PR's folder is removed: the build workflow also runs on
  `closed`, uploading only the number. It writes `pr-<number>/` only, never the root.
- **`scripts/site-publish.sh`** makes each publish one fresh commit with no parent, so the branch does not grow with
  every build. It pushes with a lease on the commit it started from, and if another run moved the branch first it
  redoes the change from the new tip (up to five tries). The target must be `root` or `pr-<digits>`. Links in a
  built site are deleted before copying.
- **`.github/workflows/pages-deploy.yml`** keeps the game updating until the Pages source is switched. While Pages
  serves from GitHub Actions, every write to `gh-pages` (root or preview) is followed by a deployment of the
  branch's contents with the Pages action, from `main`, which the environment allows. Once the Pages API reports a
  branch source (`build_type: legacy`), this step does nothing. Deployments run one at a time, and a waiting one is
  replaced by a newer one, which checks out the branch as it then stands.
- **The service worker** (`service-worker.published.js`) leaves `pr-<n>/` paths to the network. A preview has no
  service worker of its own (`site-prepare.sh ... preview` removes it), so it cannot delete the root's caches.
- **Jekyll:** `.nojekyll` at the branch root.
- **Deep links:** Pages serves only the root's `404.html`. That file now sends a deep link inside a preview
  (`/pr-12/play`) to the preview's start; at the root, deep links work as before.

**Checked here:**
- `scripts/site-publish.sh` against a local bare repository:
  - it creates the branch;
  - a root publish keeps `pr-*` folders;
  - a PR publish and a removal touch only their own folder;
  - publishing an unchanged tree is a no-op;
  - `../x` and `pr-1/../..` are refused.
- `actionlint` is clean on all three workflows.
- The real published app, served the way Pages serves it (folders answer with `index.html`, anything missing with
  the root's `404.html`), in Playwright's Chromium:
  - the root loads, and registers its worker;
  - `/pr-7/` loads with its own base path while the root's worker controls the page;
  - `/pr-7/play` goes to `/pr-7/`, and the root's `/play` works;
  - afterwards there is one worker (the root's) and the root's cache is intact.

**Not checked here:** the workflows on GitHub itself. The publisher runs only from `main`, so this PR's own preview
appears only after it is merged (as the spec found). Following Haakon's revised condition, the merge is followed
by a check of the site root, and previews are checked on the next PR.

## Settings (Haakon's to change; nothing breaks before he does)

1. **Settings → Pages → Build and deployment → Source:** "Deploy from a branch", branch `gh-pages`, folder `/ (root)`.
   Until then, `pages-deploy.yml` deploys the branch from `main` with the Pages action, and the site shows the root
   and every preview.
2. If GitHub's own deployment from `gh-pages` is refused after the switch: **Settings → Environments →
   `github-pages` → Deployment branches and tags:** add `gh-pages`.
3. If the deploy job's check of the Pages source ever fails while the source is a branch, the Pages action would try
   to deploy and its job would fail (red, harmless to the site). It has not been seen; the fallback is there so the
   game never stops updating.

## Point 8: tidy-up

This cloud clone has no worktrees, and the worktrees on Haakon's computer (`.claude/worktrees/`, old scratch folders)
cannot be reached from here.

**Branches on GitHub.** These 11 have all their work in `develop` or `main`, and are ready to remove. This session's
permission rules refused the deletion (`git push --delete`), so they are still there. Delete them with one command:
`git push origin --delete ci/pull-request-checks claude/stoic-liskov-d290e5 docs/player-first-readme docs/readme-courts feature/strategist-bots round/sleep-and-simulation setup/cloud-and-context setup/local-to-repo round/simulation-fixes-bots round/simulation-fixes-memory round/simulation-fixes-kit`.

| Branch | Tip | Why it can go |
| --- | --- | --- |
| `ci/pull-request-checks` | `10270f9` | merged into `develop` |
| `claude/stoic-liskov-d290e5` | `e27d6d1` | merged |
| `docs/player-first-readme` | `c27b937` | merged |
| `docs/readme-courts` | `945bf00` | merged |
| `feature/strategist-bots` | `438cf20` | merged |
| `round/sleep-and-simulation` | `530bcd9` | merged |
| `setup/cloud-and-context` | `c7eeb8a` | merged |
| `setup/local-to-repo` | `6a2ae7d` | merged |
| `round/simulation-fixes-memory` | `55ef7a4` | its patches are all in `develop` (`git cherry`) |
| `round/simulation-fixes-bots` | `bd346a9` | its 11 commits were ported into `develop` with new hashes and subjects; nearly all their added lines are in `develop` today, and the rest were later rewritten |
| `round/simulation-fixes-kit` | `ce42217` | the same, for 21 commits |

**Kept:** `wip/scratch-review-H` (`285b2b2`), an untested review probe test that is in neither `develop` nor `main`.
Also `main`, `develop`, and this item's branch until it is merged.

## Sizes

| What | 21 October (the spec) | Before this step (26 October) | After |
| --- | --- | --- | --- |
| `DESIGN-NOTES.md` | 307,824 bytes | 4,540 (index; `docs/design/` 307,638) | 4,540 (`docs/design/` 308,082) |
| Round reports in `docs/rounds/` | about 960 KB (960,553) | 960,553, plus 2.5 MB of screenshots | 312,975 (the one specification) |
| `docs/BUILD-PROGRESS.md` | 22,987 | 6,413 | 6,477 |
| `CLAUDE.md` | none | 9,543 | 9,533 |
| Read by every session (`CLAUDE.md` and the builder rules) | none | 18,423 | 18,413 |

`docs/archive/rounds/` holds 3.2 MB (the reports and the screenshots), read only when a task points there.

## Readings taken

- **Previews for PRs into any branch**, not only into `main`: item PRs go into `develop`, and Haakon asked for
  "every PR".
- **No previews for PRs from forks:** a preview runs on the game's own origin, where saved games and any API key
  typed into the page are kept.
- **One commit with no parent per publish,** rather than a growing history on `gh-pages`: the branch is only a
  publishing target, and each build holds about 16 MB.
- **Branches whose commits were ported** (the bots and kit backups) count as having their work in `develop`, as the
  brief says, checked by content because their hashes and subjects differ.

## After the merge into main

The first push to `main` with the new workflows (`c918074`) was cancelled within a second, before any step ran: "Canceling
since a higher priority waiting request for Build, test and publish-refs/heads/main exists". The workflow-level
concurrency group also applied to the deploy workflow it calls, so the run cancelled itself. PR runs never reach that
call, which is why the PR's checks were green. The site kept showing the game from the last deployment (`a5f3c73`, the
same game). The fix (PR "Pages: set the build's concurrency on the job") moves the group onto the build job, and was
merged into `main` under the exception's follow-up clause ("fix previews in a follow-up if needed"), since without it
pushes to `main` no longer updated the site.
