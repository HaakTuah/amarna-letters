# The reasons behind the core: issue #733.2

The index, and how an item is written: `archive/instructions.md`.

#733.2. **19 November 2026**, #733, points 2 to 6. No test run on a draft; a pull request's run on one platform, the suites
     its change reaches; the default branch tested at its newest commit, a run giving way to a newer merge's and a red
     one narrowed by its files' history and then by halving; the slow and platform suites run once per batch at the
     default branch's newest commit, as often as their cost allows, where the tests run and who pays read and never
     asked; and a time mark that measures and never fails. In 24 hours of the core's tests, 43% of the job-minutes went
     to runs a newer push replaced, Windows took 69% of the pull requests' job-minutes while about three bugs in the
     core's history were found there alone, and at least 3 of 8 red runs on the default branch were a suite past its
     mark on a slow runner. The owner agreed to the points as worded on the issue, to point 6 with the Windows suites
     once an hour in the core, and to its being a priority, since it holds up everything else. It stands behind "A time
     mark measures and never fails", "No test run on a draft", "The default branch is tested at its newest commit" and
     "The slow suites run once per batch, wherever they run" in `tasks/tests.md`.
     Changed by: #810.
