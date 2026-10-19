# Build progress

Follows "Build order" in the design document's main tab (set 19 October 2026; 17 items as read at the start of item 3). One line per item: state, branch,
report, and what was decided along the way. Items are built on their own branch from `develop` and merged into
`develop` when the tests pass and one reviewer has found nothing blocking; `main` is never touched (Haakon merges
`develop` into `main`).

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 1 | Simulation fixes and default sleep | done (19 Oct), merged into `develop`; PR #7 merged into `main` | `round/simulation-fixes` | `docs/rounds/2026-10-19-simulation-fixes.md` |
| 2 | The visual overhaul | done (19 Oct), merged into `develop`; PR #8 merged into `main` | `item/visual-overhaul` | `docs/rounds/2026-10-19-visual-overhaul.md` |
| 3 | Small record items | done (19 Oct), merged into `develop`; PR `develop` -> `main` open for review | `item/small-record-items` | `docs/rounds/2026-10-19-small-record-items.md` |
| 4 | Second agent simulation, with model characters (stop for review) | not started | | |
| 5 | The siege package (stop for review) | not started | | |
| 6 | Memory and call size | not started | | |
| 7 | Travel on the map, and news travels | not started | | |
| 8 | Structured press | not started | | |
| 9 | Envoy authority and passage | not started | | |
| 10 | Characters, first package | not started | | |
| 11 | Characters, second package (stop for review) | not started | | |
| 12 | Languages (stop for review) | not started | | |
| 13 | Command at a distance (stop for review) | not started | | |
| 14 | Legends | not started | | |
| 15 | Infrastructure and policing (stop for review) | not started | | |
| 16 | The royal council | not started | | |
| 17 | City-states as script bots (stop for review) | not started | | |

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

**Item 1 closed, 19 October.** Parts G, E and H finished and reviewed (one reviewer each; the only blocking finding, in Part H, was fixed); the report and DESIGN-NOTES refreshed; benchmarks before and after run (all replays exact, nothing tuned). `develop` was created from `main` and the round merged into it with a merge commit (633 tests pass on `develop`). PR #7 (https://github.com/HaakTuah/amarna-letters/pull/7) carries `develop` into `main` for Haakon to review.

**PRs at milepoints** (Haakon, 19 October): each time an item is merged into `develop`, `develop` is pushed and a PR from `develop` to `main` is opened (or an open one picks up the new commits). If a PR was squash- or rebase-merged, `main` is merged back into `develop` before the next push.

**Decided along the way** (details in the report): following the Build order's rules, from here on one reviewer per
part and no extra analyst workflows; the item's report moves to `docs/rounds/2026-10-19-simulation-fixes.md` when the
item is done, since the Build order puts every item's report there.

## Item 2: the visual overhaul (19 October)

Specification: `docs/prompts/VISUAL-OVERHAUL.md` (committed first on the branch; its opening line corrected by Haakon
to put watching on a phone first, `dd82ff6`) and "The map (planned next)" in the design document's main tab. Built in
one pass, one reviewer, one fix pass. The reviewer's one blocking finding (a court's view said how land changed hands
when it had not seen the march) was fixed with a test, with five minor notes and one more bug found along the way
(god view redrew a fallen court's last orders). Haakon then added years counted from 1345 BCE to the date label
(`b8dd3e9`, display only: kings' prompts keep the game year); the phone header's ending line now uses the short
form with the turn in its tooltip (`413093b`). 654 tests pass on `develop`; seeds 1-10 replay exactly.

**Decided along the way** (details in the report): presentation only, with display data (terrain, date helpers) in
the engine project that nothing in the engine reads; a new test project `tests/Amarna.Web.Tests`; the browser build
trims the unused Anthropic SDK (5.0 to 3.2 MB). Not met on a slow emulated phone: playing a season blocks the page for
up to about 3 s (the script kings' look-ahead on the single WebAssembly thread) and a first load over slow 4G takes
about 20 s; the fixes (a Web Worker or ahead-of-time compilation, splitting the SDK path out of `Amarna.Llm`) are
not presentation and were left. Left as an engine matter: the engine's seat view lists a foreign spy posted at a
court with its employer. No physical phone was used.

**PR #7** (item 1) was merged into `main` with a merge commit, so `develop` was fast-forwarded to `main` before
item 2 was merged; no merge back was needed.

## Item 3: small record items (19 October)

Specification read fresh from the live document at the start of the item (the Build order had grown to 17 items; the
table above follows it). Built in one pass, one reviewer (nothing blocking, seven minor notes), one fix pass (six fixed,
one left with its reason). Save version 3. 686 tests pass on `develop`; seeds replay exactly within the version.

**Decided along the way** (details in `docs/rounds/2026-10-19-small-record-items.md`): a court's archive is every tablet
it holds a copy of, with no new state; spies and conquerors copy, nothing is stolen (stealing is listed under "Not built
yet"); a ceded capital counts as taken. Every gold delivery leaves an inventory tablet in the receiver's archive at no
cost, so a swap has something to be examined; an envoy that kept all the gold cannot swap. Script kings were given no
new behaviour (they never examine inventories), so script swaps are never caught; the engine's examination path is
tested. Characters' gold was already tracked; gains are now counted by source (characters spend nothing yet), and
wealth is purse plus back pay owed. **Benchmarks** (nothing tuned): wins shifted in 13-14 seeds per hundred, most likely
because the new tablets take ids from the game's one id counter and so move later rolls; Arzawa won 7 of seeds 1-100
(12 before) and 14 of 101-200 (11 before); against the frozen baseline, growth 2.67 (2.64) and wins 73% (71%).

**PR #8** (item 2) was merged into `main` with a merge commit; `main` was merged back into `develop` (no content change).
