# When Codex builds

What goes to Codex, how a lane is handed to it, and what happens when it is not there. **Dormant until the owner says
Codex can build** ("Status" in `docs/claude-and-codex.md`, which holds the rest of the arrangement: who does what, the
reviews and the setup); until then all building is Claude's, and no session needs to read this file.

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
determinism, and the orchestrator's own work (briefs, routing, readings on Codex's questions, merges).

Items stay one at a time, in order, as the builder rules say: a Codex lane runs beside an item, never inside the same
files. **Trials:** in the first week Codex can build, one art task to Codex if one comes up, compared against Claude's;
after the first week, one build-order item split the long way (Claude writes the rule and its tests, Codex implements,
Claude reviews), and if it scores well, more items follow. Codex's first task with a part of a helper's shape uses its
subagents, so that PR shows whether they start in its cloud, whether they keep to five at a time (Codex's own default
allows six; if not, its settings set five), and what they give.

## Handing work to Codex

1. **Claim the lane with a draft PR,** as usual: a fresh branch from `develop` with one empty commit ("Claim: ..."),
   and a draft PR into `develop` whose **description is the brief.** Codex starts fresh each time and sees only the
   brief and the repository, so the brief stands alone: the item, the sections and files to read (paths), the tests it
   must pass, what not to touch, and what its report must say ("Readings taken", "Questions for the owner").
2. **Start Codex from the PR.** How is written here once its tasks work ("Status" in `docs/claude-and-codex.md`); never by a program on the
   owner's machine. Codex works in its cloud, pushes to the PR's branch itself, and reports on the PR.
3. **Questions go on the PR,** both ways: Codex's in its report; the orchestrator answers by adding a section to the
   description ("Round 2: ...") and starting Codex again. At most **two rounds** per question; then the orchestrator
   takes the most reasonable reading and writes it under "Readings taken". Whatever only the owner can settle is filed
   as a `question` issue, and the PR links it.
4. **The PR is then reviewed** as "Codex reviews" in `docs/claude-and-codex.md` says, sent back the same way (the review's list added to the description, Codex started again), marked ready, and merged by the orchestrator.
5. **The Codex mention** is written only to ask for a review ("Codex reviews", point 1, in `docs/claude-and-codex.md`).

## When Codex is not there

Codex's usage can run out with no alert, so the orchestrator never waits on Codex for long:

- **A failure Codex reports** (no usage left, an error, a task that could not be applied) **is a take-back at once.**
- **No sign of Codex starting within about 5 minutes, or no finished work within about 2 hours:** take the lane back.
  Five minutes leaves room for GitHub's delays; two hours, for the suites and a round of fixes.
- **Taking back:** write "Taken back by Claude" on the PR with the reason, and give the lane to a Claude builder.
- **Codex's work never merges after a take-back:** a push that arrives after the take-back is left unmerged, and the
  branch goes to the Claude builder as it stood before.
- **After a take-back for no usage, an error or silence, Codex counts as unavailable:** hand it nothing until a small
  test task gets through, tried at most every few hours (not in use while Codex cannot build: "Status" in `docs/claude-and-codex.md`).
  Meanwhile the work is Claude's alone.
  A take-back for a slow PR alone does not count: the next lane still goes to Codex.
- These times are first guesses (archive item 124): change them here when the first weeks show better ones.
