- `scripts/twice.mjs`, `scripts/twice-files.mjs`, `scripts/twice-text.mjs`, `tests/twice-test.mjs`, `tests/twice-kept-test.mjs`, `scripts/twice-scratch.mjs`: at a project's reading against the core and at each sync after it,
  lists what the project holds twice or against the core (#1087): a file equal to a file of the copy, or of an earlier
  copy, outside it; a paragraph of its own rule files that reads close to the core's, or to another of its own; a
  second call of a core workflow with the same inputs; a pointer to a path the core has left. `--fix` corrects only
  the exact kinds, in a pull request of its own; the rest it lists for the auditor. *Runs:* any session, in the
  project, from the sync's report. *Else:* jscpd, the copies check's candidate (#534), reads copies of tokens, Markdown
  by block, among the files it is given, kept there and dropped here on fact: it reads no earlier copy from git, no
  call of a workflow and no pointer, and fixes nothing; Vendetect, code alone, dropped on fact; mdsmith's rule MDS037,
  exact paragraphs only and not in a release when read (23 November 2026), dropped on fact; redup, dupehound and
  dryscope, files or code within one tree, dropped on fact. *Bugs:* none. **Keep:** nothing fits; what the core's copy
  and its history are is the core's to read.
