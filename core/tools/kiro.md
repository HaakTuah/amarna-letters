# Kiro's part

Read by a session of the tool `kiro`, and by whoever hands Kiro a task or a review. From Kiro's documentation alone
(kiro.dev, its pages on steering, hooks and the command line, read on 15 November 2026), as `tasks/tools.md` asks
until Kiro has passed the staged cases.

How a review is asked of Kiro by each way:
- *Side by side:* from its command line, as below, in a fresh session that takes the review's brief, given as
  `"$(cat <the brief's file>)"`, never pasted between the quotes, where the shell would run what it holds.
- *Through a plug-in:* no plug-in of Kiro's for another tool is known.
- *On the host:* none: it has no review app there.

With none of these, a new chat in its editor is handed the brief.

- **What it reads:** an `AGENTS.md` at the root, always, and one in any folder it works in; the steering files under
  .kiro/steering, in which `#[[file:<path from the root>]]` pulls a file in. Its entry file from the starter kit,
  `.kiro/steering/core.md`, holds a line of that kind for each file `AGENTS.md` names, this part and
  `tools/other-builders.md`.
- **Handed a task:** in its editor, the brief as a chat's first message; from its command line,
  `kiro-cli chat --no-interactive "<the brief>"`, which reads its key from `KIRO_API_KEY`, set by the owner on the
  machine it runs on and never in a session's or a cloud environment's variables (floor rule 1).
- **Hooks:** it runs a command when a session starts (in its editor and command line version 3; a start hook's words
  join the agent's context), before a tool is used, which may block it, and when the agent stops, each set in a JSON
  file under .kiro/hooks (its page on hook triggers too). The starter kit's `.kiro/hooks/work-saved.json` runs the
  work-saved hook's copy merged into `main` at a session's start and when the agent stops; what Kiro does with a stop
  hook's exit and words, its documentation does not say, so #400's run shows it.
- **Its includes:** `#[[file:<path>]]` pulls in a whole file; one with a line range pulls in part, and counts for
  nothing where a file is read whole (`scripts/entry-files.mjs`).
- **Its folder:** .kiro (steering, hooks, its agents), which floor rule 3 protects.
