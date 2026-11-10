# Amarna Letters

A Late Bronze Age grand strategy game: seven Great Kings, played by humans, script bots or language models, negotiate
through envoys and sealed tablets on a deterministic engine. The owner designs it with Claude in a design
document; builders like you build it item by item. Built in TypeScript (Vite and React, the engine in a Web Worker).
Every feature
answers to the design pillars and tenets in `docs/intent/overview/design-pillars.md`: read them once per session.

## The core

This game takes the shared rules in `core/` by `core-manifest.md`, whose slots and names fill the core's words. Read
these whole at the start of every task (Claude Code imports them; Codex: read each file named):

@core-manifest.md
@core/floor/security.md
@core/modules/how-to-work.md
@core/modules/inbox.md
@core/modules/work-flow.md
@core/modules/git.md

Codex: read `core/modules/codex.md` at the start of every task. The other files of the core, `core/floor/topics.md`
and `core/modules/game-design.md` among them, are read when a task needs them; each says when. A safety rule of this
game's own, which "Principles over rules" never reaches: no model games until the build order is done.

## Where things are

| What | Where | Notes |
| --- | --- | --- |
| Builder rules | `docs/builder-rules.md` | From the design document. Claude loads them in every session; Codex reads them at the start of every task. |
| When Codex builds | `docs/codex-building.md` | Read with `core/modules/codex-building.md` when routing work. |
| Security | `SECURITY.md`, `docs/threat-model.md` | What this game adds to the floor and to its threat model. |
| Intent: the design document, by tab and section | `docs/intent/` (start at `INDEX.md`) | One folder per tab. Generated copy. Never edit it. |
| As built: the design notes, by topic | `docs/design/` (index: `docs/DESIGN-NOTES.md`) | Source of truth for formulas, rules, numbers. |
| What is done and next | `docs/BUILD-PROGRESS.md` | One line per item, the follow-ups, use against ignore; questions are issues. |
| The historical sources | `docs/history/` (start at `README.md`) | Dossiers on 1346 BCE; cite them when an item builds from them. |
| Item reports | `docs/rounds/<date>-<item>.md` | Write yours there. |
| History | `docs/archive/` (build log; the owner's instructions word for word; the design document's history) | Read only when a task points there. |

## Starting a task

1. Find the next item in `docs/BUILD-PROGRESS.md`. The item's own text is its brief:
   `docs/intent/build-order/item-<n>.md` (`item-6.md`, `item-9plus.md`, ...).
2. Do the check for changes that `docs/intent/INDEX.md` describes ("The specification" in the builder rules), and do it
   again before opening the item's pull request: this is what "Review in the background" re-reads.
3. Read "The game in one page" (`docs/intent/overview/the-game-in-one-page.md`) before every item: most questions
   an item raises answer themselves from it, and a reading that contradicts it is a mistake, not a design question.
   Then read the sections the item names, and only those. Find them with `grep -rn "Title words" docs/intent docs/design`.

## This game's own ways

- **Read little:** the old round reports are in `docs/archive/rounds/`, except
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, a specification (its "question N" plans): read it by the question
  you need.
- **Print little:** tests with `scripts/test.sh` and script games with `scripts/sim.sh`. Model-game simulations
  (`sim/`) follow their own process and may use as many agents as it calls for (`sim/README.md`); none run until the
  build order is done.
- **Never edit `docs/intent/` or `docs/builder-rules.md`;** a design decision goes to the design session.
- **The smallest game that tests the rule** (archive item 28): a few powers on part of the map, a handful of seasons
  and only the characters a test needs; full-size games only in the replays, the save round trip and a smoke game; long
  measurements (benchmarks, use against ignore) in `scripts/sim.sh`. When an item grows the starting world, the tests'
  default does not grow with it. The workshop check measures against code-PR checks of about 10 minutes (29 October).
- **A standing rule of the owner's** for this game moves into the builder rules at the next refresh of the design
  document's copy, and leaves this file in the same PR.
- **Sessions:** a long item may end a session at a passed gate, with a commit and a note in `docs/BUILD-PROGRESS.md`
  saying where to pick up.
- **The next item on top:** branched from `main`, or, while the item before it is still in review, from that item's PR
  branch, which (or `main`, once that merged) is merged into it before its own PR. Where the builder rules still name
  `develop` or milestones, read `main`, until the design session's refresh cuts them.
- **Reviews:** the history dossiers (`docs/history/`) count as docs; the game's data is code (archive item 175).
- **Lanes beside the items** (archive item 23): beside the numbered items run splits and the workshop check, history
  dossiers, script play outside the current item's code, tests, and interface polish on screens the item does not
  touch; a lane's draft PR's title names its entry.
- **Updates:** the cue to move Node (`core/modules/updates.md`) is a new major of `@types/node`.

## Commands

```bash
scripts/cloud-setup.sh        # cloud machines: npm packages and Playwright's Chromium, if missing (it runs by itself when a cloud session starts)
scripts/test.sh               # type-check, lint, the copies, pointer and reading-size checks and Vitest, quiet: summary and failures only (full log: $TMPDIR/amarna-test-<pid>.log, one per run)
scripts/sim.sh --games 50 --seed 1 --verify-replay   # the batch runner (src/batch), quiet; see README.md
npm run dev --workspace src/web                       # the web app at http://localhost:5183
npm run build --workspace src/web && node src/web/smoke.mjs   # the Playwright smoke test of the built app
node core/scripts/licences.mjs scripts/licences.json # the licence check
```

Benchmarks: `scripts/sim.sh --versus solo ...` ("Benchmarks" in `docs/design/07-script-kings/20-benchmarks.md`). No
model games: no API key is set in cloud sessions.

## Review guidelines

Every reviewer, Codex's code review included, reads `core/modules/review-guidelines.md` and this game's own,
`docs/review-guidelines.md`, whole, and judges the change by them, with `SECURITY.md` and the floor.
