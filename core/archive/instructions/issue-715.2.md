# The reasons behind the core: issue #715.2

The index, and how an item is written: `archive/instructions.md`.

#715.2. **19 November 2026**, #715, point 2. A slow test that guards only what reaches users through a release runs
     at the default branch's newest commit once a day and before each release where releases are cut apart from
     merging and minutes are free; before each release only where minutes are billed, a daily run there being the
     owner's choice, since it costs money; and on each pull request where every merge goes live, since there a merge
     is the release. The upgrade test on Windows had set every pull request's run at 13 to 22 minutes, while what it
     guards reaches a project only through a release. The owner agreed to it as the session set it out, how point 1
     reads for each kind of project. It stands behind "A test that guards only what a release brings runs where the
     release is made" in `tasks/tests.md`.
