- `scripts/copies.mjs`, `.github/workflows/copies.yml`, `scripts/blobs.mjs`, `scripts/whole-output.mjs`,
  `scripts/schemas.mjs`, `scripts/schemas/`, `.github/copies.json`, `.github/copies-baseline.json`,
  `tests/copies-tools-test.mjs`, `scripts/copies-values.mjs`, `tests/copies-values-test.mjs`: fails a run of code (8
  lines) or of the rule files' prose (12 words) that stands in two places, unless its baseline lists it, and a pin or a
  long pattern a pull request writes into a second file (`copies-values.mjs`; #1139); `copies.yml` runs it and the other checks of the part "copies" through
  `scripts/checks.mjs`. *Runs:* any session and the runners. *Else:* jscpd (MIT, maintained, a program for each system,
  224 languages, Markdown among them), kept, tried above; PMD's CPD, dropped on fact: a Java runtime; Simian, dropped on
  fact: no licence the Open Source Initiative approves; for a value written twice, searched 23 November 2026: none
  reads a value across files outside an editor (SonarJS's rule 1192, Checkstyle's and ESLint's proposal read one file,
  JetBrains' inspection runs in its IDE, find-duplicate-strings reads quoted strings, never a pin or a regex literal). *Bugs:* 9, and 4 naming `copies.yml`, the most of any check.
  **Try** jscpd for the finding, its definition taking the core's place by default (#534, point 3); the baseline and the
  near-copies the audit reads stay the core's glue. This weighs again the "Kept" of #486's inventory, whose reason was
  the core's own definition. Its config's shape is held by a schema and ajv (`scripts/schemas.mjs`; #530, item 7).
  *Tried:* 20 November 2026 (#583), jscpd 5.4.3 (MIT; npm's package and a program for each system) and the core, on the
  same files: the core's own config; a project of each kind the starter kit writes (npm, and .NET with CRLF), seeded as
  `tests/upgrade-test.mjs` seeds them; and the part's fixtures in `tests/init-test.mjs` and
  `tests/copies-tools-test.mjs`. The core's definition and finding kept, on measure, the check unchanged. Two
  differences of definition: in prose jscpd counts markup as tokens, 12 words being 13 or more of them, so at 20 it
  found 5 runs the core does not (pointer stubs, a table's header, lead-ins under 12 words) and at 12 it found 60; in
  code its 8 lines count lines of brackets and the lines a run starts and ends in, so on the core it found 9 runs (a
  7-line step five workflows share, which the core lists among its near-copies; a job's header; imports; closing
  brackets) where the core finds none, and in each seeded project a line repeated 70 times as a run overlapping itself.
  And a defect of its finding: whether it reads a copied line of prose turns on the order it reads the files in and on
  what stands just before the line, never on the line itself. The same line was missed in a file whose folder sorts
  before the original's and read in one that sorts after, at every threshold from 10 to 50 and in each of its modes; so
  it missed the copy each seeded project holds (a floor line in `SECURITY.md`, read once the file is moved after
  `core/`), the init test's (one in `AGENTS.md`) and the tools test's (a sentence under a heading), each of which the
  core fails. It read the tools test's code copy (two files of the same 10 lines), as the core does, and neither fails
  the init test's two functions that match once names are set aside, which the core lists. 0.8 s against 1.5 s on the
  core, 0.2 s against 0.4 s on a project. Its base is scanned with the head's config, and its baseline fails only a new
  clone, so the core's glue would have stayed whole. A release of jscpd that mends the order of its reading asks the
  part again. *Replayed:* #339 read at 12 and 20 tokens, not at its default of 50 (a floor line added to
  `modules/how-to-work.md`, which sorts after `floor/`); #348, #370, #371 and #434 not read (a config narrowed or moved
  against the base, a file renamed out of what it reads, one rewritten after its rename: jscpd holds no config or file
  list to the base's, as its own help says); #346 and #444 not run (their fixes took the core's copies out and added a
  file to a test's list, no case of the check); #366 and #386 not run (the steps' and `fresh.mjs`'s reading of where a
  config stands, no reading of copies); #719 not run (the install of the job that runs the check); #674, #690 and #918
  not run (open, with no fix).
