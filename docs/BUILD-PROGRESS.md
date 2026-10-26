# Build progress

Follows "Build order" in the design document (copy: `docs/intent/main/build-order/`; the builder rules are in
`.claude/rules/builder-rules.md`). One line per item: state, branch, report, and what was decided along the way. Items
are built on their own branch from `develop` and merged into `develop` when the tests pass and one reviewer has found
nothing blocking; `main` is never touched (Haakon merges `develop` into `main`). The whole order is built without
stopping at review points: their questions and the readings taken are listed under "For Haakon" and in each item's
report. Work goes on item after item until weekly usage nears 90% ("Usage" in the builder rules; decided 26 October
2026, replacing the stop after item 5 of 20 October).

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`.
Haakon's standing instructions given in chat are recorded word for word in `docs/archive/instructions.md`.

## For Haakon: review points

| Item | Review question | Reading taken | State |
|---|---|---|---|
| 4 | Are model characters too honest? Is the message-kind fallback for reopening needed? | Yes, on thin evidence (to be answered by stakes, not dispositions: item 11); no | Accepted by Haakon, 20 October |
| 4+ | Fix pass: standing orders now answer a move in the season it is made (reading of "fire a season late"); a threat to the homeland includes moves inside the mover's own land; no refusal and no failure of a king's own making wakes him (a route through other kings' troops remains); a failed attack on any of his land or troops wakes him; foreign levies beside his land wake nobody; a king's letters are in his view while their envoys are away; scribes rewrite copy marks and person ids, and a tablet is named by its seals and date (names can still differ between courts); narrator-written personas keep their text, with current trait words added; the isolation test's authority sits in every agent's definition and a paraphrased guard message fails it; the skim share is rounded to the shekel; "weighed light" means not a whole ten shekels; standing orders for every seat (built, with script kings using them) | Readings as listed; each with its alternative in `docs/rounds/2026-10-20-fix-pass.md` ("Review questions for the whole pass" and "Review questions" under the review findings) | Accepted by Haakon, 20 October (Haakon merges the fix-pass PR himself) |
| 5 | How long wars and games now run; does defence now dominate? Also: capitals fall in about half the games (53-58 of 100) — "most games"?; wars of attrition but 2-season capital sieges; the game ends as wars ripen (lengthen games in item 18?); allies cannot reach a friend's besieged city (passage, item 9?); only sworn partners relieve a besieged friend; walls against fleets vs a blockade rule for islands; the frozen baseline and the siege package; Mitanni falls most | Median 9-10 seasons from first entry to a capital's fall, never fewer than 3; capitals fall in about half the games; defence does not dominate outright but nearly does within today's game length (standing orders fire under once a game); game length and the ending rule left to item 18; details in `docs/rounds/2026-10-20-sieges.md` ("How long wars and games now run", "Does defence now dominate?", "Review questions") | Accepted by Haakon, 20 October: "most games" is judged in item 18 after game length is set; allies relieve a besieged city through item 9's passage grants, with no rule of their own; islands are protected by a blockade, built in item 7, replacing what item 5 built for them |

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 1 | Simulation fixes and default sleep | done (19 Oct), merged into `develop`; PR #7 merged into `main` | `round/simulation-fixes` | `docs/rounds/2026-10-19-simulation-fixes.md` |
| 2 | The visual overhaul | done (19 Oct), merged into `develop`; PR #8 merged into `main` | `item/visual-overhaul` | `docs/rounds/2026-10-19-visual-overhaul.md` |
| 3 | Small record items | done (19 Oct), merged into `develop`; PR #9 merged into `main` | `item/small-record-items` | `docs/rounds/2026-10-19-small-record-items.md` |
| 4 | Second agent simulation, with model characters (stop for review) | done (19 Oct), merged into `develop`; PR #10 merged into `main`; review accepted (20 Oct) | `item/second-simulation` | `docs/rounds/2026-10-19-second-simulation.md` |
| 4+ | Fix pass, item 4's follow-up (Haakon, 20 Oct), with the feature audit | done (20 Oct), merged into `develop`; PR #11 merged into `main` | `item/fix-pass` | `docs/rounds/2026-10-20-fix-pass.md` |
| 5 | The siege package (stop for review) | done (20 Oct), merged into `develop`; PR #12 merged into `main` | `item/sieges` | `docs/rounds/2026-10-20-sieges.md` |
| 5+ | TypeScript conversion, step 1: the rest of the docs and preview pass (`docs/items/docs-and-preview.md`) | not started | | |
| 5+ | TypeScript conversion, step 2: the conversion (`docs/items/conversion.md`) | not started | | |
| 5+ | TypeScript conversion, step 3: the fix pass for "Found during the port" (`docs/items/fix-pass.md`) | not started | | |
| 6a | The ending and the table | not started | | |
| 6b | Calls | not started | | |
| 6+ | The historical sources | not started | | |
| 7a | The map and the seas | not started | | |
| 7b | Travel and news | not started | | |
| 8 | Structured press | not started | | |
| 9 | Envoy authority and passage | not started | | |
| 9+a | The economy at home | not started | | |
| 9+b | The economy abroad | not started | | |
| 10 | Characters, first package: who they are | not started | | |
| 10+a | People at home | not started | | |
| 10+b | People across borders and in kings' hands | not started | | |
| 11a | Money and work | not started | | |
| 11b | Roads and reputations | not started | | |
| 11+ | City-states as powers | not started | | |
| 12 | Languages | not started | | |
| 13 | Command at a distance | not started | | |
| 14 | Legends | not started | | |
| 15 | Infrastructure and policing | not started | | |
| 16 | The royal council | not started | | |
| 17 | How cities become free | not started | | |
| 18 | The balance pass | not started | | |

## Found during the port

Flaws found while porting to TypeScript (`docs/CONVERSION-PLAN.md`): listed here, not fixed during the port. Empty
until the conversion starts.
