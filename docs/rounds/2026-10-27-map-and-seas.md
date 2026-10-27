# Item 7a: the map and the seas (27 October 2026)

Build order item 7, part 7a ("The map and the seas"): the land map review ("Map review") and the seas redrawn ("Finer
seas"), with the blockade deciding at sea. Built from the item 6+ dossiers in `docs/history/`, above all
`02-geography.md`, `01-politics.md` and `03-environment-and-seasons.md`. Branch `item/map-and-seas`; save version 10.
What was built is in `docs/design/12-the-map-and-the-seas.md`; this report says why, what it cost and what was found.

## The check for changes

The live design document (Claude Docs) was asked for changes since the copy's revisions in the tabs this item reads:
Build order (rev 33), World and history (22), War, travel and the seas (18). None: the copy in `docs/intent/` is current.

## What was built

- **The land map**, 41 provinces to 54: Aleppo, Qatna, Alalakh, Nuhashshe, Jerusalem, Shechem, Arrapha, Sidon and the island
  of Arwad as free city-states; Nubia (Egypt's) and Dilmun (Babylonia's, an island in the Gulf); the Kaska lands and the
  Sutean steppe, lands without a king (no walls, not for sale). Kumidi left within Damascus's province, and Ṣumur built
  both ways and kept as Amurru's harbour (below). Names of their time: Mari became Suhu, Kanesh Nesa, Ekallatum Ekallate,
  Tamassos Kalavasos (ids too). Desert connections (the Syrian desert through the steppe, the Ways of Horus, the north
  Sinai, the Negev), the Anti-Taurus, Syrian Gates and Lebanon passes, the Euphrates crossed at Carchemish, at Emar and
  upstream; the long Carchemish–Qadesh and Mari–Damascus links gave way to links through Aleppo, Nuhashshe, Qatna and the
  steppe. Rivers keep item 5's borders and spines, with Nubia on the Nile and each river's reaches as data for item 7b.
- **The length of every connection**, in kilometres and days, from attested journeys where the sources give them and the
  towns' positions otherwise, weighted by terrain, with currents at sea (`distance.ts`). Map data for item 7b's routes.
- **The seas**: 15 sea zones, the waters of each coast (Amurru's shared with Arwad; one Gulf for Ur, Dilmun and Susa) and
  the Western Sea at the Aegean edge; coastal hops counterclockwise with the current; five open-sea crossings, closed in
  winter (Peret, the second season); an army lands only from the waters of the coast it lands on, so an enemy fleet there
  stops it; a besieged coastal city is supplied by sea, and worn down a step less, unless its besieger's fleet holds its
  waters. Item 5's "landing counts as a crossing" is gone, as item 7 asked.
- **What kings read**: THE MAP (each coast's waters, open crossings, desert links), TERRAIN and a new THE SEA section in
  the rulebook (`src/llm/src/rules-ground.ts`, moved out of `rules.ts`, which was near 50 KB); the web map draws the islands,
  the Gulf, Nubia and each coast's waters, and its legend, province card and about page explain them.
- **Script kings** (`src/game/src/bots/seas.ts`, `tactics.ts`): convoys by chains of fleets; readying a chain, with fleets
  sailing towards it over several seasons and a fleet levied in the nearest home harbour when one is missing; blockading the
  coastal cities they besiege; guarding the waters of their walled coasts when a foreign fleet is near; an island court
  raising an army where a landing would pay. Every move a king weighs is one it could give this season (`Board.Sail`, the
  winter map). `--no-sea-play` turns this off, to measure it.

## Ṣumur, both ways

"Map review" asked for Ṣumur as Amurru's harbour or as a province of its own, the better kept, by the map's readability on a
phone and the script games. Both were built (a switch now removed) and compared on seeds 1-50:

| | Ṣumur as Amurru's harbour (kept) | Ṣumur its own province |
|---|---|---|
| Capitals fell | 36 of 50 games, 71 kingdoms | 39 of 50, 67 kingdoms |
| Wins: Egypt, Hatti, Babylonia | 22, 10, 13 | 23, 5, 13 |
| Alashiya's growth | 3.00 | 3.09 |
| Landings, blockades | 0, 39 | 2, 55 |

The script games barely tell them apart (the two landings were on Arwad from Ṣumur's shared waters, which Amurru's coast
offers just the same). The phone does: at the first zoom step on a 390-pixel screen, a separate Ṣumur puts four cities
(Arwad, Ṣumur, Amurru, Byblos) within a thumb's width, their names touching, where the kept map reads cleanly. Kept as
Amurru's harbour; Amurru keeps the walls, the waters it shares with Arwad, and the story of the Arwad blockade.

## Benchmarks, script games and the feature audit

BENCHMARKS

## First guesses (item 18 tunes them)

- Yields and walls of the new provinces (design note), the lands without a king at 10.
- Paces: 25 km a day on open ground, 15 rough and over passes, 20 in the desert, 70 coasting, 100 on open crossings; a
  fifth quicker with the current, a quarter slower against.
- `GameConfig.seaSupply` 1: a supplied city is worn down a step less each season.
- `GameConfig.travelHops` 5 and 9 (was 4 and 7): not a new number but the old pace kept on a map with more steps (below).

## Readings taken and design questions

1. **Suhu, not Hana.** The dossier proposed Hana for `mari` and Kahat for `terqa`. Kahat (Tell Barri) is on the upper
   Habur, near Washukanni, not where the map's `terqa` lies, at the mouth of the Habur, which is where Terqa itself stands.
   So Terqa keeps its name, Hana's own capital under Mitanni's reach, and the free province downstream, between Hana and
   Babylonia, takes the land's name of that stretch, Suhu. Design question: Hana and another name for Terqa instead?
2. **Nesa and Ekallate** are the same towns' names in the Hittite and Middle Assyrian periods. Shamuha would suit a
   province reaching up the Halys, but the province is drawn on Kanesh's plain; Kilizi would suit land between the Zabs,
   but the province lies on the Tigris below Ashur. Design question: is the period's name of the same town enough?
3. **Kumidi** stays within Damascus's land: an Egyptian commissioner's seat under Biryawaza's authority (EA 194-197) that
   did not act as a polity of its own, and a third city in the Beqaa would crowd the Levant.
4. **The new Levant cities are free city-states**, Mitanni's vassals (Aleppo, Alalakh, Nuhashshe, Arrapha) and Egypt's
   (Sidon, Jerusalem, Shechem, Qatna) alike, as the Levant's other vassals have been: item 11+ makes city-states powers
   with overlords. Nubia and Dilmun start as their kings' land, as the design says.
5. **Lands without a king** (the Kaska lands, the Sutean steppe) have no walls and cannot be bought: there are no elders
   to sell them. Their loose men come with item 10+. Lukka, which the design names as such a land, is left as it was (a
   free city with walls 1): changing it is outside this item. Design question: Lukka too?
6. **Suhu keeps a town's walls** (1): the design takes away Mari's fortress walls, and the rulebook says every free
   city-state has walls; Nuhashshe has 1 too.
7. **Travel bands kept to the old pace.** Travel still counts steps until item 7b, and the new provinces and each coast's
   waters lengthen journeys (Akhetaten to Hattusa 6 steps to 8, Enkomi to Ugarit 2 to 3). Bands of 5 and 9 steps keep 17 of
   the 21 journeys between capitals at the same number of seasons; without it envoys would have slowed by accident.
8. **River waters for boats** are data (each river's reaches); boats sailing the rivers come with travel in item 7b,
   where "rivers slower upstream" is built. Item 7's 7a list does not name the rivers; the reading keeps the data with the
   map and the movement with travel.
9. **Winter cuts Cyprus off by sea.** All of Cyprus's links to the mainland are open crossings, so in Peret no army reaches
   or leaves the island and no city across the sea can be bought from it. The design's "open crossings are closed or much
   riskier" is read as closed; the risk of coastal hops in winter is nature's check in item 7b.
10. **The blockade in sieges** is read as supply: a city supplied by sea is worn down a step less each season (a lone
    besieger not at all), unless a fleet of the besieger's holds its waters. Only the besieger's fleet blockades; a third
    king's fleet there neither helps nor hinders.
11. **Arrapha does not touch Dur-Kurigalzu**: Ekallate and the Diyala lie between.
12. **Egypt starts with no great king for a neighbour**: free Gaza and Jerusalem lie between it and every other court,
    and its sea reaches no royal coast in one voyage. Its script king sends fewer peace tablets for it. Noted for item 18,
    with Nubia's richer start.

## The review

REVIEW

## Haakon's words in this session

None: the session ran from the item's start prompt.
