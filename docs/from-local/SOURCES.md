# Copied from the local computer (26 October 2026)

Everything this project relied on outside git on Haakon's Windows computer, before work moved to Claude Code cloud
sessions. Each file is copied word for word from the source named here; nothing is restructured. Secrets and personal
material are left out and listed by name only.

## Copied

| File here | Source on the computer | What it holds |
|---|---|---|
| `claude-project-memory/MEMORY.md` | `~/.claude/projects/C--Users-Perry-source-repos-amarna-letters/memory/MEMORY.md` | Index of Claude's project memory, one line per note |
| `claude-project-memory/round-workflow-rules.md` | same folder | How a round is run: prompt saved word for word, branch and PR flow, frozen balance |
| `claude-project-memory/build-order.md` | same folder | Following the design document's Build order, the builder rules, PRs at milepoints, the one-PR merge exception |
| `claude-project-memory/stop-rules-never-overridden.md` | same folder | A failing safety check stops that step; failing tests never stop the build |
| `claude-project-memory/no-messaging-workflow-agents.md` | same folder | Never message a running workflow's agents |
| `claude-project-memory/usage-lean-by-default.md` | same folder | Haakon's "How to work" rules on effort and agent counts |
| `claude-project-memory/project-folders-separate.md` | same folder | Never write this project's notes into another project's folders |
| `claude-project-memory/after-26-oct-cheaper-dev-and-previews.md` | same folder | Pointer to the docs and preview pass (`docs/prompts/DOCS-AND-PREVIEW.md`) |
| `claude-project-memory/conversion-plan.md` | same folder | Pointer to the TypeScript conversion plan (`docs/CONVERSION-PLAN.md`) |
| `claude-project-memory/owner-message-log.md` | same folder | What the owner's message log is and how it was kept (the log itself is not copied, see below) |
| `claude-project-memory/rebuild-owner-log.js` | same folder | Script that rebuilt that log from the local Claude Code session files |
| `repo-claude-settings.local.json` | `.claude/settings.local.json` in the repo (git-ignored through `.git/info/exclude`) | Two hooks, on every prompt and at every stop, that ran `rebuild-owner-log.js` from its local path |
| `sim-runs/seed-7/game-7.jsonl` | `sim/runs/seed-7/game-7.jsonl` (git-ignored) | Game log of the second agent simulation, seed 7: model kings and model characters, every recorded reply |
| `sim-runs/seed-15/game-15.jsonl` | `sim/runs/seed-15/game-15.jsonl` (git-ignored) | The same for seed 15 |
| `sim-runs/first-simulation/sleep-on/game-7.jsonl` | `sim/runs/first-simulation/sleep-on/game-7.jsonl` (git-ignored) | Game log of the first agent simulation, sleep on: model kings, script characters |

The three game logs are the recorded model games that `docs/CONVERSION-PLAN.md` needs for its lenient parity check.
Before copying they were checked for API keys, e-mail addresses, local paths and the isolation test's canary words, and
none were found. The conversion moves them into `tests/fixtures/`.

## Left out, by name only

- `~/.claude/.credentials.json`: Claude Code's sign-in credentials (secret).
- `~/.claude.json` and `~/.claude/.claude.json`: account, machine and usage state for every project. This repo's
  entries hold only folder-trust flags and an empty tool allowlist, and no MCP servers are configured there.
- `~/.claude/settings.json`: two app preferences (a workflow usage warning and push notifications), nothing for this
  project.
- `owner-messages-log.md` (project memory, 87 KB): every message Haakon typed in this project, word for word. It has
  personal remarks in it. The decisions in it are already in the repo: the round prompts, `docs/BUILD-PROGRESS.md`,
  `docs/CONVERSION-PLAN.md` and `docs/prompts/DOCS-AND-PREVIEW.md`.
- `sim/kings/`, `sim/characters/`, the `canaries.json` files and `.claude/agents/king-*.md`, `char-*.md`: the last
  setup's unguessable folder names and canary words (secrets of the isolation test). `sim/setup.js` makes them anew for
  every run.
- The other runs in `sim/runs/` (about 64 MB in all), left out to keep the set small:
  - the first simulation's sleep-off game, clean like the three copied
  - the `stub-*` runs, games with stand-in repliers that replay from their seeds
  - the `setup-*` folders, which hold folder names and canaries

There are no user-level `CLAUDE.md`, agents, skills or commands, no MCP servers added with `claude mcp add`, no
scheduled tasks in the desktop app, and no `.env` file.
