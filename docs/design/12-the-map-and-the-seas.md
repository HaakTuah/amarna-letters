## The map and the seas

Build order item 7a (report `docs/rounds/2026-10-27-map-and-seas.md`; save version 10). The design document's "Map review"
(World and history) and "Finer seas" (War, travel and the seas), built from the dossiers in `docs/history/`, above all
`02-geography.md`. The map data is `buildMap` in `src/engine/src/model/map.ts`, the ground `geography.ts`, the lengths
`distance.ts`.

- **55 land provinces and 15 sea zones** (61 and 18 since item 11c: [the true map](28-the-true-map-and-the-red-sea.md)) (41 and 5 before item 7a; 54 until item 8 made Ṣumur a province of its own). Added, by the bar "a polity or administrative centre that acts
  in the period's diplomacy or war": Aleppo (walls 2), Qatna (2), Alalakh (1), Nuhashshe (1), Jerusalem (1, rough), Shechem
  (1, rough), Arrapha (1), Sidon (1) and the island of Arwad (2), all free city-states, as the Levant's other vassals are
  until item 11+ makes city-states powers; Nubia (Egypt's, on the Nile above Thebes, yield 30); Dilmun (Babylonia's, an
  island in the Gulf, yield 20); and two lands without a king, the Kaska lands north of Hattusa (rough) and the Sutean steppe
  between the middle Euphrates and Damascus (desert), each yield 10, with no walls and no elders to sell them
  (`Province.kingless`: a buy is refused, "has no king and no elders to sell it: it is taken only by force"). Yields and
  walls are first guesses, tuned in item 18.
- **Kumidi** stays inside Damascus's province: an Egyptian commissioner's seat in the Beqaa, under Biryawaza of Damascus's
  authority (EA 194-197), it never acted as a polity of its own, and a third city between Byblos, Sidon and Damascus would
  crowd the Levant on a phone. **Ṣumur** was built both ways and kept as Amurru's harbour in item 7a; since item 8, by
  Haakon's answer to its review ("the period first"), it is a province of its own: Ṣumur (`sumur`, Tell Kazel, Egypt's base on
  the coast, a free city with a town's walls, yield 15) holds the coast and the waters it shares with Arwad ("Sumur and
  Arwad waters", `sumurwaters`), and Amurru (yield 20, walls 1, rough) is the hill country behind it, a land province
  bordering Ugarit, Ṣumur, Qadesh, Nuhashshe and Byblos. **Lukka** is since item 8 a land without a king, like the Kaska
  lands (no walls, not for sale, yield 15 from 25; the outlaws of a kingless land on its roads), so Arzawa has no city it
  can buy. The phone reads the Levant (see "Map on small screens" in [the web map](09-the-web-map-and-the-interface.md)).
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
  Nile's first cataract between Nubia and Thebes). Boats on the rivers sail with travel since item 7b ([travel and news](13-travel-and-news.md)).
- **Lengths** (`connectionKm`, `connectionDays`): kilometres from the attested road distances where the dossier gives them
  (`AttestedKm`, each with its basis, such as Thutmose III's ten days from Tjaru to Gaza), otherwise the straight line between
  the towns (latitude and longitude on each province) plus a quarter for the road, a tenth at sea; days at the dossier's
  paces: 25 km a day on open ground, 15 in rough land and over a pass, 20 across the desert, each half of a connection at
  the pace of the province it lies in; 70 km a day coasting, 100 on an open crossing, a fifth quicker with the current and a
  quarter slower against. Item 7b's routes turn them into travel ([travel and news](13-travel-and-news.md)).
- **Travel bands kept to the old pace** until item 7b, which replaced them with routes measured in days ([travel and news](13-travel-and-news.md)).
- **The seas** ("Finer seas"). Every coastal province has its own waters (`Province.waters`, a sea zone `<id>waters`, named
  "Ugarit waters"), except that Amurru and Arwad share theirs (the Arwad blockade of Ṣumur, EA 98, 104-105) and Ur, Dilmun
  and Susa all touch **the Gulf**; the **Western Sea** is the open sea at the Aegean edge. Coastal hops join neighbouring
  waters along the shore, counterclockwise with the current (`Edge.current`: north along the Levant, west along Anatolia,
  east to west round Cyprus). Five **open-sea crossings** (`Edge.open`): Ugarit's waters and Byblos's to Enkomi's, Kalavasos's
  to Kizzuwatna's and to Lukka's, and the Western Sea to the Delta's, all with the current in the circuit's direction.
- **The sailing season.** Peret, the second season of each year (`WinterSeason`), is winter everywhere. Since item 9
  ("Winter is dangerous, never closed", `docs/design/15-envoy-authority-and-passage.md`) the open-sea crossings stay open
  but are dangerous: a fleet crossing one, or an army carried over one, may be lost (`turn/winter.ts`). Coastal hops are
  safe; their risk in winter is nature's, in item 7b's interception check. `WorldMap.winter` is the map without the
  dangerous crossings, which script kings plan their safe moves on.
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
- **Buying across the sea** (until item 11+, which took the purchase away). A free city could be bought from a coast one voyage away: their waters the same, or joined by a
  coastal hop or an open crossing (`WorldMap.sharesSea`), where before it was any coast on the same one of five seas.
- **What kings read.** THE MAP gives each coast its waters, each sea zone whose waters it is, and marks open crossings
  "(open sea)" and desert links "(across the Syrian desert)"; TERRAIN and the new THE SEA section (`src/llm/src/rules-ground.ts`)
  say what the ground, the waters, the blockade and the winter do; the siege rule notes the supply. The web map draws Arwad
  and Dilmun as islands, a larger Gulf, the Nile through Nubia, and each coast's waters small; its legend, province card and
  about page say what the waters do.
