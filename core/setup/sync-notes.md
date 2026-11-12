# What a sync asks of a project

Most changes to the core reach a project by the copy alone. An entry stands here when a project must change something
of its own for a change to hold: a row of its manifest, a line of a rule file, a workflow, an audit.
`core/scripts/sync.mjs` prints the entries a sync brings, and an orchestrator gives them a lane when this file gains
any (`core/modules/orchestrating.md`). Each is done in a PR of its own once the sync PR is merged (a pure sync holds the
copy alone: floor rule 8), or queued in the *progress file* where it is large; none waits for the owner beyond what
the floor names. One that changes a protected file (floor rule 3: a rule file, the manifest, a workflow, a check's
config or audit) is the trusted builder's, never a task given to another provider's. Each entry says how to tell it is done, so a project unsure
where it stands checks them all, and one already done asks nothing. Newest last, each on one line.

- **12 November 2026, builders named by role.** Done when `AGENTS.md` tells a builder of another provider to read `core/modules/other-builders.md` at the start of every task and gives `core/modules/codex.md` to no builder; the manifest's row for what such a builder runs before it finishes is named *other builders' checks* (a row *Codex's checks* is renamed); and the *size marks* and any other config name those files so.
- **12 November 2026, who reviews.** Done when the manifest fills *code reviewers* and *security reviewer* wherever the project's differ from the core's own (`core/README.md`, "Slots"; left out, the core's hold), and the project's own review guidelines call a finding blocking or not, never by one reviewer's priorities.
- **12 November 2026, the core has moved.** Done when a project whose orchestrator does not wake every day has a `core-moved.yml` of its own (`core/README.md`, "How a project takes the core", point 5).
- **12 November 2026, fetches on Windows and by .NET.** Done when the licence check passes: where it fails naming a workflow, a script or a JSON file that runs `dotnet tool install`, `choco`, `winget`, `nuget`, a PowerShell download or the like, that file is named in the "files" of the audit entry of what it fetches. A project whose packages are not npm's also files with the core, once, as an idea (`core/README.md`, "Reporting to the core"), which tool holds its packages to floor rule 10 and how it is run: the tool and its command, nothing of the project.
- **12 November 2026, the default branch.** Done when the `core` check passes: the default branch is `main`.
- **12 November 2026, another provider builds first.** Done when, where the owner set another provider up to build, the project's own rules say how a Claude session (an orchestrator, or a builder with parts to give) hands a task to it and sees to its reviews and merge, and the manifest fills *other builders' checks*; from then on Claude's sessions hand out by `core/modules/roles.md`, "The builders", and `core/modules/orchestrating.md`. It bars no tool from work the owner gives it himself.
- **12 November 2026, differences.** Done when no rule of the project's own replaces a module's unlisted: each such rule is dropped where the core's serves, or put to the owner as a line for the manifest's "Differences" (`core/README.md`, "How a project takes the core", point 7), which waits for his word while the module's holds.
- **12 November 2026, a slimmer copy.** Done when the manifest's "Paths:" line reads as `core/README.md`, "The manifest's format", gives it: the core's `reports/` is no longer under `core/`, since the copy leaves that folder in the core.
