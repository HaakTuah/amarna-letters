# Claude's part: models, effort and usage

Read by the tool `claude` at the start of every task.

Its map (`tasks/roles.md`, "The rules name tiers, never a model"; Anthropic's models, read on 18 November 2026):
strongest, Opus; middle, Sonnet, which builds bug fixes too; light, Haiku; scarce top, Fable, at xhigh for escalation's
last step if you run at high.

- **Pass both model and effort** to each session or helper you start, save a helper whose
  definition gives them: one of a type the project defines, or a plug-in's own (`codex:codex-rescue`). Never above high,
  but for escalation and the adviser (xhigh, as advice to whoever starts it); never max.
- **Name models by family alone.**
- **Fable's usage runs out first:** it takes only what needs judgement; where it is unavailable, its call goes to Opus
  at high.
- **Who to call:**
  - a helper for judgement only when it ranks above you (by tier, then effort; yours: your system prompt and
    `$CLAUDE_EFFORT`, unset: medium), else do it yourself;
  - a fresh eye (reviewer, stand-in, auditor) and a helper for cost (search, routine parts) whatever your level;
  - a Sonnet builder hands what needs judgement to Opus at high, and its PR's first line says Sonnet built it.
- **Who builds** is picked as `roles/orchestrator.md`, "The builders", says: Claude's usage, also the owner's, is saved
  for the orchestrator where Claude runs it.
- Asked for a review (`tasks/reviews.md`, point 1): *Side by side:* one fresh session a pull request, briefed; *Through a plug-in:*
  none known; *On the host:* none the core sets up.
