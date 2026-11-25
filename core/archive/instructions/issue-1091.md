# The reasons behind the core: issue #1091

The index, and how an item is written: `archive/instructions.md`.

#1091. **22 November 2026**, #1091, a design the owner agreed to in a chat session with the adviser. The adviser had a
     helper read all the steps a release asks of a project and set out which a script could do in place of an agent;
     the owner agreed to all of it, for release 6, asking that the update be as robust and smooth as it can be and that
     nothing be left out. Where a step's work is exact, the sync does it: `steps.mjs --write` runs each such step's
     writer, which writes only a check's own config or baseline, or a pointer's path, never a word of a project's rule
     text, lists what it wrote and, where it cannot run, says so and writes nothing; a step that needs judgement stays
     with its mend. What it wrote goes in a pull request after the sync's, with the usual reviews, so the sync stays
     pure. A step a script can write, rebuilt by hand in every project, costs an agent's work each time and is where it
     goes wrong. It stands behind "A release says what it asks, step by step" in `AGENTS.md`.
     Changed by: #1094.
