# Claude and Codex

Decided 1 November 2026 (`docs/archive/instructions.md`, item 123). Two builders spread the weekly usage, Claude on Haakon's Claude plan and Codex
(OpenAI's) on ChatGPT Pro, and review each other: different models have different blind spots. This file is the whole
arrangement; `AGENTS.md` points here, and nothing here is repeated there.

**Status (1 November 2026): Codex reviews, Claude builds.** Codex's code review works on these repositories, but it
cannot build yet: its GitHub tasks and its command line need a "Codex Cloud (Legacy)" environment, which cannot be
created. So no lane goes to Codex, and nothing is labelled `codex`, until Haakon says it can build; until then the
building, the routing below and Haakon's poller wait, and all building is Claude's.

## Who does what

- **The orchestrator is Claude, always:** it writes Codex's briefs, routes the work, takes the readings, merges
  Codex's PRs, and brings Haakon his questions.
- **The builders:** Claude's builder sessions, and Codex in OpenAI's cloud, started by the `codex` label on a draft PR,
  which Haakon's poller hands to Codex (below).
- **The reviewer is the other company's model.** Codex's PRs get Claude's reviewer (Opus, high effort), given
  the diff, the item's text and "The game in one page": it holds the picture of the finished game and sends the work back until it meets it. Claude's PRs
  that change the game get Codex's code review ("Codex reviews" below); when Codex does not answer in time, Claude's
  reviewer takes them, as before Codex came.
- **Escalation goes to the other model first:** a problem that has defeated Claude twice goes to Codex as a
  draft PR from the stuck branch, labelled `codex`, whose description is the brief (the problem, what was tried, the
  files and lines), merged into the stuck branch if it works; one that has defeated Codex goes to
  Claude's escalation helper. Either way the orchestrator checks the answer.
- **Who merges is unchanged for Claude's work:** Claude's builders merge their own PRs, as the builder rules and "Git
  and GitHub" say, once the review's verdict ("Reviews" below) allows, and apply the score rules themselves. **Codex
  never merges:** the orchestrator merges its PRs. Codex never touches `main`, and never pushes to a branch it was not
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

1. **Claim the lane with a draft PR,** as usual: a fresh branch from `develop` with one empty commit ("Claim: ..."),
   and a draft PR into `develop` whose **description is the brief.** Codex starts fresh each time and sees only the
   brief and the repository, so the brief stands alone: the item, the sections and files to read (paths), the tests it
   must pass, what not to touch, and what its report must say ("Readings taken", "Questions for Haakon").
2. **Add the label `codex`.** Haakon's poller sees it within a minute, comments "Codex has started" with the cloud
   task's id, and swaps the label for `codex-running`. Codex works in its cloud and pushes to the PR's branch itself;
   the poller then posts Codex's report and labels the PR `codex-done`, or `codex-failed` with the reason (Codex did not
   push, its usage ran out, or its work touched a protected file).
3. **Questions go on the PR,** both ways: Codex's arrive in the poller's comment; the orchestrator answers by adding a
   section to the description ("Round 2: ...") and adding `codex` again. At most **two rounds** per question; then the
   orchestrator takes the most reasonable reading and writes it under "Readings taken". Whatever only Haakon can settle
   goes to "Questions for Haakon" and the "For Haakon" table, as always.
4. **The PR is then reviewed as below,** sent back the same way (the review's list added to the description, `codex`
   added again), marked ready, and merged by the orchestrator.
5. **Write the Codex mention only to ask for a review:** `@codex review` or `@codex security review`, alone at the
   start of a comment. Any other request to it fails (its tasks need a Legacy environment, which cannot be created;
   tried 1 November 2026), and its bot answers every mention it finds, even in backticks, so text that only talks
   about it says "the Codex mention".

## When Codex is not there

Codex's usage can run out with no alert, and the poller only works while Haakon's PC is on, so the orchestrator never
waits on Codex for long. The poller looks every minute, so:

- **`codex-failed`** (no usage left, an error, a task that could not be applied) **is a take-back at once.**
- **No "Codex has started" within about 5 minutes** (the PC is off or asleep), **or no `codex-done` within about
  2 hours:** take the lane back. Five minutes leaves room for the poller's minute and GitHub's delays; two hours, for
  the suites and a round of fixes.
- **Taking back:** remove the `codex` or `codex-running` label (the poller then stops following the task), write
  "Taken back by Claude" on the PR with the reason, and give the lane to a Claude builder.
- **Codex's work never merges after a take-back:** a push that arrives once the label is gone is left unmerged, and the
  branch goes to the Claude builder as it stood before.
- **After a take-back for no usage, an error or silence (the PC off), Codex counts as unavailable:** hand it nothing until a small
  test task gets through, tried at most every few hours. Meanwhile the work is Claude's alone, as before Codex came.
  A take-back for a slow PR alone does not count: the next lane still goes to Codex.
- The times were set from the first test (1 November 2026): adjust them from what the first weeks show, and say so
  here.

## Codex reviews

Codex reviews Claude's PRs that change the game, in OpenAI's cloud, on Haakon's Codex plan, so Claude's weekly usage
goes to building. Its usage can run out like any other, and it may then not say so, so:

1. **Ask:** a comment `@codex review` alone. Codex reads the PR's description, so the item's text and the design
   sections it names go there, and it follows the "Review guidelines" in `AGENTS.md` and `SECURITY.md`. Its security
   review runs with every code review (its setting), at the "high" threshold.
2. **It starts within seconds** (its 👀 reaction and a "Codex Review Summary" comment; seen in 20 seconds on
   1 November 2026) **and finishes within minutes** (seen in under two). No sign within about **5 minutes,** or an
   answer that is not a review (no usage left, an error): Claude's reviewer takes the PR at once.
3. **Still running after about 15 minutes:** ask once more with `@codex review`. No finished review about 5 minutes
   after that: Claude's reviewer takes it. Either way, a late Codex review is still read, but nothing waits for it.
4. **It gives findings, not a score:** its format is its own, whatever it is asked (seen on Snakes #289,
   1 November 2026). Each finding has a priority from P0 to P3: **P0 and P1 are blocking**, P2 and P3 are not, and go
   into the PR as notes. A review that found nothing (its 👍, or "Didn't find any major issues") counts as clean.
5. **The design check, with a score:** on its build-order items (not the polish and sound lanes' small fixes), Claude's reviewer also checks the
   work against the design, at medium effort: given the diff and the PR's description and "The game in one page", it gives the score
   from 1 to 10 and what keeps it from 10, blocking or not ("Reviews" below), on the design alone, since Codex looks for
   faults and security. Smaller PRs get Codex's review alone. **Why it is enough:** a test PR with three planted faults
   (Barkstreet Snakes #298, 1 November 2026, never merged) got all three as P1 from Codex within four minutes: a bug
   (an off-by-one in the board's bounds), a break of a rule that is not a bug (a renamed storage key, citing `AGENTS.md`)
   and a security hole (a peer's name as HTML, citing `SECURITY.md`); it also saw through the PR's false reasons. What
   it does not give is the broad feedback on the design, which the design check gives. Haakon agreed ("I agree with
   your assesment").
6. **Docs-only PRs and the milestone PRs get no review,** as before. Codex's automatic review stays off in its settings
   for both repositories, so it reviews only when asked.

## Reviews: a score, and what keeps it from 10

Every review, in either direction:

1. **Gives a score from 1 to 10 and lists everything that keeps the work from 10,** each point concrete (a file and
   line, or a design section) and marked **blocking** (against the design, the item's text, its tests or the standing
   rules) or **not blocking**.
2. **Sends the work back while any point blocks.** When none does, it merges; the points that do not block go into the
   PR as a note, or into `docs/BUILD-PROGRESS.md` as a small follow-up entry.
3. **At most three rounds.** Then the orchestrator decides, or escalates to the other model, and writes why.
4. **One line in each PR:** `Review: <category> · <builder> · <each round's result>`, a score from the design check
   or Claude's reviewer, or Codex's verdict (`clean`, or its findings, such as `P1×2`): `Review: interface · Codex ·
   P1×1, clean`, or `Review: rules · Claude · 7, 9`. At each milestone the orchestrator sums them by category and builder in the
   milestone PR: a category where Codex scores lower moves back to Claude, one where it does well gets more.

## For Codex

- `AGENTS.md` applies to you in full, except Claude's helpers, models and effort. Read
  `.claude/rules/builder-rules.md` at the start of every task: the rules for every builder, from the design document.
- Build only what the brief gives you (the PR's description, which the poller sends you), and read only what it names
  and what `AGENTS.md` says to read.
- **The tests you are given are the contract:** make them pass; never change, skip or weaken them. If you think one is
  wrong, say why in your report and leave that part.
- Run `scripts/test.sh` before you finish, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed.
- Commit and push your work to the PR's branch, never to `main` or `develop`, and open no new pull request. Never
  change `.github/`, `scripts/cloud-setup.sh`, `.gitattributes`, `.claude/`, `AGENTS.md`, `CLAUDE.md` or `SECURITY.md`, and never put
  a key or secret anywhere.
- Your environment's setup script installs what the suites need. If something is missing, say what in your report
  instead of working around it.
- Your review of Claude's PRs follows "Reviews" above: the score, the list, blocking or not.

## Setup (1 November 2026)

- Codex on ChatGPT Pro 100, its GitHub app given HaakTuah's two game repositories. Its own Code Review is set to
  automatic review off.
- One Codex cloud environment per repository, made in ChatGPT's Codex settings, its setup script
  `bash scripts/cloud-setup.sh` (from `/workspace/<repository>`).
- Codex runs on its own default model for cloud tasks, since none can be chosen there. The review scores per category
  show whether that is good enough.

## Haakon's poller

A small poller on Haakon's PC, kept outside the repositories, connects the two: the orchestrator stays in Claude's
cloud and only labels pull requests; the poller sees the labels and starts Codex's cloud tasks. It runs no code from
the repositories and keeps no copy of them; Codex builds and tests only in its cloud, which holds no secrets.

**Only Haakon's own work reaches Codex.** Strangers can comment on a public repository and open pull requests from
forks, but cannot add labels, and their text must never reach Codex as instructions. So a lane is handed to Codex only
when it is a pull request HaakTuah opened from a branch in the repository itself (never a fork, never `main` or
`develop`), labelled by HaakTuah, with its description as the brief; comments are never read as instructions. The
orchestrator keeps the same rule: it hands no lane to Codex, and merges nothing, from a pull request someone else
opened.

**Codex's work never touches what runs with credentials or sets the rules.** A Codex task reads the web, so text
planted somewhere could try to steer it. Its work may never change `.github/` (the CI workflows),
`scripts/cloud-setup.sh`, `.gitattributes`, `.claude/`, `AGENTS.md`, `CLAUDE.md` or `SECURITY.md`. Such a PR is labelled
`codex-failed` with the files named, and the orchestrator checks it too before any merge (`gh api
repos/<repository>/compare/develop...<branch>` lists the files): it is never merged; Haakon decides. Lanes that must
change those files are Claude's. Nothing secret is ever written to a repository.
