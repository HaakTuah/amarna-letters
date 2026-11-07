# The realms' name setting names every realm (#768, bugs lane, 7 November 2026)

The owner's answer to #768 (7 November 2026, archive item 233): "4. My idea was a separate setting for each." The
design session's reading, recorded there: the realms' setting names every realm, the city-states and edge lands too,
apart from the places' setting, as his notes of 2 November asked ("Separate for each, with the default using historic
for provinces and modern for realms", item 134). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **Every realm follows the realms' setting** (`ui/names.ts`), no longer the places': a Great King's realm by the name
  people know or its letters' own (Egypt or Miṣri), any other realm by the name a reader knows its city or land by, or
  its name of 1346 (Byblos or Gubla, Libya or Tjehenu). By default Gubla's realm reads Byblos while the city reads
  Gubla. A realm named for no place (Upe, Hana, Mukish) keeps its name either way.
- **In text**, a name both a realm's and a place's is read as the realm's only after words that say so ("the court
  of", "the king of", "the envoy of" and the like); anywhere else it is the place's. A name only a realm bears follows
  the realms' setting wherever it stands, as Miṣri did.
- The card's second line and the "Learn more" link name a realm's other name by the realms' setting
  (`otherRealmName`).
- The menu's tooltip, the README and design note `55-history-search-names.md` say so.
- **Tests:** `src/web/test/search-and-names.test.ts`, the three name-setting tests rewritten for the new default.
- Requests to models, seat views and the engine's text are unchanged, so no save version.

## Readings taken

1. **A city-state's known name is the name a reader knows the place it is named for by** (`FamiliarPlaceNames`), so
   the two settings never disagree about what "modern" means (#768, point 2, which stands). Principle: one fact, one
   place.
2. **In free text a name is a realm's only after realm words.** The engine writes "Gubla" for the city and the realm
   alike, and the page cannot tell them apart otherwise; the words before it ("the court of Gubla") are the only sign.
   Elsewhere ("Rib-Hadda of Gubla", "from Gubla") the name follows the places' setting, as before. Principle: period
   first, given up for playability only where the text cannot say which is meant.

## Questions for the owner

Questions for the owner: none.
