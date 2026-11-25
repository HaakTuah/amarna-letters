# The reasons behind the core: issue #1086

The index, and how an item is written: `archive/instructions.md`.

#1086. **22 November 2026**, #1086, a design the owner agreed to in a chat session with the adviser. The owner may add,
     once and by hand, three entries to `autoMode.allow` in the owner's own user settings, so that auto mode lets
     through, in the owner's own repositories, an edit of an issue's or a comment's text, the run of a program the core
     fetched and checked against its pinned SHA-256, and the deletion of a branch the session itself created; no
     session writes them or asks for them, and they reach only the computer whose settings hold them, never a cloud
     session, which reads no user settings. On 20 and 21 November
     2026 auto mode refused each of those steps, and each then waited on the owner. Prose entries keep the classifier
     judging each step, where a permission rule would skip it. It stands behind "The owner may allow three steps once"
     in `tools/claude-auto-mode.md`.
