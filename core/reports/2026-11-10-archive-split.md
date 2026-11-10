# The archive split by item number

`archive/instructions.md` had passed the *large file* mark (52,542 bytes), so, before anything more is added to it, it
is split in a PR of its own (Step 0 in `modules/how-to-work.md`; found by the rule-file audit, #47).

- **`archive/instructions.md`** keeps how the owner's words are kept, and becomes the index: which file holds item N.
  Every pointer to it (`README.md`, `AGENTS.md`, every "core archive N") still resolves.
- **`archive/instructions/items-001.md`** (items 1 to 40, 16.6 KB), **`items-041.md`** (41 to 81, 17.4 KB) and
  **`items-082.md`** (82 onward, 18.2 KB). By number, not by date: items are cited by number, and their dates (the
  date of the words, not of the filing) are not in order. A new item goes at the end of the newest file; past about
  20 KB, the next starts a new file named for its number.
- **Unchanged:** every one of the 121 items, compared text for text with the file on `main` before the split.
- **What it saves:** a reader looking for one item, or the stand-in searching, opens a file of about 17 KB instead of
  52 KB.

Readings taken: none. Questions for the owner: none.
