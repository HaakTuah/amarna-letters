## Choice: one flat folder of scripts, each a command with its test beside it

- Chosen for: a workflow, a hook and a project's copy each call a script by its path, with nothing to build; each
  check's test stands next to it, and `.github/workflows/tests.yml` runs every one (the audit of #245 found the folder
  flat, with no import cycle: `reports/2026-11-14-how-code-is-put-together.md`).
- Changed on 17 November 2026 (#527, the path's second step): each test stands in `tests/`, which the copy leaves out,
  under its script's name; the folder of scripts stays flat.
- Reopens it: `scripts/` passes 150 files of code, or the shape check (`scripts/shape.mjs`) finds a cycle between them.
- Trips when: `files > 150`, `cycles > 0`
