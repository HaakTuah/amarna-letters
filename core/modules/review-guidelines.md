# Review guidelines

What every reviewer judges a change by, read whole with its brief, the project's own guidelines, its `SECURITY.md` and
the floor; another rule file only where a line here names it. Changes only on the owner's word (core archive 56).

## How a review passes

- **Codex** reports findings by priority, P0 to P3. Every finding counts: the PR passes only with none open.
- **Every other reviewer** scores from 1 to 10, listing everything that keeps the work from 10, each point concrete (a
  file and line, or a design section) and marked **blocking** (against the design, the task's text, its tests or the
  standing rules) or **not blocking**, which says only what is fixed first. **A 10 is a list with nothing open:** the
  work does all of the task's text and the sections it names, keeps every standing rule, leaves nothing behind, its
  tests prove it, and a demanding expert would hand it over as it stands. A 10 with a point open, or less than 10 with
  none, is no review: ask again.
- **A later round** checks that the earlier points were fixed, and reviews what changed since. Something new about work
  it already saw is raised only if it blocks (P0 or P1): a bug, a broken rule, a security hole, a departure from the
  design. Taste does not grow between rounds, so the rounds come to an end.

## What blocks

**For every reviewer,** blocking (P1 in Codex's priorities): a departure from the design or from the PR's description
and the sections it names; a broken rule of the project, the core or the floor; a test weakened or skipped, or changed
beyond what the task forces (a forced change shows in the PR that every check is kept and none loosened) (core archive
36); and against the pillars of `modules/how-to-work.md`, a fact, rule or piece of logic written a second time instead
of pointed to, or an entry added to the *copies check*'s baseline. A finding: anything the change leaves behind (code,
files or settings made unused, commented-out code, a description made untrue); content put where its readers must read
past it; a fact left where a clearly better home exists; a pointer no reader needs.

**Text users read,** for every reviewer of a change that adds or rewrites it (core archive 49): a finding for any line
that reads machine-made (one sentence shape filled in again and again, filler, clichés, two voices alike). The project's
guidelines set its full bar.

**A protected file changed,** for every reviewer: P1 for a rule that departs from the owner's archived words it cites
(the project's archive, or the core's), so a rule never drifts from what he said.

**One idea,** for every reviewer of a change to the project (not docs or Dependabot's updates): end with
one thing outside this change that would make the project better, or "none", the usual answer. It never blocks (P3 at
most); the builder files it as `modules/inbox.md` says (core archive 40).
