# Claude's part: models, effort and usage

Claude Code's model and effort for each role, and its usage. Read by Claude at the start of every task.

| Who | Model | Effort |
| --- | --- | --- |
| Builder | Opus for the main lane, design readings and the *hard work*; Sonnet for routine lanes (polish, docs, splits, tests) | high |
| Orchestrator | Sonnet | high |
| Search helper | Haiku | low |
| Parallel helper (`modules/helpers.md`) | Sonnet; Opus where it needs design judgement | medium; high for the hard work |
| Fallback reviewer, design check, stand-in | Opus | high |
| Planning design | Fable | high |
| Escalation, for a problem that beat a builder twice | Opus, then Fable | high, or xhigh if you run at high |

- **Pass both model and effort** whenever you start a session or helper (core archive 128): a left-out effort falls to
  the app's default, which may be higher. Never above high, but for escalation; never max. Name models by family alone,
  so the newest version runs (core archive 80 and 81).
- **Fable's usage runs out first:** it gets only planning design, the last escalation step and work the owner gives it
  by name, and only what needs judgement. If it is unavailable, its call goes to Opus at high; nothing waits for it.
- **Who to call** (core archive 70 and 71): a helper for judgement only when it ranks above you (models: Haiku, Sonnet,
  Opus, Fable; then effort; yours: your system prompt and `$CLAUDE_EFFORT`, unset meaning medium), else do it
  yourself; a fresh eye (reviewer, design check, stand-in) and a helper for cost (search, routine parts) whatever your
  level. A Sonnet builder hands what needs judgement to Opus at high, and its PR's
  first line says Sonnet built it (core archive 73).
- **Usage: Claude keeps the owner's share** (floor rule 16; core archive 1, 2, 14 and 76). Work continuously. From about
  85% of the week no new side lane opens; from about 90%, only small things in the main lane, the bigger work brought to
  a clean commit and a draft PR saying what is left. Measure it with the core's `scripts/usage.sh` at the start and
  after every commit; where it cannot read it, check no more and say nothing about it.
