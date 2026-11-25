- `scripts/mend.mjs`, `scripts/inventory.mjs`: the form of a check's failure, a line that opens `FAIL` and says the
  mend, which every check's test reads; its test holds each check of the core to a test that reads its mends, each
  tracked file to a line of this inventory or a path it leaves out, and this inventory to its challenge, reading it
  whole through `scripts/inventory.mjs`, which puts each folder's parts in place (#254; #593; #750). *Runs:* the
  runners, in the core's suites; any session by hand. *Else:* none: it reads no format of anyone else's, the form and
  what the test holds being the core's own rules (`AGENTS.md`, "A check that fails says the mend"). *Bugs:* 9
  labelled `bug` name either file, by their titles each a fault of another part. **Keep**: no package fits, the job being the core's own.
