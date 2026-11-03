# Item 17++a: something happens every season

The owner's words (2 November 2026): "Still feel like almost nothing has happened in a game now that went to 50 seasons",
then "Yes ro absolutely all pt these! Extra expertly expertly!". The item: "first measure, then fix", under the builder
rules' exception for anything that makes games unplayable for testing; and the four powers' land names follow their
provinces' proper names (#403).

## The measure (`src/game/src/pulse.ts`)

Season by season and Great King by Great King, the events that change something a seat could hear of, counted as they
reach him (visible to him) and as they happen anywhere. Worth a letter: a province changing hands, a battle or siege, a
revolt, a treaty, a man's rising, fall, defection or death, a disaster, gold, grain or men sent in earnest. A change of the
map: a province changing hands, a realm falling or rising. People fleeing a hungry land are routine and left out (587 a
game in the first trial, drowning the rest). In every batch report, with the events by kind.

**Target** (a first guess, item 18): an event worth a letter in 60% of a Great King's seasons, and a change of the map he
hears of every 4 seasons or fewer.

## Before (50 games, seed 1, 50 seasons, a6fd2865)

| Great King | Seasons with a letter's worth | Seasons per map change |
|---|---|---|
| Egypt | 62.9% | 25.9 |
| Hatti | 80.5% | 11.5 |
| Babylonia | 66.9% | 16.1 |
| Mitanni | 72.5% | 13.6 |
| Assyria | 68.5% | 20.1 |
| Arzawa | 31.5% | 40.8 |
| Alashiya | 23.1% | 44.8 |

Anywhere: a letter's worth in 99.9% of seasons, a map change in 42.8%; 7.6% of the letter-worthy events reached no seat.
A game: 94 battles, 38 sieges, 10 sacks, but 7.6 conquests and 4.2 provinces obeying a new holder.

## Why games miss it

1. **A Great King's homeland is beyond force** under "whom a province obeys": one army of 5,000 counts 5 to 26 against a
   homeland's men, while the holder's love starts at 100 and the rival must clear it by the margin; force is capped at
   100. Only the Levant towns and the lands without kings can change hands (`turn/unrest.ts`, `forceOf`).
2. **The script kings still play as if standing in a province took it**: their look-ahead hands unwalled land to whoever
   stands there, attacks are valued at the province's whole worth, and nothing keeps an army in land it entered until it
   obeys; armies win battles and wander off.
3. **Arzawa and Alashiya** have nothing within reach that can be taken, and sit still.

## Fixes tried

On the same 12 games (seed 1, 50 seasons), changes of hands a game (conquest + obey):

| Candidate (the game's own numbers) | Changes of hands | Note |
|---|---|---|
| Unchanged | 12.9 | |
| Force 250 a man of the army per man of the land (was 100) | 11.9 | |
| Native love 60 (was 100), margin 10 (was 20) | 14.8 | |
| Both | 14.6 | Hatti's map changes every 7.2 seasons (was 12.1); the rest about the same |

The numbers alone barely move it. No number is changed by this item unless a measured fix needs it.

**Script kings that judge obedience and occupy** (a helper's build on `cand/occupy`, three versions; the switch
`OccupyPlay`, `--occupy-play-half`): an estimate, from the seat's view only, of the seasons until a province would obey
our army there; attacks on open land scaled by it, the look-ahead no longer counting land that would never obey as ours,
and an "occupy" choice holding an army in land until it obeys. With every king using it, changes of hands fell to 11.2 a
game and battles from about 94 to 75; game length unchanged. It wins use against ignore (9 wins of 12, 0.88 growth to
0.82), but not the pulse: a probe found armies rarely stand in open foreign land at all (a lone army will not enter land
whose people resist, and most foreign land is walled), so judging obedience mainly removed attacks that made battles.
Not adopted for the pulse.

**Where it stands**: two approaches measured and set aside, so, by "Don't loop", the fix went to the escalation helper
(Opus, high) with the conversion from battles to entries to obedience, and sieges to falls, to trace and fix.

## The four lands (#403)

The realms of Libya, the Kaska, the Shasu and the Suteans go by their lands' own names, Tjehenu, Kaska, Seir and Sutu, as
their provinces already did (#391): each anchored to its dossier line (`LandAnchors`), Sutu's added to the politics dossier
with its source (the Suteans' Akkadian name, Sutī'ū; eight Amarna letters, among them EA 195). README and the About page
follow. Benchmarks before and after: running.

Questions for the owner: none.
