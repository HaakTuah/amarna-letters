# 7. Languages: who spoke what, and where

For "Where each language is spoken", "Who speaks what", "The court languages" and "Reading a tablet" (item 12), and
the starting characters' languages (items 10 and 11). Grades and abbreviations: [README](README.md). Map ids as in
`src/engine/src/model/map.ts`; item 7's new provinces by name.

**In one line:** Akkadian was the written language of diplomacy everywhere, spoken natively only in Babylonia and
Assyria; each land spoke its own tongue (Egyptian, Canaanite, Ugaritic, Hurrian, Luwian, Hittite, Elamite, a Nubian
tongue), and a court read what its scribes could write, which is a separate fact from what its people spoke.

## The languages

| Language | Family | Written in 1346 | Spoken by | Grade |
| --- | --- | --- | --- | --- |
| Egyptian (Late Egyptian) | Afro-Asiatic | Hieroglyphs, hieratic | Egypt; Egyptianised Nubians | A |
| Akkadian, Babylonian dialect | Semitic | Cuneiform; the diplomatic language | Babylonia; scribes everywhere | A |
| Akkadian, Assyrian dialect | Semitic | Cuneiform | Assyria | A |
| Canaanite | Semitic | Only as glosses in Akkadian letters, and in a mixed "Canaano-Akkadian" | The Levant from Gaza to Byblos and inland | A |
| Ugaritic | Semitic | Its own alphabetic cuneiform | Ugarit | A |
| Amorite and steppe West Semitic | Semitic | Not written | The middle Euphrates, the Suteans, inland Syria | B |
| Hurrian | Hurro-Urartian (isolate family) | Cuneiform (EA 24, Tushratta's long Hurrian letter) | Mitanni, Kizzuwatna, north Syria (Aleppo, Alalakh, Qatna's elite), Arrapha, Isuwa in part | A |
| Hittite (Nesite) | Indo-European (Anatolian) | Cuneiform; Arzawa's letters to Egypt (EA 31-32) | The court and elite of Hatti; Hattusa's heartland | A |
| Luwian | Indo-European (Anatolian) | Cuneiform and the first hieroglyphic seals | Most of Anatolia outside the Hittite core: Arzawa's lands, Kizzuwatna, the Lower Land, Lukka; much of Hatti's own people | B |
| Hattic | Isolate | In Hittite ritual texts only | Little spoken; a dying language of north-central Anatolia | B |
| Elamite | Isolate | Cuneiform | Susa and the Elamite highlands | A |
| Kassite | Unknown family | Names and a few words | The ruling house and its horse-masters; probably little spoken | B |
| Sumerian | Isolate | Scribal only | Nobody: a dead learned language | A |
| A Nubian tongue | Probably Northern East Sudanic, as Meroitic and later Nubian | Not written | Nubia and the peoples beyond | C |
| The language of Alashiya | Unknown | Cypro-Minoan script, undeciphered | Cyprus | A (that it existed), C (what it was) |
| Mycenaean Greek | Indo-European | Linear B | The Aegean, Knossos included | A |
| Kaskean | Unknown | Not written | The Kaska lands | A (that it is unknown) |

Mitanni's ruling house used Indo-Aryan names, gods (Mitra, Varuna, Indra, the Nasatyas in the Shattiwaza treaty) and
horse terms (Kikkuli's manual), but spoke Hurrian [A]; Indo-Aryan is not a living language of the game [B].

## By province

How widely each is spoken: **wide** (most people), **common** (a large minority: towns, a region), **some** (traders,
officials, settlers), **few** (scribes, a court). The shares are first guesses from the names in the texts and the
known kingdoms [G], except where a grade is given. "Court reads" is what the province's ruler can have read to him
("Reading a tablet").

| Province (map id) | Languages, and how widely | Court reads | Grade |
| --- | --- | --- | --- |
| Egypt (`delta`, `memphis`, `akhetaten`, `thebes`) | Egyptian wide; Canaanite and other Asian tongues some in the Delta and Memphis (foreign settlers, soldiers, craftsmen); Akkadian few | Egyptian, Akkadian (the Amarna scribes, with their school texts) | A for the court; G for shares |
| `sinai` | Egyptian some (forts, mines); West Semitic (Shasu nomads) common | - | C |
| Nubia (item 7) | A Nubian tongue wide; Egyptian common in the towns and among the elite | Egyptian | B |
| Babylonia (`sippar`, `durkurigalzu`, `babylon`, `nippur`, `ur`) | Babylonian Akkadian wide; Kassite few; Sumerian scribes only | Akkadian | A |
| Dilmun (item 7) | Local tongue wide [C: unknown]; Akkadian some (the governor's men, traders) | Akkadian | C |
| Assyria (`ashur`, `nineveh`, `arbela`, `ekallatum`) | Assyrian Akkadian wide; Hurrian common east of the Tigris and in the north | Akkadian | B |
| Arrapha (item 7) | Hurrian wide; Akkadian common (the Nuzi scribes write it) | Akkadian, Hurrian | A: Nuzi's tablets, mostly Hurrian personal names |
| Mitanni (`washukanni`, `taidu`, `harran`, `terqa`) | Hurrian wide; West Semitic and Akkadian some | Hurrian, Akkadian | A |
| Middle Euphrates (`mari`, Hana) | West Semitic and Akkadian wide; Hurrian some | Akkadian | B |
| `carchemish` | Hurrian and West Semitic common; Akkadian some; Luwian some | Akkadian, Hurrian | B |
| Aleppo, Alalakh/Mukish (item 7) | Hurrian common; West Semitic common; Akkadian some | Akkadian, Hurrian | A: Alalakh's tablets |
| Nuhashshe, Qatna (item 7) | West Semitic wide; Hurrian common in the elite | Akkadian (with Hurrian words: Qatna's archive) | A |
| `qadesh`, `damascus`, Kumidi | Canaanite and Amorite wide; Hurrian few | Akkadian | B |
| `ugarit` | Ugaritic wide; Hurrian common; Akkadian common (scribes, merchants); also Luwian, Cypriot and Egyptian traders | Ugaritic, Akkadian, Hurrian | A: Ugarit's eight languages and five scripts |
| `amurru`, Sumur, Arwad, `byblos`, Sidon, `tyre` | Canaanite wide; Akkadian few (scribes); Egyptian few (garrison and commissioners) | Akkadian | A |
| `megiddo`, `gaza`, Jerusalem, Shechem | Canaanite wide; Egyptian some at Gaza; Hurrian few (rulers with Hurrian or Indo-Aryan names) | Akkadian | A |
| Hatti (`hattusa`, `sapinuwa`) | Hittite common; Luwian common; Hattic few | Hittite, Akkadian, Luwian, Hurrian (all in Hattusa's archives) | A for the archives; B for the spoken mix |
| `kanesh`, `tuwanuwa` | Luwian wide; Hittite common | Hittite | B |
| `kizzuwatna` | Luwian wide; Hurrian common | Hittite, Hurrian | A |
| `isuwa` | Hurrian common; Luwian some; local highland tongues | - | C |
| Arzawa (`apasa`, `mira`, `seha`) | Luwian wide | Hittite (EA 32 asks Egypt to write in Hittite), Luwian | A for Hittite; B for Luwian |
| `lukka` | Luwian wide (Lycian descends from it) | - | B |
| Alashiya (`enkomi`, `tamassos`) | The island's own tongue wide; Ugaritic and Akkadian some in the ports | Akkadian | A: the letters |
| `susa` | Elamite wide; Akkadian some | Elamite, Akkadian | A |
| Kaska lands (item 7) | Kaskean wide | - | A |
| Sutean steppe (item 7) | West Semitic wide | - | B |

**Note on Arzawa.** The design makes Luwian Arzawa's court language. Its people spoke Luwian [B], but its letters to
Egypt are in Hittite, and the reply (EA 32) asks Egypt to go on writing in Hittite [A]. Reading taken: Arzawa's court
**speaks** Luwian and **reads** Hittite and Luwian, so Hittite speakers are valued at Apasa.

## Who spoke what (starting skills)

Item 12 sets the numbers; these are what the sources show about kinds of people [B unless marked]:

- **Kings** spoke their own court's language. Tushratta dictated in Hurrian (EA 24) and sealed letters written in
  Akkadian [A]. Nothing shows a Great King reading Akkadian himself; letters were read aloud to him [B].
- **Scribes** wrote Akkadian across the whole region, trained in the Babylonian curriculum (lexical lists and the epic
  tablets found at Amarna, Hattusa and Ugarit) [A]. A Levantine scribe also spoke Canaanite and wrote a mixed Akkadian
  ("Canaano-Akkadian") [A]. Scribes at Ugarit and Hattusa knew several languages [A].
- **Envoys** were often chosen for languages; Tushratta's interpreter is named in his letters [A, C on the name], and
  the word for interpreter, *targumannu*, is attested [A].
- **Merchants** of Ugarit and Alashiya traded with every coast; several languages are likely [B].
- **Soldiers and their captains** spoke their home tongue: Nubian troops in Canaan, Sherden at Byblos [A, that they
  served].
- **Detained envoys** lived for years at foreign courts (Mane, Keliya) [A]; that they learned the language is the
  design's reading, not attested [G].
