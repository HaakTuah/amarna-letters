## Choice: the code is built and tested on Linux and on Windows, and on no other platform

- Chosen for: the sessions work on Linux, the owner's projects build on Linux and on Windows (a .NET project as
  Windows holds it), and the suites run on both, so a script that reads paths or line endings fails here first
  (`.github/workflows/tests.yml`).
- Reopens it: a project of the owner's builds on another platform (macOS, say), or a suite cannot run where the
  sessions work.
