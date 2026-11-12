# Model trial 2: Fable at high against Opus at high

A brief for the orchestrator, not a report. The first trial (11 November 2026; #929 and #930) set Fable at medium
effort against Opus at high on the phone-frames lane: Fable cost about half and its result was clearly worse. It
changed model and effort together, and it ran on polish work, not on a numbered item, so it could not say which of the
two the difference came from, nor whether it holds on the work the rule was written for.

The owner's word, in the design chat (12 November 2026), to one fair pair, Fable at high against Opus at high, on a
numbered item, after Monday's reset of the week's usage:

> Yes to the test.

## What to do

1. **When:** the first numbered part started on or after Monday 16 November 2026, never before.
2. **Two builders, one part.** Both start from the same commit of `main` with the same brief, word for word, each on a
   branch and a draft PR of its own, neither reading the other's: one Fable at high effort, one Opus at high effort. The
   titles end "(trial 2: Fable, high)" and "(trial 2: Opus, high)". The numbered items run one lane: this pair is the
   one exception, and no other numbered part starts until one of the two is merged.
3. **Each PR is reviewed as any PR.** Its fix rounds are counted.
4. **Measured together.** When both are reviewed: one measurement of the part's own measure (for the balance pass, its
   benchmarks and its use-against-ignore numbers, by `scripts/sim.sh`) on one machine, the same seeds, the runs taken in
   turn, with `main` at the commit both started from as the baseline.
5. **Judged blind.** A fresh Opus reviewer at high effort gets only each change's own diff from its merge-base (no
   branch names, titles, commit messages or reports) and the shared measurement, labelled A and B by a coin flip, and
   says which is better and why. The letters are mapped back afterwards, and the verdict is posted on both PRs.
6. **Counted.** On each PR, a comment with the builder session's tally (calls, input, cache writes, cache reads,
   output), and beside it the same for the helpers and reviewers that PR started, where they can be counted.
7. **One merges.** The better one is merged, the other closed, and this file's entry in the progress file is replaced
   by a line naming both PRs.

## How it is read

The design session reads both PRs and reports to the owner by his rule of 11 November: Fable takes the main lane if
its cost, weighed at API prices, is at most about 1.2 times Opus's and its result is as good or better; otherwise Opus
stays. Until then nothing changes in who builds what (`core/modules/claude.md`).
