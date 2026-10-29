# 2. Geography: routes, journey times, terrain, rivers, coasts

For "Map review", "Distance, not steps", "Historical routes and times" and "Finer seas" (item 7), and later distance
inside the realm (item 13) and roads (item 15). Grades and abbreviations: [README](README.md). Map ids are those of
`src/engine/src/model/map.ts`.

**In one line:** armies and caravans of the period covered about 20-30 km a day on land, ships about 50-100 km a day
along a coast; the attested journeys calibrate that, and the great routes (the Ways of Horus, the coast road, the King's
Highway, the Euphrates road, the Taurus passes) give the map its connections.

## Speeds the sources attest

| Journey | Distance | Time | Pace | Grade | Source |
| --- | --- | --- | --- | --- | --- |
| Thutmose III's army, Tjaru (Sile) to Gaza | about 220-250 km | 10 days | about 22-25 km a day | A | His *Annals* at Karnak, first campaign (c. 1457) |
| The same army, Gaza to Yehem, in hostile land | about 120 km | 11 days | about 11 km a day | A | The same |
| Old Assyrian donkey caravans, Ashur to Kanesh | about 1,000-1,100 km | about 6-7 weeks | about 25 km a marching day | B | Veenhof, the Kanesh archives (19th century BCE, the same roads) |
| A royal messenger between Babylon and Egypt | about 1,800-2,000 km by the Euphrates and the coast | months; "the land is far" | - | A (the complaint), C (the time) | EA 7: Burna-Buriash is told Pharaoh did not hear of his illness because the road is long, and his own envoy confirms it |
| Envoys kept abroad | - | years | - | A | Mane and Keliya held at either court (EA 27-29); Assyria's envoys "kept in the sun" (EA 16) |
| Coasting ships | - | - | about 50-100 km a day in fair weather | B | Wachsmann, *Seagoing Ships and Seamanship in the Bronze Age Levant* (1998) |
| Cyprus to Ugarit | about 100-150 km | about a day | - | B | Ugarit texts on ships to and from Alashiya; Wachsmann |
| Crete to Egypt's coast | about 500-550 km open sea | about 4-5 days with the north wind | - | B | Wachsmann; the summer winds blow from the north-west |

**Readings for the game [G]:** a land connection's length in days is its distance at **25 km a day** on good ground,
**15** in mountains, passes and forest, **20** across the desert, where water fixes the stages; a river boat downstream
covers about **60 km a day**; a coasting ship **70**, and open sea **100** in the sailing season ("Seasons" in the
environment dossier). These are travel times for a party; an army with its train is slower by about a third, as the
Gaza-Yehem march shows.

## Distances between the map's places

Approximate road distances, from modern geography (straight line plus about a quarter for the road) [B]; day counts at
the paces above [G].

| Connection (map ids) | Road km | Terrain | Days |
| --- | --- | --- | --- |
| `delta` - `gaza` (the Ways of Horus, across north Sinai) | 250 | desert coast road with forts and wells | 12 |
| `memphis` - `akhetaten` (Nile) | 300 | river | 5 by boat, 12 on foot |
| `akhetaten` - `thebes` (Nile) | 400 | river | 7 by boat |
| `gaza` - `megiddo` (coast road, Via Maris) | 160 | plain | 6-7 |
| `megiddo` - `damascus` | 160 | hills, Jordan crossing | 7 |
| `thebes` - the Red Sea (item 11c; Thebes by Coptos and the Wadi Hammamat to Mersa Gawasis, the Punt expeditions' harbour, where their ship timbers and cargo boxes were found) | 210 | desert road with wells and quarries | 9-11 |
| `sinai` - the Red Sea (item 11c; across the Sinai to the Gulf of Suez, where the mining expeditions to Serabit el-Khadim landed at el-Markha) | 200 | desert | 10 [G] |
| `tyre` - `byblos` (coast) | 130 | coast | 5 |
| `byblos` - `ugarit` (coast, by Sumur and Arwad) | 230 | coast, steep in places | 9-10 |
| `byblos` - `damascus` (over the Lebanon and the Beqaa) | 120 | two mountain ranges | 8 |
| `damascus` - `qadesh` (by the Beqaa or the Orontes) | 140 | valley | 6 |
| `qadesh` - `carchemish` (by Qatna, Aleppo) | 330 | plain, steppe edge | 13 |
| `ugarit` - `carchemish` (by Aleppo) | 260 | hills, then plain | 11 |
| `carchemish` - `harran` | 110 | plain | 4-5 |
| `harran` - `washukanni` | 180 | plain (the Habur triangle) | 7 |
| `washukanni` - `ashur` (by the Jebel Sinjar) | 300 | steppe, hills | 12 |
| `ashur` - `babylon` (the Tigris road) | 350 | river plain | 14 |
| `babylon` - `ur` | 230 | irrigated plain, canals, marsh | 10 |
| `babylon` - `susa` | 330 | plain, then the Elam road | 13-14 |
| `mari` (middle Euphrates) - `babylon` | 350 | river road | 14; 6 downstream by boat |
| `mari` - `damascus` (by Tadmor, across the Syrian desert) | 450 | desert | 22 |
| `hattusa` - `kanesh` | 200 | plateau | 8 |
| `kanesh` - `kizzuwatna` (the Cilician Gates) | 230 | Taurus pass | 15 |
| `kizzuwatna` - `ugarit` (by the Amanus pass, the Syrian Gates) | 280 | coast and pass | 14 |
| `hattusa` - `apasa` (across Anatolia to the Aegean) | 850 | plateau, mountains | 40 |
| `enkomi` - `ugarit` (sea) | 130 | open sea | 2 |
| `enkomi` - `byblos` / `tyre` (sea) | 220-250 | open sea | 3 |
| `delta` - `byblos` (sea, coasting) | 450 | coast | 7 |

What this means for the map: Anatolia and the Euphrates road are long, the Levant short, as "Distance, not steps" says.
From Egypt's capital to Byblos is about a month by land; from Hattusa to Ugarit about as long; from Babylon to
Akhetaten two to three months, which is why envoys took a season or more each way [B].

## The great routes

- **The Ways of Horus** across north Sinai, from Tjaru (Sile, at the Delta's edge) to Gaza, with a chain of forts and
  wells [A: Seti I's relief at Karnak, a generation later; Papyrus Anastasi I]. The only army road between Egypt and
  Canaan.
- **The coast road** (later Via Maris) from Gaza through the Sharon and the Megiddo pass to the Jezreel valley, then
  north by Hazor to Damascus or along the coast by Akko and Tyre [B].
- **The King's Highway** east of the Jordan, from the Gulf of Aqaba by Edom and Moab to Damascus [B; the name is later
  (Numbers 20)].
- **The Beqaa** between the Lebanon and the Anti-Lebanon, from Kumidi to Qadesh [B].
- **The Euphrates road** from Babylonia up the river by Hana (Terqa) and Emar to Carchemish, the crossing to Syria and
  Anatolia, and the road by Harran to the Habur [B].
- **The Tigris road** from Babylonia by Ashur to Nineveh, and east by Arbela and Arrapha to the Zagros [B].
- **The Syrian desert** by Tadmor (Palmyra), Mari's and Hana's shortcut to Qatna and Damascus, held by Sutean nomads [B].
- **The Taurus passes:** the **Cilician Gates** between the plateau (Tuwanuwa, Kanesh) and Kizzuwatna; the **Amanus
  passes** (the Syrian Gates, Belen) between Kizzuwatna and Mukish/Aleppo; the road from Kanesh to Malatya and Isuwa
  [B].
- **The Elam road** from Babylonia (Der) to Susa [B].
- **The sea:** the trading ships went round the eastern Mediterranean anticlockwise: from Egypt north along the Levant,
  to Cyprus, west along southern Anatolia (where the Uluburun ship sank, about 1300), to the Aegean and Crete, and back
  to Egypt across the open sea with the north wind [B: Wachsmann; Uluburun].

## Terrain by connection (proposals for item 7)

- **Desert connections:** `mari`-`damascus` and `mari`-`qadesh` (the Syrian desert, Sutean land); `delta`-`gaza` and
  `gaza`-`sinai` (the north Sinai coast road, desert with forts) [B].
- **Passes:** `kanesh`-`kizzuwatna` and `tuwanuwa`-`kizzuwatna` (the Cilician Gates), `kizzuwatna`-`carchemish` (the
  Amanus), `kanesh`-`carchemish` (the Taurus by Malatya), `byblos`-`damascus` (the Lebanon range) [B].
- **Rivers as connections:** the Nile (`delta`-`memphis`-`akhetaten`-`thebes`, and on to Nubia), the Euphrates
  (`carchemish`-`mari`-`sippar`), the Tigris (`nineveh`-`ashur`-`babylon` region) [B]. Downstream is faster than up.
- **Plateau:** central Anatolia (`hattusa`, `kanesh`, `tuwanuwa`, `sapinuwa`), long distances, hard winters [B].

## The crossings of 1346 (item 11f)

"Every pass, great river, strait or desert edge that was a real obstacle in the period, named in the sources as a road
over mountains, a river crossed by ford or ferry, or a place armies were held" ("Terrain" under War). The game's list
(`Crossings` in `src/engine/src/model/geography.ts`) adds these to the proposals above:

| Connection (map ids) | Crossing | Evidence | Grade |
| --- | --- | --- | --- |
| `nesa`-`isuwa`, `samuha`-`isuwa` | the upper Euphrates | Suppiluliuma "crossed the Euphrates" into Isuwa (the Shattiwaza treaty, Beckman no. 6A) | A |
| `hattusa`-`nesa`, `hattusa`-`tuwanuwa`, `sapinuwa`-`nesa` | the Marassantiya (Halys) | The river ringing the heartland (the table below); Hattusa and Sapinuwa within its bend, the plateau south of it, Samuha on its bank | A (the river), B (as an obstacle) |
| `damascus`-`qadesh` | the Orontes at the ford of Shabtuna | Ramesses II's army crossed at Shabtuna south of Qadesh (the Qadesh inscriptions, 1274) | A, a lifetime later |
| `ugarit`-`niya` | the Orontes below Niya | Amenhotep II "crossed the Orontes" and came to Niya (his Memphis and Karnak stelae) | A |
| `hazor`-`damascus`, `hazor`-`ashtaroth` | the Jordan | The road from Megiddo to Damascus crosses it ("Jordan crossing" above), north of the Sea of Galilee | B |
| `megiddo`-`pella`, `shechem`-`pella`, `hazor`-`pella` | the Jordan (by Beth-Shan) | Pihil's men crossed to attack Beth-Shan (Seti I's first Beth-Shan stela); the rift's fords | A, a generation later; B |
| `beirut`-`damascus` | the Lebanon | The same range as Byblos's and Sidon's roads to the Beqaa | B |
| `libya`-`delta`, `libya`-`memphis` | the Western Desert | The Libyans' land beyond the Delta's edge ([08-beyond-the-edges.md](08-beyond-the-edges.md)) | A (the people), G (the roads) |
| `shasu`-`hebron`, `shasu`-`sinai`, `shasu`-`gaza` | the Negev | As `hebron`-`sinai`; Seti I fought the Shasu on the Ways of Horus | B |

Checked and left out, as lesser streams or ridges that stopped no army, drawn but not crossings: the **Khabur** and the
**Balikh** (the spine of Mitanni's heartland; no army is recorded held at them); the **Zabs** and the **Diyala**
(Tigris tributaries; no source of the period holds an army there); the **Litani** ("short rivers, not routes"); the
**Carmel ridge's Aruna pass** (narrow, but Thutmose III's whole army went through it to Megiddo, Annals, about 1457); the
**Zagros edge** (no connection climbs it: the roads to Susa and Arrapha keep to the plain at its foot); the **Nile's
cataracts** (they break the river's boats into reaches, already in the game, but no march along the bank); and no
**strait** lies on a land connection (the sea crossings are the sea's, with their winter danger).


## Neighbours on the map (item 11f+)

"Neighbours on the map are neighbours in the rules": where the drawn land of two provinces touches they are connected, and
a road over a third province's land passes through it, unless the sources give that road's land to one of the pair. What
each case rests on (the full list is in `docs/design/36-map-neighbours.md`):

| Case | Reading | Evidence | Grade |
| --- | --- | --- | --- |
| The Sutean steppe to Terqa, Aleppo, Harran, Nuhashshe and Qadesh | desert roads, each a crossing of the Syrian desert | "The Syrian desert" above: Mari's and Hana's shortcut by Tadmor; the Suteans on every edge of it (EA 16, 195, 297) | B |
| The Delta to Gaza by the Sinai | the Ways of Horus are the Sinai's road; their forts were Egypt's | "The Ways of Horus" above (Seti I's Karnak relief; Papyrus Anastasi I) | A |
| Akko to Ashkelon, Gaza to Megiddo, Gezer to Megiddo | the coast road goes inland through the Aruna pass to Megiddo; the pass is Megiddo's | Thutmose III's Annals: Yehem, Aruna, Megiddo | A |
| Gaza to Jerusalem, Shechem; Jerusalem to Lachish; Hebron, Jerusalem to the Sinai | the roads from the coast into the hills go by the cities between | the Amarna letters' cities between them (EA 287-290: Gezer, Lachish, Ashkelon, Qiltu); no source gives these roads' land to either end | B |
| Tyre to Damascus, Megiddo to Tyre | by Hazor and by Akko | "The coast road" above: north by Hazor, or along the coast by Akko | B |
| Damascus to Sidon | Kumidi in the Beqaa, Egypt's seat in Upe, is Damascus's land | EA 116, 132, 198 (Kumidi); "The Beqaa" above | A (Kumidi), B (its land) |
| Ashtaroth, Pella and Jerusalem to the Shasu | the King's Highway and the pastures east of the Jordan and the Dead Sea are the Shasu's | "The King's Highway" above; the Shasu lands of Seir and Edom in Egyptian lists ([08-beyond-the-edges.md](08-beyond-the-edges.md)) | B (the road), G (the land north of Edom) |
| Jerusalem to Pella and to the Shasu | across the Jordan at the fords by Jericho | the rift's fords, as `megiddo`-`pella` above | B |
| Dur-Kurigalzu to Susa, Arrapha to Susa | the Elam road by Der, a Babylonian city; the land east of the Tigris to the Zagros is Babylonia's | "The Elam road" above | B |
| Azzi to Samuha | the Upper Land faced Hayasa; the road between is the Hittites' | the Hittite campaign texts against Hayasa (Suppiluliuma's Deeds) | B |
| The Kaska to Samuha | the Kaska held the mountains north of the Upper Land | Hattusili III's Apology; the Kaska frontier along the whole north | B |
| Mira to Tuwanuwa; Seha to Tuwanuwa by Mira | the Lower Land, Hatti's frontier province, faced Arzawa; Seha's road east runs through Mira | the Lower Land's governor in the Hittite texts; the Mira-Kuwaliya treaty | B |
| Nesa to Sapinuwa and to Isuwa by Samuha | the road crosses the Marassantiya at Samuha and goes on to the Euphrates | "The crossings of 1346" above | B |
| Samuha to Carchemish | across the Anti-Taurus, the range on Nesa's road to Carchemish | "Terrain by connection" above | B |
| Mesopotamia: Ashur and Ekallate to Suhu; Taidu to Ashur, Terqa, Isuwa; Sippar-Nippur, Arrapha-Dur-Kurigalzu, Dur-Kurigalzu-Suhu; Babylon to Dur-Kurigalzu by Sippar | open plain and steppe between the rivers, no obstacle the sources name; the roads go by the cities between | "The Euphrates road" and "The Tigris road" above | B |
| Northern Syria: Alalakh-Nuhashshe, Amurru-Qatna, Niya-Qatna, Tunip-Ugarit; Nuhashshe to Qadesh, Tunip; Qadesh to Tunip; Amurru to Ugarit | neighbours by their land; the roads between go by the cities between | the Orontes valley's cities in the Amarna letters and the Aziru treaties | B |

## Rivers

| River | Ancient name | Runs through (map ids) | Note | Grade |
| --- | --- | --- | --- | --- |
| Nile | *Iteru* | `thebes`, `akhetaten`, `memphis`, `delta`, Nubia (item 7) | Floods July to September ("Environment") | A |
| Euphrates | *Purattu* | `carchemish`, `mari`, `sippar`, `babylon`, `ur` | Crossed at Carchemish and Emar | A |
| Tigris | *Idiglat* | `nineveh`, `ashur`, `babylon` region | Fast, floods in spring | A |
| Habur and Balikh | *Habur*, *Balih* | `washukanni`, `taidu`, `harran` | The Habur triangle, Mitanni's heartland | A |
| Orontes | *Arantu* | `qadesh`, `tunip`, `niya`, Mukish | Qadesh, Tunip and Niya stand on it; forded at Shabtuna (crossings above) | A |
| Halys | *Marassantiya* | `samuha` on it; rings `hattusa` and `sapinuwa` | Rings the Hittite heartland | A |
| Jordan, Litani | - | the Jordan between `megiddo`, `shechem`, `hazor` and `pella`, `ashtaroth`, `damascus`; the Litani by `tyre` | Short rivers, not routes; the Jordan crossed at fords in its rift | B |
| Karun, Karkheh | - | `susa` | Elam's plain | B |
| Lower and Upper Zab, Diyala | - | `arbela`, `ekallatum` | Tigris tributaries; the Assyrian-Babylonian border near the Diyala | B |

## The land as it was in 1346 (item 11c+)

Where the land of 1346 differs from today's, as the map draws it:

- **The Gulf's head** reached up the lower plain towards Ur; the sea has since withdrawn some 150 to 200 km [B: the line
  is argued; Ur was a port in the third millennium and on the Euphrates in the second].
- **The bay of Miletus** (the Latmian Gulf) was open sea from Miletus, on its southern shore, past Myus to Heraclea
  under Latmos; the Maeander silted it from Roman times on, and Lake Bafa is what is left of it [A for the gulf, B for
  its shore line in the fourteenth century].
- **The Euphrates ran in its old bed** by Sippar, Babylon (through the city), Nippur's country, Uruk and Ur; it has since
  moved west to its Hindiya course, and Ur and Uruk lie far from it [A for the cities on the river, B for the line between
  them].
- **The Delta's branches**: the New Kingdom Nile reached the sea by several branches, the Pelusiac (by Bubastis to
  Pelusium) on the east, the Tanitic, the Sebennytic and the Canopic on the west, besides the two that remain today
  [A for the branches, B for their exact courses].

What a border follows (item 11c+, `scripts/map-borders.ts`): a ridge (the ranges drawn), a great river where it was a
frontier (the Euphrates from Carchemish and Emar upstream, the Tigris between Taidu and Nineveh) and every lesser river,
and a desert's edge; a great river where it is the spine of the provinces along it (the Nile, the Euphrates below Emar,
the Tigris below Nineveh) is crossed within them. Crossings in the rules stay as `Geography` lists them until item 11f.

## Coasts and harbours

| Place (map id) | Harbour of the period | Grade |
| --- | --- | --- |
| `ugarit` | Mahadu (Minet el-Beida), Ugarit's port; the busiest trading port of the coast | A |
| `amurru` / Sumur (item 7) | Sumur (Tell Kazel), Egypt's base; Arwad, an island city offshore | A |
| `byblos` | Byblos, the old cedar port | A |
| Sidon (item 7) | Sidon | A |
| `tyre` | Tyre, an island city with its mainland town, Ushu (EA 148-149) | A |
| `akko` (item 11c; before, in `megiddo`'s land) | Akko (EA 8, Surata's city), Tell Abu Hawam | A |
| `gaza`, `ashkelon` (item 11c) | Gaza; Ashkelon (Yidya's city, EA 320-326) | A |
| `delta` | Peru-nefer (probably Avaris, Tell el-Dab'a), the royal dockyard of the 18th Dynasty | C |
| `enkomi` | Enkomi; Hala Sultan Tekke near Kition | A |
| `tamassos` (west and south Cyprus) | Toumba tou Skourou (Morphou Bay), Maroni and Kalavasos (south coast), Palaepaphos | B |
| `kizzuwatna` | Tarsa (Tarsus), Ura (Hatti's port, attested later) | B |
| `lukka` | No named harbours; a raiders' coast (EA 38) | A |
| `apasa`, `seha` | Apasa (Ephesus), Millawanda (Miletus, off the map) | B |
| `ur` / Dilmun (item 7) | The Gulf ports; Dilmun's Qal'at al-Bahrain | B |
| The Red Sea (item 11c) | Mersa Gawasis (Saww), reached from Coptos by the Wadi Hammamat; el-Markha on the Gulf of Suez for the Sinai mines. Ships were built on the Nile, carried across the desert in pieces and assembled on the shore (Bard and Fattovich) | A |

## Names for the provinces "Map review" renames

- **`mari`, the middle Euphrates:** **Hana** (the kingdom of the middle Euphrates, centred on Terqa, in 1346 within
  Mitanni's reach) [B]. Since Terqa is Hana's own capital, the Mitanni province now called `terqa` should take another
  name: **Kahat** (Tell Barri), a Mitanni town on the Habur named in the Shattiwaza treaty [B], if the province is the
  lower Habur; the builder of item 7 checks where it sits.
- **`kanesh`:** **Shamuha** (probably Kayalıpınar), a royal residence and army base of exactly these years, where
  Tudhaliya III lived while Hattusa lay burned [A: KBo VI 28] [C: its location], if the province reaches up the Halys
  towards Isuwa; otherwise **Nesa**, the Hittite name of Kanesh itself [A].
- **`ekallatum`:** no Middle Assyrian town is well known on the Tigris south of Ashur. If the province is the land
  between the Zabs, **Kilizi** (a Middle Assyrian provincial town) [B]; the border with Babylonia ran near the Lower
  Zab and the Diyala [C].
- **`tamassos`, western and southern Cyprus:** **Kalavasos** (Ayios Dhimitrios, a large town with a monumental
  building and oil stores at its height in the 14th-13th centuries) [B], since the clay of the Alashiya letters comes
  from the southern Troodos foothills near Alassa and Kalavasos [C: Goren et al. 2003], if it reaches the south coast;
  **Toumba tou Skourou** if it centres on Morphou Bay, though its height was earlier, before about 1400 [C].
