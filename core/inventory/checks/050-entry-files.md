- `scripts/entry-files.mjs`: fails an agent tool's entry file that does not pull in every file `AGENTS.md` names.
  *Runs:* any session and the runners. *Else:* the generators of each tool's rule files (ruler, rulesync), dropped on
  fact: the core keeps one `AGENTS.md` that each tool's file imports, and needs nothing generated. *Bugs:* 0. **Keep:**
  nothing fits; the list of entry files is the core's own.
