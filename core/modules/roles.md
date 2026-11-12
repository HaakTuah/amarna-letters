# Who does what

Read when a task needs one.

- **The orchestrator:** the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions, the only ones that may change the protected files (floor rule 3). **Where
  Claude's sessions hand out work, another provider builds first** by the first way there is (core archive 122, 154,
  158, 162, 163 and 169): the tool that runs the agents side by side (floor rule 18), else a plug-in in Claude Code,
  else a way the project names, as its part says (`modules/codex.md` or the project's); with none, Claude's build. It
  takes every task or part whose brief can say all it needs and whose result a check or its review can judge, each in
  its own working tree and PR, whose first line names its builder; its briefer drops work whose diff holds a protected
  file, before pushing it or, where its builder pushed, before marking its PR ready. Claude's keep what no brief carries
  (a design reading, the owner's past words) and what the other cannot take or failed at twice. This bars no tool from
  work the owner gives it or Claude's cannot take.
- **One code review, by another provider than the builder's where one answers** (the *code reviewers*; core archive 18
  and 154): unless the project names its order, Codex's, then Copilot's where the repository has it, last the fallback
  reviewer's, Claude's.
- **The design checker, the stand-in and planning design** are Claude's, at the models `modules/claude.md` gives:
  planning design is asked at most once per task, with a self-contained brief, when it needs a new or better plan.
- **Escalation** (core archive 25): what has beaten a builder twice may go to a fresh solver with a self-contained
  brief; the builder applies and checks the answer. The steps: `modules/claude.md`.