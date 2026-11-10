# Agent Core

The rules shared by the owner's agent-built projects, written once so a change is made once and every project takes it
alike (core archive 68). The owner's words behind each rule: `archive/instructions.md`.

## Two layers

- **The floor** (`floor/`): what keeps the owner from harm and loss, taken whole by every project. If a project dropped
  a rule, could the owner be harmed or something be lost for good? Then it is floor. `security.md` holds the rules any
  task can break, read at the start of every task; `topics.md` the rules for particular work; `threat-model.md` the
  shared threat model.
- **The modules** (`modules/`): everything else the projects share, one file per thing a reader looks up, each saying at
  its top when it is read. At the start of every task: `how-to-work.md`, `inbox.md`, `work-flow.md`, `git.md`, and each
  tool's own (`claude.md`, or `codex.md`). When needed: `roles.md`, `helpers.md`, `reviews.md`, `review-guidelines.md`,
  `orchestrating.md`, `github-calls.md` and `updates.md`; and, for games only, `game-design.md`.
- **The cap:** the floor and the modules together stay under 44 KB, checked on every PR here (`scripts/size.mjs`), so a
  new rule replaces text rather than adding to it (core archive 134).

## How a project takes the core

1. **An exact copy under `core/`,** pinned to one commit of this repository and never edited by hand. A change reaches a
   project only through a sync PR there, made by `core/scripts/sync.mjs`, reviewed like any PR. The sync PR also fixes
   the project's pointers into core files the sync moved or removed. The core's `core.yml`, which the project calls on
   every PR as a required check, fails one whose `core/` differs from the core at its pin.
2. **A manifest,** `core-manifest.md` at its root (format below): the pin, the modules it takes, its names for the
   core's words, and what fills each slot. Every session reads it at the start.
3. **Pointer lines:** its `AGENTS.md` names the manifest and every file read at the start of every task, each on a line
   of its own (Claude Code imports them through `CLAUDE.md`; Codex reads them because `AGENTS.md` says to), and keeps a
   "Review guidelines" section pointing to `core/modules/review-guidelines.md` and its own.
4. **Its own security files:** its `SECURITY.md` says the floor holds whole and adds, under the same numbers, what only
   it has, listing its rule files under rule 3 after `**the rule files:**`, each path in backticks, the list ended by
   `;`, as `core/scripts/rule-files.mjs` reads them. Its threat model adds to the floor's.
5. **The shared scripts and workflows,** run from its `core/` copy: `work-saved.sh` as its work-saved hook,
   `statusline.sh` as its status line (read by `usage.sh`), `copies.mjs` and `licences.mjs` as its copies and licence
   checks with configs of its own (the *copies check*). Its own `core.yml`, `personal-terms.yml`, `copies.yml`,
   `licences.yml`, `codeql.yml` and `delete-merged-branches.yml` keep their triggers and call the core's of the same
   name (`uses: HaakTuah/agent-core/.github/workflows/<name>.yml@<full commit SHA>`). Only a sync PR moves those pins,
   and only when the called workflow changed; `core.yml` fails a call pinned where it differs from the core's pin. Its
   `.github/dependabot.yml` ignores `HaakTuah/agent-core*`.
6. **What only it has** stays in its own rule files: what it is, its commands, its queue, its own rules, with pointers
   into `core/`.

## Slots

Where projects differ only in a name, a path or an example, the core leaves a **slot**, in italics (*progress file*),
and each manifest says what fills it. A task is a project's unit of work; the main lane is its queue.

| Slot | What the project fills in |
| --- | --- |
| *progress file* | the file that holds the queue and what is done |
| *report* | where a task's report, with its "Readings taken", goes |
| *settling references* | what open points are settled against, with the owner's past words |
| *descriptions* | every place that describes what a change changes, for each kind of reader |
| *copies check* | the check that fails a new copy, and its config for `scripts/copies.mjs` |
| *large file* | how large a file is before it is never read whole |
| *one at a time* | what never runs as parallel lanes |
| *design-checked PRs* | which PRs get the design check |
| *review reference* | what reviewers judge the work against besides the task's text |
| *planning design* | what planning design plans |
| *hard work* | what counts as the hard work |
| *major version checks* | the extra checks a new major version gets |
| *Codex's checks* | what Codex runs before it finishes |
| *computer players*, *measured players*, *what they are shown*, *use-against-ignore measurement*, *where the numbers go*, *where rules are taught* | a game's names for what `game-design.md` speaks of |

## The manifest's format

```markdown
# Core manifest

Core: HaakTuah/agent-core at <full commit SHA>, copied whole under core/ (never edited here).
Paths: in the core's files, one into floor/, modules/, scripts/, setup/, archive/ or reports/ is under core/; any other is ours.
Floor: whole. Modules: <all, or the list of those taken>.

## Names
<the project's names for the core's words, one line each>

## Slots
| Slot | Here |
| --- | --- |
<one row per slot it has>
```

## Setting up (the owner's part)

- Codex's GitHub app on the owner's repositories, its own automatic code review off (core archive 18); its security
  review on, for team PRs, on PR open, reporting Medium and above, reading the project's threat model and `SECURITY.md`
  with the floor (core archive 51).
- Each project's ruleset on its default branch: deletions restricted, force pushes blocked; a pull request required, no
  approvals; status checks required (the project's CI and `core / core`), branches up to date; code scanning results
  required from CodeQL, blocking on security alerts High or higher and alerts Errors; code quality results required at
  Errors; Copilot's review requested automatically, advisory (core archive 130).
- The machine where agents run side by side (floor rule 18): `setup/server.md`, read only when setting it up.

## This repository

How it takes its own core, and how changes are made here: `AGENTS.md`; its security: `SECURITY.md`.
