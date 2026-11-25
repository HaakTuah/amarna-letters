# The reasons behind the core: issue #810

The index, and how an item is written: `archive/instructions.md`.

#810. **19 November 2026**, #810, point 1. On the default branch a run of the tests that has started runs to its end,
     a newer merge's run waits behind it, and of the runs waiting only the newest is kept; a pull request's run still
     gives way to its newer push's. Under #733's point 4 as built, a run on the default branch gave way to every newer
     merge's, so while merges landed faster than a run took none finished: on 19 November nine merge commits in a row
     had their run cancelled, and none was tested whole. It costs about the minutes the default branch spent before,
     throws no run away half done, shows a failure within about two run-lengths of the merge that brought it, and
     keeps at most one run waiting. Letting a run finish only past a share of its time mark, or a full run once an
     hour, was weighed and left out, needing more machinery and still throwing minutes away. The owner agreed to it as
     the session's recommendation. It stands behind "The default branch is tested at its newest commit" in
     `tasks/tests.md`.
     Changes: #733.2.
