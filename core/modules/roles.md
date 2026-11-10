# Who does what

The roles, who fills each today, escalation and who merges; read when a task needs a role's part. A role can be filled
by any model, working from the project's `AGENTS.md`.

- **The orchestrator** (today: Claude): the session that starts builder sessions (`modules/orchestrating.md`).
- **The builders:** Claude's builder sessions, and, once it can build, Codex, started from a draft PR whose description
  is its brief (`modules/codex-building.md`). **The trusted builder,** whose lanes alone may change the protected files
  (`floor/security.md`, rule 3): Claude's builder sessions.
- **The code reviewer is the other company's model:** Claude's PRs get Codex's code review (`modules/reviews.md`);
  Codex's get **the fallback reviewer,** Claude's, which also takes Claude's PRs when Codex does not answer in time. It
  holds the picture of the finished project and sends the work back until it meets it (core archive 18).
- **The security reviewer:** Codex's automatic security review; its fallback, the fallback reviewer.
- **The design checker** (today: Claude): the scored design check on the *design-checked PRs*.
- **The stand-in** (today: Claude): predicts the owner's answers to a task's open questions (`modules/inbox.md`).
- **Planning design** (today: Claude): the *planning design*, asked directly when a task needs a new or better plan, at
  most once per task, with a self-contained brief (the problem, the measurements, the files and lines). It returns a
  design, which the builder builds and measures.
- **The hard work:** the *hard work*, done in the builder's own session, through a helper above it where its tool's file
  says one pays, never by waiting for another session.
- **Escalation** (core archive 25): a problem that has defeated a builder twice goes to a fresh solver with a
  self-contained brief (the problem, what was tried, the files and lines); the stuck builder applies and checks the
  answer. Once Codex can build it comes first: a problem that has defeated Claude goes to Codex as a draft PR from the
  stuck branch whose description is the brief, merged into it if it works. Otherwise, and for one that has defeated
  Codex, Claude's escalation step, then its last escalation (`modules/claude.md`). What is still unsolved is blocked
  ("Don't loop" in `modules/how-to-work.md`).
- **Who merges:** Claude's builders merge their own PRs (`modules/work-flow.md`, point 1). **Codex never merges:** the
  orchestrator merges its PRs.
