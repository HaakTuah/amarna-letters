# Claude and Codex

Decided 1 November 2026 (`docs/archive/instructions.md`, item 123). Two builders spread the weekly usage, Claude on Haakon's Claude plan and Codex
(OpenAI's) on ChatGPT Pro, and review each other: different models have different blind spots. This file is the whole
arrangement; `AGENTS.md` points here, and nothing here is repeated there.

## Who does what

- **The orchestrator is Claude, always:** it writes the briefs, routes the work, takes the readings, gives the
  reviews' verdicts, merges, and brings Haakon his questions.
- **The builders:** Claude's builder sessions, and Codex in OpenAI's cloud, started by an `@codex` comment on GitHub.
- **The reviewer is the other company's model.** Codex's PRs get Claude's reviewer (Opus, high effort), given
  the diff, the item's text and "The game in one page": it holds the picture of the finished game and sends the work back until it meets it. Claude's PRs
  that change the game get `@codex review` (Codex's automatic review is off, so it reviews only when asked). When
  Codex is unavailable, Claude's reviewer takes both, as before.
- **Escalation goes to the other model first:** a problem that has defeated Claude twice goes to Codex as a
  self-contained `@codex` comment (the problem, what was tried, the files and lines); one that has defeated Codex goes to
  Claude's escalation helper. Either way the orchestrator checks the answer.
- **Only the orchestrator merges.** Codex never merges, never touches `main`, and never pushes to a branch it was not
  given.

## What goes to Codex

**Route by how the result can be checked.** If tests, replays and the benchmarks or a measurement can prove the work right, Codex builds
it, and a wrong result shows itself; if only judgment can (taste, the design, the sources), Claude does.

- **Claude keeps the decisions and hands them over as tests that fail.** Codex makes them pass without changing them;
  if it thinks one is wrong, it says so on the thread instead of rewriting it.
- **Hand off only when the implementation is clearly bigger than its brief and review:** many files, a few hundred
  lines or more, or long measuring runs. Smaller work Claude does itself. The PR says which was chosen and why.

| Claude decides and builds | Codex builds |
| --- | --- |
| Each build-order item's rules, numbers and the tests that pin them down | The polish lane: interface, layout, the Music page, keys |
| The fix passes and the balance pass (item 18) | Tests in the smallest setup, and splitting test files |
| The script kings' strategy: what should change and why | Splitting files over 50 KB, proven unchanged by replays |
| Music: the compositions themselves | Scripts and tooling, CI speed, the workshop check's fixes |
| The soundscape's rules: layers, levels, the fog rule, as tests | Performance work with a measured target |
| Anything resting on the sources: kings' traits, names, the dossiers | What Claude has specified as tests: an item's implementation, wiring, save version and replays; the music and soundscape wiring; traits and names entered into the data; benchmark runs and their tables |
| The rulebook, seat view and request texts ("Requests are rules too") | Docs that record what is decided |

Whole with Claude, since there the code is the hard part and a brief cannot hold the decisions: the engine's
determinism, and the orchestrator's own work (briefs, routing, readings, reviews' verdicts, merges).

Items stay one at a time, in order, as the builder rules say: a Codex lane runs beside an item, never inside the same
files. **Trials:** in the first week, one art task to Codex if one comes up, compared against Claude's; after the first
week, one build-order item split the long way (Claude writes the rule and its tests, Codex implements, Claude
reviews), and if it scores well, more items follow.

## Handing work to Codex

1. **Claim the lane** as usual (the item's branch, or a polish-lane draft PR); for a Codex lane the claim may instead be an issue, which counts as a
   claimed lane until Codex's PR closes it.
2. **Comment `@codex` with the brief.** Codex starts fresh each time: it sees only the thread and the repository, so
   the brief stands alone: the item, the sections and files to read (paths), the tests it must pass, what not to
   touch, and what its PR must say (the first lines "AGENTS.md" asks for, "Readings taken", "Questions for Haakon").
3. **Questions go on the thread,** both ways, each comment standing alone (no "as discussed"). At most **two rounds**
   per question; then the orchestrator takes the most reasonable reading and writes it under "Readings taken".
   Whatever only Haakon can settle goes to "Questions for Haakon" and the "For Haakon" table in `docs/BUILD-PROGRESS.md`, as always.
4. **Codex's PR** is reviewed as below, sent back with `@codex` and the review's list, and merged by the orchestrator.

## When Codex is not there

Codex's usage can run out, and it may say so only through its bot or not at all, so the orchestrator never waits on
it for long. Codex's bot answers an `@codex` comment within seconds (seen 1 November 2026), so:

- **An answer from the bot that is not a start** (no environment, no usage left, any error) **is a take-back at once.**
- **No sign within about 5 minutes** that Codex has started (a reply, a reaction, a branch), **or no PR within about
  2 hours:** take the lane back. Five minutes leaves room for GitHub's own delays; two hours, for the suites and a
  round of fixes.
- **Taking back:** write "Taken back by Claude" on the thread, with the reason, and give the lane to a Claude builder.
- **A Codex PR that arrives after that is closed unmerged,** so the same work never lands twice.
- **After a take-back for no usage, an error or silence, Codex counts as unavailable:** hand it nothing until a small
  test task gets through, tried at most every few hours. Meanwhile the work is Claude's alone, as before Codex came.
  A take-back for a slow PR alone does not count: the next lane still goes to Codex.
- The times were set from the first test (1 November 2026): adjust them from what the first weeks show, and say so
  here.

## Reviews: a score, and what keeps it from 10

Every review, in either direction:

1. **Gives a score from 1 to 10 and lists everything that keeps the work from 10,** each point concrete (a file and
   line, or a design section) and marked **blocking** (against the design, the item's text, its tests or the standing
   rules) or **not blocking**.
2. **Sends the work back while any point blocks.** When none does, it merges; the points that do not block go into the
   PR as a note, or into `docs/BUILD-PROGRESS.md` as a small follow-up entry.
3. **At most three rounds.** Then the orchestrator decides, or escalates to the other model, and writes why.
4. **One line in each PR:** `Review: <category> · <builder> · <score each round>`, such as
   `Review: interface · Codex · 7, 9`. At each milestone the orchestrator sums them by category and builder in the
   milestone PR: a category where Codex scores lower moves back to Claude, one where it does well gets more.

## For Codex

- `AGENTS.md` applies to you in full, except Claude's helpers, models and effort. Read
  `.claude/rules/builder-rules.md` at the start of every task: the rules for every builder, from the design document.
- Build only what the `@codex` comment gives you, and read only what it names (and what `AGENTS.md` says to read).
- **The tests you are given are the contract:** make them pass; never change, skip or weaken them. If you think one is
  wrong, say why in a PR comment and leave that part.
- Run `scripts/test.sh` before you open the PR, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed.
- Your PR goes into `develop` and opens as `AGENTS.md` and the rules say. Never merge, never touch `main`, never
  force-push, never put a key or secret anywhere.
- Your environment has no internet while you work: its setup script installs what the suites need. If something is
  missing, say what in the PR instead of working around it.
- Your review of Claude's PRs follows "Reviews" above: the score, the list, blocking or not.

## Setup (1 November 2026)

- Codex on ChatGPT Pro 100, connected to HaakTuah's two game repositories. Code Review: automatic review off,
  exhaustive review on, so reviews run only on `@codex review`.
- One Codex cloud environment per repository, its setup script `bash scripts/cloud-setup.sh`, the agent's internet
  off.
- Before the first lane: a health check in each environment (`scripts/test.sh`, reporting what fails and why), then one
  small Barkstreet Snakes docs lane to test that an `@codex` comment starts a task. If it does not, the fallback is a
  runner on Haakon's PC (`codex exec`), designed then.
