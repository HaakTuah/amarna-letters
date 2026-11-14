# Who does what

Read when a task needs one.

- **The orchestrator:** the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions (floor rule 3). **Where Claude's sessions hand out work, another provider
  builds first** by the first way there is (core archive 122, 154, 158, 162, 163, 169): the tool that runs the agents
  side by side (floor rule 18), else a plug-in in Claude Code, else a way the project names, as its part says
  (`modules/codex.md` or the project's); with none, Claude's build.
  - Where more than one can build, the project's order holds (its *other builders*), Codex first where it names none,
    and a task one failed at twice (its closed PRs and the *progress file* say) goes to the next, from `main`.
  - Each takes every task or part whose brief can say all it needs and whose result a check or its review can judge,
    each in its own working tree and PR, whose first line names its builder.
  - Its briefer drops work whose diff holds a protected file, before running or pushing it or, where its builder
    pushed, before marking its PR ready.
  - Claude's keep what no brief carries (a design reading, the owner's past words) and what none of them can take or
    each failed at twice.
  - This bars no tool from work the owner gives it or Claude's cannot take.
- **One code review, by another provider than the builder's where one answers** (the *code reviewers*; core archive 18,
  154, 175): unless the project names its order, first one that cannot build here (Codex's before Copilot's, where
  neither builds), then a builder's, last the fallback reviewer's, Claude's.
- **The design checker, the stand-in and planning design** are Claude's: planning design is asked at most once per task
  (its PR says when it was), with a self-contained brief, when it needs a new or better plan.
- **Escalation** (core archive 25): what has beaten a builder twice may go to a fresh solver with a self-contained
  brief; the builder applies and checks the answer.