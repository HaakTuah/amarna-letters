# The owner's answers of 10 November 2026

His words: core archive 91 (and 92, 93, his earlier words behind the two new design principles).

- **An orchestrator may run on his own computer** (#16), though he prefers the cloud or a server. Floor rule 8 still
  lets nothing on his machine run or start an agent by itself (no poller, hook or schedule); the one exception is an
  orchestrator session he starts there himself, which keeps every floor rule, works in a folder of its own, away from
  his other files, and holds no key beyond its own sign-in. The design session added the folder and key limits, as the
  floor's own way of keeping that exception safe. `modules/orchestrating.md`, `modules/codex.md` and
  `modules/codex-building.md` say the same.
- **Two design principles, both held by both games** (#14), now in `modules/game-design.md` as two rules, not one:
  "Don't prohibit; give it its real cost" (player agency: a realistic action is never banned, its real cost makes it
  rare, and the rare exception stays possible) and "No solutions, only trade-offs" (no feature always right or always
  wrong to use, checked by the use-against-ignore measurement). For Amarna Letters the second's measurement, neither
  always nor never using a feature winning, is a new check, run as its own measurement already runs.
- **The sync PRs:** a change to the core is done only when the design session has opened a sync PR in every project
  that takes it (`AGENTS.md`; core archive 80).
