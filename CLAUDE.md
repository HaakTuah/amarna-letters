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
| You, the builder | Opus for the item lane, engine rules, design readings and the hard work; Sonnet (`model: "sonnet"`) for routine lanes: polish, docs, splits, tests, news lines | the model and effort you were started at, read against this table (below it) | the item itself |
| Orchestrator | Sonnet if it can set the model of each session it starts; Opus if its sessions take its own | medium | starting each lane at its model, watching PRs, merging at the gates |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files, the cheap way to look across them instead of reading large files yourself; it returns file:line and one-line conclusions |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium; high (`effort: "high"`) for the hard work | one part of the work with a shape from "Helpers: when they pay" ("Who does what"), briefed as it says |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`) | high | the fallback reviewer, for the code review and the security review, and the blind re-review |
| Design check | Opus (`model: "opus"`, `effort: "high"`) | high | the design checker: a fresh eye where misses cost most, in one short call. Not Fable, which drains the week's usage far faster and is kept for the rare calls below (archive item 221) |
| Planning design | Fable (`model: "fable"`, `effort: "high"`) | high | planning design; you build and measure what it returns with Opus. (Fable's fallback: below the table) |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high or above) | high or extra high | the escalation step, when Codex is unavailable or has failed at it too (Codex comes first once it can build) |
| Last escalation | Fable (`model: "fable"`, `effort: "high"`) | high | a problem the escalation step could not solve either, with the same brief. Otherwise Fable only for planning design and work the owner gives it by name, since its usage runs out first |

**Fable's fallback:** if Fable is out of usage or unavailable, or the owner says its share for the week is spent, its
call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable.

- **No agent workflows and no ultracode** (model-game simulations excepted: "Helpers, effort and escalation" in
  `AGENTS.md`). Long runs go in the background with the Bash tool's background mode ("Print little" in `AGENTS.md`).
- **Read this table against yourself** (archive items 227 and 228). Your model is named in your system prompt, your
  effort is in `$CLAUDE_EFFORT` (unset: take it as medium), and a session another session starts takes its model and
  effort, whatever they are. Models rank Haiku, Sonnet, Opus, Fable; efforts low, medium, high, xhigh. A helper is
  above you when its model ranks higher, or its model is yours and its effort higher. A helper for judgement (the hard
  work, which needs Opus at high; planning design; a part that needs design judgement) is called only when it is above
  you: otherwise you do that work yourself, since such a helper adds only a cold start. A helper for a fresh eye on
  finished work (the reviewer, the design check) is used whatever your level, since its worth is that it did not write
  the work. An escalation step is a fresh solver: one below your level is skipped, except the last, which runs at your
  level instead; one at your level still pays, for its fresh eye. A helper for cost (search, routine parts) is used
  whatever your level. You can't change your own model or effort; if you are not on Opus, say so in your first
  message. If a problem beats you twice, the escalation chain; if its last step fails too, or Fable is out of usage or
  unavailable for it, the problem is blocked as "Don't loop" in `AGENTS.md` says; say in your update that it is
  blocked.
- **Sonnet builds, Opus backs it** (archive item 238). A Sonnet builder hands what needs judgement to an Opus helper at high
  (above it, so the rule above calls it), and a lane that turns out to need it whole goes back to the orchestrator for
  an Opus builder; a problem that beats it twice escalates as for anyone, Opus then Fable. Its PR's first line says
  Sonnet built it, and it gets the design check whenever it changes behaviour, rules or text a player reads, besides
  the reviews every PR gets. The workshop check compares review rounds and usage per lane by model: a kind of lane
  where Sonnet needs more rounds to reach a 10 goes back to Opus.
- **A helper above you gets only what needs it,** Fable above all, since its usage runs out first: you do the work
  before it (finding, measuring, and a brief that points it only at what it must judge) and after it (building,
  testing, writing up), and it returns its design, answer or text and stops.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
- **GitHub from a cloud session:** the REST calls in `docs/developing.md`, which says why.
- **The work-saved hook** (`.claude/settings.json` runs `.claude/hooks/work-saved.sh` as merged into `develop`): a
  session starts with a report of anything uncommitted, unpushed or stashed, and a reply that would end with any of it
  gets one nudge to push it, or to say why it must stay ("Git and GitHub" in `AGENTS.md`). The hook runs at the end of
  every reply, not only of the session, so a builder pushes after each step.
