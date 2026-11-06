# An archive a far force seizes on the road, sent home as a load (bug #726, side lane, 6 November 2026)

Issue #726: when a king's troops or fleet took a caravan carrying a captured archive (item 10+b), its tablets became his
copies the same season (`archiveArrives`, called from `caravansTravel`), so his court held and read them before any
word from his far men could come.

## What changed

- `turn/caravans.ts`: a seized archive goes to the taker's capital as a load (`lootHome`), as a taken capital's archive
  already does (`takeArchive`). It can be waylaid on the way, and his court holds it only when it arrives. Far off where
  no road takes a load home (`homeRoad`), his men send the tablets by courier instead (`archiveByWord` in
  `turn/archives.ts`): a `Word` journey of the new news kind `Archive`, arriving with word from that province
  (`heardAt`), when `wordArrives` makes them the court's copies. Codex's code review found that branch leaking in round
  1 (P1); it is fixed here, not left to #740.
- Test: `map-crossings.test.ts`, "An archive a far force seizes on the road goes home as a load, not into its king's
  archive at once (#726)". It fails on `develop` and passes here. It shares its setup with #675's test (`farSeizures`)
  rather than copying it. It covers both branches: the load on the road, and the courier where no road leads home (the
  test removes the trade road on its engine). Arrival of a load is already tested in `archive.test.ts`.
- The rulebook (`rules-economy.ts`) and the design note (`docs/design/20-people-across-borders.md`) say so.
- Save version 64: a seized archive is now a caravan on the road, so a seed plays on differently from that season.

## Left to its issue

- #740 (filed here): where `lootHome` finds no road home, other loot (a sacked city's gold, a taken capital's
  archive) still reaches its king at once. #726's own case no longer does.

## Readings taken

1. **A seizure near home goes home by the road too,** not only a far one: the archive is a load his men must carry, as
   a taken capital's is however near. Principle: one rule for one thing ("Different data, same rules"); the issue asked
   only that the court not hold it before word could come, which the load also ensures.

Questions for the owner: none.
