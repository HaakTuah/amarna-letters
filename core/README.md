# Agent Core

The rules shared by the owner's agent-built projects, written once so that a change to them is made once and every
project takes it the same way (core archive 68). The owner's words behind each rule are in `archive/instructions.md`.

## Two layers

- **The floor** (`floor/`): the rules that keep the owner from harm and loss, taken whole by every project; what it
  protects and how it binds: the top of `floor/security.md` (core archive 75). When unsure whether a rule belongs here,
  ask: if a project dropped it, could the owner be harmed or something be lost for good? Then it is floor.
  - `floor/security.md`: what the floor is, and the rules any task can break, read at the start of every task.
  - `floor/topics.md`: the rules for particular work, and how to report a weakness, read before a task touches one.
  - `floor/threat-model.md`: who might attack, what is protected and the ways in, the part every project shares.
- **The practice modules** (`modules/`): everything else the projects share, one file per thing a reader looks up on its
  own, each saying at its top what it is for, when it is read and which others it leans on. A project picks the modules
  it takes.
  - Read at the start of every task: `how-to-work.md` (the aim, the four pillars, the habits), `inbox.md` (questions,
    readings, ideas, bugs, and the owner's words), `work-flow.md` (reviews in the background, lanes, sessions),
    `git.md` (branches and pushes), and each tool's own: for Claude, `claude.md` (models, effort, helpers, usage and
    the brake); for Codex, `codex.md` (its own instructions).
  - Read when needed: `roles.md` (who does what, escalation, who merges), `helpers.md` (when helpers pay),
    `reviews.md` (which review, the security gate, only a 10 passes), `review-guidelines.md` (what reviewers judge by),
    `codex-building.md` (Codex's status, what reaches it, and how work goes to it once it can build), `calibration.md`
    (the checks on the reviewers), `orchestrating.md` (the orchestrator), `github-calls.md` (REST calls from a cloud
    session), `updates.md` (versions, Node, CodeQL) and `workshop-check.md` (the weekly check).
  - Taken only by projects that are games, read before a task changes a rule, a feature or how the computer players
    play: `game-design.md` (the design principles every game shares; core archive 80).

## How a project takes the core

1. **An exact copy under `core/`,** pinned to one commit of this repository, generated and never edited by hand. A
   change reaches a project only through a sync PR in that project, made by the core's `scripts/sync.mjs`, which moves
   the pin (and, where point 5 says, the workflow pins), is reviewed like any other PR, and changes nothing else; the
   core's `core.yml`, which the project calls on every PR (point 5) and the owner makes a required check, fails one
   whose `core/` differs from this repository at its pin.
2. **A manifest of its own,** `core-manifest.md` at its root (format below): the pin, the modules it takes, its names
   for the core's words, and what fills each slot. Every session reads it at the start, with `floor/security.md`.
3. **Pointer lines.** Its `AGENTS.md` names, as plain lines of their own (not in a table or a code block), the manifest
   and every file read at the start of every task: Claude Code imports them as `@` lines through `CLAUDE.md`, which
   imports `AGENTS.md` (and `core/modules/claude.md`); Codex, which follows no imports, reads them because `AGENTS.md`
   tells it to. `AGENTS.md` keeps its own "Review guidelines" section, which Codex's review reads, pointing to
   `core/modules/review-guidelines.md` and the project's own guidelines.
4. **Its own security files.** Its `SECURITY.md` says the floor's rules hold whole and adds, under the same numbers,
   what the floor leaves to it (the protected files, the trusted builder, its inputs, what ships, its audit), and points
   to "Reporting a weakness" in the floor, since GitHub shows a repository's `SECURITY.md`. Under rule 3 it lists its
   rule files after `**the rule files:**`, each path in backticks, the list ended by `;` ("this file" for itself), as
   the core's `scripts/rule-files.mjs` reads them for the copies check. Its threat model adds to the floor's
   (`floor/threat-model.md`).
5. **The shared scripts and workflows,** written once here. It runs the core's scripts (`scripts/`) from its `core/`
   copy: its `.claude/settings.json` runs `core/scripts/work-saved.sh` as its work-saved hook and
   `core/scripts/statusline.sh` as its status line, which `core/scripts/usage.sh` reads, each as merged into `main`
   (floor rule 3); its copies check is `core/scripts/copies.mjs` and its licence check `core/scripts/licences.mjs`, each
   run with a config of its own (named by the *copies check* slot and by its `SECURITY.md` under rule 10), protected
   like the checks. GitHub runs workflows only from a repository's own `.github/workflows/`, so the core's are reusable:
   its own `core.yml`, `personal-terms.yml`, `copies.yml`, `licences.yml`, `codeql.yml` and `delete-merged-branches.yml`
   each keep their triggers and call the core's of the same name in a job
   (`uses: HaakTuah/agent-core/.github/workflows/<name>.yml@<full commit SHA>`, floor rule 2), granting it the
   permissions the core's names and passing only the inputs and secret it declares. Issue templates and `.claude/` are
   read only from the repository itself, so they stay its own. Only a sync PR moves those pins, and only when one of the
   core's workflows changed since the last: then it moves them to its new pin, and needs the owner's yes, since it
   changes `.github/` (floor rule 3). `core.yml` also fails a call pinned where the called workflow differs from the one
   at the core pin; its `.github/dependabot.yml` ignores `HaakTuah/agent-core*`.
6. **What only it has** stays in its own rule files: what it is, its commands, its queue, its own standing rules, each
   file cut to that, with pointers into `core/`.

## Slots

The core says what every project says alike; where projects differ only in a name, a path or an example, it leaves a
**slot**, written in italics (*progress file*), and each project's manifest says what fills it. A path the core names
outright (such as `scripts/cloud-setup.sh` or `docs/calibration.md`) is where the projects keep it; a project
that keeps it elsewhere says so in its manifest. A task is a project's unit of work (an item, an entry); the main lane
is its queue of tasks taken in order.

| Slot | What the project fills in |
| --- | --- |
| *progress file* | the file that holds the queue and what is done |
| *report* | where a task's report, with its "Readings taken", goes |
| *archive citation* | how a rule file cites the project's archive |
| *settling references* | what the stand-in checks a question against, with the owner's past words, before it goes to him |
| *descriptions* | every place that describes what a change changes, for each kind of reader |
| *copies check* | the check on every PR that fails a new copy, and its config for the core's `scripts/copies.mjs` |
| *large file* | how large a file is before it is never read whole |
| *size marks* | the marks of the files every session reads |
| *one at a time* | what never runs as parallel lanes |
| *design-checked PRs* | which PRs get the design check besides the code review |
| *review reference* | what reviewers judge the work against besides the task's text |
| *planning design* | what planning design plans |
| *hard work* | what counts as the hard work |
| *measurements* | how a claim about behaviour is measured |
| *slop bar* | the bar for text users read, where the monthly slop check's finds are fixed, and any check of that text on every PR |
| *major version checks* | the extra checks a new major version gets |
| *Codex's checks* | what Codex runs before it finishes |
| *Codex environment* | whether a Codex cloud environment exists for the project |
| *computer players* | a game's players that no person plays (`game-design.md`) |
| *measured players* | the computer players whose use of a feature decides whether it is finished |
| *what they are shown* | what the computer players see of the game |
| *use-against-ignore measurement* | how players that use a feature where it fits are measured against copies that always and never use it |
| *where the numbers go* | where that measurement's numbers are shown |
| *where rules are taught* | where a player learns each rule |

## The manifest's format

```markdown
# Core manifest

Core: HaakTuah/agent-core at <full commit SHA>, copied whole under core/ (never edited here).
Paths: in the core's files, one into floor/, modules/, scripts/, setup/, archive/ or reports/ is under core/; any other is ours.
Floor: whole. Modules: <all, or the list of those taken>.

## Names
<the project's names for the core's words, one line each: a task, the main lane>

## Slots
| Slot | Here |
| --- | --- |
<one row per slot above, its value here; a slot left out means the project has no such thing>
```

## Setting up (the owner's part)

- Codex's GitHub app given the owner's repositories, its own Code Review set to automatic review off (core archive
  18).
- Its security review: Auto security review on, Review "Team PRs", Trigger "On PR open", reporting Medium and above. It
  reads the project's threat model with `floor/threat-model.md` as its threat model, and the project's `SECURITY.md`
  with the floor (`floor/security.md` and `floor/topics.md`) as its instructions. Under this trigger a request runs a
  code review alone; a security review comes with every request only under "Whenever code review runs" (core archive
  51).
- A Codex cloud environment for each project (the *Codex environment*), made in ChatGPT's Codex settings as a legacy
  environment: its setup script `bash scripts/cloud-setup.sh` (manual setup, the same as its maintenance script), and
  internet access limited to read-only methods.
- The machine where agents run side by side (floor rule 18): `setup/server.md`, read only when setting it up.

## This repository

How this repository takes its own core, and how changes are made here: `AGENTS.md`; its security: `SECURITY.md`.
