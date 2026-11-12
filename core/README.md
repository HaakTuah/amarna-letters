# Agent Core

The rules shared by the owner's agent-built projects, written once so a change is made once and every project takes it
alike (core archive 68). The owner's words behind each rule: `archive/instructions.md`. A project of another owner takes
the core the same way, its *owner's account* filled in, and in its copy "the owner" is its own (core archive 148).

## Two layers

- **The floor** (`floor/`): what keeps the owner from harm and loss, taken whole by every project. If a project dropped
  a rule, could the owner be harmed or something be lost for good? Then it is floor. `security.md` holds the rules any
  task can break, read at the start of every task; `topics.md` the rules for particular work; `threat-model.md` the
  shared threat model.
- **The modules** (`modules/`): everything else the projects share, one file per thing a reader looks up, each saying at
  its top when it is read. At the start of every task: `how-to-work.md`, `inbox.md`, `work-flow.md`, `git.md`, and each
  builder's own (`claude.md`, or `other-builders.md`). When needed: `roles.md`, `helpers.md`, `reviews.md`,
  `review-guidelines.md`, `codex.md`, `orchestrating.md`, `github-calls.md` and `updates.md`; and, for games only,
  `game-design.md`.
- **The cap:** the floor and the modules together stay under 44 KB, checked on every PR here (`scripts/size.mjs`), so a
  new rule replaces text rather than adding to it (core archive 134).

## How a project takes the core

1. **An exact copy under `core/`,** pinned to one commit of this repository and never edited by hand. A change reaches a
   project only through a sync PR there, made by `core/scripts/sync.mjs`. A pure sync (only the copy and its pins, as
   `scripts/pure-sync.mjs` proves) gets no review of its own, since the core's PR reviewed what it carries (floor rule
   8); one that also fixes the project's pointers into core files the sync moved or removed is reviewed like any PR. The
   core's `core.yml`, which the project calls on every PR as a required check, fails one whose `core/` differs from the
   core at its pin. The first copy is the sync script's too, run from a clone of this repository once the manifest is
   written (the script's header says how); the copy's own `.gitattributes` keeps every line ending as it is.
2. **A manifest,** `core-manifest.md` at its root (format below): the pin, the modules it takes, its names for the
   core's words, and what fills each slot. Every session reads it at the start.
3. **Pointer lines:** its `AGENTS.md` names the manifest and every file read at the start of every task, each on a line
   of its own (Claude Code imports them through `CLAUDE.md`; any other tool reads them because `AGENTS.md` says to),
   and keeps a "Review guidelines" section pointing to `core/modules/review-guidelines.md` and its own.
4. **Its own security files:** its `SECURITY.md` says the floor holds whole and adds, under the same numbers, what only
   it has, listing under rule 3 after `**the rule files:**` its rule files besides `AGENTS.md`, `CLAUDE.md`,
   `SECURITY.md` and `core-manifest.md` (its threat model among them), each path in backticks, the list ended by `;`, as
   `core/scripts/rule-files.mjs` reads them, and among the checks on the work the configs of its copies, licence and
   reading-size checks. Its threat model adds to the floor's.
5. **The shared scripts and workflows,** run from its `core/` copy: `work-saved.sh` as its work-saved hook and
   `helper-call.mjs` as its hook on the Agent tool (it refuses a call that names no model or no effort, until the call
   is made again with the same prompt, and the effort max on every call but a fork's; a helper of a type the project
   defines, a file `.claude/agents/<name>.md` holding its model and effort, goes on without the two, and so does a
   helper of a plug-in's own type), `copies.mjs`
   and `licences.mjs` as its copies and licence checks with configs of its own (the *copies check*; the licence check's
   with its audit of what no lockfile holds, which `licence-scan.mjs` holds whole, every action, fetched package, asset
   and copied-in code it uses, and each entry that ships with its notice), and with the copies check `pointers.mjs` and
   `reading-size.mjs`, the pointer check and the reading-size check, the second with marks of its own (the *size
   marks*), and `workflows.mjs`, which needs no config and fails a workflow that names `pull_request_target` (floor rule
   2); and `pr-description.mjs`, which fails a pull request, once it is no draft, whose description lacks one of the
   headings `modules/git.md` names (or those the project gives it). Its own `core.yml`, `personal-terms.yml`,
   `copies.yml`, `licences.yml`, `codeql.yml`, `delete-merged-branches.yml`, `pr-description.yml` (on `pull_request`
   with the types opened, edited, reopened, synchronize and ready_for_review) and, if it has versions Dependabot cannot
   see, `versions.yml` keep their triggers and call the core's of the same name
   (`uses: HaakTuah/agent-core/.github/workflows/<name>.yml@<full commit SHA>`). Only a
   sync PR moves those pins, and only when the called workflow changed; `core.yml` fails a call pinned where it differs
   from the core's pin. Its `.github/dependabot.yml` ignores `HaakTuah/agent-core*`. Every action a workflow uses,
   GitHub's own included, is pinned to a full commit SHA with its version in a comment after it, which Dependabot keeps
   current: a security fix in an action reaches a workflow by that weekly update, with no alert of its own, since GitHub
   alerts only for actions at a version. The owner's setting (below) fails a run that uses one that is not pinned (core
   archive 152). A game served by GitHub Pages publishes main with `site-publish.sh root`, and its pull requests'
   previews through a `preview.yml` of its own, on `workflow_run` of its build, that calls the core's (the build uploads
   the artifact `preview`: `pr-number`, and the site in `site/`). A project whose packages come from npm has a
   `signatures.yml` of its own, on a pull request that changes a package list, a lock file, an `.npmrc` or that
   workflow, which calls the core's with the folder of its lock file: an install from the registry alone, running no
   package's install script, then npm's own check of the registry's signature on each installed name and version (floor
   rule 7). **A private repository** has GitHub's dependency
   review and CodeQL only with its paid code security, so without it it calls neither `licences.yml` nor `codeql.yml`: a
   workflow of its own runs `core/scripts/licences.mjs` for what no package list holds, and its own check holds its
   packages to floor rule 10's list. Its Actions settings must allow this repository's workflows, and each check there
   spends paid minutes, so each runs only where a change can affect it. On GitHub's free plan it has neither rulesets
   nor auto-merge: there the sessions alone keep floor rule 12 and merge by hand (`modules/work-flow.md`, point 1). The
   core's scripts read npm's lockfiles alone: what another installer holds, the project's own checks do. **A project
   that is sold** keeps its seller's name, like every name, out of the repository (floor rule 11): its build takes the
   name, and the terms it is sold under where they name him, from outside it; the terms themselves are the owner's to
   give (floor rule 10). **The default branch is `main`,** which the hooks read their scripts from, letting every call
   through where there is none. **On Windows** Claude Code runs both hooks in Git Bash, and the second needs Node on
   the path; where either is missing, the hook stops nothing. **The copy's own files** (`core/AGENTS.md`,
   `core/CLAUDE.md`, `core/.github/`) are this repository's, not the project's: its issue templates and settings are its
   own, written for its *owner's account*.
6. **What only it has** stays in its own rule files: what it is, its commands, its queue, its own rules, with pointers
   into `core/`.

## Slots

Where projects differ only in a name, a path or an example, the core leaves a **slot**, in italics (*progress file*),
and each manifest says what fills it. A task is a project's unit of work; the main lane is its queue.

| Slot | What the project fills in |
| --- | --- |
| *owner's account* | the owner's GitHub login, in backticks (`core.yml` fails a manifest without it): his word (floor rule 4) and his inbox (`modules/inbox.md`) |
| *progress file* | the file that holds the queue and what is done |
| *report* | where a task's report, with its "Readings taken", goes |
| *settling references* | what open points are settled against, with the owner's past words |
| *descriptions* | every place that describes what a change changes, for each kind of reader |
| *copies check* | the check that fails a new copy, and its config for `scripts/copies.mjs` |
| *size marks* | the reading-size check's marks, its config for `scripts/reading-size.mjs` |
| *large file* | how large a file is before it is never read whole |
| *one at a time* | what never runs as parallel lanes |
| *design-checked PRs* | which PRs get the design check |
| *review reference* | what reviewers judge the work against besides the task's text |
| *planning design* | what planning design plans |
| *hard work* | what counts as the hard work |
| *major version checks* | the extra checks a new major version gets |
| *other builders' checks* | what a builder of another provider runs before it finishes (`modules/other-builders.md`); a row still named *Codex's checks* is this one, renamed at the project's next sync |
| *code reviewers* | who reviews whose work, in order, with the fallback reviewer last, how each one that is not Codex is asked, and which of its findings block where it marks none so; left out, the core's own (`modules/roles.md`) |
| *security reviewer* | who gives each PR its security review, and how it is asked; left out, Codex (`modules/reviews.md`, point 3) |
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

- Where Codex reviews: its GitHub app on the owner's repositories, its own automatic code review off (core archive
  18); its security review on, for team PRs, on PR open, reporting Medium and above, reading the project's threat model
  and `SECURITY.md` with the floor (core archive 51).
- Each project's ruleset on its default branch: deletions restricted, force pushes blocked; a pull request required, no
  approvals; status checks required (the project's CI and `core / core`), branches up to date; where the repository has
  them, code scanning results required from CodeQL, blocking on security alerts High or higher and alerts Errors, code
  quality results required at Errors, and Copilot's review requested automatically, advisory (core archive 130).
- Each repository's Actions settings (Settings, Actions, General): "Require actions to be pinned to a full-length commit
  SHA", turned on once its own workflows, the core's it calls and the actions those use are pinned so, since from then
  on a run that uses an action at a tag fails. GitHub reads the workflow there as it runs it, which no check of ours can
  (core archive 152).
- The machine where agents run side by side (floor rule 18): `setup/server.md`, read only when setting it up.

## This repository

How it takes its own core, and how changes are made here: `AGENTS.md`; its security: `SECURITY.md`.
