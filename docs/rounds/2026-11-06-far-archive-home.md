# An archive a far force seizes on the road, sent home as a load (bug #726, side lane, 6 November 2026)

Issue #726: when a king's troops or fleet took a caravan carrying a captured archive (item 10+b), its tablets became his
copies the same season (`archiveArrives`, called from `caravansTravel`), so his court held and read them before any
word from his far men could come.

## What changed

- `turn/caravans.ts`: a seized archive goes to the taker's capital as a load (`lootHome`), as a taken capital's archive
  already does (`takeArchive`). It can be waylaid on the way, and his court holds it only when it arrives.
- Test: `map-crossings.test.ts`, "An archive a far force seizes on the road goes home as a load, not into its king's
  archive at once (#726)". It fails on `develop` and passes here. It shares its setup with #675's test (`farSeizures`)
  rather than copying it. Arrival of such a load is already tested in `archive.test.ts`.
- The rulebook (`rules-economy.ts`) and the design note (`docs/design/20-people-across-borders.md`) say so.
- Save version 63: a seized archive is now a caravan on the road, so a seed plays on differently from that season.

## Left to its issue

- #740 (filed here): where `lootHome` finds no road home (land closed to the taker on the way, or his own capital
  lost), the load still reaches him at once. That is true of all loot going home, not only of #726's case.

## Readings taken

1. **A seizure near home goes home by the road too,** not only a far one: the archive is a load his men must carry, as
   a taken capital's is however near. Principle: one rule for one thing ("Different data, same rules"); the issue asked
   only that the court not hold it before word could come, which the load also ensures.

Questions for the owner: none.
