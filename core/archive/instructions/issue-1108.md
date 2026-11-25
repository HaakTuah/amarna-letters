# The reasons behind the core: issue #1108

The index, and how an item is written: `archive/instructions.md`.

#1108. **22 November 2026**, #1108. Each file the core writes into a project is read back in a test by each of the
     core's own readers that reads it, from projects of each kind the upgrade test holds, and a new writer or reader
     brings its round trip in the same pull request, with no property-testing library added: the core's own code is
     held to the same standard, and only a run of whole projects had found that its YAML reader could not read what the
     one process wrote. The owner agreed to it as the issue sets it out, for
     release 6. It stands behind "A writer of the core's and its readers meet in a round trip" in `AGENTS.md`.
