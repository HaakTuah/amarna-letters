# Build progress

Follows "Build order" in the design document's main tab (set 19 October 2026). One line per item: state, branch,
report, and what was decided along the way. Items are built on their own branch from `develop` and merged into
`develop` when the tests pass and one reviewer has found nothing blocking; `main` is never touched (Haakon merges
`develop` into `main`).

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 1 | Simulation fixes and default sleep | in progress | `round/simulation-fixes` | `docs/rounds/2026-10-19-simulation-fixes.md` |
| 2 | The visual overhaul | not started | | |
| 3 | Small record items | not started | | |
| 4 | Second agent simulation, with model characters (stop for review) | not started | | |
| 5 | The siege package (stop for review) | not started | | |
| 6 | Memory and call size | not started | | |
| 7 | News travels | not started | | |
| 8 | Structured press | not started | | |
| 9 | Envoy authority and passage | not started | | |
| 10 | Characters, first package | not started | | |
| 11 | Characters, second package (stop for review) | not started | | |
| 12 | Languages (stop for review) | not started | | |
| 13 | Command at a distance (stop for review) | not started | | |
| 14 | Legends | not started | | |

## Item 1: stock taken on 19 October 2026, before any change

The round was interrupted on 18 October when the weekly usage limit ran out, in the middle of Parts G and E.
Specification: `docs/ROUND-PROMPT.md` and `docs/ROUND-PROMPT-ADDITIONS.md` (the owner's later instructions, word for
word). The report so far is `docs/ROUND-REPORT.md` (now `docs/rounds/2026-10-19-simulation-fixes.md`).

**Committed on `round/simulation-fixes`** (each part implemented, reviewed by two or three adversarial reviewers, and
fixed, unless noted):
- Moves of the old prompt and report to `docs/rounds/`; this round's prompt and later instructions saved word for word.
- Part A (bugs from the simulation and the old list), both halves; the script-bot fixes were built in a side worktree
  (`round/simulation-fixes-bots`) and cherry-picked.
- Part B (contracts: notice, staggered terms, renewal order, script kings' renewals and the overdue-dismissal rule).
- Part C (how a season resolves, refusals in its words, every failure reported, standings, travel line, view table).
- Part D (default sleep, hidden cap of 12, unit-bound scheduled orders, marches, standing orders, the new wake list).
- Part F (the file-seat footer and the kit notes; built in `round/simulation-fixes-kit` and cherry-picked).
- Part G, first half, **not yet reviewed**: `f1a6a18` back pay paid on return (replacing covered wages), `9fa3f26` the
  shared strength function and characters weighing back pay.
- 568 tests passed at the end of Part D; the suite has not been run on the two Part G commits since the interruption.

**In progress, not trusted until checked:**
- Part G, uncommitted in the main checkout: a small change to `TurnEngine.Sleep.cs`, `Prompts.cs` and `SleepTests.cs`
  and a new `WakeTriggerTests.cs` (the capital trigger and/or change-based triggers). To be read, tested and either
  finished or redone.
- Part E, in the worktree `scratchpad/memory-wt` on `round/simulation-fixes-memory`: three commits, not yet reviewed —
  `bcd748b` notes kept three seasons in full under the king's own summary, `3dc4dea` the ledger of dealings, `7593a6f`
  five echoes from the archive in the primer. The request-size measurement (the owner's section-by-section spec) was
  started outside the repository and not finished.

**Left for item 1:**
1. Part G: check the two commits (suite, one reviewer); finish G2 (temporary trigger for troops arriving next to the
   capital), G3 (every trigger fires on a change; the treasury trigger re-arms) and G4 (losses abroad reach other courts
   by carriers); list the changed triggers and the dismissal-rule decision for the report.
2. Part E: review the three commits, merge them onto the branch, finish the request-size measurement and the
   next-round candidates.
3. Part H: an envoy wakes a sleeping king for an audience call with a compact picture of his realm, where he may send
   letters and choose to reopen his orders; the order triggers reopen orders directly; count the reopen rate; measure
   the audience-call size.
4. Benchmarks (seeds 1-100, 101-200 and the frozen baseline), compared with the numbers on `main` before the round.
5. The report: Parts E, G and H, benchmarks, request sizes, the replay numbers (already drafted), what a king now reads
   (quoted from the code), everything left out or changed and why; refresh `DESIGN-NOTES.md` ("Where the code differs
   from the design document" and "Not built yet").
6. Create `develop` from `main`, merge the item, and update this file.

**Update, 19 October, 07:40.** Parts G and E were resumed from the work above. Two duplicate writers ran for a few
minutes and were all stopped: yesterday's restarted workflow was still alive (its log showed only "started"), a second
workflow was launched over it, and messages to its agents started second copies of them. Nothing was lost:
`f1a6a18` and `9fa3f26` (G1) and `f03986e` (G2, the capital trigger) are committed and passed the full suite and the
replay checks before each commit; the leftover stash was an earlier copy of G2 and was dropped. Still to do in Part G:
G3 (triggers on changes) and G4 (loss rumours). Part E's three commits stand; its request-size harness outside the
repository was touched by two agents at once and is not trusted.

**Decided along the way** (details in the report): following the Build order's rules, from here on one reviewer per
part and no extra analyst workflows; the item's report moves to `docs/rounds/2026-10-19-simulation-fixes.md` when the
item is done, since the Build order puts every item's report there.
