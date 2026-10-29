## The true map, the Red Sea and six cities of Canaan

Build order item 11c (`docs/intent/build-order/item-11.md`; "The map in true geography, and its look in time", "Map on
small screens", "The Red Sea", "What earns a place", "Opening relations as they were"). Save version 27. The report is
`docs/rounds/2026-10-29-true-map.md`.

### The board in a true projection (`src/web/src/map/`)

- **Projection** (`projection.ts`): Mercator over 25.8°E to 51.2°E and 20°N to 42.3°N, 1000 map units wide and 1037
  high. Drawing only, so it lives in the web app: the engine's provinces carry latitude and longitude, not board
  coordinates (`Province.x` and `y` are gone), and the lengths of connections still come from latitude, longitude and the
  attested roads (`distance.ts`), so no distance, route or connection changed with the drawing.
- **Geography** (`geo-data.ts`, written by `scripts/map-geography.ts` from Natural Earth, public domain): the land and its
  islands, the lakes of 1346 (Van, Tuz, Urmia, the Dead Sea, Galilee; not the modern reservoirs), the great rivers
  (Nile, Euphrates, Tigris, Marassantiya, Jordan, Ceyhan, Maeander, Karkheh) and the deserts, clipped to the frame with a
  wide margin and simplified for the screen, finer on the Levant coast (0.22 map units against 0.7). The smaller rivers
  (Khabur, Balikh, Orontes, Hermos, Seyhan, the Zabs, Diyala), the ranges, the black land of the Nile and the alluvium
  between the rivers are drawn by hand in `art.ts`, in latitude and longitude. The Gulf's head reaches up towards Ur as
  it did in the Late Bronze Age (`OldGulfShore`).
- **Places** (`city` in `art.ts`): a land province at its town's latitude and longitude, a sea zone at a spot out on its
  waters (`SeaSpots`). Province shapes are Voronoi cells of the towns, with points that claim the empty deserts, the
  Zagros and the highlands (`Wastes`); land cells are drawn within the mainland or within their island (`mainclip`,
  `isleclip`: Cyprus and Dilmun), sea zones within their own sea (the Great Green, the Red Sea, the Gulf), clipped to
  the water.
- **Reading the Levant** ("Map on small screens"): names give way by importance at ten zoom steps (`NameLevels`), the
  zoom reaches 24 times the whole board, and the map opens on the seat's own capital whenever a seat's eyes are taken.

### The Red Sea (`model/map.ts`, `model/distance.ts`, `model/doors.ts`)

- **One sea zone** (`redsea`), at Mersa Gawasis's latitude and longitude, touched by the Sinai (the Gulf of Suez) and
  Thebes (the Wadi Hammamat road), both now coasts whose waters it is. No sea connection joins it to another sea, so no
  fleet sails there from elsewhere; one raised on its shore is the only way, as Egypt's Red Sea fleets were built
  ("Ships carried overland" comes with shipbuilding in the economy's later phases). The rulebook's THE SEA says so of
  every sea joined to no other (the Gulf too).
- **The roads to its shore** are desert: `thebes`-`redsea` 210 km and `sinai`-`redsea` 200 km (attested in
  `AttestedKm`), with desert crossings, so a connection between a coast and its waters that crosses the desert goes at
  the desert's pace (`connectionDays`) and counts as dry for a company's water and fodder (`legPoints`).
- **Punt** is a door (`Doors`, 5 in a hundred of arrivals, the dossier's first guess; the other doors back to 35, 25, 25
  and 10): men of Punt (Parehu and Ity are the Punt reliefs' names) and Egyptians back from it, opening at Thebes and the
  Sinai. No market: the edge markets do not include it.

### Six cities of Canaan (`model/power.ts`, `model/map.ts` and the province tables)

- **Powers**, after Tyre in the fixed order: Akko (Surata), Hazor (Abdi-Tirshi), Gezer (Milkilu), Ashkelon (Yidya),
  Lachish (Zimreddi) and the Hebron hills (Shuwardata): 39 powers (with item 11d's three) and 61 land provinces in all. Each holds its city as its capital (walls by the walls dossier, as item 11d set the others: Hazor 3, the five
  the dossier does not list 1), an army of 50 men a shekel, and starts as Egypt's vassal with a sealed tablet (`StartVassals`,
  tribute 5 a year). Par is unmeasured (1) until item 18.
- **Carved from** Megiddo (Akko), Damascus (Hazor), Shechem (Gezer), Gaza (Ashkelon), Jerusalem (the Hebron hills) and
  Gaza's and Jerusalem's land (Lachish): each city yield 10, each land it came from 5 less (first guesses). The southern
  Levant's 70,000 people are shared among all ten of its provinces; Hazor's town 12,000 (80 ha), the others small; the
  Hebron hills rough; waters: Gezer a spring, Akko, Ashkelon and Lachish wells, Hazor outside, the Hebron hills cisterns.
- **Connections**: the road from Megiddo to Damascus now runs by Hazor (the dossier's "by Hazor"), and the shore from Tyre
  to Gaza by Akko and Ashkelon, each with waters of its own (hops Gaza, Ashkelon, Akko, Tyre with the current). Other
  links: Hazor to Akko and Tyre; Akko to Megiddo; Ashkelon to Gezer and Lachish; Gezer to Jerusalem, Shechem, Megiddo and
  Lachish; Lachish to Gaza, Jerusalem and the Hebron hills; the Hebron hills to Jerusalem and, across the Negev, the
  Sinai. Every other connection is as it was.
