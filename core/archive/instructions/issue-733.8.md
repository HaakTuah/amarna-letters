# The reasons behind the core: issue #733.8

The index, and how an item is written: `archive/instructions.md`.

#733.8. **19 November 2026**, #733, point 8, and point 7 where it names the publishing. What users get is published
     only from the default branch's newest commit once all its checks passed there, or from a release cut from such a
     commit, never on a merge alone, so every project merges a pull request on its own green checks; a project that
     still publishes on each merge brings a pull request up to date first until its agents make its publishing wait on
     a green branch, a step of the release. Both of the owner's games published on every push to their default branch,
     so under point 1 as first worded they would have kept the one-at-a-time line, where publishing from a green branch
     costs their players one run's wait. The owner agreed to the point as worded on the issue, for the batch that ends
     in the release after `release-5`. It stands behind floor rule 12, "What users get is published only from a green
     default branch" in `tasks/hosts.md`, and "Players always play the newest version" in `tasks/game-design.md`.
