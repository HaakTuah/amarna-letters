# Claude's part

Everything every builder follows, Claude and Codex alike, is in `AGENTS.md`, imported here; this file adds only what
Claude alone uses. Who builds what, and how the two hand work over and review each other: `docs/claude-and-codex.md`.

@AGENTS.md

## Models, effort and helpers

The same in both of Haakon's games; only the list of hard work differs.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium; high for the TypeScript conversion and the fix pass after it | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files; it returns file:line and one-line conclusions |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`; `"medium"` for the design check) | high; medium for the design check | Codex's PRs; Claude's when Codex is unavailable; and the design check with a score on its build-order items (not the polish and sound lanes' small fixes) (`docs/claude-and-codex.md`, "Codex reviews"): every item, once, before it is merged (the builder rules): give it the diff, the item's text and "The game in one page", nothing else; it checks the diff against that page first, and sends the work back until it meets it |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | one problem that has defeated you twice, when Codex is unavailable or has failed at it too (Codex comes first: `docs/claude-and-codex.md`): give it a self-contained brief (the problem, what you tried, the files and lines), then apply and check its answer yourself |

- **Never more than two helpers at a time,** and only these four uses. No workflows and no ultracode. No agent kept
  alive to wait for a run: long runs go in the background (the Bash tool's background mode).
- **Effort is set when the session starts** and you can't raise your own. If the escalation helper fails too, write the
  problem up in the PR and `docs/BUILD-PROGRESS.md` as blocked, go on with the next item, and say in your update that it needs a
  session at higher effort.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
