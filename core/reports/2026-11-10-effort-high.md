# One effort for every session: high

A game's orchestrator started a builder on Opus without passing an effort, since no rule named one; the builder ran at
extra effort, the app's default for a new Opus session. The orchestrator's session tool takes an effort, and a session
does not inherit its starter's, so the rule that every session runs at the orchestrator's effort (core archive 99) no
longer holds. The owner chose one effort for every session (core archive 128):

- **`modules/claude.md`:** builders run at high, Opus and Sonnet alike, and so does the orchestrator; whoever starts a
  session or a helper passes model and effort, since an effort left out falls to the app's default; never above high
  except the escalation step, which the table already lets run at extra where the stuck builder runs at high.
- **`modules/orchestrating.md`:** the line that gave builders high and Sonnet lanes medium only on the side-by-side
  machine now points to the table, which holds everywhere.

What changes in every project: every session an orchestrator starts gets an explicit effort of high.

Readings taken: none. Questions for the owner: none.
