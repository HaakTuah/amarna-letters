# Far land as last reported (bug #540, side lane, 2 November 2026)

PR #579. Issues #540 and #589 (the far yields, filed apart by the workshop). Issue #540: a far province's economy, works, people and caravans, and the realm's totals, were shown as they
are, not as last reported ("Distance inside your own realm", item 13; "Hidden information" in `AGENTS.md`). The twin
canary of #537 (`src/web/test/twin-canary.test.ts`) was the guide: every #540 entry of its list of known leaks is gone,
and the one part left is question #587.

## Step 0

`src/engine/src/turn/economy.ts` was 50.1 KB on `develop` when the lane began (49.4 KB in the brief). Its changes here are
lines changed in place (the harvest's report split near and far, a caravan's end and setting out through one helper each,
its notices and events by the road); the new work is in new files (`rules/province-reports.ts`, `rules/caravans-known.ts`,
`model/province-reports.ts`). `resolve.ts` lost `ledgerStrength`, now unused.

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
- **Save version 50** (49 went to #548).

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

## Benchmarks

`scripts/sim.sh --games 20 --seed 1 --verify-replay`, each run alone on the machine (#552): before on `develop` at
`954bf746`, after on this branch at `1bd2bd58`. Every game replays exactly, 20 of 20, before and after, and every game
lasts as many seasons as before. 13 of the 20 have a different winner, since the script kings read their view (their far
land, caravans and strength as last reported). Kingdoms fallen: 320 against 306. The first fall still comes in season 4.5
on the median (range 4-5), and no kingdom falls in the first two seasons, so play stays playable. Seats risen in play: 49
against 29. No balance was tuned, as the frozen-balance rule asks. A bug fix adds no feature, so there is no use against
ignore to measure.

## Helpers

None for the build: the twin canary did the finding. The reviews are listed below as they run.

## Questions for the owner

- #587: who pays a far caravan's porters before the court hears it set out (new).
