# Claude's part

Every process rule, for every role and whoever fills it, is in `AGENTS.md` and the builder rules, both imported here,
and the shared docs they name; this file adds only what is Claude Code's own: its models and effort for each role, its
helpers and their limits, and its tools. Who fills each role today: `docs/claude-and-codex.md`, "Who does what".

@AGENTS.md
@docs/builder-rules.md

## Models, effort and helpers

The same in both of the owner's games, except for each game's own names, examples and archive pointers. What each role
does, its brief and when it runs are in `docs/claude-and-codex.md` ("Who does what", "Codex
reviews" and "Reviews", point 7, "The briefs"); this table gives only the model and effort.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium, as the orchestrator starts you; the hard work ("Who does what") goes to helpers at high effort inside your session | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files, the cheap way to look across them instead of reading large files yourself; it returns file:line and one-line conclusions |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium; high (`effort: "high"`) for the hard work | one part of the work with a shape from "Helpers: when they pay" ("Who does what"), briefed as it says |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`) | high | the fallback reviewer, for the code review and the security review, and the blind re-review |
| Design check | Opus (`model: "opus"`, `effort: "high"`) | high | the design checker: a fresh eye where misses cost most, in one short call. Not Fable, which drains the week's usage far faster and is kept for the rare calls below (archive item 221) |
| Planning design | Fable (`model: "fable"`, `effort: "high"`) | high | planning design; you build and measure what it returns with Opus. (Fable's fallback: below the table) |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | the escalation step, when Codex is unavailable or has failed at it too (Codex comes first once it can build) |
| Last escalation | Fable (`model: "fable"`, `effort: "high"`) | high | a problem the escalation step could not solve either, with the same brief. Otherwise Fable only for planning design and work the owner gives it by name, since its usage runs out first |

**Fable's fallback:** if Fable is out of usage or unavailable, or the owner says its share for the week is spent, its
call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable.

- **No agent workflows and no ultracode** (model-game simulations excepted: "Helpers, effort and escalation" in
  `AGENTS.md`). Long runs go in the background with the Bash tool's background mode ("Print little" in `AGENTS.md`).
- **Effort is set when the session starts** and you can't raise your own, but you can give a helper more. The hard work
  ("Who does what" in `docs/claude-and-codex.md`) goes to helpers at `effort: "high"` inside your session;
  then the escalation chain if a problem beats you twice. If the last
  escalation fails too, or Fable is out of usage or unavailable for it, the problem is blocked as "Don't loop" in
  `AGENTS.md` says; say in your update that it is blocked.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
- **GitHub from a cloud session:** the REST calls in `docs/developing.md`, which says why.
- **The work-saved hook** (`.claude/settings.json` runs `.claude/hooks/work-saved.sh` as merged into `develop`): a
  session starts with a report of anything uncommitted, unpushed or stashed, and a reply that would end with any of it
  gets one nudge to push it, or to say why it must stay ("Git and GitHub" in `AGENTS.md`). The hook runs at the end of
  every reply, not only of the session, so a builder pushes after each step.
