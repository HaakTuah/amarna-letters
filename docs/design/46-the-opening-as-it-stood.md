# The opening as it stood (item 17+)

Build order item 17+ (`docs/intent/build-order/item-17.md`, "Then **17+**"): the opening as it stood in 1346, the land
east of the Jordan, every place and person by its own name, the people of 1346 who did not rule, and troops paid and fed
by the king's standing order. The report, with the readings taken, every name weighed and the measures, is
`docs/rounds/2026-11-01-opening-as-it-stood.md`. Save version 38.

## Troops paid and fed by the king's standing order

In `docs/design/16-the-economy-at-home.md`, "The season", step 3 ("By the king's standing order only"): `TroopUpkeep`,
order `upkeep`, the seat view's `payTroops`, `feedTroops`, `payHeld`, `feedHeld`, and the script kings' rule
(`bots/upkeep.ts`).

## Where things stood (`StartUnits`, `cityUnits` in `model/map.ts`; `StartDebts` in `rules/factory.ts`)

- **The Great Kings' men** stand where the dossiers place them in 1346, at item 13's sizes: Egypt at Men-nefer 6,000, Akhetaten
  4,000, Waset 2,200, in Kush 2,800 (the viceroy's, Akhenaten's one attested campaign), Gaza and Sumur 100 each; Hatti at
  Hattusa 5,500, Samuha 3,000 (the Upper Land's army base, KBo VI 28), in Kizzuwatna 3,000 (Telipinu, facing Syria),
  Tuwanuwa 1,500 (the Lower Land facing Arzawa), Nesa and Sapinuwa 1,000 each, its five ships off Kizzuwatna; Mitanni at
  Washukanni 5,000, Harran 3,000, Taidu 2,000; Babylonia at Babylon 4,000, Dur-Kurigalzu 3,000, Nippur and Sippar 1,500
  each; Assyria at Ashur 2,000, Nineveh and Arbela 1,000 each (the Tigris triangle); Arzawa at Apasa; Alashiya at Enkomi
  1,000 and in the copper hills 500. Grades in the data's comment; the report lists each as a reading.
- **The city-states'** stand in their cities, but where the letters place them: Arwad's ships off Byblos (EA 98, 105),
  Sidon's off Tyre (EA 148-149), Aziru's men in Sumur's countryside (EA 103-106). Labaya's war on Megiddo (EA 244) was
  over before 1346, so Shechem's men stand at home. The tests' old world (`armiesBefore13` in `src/engine/test/support.ts`)
  keeps item 13's places.
- **Documented debts between courts** start as debt tablets in the creditor's archive (`openingDebts`): Egypt owes Mitanni
  the solid-gold statues Amenhotep III promised (EA 26-29), 200 shekels; Egypt owes Babylonia the silver of its merchants
  killed at Hinnatuna and of Salmu's robbed caravan (EA 7-8), 60; Alashiya owes Egypt the copper it says it still owes
  (EA 35), 80; each due within the first year [the claims A, the sums G]. Nothing enforces them ("Debts are facts;
  repayment is a choice"); a court sees them in its seat view like any debt.
- **No letters or memories** are written for any court: what each court knows of the others' standing is the dossiers'
  relations as items 11+ and 11b set them.

## The land east of the Jordan, and the map checked against 1346 (`model/map.ts`, `src/web/src/map/features.ts`)

- **The Shasu hold Seir and the desert west of it** (the Negev), where Amenhotep III's lists place them; the Bashan is
  Ashtaroth's hinterland and the land south of it (the later Gilead) Pella's; the plateau beyond the Salt Sea, where Moab
  and Ammon rose centuries later, is land outside the game (a waste in the drawing). So the Shasu no longer border
  Ashtaroth, Pella or Jerusalem (item 11f+'s King's Highway band, grade G, undone), and the Jordan crossing by Jericho
  joins Jerusalem to Pella only. The Shasu's connections: Gath, Gaza, Lachish (the Negev) and the Sinai.
- **Shuwardata's land is centred on Gath** (Tell es-Safi; Gimti in the letters), his likely seat, since Hebron had no town in
  the Late Bronze Age: province and power `gath`/`Gath` (ids renamed, nothing kept `hebron`), a town of several thousand,
  its land running from Gath up the Elah valley by Qiltu into the southern hills (a `RoadLands` band), between Gezer and
  Lachish on the road from the coast, bordering Ashkelon, Aijalon, Jerusalem, Lachish and the Shasu. Not rough ground (its
  seat is in the lowland).
- **The Lady of the Lions**, Baʿlat-nese (EA 273-274), rules a small city-state, `aijalon`/`Aijalon`, in the Aijalon valley
  between Gezer and Jerusalem, its site uncertain (Yalo stands in for it), yield 5 (Gezer and Jerusalem each 1 less), walls
  1, a spring, a small town, Egypt's vassal; the road from Gezer up to Jerusalem runs through it, so Gezer and Jerusalem
  are no longer joined directly. Her being a woman plays no part in the rules.
- **Suhu folds into Babylonia:** no dossier shows it acting as a polity in 1346 (the walls dossier: not excavated for the
  period, [S]; the politics dossier: the Kassite kingdom "to about Hit"), so the province is Babylonia's land, not a
  capital, its yield as before; the power `Suhu` is gone (its par line with it). Grade C.
- **Alshe and Ashtata (Emar)** do not join the map: the dossiers show Alshe only in the Shattiwaza treaty's account of
  Shuttarna III's doings, after 1346, and Emar only as a crossing of the Euphrates and Idrimi's refuge a century before;
  neither acts as a polity in 1346 ("What earns a place").
- **Nesa** is a land with no great town marked (`Province.town` false; the web draws its seal without a town's rings), its
  town about 1,000; its old mound walls stay 1.
- **Every town's people as it stood** (`ProvinceEconomies` in `model/economy.ts`, thousands): Akhetaten 18 (still being
  built, below Waset and Men-nefer at 30), Kalavasos 1 (small and new), Nesa 1, Gath 3, Tunip 5 (beside Niya 3 and Qadesh
  5), Aijalon 1; the rest checked against the people dossier's ranges and left as they were.
- The borders are regenerated (`node --experimental-strip-types scripts/map-borders.ts`), with no disagreement between the
  drawing and the connections, as item 11f+ requires; the Jordan cases in `docs/design/36-map-neighbours.md` are read
  with this note.
