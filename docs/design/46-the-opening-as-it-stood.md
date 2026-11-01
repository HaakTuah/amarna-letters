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

## Places and people by their own names (`model/map.ts`, `model/power.ts`, `rules/cast.ts`, `model/languages.ts`)

- **Every province's shown name** (`Province.name`) is the name the sources of 1346 use: the Amarna letters' form, as Moran
  normalises it, where the letters name the place (Dimashqa, Gubla, Ṣurru, Ṣiduna, Urusalim, Magidda, Shakmu, Hasura,
  Gazru, Akka, Ashqaluna, Lakisha, Gimti, Ayyaluna, Pihil, Ashtartu, Hazzatu, Biruta, Arwada, Ṣumur, Halab, Karkamish,
  Babili, Ninua, Arbail); otherwise the period's own Egyptian, Hittite, Assyrian or Babylonian form (Waset, Men-nefer,
  Ta-Mehu, Kush, the Ways of Horus, Hayasa, Urim, Shushan, the land of the Tjehenu, Seir); a place with no name of the
  period is named by description (the copper hills and the harbour of Alashiya, the Sutean steppe, the Kaska lands, the
  Western and the Eastern Sea, the Gulf, the plateau beyond the Salt Sea, drawn as no one's with its label). The waters
  take their coasts' names. The ids stay (`damascus`, `byblos`), and so do the orders that name them.
- **The modern name** (`ModernNames`, `modernOf`) is on the second line of the web's province card ("today Damascus") and in
  the models' list of provinces in the rulebook, each place once ("today Damascus"), so a model can place it; never in a
  letter, report or request. The README names the renamed places once.
- **The powers' land names** (`land(p)`) follow: Gubla, Ṣurru, Karkamish, Hayasa, the land of the Tjehenu, the Kaska lands;
  the Great Kings' realms keep the names the design document gives them (Egypt, Hatti, Karduniash, Mitanni, Assyria,
  Arzawa, Alashiya): a reading, listed in the report.
- **People by the same rule:** foreign courts and every letter call Pharaoh Naphurureya (`king("Egypt")`, Moran's form, in
  place of the old Napkhururiya); Egypt's own seat says Akhenaten (`kingFor(viewer, p)`: the seat view's `king`, the
  models' "You are ...", the web's court strip); his other names (`kingOtherNames`) are for his card alone. The cast's
  origins are by their own names too (Waset, Men-nefer, Gubla), and the place-name map (`OriginProvince`) knows them.
- **Only what stood in 1346 is drawn as standing:** above, under the map.

## The people of 1346 who did not rule (`PeopleOf1346`, `NamedScribes` in `rules/cast.ts`; `more`, `scribes` in `rules/factory.ts`)

- **Who:** every attested person the dossiers mark alive and active in 1346 who passes both tests, the historical and the
  game's; the report lists every name weighed. Thirty-five are added: Egypt's great officers and commissioners (Ay, Nakht,
  Panehesy, Huya, Thutmose, Paatenemheb, Pahanate, Pawura, Ha'ip, Rianap, Tahmashshi, Hatip), Zida of Hatti, the rival
  line of Mitanni (Artatama, Shuttarna), Babylonia's governors and envoy (Enlil-kidinni, Ili-ippashra, Shindishugab),
  Assyria's two envoys kept in the sun [G names], the governor of Alashiya [C name], and the Levant's claimants, brothers
  and men of action (Ilirabih, Pu-Baʿlu, Baʿluya, Akit-Teshup of Niya, Tagi, Yashdata, Endaruta, Shum-Adda, Shutatna,
  Yapah-Hadda, Arzawiya, Teuwatti, Biridashwa, Yapahu). Ilimilku is Ugarit's court scribe and Abdi-Heba's scribe
  Urusalim's, in place of the generated ones.
- **Where and holding what** (`CastSeed.post`, `purse`, `facts`, `stake`): a person in a post is employed by his court from the
  first season, as a starting servant is (a job like any other, his first errand named when he is first sent, the rest of
  his fee by his king's standing order), standing at his court; a claimant or a town's ruler is free at the court the
  sources put him at, with a public fact of his stake in a province (`stake:<province>`), which item 17++'s ledger seeds.
  His purse is set against his king's as far as the sources go (Ay 90 shekels of Egypt's 900; a town's ruler 15 to 25 of a
  city's 80) [G], and the draw of savings leaves it alone. What the sources say of him is a public fact (`source`) and his
  traits (`core`), never a script. None starts with armed men: the design session's reading that none led a band in 1346.
- **The real take the invented ones' places:** `more()` draws the known people before the name styles, so the pool stays at
  its baseline (100 besides the court scribes); the names the people of 1346 now bear are gone from the styles.
- **The count** (`GameSummary.people`, `Character.sent`): the batch runner prints, for every attested person, the seasons he
  was asked to decide, the times he was sent anywhere (every journey of his own) and the games he served a court in, with
  the wake-ups a season and the calls a model game would make, before and after, in the report.
