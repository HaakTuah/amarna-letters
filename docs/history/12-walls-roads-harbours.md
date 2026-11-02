# 12. Walls, sieges, roads and harbours

For item 15 ("Infrastructure and policing": walls, roads, relay stations, harbours and water works start as the sources
give them, "Starting positions come from the sources"), and the siege rules it brings into "One rule for everything
built" ("Walls price the storm, not the clock"). Grades and abbreviations: [README](README.md); works this dossier adds
are listed in [11-armies-and-fleets.md](11-armies-and-fleets.md#sources-this-dossier-adds) and at the end here. Map ids
are those of `src/engine/src/model/map.ts`. The routes, their terrain and journey times are in
[02-geography.md](02-geography.md) ("The great routes", "Speeds the sources attest"), the list of harbours in its "Coasts
and harbours", and where each city drank, which decides a siege as much as its walls, in [10-water.md](10-water.md).

**In one line:** the great walls of the age were mostly old, Middle Bronze ramparts still standing or reused, and many
Late Bronze towns of Canaan had none; Egypt's Nile cities were unwalled behind their desert and their forts; sieges were
won by hunger, thirst or a breach, and lasted days for a storm and months for a blockade; roads were tracks kept up by
the local lord, and their safety was his duty; harbours were beaches, river mouths and islands' lee, holding a few
ships to a few dozen.

## Walls by city

The game's walls run from 0 to 3 (`StartWalls`: every capital 3, "fortresses" 2, walled towns 1). The sources often
disagree with that first guess, so the last column proposes a start [G] where the evidence differs, for item 15 to take
or leave.

| Map id | City | What stood in the 14th century | Grade | Source | Now | Proposed |
| --- | --- | --- | --- | --- | --- | --- |
| <a id="12-walls-hattusa"></a>hattusa | Hattusa | A double wall with towers round the lower city, and round the great upper city (if it was already built: some date it to the 16th century, others to the 13th) the Lion, King's and Sphinx gates, a rampart over the postern tunnel of Yerkapı; the citadel of Büyükkale walled on its rock | B (the walls), C (the upper city's date) | Seeher, the Hattusa excavation reports; Bryce, *Life and Society* | 3 | 3 |
| <a id="12-walls-nesa"></a>nesa | Kanesh (Kültepe) | The Middle Bronze mound's walls; a lesser town by now | C | Kültepe reports | 2 | 1 |
| <a id="12-walls-sapinuwa"></a>sapinuwa | Sapinuwa (Ortaköy) | A royal city with great buildings; its walls not published | S | Süel, Ortaköy reports | 0 | 1 [G] |
| <a id="12-walls-tuwanuwa"></a>tuwanuwa | Tuwanuwa | Not excavated for this period | S | - | 0 | 0 |
| <a id="12-walls-apasa"></a>apasa | Apasa (Ephesus) | The Ayasuluk hill, a citadel above the river; its Bronze Age walls barely known | C | Ayasuluk reports | 3 | 2 |
| <a id="12-walls-washukanni"></a>washukanni | Washukanni | Not located for certain (Tell Fakhariya?); nothing of its walls | S | - | 3 | 3 [G], as a capital |
| <a id="12-walls-taidu"></a>taidu | Taidu | Not located for certain | S | - | 0 | 0 |
| <a id="12-walls-carchemish"></a>carchemish | Carchemish | A citadel on a bluff over the Euphrates; strong enough that Suppiluliuma besieged it seven days and took it in a storm on the eighth (*Deeds*, about 1327) | A (the siege), C (the walls) | *Deeds*, fragment 28. Kitchen 1962, the table of events: "captures Carchemish ... Deeds, 28" | 2 | 2 |
| <a id="12-walls-aleppo"></a>aleppo | Aleppo | The citadel hill with the Storm God's temple, walled | B | Kohlmeyer, the temple excavations | 2 | 2 |
| <a id="12-walls-alalakh"></a>alalakh | Alalakh (Tell Atchana) | City wall and gate; Niqmepa's palace is older (Level IV, the 15th century), and after its fall a castle complex was rebuilt on the site | B | Woolley; Yener, the Alalakh excavations | 1 | 1 |
| <a id="12-walls-qatna"></a>qatna | Qatna (Tell Mishrifeh) | Middle Bronze earth ramparts about 1 km square, up to 15-20 m high, enclosing about 100 ha, still standing | A | Qatna excavations (Pfälzner, Morandi Bonacossi) | 2 | 3 |
| <a id="12-walls-qadesh"></a>qadesh | Qadesh (Tell Nebi Mend) | A walled city between the Orontes and a tributary, with a moat cut between them | A (for 1274) | Ramesses II's Qadesh reliefs | 2 | 3 |
| <a id="12-walls-ugarit"></a>ugarit | Ugarit (Ras Shamra) | A fortified gate and glacis on the west by the palace, a postern; most of the town's circuit is not traced | A (the gate), C (the circuit) | Schaeffer; Yon, *The City of Ugarit* | 1 | 2 |
| <a id="12-walls-isuwa"></a>isuwa | Isuwa's towns | On the upper Euphrates; not excavated for this period | S | - | 1 | 1 |
| <a id="12-walls-nuhashshe"></a>nuhashshe | Nuhashshe's towns | Not located for certain | S | - | 1 | 1 |
| <a id="12-walls-amurru"></a>amurru | Amurru's hill towns | Abdi-Ashirta's towns, not located; they held against Byblos and Egypt's men | A (the holding), S (the walls) | EA 73-104 | 1 | 1 |
| <a id="12-walls-suhu"></a>suhu | Suhu's towns | On the middle Euphrates; not excavated for this period | S | - | 1 | 1 |
| <a id="12-walls-sumur"></a>sumur | Ṣumur (Tell Kazel) | Egypt's base; held for months against Abdi-Ashirta's sons, so walled | A (the sieges), C (the walls) | EA 81-106; Tell Kazel reports. EA 105 (Moran): "by land, the people of Arwada by sea, are agai[nst it] day and night" | 1 | 1 |
| <a id="12-walls-arwad"></a>arwad | Arwad | An island about 2.5-3 km off the shore; its walls are later, the sea was its wall | B | Later Phoenician walls; EA 98, 101, 104, 105 for its part. EA 98 (Moran): "ships of Arw[ad]a ... so grain cannot be brought into Ṣumur" | 2 | 2 |
| <a id="12-walls-byblos"></a>byblos | Byblos | Middle Bronze wall and glacis round the promontory, still in use; Rib-Hadda held it for years against Abdi-Ashirta and Aziru | A (the holding), B (the walls) | Dunand; EA 68-138 | 1 | 2 |
| <a id="12-walls-sidon"></a>sidon | Sidon | Little excavated for this period | S | - | 1 | 1 |
| <a id="12-walls-tyre"></a>tyre | Tyre | An island city with a mainland town, Ushu; the sea was its wall, but it lost Ushu and with it water and wood (EA 146, 148-151, 154-155) | A | EA 146, 148-151, 154-155. EA 149 (Moran): "Zimredda seized Usu ... so we have neither water nor wood" | 2 | 2 |
| <a id="12-walls-damascus"></a>damascus | Damascus | Under the modern city; nothing known | S | - | 1 | 1 |
| <a id="12-walls-megiddo"></a>megiddo | Megiddo | No city wall in the Late Bronze Age: a gate, a palace and houses at the edge served instead; disputed, since Finkelstein takes the town of Thutmose III's siege (Stratum IX, Late Bronze I) to have been well fortified | C | Ussishkin; Finkelstein, *Megiddo* reports and "Megiddo and Thutmose III: An Update", *Egypt and the Levant* 33 (2024); Gonen, "Urban Canaan in the Late Bronze Period" (1984) | 2 | 1 |
| <a id="12-walls-shechem"></a>shechem | Shechem (Tell Balata) | The Middle Bronze "cyclopean" wall and East and North-West gates, rebuilt in part; a fortress temple | B | Wright; Campbell | 1 | 2 |
| <a id="12-walls-jerusalem"></a>jerusalem | Jerusalem | The Middle Bronze wall on the eastern slope and the Spring Tower over the Gihon; the Late Bronze town small | C | Reich and Shukron | 1 | 1 |
| <a id="12-walls-gaza"></a>gaza | Gaza | Egypt's base on the Ways of Horus; not excavated for this period | S | - | 2 | 2 [G], as a base |
| <a id="12-walls-hazor"></a>- (not on the map; for comparison) | Hazor | The great Middle Bronze earth rampart round a lower city of about 70-80 ha, still used | A | Yadin; Ben-Tor | - | - |
| <a id="12-walls-memphis"></a>memphis | Memphis | The temple of Ptah's great enclosure and the "White Walls" of its name; the town itself open | B | Jeffreys, the Survey of Memphis | 2 | 1 |
| <a id="12-walls-akhetaten"></a>akhetaten | Akhetaten (Amarna) | No city wall at all: the boundary stelae, the desert and the Medjay's patrol roads round it | A | Kemp | 3 | 0 |
| <a id="12-walls-thebes"></a>thebes | Thebes | Temple enclosures, no city wall | B | - | 0 | 0 |
| <a id="12-walls-delta-sinai"></a>delta, sinai | The Delta and the Ways of Horus | Forts: Tjaru (Tell Hebua), a large walled fortress at the Delta's edge, and a chain of small forts and wells to Gaza | A (the relief, about 1290), B (the chain in 1346) | Seti I's Karnak relief; Abd el-Maksoud, Tell Hebua. The Karnak Hypostyle Hall Project on the relief: "a fortified military highway with a series of forts, each with a well" | 0 | 1 (`delta`, Tjaru) |
| <a id="12-walls-nubia"></a>nubia | Nubia | The Middle Kingdom forts of the Second Cataract (Buhen, Mirgissa), still garrisoned | A | Emery; Smith | 0 | 2 |
| <a id="12-walls-enkomi"></a>enkomi | Enkomi | A walled town by the 13th century; in the 14th a fort at its north end | C | Dikaios; Courtois | 3 | 2 |
| <a id="12-walls-kalavasos"></a>kalavasos | Kalavasos-Ayios Dhimitrios | An open town round a great ashlar building | B | South | 0 | 0 |
| <a id="12-walls-ashur"></a>ashur | Ashur | On a bluff over the Tigris on two sides, a wall and moat on the landward side, rebuilt by its kings | A | Andrae; the kings' building inscriptions | 3 | 3 |
| <a id="12-walls-nineveh"></a>nineveh | Nineveh | The Kuyunjik mound; its walls of this age unknown | S | - | 2 | 1 |
| <a id="12-walls-arbela"></a>arbela | Arbela | A citadel mound; nothing of its walls | S | - | 0 | 1 [G] |
| <a id="12-walls-ekallate"></a>ekallate | Ekallate | Not located | S | - | 0 | 0 |
| <a id="12-walls-arrapha"></a>arrapha | Arrapha; Nuzi, its town | Nuzi had a town wall round a main mound of about 200 m by 200 m (about 4 ha) | A (Nuzi) | Starr, the Nuzi excavations | 1 | 1 |
| <a id="12-walls-babylon"></a>babylon | Babylon | Kassite Babylon lies under the water table; its walls are not known | S | - | 3 | 3 [G], as a capital |
| <a id="12-walls-durkurigalzu"></a>durkurigalzu | Dur-Kurigalzu | A new royal city with a walled palace and ziggurat, founded by Kurigalzu I | B | Baqir | 0 | 1 |
| <a id="12-walls-sippar-nippur-ur"></a>sippar, nippur, ur | Sippar, Nippur, Ur | Old city walls, kept up by Kassite kings (Kurigalzu I's building at Ur) | B | Woolley; the kings' bricks | 0 | 1 |
| <a id="12-walls-susa"></a>susa | Susa | The acropolis mound; its walls of this age unknown | C | - | 2 | 2 |
| <a id="12-walls-kaska-lukka-steppe"></a>kaska, lukka, steppe | Kaska, Lukka, the Sutean steppe | No cities: villages, hill forts and camps | B | - | 0 | 0 |

**Readings for the game [G]:** the "Proposed" column follows the evidence, and puts where the sources are silent the
level the game already has. Three changes matter more than the rest: **Akhetaten** had no wall and its strength was
Egypt's distance and forts (0, with Egypt's forts at `delta` and `nubia` raised); **Megiddo** had no city wall (1, for
its gate and palace); **Qatna** and **Qadesh** were among the strongest places of Syria (3). The game's rule "every
capital 3" is the one the sources most often contradict; walls should come from the city, not from its being a capital
("Different data, same rules"). An unwalled capital still weighs against "A kingdom falls with its capital": item 15
should weigh Akhetaten at 0 against that, and the question is in the "For the owner" table of `docs/BUILD-PROGRESS.md`.

## Sieges on record

| Siege | When | How long | How it ended | Grade | Source |
| --- | --- | --- | --- | --- | --- |
| <a id="12-siege-sharuhen"></a>Sharuhen, by Ahmose | about 1530 | three years (Breasted read six) | Taken | A | The tomb of Ahmose son of Ebana. Lichtheim, *AEL* II, p. 13: "Sharuhen was besieged for three years" |
| <a id="12-siege-megiddo"></a>Megiddo, by Thutmose III | about 1457 | seven months | Surrendered after a blockade; a ditch and a palisade of timber round it | A | *Annals*; the Gebel Barkal stele. Barkal (Nederhof): "besieged them for seven months, until they came out"; *Annals* (Lichtheim): "surrounded (it) with a ditch, and walled (it) up with fresh timber" |
| <a id="12-siege-urshu"></a>Urshu, by Hattusili I | 17th century | months [C] | The king is angry when a battering ram breaks, and orders a great ram hewn in the mountains, and the siege still drags | A | "The siege of Urshu" (CTH 7) |
| <a id="12-siege-washukanni"></a>Washukanni, by Suppiluliuma | about 1344-1340 | not long: Tushratta did not stand; the city was sacked | Sacked | A (Tushratta not standing), B (the sack) | The Shattiwaza treaty (Luckenbill 1921, p. 164: "he marched out against me, but he did not get into the fight"); Bryce, *Letters*, p. 28: "occupied and plundered the Mitannian capital Washshuganni" |
| <a id="12-siege-carchemish"></a>Carchemish, by Suppiluliuma | about 1327 | seven days, and a storm on the eighth | Taken by storm | A | *Deeds*, fragment 28; Kitchen 1962, the table of events: "captures Carchemish ... Deeds, 28" |
| <a id="12-siege-sumur-byblos"></a>Sumur and Byblos, by Abdi-Ashirta and Aziru | the letters' years | months, repeatedly; Sumur fell and was retaken | Blockade by land and by Arwad's ships; hunger | A | EA 76-106. EA 98 (Moran): "so grain cannot be brought into Ṣumur"; EA 91: "[When] he took Ṣumur" |
| <a id="12-siege-tyre"></a>Tyre, by Zimredda of Sidon, Arwad and Aziru's cities | the letters' years | long enough for Abi-Milku to write many letters | Not taken; its mainland town lost, and with it water and wood | A | EA 146, 148-151, 154-155. EA 149 (Moran): "the men of Arwada ... have assembled their ships, chariots, and infantry to capture Tyre"; EA 151: "troops and ships from the cities of Aziru" |
| <a id="12-siege-puranda"></a>Puranda, by Mursili II | about 1320 | some days (the number is lost) | Mursili cut off its water; its prince fled by night with his people, who were caught (he escaped); then the town was taken | A | Mursili II's Ten-Year *Annals* (AHT 1A, §§21'-24'): "I bottled [it up] and cut off its water" |

**What the record says [B]:** a strong city fell to a storm in days only when the attacker was much stronger (Carchemish,
with Hatti's whole army); otherwise sieges were blockades of months, won by hunger or thirst, or not at all (Tyre, Byblos).
Siege tools were ladders, rams, mining and earth ramps [A: Middle Kingdom tomb scenes at Beni Hasan; the Urshu text;
New Kingdom reliefs], and a breach cost the attacker dear. Defenders repaired walls in a siege as they could [B]. So
item 5's walls price the storm, not the clock ("Walls price the storm, not the clock"): this record supports that.
**Start from:** the stores a walled city starts with are enough for **two to four seasons** of blockade, so that its
length comes from its stores and water, never a clock; a storm of a city
with walls 3 costs the attacker about as many men as the defenders [G].

## Roads and their upkeep

- <a id="12-roads"></a>**What a road was.** An earthen track, cleared and kept passable, with fords and a few bridges;
  paved streets only inside cities [B]. The great routes are in the geography dossier.
- <a id="12-road-upkeep"></a>**Upkeep fell on the lord of the land.** Arnuwanda I's instructions for the border
  governors (*bel madgalti*) bid them build and plaster the forts' walls, bar the gates and set the watch, and post
  scouts on the main roads and patrol them (Miller, *Royal Hittite Instructions*, no. 17, §14: "they must patrol the
  [(roads)] well") [A]. In Egypt the Ways of Horus were a chain of forts with wells and reservoirs, each a day or so
  apart (Seti I's relief at Karnak, about 1290, with Papyrus Anastasi I, names about twenty) [A for about 1290; B for
  1346]. **Reading [G]:** a road's level is its clearing, bridges, wells and posts; its upkeep is labour or gold from
  whoever holds the land, as item 15 says ("A road belongs to the land it crosses").
- <a id="12-road-safety"></a>**Safety on the road was the land's king's duty.** Burna-Buriash demands that Pharaoh
  punish the men who killed his merchants at Hinnatuni in Canaan, "your land", and pay for the loss (EA 8, Moran:
  "[C]anaan is your country ... In your country I have been despoiled") [A]. Abdi-Heba complains that the gifts and
  porters he sent for the king's caravans were taken in the countryside of Ayyaluna (EA 287, Moran: "they have been
  taken in the countryside") [A]. Kings gave their messengers letters of passage: EA 30, from a king, "to the kings of
  Canaan", asks them to let his messenger Akiya pass to Egypt without delay (Moran: "No one is to hold him up") [A]; the
  sender is unnamed, usually taken for Mitanni's king [B].
- <a id="12-patrols"></a>**Patrols.** At Akhetaten the Medjay under Mahu rode patrol roads round the city's desert edge,
  which are still visible (Kemp) [A]; the Hittite border governors kept watchmen and patrols [A: Miller]. This is item
  15's policing.
- <a id="12-relay-stations"></a>**Relay stations: [S].** No source of the period shows Persian-style relays of fresh
  riders. A royal messenger rode the whole way with his escort, resting and fed at the towns of the road, which their
  lords had to provide (EA 30 for safe passage only; Liverani; Holmes) [B]. Rest stations with stores existed on the
  Ways of Horus and later as the Middle Assyrian *dunnu* farm-forts [A, B]. **Reading [G]:** a relay station is a post
  with fresh animals and stores; the sources' closest thing is the fort with a well, so item 15's stations start only
  along the Ways of Horus (`delta`-`gaza` until item 11f+, now `delta`-`sinai`-`gaza`), and elsewhere are built.

## Harbours and what they could hold

The harbours of the period are listed in the geography dossier ("Coasts and harbours"); this adds what they held.

- <a id="12-harbour-beaches"></a>**Mostly beaches and river mouths.** Ships were drawn up on beaches or anchored in the
  lee of an island or headland; built moles and quays come later, from the first millennium [B: Wachsmann; Marriner on
  Tyre and Sidon]. Stone anchors, found by the hundred at Ugarit, Byblos and Kition, show the ships that used each place
  [A].
- <a id="12-harbour-mahadu"></a>**Mahadu (Minet el-Beida), Ugarit's port** (see the geography dossier), had warehouses
  by the water [A: Schaeffer]; its king could gather dozens of ships, perhaps 150 (see the armies dossier) [C].
- <a id="12-harbour-islands"></a>**Islands** (Arwad, Tyre) were harbours as well as cities: their ships were their
  supply and their defence, and a besieger without ships could not close them [A: EA 98, 101, 104, 105; EA 146, 148-151,
  154-155; EA 151, Moran: "we are situa[te]d on the sea"].
- <a id="12-harbour-egypt"></a>**Egypt's ports** were on the Nile: the dockyard of Peru-nefer (probably at Avaris in the
  Delta, [C]: see the geography dossier), whose accounts survive [A: Papyrus BM 10056], and the river harbours of
  Memphis and Thebes. Thutmose III used the Phoenician harbours to land his armies and stocked them in advance [A:
  *Annals* (Breasted): "every harbor at which his majesty arrived was supplied"].
- <a id="12-harbour-ura"></a>**Hatti's port** was Ura in Cilicia (`kizzuwatna`), receiving grain by ship from Ugarit and
  Mukish (RS 20.212) [A, 13th century].
- <a id="12-harbour-levels"></a>**What a harbour held [G]:** a great port (Mahadu, Peru-nefer, Byblos, Tyre's two
  anchorages) a large fleet, of the order of a hundred ships; a lesser one (Sidon, Arwad, Akko, Gaza and Ashkelon,
  Enkomi, Tarsa, Apasa) a few dozen; a beach or a raiders' coast (Lukka) a few. **Start from:** that a harbour's level
  limits the ships that can winter or refit there, not the ships that can land, since any beach takes a landing in fair
  weather.

## Sources this dossier adds

- **Gonen**: R. Gonen, "Urban Canaan in the Late Bronze Period", *BASOR* 253 (1984): many Canaanite towns unwalled.
- **Kemp**, and the excavation reports named in the table (Hattusa, Qatna, Ugarit, Megiddo, Shechem, Hazor, Tell Hebua,
  Nuzi, Ashur), in the editions the handbooks cite.
- **Luckenbill 1921**: D. D. Luckenbill, "Hittite Treaties and Letters", *AJSL* 37 (1921): the Shattiwaza treaty.
- **AHT**: G. Beckman, T. Bryce and E. Cline, *The Ahhiyawa Texts* (SBL, 2011): Mursili II's Annals.
- **Kitchen 1962**: K. A. Kitchen, *Suppiluliuma and the Amarna Pharaohs* (Liverpool, 1962).
- **Lichtheim**: M. Lichtheim, *Ancient Egyptian Literature* II (1976); **Breasted**: J. H. Breasted, *Ancient Records of
  Egypt* II (1906); **Nederhof**: M.-J. Nederhof's translation of Thutmose III's Gebel Barkal stele (St Andrews).
- **Liverani**; **Holmes**: Y. L. Holmes, "The Messengers of the Amarna Letters", *JAOS* 95 (1975).
- **Marriner**: N. Marriner and C. Morhange on the ancient harbours of Tyre and Sidon (2005-2007).
- **Miller**, **Wachsmann**: in the armies dossier.
