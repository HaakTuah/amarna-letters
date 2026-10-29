# 13. The land drawn: relief, rivers, lakes and marshes (item 11c++)

What the map draws of the land itself, and where each line comes from. Drawing only: no rule reads it (the rules'
terrain is `Geography`, "Terrain" under War, and dossier [02-geography.md](02-geography.md)). Grades as in the README.

## The data, all public domain

| What | Source | Script |
| --- | --- | --- |
| Relief | AWS Open Data "Terrain Tiles" (Terrarium), zoom 7, about 1 km a pixel; here built from SRTM, GMTED2010 and ETOPO1, all public domain | `scripts/map-relief.mjs` (with `map-dem.mjs`) |
| Coasts, lakes, the great rivers, Anatolia's rivers | Natural Earth 1:50m and 1:10m, with its European supplement for Anatolia | `scripts/map-geography.ts` |
| The Orontes, the Litani, the Khabur, the Balikh, the two Zabs, the Diyala, the Karun | Traced down their valleys on the same elevation, from source to mouth | `scripts/map-rivers.mjs` |
| The Delta's old branches, the Euphrates' old bed, the Gulf's head, the bay of Miletus | By hand from [02-geography.md](02-geography.md), "The land as it was in 1346" | `src/web/src/map/features.ts` |
| The lakes and marshes below | By hand, from the lines given here | `src/web/src/map/period-water.ts` |

## Rivers that mattered

Besides the Nile, the Euphrates and the Tigris ([02-geography.md](02-geography.md), "Rivers"):

- **The Orontes** (*Arantu*), from its springs in the northern Beqaa past Qadesh, Qatna's country and the Amuq plain to
  the sea [A]. **The Litani**, from the southern Beqaa round the foot of the Lebanon to the sea north of Tyre [B].
  **The Jordan**, from its springs by Dan through Lake Huleh and the Sea of Galilee to the Dead Sea [A].
- **The Khabur** (*Habur*), from the springs of Ras al-Ain, through Mitanni's heartland, to the Euphrates; **the
  Balikh** (*Balih*), from the spring of Ain al-Arus by Harran's plain to the Euphrates [A].
- **The Upper and Lower Zab** and **the Diyala** (*Turan*), the Tigris' eastern tributaries; **the Karun** and **the
  Karkheh**, Elam's rivers on Susa's plain [B].
- In Anatolia: **the Halys** (*Marassantiya*) [A]; **the Sangarios** (Sakarya), **the Iris** (Yeşilırmak), **the
  Arsanias** (Murat), **the Saros** (Seyhan), **the Pyramos** (Ceyhan) and **the Kalykadnos** (Göksu) [B]; and on the
  Aegean side **the Hermos** (Gediz; the Seha River Land is placed on it or the Kaikos) [C], **the Kaystros** (Küçük
  Menderes, by Apasa) and **the Maeander** [B].

## Lakes and marshes of 1346

Where the water of 1346 differs from today's, drawn as follows (latitude, longitude):

- **Lake Huleh** and its swamp, in the upper Jordan valley (about 33.04-33.10 N, 35.59-35.64 E; the swamp north of it to
  33.17 N), drained in the 1950s; a lake there through antiquity [A for the lake, C for its outline in 1346].
- **The Lake of Antioch** in the Amuq plain (about 36.26-36.42 N, 36.22-36.41 E), drained in the 1970s; the plain of
  Alalakh was marshy round a lake in the Bronze Age [B for the lake, C for its size].
- **The Faiyum's lake** (Lake Moeris to the Greeks), higher and larger than Birket Qarun today (about 29.38-29.60 N,
  30.35-30.95 E) [B for a larger lake in the New Kingdom, C for its shore].
- **Lake Mareotis** behind Egypt's western coast, and **the lagoons of the Delta's shore** (Idku, Burullus, and the
  lagoon by the Pelusiac branch where Lake Manzala lies) [B for lagoons along the shore, C for their outlines].
- **The marshes at the Gulf's head**: reed beds and standing water round Lagash and Girsu, east of Ur and along the lower
  Tigris towards Susa's plain (about 30.95-31.95 N, 46.2-47.8 E), with the Gulf's head further north than today's [B].

## Relief

The ranges stand where the elevation puts them: the Taurus and Anti-Taurus, the Amanus, the Lebanon and Anti-Lebanon,
the Zagros, the Pontic mountains, the Armenian highlands, the Troodos, the mountains of Sinai, the Hejaz and the Red Sea
hills. The ridges the borders follow (`RangeLines` in `features.ts`) lie along them.
