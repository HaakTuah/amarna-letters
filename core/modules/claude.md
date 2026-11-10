# Claude's part: models, effort and helpers

Claude Code's model and effort for each role, its helpers and their limits, and its usage. Read by Claude at the start
of every task. What each role does: `modules/roles.md`, `modules/reviews.md`, `modules/helpers.md`.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus for the main lane, design readings and the *hard work*; Sonnet (`model: "sonnet"`) for routine lanes: polish, docs, splits, tests | the model and effort you were started at, read against this table (below it) | the task itself |
| Orchestrator | Sonnet (`model: "sonnet"`) | high where every session it starts runs at its effort (core archive 99 and 100); medium where it can set each one's | starting each lane at its model, watching PRs, merging Codex's PRs |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium; high (`effort: "high"`) for the hard work | one part of the work, as `modules/helpers.md` says |
| Reviewer | Opus (`model: "opus"`) | high (`effort: "high"`) | the fallback reviewer (code and security review) and the blind re-review |
| Design check | Opus (`model: "opus"`) | high (`effort: "high"`) | the design checker, in one short call (core archive 66) |
| Stand-in | Opus (`model: "opus"`) | high (`effort: "high"`) | predicting the owner's answers (`modules/inbox.md`) |
| Planning design | Fable (`model: "fable"`) | high (`effort: "high"`) | planning design (`modules/roles.md`) |
| Escalation | Opus (`model: "opus"`) | high (`effort: "high"`), or `"xhigh"` if you already run at high or above | the escalation step (`modules/roles.md`) |
| Last escalation | Fable (`model: "fable"`) | high (`effort: "high"`) | a problem the escalation step could not solve, with the same brief. Otherwise Fable only for planning design and work the owner gives it by name, since its usage runs out first |

**Always the newest version** (core archive 80 and 81), so no session or helper ever runs on an old one by accident:
every model is named by its family alone, which takes the newest version of that family; no rule, brief or call names a
version number. The orchestrator starts every session on the newest version of its model, and a session started on an
older one says so in its first message.

**Fable's fallback:** if Fable is out of usage or unavailable, or the owner says its share for the week is spent, its
call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable.

- **Usage: Claude keeps the owner's share** (floor rule 16; core archive 1, 2, 14 and 76). Work continuously, task after
  task. **The brake:** from about 85% of it no new side lane opens, and open ones finish; from about 90%, no bigger
  task: finish the one at hand if nearly done, or bring it to a clean commit and a draft PR saying what is left; then
  only small things in the main lane, the *progress file* saying where you stopped. Only the measured share counts,
  never the app's warning. **Measure it** with the core's `scripts/usage.sh` at the start and, where it can read it,
  after every commit; where it cannot, the script says so: then check no more, and say nothing about it in any PR,
  report or message, since the owner watches and pauses the work at about 90%.
- **Read this table against yourself** (core archive 70 and 71). Your model is named in your system prompt, your effort
  is in `$CLAUDE_EFFORT` (unset: medium). A builder runs at the model the orchestrator gave it, and at the effort it
  gave it where it can set one, otherwise at its own; a helper runs at the model and effort its builder gave it (core
  archive 99). Models rank Haiku, Sonnet, Opus, Fable; efforts low, medium, high, xhigh. A helper is above you when its
  model ranks higher, or its model is yours and its effort higher. A helper for judgement (the hard work, planning
  design, a part that needs design judgement) is called only when it is above you: otherwise you do that work yourself,
  since such a helper adds only a cold start. A helper for a fresh eye on finished work (the reviewer, the design check)
  is used whatever your level, since its worth is that it did not write the work; so is the stand-in, which reads the
  owner's past words the builder does not. An escalation step is a fresh solver: one below your level is skipped, except
  the last, which runs at your level instead; one at your level still pays, for its fresh eye. A helper for cost
  (search, routine parts) is used whatever your level. You can't change your own model or effort; if you are not on the
  model this table gives your lane, say so in your first message.
- **Sonnet builds, Opus backs it** (core archive 73). A Sonnet builder hands what needs judgement to an Opus helper at
  high, and a lane that turns out to need it whole goes back to the orchestrator for an Opus builder. Its PR's first
  line says Sonnet built it, and it gets the design check whenever it changes behaviour, rules or text a user reads. A
  kind of lane where Sonnet needs more review rounds to reach a 10 (the workshop check's point 9) goes back to Opus.
- **A helper above you gets only what needs it,** Fable above all: you do the work before it (finding, measuring, and a
  brief that points it only at what it must judge) and after it (building, testing, writing up); it returns its design,
  answer or text and stops.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` in the call, and
  `effort` too when a builder starts a helper. Never max effort: it costs the most and tends to overthink.
