# Item 17+++b: history, search and names

The owner (2 November 2026, in the design document's "History, search and names"): "Should have some way of viewing a
titles history? You know, both crusader kings 2 and dwarf fortress have ledgers and history buttons where you can track
the events of any province, title or character, should we have the same maybe?" and "Need menus to search everything up
in, like ck2. Titles, characters, etc. To filter everything by. Should use fuzzy search. Should be able to use both modern
and historic names. Could be settings to have historic or modern names? Separate for each, with the default using
historic for provinces and modern for realms. Also, should be filters, and so you can search for everything also. And you
should see count of stuff (a count of how many you know anyways) of characters, realms, and such.", then "Yes ro
absolutely all pt these! Extra expertly expertly!"; and in "Learn more, and what is invented": "Yes please, expertly!".

The item's text: `docs/intent/build-order/item-17.md` ("17+++b, history, search and names"); its sections: "History,
search and names" and "Learn more, and what is invented" (Spectator mode), "Places by their own names" (Voice of the age).
How it works: `docs/design/55-history-search-names.md`. The live design document could not be read from this session (a
session on the owner's second account: the docs connector refuses it), so the copy on `develop` was read instead, by its
diff since the item began (8ba8016d), as `docs/intent/INDEX.md` says.

## What was built

- `src/engine/src/rules/history.ts` (`historyOf`): the history of a province, realm, title or person, oldest first, as a
  court learned it or the whole record; it reads the legends' record helpers (`changes`, `wordIn`, `courtLegend`,
  `characterLegend`, now exported from `legends.ts`).
- `src/engine/src/model/familiar-names.ts`: places by the names a modern reader knows (`FamiliarPlaceNames`, 49 places)
  and the three Great Kings' realms whose letters named them otherwise (`PeriodRealmNames`: Miṣri, Karduniash, Aššur),
  anchored in the geography dossier's new section "The Great Kings' realms by their period names".
- `src/engine/src/model/learn-more.ts`: 74 places, 47 realms, 89 people (31 kings and 58 others) and 25 languages, each
  with its link; every URL fetched (200, no disambiguation page, no redirect to another subject). 52 people have no page of
  their own and link to the page that tells of them (33 to "Amarna letters"; kings without a page to their city's).
  Notes where the game takes a side the page does not: seven uncertain sites (Samuha, Washukanni, Taidu, Niya, Ekallate,
  Aijalon, Gath), the Ways of Horus (its page is the whole coast road's, under a later name), and the three men whose
  names the game gave.
- The web: `ui/names.ts` (the two settings, in the game's menu; `shown` rewrites names on the page), `ui/search.ts`
  (`knownTo`, the forgiving match), `components/SearchPanel.tsx`, `HistoryPanel.tsx`, `LearnMore.tsx`; history buttons
  on the province card, the standings' realms and every person; the map's labels renamed in place (`renameLabels`); the
  Provinces list searching by every name with its count, the People window's counts; the language a person speaks linking
  to its page. Two windows join the keys' table, Search and History, with no key by default.
- `scripts/links.mjs`: every link fetched and the broken ones listed, for the weekly run outside the pull requests.
- Tests: `src/engine/test/history.test.ts`, `learn-more.test.ts`, the realms' period names in `history-anchors.test.ts`;
  `src/web/test/search-and-names.test.ts`; the canary now reads the Search window and the history of everything a seat
  knows, for every seat, every season and on replay.

Checked in the built app (Playwright, `play?watch=3`, 1400 by 900): the Search window finds Gubla by "Byblos" and opens
its history ("also Byblos", "Learn more: Byblos"); with modern places and period realms the map's labels read Ephesus,
Tyana, Kanesh, Byblos, Thebes, the standings Miṣri, Karduniash and Aššur, the court strip Miṣri and Aššur, the history
window "History of Byblos, also Gubla"; no page error.

## Readings taken

- **Only the Great Kings' realms follow the realms' setting**; every other realm is named by its land or city, a place,
  and follows the places' setting (Gubla's realm is Byblos with modern places). Principle: "Places by their own names" says
  the seven Great Kings' realms keep the names people know while every place, "city, land or province", takes its name of
  1346, and the built game already names the city-states by their period names; so the default stays as built.
- **A modern name is the name a reader knows today, not the site's village**: Hattusa stays Hattusa, not Boğazkale;
  Byblos, Thebes, Kirkuk, Lycia. The card's second line keeps the site ("today Byblos (Jbeil)"). Principle: the owner's
  own words, "the names people actually know"; a setting for players, not a gazetteer.
- **A title is a realm's name**, which any power may claim ("A power's name is a claim"): its history is every claim,
  recognition, crowning, fall and rising that names it. The realm is the court, wherever it goes and whatever it is
  called. Principle: the game's own split of names and courts (item 17+).
- **What a seat learned**: the events its court saw, as word reached it, even of its own land's changes of hand (Codex's
  review found the first version told a court of its own loss before the news came); a person by the name it knows; dated
  by the season of the event, as the events panel dates them. The whole record shows in god view and once the game ends.
  Principle: hidden information (the canary reads every history window for every seat).
- **A person's history is their legend**, as the follow view's "In the record" reads it, so the two never differ.
- **"Held or lost"** applies to a seat's provinces and the titles it claims; **"alive or dead"** to people and realms
  (standing or fallen, as the seat view's `fallen` says). **"Place"** narrows to a province and the people the seat knows
  to stand there.
- **The counts are of what the seat knows**: its own people and those come to its notice, every province and realm on its
  map, every realm's own name and the claims it has heard.
- **A real man whose name the letters lost** (the Assyrian envoys of EA 16, Alashiya's governor) keeps his link, with a
  note that the game gave the name. Principle: "a player always knows what is history and what is fiction": the man is
  history, the name fiction, and the card says both.
- **The weekly link check is a script, not yet a workflow**: a new workflow needs the owner's yes in its PR (`SECURITY.md`,
  rule 3), so the workflow that runs `scripts/links.mjs` weekly is proposed in a PR of its own, once this one merges, for
  his yes.
- **No key for Search or History by default**: neither of Paradox's games gives one a sure like (`54-keys.md`); a player
  gives them one on the Keys page.

## Script kings and the benchmarks

Presentation only: no rule, request, seat view or save changes, so script kings and characters have nothing new to use
and no save version is taken. The batch of script games (`scripts/sim.sh --games 50 --seed 1 --verify-replay`) is the
regression check: below.

## Questions for the owner

- #768: what the two name settings show: the realms' setting for the Great Kings' realms only, and modern names as the
  names readers know (Hattusa, not Boğazkale).
