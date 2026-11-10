# The stand-in (9 November 2026)

The owner's words: core archive 78 and 79. Builders took their own readings of what the spec left open and built on
them until he corrected them, and their readings often differed from his; none of them read his past answers, which the
rules keep out of their reading to save usage, and no stronger model tried to predict his answer.

What changes in every project that takes the core:

- **The stand-in** (`modules/inbox.md`, first point; `modules/roles.md`; `modules/claude.md`, its row): a fresh Opus
  session at high effort that predicts the owner's answer from the *settling references* and his past words (the
  archive and the closed `question` issues, searched). The builder sends it every open question of a task in one call,
  once it has read the spec, and builds on its answer, not its own guess: the owner's point that a predictor wrong some
  of the time still steers better than the builder alone, since its input comes sooner and he corrects it as now. What
  it is not sure of, a matter of taste or what cannot be undone still goes to him at once, with its answer as the
  reading taken. Only the stand-in reads the archive for this, so builders keep reading little. Fable only for a
  question that touches a design pillar and that Opus cannot call.
- **Two calls per task at most, none if nothing is open:** one with the questions known once the spec is read, one with
  the readings taken later, when the PR is ready; on the design-checked PRs the design check makes that second call
  (`modules/reviews.md`, point 5).
- **Its record decides how much it answers alone:** each answer of the owner's to a predicted question is set beside
  the prediction, and the workshop check reports how often they matched, by kind (`modules/workshop-check.md`, point 7).
  A blind test on his past answers, run by the design session, sets the first threshold.

The games take this with their copy of the core (step 3).
