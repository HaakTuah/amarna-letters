# Who does what

The roles and escalation. Read when a task needs one.

- **The orchestrator:** the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions, the only ones that may change the protected files (floor rule 3). **Where
  Claude's sessions hand out work, another provider builds first** if the owner set it up for the project (floor rule
  18; core archive 122, 154, 158, 162 and 163): every task or part whose brief can say all it needs and whose result a
  check or its review can judge, each in its own working tree and PR. Claude's keep what no brief carries (a design
  reading, the owner's past words) and what the other cannot take or failed at twice. This bars no tool from work the
  owner gives it or Claude's cannot take.
- **One code review, by another provider than the builder's** (the *code reviewers*; core archive 18 and 154): unless
  the project names its order, Codex's of Claude's work and the fallback reviewer's, Claude's, of another's.
- **The design checker, the stand-in and planning design** are Claude's, at the models `modules/claude.md` gives:
  planning design is asked at most once per task, with a self-contained brief, when it needs a new or better plan.
- **Escalation** (core archive 25): what has beaten a builder twice may go to a fresh solver with a self-contained
  brief; the builder applies and checks the answer. The steps: `modules/claude.md`.