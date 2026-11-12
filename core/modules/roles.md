# Who does what

The roles, escalation and who merges. Read when a task needs one.

- **The orchestrator:** the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions, the only ones that may change the protected files (floor rule 3).
  **Another provider builds where the owner set it up for the project** (floor rule 18; core archive 122 and 154), by
  the project's own rules: first what a check proves right without judgement (a failing test, a measurement, a split
  proven unchanged), each task in a working tree and a PR of its own. The rest stays with Claude's.
- **One code review, by another provider than the builder's** (the *code reviewers*; core archive 18 and 154): unless
  the project names its order, Codex's of Claude's work and the fallback reviewer's, Claude's, of another's.
- **The design checker, the stand-in and planning design** are Claude's, at the models `modules/claude.md` gives:
  planning design is asked at most once per task, with a self-contained brief, when it needs a new or better plan.
- **Escalation** (core archive 25): a problem that has beaten a builder twice goes to a fresh solver with a
  self-contained brief (the problem, what was tried, the files and lines); the builder applies and checks the answer.
  The steps: `modules/claude.md`. What is still unsolved is marked blocked, and the work goes on.
