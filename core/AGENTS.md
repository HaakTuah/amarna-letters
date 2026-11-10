# agent-core

The shared core of the owner's agent-built projects: a floor every project takes whole and practice modules each
project picks (`README.md`). Codex: read `modules/codex.md` at the start of every task.

## The core this repository takes

The floor whole, and the modules that fit a repository of documents. Read whole at the start of every task (Claude Code
imports them):

@floor/security.md
@modules/how-to-work.md
@modules/inbox.md

Read when needed: `floor/topics.md`, `floor/threat-model.md`, `modules/roles.md`, `modules/helpers.md`,
`modules/reviews.md`, `modules/review-guidelines.md` and `modules/github-calls.md`. The rest describe work this
repository does not do (lanes, updates, the orchestrator), but for the rule-file audit below.

What fills the slots here: the *progress file* and the *report*: this repository's open PRs, and `reports/` (one file
per change, `<date>-<name>.md`); the archive is `archive/instructions.md`, cited "(core archive N)"; the *settling
references* and the *descriptions*: `README.md`; the *large file*: past about 50 KB; the *size marks*: about 20 KB for
each file a session reads at the start. No other slot applies.

## How changes are made here

- **A change goes on a branch of its own, with a draft PR into `main`, pushed after every commit.** A PR that changes
  a rule says, for each, what it changes in every project and why.
- **Every PR here changes rule files,** all protected (`floor/security.md`, rule 3), so each gets Codex's code review
  ("Codex reviews" in `modules/reviews.md`) and its security review. **A change to the floor or to `.github/` needs
  the owner's yes in its PR,** as does one to `modules/review-guidelines.md`, which changes only on his word.
- **The session that writes a change does not merge it:** the design session checks it against every project that takes
  the core, and merges it. A change is done only when a sync PR carries it in every project that takes the core: each
  project's orchestrator opens one on its next wake, and the design session checks it (core archive 80 and 124).
- **A rule moves here only when it holds in every project that takes the core,** and the owner's words behind it
  come with it into `archive/instructions.md`.
- **Never create a repository named `agent-rules`,** the core's old name: links to it redirect here (core archive 121).
- **The core names no project** outside its archive and its reports: it holds alike for every project.
- **The rule-file audit** (point 6 of `modules/workshop-check.md`) runs here, in a PR of its own, whenever more than
  about a fifth of the core's lines changed since the last audit.
- **Usage:** no status line runs here, so a session neither measures usage nor mentions it ("Usage" in
  `modules/claude.md`).

## Review guidelines

Every reviewer, Codex's code review included, reads `modules/review-guidelines.md` whole and judges the change by it,
with the floor (`floor/security.md` and `floor/topics.md`). Here, a rule that changes what any project must do without
saying so in the PR is a departure from the PR's description, and blocks.
