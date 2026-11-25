- **How behaviour is tested:** the core's tests, the upgrade test, and the staged cases (`scripts/staged.mjs` and
  `scripts/staged/`, 1,531 lines, and `scripts/staged-tools.json`, the tools they are run under), which give a fresh
  session a task and read what it did. *Runs:* any session; the staged cases in a session, each a helper started by its
  own tool. *Else:* for the staged cases, Inspect AI (MIT, with agents for Claude Code and Codex) and Harbor
  (Terminal-Bench's harness), kept; promptfoo, dropped on an assumption that the challenge measured wrong, and so agreed
  for the trial: since its maker's sale on 9 March 2026 it has published 28 releases (66 in the seven months before),
  and its newest, 0.125.1 of 25 October 2026, still names Claude's agent SDK and Codex's among its packages; its upkeep
  slowed and goes on. Claude Code's own `claude plugin eval`, found by the challenge, runs a skill's cases with it and
  without it and scores the difference, on the session's own sign-in; dropped as the harness on fact: Claude Code's
  alone. *Bugs:* 3 naming `staged.mjs`. **Try** a harness under the cases, the cases staying the core's; what decides is
  whether it runs where a session runs, with no container and on the session's own sign-in rather than a paid key, both
  unmeasured.
