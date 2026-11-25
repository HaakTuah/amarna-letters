# The reasons behind the core: issue #546

The index, and how an item is written: `archive/instructions.md`.

#546. **17 November 2026**, #546. A private project gets a scan of its code in place of the host's CodeQL, paid there:
     Semgrep's engine, a program that only runs, installed in the scan's own step from PyPI's lock form by its hashes
     (#654) and run with no Python, reads what a pull request adds or alters with rules the core writes, since no
     maintained rule set carries a licence the floor allows, and a finding is handled as floor rule 9 handles CodeQL's,
     so a private project has the same check as a public one; the choice was argued in `CHOICES.md`. It stands behind
     "CodeQL" in `tasks/updates.md`, `scripts/code-scan.mjs` and its rules.
