# Tolls and smugglers at a far border, heard by the road (bug #736, side lane, 6 November 2026)

Issue #736: a toll taken, or a smuggler found, at a border of a king's land was told to him at once, however far that
border lay from his court. The toll and smuggling events listed him whatever the distance, and his one tolls notice a
season came through `notify` and said the gold went "into the treasury", even where `credit` had put it in a far
province's coffer.

## What changed

- `turn/trade.ts`: the season's toll book is kept by border province (`TollBook`). The holder reads one notice from
  each border where his tolls or seizures brought something in, through `tell` from that province, so it comes as word
  from there does. It says where the gold went: "into your treasury", or "into the coffer of" the province where it is
  a far one. The toll and smuggling events name him only where his couriers reach (`nearOf`), as #675 did for a seizure.
- Test: `trade.test.ts`, "A toll taken at a far border is told to its king by the road, with where its gold went
  (#736)": Egypt holds Nesa, far from its court, and tolls a Hatti caravan there. It fails on `develop` and passes
  here. The older toll test's expected wording changed with the notice's text, and checks as much as before.
- The rulebook (`rules-economy.ts`) and the design note (`docs/design/17-the-economy-abroad.md`) say where toll gold
  goes and how word of it comes. The rulebook had said "into your treasury" only, untrue for a far province since #587.
- Save version 63: word of a far border's tolls is now a journey, so a seed plays on differently from that season.

## Readings taken

1. **One notice per border, not one per king a season.** Each border's word comes when word from there does, so one
   notice for all of them would have to wait for the farthest or tell the near ones late. Principle: what a king reads
   comes when he could know it ("Hidden information").

Questions for the owner: none.
