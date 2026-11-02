# Anchors for the rest of the game's data (2 November 2026)

The first part of "What remains" under the full history check ("Follow-ups" in `docs/BUILD-PROGRESS.md`; archive items
167 and 170). Until now every person and named ruler named the dossier line it rests on; now the places, distances,
waters, walls, armies, doors and tongues do too.

## What was built

`src/engine/src/rules/anchors.ts` gains one table per kind of data, each keyed as the game's data is, and
`src/engine/test/history-anchors.test.ts` one test per table. A test fails when an entry of the data has no anchor, when
an anchor names something no longer in the data, when the anchor's line is missing, or when the line does not name what
rests on it: a city by its map id, its name or a word of its modern name (the dossiers keep some older ids: `kanesh` for
Nesa, `ekallatum` for Ekallate), a crossing or a distance by both its ends.

| Table | The game's data | Lines | Marked invented |
| --- | --- | --- | --- |
| `WaterAnchors` | `CityWaters` (71 cities) | `10-water.md` | 16 cities the water dossier has no row for, whose water the game guessed from their land |
| `WallAnchors` | `StartWalls` (55) | `12-walls-roads-harbours.md`, "Walls by city" | 16 towns the walls dossier knows nothing of (one level each [G]) |
| `TongueAnchors` | `peopleSpeak`, each province | `07-languages.md`, "By province" | none |
| `LanguageAnchors` | every tongue spoken or brought through a door | `07-languages.md`; `08-beyond-the-edges.md` for the tongues beyond | none |
| `DoorAnchors` | `Doors` and each land beyond them | `08-beyond-the-edges.md` | none |
| `CrossingAnchors` | `Crossings` (41) | `02-geography.md`: the great routes, terrain, crossings, neighbours | none |
| `DistanceAnchors` | `AttestedKm` | `02-geography.md`, "Distances between the map's places" | none |
| `ArmyAnchors`, `FleetAnchors` | `StartUnits`' Great Kings, `CityRange`, `CityShips` | `11-armies-and-fleets.md` | none |
| `HarbourAnchors` | the ports `startHarbour` raises above a beach | `02-geography.md` "Coasts and harbours", `12-...` "Harbours" | none |
| `RiverAnchors` | `Rivers`, `CrossedRivers` | `02-geography.md`, "Rivers" | none |

`CityRange` and `CityShips` are exported for the test. Anchors stay data only: nothing shows them to a king, a
character or a model.

## What the test found, and the fixes

Lines written before later items grew the map no longer named what rests on them:

- **Hazor's walls** (`12-walls-hazor`): the row still said "not on the map; for comparison", though item 11c put Hazor on
  the map with three levels of wall from that row. The row names `hazor` now.
- **The Negev crossings** (`02-crossing-negev`): named `shasu`-`hebron`, a province item 17+ replaced; the game's crossings
  are `shasu`-`gath` and `shasu`-`lachish`. The row names them.
- **The Tigris between Taidu and Nineveh** had no line at all. A new row (`02-crossing-tigris`) says what it is: the
  game's reading of the great river as the frontier, with no source holding an army at it [G].
- **The cities item 11c and 11f added** (Akko, Hazor, Gezer, Ashkelon, Lachish, Gath, Aijalon; Pella, Ashtaroth, Beirut)
  take their tongues and their men from the Canaanite rows (`07-canaan`, `11-canaanite-town`), which named only the
  first four cities; both rows name them now.
- **Three roads**: the Syrian Gates' row names `alalakh` (Mukish); the Euphrates road names the crossing at Emar on the
  road from Aleppo; the upper Euphrates row names `isuwa`-`harran`; the Megiddo-Damascus road says the game splits it at
  Hazor (60 and 100 km [G]).
- Some anchors moved to the line that names both ends: the steppe's desert roads to `02-nb-sutean-steppe`, the Delta's
  road into the Sinai to `02-nb-delta-gaza`, Jerusalem to Pella to `02-nb-jericho-fords`, Arwad's harbour to
  `12-harbour-islands`.
- **Leftovers:** `CityRange` still held `hebron`, and `src/web/src/styles/city-states.css` its colours, since item 17+
  removed the province. Both gone.

No number, text or draw in the game changes: seeds and fingerprints are as they were, and no save version is needed.

## Readings taken

- A guess the game made where a dossier has no row (a town's water or walls) is marked invented in the anchors, as the
  people tables mark an invented name: the anchors say where a fact rests, and these rest on nothing in the dossiers.
  Sourcing them, or giving them the best published estimate, is the second part of "What remains" (the unclear lines).
- A province is named by its id, its name or a word of its modern name, since the dossiers keep the ids they were written
  with (`kanesh`, `mari`, `ekallatum`); renaming every old id in the dossiers is not this lane's work.

## Questions for the owner

None.
