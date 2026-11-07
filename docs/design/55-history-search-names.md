# History, search and names (item 17+++b)

The item's text: `docs/intent/build-order/item-17.md` ("17+++b, history, search and names"); its sections: "History,
search and names" and "Learn more, and what is invented" (Spectator mode), "Places by their own names" (Voice of the
age). The report: `docs/rounds/2026-11-07-history-search-names.md`. Presentation only: no rule, request, seat view, log or
save changes, so no new save version.

**History buttons** (`rules/history.ts`, `historyOf`; the web's `HistoryPanel`). Every province, realm, title and person
has one: on the province card, the standings' realm names, every person in the People window and every row of the search.
Its window lists the thing's events oldest first, each dated, with its cause as the record words it, read from the record
of items 14 and 17a:

- a **province**: how it changed hands (the holders' log, as legends read it), its fall as a capital, and every event that
  names it;
- a **realm**: its rise and fall (the legends' `courtLegend`), and every event that names it by any of its names;
- a **title**, a realm's name, which any power may claim ("A power's name is a claim"): every claim, recognition,
  crowning, fall and rising that names it;
- a **person**: their legend (`characterLegend`).

A seat reads only what its court learned: the events it saw (`GameEvent.visibleTo`), how its own land changed hands, its
own realm's rise and fall; never another court's. The whole record shows in god view, and to every seat once the game
ends and the record opens. Each window says which, and how many events it knows.

**One search** (`ui/search.ts`, the web's `SearchPanel`; the window "Search", with no key by default since neither of
Paradox's games gives one, as `54-keys.md` says). It holds everything the seat knows (`knownTo`): every province and
realm on its map, the titles it knows (every realm's own name and the names it has heard claimed), its own people and
those come to its notice (the seat view's `court` and `known`); in god view, everyone. Each thing is found by any of its
names: period and modern, the province card's description, a realm's names and its king's, a person's declared names.
The match forgives misspellings: a name's beginning first, then a word's, then the query inside it, then a word within
one edit (a query of four letters or fewer) or two of it; diacritics, ʿ and ' are ignored, so "Surru" finds Ṣurru.
Filters narrow it by kind, realm (a province's holder as the seat knows it, a person's employer, a title's claimants),
place, alive or dead (a realm standing or fallen, as the seat view's `fallen` says) and, for a seat, held or lost (its
provinces now, and those it held and lost). Every list says its count of what the seat knows, never the true total.

**Two name settings** (`ui/names.ts`, in the game's menu, kept in this browser as `amarna-names`). Places: their names
of 1346 (the default) or the names a modern reader knows them by (`FamiliarPlaceNames` in
`model/familiar-names.ts`: Byblos for Gubla, Thebes for Waset, Kirkuk for Arrapha; never a description; a place whose
period name is the one readers know, Hattusa or Ugarit, keeps it). Realms: the names people know (the default) or their
own letters' names (`PeriodRealmNames`: Miṣri, Karduniash, Aššur, each anchored in the geography dossier); only the
Great Kings' realms differ, since every other realm is named by its land or city, a place, and so follows the places'
setting (Gubla's realm is Byblos with modern places). The page rewrites the names where it shows them, in every panel,
the map's labels and the engine's text it shows (`dated`, `powerName` and `provinceName` in `ui/format.ts`); a name is
swapped only as a whole word, never inside another (Ashur-uballit stays). The other name always shows on the card's
second line: "in 1346 Gubla" under a modern name, "today Byblos (Jbeil)" under a period one. The engine's text, every
seat view and every request to a model keep the names as they are.

**Learn more, and what is invented** (`model/learn-more.ts`, the web's `LearnMore`). Every real place, realm, person and
language carries a link, mostly to its English Wikipedia page, opened outside the game under the title the card shows;
where a person has no page of their own, the page that tells of them, named as such. Where the game takes a side its page
does not, the card says so in a line (`note`). A realm's card links its ruler of 1346 too. Everything the game made up
(a person not of the period, a realm risen in play) is marked on its card as invented. `LearnMoreTests` fails the build
when a real entity lacks its link; its dossier reference was checked already (`HistoryAnchorTests`). The links themselves
are checked by `scripts/links.mjs`, run weekly outside the pull requests, so a moved page never blocks one.
