# Who does what

The roles, escalation and who merges. Read when a task needs one.

- **The orchestrator:** the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions, the only ones that may change the protected files (floor rule 3). **Codex
  builds only where the owner says it can** (core archive 122): a task it starts from a comment cannot push and runs at
  a light effort, so it gets no lane that way; where it runs beside Claude's sessions (floor rule 18) and he has said
  so, the project's own rules say how work goes to it. Even then, only a lane on a PR the *owner's account* opened
  reaches it, and a Codex PR that changes a protected file is never merged.
- **The code reviewer is the other company's model:** Claude's PRs get Codex's review, Codex's the fallback reviewer,
  Claude's (core archive 18).
- **The design checker, the stand-in and planning design** are Claude's, at the models `modules/claude.md` gives:
  planning design is asked at most once per task, with a self-contained brief, when it needs a new or better plan.
- **Escalation** (core archive 25): a problem that has beaten a builder twice goes to a fresh solver with a
  self-contained brief (the problem, what was tried, the files and lines); the builder applies and checks the answer.
  The steps: `modules/claude.md`. What is still unsolved is marked blocked, and the work goes on.
