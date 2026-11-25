## Choice: the core's scripts stay in JavaScript with no type checker

The same record weighs types for the core's own scripts (#486, point 4), written and argued with the one above.

- **Criteria, before the options.**
  1. Faults found that the tests and the reviews miss, counted in the scripts that change most and in the code each
     fixed bug stood in.
  2. Its cost: annotations to write, a checker to keep as a dependency, time added to the tests.
  3. Nothing breaks in a project: projects call each of the 92 scripts by its path, and run them with the pinned Node
     where `scripts/node.sh` installs it and with the machine's own where it cannot.
  4. How well agents read and write it.
- **The options**, each with what would make it the wrong pick.
  - **A. As they are:** JavaScript, nothing that checks a value's shape. Wrong where faults a checker catches reach
    `main`.
  - **B. JavaScript with types in comments,** names unchanged, checked by TypeScript's checker in the core's own tests
    alone (a tool that only runs, as #486, point 8, prefers), in loose mode with a baseline that may only shrink, or
    stricter. Wrong where the checker and its annotations cost more than the faults they catch.
  - **C. TypeScript run directly by the pinned Node,** with no build, behind one stable entry (#376). Wrong where a
    project's Node cannot run it, or the renames break a project's calls.
- **The trial.**
  - The pinned Node (26.13.0, its binary checked against `scripts/node.sh`'s sum) ran a TypeScript file directly, five
    runs of five, with no warning, and a `.mjs` file importing it; it refused an `enum` ("not supported in strip-only
    mode"), and has no flag to transform one. The Node 22.23.4 and 24.22.1 installed here did the same. Node strips the
    types and checks none: C checks nothing unless B's checker runs too.
  - The checker (TypeScript 6.0.2, with Node's types 26.6.6) on the ten scripts changed most in 2026 (`steps`,
    `check-configs`, `copies`, `size`, `security-review`, `workflow-run`, `steps-stage`, `pr-description`, `shape`,
    `look`: 3,935 lines), each finding read: in loose mode with no annotation, 14 findings, none a fault, each a
    pattern it cannot follow (a property set on a Map or an array, a variable that changes from an array to a Set, a
    parameter's default read as its type, a comment it misreads); with its checks of null alone added, 51 findings, 16
    of them a value that may be null, 13 of those guarded (a pattern that always matches, a length tested first, a
    filter), and 3 in `scripts/steps-stage.mjs`, a test's helper, which would throw only were the core's own template
    or a script's output to change, failing its test either way; in `strict`, 1,001 findings, 880 of them a value
    with no declared type, about one annotation for every four and a half lines.
  - On the code just before the fixes of #371, #386 and #423 (the bugs filed against the scripts whose fixing commits
    name them), loose and with null checks: no finding at a line the fix changed, save two at an unrelated name.
- **The case against** (the same challenger): the checker would no longer be the core's first dependency, the parser
  being that; loose mode needs no annotation, only a baseline of 14 lines, and its gain, a renamed or misspelled
  property caught as it is written, no scan of code that already passed its tests can measure; the bugs were sorted by
  their text, not run; the null findings went unread, and some throw in `steps-stage.mjs`; and the sign needs someone
  to sort fixes by hand.
- **The answer.** The first is granted, and the reason now rests on what the checker finds. The next three were
  measured, above: the run before each fix, the null mode and its 16 findings read one by one found no fault in code
  a project runs. The gain at the moment of writing is real but unmeasured, and B would still cost the core's first
  package in its tests, a lock file, and its updates' source checks, for nothing this trial shows. The sign below is
  now a run, not a sorting.
- **The pick: A.** On this trial a checker finds no fault the tests miss, in any mode short of 880 annotations in ten
  scripts; C adds to that a rename of every path a project calls. So point 5 of #486 has no steps to take while this
  stands.
- **What a sync asks of a project:** nothing.
- Judged again on 17 November 2026 (#519): it stands. The checker over the 33 fixed bugs that changed a script and
  over 134 fixes inside pull requests, and 33 sessions writing and changing code in each form, found no fault a
  checker would have caught that the tests did not.
- Reopens it: at each pass over these records, the run of #515, point 2, over the fixes made since the last:
  `node scripts/fixes.mjs --since <the day on "Read whole:">` lists each fix of a bug that changed a script that is no
  test, the tree before it and the lines it changed; the checker, fetched into a scratch folder with its install scripts
  off and never into the core, runs on each tree in loose mode and with its checks of null (the settings in #521). It
  reopens where the fixes at whose changed lines a finding points at the fault reach 5, counted over every pass since
  17 November 2026 and written here at each (0 of 33 then); or where a move to one stable entry (#376) renames the
  scripts for its own reasons.
