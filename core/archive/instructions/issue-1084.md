# The reasons behind the core: issue #1084

The index, and how an item is written: `archive/instructions.md`.

#1084. **22 November 2026**, #1084, a design set out by the owner's adviser and agreed to by the owner, in a chat
     session. The upgrade test runs each project's own workflows, the core's calls among them, as the host would run
     them for a pull request and a push, on Linux and on Windows, and fails where one fails that did not before; and
     before every release a builder at the strongest tier tries it on a copy of a project that takes the core and whose
     owner allows it, read-only, each check run before the update as a baseline and again after, a check that passed
     before and failed after stopping the cut, only counts carried back and the project named nowhere. The reason: the
     upgrade test never ran a project's own workflows, so #1079 passed every check of the core and failed only in a
     trial on a real project. It stands behind "A release is cut on the owner's word" in `AGENTS.md`.
     Changed by: #1257.
