# 10. Water: where each city drinks

For "Water too" (under War, travel and the seas): where a city drinks is set by where it stands, so a siege lasts as long
as its water as well as its food. Added by build order item 11a+ (the owner's answer to item 10+b's review: "water from a
dossier per city", Megiddo's included). Grades and abbreviations: [README](README.md). One line per province: its chief
city, and where that city drew water in the 14th century BCE, as far as the sources and the excavations tell.

**In one line:** the river cities and those with a spring or groundwater inside their defences could not be made to
thirst; those whose spring lay outside the walls, or who drank what the rains put in their cisterns, could; islands drank
what boats brought them.

## The kinds, and what the game makes of them

| Kind | What it means | Under siege |
| --- | --- | --- |
| River | A river or a canal at the walls | Never runs dry |
| Spring | A spring inside the defences, or a walled way down to one | Never runs dry |
| Wells | Wells inside the town reaching groundwater (coastal plains, oases) | Never runs dry |
| Outside | A spring outside the walls, which a besieger cuts off; then the cisterns | As cisterns |
| Cisterns | Rain gathered in cisterns, and wells that fail in the dry months | `CisternSeasons` (4) |
| Arid | Wells in arid ground, a little water for many mouths | `WellSeasons` (2) |
| Island | An island with no water of its own: boats bring it from the mainland | `IslandSeasons` (1) once its besieger's fleet holds its waters |

Water works (a well sunk, a cistern dug, a guarded way down to a spring) are item 15's ("One rule for everything built").

## The cities

| Map id | City | Kind | Grade and source |
| --- | --- | --- | --- |
| <a id="10-seha"></a>seha | the Seha River Land's towns | River | [C] the valley of the Hermos (Gediz) or Kaikos (Bakırçay); the towns are not located with certainty. Wikipedia, Seha River Land: "generally identified with the Bakırçay River or the Gediz River" |
| <a id="10-apasa"></a>apasa | Apasa (Ephesus, Ayasuluk hill) | River | [C] the Cayster's valley below the hill, though the river's course moved. Wikipedia, Ephesus: "During the Late Bronze Age, the hill was fortified" (Ayasuluk); "the movement of the Kayster River" |
| <a id="10-mira"></a>mira | Mira's towns (Beycesultan?) | Cisterns | [G] the capital is not located for certain |
| <a id="10-tuwanuwa"></a>tuwanuwa | Tuwanuwa (Tyana) | Outside | [C] its springs lay outside the town: in Roman times an aqueduct brought water from a spring some 4 km away, and a sacred spring rose about two miles south. Hamilton, *Researches in Asia Minor* II (1842): "About two miles south of Tyana is the spring" |
| <a id="10-hattusa"></a>hattusa | Hattusa | Spring | [B] great ponds inside the city, dug into the slope and filled by groundwater rising in winter (the East and South Ponds). Wittenberg and Aksoy, "From cut-in to qanats" (abstract): "used 3600 years ago by the Hittites to fill the ponds of their capital Hattuşa" |
| <a id="10-sapinuwa"></a>sapinuwa | Sapinuwa (Ortaköy) | Cisterns | [S] nothing published on its water; [G] |
| <a id="10-nesa"></a>nesa | Nesa (Kültepe) | Cisterns | [G] the mound stands in the plain; its water is not described |
| <a id="10-kizzuwatna"></a>kizzuwatna | Kummanni and the Cilician plain | River | [C] the Ceyhan and Seyhan cross the plain; Kummanni itself lay in the highlands and its water is not described. Wikipedia, Kizzuwatna: "The centre of the kingdom was the city of Kummanni, located in the highlands" |
| <a id="10-harran"></a>harran | Harran | Wells | [C] wells; in later times the in-town wells ran brackish and the sweet one (Jacob's Well) lay outside the walls; a canal from the Balikh was dug under Harun al-Rashid. Wikipedia, Harran: "six wells were still operational within the ancient walls" |
| <a id="10-washukanni"></a>washukanni | Washukanni (Tell Fakhariya?) | Spring | [C] by the springs of Ras al-Ain at the Khabur's head, if the identification holds (it is unproven). Wikipedia, Washukanni: "precise location... is unknown"; Tell Fekheriye lies on the southern edge of Ras al-Ain |
| <a id="10-taidu"></a>taidu | Taidu | Cisterns | [S] not located for certain; [G] |
| <a id="10-terqa"></a>terqa | Terqa (Tell Ashara) | River | [B] on the Euphrates. Wikipedia, Terqa: "on the banks of the middle Euphrates" |
| <a id="10-nineveh"></a>nineveh | Nineveh | River | [B] on the Tigris, where the Khosr joins it. Wikipedia, Nineveh: "at the junction of the Tigris and the Khosr Rivers" |
| <a id="10-arbela"></a>arbela | Arbela (Erbil) | Wells | [G] a citadel mound in a plain; wells assumed, its ancient water not described |
| <a id="10-ashur"></a>ashur | Ashur | River | [B] on a spur over the Tigris. Wikipedia, Assur: "on a south facing mountain spur", "on the western bank of the Tigris River" |
| <a id="10-ekallate"></a>ekallate | Ekallate | River | [C] on the Tigris, not located for certain. Wikipedia, Ekallatum: "known to have been on the Tigris river" |
| <a id="10-sippar"></a>sippar | Sippar | River | [B] on the Euphrates. Wikipedia, Sippar: "on the east bank of the Euphrates river" |
| <a id="10-durkurigalzu"></a>durkurigalzu | Dur-Kurigalzu | River | [B] fed by a canal (founded under Kurigalzu I). Wikipedia, Dur-Kurigalzu: "founded by the Kassite King Kurigalzu I in the early 14th century BC"; its water came by "the Isa Canal" |
| <a id="10-babylon"></a>babylon | Babylon | River | [B] on the Euphrates. Wikipedia, Babylon: "located on the lower Euphrates river" |
| <a id="10-nippur"></a>nippur | Nippur | River | [B] on the Shatt en-Nil, an old course of the Euphrates. Wikipedia, Nippur: "one of the earliest courses of the Euphrates" |
| <a id="10-ur"></a>ur | Ur | River | [B] on the Euphrates and its canals. Wikipedia, Ur: "near the mouth of the Euphrates" |
| <a id="10-dilmun"></a>dilmun | Dilmun (Qal'at al-Bahrain) | Spring | [B] Bahrain's freshwater springs. Wikipedia, Dilmun: "close to the sea and to artesian springs" |
| <a id="10-delta"></a>delta | the Delta's towns | River | [B] the Nile's branches |
| <a id="10-sinai"></a>sinai | the Sinai's forts | Arid | [B] wells along the Ways of Horus, a little water for a garrison; Seti I's Karnak reliefs (some fifty years later) name its forts and wells. Wikipedia, Way of Horus: "Wells were dug along the route at distances approximately one day's walk" |
| <a id="10-memphis"></a>memphis | Memphis | River | [B] on the Nile. Wikipedia, Memphis: "on the west bank of the Nile" |
| <a id="10-akhetaten"></a>akhetaten | Akhetaten (Amarna) | River | [B] on the Nile; wells in the town [A, excavated]. Wikipedia, Amarna: "on the east bank of the Nile River"; gardenvisit.com, El Amarna: "Many of the courts had circular wells" |
| <a id="10-thebes"></a>thebes | Thebes | River | [B] on the Nile. Wikipedia, Thebes: "located along the Nile" |
| <a id="10-nubia"></a>nubia | Nubia's towns | River | [B] on the Nile |
| <a id="10-kalavasos"></a>kalavasos | Kalavasos-Ayios Dhimitrios | Wells | [G] wells in the town assumed; it stood by the Vasilikos river. Wikipedia, Kalavasos: "on the river Vasilikos" |
| <a id="10-enkomi"></a>enkomi | Enkomi | Wells | [B] wells inside the town [A, excavated]. Wikipedia, Enkomi (site): "the discovery of multiple wells, hearths, and benches" (the Ashlar Building) |
| <a id="10-isuwa"></a>isuwa | Isuwa's towns | River | [C] on the upper Euphrates. Wikipedia, Isuwa: "eastern bank of the river Euphrates" |
| <a id="10-carchemish"></a>carchemish | Carchemish | River | [B] on the Euphrates. Wikipedia, Carchemish: "located on the West bank of the Euphrates River" |
| <a id="10-alalakh"></a>alalakh | Alalakh (Tell Atchana) | River | [C] in the Orontes' flood plain in the Amuq. Wikipedia, Alalakh: "within the flood plain of the Orontes River, where the river enters the Amuq Plain" |
| <a id="10-aleppo"></a>aleppo | Aleppo | Wells | [C] the citadel's deep wells, of unknown date; the Queiq river below. Wikipedia, Citadel of Aleppo: "Several wells penetrate down to 125 m" |
| <a id="10-ugarit"></a>ugarit | Ugarit (Ras Shamra) | Wells | [B] wells across the city, one feeding a pool in the palace [A, excavated]. Collège de France (2024): "numerous wells have been found within the city" |
| <a id="10-nuhashshe"></a>nuhashshe | Nuhashshe's towns | Cisterns | [S] not located for certain; [G] |
| <a id="10-qatna"></a>qatna | Qatna (Tell Mishrifeh) | Spring | [C] a spring-fed lake inside its great ramparts, which dried toward the end of the Bronze Age. Morandi Bonacossi (via Wikipedia, Qatna): "an inner lake fed by a spring located in the northern foot of the upper city" |
| <a id="10-qadesh"></a>qadesh | Qadesh (Tell Nebi Mend) | River | [B] at the meeting of the Orontes and the Mukadiya, made an island by a cut channel (Ramesses II's reliefs show it ringed by water, a century later). Wikipedia, Kadesh: "had cut a channel from the river to a stream south of the town" |
| <a id="10-amurru"></a>amurru | Amurru's hill towns | Cisterns | [G] Abdi-Ashirta's land in the hills; its towns are not located |
| <a id="10-sumur"></a>sumur | Ṣumur (Tell Kazel) | Wells | [C] in the coastal plain by the Abrash. Wikipedia, Tell Kazel: "in the north of the Akkar plain on the north of the al-Abrash River" |
| <a id="10-arwad"></a>arwad | Arwad | Island | [B] an island with cisterns; water came from the mainland, and in war from a spring in the sea channel. Strabo 16.2.13 (1st century BCE): "partly from the rains and cisterns and partly from their territory on the mainland" |
| <a id="10-byblos"></a>byblos | Byblos | Spring | [B] the town's spring (Ain el-Malik) in the valley between its two summits. Livius, Byblos well: "two summits that are separated by a valley with a well" |
| <a id="10-sidon"></a>sidon | Sidon | Wells | [C] the coastal plain, the Awali near. Wikipedia, Sidon: "near the Awali River" |
| <a id="10-damascus"></a>damascus | Damascus | River | [B] the Barada and its oasis. Wikipedia, Damascus: "watered by the Barada river" |
| <a id="10-tyre"></a>tyre | Tyre | Island | [A] EA 146-151, 154-155: Abi-Milku has neither water nor wood once Ushu on the mainland is lost. EA 149 (Moran): "Zimredda seized Usu ... so we have neither water nor wood" |
| <a id="10-megiddo"></a>megiddo | Megiddo | Outside | [B] the spring lay at the foot of the mound, outside the town wall, its way down "entirely unprotected" in the earlier history; the gallery and shaft that reach it are later works (Lamon: the 12th century). Lamon, *The Megiddo Water System* (OIP 32, 1935), p. 1: "located at the foot of the mound definitely outside the city wall" |
| <a id="10-shechem"></a>shechem | Shechem (Tell Balata) | Outside | [C] springs in the valley at the foot of the mound. Wikipedia, Shechem: "numerous natural springs and a high, stable water table" |
| <a id="10-jerusalem"></a>jerusalem | Jerusalem | Spring | [C] the Gihon, guarded by the Spring Tower: dated to the Middle Bronze Age by its excavators (Reich and Shukron), to about 800-900 BCE by radiocarbon (Regev et al., *Radiocarbon* 59, 2017), which Reich disputes (2018). ScienceDaily (2017): "The date revealed by this radiocarbon dating was sometime around 800-900 BCE" |
| <a id="10-gaza"></a>gaza | Gaza | Wells | [C] wells in the coastal sands with a high water table. Wikipedia, Gaza City: "depends on groundwater as the only source for drinking" (today) |
| <a id="10-suhu"></a>suhu | Suhu's towns | River | [B] on the Euphrates. Wikipedia, Suhum: "around the middle course of the Euphrates River" |
| <a id="10-arrapha"></a>arrapha | Arrapha (Kirkuk) | Cisterns | [G] its water is not described |
| <a id="10-susa"></a>susa | Susa | River | [B] between the Karkheh and the Dez. Wikipedia, Susa: "between the Karkheh and Dez Rivers" |
| <a id="10-lukka"></a>lukka | the Lukka lands | Cisterns | [G] a rugged coast of small places |
| <a id="10-kaska"></a>kaska | the Kaska lands | Cisterns | [G] mountain villages, no cities to besiege |
| <a id="10-steppe"></a>steppe | the Sutean steppe | Arid | [G] wells and seasonal pools |

## What changed from item 10+b's reading

Item 10+b gave every rain-fed city cisterns and every arid one wells, with Jerusalem and Megiddo safe and Tyre and Arwad
islands. By the dossier, Megiddo's spring lay outside its walls in this age, so it can be made to thirst; Nineveh,
Carchemish, Alalakh, Qadesh, Damascus, Susa, the Cilician plain, Isuwa, the Seha valley and Apasa drink from rivers;
Hattusa, Washukanni, Qatna, Byblos and Dilmun from springs inside their defences; and the cities of the coastal plains,
Cyprus, Harran, Arbela and Aleppo from wells that reach groundwater. The rest drink their cisterns as before.
