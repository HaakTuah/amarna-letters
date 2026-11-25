# Antigravity's part

Read by a session of the tool `antigravity`, and by whoever hands it a task or a review. Taken from its
documentation's page on rules (antigravity.google, read on 15 November 2026) and nothing else, until it passes the
staged cases (`tasks/tools.md`).

Its reviews by each way:
- *Side by side:* none, with no command line of its known.
- *Through a plug-in:* nothing of the kind is documented.
- *On the host:* none.

With none of these, a project asks in its editor, a new conversation given the review's brief, as `tasks/tools.md`,
"Each tool's part", says of a tool with no review app.

- **What it reads:** `AGENTS.md`, GEMINI.md and the rules under .agents/rules (or the older .agent/rules), in the
  folder it works in and each folder above it up to the repository's root, never one below. In a rule,
  `@[<name>](<path from the rule's folder>)` pulls a file in, and `trigger: always_on` loads the rule on every turn.
  The starter kit writes `.agents/rules/core.md` for it, one such line for each file named on an `@` line of
  `AGENTS.md`, with this part and the part for a session of another tool.
- **Handed a task:** in its editor, the brief as a new conversation's first message; the core knows no command line of
  its.
- **Hooks:** its documentation names none.
- **Its folders:** .agents and .agent, with GEMINI.md, which floor rule 3 protects.
