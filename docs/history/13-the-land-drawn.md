# 13. The land drawn: relief, rivers, lakes and marshes (item 11c++)

What the map draws of the land itself, and where each line comes from. Drawing only: no rule reads it (the rules'
terrain is `Geography`, "Terrain" under War, and dossier [02-geography.md](02-geography.md)). Grades as in the README.

## The data, all public domain

| What | Source | Script |
| --- | --- | --- |
| <a id="13-relief"></a>Relief | AWS Open Data "Terrain Tiles" (Terrarium), zoom 7, about 1 km a pixel; here built from SRTM, GMTED2010 and ETOPO1, all public domain. Each tile's `x-amz-meta-x-imagery-sources` header names them (e.g. "srtm/N33E035.tif, ... gmted/30N030E_20101117_gmted_mea075.tif, etopo1/ETOPO1_Bed_g.tif"); the licence page the registry links (tilezen/joerd, `docs/attribution.md`): "SRTM is a public domain dataset", "GMTED2010 is a public domain dataset", "ETOPO1 is a public domain dataset" | `scripts/map-relief.mjs` (with `map-dem.mjs`) |
| <a id="13-natural-earth"></a>Coasts, lakes, the great rivers, Anatolia's rivers | Natural Earth 1:50m and 1:10m, with its European supplement for Anatolia. naturalearthdata.com, "Terms of Use": "All versions of Natural Earth raster + vector map data found on this website are in the public domain" | `scripts/map-geography.ts` |
| The Orontes, the Litani, the Khabur, the Balikh, the two Zabs, the Diyala, the Karun | Traced down their valleys on the same elevation, from source to mouth | `scripts/map-rivers.mjs` |
| The Delta's old branches, the Euphrates' old bed, the Gulf's head, the bay of Miletus | By hand from [02-geography.md](02-geography.md), "The land as it was in 1346" | `src/web/src/map/features.ts` |
| The lakes and marshes below | By hand, from the lines given here | `src/web/src/map/period-water.ts` |

## Rivers that mattered

Besides the Nile, the Euphrates and the Tigris ([02-geography.md](02-geography.md), "Rivers"). The courses are today's,
which the elevation draws; where a period name is given, the source is named.

| River | Course | Grade and source |
| --- | --- | --- |
| <a id="13-orontes"></a>**The Orontes** | From its springs in the northern Beqaa past Qadesh, Qatna's country and the Amuq plain to the sea | B. Bryce, Letters, p. 133: "Qatna lay east of the Orontes river, some 40 kilometres to the north-east of Kadesh" |
| <a id="13-litani"></a>**The Litani** | From west of Baalbek down the southern Beqaa, round the foot of the Lebanon to the sea north of Tyre | B |
| <a id="13-jordan"></a>**The Jordan** | From its springs at the foot of Hermon (by Dan and Banias) through Lake Huleh and the Sea of Galilee to the Dead Sea | A, thirteen centuries later. Josephus, *Jewish War* 3.10.7 (Whiston): "divides the marshes and fens of the lake Semechonitis ... passes through the middle of the lake Gennesareth ... into the lake Asphaltites" |
| <a id="13-khabur"></a>**The Khabur** (*Habur*) | From the springs of Ras al-Ain, through Mitanni's heartland, to the Euphrates | B. Moran, index of names ("Hanigalbat"): "the political center lay between the Balih and Habur Rivers" |
| <a id="13-balikh"></a>**The Balikh** (*Balih*) | From the spring of Ain al-Arus by Harran's plain to the Euphrates | B. Pleiades, "Balihu/Balissus (river)" |
| <a id="13-zabs"></a>**The Upper and Lower Zab** | The Tigris' eastern tributaries | B. Pleiades, "Zabas Mikros": "flows from the Zagros Mountains to the Tigris River" |
| <a id="13-diyala"></a>**The Diyala** (*Turnat*) | The Tigris' eastern tributary | B. Pleiades: "'Diabas'/Turnat (river)"; "The Diyala River is a major tributary of the Tigris" |
| <a id="13-karun-karkheh"></a>**The Karun** and **the Karkheh** | Elam's rivers on Susa's plain | B. Pleiades, "Karun (river)": "flows from the Zard-Kuh mountains to the Persian Gulf" |
| <a id="13-halys"></a>**The Halys** (*Marassantiya*) | Bounds the Hittite heartland | A. Bryce, Letters, p. 9: "what the Hittites called the Marassantiya river, the Halys river of Classical times (mod. Kizil Irmak)"; p. 24: "the region bounded by the river called the Marassantiya by the Hittites" |
| <a id="13-sangarios"></a>**The Sangarios** (Sakarya) | Anatolia | B. Pleiades, "Sangarius (river)": "The Sangarius river (modern Sakarya)" |
| <a id="13-iris"></a>**The Iris** (Yeşilırmak) | Anatolia, to the Black Sea | B. Pleiades, "Iris (river)": "Iris fl. (Yeşilırmak River)" |
| <a id="13-arsanias"></a>**The Arsanias** (Murat) | A source of the Euphrates | B. Pleiades, "Arsanias (river)": "a major source of the Euphrates" |
| <a id="13-saros"></a>**The Saros** (Seyhan) | Cilicia | B. Pleiades: "(P)Saros/Sinarus/Koiranos fl. (Seyhan River)" |
| <a id="13-pyramos"></a>**The Pyramos** (Ceyhan) | Cilicia, to the sea | B. Pleiades, "Pyramos (river)": "The modern Ceyhan River" |
| <a id="13-kalykadnos"></a>**The Kalykadnos** (Göksu) | Rough Cilicia, to the sea | B. Pleiades, "Calycadnus (river)": "The most important river of Cilicia Tracheia" |
| <a id="13-hermos"></a>**The Hermos** (Gediz) | The Aegean side; the Seha River Land is placed on it or the Kaikos | B for the river; C for the Seha. Pleiades, "Hermus (river)": "The Gediz River" |
| <a id="13-kaystros"></a>**The Kaystros** (Küçük Menderes) | The Aegean side, by Apasa ([02-geography.md](02-geography.md), `02-apasa-millawanda`) | B. Pleiades, "Cayster (river)": "The Küçükmenderes River" |
| <a id="13-maeander"></a>**The Maeander** | The Aegean side | B |

## Lakes and marshes of 1346

Where the water of 1346 differs from today's, drawn as follows (latitude, longitude):

- <a id="13-lake-huleh"></a>**Lake Huleh** and its swamp, in the upper Jordan valley (about 33.04-33.10 N, 35.59-35.64 E; the swamp north of it to 33.17 N), drained in the 1950s; a lake with marshes north of it in antiquity [A, from Josephus, for the lake; C for its outline in 1346]. Josephus, *Jewish War* 4.1.1 (Whiston): "the lake Semechouitis ... its marshes reach as far as the place Daphne"
- <a id="13-lake-of-antioch"></a>**The Lake of Antioch** in the Amuq plain (about 36.26-36.42 N, 36.22-36.41 E), drained by the early 1970s. In the Late Bronze Age it was small or gone, perhaps with local marshes, where in the plain is not known for 1346 [C: it reached its largest in the first millennium AD]. M. Pucci, "The Amuq Region during the Iron Age I-II": "It seems generally accepted that the lake of Antioch did not exist in the Late Bronze Age and Iron Age"; S. El Ouahabi et al., *The Holocene* (2017): "Between 3000 and 1000 BC, a drying of the lake is attested", while at their core site "a restricted water body prevailed ... even though it was absent in others"
- <a id="13-faiyum-lake"></a>**The Faiyum's lake** (Lake Moeris to the Greeks), of which Birket Qarun (about 29.38-29.60 N, 30.35-30.95 E) is the remnant [B]; how much larger it was in the New Kingdom, and its shore then, no source checked gives [C]. Pleiades, "Moeris (lake)": "its surviving modern remnant is Birket Qarun"
- <a id="13-lake-mareotis"></a>**Lake Mareotis** behind Egypt's western coast, then a lagoon fed more by the sea than by the Nile [B for the lagoon, C for its outline]. C. Flaux et al., *Quaternary Science Reviews* 78 (2013): "A fully marine-like signature is recorded from ~3.8 to ~2.8 ka cal. BP"
- <a id="13-delta-lagoons"></a>**The lagoons of the Delta's shore** (Idku, Burullus, and in the north-east where Lake Manzala lies), and in north-west Sinai a lagoon into which the Pelusiac branch's forerunners emptied [B for lagoons and marshes along the shore, C for their outlines]. H. Howa and D. J. Stanley, *Journal of Coastal Research* (1991): "coastal ridges, behind which back-barrier marshes and lagoons formed", their peats about 7500-1700 years BP in the north-central delta and "about 4000 to 2500 years BP" in the north-east; J. Hoffmeier (2023), on Tell el-Borg: "the paleo-lagoon that had direct access to the Mediterranean"
- <a id="13-hammar"></a>**The Hammar's marshes** below Ur, between the river port and the estuary of 1346 (about 30.65-30.95 N,
  46.5-47.45 E): freshwater reed beds by Kassite times, a Kassite-period settlement (Tel Aqram, about 30.75 N, 46.9 E) on
  dry land at their southern edge (Hansman, *Geographical Journal* 144, 1978, pp. 58-59), the marsh last marine about
  4300 years ago (Sanlaville and Dalongeville 2005) [G for the outline].
- <a id="13-gulf-head-marshes"></a>**The marshes at the Gulf's head**: reed beds and standing water round Lagash and Girsu, east of Ur and along the lower Tigris towards Susa's plain (about 30.95-31.95 N, 46.2-47.8 E), with the Gulf's head further north than today's ([02-geography.md](02-geography.md), `02-gulf-head`) [C: the evidence checked is for the Early Dynastic period, about 2900-2350 BC, and the wetlands shrank in the later third and second millennia, so the marshes of 1346, and their reach towards Girsu and Susa, are read back]. E. Hammer, *Journal of Anthropological Archaeology* 68 (2022), as reported by *Science News*, of Early Dynastic Lagash: "a vast urban settlement called Lagash largely consisted of four marsh islands"

## Relief

The ranges stand where the elevation puts them: the Taurus and Anti-Taurus, the Amanus, the Lebanon and Anti-Lebanon,
the Zagros, the Pontic mountains, the Armenian highlands, the Troodos, the mountains of Sinai, the Hejaz and the Red Sea
hills. The ridges the borders follow (`RangeLines` in `features.ts`) lie along them.
