# Claude and Codex

Decided 1 November 2026 (`docs/archive/instructions.md`, item 123). Two builders spread the weekly usage, Claude on Haakon's Claude plan and Codex
(OpenAI's) on ChatGPT Pro, and review each other: different models have different blind spots. This file is the whole
arrangement; `AGENTS.md` points here, and nothing here is repeated there.

## Who does what

- **The orchestrator is Claude, always:** it writes the briefs, routes the work, takes the readings, gives the
  reviews' verdicts, merges, and brings Haakon his questions.
- **The builders:** Claude's builder sessions, and Codex in OpenAI's cloud, started by the `codex` label on a draft PR,
  which the runner on Haakon's PC hands to Codex (below).
- **The reviewer is the other company's model.** Codex's PRs get Claude's reviewer (Opus, high effort), given
  the diff, the item's text and "The game in one page": it holds the picture of the finished game and sends the work back until it meets it. Claude's PRs
  that change the game get the `codex-review` label, and the runner posts Codex's review on the PR. When
  Codex is unavailable, Claude's reviewer takes both, as before.
- **Escalation goes to the other model first:** a problem that has defeated Claude twice goes to Codex as a
  draft PR from the stuck branch, labelled `codex`, whose description is the brief (the problem, what was tried, the
  files and lines), merged into the stuck branch if it works; one that has defeated Codex goes to
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

1. **Claim the lane with a draft PR,** as usual: a fresh branch from `develop` with one empty commit ("Claim: ..."),
   and a draft PR into `develop` whose **description is the brief.** Codex starts fresh each time and sees only the
   brief and the repository, so the brief stands alone: the item, the sections and files to read (paths), the tests it
   must pass, what not to touch, and what its report must say ("Readings taken", "Questions for Haakon").
2. **Add the label `codex`.** The runner on Haakon's PC sees it within a minute, comments "Codex has started" with the
   cloud task's id, and swaps the label for `codex-running`. When Codex is done, the runner pushes Codex's diff to the
   branch as one commit, posts Codex's report, and labels the PR `codex-done`, or `codex-failed` with the reason.
3. **Questions go on the PR,** both ways: Codex's arrive in the runner's comment; the orchestrator answers by adding a
   section to the description ("Round 2: ...") and adding `codex` again. At most **two rounds** per question; then the
   orchestrator takes the most reasonable reading and writes it under "Readings taken". Whatever only Haakon can settle
   goes to "Questions for Haakon" and the "For Haakon" table, as always.
4. **The PR is then reviewed as below,** sent back the same way (the review's list added to the description, `codex`
   added again), marked ready, and merged by the orchestrator.
5. **Never write the Codex mention** (`@` and `codex`) on GitHub: its bot cannot run tasks here (it needs a "Codex
   Cloud (Legacy)" environment, which cannot be created; tried 1 November 2026), and it answers every mention it
   finds, even in backticks. Text that talks about it says "the Codex mention".

## When Codex is not there

Codex's usage can run out with no alert, and the runner only works while Haakon's PC is on, so the orchestrator never
waits on Codex for long. The runner looks every minute, so:

- **`codex-failed`** (no usage left, an error, a task that could not be applied) **is a take-back at once.**
- **No "Codex has started" within about 5 minutes** (the PC is off or asleep), **or no `codex-done` within about
  2 hours:** take the lane back. Five minutes leaves room for the runner's minute and GitHub's delays; two hours, for
  the suites and a round of fixes.
- **Taking back:** remove the `codex` or `codex-running` label (the runner then stops following the task), write
  "Taken back by Claude" on the PR with the reason, and give the lane to a Claude builder.
- **Codex's diff never lands after a take-back:** the runner applies it only while the PR still has `codex-running`.
- **After a take-back for no usage, an error or silence (the PC off), Codex counts as unavailable:** hand it nothing until a small
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
- Build only what the brief gives you (the PR's description, which the runner sends you), and read only what it names
  and what `AGENTS.md` says to read.
- **The tests you are given are the contract:** make them pass; never change, skip or weaken them. If you think one is
  wrong, say why in your report and leave that part.
- Run `scripts/test.sh` before you finish, and `scripts/sim.sh --games 50 --seed 1 --verify-replay` when the engine changed.
- Do not commit, push or open a pull request: the runner applies your diff to the PR's branch. Never touch `main`, and
  never put a key or secret anywhere.
- Your environment's setup script installs what the suites need. If something is missing, say what in your report
  instead of working around it.
- Your review of Claude's PRs follows "Reviews" above: the score, the list, blocking or not.

## Setup (1 November 2026)

- Codex on ChatGPT Pro 100, its GitHub app given HaakTuah's two game repositories. Its own Code Review is set to
  automatic review off; reviews go through the runner's `codex-review` label instead.
- One Codex cloud environment per repository, made in ChatGPT's Codex settings, its setup script
  `bash scripts/cloud-setup.sh` (from `/workspace/<repository>`).
- Codex runs on its own default model for cloud tasks, since none can be chosen there; the local reviews use the model
  and effort in `~/.codex/config.toml` on Haakon's PC (GPT-6.1 Sol at medium). The review scores per category show
  whether that is good enough.

## The runner on Haakon's PC

`scripts/codex-runner.sh` connects the two. The orchestrator stays in Claude's cloud and only labels pull requests;
the runner on Haakon's PC sees the labels, starts Codex's cloud tasks with `codex cloud exec`, applies their diffs to
the PR's branch, and runs the reviews read-only on the PC with `codex exec`. The PC only hands work over: Codex builds
and tests in OpenAI's cloud. When the PC is off, nothing breaks: the lanes go back to Claude ("When Codex is not
there").

**It acts only on Haakon's own work.** Strangers can comment on a public repository and open pull requests from forks,
but cannot add labels, and their text must never reach Codex as instructions. So the runner acts on a pull request
only when all three hold, and otherwise removes the label and leaves it:

1. It was opened by HaakTuah from a branch in the repository itself, never a fork, and the branch is not `main` or
   `develop`.
2. The label was added by HaakTuah.
3. The brief is the PR's description; comments are never read as instructions.

The orchestrator keeps the same rule: it hands no lane to Codex, and merges nothing, from a pull request someone else
opened.

**Setting it up** (once, in WSL's Ubuntu on Windows, or any Linux):

1. Install Node, git, Python 3, the GitHub CLI (`gh`) and the Codex CLI (`npm install -g @openai/codex`).
2. `gh auth login` and `gh auth setup-git` as HaakTuah; `codex login` with Haakon's ChatGPT account (the code from his
   authenticator app, once). Both logins stay on the PC and are never copied anywhere.
3. Clone the repository, and find its environment's id with `codex cloud` (or `codex cloud list --json`).
4. Test once: `CODEX_ENV_ID=<id> CODEX_RUNNER_ONCE=1 scripts/codex-runner.sh`, with one small docs lane labelled
   `codex`. Then run it for good in its own terminal, or at login, without `CODEX_RUNNER_ONCE`. One runner per
   repository; its log is in `~/.codex-runner/`.
