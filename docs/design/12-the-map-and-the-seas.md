## The map and the seas

Build order item 7a (report `docs/rounds/2026-10-27-map-and-seas.md`; save version 10). The design document's "Map review"
(World and history) and "Finer seas" (War, travel and the seas), built from the dossiers in `docs/history/`, above all
`02-geography.md`. The map data is `buildMap` in `src/engine/src/model/map.ts`, the ground `geography.ts`, the lengths
`distance.ts`.

- **54 land provinces and 15 sea zones** (41 and 5 before). Added, by the bar "a polity or administrative centre that acts
  in the period's diplomacy or war": Aleppo (walls 2), Qatna (2), Alalakh (1), Nuhashshe (1), Jerusalem (1, rough), Shechem
  (1, rough), Arrapha (1), Sidon (1) and the island of Arwad (2), all free city-states, as the Levant's other vassals are
  until item 11+ makes city-states powers; Nubia (Egypt's, on the Nile above Thebes, yield 30); Dilmun (Babylonia's, an
  island in the Gulf, yield 20); and two lands without a king, the Kaska lands north of Hattusa (rough) and the Sutean steppe
  between the middle Euphrates and Damascus (desert), each yield 10, with no walls and no elders to sell them
  (`Province.kingless`: a buy is refused, "has no king and no elders to sell it: it is taken only by force"). Yields and
  walls are first guesses, tuned in item 18.
- **Kumidi** stays inside Damascus's province: an Egyptian commissioner's seat in the Beqaa, under Biryawaza of Damascus's
  authority (EA 194-197), it never acted as a polity of its own, and a third city between Byblos, Sidon and Damascus would
  crowd the Levant on a phone. **Ṣumur** was built both ways and kept as Amurru's harbour: see the report for the
  comparison (script games and the phone).
- **Names of their time.** `mari` became **Suhu**, the land on the Euphrates between Hana and Babylonia, with a town's walls
  (1) instead of Mari's fortress (2); Terqa, Hana's own capital, already names Mitanni's province at the mouth of the Habur,
  so Hana's land is on the map under Mitanni's reach, as the politics dossier has it. `kanesh` became **Nesa** and
  `ekallatum` **Ekallate**, the names of the same towns in the Hittite and Middle Assyrian periods; `tamassos` became
  **Kalavasos**, the western province reaching the south coast, where the clay of the Alashiya letters comes from. The
  character Pihhuniya's home is Nesa too. Ids followed the names.
- **Connections.** Armies reach Cyprus, Arwad and Dilmun only by sea. Kizzuwatna no longer touches Ugarit (Alalakh lies
  between, over the Syrian Gates); Suhu reaches Damascus and Qatna only across the Sutean steppe; Megiddo no longer touches
  the Sinai (Shechem and Jerusalem lie between); Arbela reaches Susa through Arrapha. Crossings: the passes of item 5 plus
  the Anti-Taurus (Nesa–Carchemish), the Syrian Gates (Kizzuwatna–Alalakh) and the Lebanon (Byblos–Damascus,
  Sidon–Damascus); the Euphrates at its fords and ferry towns, at Carchemish, at Emar (Aleppo–Harran) and upstream
  (Isuwa–Harran); and desert connections (`CrossingKind` "Desert": the Syrian desert from Suhu to the steppe and from the
  steppe to Qatna and Damascus, the Ways of Horus Delta–Gaza, the north Sinai, the Negev), which give no help in battle and
  make the connection long. The great rivers stay as item 5 drew them, borders at the crossings and spines along their
  courses (the Nile now from Nubia), and each `River` lists its reaches, the runs a boat can sail without unloading (the
  Nile's first cataract between Nubia and Thebes). Boats on the rivers sail with travel, in item 7b.
- **Lengths** (`connectionKm`, `connectionDays`): kilometres from the attested road distances where the dossier gives them
  (`AttestedKm`, each with its basis, such as Thutmose III's ten days from Tjaru to Gaza), otherwise the straight line between
  the towns (latitude and longitude on each province) plus a quarter for the road, a tenth at sea; days at the dossier's
  paces: 25 km a day on open ground, 15 in rough land and over a pass, 20 across the desert, each half of a connection at
  the pace of the province it lies in; 70 km a day coasting, 100 on an open crossing, a fifth quicker with the current and a
  quarter slower against. Map data only: travel still counts steps (`GameConfig.travelHops`) until item 7b's routes.
- **Travel bands kept to the old pace.** The new provinces and the waters lengthen step counts (Akhetaten to Hattusa 6 to
  8 steps, Enkomi to Ugarit 2 to 3), which would have slowed envoys by accident before item 7b measures distance. The bands
  went from 4 and 7 steps to 5 and 9, which keeps 17 of the 21 journeys between capitals in the same number of seasons (two
  faster, two slower). A reading, in the report.
- **The seas** ("Finer seas"). Every coastal province has its own waters (`Province.waters`, a sea zone `<id>waters`, named
  "Ugarit waters"), except that Amurru and Arwad share theirs (the Arwad blockade of Ṣumur, EA 98, 104-105) and Ur, Dilmun
  and Susa all touch **the Gulf**; the **Western Sea** is the open sea at the Aegean edge. Coastal hops join neighbouring
  waters along the shore, counterclockwise with the current (`Edge.current`: north along the Levant, west along Anatolia,
  east to west round Cyprus). Five **open-sea crossings** (`Edge.open`): Ugarit's waters and Byblos's to Enkomi's, Kalavasos's
  to Kizzuwatna's and to Lukka's, and the Western Sea to the Delta's, all with the current in the circuit's direction.
- **The sailing season.** Peret, the second season of each year (`WinterSeason`), is winter everywhere: the open-sea
  crossings are closed (`WorldMap.forTurn` gives the map without them; the validator refuses a fleet move or support over one,
  "the open sea between ugaritwaters and enkomiwaters is closed in winter", and an army's move by sea that needs one; the
  adjudicator carries no convoy over one). So Cyprus is cut off by sea each winter. Coastal hops stay open; their risk in
  winter is nature's, in item 7b's interception check. Buying across the sea follows the same map.
- **Landing.** No new rule: an army sails only by convoy, with a fleet of any power in each sea zone of its way, and the
  only sea zone next to a coast is its own waters, so an army lands only from those waters, and where an enemy fleet holds
  them no fleet of the lander's can stand there to carry it. The landing's +1 from item 5 is gone (`defenceGround` takes no
  convoy flag; `GroundKind` has no "Landing"). The record marks every army that came ashore (`landing`).
- **The blockade in sieges** (`TurnEngine.sieges`, `GameConfig.seaSupply`, 1, a first guess): a besieged coastal city is
  supplied by sea, and worn down that many steps less each season, unless a fleet of its besieger holds its waters. A lone
  besieger of an unblockaded harbour wears it down not at all ("Your siege of Gaza (walls 2) did not advance: no fleet of
  yours holds Gaza waters, so the city was supplied by sea."), one with a support a step; with the harbour blockaded the
  siege runs as before ("... wore the city down a step, with its harbour blockaded"). The record marks each siege season of
  a coastal city `sea-supplied` or `blockade`. 0 turns it off.
- **Buying across the sea.** A free city can be bought from a coast one voyage away: their waters the same, or joined by a
  coastal hop or an open crossing (`WorldMap.sharesSea`), where before it was any coast on the same one of five seas.
- **What kings read.** THE MAP gives each coast its waters, each sea zone whose waters it is, and marks open crossings
  "(open sea)" and desert links "(across the Syrian desert)"; TERRAIN and the new THE SEA section (`src/llm/src/rules-ground.ts`)
  say what the ground, the waters, the blockade and the winter do; the siege rule notes the supply. The web map draws Arwad
  and Dilmun as islands, a larger Gulf, the Nile through Nubia, and each coast's waters small; its legend, province card and
  about page say what the waters do.
