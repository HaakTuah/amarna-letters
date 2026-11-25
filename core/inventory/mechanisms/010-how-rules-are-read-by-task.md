- **How rules are read by task** (`scripts/reading.mjs`): prints what a role reads at its start and what a task's issue
  and paths call for. *Runs:* any session. *Else:* the open format for agent skills (`SKILL.md`), which most agent tools
  load by themselves; whether Kiro does was not found. Found by the challenge: each tool's own rule files for paths
  (Claude Code's `.claude/rules/` with `paths`, Copilot's `.github/instructions/` with `applyTo`, Kiro's steering files,
  whose matching by path was not confirmed), which load a file's rules when a session reads a path they name, as
  `reading.mjs` does for a pull request's changed paths, but each in its own form; and `claude plugin eval`, which reads
  whether Claude Code loads a skill by itself, half of point 8's trial for one tool. Both agreed for the trial.
  *Bugs:* 1. **Try**, as #534's point 8 sets out: one or two task modules laid out as skills, each tool the core
  supports given a task that calls for one.
