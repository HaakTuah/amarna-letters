# Build progress

Follows "Build order" in the design document's main tab (set 19 October 2026; 18 items, with the builder rules as read
on 20 October). One line per item: state, branch, report, and what was decided along the way. Items are built on their
own branch from `develop` and merged into `develop` when the tests pass and one reviewer has found nothing blocking;
`main` is never touched (Haakon merges `develop` into `main`). Since 20 October the whole order is built without
stopping at review points: their questions and the readings taken are listed here, under "For Haakon", and in each
item's report.

## For Haakon: review points

| Item | Review question | Reading taken | State |
|---|---|---|---|
| 4 | Are model characters too honest? Is the message-kind fallback for reopening needed? | Yes, on thin evidence (to be answered by stakes, not dispositions: item 11); no | Accepted by Haakon, 20 October |
| 4+ | Fix pass: standing orders now answer a move in the season it is made (reading of "fire a season late"); a threat to the homeland includes moves inside the mover's own land; no refusal and no failure of a king's own making wakes him (a route through other kings' troops remains); a failed attack on any of his land or troops wakes him; foreign levies beside his land wake nobody; a king's letters are in his view while their envoys are away; scribes rewrite copy marks and person ids, and a tablet is named by its seals and date (names can still differ between courts); narrator-written personas keep their text, with current trait words added; the isolation test's authority sits in every agent's definition and a paraphrased guard message fails it; the skim share is rounded to the shekel; "weighed light" means not a whole ten shekels; standing orders for every seat (built, with script kings using them) | Readings as listed; each with its alternative in `docs/rounds/2026-10-20-fix-pass.md` ("Review questions for the whole pass" and "Review questions" under the review findings) | Accepted by Haakon, 20 October (Haakon merges the fix-pass PR himself) |
| 5 | How long wars and games now run; does defence now dominate? Also: capitals fall in about half the games (53-58 of 100) — "most games"?; wars of attrition but 2-season capital sieges; the game ends as wars ripen (lengthen games in item 18?); allies cannot reach a friend's besieged city (passage, item 9?); only sworn partners relieve a besieged friend; walls against fleets vs a blockade rule for islands; the frozen baseline and the siege package; Mitanni falls most | Median 9-10 seasons from first entry to a capital's fall, never fewer than 3; capitals fall in about half the games; defence does not dominate outright but nearly does within today's game length (standing orders fire under once a game); game length and the ending rule left to item 18; details in `docs/rounds/2026-10-20-sieges.md` ("How long wars and games now run", "Does defence now dominate?", "Review questions") | Accepted by Haakon, 20 October: "most games" is judged in item 18 after game length is set; allies relieve a besieged city through item 9's passage grants, with no rule of their own; islands are protected by a blockade, built in item 7, replacing what item 5 built for them |

## Builder rules added on 20 October (from the live document and Haakon's message)

- Review points do not stop the build; their questions go above and in the item's report.
- No model games until every item is built; script games and stand-in repliers check everything.
- "Every feature is every seat's": every item tests the script kings and characters on its new rules, reports usage and
  success per new feature, and patches every weakness found, with benchmarks before and after; once, at the start of
  the next item begun (the fix pass), every feature built so far is audited the same way.
- Safety checks are never overridden (refined by Haakon on 20 October): if a check that guards against something unsafe
  or irreversible fails (agent isolation before any agent starts, anything touching `main`, keys or spending), stop that
  step and ask, and go on with other work meanwhile. An ordinary failing test is not a reason to stop: fix it, or mark
  the item blocked with the reason and go on to the next item that does not depend on it.
- Standing orders answer a blow in the same season, for every seat (accepted 20 October), so the pace of war is measured
  with script kings using standing orders, and item 5 reports whether walls, sieges and same-season standing orders
  together make defence dominate (reported, not tuned: item 18). In item 13, standing orders become part of a
  commander's mandate ("Standing orders belong to commanders", Ideas tab); nothing changes before then.
- "Requests are rules too": no field in a request may imply something untrue; ask only what applies, show no internal
  ids a model could repeat, keep the engine's outcomes apart from a character's words.
- A PR at every milestone: after each merge into `develop`, check the previous PR; if it was merged, merge `main` back
  into `develop` first, then push and open a new PR.
- Usage: this session may go up to 95% of the weekly limit, then stops at a clean commit.

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 1 | Simulation fixes and default sleep | done (19 Oct), merged into `develop`; PR #7 merged into `main` | `round/simulation-fixes` | `docs/rounds/2026-10-19-simulation-fixes.md` |
| 2 | The visual overhaul | done (19 Oct), merged into `develop`; PR #8 merged into `main` | `item/visual-overhaul` | `docs/rounds/2026-10-19-visual-overhaul.md` |
| 3 | Small record items | done (19 Oct), merged into `develop`; PR #9 merged into `main` | `item/small-record-items` | `docs/rounds/2026-10-19-small-record-items.md` |
| 4 | Second agent simulation, with model characters (stop for review) | done (19 Oct), merged into `develop`; PR #10 merged into `main`; review accepted (20 Oct) | `item/second-simulation` | `docs/rounds/2026-10-19-second-simulation.md` |
| 4+ | Fix pass, item 4's follow-up (Haakon, 20 Oct), with the feature audit | done (20 Oct), merged into `develop`; PR `develop` -> `main` open | `item/fix-pass` | `docs/rounds/2026-10-20-fix-pass.md` |
| 5 | The siege package (stop for review) | done (20 Oct), merged into `develop`; PR `develop` -> `main` open | `item/sieges` | `docs/rounds/2026-10-20-sieges.md` |
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
| 18 | The balance pass | not started | | |

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

## Item 4: second agent simulation, with model characters (19 October) — stopped for review

Specification read fresh from the live document at the start of the item (it now opens with three fixes; the Build
order has 18 items and a balance rule: first guesses during the build, tuning in item 18). Haakon added a fourth fix
during the item: an id counter per kind of object. Built by one workflow (fixes (a) and (c), characters as agents,
local play; fix (b) in parallel in its own worktree; an integrator; one reviewer, whose one blocking finding was
fixed) and fix (d) in its own worktree, merged afterwards with one save version 4 for (a) and (d). 742 tests pass on
`develop`; seeds replay exactly within version 4. Report: `docs/rounds/2026-10-19-second-simulation.md`, ending with
"For the review".

**The simulation ran in this session.** New agent types load into a running session at a later turn boundary, so the
kit's `setup.js` was rerun after fix (d) renumbered the characters, and the games were driven by a workflow script with a
guarded poller agent (`sim/workflow-driver.js`, `.claude/agents/sim-poller.md`, `sim/poller-guard.js`) instead of the
session's own loop. Seeds 7 and 15, ten seasons each, sleep on: both ran to the end (Egypt won both), 543 agent calls
with no retry and no fallback, all debriefs back, audit clean. The live isolation test passed every check but "at least
4 blocked attempts" (the agents tried one or two forbidden steps and reported the rest as blocked); the orchestrator
went ahead on the dry check, the live hook logs and the audit, and the report says so.

**Usage.** Haakon raised this session's cap from 50% to 70% and asked that game 2 start only if a full game, estimated
after two or three seasons of game 1, could finish below 70%. Estimated after season 3 at about 5-7 weekly points a game;
the cap was cleared. Measured: the weekly limit went from 35% before the isolation tests to 47% after both games and
debriefs (about 9-10 points, 15.85 million agent tokens), and 54% at the stop, after both games' analysis and the report.

**For the review** (details in the report): model characters are too honest (yes, on thin evidence: no gold kept in
317 decisions; prime them harder after fixing the request texts that distort the measure, then test in a game that
tempts the greedy); the message-kind fallback for reopening is not needed (3 of 4 courts held asleep reopened, under 2%
of the kings' tokens; kings named the next season in 114 of 130 orders replies, so the lever is why kings will not
sleep). The report lists about twenty defects found, none fixed in this item. Fix (b) met the no-freeze target but not
"much faster" first load (15% smaller; the gap needs a Brotli host or tooling that needs administrator rights). One
intermittent test noted: `LocalPlayTests.A_game_with_local_agent_kings_sleeps_by_default_and_replays_exactly`.

**PR #9** (item 3) was merged into `main` with a merge commit; `main` was merged back into `develop`.

## Item 4+: the fix pass, item 4's follow-up (20 October)

Specification: Haakon's message of 20 October, word for word in `docs/prompts/FIX-PASS.md` (parts 1-4 and his three
additions), with the live document's builder rules read fresh. Built by two workflows: two lanes in parallel (sleep
rules, request texts and the isolation test; the skim, the checks and the feature audit in their own worktree), an
integrator, one reviewer (three blocking findings, fixed), then a follow-up for the three additions and standing orders
for every seat, with its own reviewer (one blocking finding, fixed). Save version 5. 901 tests pass on `develop`; seeds
replay exactly. The real simulation kit was remade (`sim/setup.js --seeds 7,15 --force`) and its dry isolation check
holds. Report: `docs/rounds/2026-10-20-fix-pass.md`.

**Decided along the way:** kings never choose when they wake; standing orders answer a move in the season it is made,
and every seat keeps them (script kings give about 53 a game, 82 fired in seeds 1-100, 72 of them better than the
season's orders); the feature audit, once, covered every feature built so far (inventories examined, skimmers dismissed,
convoys, gifts of troops, cessions, recalls, second audience exchanges, envoys' commitments, among others); benchmarks
before and after each change are in the report. Left for item 5's audit: wall guards and fleet retreats that never
succeed, and Mitanni's numbers. Two intermittent tests noted (`LocalPlayTests` and `FileCharacterTests`, both
passing on rerun).

## Item 5: the siege package (20 October)

Specification read fresh from the live document at the start of the item (main rev 256, Ideas rev 120), with question 5
of the old round report. Built by one workflow in three stages (walls, sieges, capitals and the fallen player; terrain;
the script players and the pace of war), one reviewer (three blocking findings: two seat-view leaks, of absorption
marks and of wall levels, and a rulebook sentence no longer true; all fixed), and a fix step. Save version 6. 1,008 tests
pass on `develop`; seeds replay exactly. Report: `docs/rounds/2026-10-20-sieges.md`.

**Decided along the way** (details in the report): walls by place (capitals 3, ten fortresses 2, six walled towns 1);
storming, besieging, sallies, fortifying with upkeep, earthquakes lowering walls; envoys caught leaving a besieged capital;
a kingdom falls with its capital and its land passes down the chain of takers; slow absorption of yield and score; the
capital wake trigger retired for siege triggers; a fallen player's god view (a table setting); terrain helps a unit
standing its ground; deserts cost an army outside its own land; a court sees walls only where it sees troops. Script
kings use every new feature (sieges won 1,128 of 1,201 begun per 100 games, storms, sallies, relief, fortifying, coastal
walls, besiegers' standing orders). Haakon's question on whether defence now dominates is answered in the report.
Benchmarks: weak-power wins fell, bribes and skims fell; reported, not tuned.

**Usage:** this session went from 63% to about 93% of the weekly limit over the fix pass and item 5; stopped here, as
Haakon set (wrap up near 95%). Next: item 6 (memory and call size), reading it fresh from the live document.

## Haakon's answers to item 5's review, and what comes first in item 6 (20 October)

From the live design document (Haakon, 20 October):
- **"Most games"** (capitals falling in about half the games) is judged in item 18, after game length is set.
- **Relief of a besieged ally** comes through item 9's passage grants, with no rule of its own.
- **Islands** are protected by a blockade, built in item 7, replacing what item 5 built for them (the script island
  king walling its coast).
- **New since item 5, built first in item 6:** the random ending is revised (any season may be the last from the first
  season, a median end of 1332 BCE, a cap of 90 seasons), and the first year moves from 1345 to 1346 BCE.

**Stopped on Haakon's word (20 October):** do not start item 6 or any other work until Haakon says to continue. When he
does, read item 6 and the builder rules fresh from the live document.
