# Claude's part

Everything every builder follows, Claude and Codex alike, is in `AGENTS.md`, imported here; this file adds only what
Claude alone uses. Who builds what, and how the two hand work over and review each other: `docs/claude-and-codex.md`.

@AGENTS.md

## Models, effort and helpers

The same in both of the owner's games, except what each row names for its own game: the hard work, what the reviews
cover, and the work the owner gives Fable by name.

| Who | Model | Effort | For |
| --- | --- | --- | --- |
| You, the builder | Opus | medium, as the orchestrator starts you; the work marked high (the TypeScript conversion and the fix pass after it) goes to helpers at high effort inside your session | the item itself |
| Search helper | Haiku (`model: "haiku"`) | as it comes | finding where things are across many files; it returns file:line and one-line conclusions |
| Parallel helper | Sonnet (`model: "sonnet"`) for routine parts; Opus (`model: "opus"`) for parts that need design judgement | medium; high (`effort: "high"`) for the work the builder's row marks high | one part of the work with a shape from "Helpers: when they pay" below, with a narrow brief and its own files |
| Reviewer | Opus (`model: "opus"`, `effort: "high"`) | high | Codex's PRs, and Claude's when Codex is unavailable (`docs/claude-and-codex.md`, "Codex reviews", points 2 and 3). Give it the diff, the item's text, "The game in one page", the definition of a 10 word for word ("Reviews" in `docs/claude-and-codex.md`, point 1) and the "History holds", "Hidden information", "Text a player reads" and "One idea, for every reviewer" lines of "Review guidelines" in `AGENTS.md`, and nothing more |
| Design check | Fable (`model: "fable"`, `effort: "medium"`) | medium | the design check with a score on its build-order items (not the polish and sound lanes' small fixes): every item, once, before it is merged (the builder rules): give it the Reviewer's brief above and, when the item adds or changes real-world content, the dossier passages it cites, and nothing more; it checks the diff against that page first, and sends the work back until it meets it. The strongest fresh eye where misses cost most, in one short call. If Fable is out of usage or unavailable, or the owner says its share for the week is spent, the same call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable |
| Planning design | Fable (`model: "fable"`, `effort: "high"`) | high | the script kings' planning, asked directly when the item needs a new or better plan, at most once per item: a self-contained brief (the problem, the measurements, the files and lines); it returns a design, which you build and measure with Opus. If Fable is out of usage or unavailable, or the owner says its share for the week is spent, the same call goes to Opus (`model: "opus"`, `effort: "high"`); nothing ever waits for Fable |
| Escalation | Opus (`model: "opus"`, `effort: "high"`, or `"xhigh"` if you already run at high) | high or extra high | one problem that has defeated you twice, when Codex is unavailable or has failed at it too (Codex comes first once it can build: `docs/claude-and-codex.md`): give it a self-contained brief (the problem, what you tried, the files and lines), then apply and check its answer yourself |
| Last escalation | Fable (`model: "fable"`, `effort: "high"`) | high | a problem the escalation helper could not solve either, such as the script kings' planning: the same self-contained brief; apply and check its answer yourself. Otherwise Fable only for the design check, the planning design above and work the owner gives it by name, since its usage runs out first |

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

- **No workflows and no ultracode** (model-game simulations are the one exception: "How to work" in `AGENTS.md`, "Helpers, effort and escalation"). No agent kept alive to wait for a run: long runs go in the background (the Bash
  tool's background mode).
- **Effort is set when the session starts** and you can't raise your own, but you can give a helper more. Work the table marks high goes to helpers at `effort: "high"` inside your session, above all the competing approaches of the hardest problems, never to a wait for a session at higher effort; then the escalation chain if a problem beats you twice. If the last escalation fails too, or Fable is
  out of usage or unavailable for it, write the problem up in the PR and `docs/BUILD-PROGRESS.md` as blocked, with its brief
  ready for a later session, go on with the next item, and say in your update that it is blocked.
- Sessions started from a Claude Code Project don't load `.claude/agents/`, so always pass `model` (and `effort`) in
  the call. Never max effort: it costs the most and tends to overthink.
