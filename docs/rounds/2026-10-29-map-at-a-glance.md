# Item 11c+: the map read at a glance, and the newest version at once (29 October 2026)

A lane beside items 11e (#154) and 12 (#150). PR #165, branch `item/map-at-a-glance`. The item's text is
`docs/intent/build-order/item-11.md` ("11c+"), with Haakon's words there; item 11c's report is
[`2026-10-29-true-map.md`](2026-10-29-true-map.md). As built: [`docs/design/32-the-map-at-a-glance.md`](../design/32-the-map-at-a-glance.md).
Web app only (`src/web`, its drawing and its offline cache) and one script (`scripts/map-borders.ts`): no rule, number,
save version or engine file changed, so the script benchmarks are unchanged by construction (no file the engine, the
script kings or the batch runner read was touched). Weekly usage could not be read in this session ("unknown").

**The check for changes.** The live design document was asked for changes to the Build order tab since the copy's
revision 100, at the start and again before the PR was readied: revisions 101-103 touched item 11f (a sentence on
sieges and supply), item 15 and the free cities' item; nothing in item 11c+.

## What was built

The four parts, the five more, and the two things Haakon found playing:

1. **Names give way to everything drawn over the land.** Measured as drawn, in order of importance; a name hides where it
   touches a more important name, another city's badge, a counter, a person, news or a mark. Each name stands off its
   city's outermost ring, which grows with its walls (as built, Babylon's and Susa's names touched: no longer).
2. **Counters gather by zoom**: a row of tokens beside the city where it fits, one token per power with its count where
   it does not.
3. **The test**: the smoke test fails if any shown name overlaps another name or a marker, at 390 and 1280 pixels, at
   all eight zoom steps from the whole board to the closest (24x), at the opening and four seasons in. It passed twice.
4. **The newest version at once**: on the start screen a new version takes over and reloads at once; during a game a
   note, "A new version is ready. Reload into this game", reloads into the game's last saved season.
5. **The map opens close**: a seat on its capital; god view and watching on the Levant on a phone, on the whole board on
   a wide screen; each view keeps its zoom and place within a game; one button shows the whole map and returns.
6. **Borders along the land**: traced by a script over a fine grid from the ridges, frontier rivers and desert edges
   (`scripts/map-borders.ts`, 8 seconds); roads between neighbours traced the same way.
7. **Crossings at a glance**: a mark for each pass, ford or ferry, desert edge and rough province, with its legend row,
   and a card on tap with its effect in days by season, winter's danger and the defender's help, from the engine's numbers.
8. **The land as it was**: the bay of Miletus, the Euphrates in its old bed, the Delta's branches (the Gulf's head as
   item 11c drew it); the lands beyond named as no one's; Lesbos, Chios, Samos and Rhodes no one's.
9. **Dark mode**: the map keeps its light colours, dimmed a little; the panels darken.
10. **Cards** keep their title and close button pinned, and close on Escape and on a tap on the map outside them.
11. **Arrows follow the route**: moves, bounces, supports and drafts along the roads of each province passed, with a
    mark at each province on the way and each crossing's mark.

## Readings taken

Each with the principle it rests on ("Reason from the pillars").

1. **"The single tokens" are each power's armies and its fleets as the map already stacks them** (one token per power
   and kind, its count on it), opening from one token per power. Splitting a stack of one kind into a token per unit would
   add tokens that say nothing more than the count does. (The map serves reading at a glance.)
2. **A name may sit against its own city's badge**, never another's: a name hangs from its city by design, and now
   stands off its outermost ring. (The item's own words: "touches no more important name and no badge" of another place.)
3. **A tap on the map while a card is open only closes the card**, as Haakon asked ("closes ... by tapping the map outside
   it"); the next tap selects. While orders are drafted, taps stay orders. (His words, literally.)
4. **The crossings marked are those the rules have today**; a strait's mark and legend row appear once item 11f adds one.
   The candidates the item names (the Orontes, the Jordan, the Zagros edge, the Nile's cataracts, the Khabur) are drawn
   and act as borders now, and become crossings in item 11f, so two rule changes are never measured at once. (The item's
   own split: "The crossings go into the rules in item 11f.")
5. **Which rivers are frontiers**: a great river is a border only where the engine crosses it between provinces (the
   Euphrates from Carchemish and Emar upstream, the Tigris between Taidu and Nineveh), and the spine of its provinces
   elsewhere; every lesser river drawn is a border where it lies between two cities. (Different data, same rules: the
   drawing reads the engine's `Crossings` and `Rivers`.)
6. **A desert road to a sea** (Thebes to the Red Sea) has its mark halfway along its road, since it crosses no drawn border.
7. **The old Euphrates bed** runs Sippar, Babylon, Nippur's country, Uruk, Ur, as the engine's course already lists
   (`Rivers`: sippar, babylon, nippur, ur); the Tigris is left as Natural Earth draws it. (The period first.)
8. **Edge names** where the sources give one (dossier 08, extended): Wilusa, Masa, Ahhiyawa, Keftiu, Tjehenu, Pala,
   Lullubi, Anshan; Arabia's deserts and the Black Sea keep their plain names.
9. **Views are kept for the tab's life** (session storage), by game and whose eyes; a reload into a new version keeps them.
10. **The phone's opening on the Levant** is zoom 4.2 centred at 33.4 N 36.1 E (Ugarit to Gaza, Cyprus to Damascus);
    "a phone" is a screen narrower than 700 pixels.
11. **Dark mode dims the map to 88 in a hundred**, the powers' colours included, so nothing on it glares; no power's
    colour changes otherwise.

## Where the drawing and the connections disagree (for the design session)

Neither was changed. Connected by land, but their traced provinces do not touch (the road passes a third province's
land): akko-ashkelon, amurru-nuhashshe, amurru-ugarit, arrapha-susa, ashur-terqa, babylon-durkurigalzu, byblos-damascus, damascus-tyre, delta-gaza, durkurigalzu-nippur, durkurigalzu-susa, ekallate-sippar, ekallate-terqa, gaza-jerusalem, gaza-megiddo, gaza-shechem, gezer-megiddo, hebron-sinai, isuwa-sapinuwa, jerusalem-lachish, jerusalem-sinai, megiddo-tyre, mira-tuwanuwa, nuhashshe-qadesh, nuhashshe-terqa, seha-tuwanuwa, steppe-suhu.

Their traced provinces touch, but no road joins them: alalakh-nuhashshe, aleppo-steppe, amurru-qatna, arrapha-durkurigalzu, arrapha-sippar, ashur-suhu, ashur-taidu, durkurigalzu-suhu, gezer-hebron, harran-steppe, hazor-shechem, hazor-sidon, isuwa-taidu, nippur-sippar, nuhashshe-steppe, nuhashshe-sumur, qadesh-sidon, qadesh-steppe, steppe-terqa, taidu-terqa.

## Checks

- `scripts/test.sh`: see the PR. Smoke test (`src/web/smoke.mjs`, Playwright, 390 and 1280 pixels): passed, twice.
- Pictures before and after, phone and desktop, light and dark: in the PR.
- Throttled CPU (4x, a phone): see the PR.
- No model games.

## Design questions

None: the page and the item's words settled every reading above.
