# Helpers: when they pay

When a builder starts helpers (Claude's, and Codex's subagents once it builds), how many, and how to brief them, however
they are started: one at a time, or many by a workflow, which is welcome where it does a shape below within the cap
(core archive 126). Read before starting one.

A helper starts cold, rereads what it needs and returns only a summary, so it pays only for work of one of these shapes
(core archive 25):

- **Parallel and independent:** about three parts or more that touch different files and need nothing from each other,
  a helper each. Helpers that write run in parallel only when their briefs fix every choice their parts share (tests,
  interfaces, names, formats); otherwise one writer does it, since parallel writers make choices the others never see,
  and their work clashes (core archive 60).
- **Competing approaches, judged by measurement:** two to four candidate fixes for one problem, each in its own
  worktree, measured the same way (the *measurements*); the best kept, the rest dropped.
- **Bulk to brief:** about ten files or more read to answer one narrow question: a search helper per question or area,
  returning file:line and a sentence, so the builder's context stays clean.
- **Fresh eyes:** a review or an escalation step, one fresh helper each.

Not for one-pass work, steps that depend on each other, a brief that would cost most of the work, or waiting on a run.
**How many:** one per part, candidate or question, at most five at a time, reviewers included; a wider sweep in waves of
five; each lane's builder keeps its own five (core archive 61). Each helper gets the cheapest model that does its part
well and a brief that stands alone: its goal; what it returns, in what form (file:line and a sentence, a diff in its
worktree, a measured table); the files it may change and the sources it reads; where its task ends. A vague brief brings
back duplicated work and gaps. Check every result before using it.

**Measured:** every PR lists the helpers that ran and what each gave (the workshop check's point 8); a shape that
never pays, or a cap that often holds work back, becomes a `question` issue for the owner.
