# Item 6+: the historical sources (27 October 2026)

Build order item 6+ (`docs/intent/build-order/item-6plus.md`), "Grounded in the sources" under World and history. A
research pass, no code: nine dossiers and an index in [`docs/history/`](../history/README.md), each committed when done,
every claim graded A (attested), B (accepted), C (disputed or estimated) or G (first guess), with its source.

## The check for changes

The live design document was asked for changes since the copy (Build order since revision 33, World and history since
22): none. The other sections the item names ("Nubians in Egypt's service", "Who they are", "Who speaks what", "Where
each language is spoken", "Mines are where they were") were read from the copy of 27 October.

## What was built

| Dossier | Holds |
| --- | --- |
| `README.md` | The index, the grades, one chronology (Egyptian low chronology: 1346 is about Akhenaten's year 8), the sources |
| `01-politics.md` | The seven Great Kings in 1346 with the doubts; each realm; the Levant and north Syria city by city (current and item 7's provinces); lands with no king; opening relations between the Great Kings |
| `02-geography.md` | Attested speeds (Thutmose III's march, Old Assyrian caravans, sea crossings); road distances and days for 26 connections; the great routes; terrain by connection; rivers; harbours; names for the provinces "Map review" renames |
| `03-environment-and-seasons.md` | The game's three seasons as months; water, sowing, harvest and winter by region; floods; the sailing season; droughts, famines, plagues and raids on record |
| `04-people-and-settlement.md` | Population ranges by region with a middle for the game; town sizes; shares of farmers, townspeople, soldiers and herders; soldiers as the letters count them |
| `05-economy.md` | Each of the six resources by province with shares; the tin debate weighed; grain surpluses and their reliability; what each edge trades; exchange rates for later phases |
| `06-attested-people.md` | About a hundred attested people by court with roles and whether they were alive in 1346; Nubians in Egypt's service (Hekanefer fits 1346); name styles for every region |
| `07-languages.md` | The languages with family, script and speakers; each province's languages and how widely, and what its court reads; who spoke what |
| `08-beyond-the-edges.md` | The doors and the peoples beyond them; who comes through each and why, with first-guess shares; each people; what each door's men know of a map language |
| `09-the-letters.md` | Relationships (sympathies, grievances, claims, between Great Kings and among vassals); lines by what they do; the norms with the letters' own proof that they were tools |

Item 6+ changes no rule, so the rulebook, the seat view and the design notes are unchanged; `docs/DESIGN-NOTES.md`
and `CLAUDE.md` point to the dossiers.

## Benchmarks, script games and the feature audit

No code changed, so script kings and characters have nothing new to use; the tenet "Every feature is every seat's"
applies to the items that build from the dossiers. Run once at the start as the audit and the regression check:

- **50 script games**, seeds 1-50, `--verify-replay`: 50 of 50 replay exactly; capitals fall in 44 of 50 games.
- **`--versus solo`**, 40 seeds: unchanged (all kings 8.26 alone and 1.25 as baseline; 94% and 14% of wins).
- **The feature audit** gives item 6c's counts exactly (sealed tablets 50/1744, authentication 47/503, evidence shown
  44/351, bribes 23/44, defections 28/52, detentions 38/219, skims 40/198, debasement found 14/63, spies caught 20/38,
  double agents 5/6, archives copied 40/588 and taken 44/106, inventories swapped 20/38, forgeries 4/4, sieges begun
  50/869 and won 50/799, storms 33/64, walls strengthened 50/1846, sallies 46/310, terrain held 36/190 and beaten
  12/18, desert supplies 7/10, coalitions 4/4). No gap; nothing patched.

## First guesses (marked G in the dossiers; item 18 tunes them)

- Travel paces: 25 km a day on good ground, 15 in mountains and passes, 20 in the desert; river boats 60 downstream;
  coasting ships 70, open sea 100 in the sailing season; armies a third slower.
- A low Nile one Akhet in eight, a ruinous one in thirty; a damaging Tigris or Euphrates flood one Shemu in six;
  drought on the Anatolian plateau one year in six, in the Levant and north Syria one in eight; plague one season in
  a hundred per province, more in a siege.
- Population middles where the sources give no figure (Assyria, Arzawa, Elam, the middle Euphrates), and the shares
  of farmers (85%), townspeople (12%), soldiers (2%) and herders (15% where they live).
- Resource shares by province (gold, copper, timber, horses), the even east-west split of tin, and the edge markets'
  amounts.
- The doors' shares of arrivals (western sea 35%, Nile 25%, eastern road 25%, Gulf 10%, Red Sea 5%) and one arrival in
  a hundred from the tin lands.
- Name styles invented where none survive: Alashiya's king, the Sherden, Nubians beyond Egypt, highlanders.

## The review

One reviewer (Opus, high effort), given the item's text and the diff. It found no gap against the brief and most EA
citations and quotations right, and three blocking errors, all fixed: the economy's shares carried the evidence's
grade (now every share is [G] and the grade column grades the evidence; Ergani's Late Bronze working is [C]);
Ahutabu went on to Egypt and the merchants left behind were killed (EA 8), not he; and in EA 9 it was Burna-Buriash's
father Kurigalzu who refused the Canaanites. Its smaller points were fixed too: Tushratta's reign from about 1365;
Labaya's death in EA 245; "Namhurya", EA 41's "Huriya", Kurigalzu's Susa, Heba of Ugarit, Knossos in 1346 and
Meluhha graded as doubts; Yanhamu's grain at Yarimuta; Sharrupshi in the Tette treaty; Amanappa's letters; Kalbaya
[A]; Nubian name examples limited to the attested; EA 31-32 as the Arzawa correspondence; Pharaoh's interpreter Hane
(EA 21); the Gezer calendar's farming cycle graded [B]; a new grade [S] for "the sources are silent"; Egypt's people
about as many as all the other powers'; EA 16's precedent "to Egypt"; Yapah-Hadda's city a doubt; and the note for
item 17 reworded so the norms are a shared language, whether to honour one each ruler's choice.

## Readings taken and design questions

1. **The chronology** is the Egyptian low chronology (HKW 2006): 1346 is about Akhenaten's year 8.
2. **Suppiluliuma** is Hatti's king at the start, though on the shorter dating his predecessor still reigned.
3. **Labaya was probably dead by 1346.** Reading: Shechem starts under his son Mut-Baal, with the quarrel with
   Abdi-Heba inherited; or Labaya himself, as a marked stretch of about five years, if Haakon prefers the story.
4. **Arzawa's king in 1346 is unknown.** Tarhundaradu (EA 31-32) is kept, as the code already has him, marked as a
   doubt.
5. **Ugarit starts in Egypt's sphere**, its Hittite treaty to come.
6. **Alashiya's capital** stays Enkomi; the clay of its letters points to the Alassa-Kalavasos area, so the western
   province takes the name Kalavasos if it reaches the south coast.
7. **Renamed provinces** proposed for item 7: the middle Euphrates `mari` becomes Hana; the Mitanni province `terqa`
   then needs another name (Kahat); `kanesh` becomes Shamuha or Nesa; `ekallatum` becomes Kilizi if it lies between the
   Zabs; `tamassos` becomes Kalavasos.
8. **Tin stays off the map, split evenly east and west.** Powell et al. (2022) put two thirds of the Uluburun tin at
   Kestel in the Taurus, on the map in Hatti's lands; that working is disputed and unproven for the period. An on-map
   tin source would give Hatti both metals, against "no court has both". Design question: keep tin off the map?
   (The design document's line that Powell traced the Uluburun tin to Central Asia is only a third of his result.)
9. **Arzawa's court speaks Luwian and reads Hittite and Luwian**, since its letters to Egypt are in Hittite (EA 32).
10. **Two doors the sources suggest but the design lacks:** the Libyan desert west of Egypt and the north-eastern
    highlands (Azzi-Hayasa) beyond Isuwa. Left out until item 11 asks whether Egypt's and Hatti's doors are starved.
11. **Kanesh's renaming:** Shamuha suits the province only if it reaches up the Halys; the item 7 builder checks.
12. **Quotations** are short and close to Moran's translation, marked (q), or paraphrased, marked (p); longer verbatim
    quotation, which the design allows, should be checked against Moran or Rainey when a request uses it.

## Sources used on the web

[Heqanefer, Peabody](https://echoesofegypt.peabody.yale.edu/node/328); [Heqanefer,
Wikipedia](https://en.wikipedia.org/wiki/Heqanefer); [Powell et al. 2022](https://doi.org/10.1126/sciadv.abq3766) and
the [reply by Berger et al. 2023](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2023.1211478/pdf);
[EA 35's 500 talents questioned, AURA 2020](https://epub.lib.uoa.gr/index.php/aura/article/view/2173);
[Labaya](https://en.wikipedia.org/wiki/Labaya); [Niqmaddu II](https://en.wikipedia.org/wiki/Niqmaddu_II). The rest
rests on the works listed in the index, as the builder knows them.

## Haakon's words in this session

None: the session ran from the item's start prompt.
