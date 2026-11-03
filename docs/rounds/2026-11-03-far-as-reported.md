# Far land as last reported (bug #540, side lane, 2 November 2026)

PR #579. Issues #540 and #589 (the far yields, filed apart by the workshop). Issue #540: a far province's economy, works, people and caravans, and the realm's totals, were shown as they
are, not as last reported ("Distance inside your own realm", item 13; "Hidden information" in `AGENTS.md`). The twin
canary of #537 (`src/web/test/twin-canary.test.ts`) was the guide: every #540 entry of its list of known leaks is gone,
and the one part left is question #587.

## Step 0

`src/engine/src/turn/economy.ts` was 50.1 KB on `develop` when the lane began (49.4 KB in the brief). Its changes here are
lines changed in place (the harvest's report split near and far, a caravan's end and setting out through one helper each,
its notices and events by the road); the new work is in new files (`rules/province-reports.ts`, `rules/caravans-known.ts`,
`model/province-reports.ts`). `resolve.ts` lost `ledgerStrength`, now unused. Round 1's review held that a file past the
mark must be split first, in its own PR: #599 moved the caravans on the road to `turn/caravans.ts` (17 KB), behaviour
proven unchanged, leaving `economy.ts` at 34 KB; this lane's caravan changes went in there.

## What changed

- **Province reports** (`model/province-reports.ts`, `rules/province-reports.ts`): as each season begins, every held
  province's report of the season just ended is kept (`GameState.reports`): its economy view, its works, its worth and
  holdings for strength, and its last reaping; eight seasons, the first (labelled 0) the land as the game began. A court
  shows a province it knows it holds beyond its sight as the report of the season the word of its holder is from
  (`knownHolders`, the same clock), dated (`ProvinceEconomyView.reported`). It replaces `GameState.ownLast`, which kept a
  report only of land lost, at the moment it was lost (newer than its word).
- **Works, walls, yields, the `build` check:** the view's works, `wallsKnown`, the yields and the `build` check's level
  read the same reports (`ownWorks`, `knownLevel`, `ValidatorContext.knownWork`).
- **Strength** (`SeatView.strength`, the standings panel's growth): reckoned from what the court knows, its land and stores
  as last reported, its troops and caravans as their reports have them, walkers bound for land it knows it holds, gold by
  its ledger. `TurnEngine.ledgerStrength` is gone.
- **Caravans** (`Caravan.trail`, `GameState.caravansGone`, `rules/caravans-known.ts`): a report as a caravan sets out and as
  each season ends; one that ended is kept a while. A court knows a caravan once word of its setting out could come, then
  by its newest report whose word has come, and drops it once word of its end comes.
- **Notices and events by the road:** a far province's harvest, and grain lost there for want of room, come home as its
  report (`EconomyTitle`, `tell`); the season's treasury notice sums only the near; a far province's works' cost goes with
  its works report, not the season's total; every caravan notice (arrival, home, tolls, seizure, turned back, robbed,
  deserted) is told from where it happened, and their events and the works' events are visible to the king only where his
  couriers reach (`nearOf`).
- **A caravan home to a far province** sends its gold, its word of markets and tolls and any archive on to the court as a
  load (`lootHome`), as a far market's proceeds do.
- **The web map's card** shows the figures of a far province of the seat's as of the season the word of its holder is
  from (`ownFiguresAt`), never newer.
- **Rulebook, seat view, README, design notes:** the rulebook's command rules and the seat view's provinces ("as reported in
  turn N"), the README's map paragraph, `docs/design/35-command-at-a-distance.md` ("Far land as last reported"), 47 and 01.
- **Save version 51** (49 and 50 went to #548 and #576).

## Readings taken

1. **One clock.** A report is dated by the season it reports, and shown when word of that season would have come, as
   `knownHolders` times who holds the land (`wordSeasons`; here word = couriers + 1, so the caravans' courier clock agrees).
   Principle: one fact, one place; the view, the checks and the map agree.
2. **A siege begun after a report's season is not in it** (its tax): a report knows what was so as its season ended, as
   `siegesKnown` dates a siege by its beginning.
3. **A caravan is known once word of its setting out could come.** One from a far province hurrying into near land would
   otherwise be seen before that word, telling the court the far order succeeded. Principle: "Hidden information"; a
   traveller is never ahead of the word of his own setting out.
4. **A far province's tax is shown by its stores, not told each season;** only its harvest, or grain lost for room, comes
   home as a notice, so a large realm's inbox is not filled each season. Principle: requests are rules too; ask only what
   applies.
5. **The `raze` check is unchanged:** it reads another's works, which no view shows; #540 is a court's own land.
6. **Strength counts ships in cargo service by their cargo as last reported,** not their crews' food and savings, which
   their reports do not carry; troops' savings are counted as they are (the court pays them).
7. **The porters' pay of a far caravan** is left as it was, since fixing it changes a rule: question #587. The twin canary
   lists `view.gold` and `view.strength` under it.

## Review, round 1

Codex (three P1) and Claude's reviewer (Opus, high: 5 of 10, eight blocking, five not) found, and this round fixed:

1. **The web map drew a seat's own caravans as they are** (Opus 1): the map now draws them as the view does
   (`Views.caravansKnown`, `SeasonFrame.knownCaravans`); its tooltip and the README say so.
2. **Far works paid in gold left the treasury at once** (Opus 2): the same rule as the porters' pay, so question #587 now
   asks it too; the twin canary plays far works paid in gold, and its #587 mask holds only in the twins whose orders
   spend far off, and names the treasury notice's sum.
3. **The map card was a season behind** (Codex, Opus 3): a frame of turn T holds the land as season T - 1 ended; a test
   of dated far land now proves it.
4. **A caravan home to a far province heard its word at once** when it carried no gold (Opus 4): its word goes on as a
   load too, handed off, the old caravan given a fresh one (Opus 12).
5. **The setting-out gate read the current route** (Codex, Opus 5): the trail keeps the first report, and the gate and
   the caravan's notices and events (`caravanTell`, `caravanNear`) read it.
6. **Strength read far troops' savings and walkers as they are** (Opus 6): the trail carries savings, and walkers count
   once word of their setting out could come.
7. **A caravan's place had no date** (Opus 7): `CaravanView.reported`, and "as reported in turn N" in the seat view.
8. **Leftovers** (Opus 8): `Views.provinceEconomy` and `Views.ownKnown` removed.
9. **A report newer than the word** (Opus 9): never; none known instead.
10. **Save size** (Opus 10): reports are 25% of a turn-13 state in memory (the save is the log); kept seven seasons, as
    far back as `knownHolders` looks.
11. **The strength formula copied** (Opus 11): the province and carried worths are one function each, used by the engine
    and the view.
12. **Step 0** (Codex): split first, #599.
13. **Outside #540** (Opus 13): a far unit destroyed out of sight leaves the view at once, bug #600.

One idea (Opus): an express report, filed as #601.

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay`, each run alone on the machine (#552), at the final code: before on
`develop` at `c61580c4` (with #599), after on this branch at `de4dea31`. Every game replays exactly, 20 of 20, before
and after, and every game lasts as many seasons as before. 12 of the 20 have a different winner, since the script kings
read their view (their far land, caravans and strength as last reported). Kingdoms fallen: 326 against 333. The first
fall still comes in season 4.5 on the median (range 4-5), and no kingdom falls in the first two seasons, so play stays
playable. Seats risen in play: 41 against 49. No balance was tuned, as the frozen-balance rule asks. A bug fix adds no
feature, so there is no use against ignore to measure. (The first measurement, before round 1, at `1bd2bd58` against
`954bf746`: 320 against 306 fallen, 13 winners different, every game replaying.)

## Review, round 2

Claude's reviewer: 8 of 10, every round-1 point confirmed fixed; two blocking and four not, all fixed:

1. **A word-only load was a new rule** (blocking): a caravan home to a far province with no gold or archive sent its word
   on as an empty load that paid porters. Now its word stays with its last report among the caravans gone and is heard
   when word of its homecoming could come (`caravanWordsHome`); loads carry gold and archives only.
2. **Benchmarks before round 1's changes** (blocking): rerun at the final code, above.
3. **The #587 mask hid the whole treasury notice:** the twin canary now compares the notice's balance as `view.gold`,
   so the mask excuses nothing else in it.
4. **A near caravan's notice a season late:** `caravanTell` delivers at the season word of its setting out comes
   (`tellAt`).
5. **Untested paths:** an engine test (`caravans-known.test.ts`) of a turn-around in near land and of a far
   homecoming's word.
6. **Wording:** "as reported in turn N" on the map too.

Codex (one P1): word once come could go back as the year's roads lengthen (`wordTo` reckons today's season). Fixed:
`courierSeasons` takes the season, and `wordCame` and the setting-out word read the road of the report's own season;
tested with a caravan set out at Hattusa.

Save version 51: 49 and 50 went to #548 and #576 while this was in review.

## Helpers

None for the build: the twin canary did the finding. The reviews: Codex's, and Claude's reviewer (Opus, high), who
reproduced each leak with copies of the twin canary; its round 1 found five leaks the canary had missed.

## Questions for the owner

- #587: who pays for what is done far off (a caravan's porters, works in gold) before the court hears of it (new).
- #600: a far unit destroyed out of sight leaves its king's view at once (bug, new).
- #601: an express report (idea, new).
