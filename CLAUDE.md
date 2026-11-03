# Claude's part

Every process rule, for every role and whoever fills it, is in `AGENTS.md`, imported here, and the shared docs it
names; this file adds only what is Claude Code's own: its models and effort for each role, its helpers and their
limits, and its tools. Who fills each role today: `docs/claude-and-codex.md`, "Who does what".

@AGENTS.md

## Models, effort and helpers

The same in both of the owner's games, except what each row names for its own game: the work the owner gives Fable by
name. What each role does, its brief and when it runs are in `docs/claude-and-codex.md` ("Who does what", "Codex
reviews" and "Reviews", point 7, "The briefs"); this table gives only the model and effort.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium, as the orchestrator starts you; the hard work ("Who does what") goes to helpers at high effort inside your session | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files, the cheap way to look across them instead of reading large files yourself; it returns file:line and one-line conclusions |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium; high (`effort: "high"`) for the hard work | one part of the work with a shape from "Helpers: when they pay" below, with a narrow brief and its own files |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`) | high | the fallback reviewer, for the code review and the security review, and the blind re-review |
| Design check | Fable (`model: "fable"`, `effort: "medium"`) | medium | the design checker: the strongest fresh eye where misses cost most, in one short call. If Fable is out of usage or unavailable, or the owner says its share for the week is spent, the same call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable |
| Planning design | Fable (`model: "fable"`, `effort: "high"`) | high | planning design; you build and measure what it returns with Opus. If Fable is out of usage or unavailable, or the owner says its share for the week is spent, the same call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | the escalation step, when Codex is unavailable or has failed at it too (Codex comes first once it can build) |
| Last escalation | Fable (`model: "fable"`, `effort: "high"`) | high | a problem the escalation step could not solve either, such as the script kings' planning, with the same brief. Otherwise Fable only for the design check, planning design and work the owner gives it by name, since its usage runs out first |

**Helpers: when they pay** (`docs/archive/instructions.md`, item 134). A helper starts cold,
rereads what it needs and returns only a summary, so it is worth its cost only when the work has one of these shapes:

- *Parallel and independent:* parts that touch different files and need nothing from each other.
- *Competing approaches, judged by measurement:* several candidate fixes for one problem, each tried in its own
  worktree and measured the same way (benchmarks, use against ignore); the best is kept, the rest dropped.
- *Bulk to brief:* many files read to answer one narrow question; the helper returns file:line and a sentence, so your
  context stays clean.
- *Fresh eyes:* a review, or a problem that has beaten you twice.

It does not pay for small or one-pass work (docs, config, small fixes), for steps that depend on each other, when
briefing it would cost most of the work, or for waiting on a run. Give each helper the cheapest model that does its part
well (the table above), a narrow brief and its own files, and check every result before you use it. At most four at a
time, reviewers included; each lane's builder keeps its own four. The PR lists the helpers that ran and what each gave,
so the rule can be checked against its cost. Never stop to ask about helpers: decide by these shapes.

- **No workflows and no ultracode** (model-game simulations excepted: "Helpers, effort and escalation" in
  `AGENTS.md`). Long runs go in the background with the Bash tool's background mode ("Print little" in `AGENTS.md`).
- **Effort is set when the session starts** and you can't raise your own, but you can give a helper more. The hard work
  goes to helpers at `effort: "high"` inside your session, above all the competing approaches of the hardest problems,
  never to a wait for a session at higher effort; then the escalation chain if a problem beats you twice. If the last
  escalation fails too, or Fable is out of usage or unavailable for it, the problem is blocked as "Don't loop" in
  `AGENTS.md` says; say in your update that it is blocked.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
- **Claude's cloud sessions can't use GitHub's GraphQL API,** so `gh pr create`, `gh pr list`, `gh pr view` and `gh pr ready` fail
  there: use the REST calls in `docs/developing.md`, its route for marking a draft ready included.
