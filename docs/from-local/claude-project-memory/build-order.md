---
name: build-order
description: "Since 19 Oct 2026 work follows the design document's \"Build order\" section item by item, tracked in docs/BUILD-PROGRESS.md"
metadata:
  node_type: memory
  type: project
  originSessionId: 246a2c6e-d357-4ae0-9392-9e7a385aed81
  modified: 2026-10-19T05:27:18.919Z
---

From 19 October 2026 the owner points unattended sessions at "Build order" near the end of the design document's main tab (Claude Docs doc 7f857750-39dc-464a-a739-c9f59dfe3dcd; read it with the docs connector, export the tab to markdown). It lists the items in order (14 at first, 18 by the afternoon of 19 October; 1 = the simulation-fixes round) and the builder's rules: a `develop` branch created by item 1, one branch per item from `develop`, merge into `develop` when tests pass and one reviewer finds nothing blocking, never touch `main`; one reviewer per item and no extra analyst workflows; progress in `docs/BUILD-PROGRESS.md` (one line per item: state, branch, report, decisions); each item's report in `docs/rounds/<date>-<item>.md`; check usage after each item and stop at a clean commit when the weekly limit passes the share the owner set for the session; stop for review after items marked so.

**PRs at milepoints** (owner, 19 Oct 2026): each time an item is merged into `develop`, push `develop` and open a PR from `develop` to `main` for the owner to review (or let an open one pick up the new commits). Before pushing again, check whether the last PR was merged; if it was squash- or rebase-merged, merge `main` back into `develop` first so the next PR shows only new work. Never push or merge to `main` itself.

**Read it fresh for every item** (owner, 19 Oct 2026): the design document changes while work goes on. When starting each Build order item, read that item's sections and the builder rules fresh from the live document (docs connector, doc 7f857750-39dc-464a-a739-c9f59dfe3dcd; export the main tab), never from an earlier read, a scratch extract or memory.

**Why:** the owner works away from the computer and wants sessions to run the plan by themselves, economically.

**How to apply:** at the start of a session, reread the Build order and `docs/BUILD-PROGRESS.md`, take stock of git and worktrees, and continue with the first unfinished item. See [[round-workflow-rules]] and [[owner-message-log]].

New agent types written to `.claude/agents/` do load into a running session (the sim's `char-*` and `king-*` types appeared after `sim/setup.js` ran), but not instantly: a probe created and used within seconds was not found. The desktop app's bundled headless `claude.exe` is not signed in, so agents cannot be launched headlessly; run simulations from a session as orchestrator.

Rules added on 20 October 2026 (live document and Haakon's message; check the document for the current wording): review points no longer stop the build (list their questions at the top of BUILD-PROGRESS under "For Haakon" and go on); no model games until every item is built (script games and stub repliers only); "Every feature is every seat's": each item tests script kings and characters on its new features (usage and success per feature, patch weaknesses, benchmarks before and after), and once, at the start of the next item begun, audit every feature built so far; stop rules are never overridden ([[stop-rules-never-overridden]]); PR rule: before each push of develop, if the previous PR was merged, merge main back into develop first, then push and open a new PR; usage limit for the session set by Haakon (95% weekly on 20 October).

**One exception (Haakon, 21 Oct 2026):** the docs and preview PR alone may be merged into `main` by me once its build and tests pass; then check the site root still shows main and check previews on the next PR (fix them in a follow-up if needed), and revert if the root breaks. The rule is in `docs/BUILD-PROGRESS.md` (builder rules) and `docs/prompts/DOCS-AND-PREVIEW.md`. Every other PR into `main` is Haakon's to merge.
