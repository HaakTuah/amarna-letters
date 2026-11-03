# Review guidelines

What every reviewer judges a change by: Codex's code review, the fallback reviewer, the design checker and the blind
re-review. A reviewer reads this file whole with its brief ("Reviews", point 7, in `docs/claude-and-codex.md`) and
`SECURITY.md`, and another rule file only where a line here names it. It changes only on the owner's word (archive item
206).

## How a review passes

- **Codex** reports findings by priority, P0 to P3. Every finding counts: the PR passes only with none open.
- **Every other reviewer** scores from 1 to 10. The reviewer lists everything that keeps the work from 10, each point
  concrete (a file and line, or a design section) and marked **blocking** (against the design, the item's text, its
  tests or the standing rules) or **not blocking**, which says only what is fixed first. **A 10 is a list with nothing
  open:** the work does all of the item's text and the sections it names, keeps every standing rule, leaves nothing
  behind ("Keep it lean" in `AGENTS.md`), its tests prove it, and a demanding expert would hand it over as it stands. A
  10 with a point open, or less than 10 with none, is no review: ask again.
- **A later round** checks that the earlier points were fixed, and reviews what changed since. Something new about work
  it already saw is raised only if it blocks (P0 or P1): a bug, a broken rule, a security hole, a departure from the
  design. Taste does not grow between rounds, so the rounds come to an end.

## What blocks

**For every reviewer,** report as blocking (P1 in Codex's priorities) a departure from the design or from the PR's
description and the sections it names; a broken rule of `AGENTS.md`, of the builder rules or of `SECURITY.md`; a test
weakened or skipped, or changed beyond what the task forces (a forced change shows in the PR that every check is kept
and none loosened); and a protected file (`SECURITY.md`, rule 3) changed by a Codex lane. Report anything the change
leaves behind (code, files or settings it made unused, commented-out code) as a finding.

**History holds,** for every reviewer: report as P1 a real-world fact (a person, place, date, name, custom or event) the
change adds or alters that has no source in `docs/history/`, or contradicts the source it cites. Each real fact in the
game's data names the dossier line it rests on by that line's anchor, and the line quotes the few words of its source it
relies on; a test fails when an anchor is missing or its line names someone else (archive item 167). Where no source
speaks, the game takes the most plausible estimate: published expert estimates, as many as can be found, their consensus
or middle, each cited, graded [G]; a guess made earlier has no standing of its own, and gives way to a better-grounded
one (archive item 170).

**Hidden information,** for every reviewer: report as P1 any read of the true game state that a seat could not know, in
what it is shown, what a model is asked, what a script king reads or what an export holds. Check every path: the latest
season, past seasons, replays and the god view. The canary test ("Follow-ups" in `docs/BUILD-PROGRESS.md`) guards the
same from the other side, since a reviewer can miss it.

**Text a player reads,** for every reviewer of a change that adds or rewrites it: report as a finding any line that
reads machine-made (one shape filled in again and again, filler, clichés, two voices alike); the slop audit in
`docs/BUILD-PROGRESS.md` sets the bar.

**One idea, for every reviewer** of a change to the game (not docs, design copies or Dependabot's updates): end the
review with one thing outside this change that would make the game better, or "none", the usual answer when nothing is
worth the owner's time. It never blocks (a P3 at most). The builder searches the open ideas first: a new one is filed as
an `enhancement` issue and linked in the PR, a repeat becomes a comment on the existing issue, so the ones that keep
coming up show. Nothing is built from it until the owner queues it.
