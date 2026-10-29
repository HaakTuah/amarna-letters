# Neighbours on the map are neighbours in the rules (item 11f+)

Build order item 11f (`docs/intent/build-order/item-11.md`), its third part, which item 11f left for the next item that
touches the connections (`docs/rounds/2026-10-29-map-crossings.md`, "Not built here"): "provinces whose land touches are
connected, with a crossing where a ridge, river or desert edge lies between them (the desert routes across the steppe were
real roads), and a road that crosses a third province's land either passes through that province or the border is redrawn
where the sources give the road's land to one of the pair, each case with the dossier it rests on". Save version 32. The
report, with the readings taken and the measures, is `docs/rounds/2026-10-29-map-neighbours.md`.

## The rule, and how it is kept

- `scripts/map-borders.ts` traces each province's land from its city along the land itself (item 11c+) and lists every pair
  whose drawn land touches with no connection, and every land connection whose two provinces' land does not touch. After
  this item the list is empty, and it is to stay so: a new place or road that brings a disagreement back settles it by the
  same rule in the same item.
- **Touching land is connected** (`buildMap` in `model/map.ts`), with a crossing (`Crossings` in `model/geography.ts`) where
  a real obstacle of 1346 lies between them by "Terrain" under War: the Sutean steppe's desert roads, the Jordan, the
  Anti-Taurus, the Negev. A lesser stream or ridge (the Khabur, the Litani, the Galilee hills, the south-eastern Taurus
  between Isuwa and Taidu, as between Isuwa and Washukanni) is drawn but not made one, as item 11f decided.
- **A road over a third province's land passes through it:** the direct connection is removed, and the journey goes by the
  province between, at about the same length (travel is by days, `connectionDays`), now through its passage, its troops and
  its watch.
- **A road's land given to one of the pair** (`RoadLands` in `src/web/src/map/features.ts`): a band about 5 km either side
  of the road is that province's, and any land the band cuts off from its own city goes with the band, so no province is
  left in two pieces. Drawing data only: the rules' connections stay the source of truth.
- **Par measured again** (`src/engine/src/rules/par-results.ts`, seeds 101-150, as item 11e did): the new neighbours
  change who falls and grows (Arrapha, Suhu and the Sutean steppe most), and the table now also has the eight places
  item 11f added.

## The cases (the dossier: `docs/history/02-geography.md`, "Neighbours on the map")

Connected, their land touching (23): Alalakh-Nuhashshe, Amurru-Qatna, Niya-Qatna, Tunip-Ugarit; the Sutean steppe to Aleppo,
Harran, Nuhashshe, Qadesh and Terqa (desert: the Syrian desert); Taidu to Isuwa, Terqa and Ashur; Ashur-Suhu,
Dur-Kurigalzu-Suhu, Arrapha-Dur-Kurigalzu, Sippar-Nippur; Samuha-Carchemish (a pass: the Anti-Taurus); Hazor-Sidon,
Gezer-Hebron; Jerusalem-Pella and Jerusalem-Shasu (a river: the Jordan by Jericho), Pella-Shasu, Lachish-Shasu (desert: the
Negev).

Through the province between (24): Seha to Tuwanuwa by Mira; Nesa to Sapinuwa and to Isuwa by Samuha; Ashur and Ekallate to
Terqa by Suhu; Ekallate to Sippar and Babylon to Dur-Kurigalzu by Dur-Kurigalzu and Sippar; Arrapha to Susa by Dur-Kurigalzu
(Der); the steppe to Suhu by Terqa; Nuhashshe to Qadesh by Qatna, to Tunip by Niya, to Terqa by the steppe; Qadesh to Tunip
by Amurru or Qatna; Amurru to Ugarit by Sumur or Tunip; Tyre to Damascus by Hazor, Megiddo to Tyre by Akko; Akko to Ashkelon
and Gaza to Megiddo by Megiddo and Gezer (the coast road through the Aruna pass); Gaza to Shechem and Jerusalem by Ashkelon,
Gezer and Lachish; Jerusalem to Lachish by Gezer or Hebron; Hebron and Jerusalem to the Sinai by Gaza or the Shasu's land;
and the Delta to Gaza by the Sinai, the Ways of Horus being the Sinai's road (Tjaru to Gaza, 250 km: 150 and 130 km for the
two parts, `AttestedKm`). Their crossings go with them: the Ways of Horus is now the Delta-Sinai crossing, and the Negev
crossings from Hebron and Jerusalem to the Sinai, the upper Euphrates from Nesa, the Marassantiya from Sapinuwa to Nesa and
the Syrian desert from Suhu are gone with their connections.

The road's land redrawn (7): the Aruna pass to Megiddo (Gezer-Megiddo); the King's Highway to the Shasu (Ashtaroth-Shasu,
and the Shasu's pastures east of the Jordan and the Dead Sea, which the Jordan now bounds); the Upper Land's road to Hayasa
to Samuha (Azzi-Samuha); the Elam road by Der to Dur-Kurigalzu (Dur-Kurigalzu-Susa, and the land east of the Tigris up to
the Zagros); the mountains north of the Upper Land to the Kaska (Kaska-Samuha); the Lower Land's road west to Tuwanuwa
(Mira-Tuwanuwa); and Kumidi in the Beqaa to Damascus (Damascus-Sidon).
