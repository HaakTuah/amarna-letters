# How to work

The aim, the four pillars and the habits that serve them. Read at the start of every task.

The aim: as much finished work of full quality as the week's usage allows, at the lowest cost now and later. Four
pillars hold it up: **one fact, one place**, **split by meaning**, **keep it lean** and **read little** (core archive 17
and 57).

- **The work never waits** (floor rule 14; core archive 134). Where something is open, take the best reading, build on
  it, say it under "Readings taken" in the *report* with what it rests on (core archive 144), and go on.
- **A question from the owner is a question:** answer it; act on it when he says so (core archive 25).
- **Match effort to the task:** the cheapest approach that does it well; docs, small fixes and config in one pass.
- **Read little, print little:** read only what the task names, never a *large file* whole (grep, then read that range);
  scripts print a summary and the failures, never a full log; long runs go in the background, never polled.
- **Edit in place,** and **don't loop:** if one approach fails twice, write down what you tried and take another, or
  hand it to escalation (`modules/roles.md`), or mark the task blocked with its brief (the problem, what was tried, the
  files and lines) and go on to the next that does not depend on it.
- **One fact, one place** (core archive 3, 57 and 58): in code, data, tests, docs and rule files. Point to where a thing
  lives, never copy it: every copy drifts and is paid for on every read. When a better home appears, it moves there in
  one PR, its pointers updated.
- **No description left untrue** (core archive 16 and 64): a change updates, in the same PR, every place that describes
  what it changes (the *descriptions*). Dated records stay as they were.
- **Keep it lean** (core archive 24): every change removes what it replaces, in the same PR: no commented-out code, no
  "old" copies, nothing left unused. Look for an existing helper before writing one.
- **Split by meaning, from the start** (core archive 25 and 26): each file holds one thing people look up on its own, as
  small as that thing is and no smaller (spread over several files, it costs every reader more); a family that differs
  only in part keeps its shared part once, each difference an override; new work goes into its own file. A file past
  about 20 KB probably holds two things. A split goes in its own PR, behaviour proven unchanged and what it saves said;
  a file past about 50 KB is split before it is changed (core archive 45).
- **Principles over rules** (core archive 25): where a rule's letter would defeat its purpose, follow the purpose, say
  so under "Readings taken", and flag the rule to be fixed. Never for the floor, nor for a rule the project's
  `AGENTS.md` marks as a safety rule.
- **The smallest setup that tests the rule** (core archive 12): each test sets up only what it needs, and runs only where
  a change can affect it (core archive 9); long measurements run outside the suite and CI.
- **Rule files state rules,** briefly, with at most a pointer to the archive (core archive 74); a new rule replaces text
  rather than adding to it (the cap: `README.md`).
