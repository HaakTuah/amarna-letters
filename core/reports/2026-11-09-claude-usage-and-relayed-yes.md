# Claude's usage in Claude's file, and the owner's word relayed (9 November 2026)

The owner's answers of 9 November (core archive 77 and 78), made here:

- **Usage in Claude's own file.** Everything about the reserve, the brake and the usage check is Claude's alone
  (`scripts/usage.sh` reads Claude's own status line), so it moves from `modules/usage.md`, which every builder read at
  the start, to "Usage" in `modules/claude.md`, which only Claude reads; how the orchestrator spreads the work across
  providers moves to `modules/orchestrating.md`. `modules/usage.md` is removed and every pointer to it updated. Floor
  rule 16 is unchanged. A Codex session reads about 1.5 KB less at every start.
- **His word in the design chat counts** (floor rule 4): the design session, the one session he works with directly,
  relays it word for word in a signed comment and keeps it in the archive; no other agent relays his word.

Not yet here: settled questions answered on his behalf. The owner asked first whether the places a builder checks are
enough, and whether a stronger model should try to predict his answer before a question reaches him; the design
session's answer and its plan go to him before that rule is written.

The games take both changes with their copy of the core (step 3 of "The shared core" in each), not in their own files
now: a shared rule changes in the core only.
