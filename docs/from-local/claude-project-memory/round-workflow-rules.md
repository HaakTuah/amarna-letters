---
name: round-workflow-rules
description: "How the owner runs a round in amarna-letters (prompt saved word for word, branch and PR flow, frozen balance, rule text and DESIGN-NOTES in the same commit)"
metadata:
  node_type: memory
  type: project
  originSessionId: 246a2c6e-d357-4ae0-9392-9e7a385aed81
  modified: 2026-10-18T11:56:59.018Z
---

Standing rules the owner has set across rounds (word for word in [[owner-message-log]]; the current round's prompt is `docs/ROUND-PROMPT.md`, older ones in `docs/rounds/`):

- Save each round prompt word for word as `docs/ROUND-PROMPT.md` and move the old one (and its report) to `docs/rounds/`, as the first commit on the new branch. Additions given mid-round are kept word for word too.
- Branch from `main` after the previous PR is merged; commit each part separately; open a PR; never merge and never push to `main` without the owner's approval.
- Balance is frozen (since 18 October 2026): rerun and report bot benchmarks after bot changes, never tune.
- Every rule a king needs is in the rulebook or the seat view; a rule change updates the king's text and `docs/DESIGN-NOTES.md` in the same commit. New rules mean a new save version when the log format changes.
- The owner often works asleep or away: take the most reasonable reading, write it in the round report, carry on; stop only before something irreversible.

**Why:** the owner reviews by reading the round report and DESIGN-NOTES, and replays games by seed.

**How to apply:** follow these on every round without being told again; check the current `docs/ROUND-PROMPT.md` for what differs this round.
