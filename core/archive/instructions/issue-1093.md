# The reasons behind the core: issue #1093

The index, and how an item is written: `archive/instructions.md`.

#1093. **22 November 2026**, #1093, a design set out by the owner's adviser and agreed to by the owner, in a chat
     session. The core's checks run in a project's own workflows as they stand: a script of the core run from a copy
     installs the core's packages it needs first, or says as a warning that it did not run and why, failing nothing,
     and what a project's own workflow once carried for the core (the paths its suites skip, the lookup of a new
     package, the installs) the core brings itself, so no step asks a project to edit its own workflow for it. The
     reason: #1079 turned a project's sync pull request red over nothing it changed, and seven steps asked an agent to
     edit a project's own workflows by hand. It stands behind "The core's checks run in a project's own jobs as they
     stand" in `AGENTS.md`.
