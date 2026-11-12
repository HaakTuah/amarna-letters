# Review guidelines

What every reviewer judges a change by, read whole with its brief, the project's own guidelines, its `SECURITY.md` and
the floor. Changes only on the owner's word (core archive 56).

## How a review passes

- **Every reviewer** lists everything that keeps the work from 10, each point concrete (a file and line, or a design
  section) and marked **blocking** or not, and scores the work from 1 to 10 (core archive 155). A 10 is a list with
  nothing blocking open: the work does all of the task's text, keeps every standing rule, leaves nothing behind, its
  tests prove it, and a demanding expert would hand it over as it stands. Where a reviewer's tool gives priorities and
  no score, its P0 and P1 block, and what blocks here is P1 or P0.
- **A later round** checks that the earlier points were fixed and reviews what changed since. Something new about work
  it already saw is raised only if it blocks.

## What blocks

**For every reviewer,** blocking: a departure from the design or from the PR's description; a broken rule of the
project, the core or the floor; a size mark raised without its reason in the PR; a test weakened or skipped, or changed
beyond what the task forces (core archive 36); and against the pillars of `modules/how-to-work.md`, a fact, rule or
piece of logic written a second time instead of pointed to. A finding, not blocking: anything the change leaves behind
(unused code, files or settings, commented-out code, a description made untrue); content put where its readers must read
past it; a pointer no reader needs.

**Text users read** (core archive 49 and 141): a finding for any line that reads machine-made (one shape again and
again, filler, hedging, clichés, voices alike, the same joke twice). Only a 10 passes; where a PR shows lines before and
after, the owner's read is final. The project's guidelines add its own tells.

**A rule file changed:** blocking for a rule that departs from the owner's archived words it cites; and a finding for a
rule that adds text without replacing any, or makes anyone wait for the owner beyond floor rules 3 and 14 (core archive
134).