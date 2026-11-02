# Claude's part

Everything every builder follows, Claude and Codex alike, is in `AGENTS.md`, imported here; this file adds only what
Claude alone uses. Who builds what, and how the two hand work over and review each other: `docs/claude-and-codex.md`.

@AGENTS.md

## Models, effort and helpers

The same in both of Haakon's games; only the list of hard work differs.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium (high was for the TypeScript conversion and its fix pass, both done) | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files; it returns file:line and one-line conclusions |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium | one part of the work with a shape from "Helpers: when they pay" below, with a narrow brief and its own files |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`; `"medium"` for the design check) | high; medium for the design check | Codex's PRs; Claude's when Codex is unavailable; and the design check with a score on its build-order items (not the polish and sound lanes' small fixes) (`docs/claude-and-codex.md`, "Codex reviews"): every item, once, before it is merged (the builder rules): give it the diff, the item's text and "The game in one page", nothing else; it checks the diff against that page first, and sends the work back until it meets it |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | one problem that has defeated you twice, when Codex is unavailable or has failed at it too (Codex comes first: `docs/claude-and-codex.md`): give it a self-contained brief (the problem, what you tried, the files and lines), then apply and check its answer yourself |
| Last escalation | Fable (`model: "fable"`, `effort: "high"`) | high | a problem the escalation helper could not solve either, such as the script kings' planning: the same self-contained brief; apply and check its answer yourself. Never in the normal path, since Fable's usage runs out first |

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
so the rule can be checked against its cost. Never stop to ask about helpers: decide by these shapes. Helpers are a builder's: an orchestrator gives each lane a builder session instead (`docs/orchestrating.md`).

- **No workflows and no ultracode.** No agent kept alive to wait for a run: long runs go in the background (the Bash
  tool's background mode).
- **Effort is set when the session starts** and you can't raise your own. If the last escalation fails too, or Fable is
  out of usage or unavailable, write the problem up in the PR and `docs/BUILD-PROGRESS.md` as blocked, with its brief
  ready for a later session, go on with the next item, and say in your update that it needs a session at higher effort.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
