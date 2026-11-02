# Running builder sessions and lanes

For the orchestrator, the session that starts builder sessions. The builder's own part is "How work flows" in
`AGENTS.md`. The owner's words are in `docs/archive/instructions.md`, items 22 and 23.

**The orchestrator builds nothing itself** (the owner, 2 November 2026: "Why is the orchestrator doing things directly?", then "yes please, expertly!"). Every lane, the item or main lane included, goes to a builder session of its own, with its own brief, at the effort `CLAUDE.md` gives that work. Helpers belong to builders, never to the orchestrator: a lane is never a helper of the orchestrator's. The orchestrator keeps its own context small, for what only it does: claims, starting and handing over sessions, merging Codex's work, and the owner's questions word for word. A session it starts runs at its own effort, and it never waits for one at a higher effort: the builder gives the work marked high to helpers at high effort (`CLAUDE.md`, "Models, effort and helpers"). Only if it cannot start builder sessions at all does it say so and stop, and the owner starts them. Why: its context is re-read on every turn, so building in it costs the most; it runs at its own effort, not the work's; and if it dies, every lane stops with it.

The aim (the owner, 1 November 2026): "We should do whatever is most effective at acheivein the goal, which is
accomplishing them most possible, with the least tokens, without sacrifacing quality."

- **Keep the cache warm.** One session per item, continued for its review fixes and its milestone while its context
  is under an hour old, rather than a fresh session reading everything again. A new item goes to whichever session does
  the most work for the fewest tokens without losing quality: one already open, when the item touches the same files,
  its context is under an hour old and still small, and its last item has merged; otherwise a fresh session, and always
  one when a session's context has grown large.
- **Bigger review fixes in a session of their own.** If a review asks for more than about an hour's work, start a fresh
  session for it with the PR, the review and nothing else, at the builder's effort (medium; work marked high goes to its helpers); the builder goes on.
- **Hand over at once.** A builder's last message says what merged and what is next. Start the next session as soon as
  an item merges, woken by the PR's merge rather than a clock, with an hourly check as the fallback.
- **A lane for every independent entry you can see,** each a builder session with its own brief and check-in, by the
  rules of "How work flows" in `AGENTS.md`; no new side lane from about 85% of the weekly usage.
- **Questions go on word for word.** Pass every lane's "Questions for the owner" to the owner exactly as written, never summed
  up.
- **No turn sits idle.** Long runs and checks go in the background; nothing waits on a clock.
