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
phone and the script games. Both were built (a switch now removed) and compared on seeds 1-50, before the script kings'
landing plan (below):

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

Before the item (seeds 1-50 and the solo benchmark), the audit at its start, as item 6+ left them: 50 of 50 games replay
exactly, capitals fell in 44, and every feature built so far is used (the counts are item 6+'s, signal for signal), so
no gap was found to patch. After the item, on the same seeds (`scripts/sim.sh --games 50 --seed 1 --verify-replay`):
50 of 50 replay exactly.

| | Before 7a | After 7a | After, `--no-sea-play` |
|---|---|---|---|
| Capitals fell (games; kingdoms) | 44; 99 | 37; 69 | 36; 53 |
| First fall, median season | 11 | 22 | 20 |
| Entry to fall, median seasons | 12 | 21 | 16 |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 13, 7, 16, 8, 1, 5, 0 | 24, 10, 10, 4, 0, 2, 0 | 22, 6, 14, 5, 2, 1, 0 |
| Alashiya's growth | 1.60 | 2.71 | 2.95 |
| Sieges begun / won | 869 / 799 | 1071 / 804 | 1002 / 707 |
| Landings (games / landings) | not counted | 7 / 9 | 0 / 0 |
| Blockades / seasons a siege was supplied | none | 35 / 1874 | 0 / 2828 |
| Spies caught, terrain held, desert supplies | 38, 190, 10 | 32, 114, 147 | 25, 144, 115 |

`--versus solo`, 40 seeds (one current king against six baselines): 9.49 growth alone and 1.45 as baseline over all, 96%
and 14% of wins (8.26, 1.25, 94% and 14% before). By power, alone / as baseline: Egypt 7.33 / 0.86, Hatti 11.99 / 1.99,
Babylonia 11.05 / 1.11, Mitanni 7.90 / 2.97, Assyria 13.52 / 1.11, Arzawa 7.10 / 1.18, Alashiya 7.56 / 0.91. The baseline
was adapted only as the rules required (it convoys over one zone at most and never blockades), so the current bot gains
more over it on the new seas.

What moved, and why:
- **Wars are slower.** A coastal city is supplied by sea unless blockaded, so sieges of harbours take longer; capitals
  fall in fewer games, and later. Alashiya, guarded by its own waters and by winter, is never taken (it fell once in 50
  before) and grows nearly twice as fast. Item 18 weighs both ("most games", Alashiya's start).
- **Egypt is stronger**, with Nubia's 30 and no great king for a neighbour (reading 12).
- **The desert costs more often** (the Sutean steppe lies on the Euphrates–Levant road), and terrain helps less often (no
  landing bonus).

**Every feature is every seat's.** The script kings use each new rule, and it pays:
- **Blockades**: 35 in 20 games, and the share of siege seasons a city was supplied falls from all (2,828 with the sea play
  off) to 1,874; sieges won rise from 707 to 804, and kingdoms fallen from 53 to 69.
- **Landings**: 9 in 7 games (none with the sea play off); about half the convoys launched landed, in traces. They are
  rare because most courts own one fleet or none and a landing needs one in each sea zone of the way; the script kings
  keep a landing plan across seasons (`Brain.landing`, `chooseLanding` in `bots/seas.ts`) so their fleets and army
  converge on it, and raise a fleet or an army for it when one is missing. Before that plan, three attempts gave none
  (below).
- **Guarding the waters** and the **winter map**: no script king's order is refused for crossing the open sea in winter
  (every move it weighs is over `Board.Sail`), and fleets take station in their capital's waters when a foreign fleet nears.
- **Buying across the sea** follows the season's map (the review's finding 3).

**What the sea play is worth**, the same seeds with the script kings' sea play off (`--no-sea-play`: no blockades,
guards or landing plans, convoys over one zone at most): with it on, Hatti and Mitanni win more (10 and 4 against 6 and 5
over the table, Hatti's growth 3.76 against 3.52) and sieges succeed more; Babylonia and Egypt grow less (3.06 and 4.87
against 4.15 and 5.03), since others' blockades and landings now reach them. The feature matters, and the scripts play it.

**Landings took an escalation.** Three attempts of the builder's gave no landing in 20-50 games: levying fleets for the
chain, readying convoys for valuable non-stranded armies, and an island court raising an army. The escalation helper
found why: the "ready a convoy" step ran after every army was already used, it was recomputed from nothing each season so
fleets and army never met, the look-ahead replaced a fleet's waiting at sea with a one-season gain, and a whole chain lost
its fleets to the guard op. Its fix, checked and applied: the landing plan kept across seasons, its moves as ops that
compete before the commit, the look-ahead leaving troops on a landing alone, and guards dropped where the chain's fleets
already hold the waters. First guesses of the bots' own (not game numbers): patience 8 seasons, rest 6, a score of 150.

**The Board's season map** (`Board.Sail`) is a static set by each new board: safe while every board of a turn is for that
turn, as today; a known quirk if script kings ever plan boards for other turns.

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
13. **A threat to a capital**, for the reserve, is foreign troops within the capital, or beside it when they woke the
    king (the review's finding 4); not any foreign unit beside it, which would pay for Assyria from the first season.
14. **Labaya starts the game** (Haakon's answer to item 6+): no rulers are characters yet, so nothing here names him;
    item 10's characters do.
12. **Egypt starts with no great king for a neighbour**: free Gaza and Jerusalem lie between it and every other court,
    and its sea reaches no royal coast in one voyage. Its script king sends fewer peace tablets for it. Noted for item 18,
    with Nubia's richer start.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. Its findings, all addressed:
1. (Blocking) The rulebook said the ground never helps against an attack from the sea; rough ground still does. Fixed:
   only the landing army gets nothing, and rough ground helps against a landing.
2. (Blocking) The sally line still named "a landing" among the grounds. Fixed; and with `seaSupply` 0 the siege text
   says nothing of supply.
3. (Blocking) Buying across the open sea in winter was refused without kings being told, and script kings and the web
   form checked reach on the summer map. Fixed: THE SEA says so, the refusal says so, and both use the season's map.
4. The capital reserve counted any foreign unit beside a capital (Mitanni's army beside Ashur from the first season).
   Fixed: troops within the capital, or beside it when they woke the king.
5. The web order form offered open-sea moves in winter. Fixed (`forTurn` for moves and buying).
6. (Blocking for merge) The report was unfinished and landings were 0. Done above: 9 landings in 7 of 50 games.
7. Nits: the guard op could send a second fleet into waters our own fleet holds (fixed); `Board.Sail` is a static
   (noted above).
8. "Blockaded" in the siege notice with `seaSupply` 0 (fixed).

It found nothing wrong in the engine's convoys and landings, the winter map, siege supply or determinism.

## Also built in 7a: Haakon's answers to item 6c's review, and the pacing notes split

As the item's text now asks first (the design document's revision 37):
- **A threat to a king's capital is always paid**: a king's orders with foreign troops within his capital, or beside it
  when they woke him, start above the script whatever the going rate, and may spend a reserve of the limit (a tenth, a
  first guess) that ordinary decisions stop short of (`Stakes.capital`, `SpendingSettings.reserveShare`, tested).
- **The Counsel preset's narrator is Sonnet**, the preset's large model.
- **The pacing design notes**, 61 KB, were split by topic into `docs/design/05-pacing/`, word for word, in their own pull
  request (#64, merged).
- Also found on the way: the script kings decided by a power's name which courts keep two fleets
  (`statecraft-strategy.ts`), against "no rule checks which power it is"; it now reads the map (a homeland mostly coast),
  which picks the same two courts.

## Haakon's words in this session

None: the session ran from the item's start prompt.
