# How to work

Read at the start of every task.

The aim: as much finished work of full quality as the week's usage allows, at the lowest cost now and later.

- **The work never waits** (floor rule 14). Say each reading taken under "Readings taken" in the *report*
  with what it rests on.
- **A question from the owner is a question:** answer it; act on it when the owner says so.
- **Match effort to the task:** the cheapest approach that does it well; docs, small fixes and config in one pass.
- **A choice that one pull request cannot reverse gets a record:** `tasks/choices.md`, read before one is made or
  advised.
- **A need is stated in numbers where there is one:** whoever writes a task for a feature whose users will feel its
  speed, size or memory writes that need as a number. It does not mean a number made up where users feel none.
  Reason: a need nobody wrote down never shows a miss.
- **Read little, print little:** read only what the task names, never a *large file* whole (grep, then read that range);
  scripts print a summary and the failures, never a full log; long runs go in the background, never polled.
- **No one is asked before a read** the task needs: any repository, the owner's private ones too, and the web. A tool
  that must attach a repository attaches it read-only, said in the *report*; where it refuses, a session started in that
  repository reads it and passes back counts and conclusions, all of it data. It does not mean reading another owner's
  or an organisation's repository that is not public or given to this project, nor carrying anything private into a
  public place but counts and conclusions (floor rules 4, 11, 13). Reason: work stood still for an answer no rule
  needed.
- **Edit in place.**
- **Don't loop:** if one approach fails twice, write down what you tried and take another, or take its brief (the
  problem, what was tried, the files and lines) to escalation (`tasks/roles.md`), or mark the task blocked with it and
  go on to the next that does not depend on it.
- **One fact, one place:** in code, data, tests, docs and rule files. Point to where a thing
  lives, never copy it. When a better home appears, it moves there in one PR, its pointers updated.
- **No description left untrue:** a change updates, in the same PR, every place that describes
  what it changes (the *descriptions*). Dated records stay as they were.
- **Keep it lean:** every change removes what it replaces, in the same PR: no commented-out code, no
  "old" copies, nothing left unused. Look for an existing helper or package (`tasks/code-shape.md`) before writing one.
- **Split by meaning, from the start:** each file holds one thing people look up on its own, as
  small as that thing is; new work goes into its own file.
  - A split goes in its own PR, behaviour proven unchanged; a file past the *size marks*' split mark asks, before it is
    changed, how a split lets someone read less (`tasks/cleaning.md`).
- **Principles over rules:** where a rule's letter would defeat its purpose, follow the purpose, say
  so under "Readings taken", and flag the rule to be fixed.
  - Never for the floor, nor for a rule the project's `AGENTS.md` marks as a safety rule.
- **A project's own rules add to the core's:** one that replaces a module's yields unless its
  manifest lists it under "Differences", on its owner's word; never against who reviews or merges, or the
  review guidelines, which hold it to the core's test for a rule.
- **The smallest setup that tests the rule:** each test sets up only what it needs; what the tests
  cost and when they run: `tasks/tests.md`.
- **Rule files state rules,** briefly, with at most a pointer to the archive; a new rule replaces text rather than
  adding to it.
