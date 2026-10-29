# Build progress

Follows "Build order" in the design document (copy: `docs/intent/build-order/`; the builder rules are in
`.claude/rules/builder-rules.md`). One line per item: state, branch, report, and what was decided along the way. Items
are built on their own branch from `develop` and merged into `develop` when the tests pass and one reviewer has found
nothing blocking; `main` is never pushed to: it changes only by the milestone PR from `develop`, which the builder
merges once CI is green ("You merge, always.", 27 October 2026). The whole order is built without
stopping at review points: their questions and the readings taken are listed under "For Haakon" and in each item's
report. Work goes on item after item until weekly usage nears 90% ("Usage" in the builder rules; decided 26 October
2026, replacing the stop after item 5 of 20 October).

Since 27 October 2026 the design document has one tab per system, and its copy one folder per tab
(`docs/intent/INDEX.md` lists them, with each tab's node and revision for the check for changes). An entry keeps its
title wherever it moved, so `grep -rn "Title" docs/intent` still finds what an item names. On 27 October the document was
also condensed: passages that record history rather than intent (what was tried or retired, what past runs
measured, the full text of items 1 to 5) moved word for word to `docs/archive/design-history.md`, so a title that
`grep` no longer finds in `docs/intent/` is looked up there.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`.
Haakon's standing instructions given in chat are recorded word for word in `docs/archive/instructions.md`.

## For Haakon: review points

Answered review points, and the rows of items 1 to 11c, are in `docs/archive/progress-done.md` (moved 28 October 2026,
"The workshop check").

| Item | Review question | Reading taken | State |
|---|---|---|---|
| 11c (#143) | None: the page and the sections settled every reading | Readings 1-12 in `docs/rounds/2026-10-29-true-map.md` | Lane, no questions |
| 11c+ (#165) | None: the page and the item's words settled every reading | Readings 1-13 in `docs/rounds/2026-10-29-map-at-a-glance.md`; the drawing's disagreements with the connections listed there for the design session | Lane, no questions |
| 11f (#169) | None: the page and the sections settled every reading | Readings 1-15 in `docs/rounds/2026-10-29-map-crossings.md`; the connections rule of the live text (revision 106) deferred to the next item that touches the connections | No questions |
| 11c++ (#180) | 1. On a phone's opening view of the Levant, lesser coast cities show as small seals and their armies are hidden until you zoom in one more step: keep that, or show a lesser city's counters as one small gathered token even while its badge is a seal (they may then crowd the coast)? | Hide them, a dark rim on the seal where troops stand (reading 1 in `docs/rounds/2026-10-29-map-uncluttered.md`); readings 1-13 there | Lane, one question |
| 11b++ | None: "The game in one page" and the item's text settled every answer | Readings 1-15 in `docs/rounds/2026-10-29-answers-to-11b-plus.md` | For review, no questions |
| 13 (#175) | Stop for review, question 1: a fallen kingdom's governor "his province's leader with a seat of his own" needs item 17's risen seats. Until then his province falls lawless with the rest; or bring risen seats forward for governors now? | Lawless until item 17 (alternative: governors' seats now) | Open |
| 13 (#175) | Question 2: a fallen kingdom comes apart at once, or province by province as word of the fall reaches each (the item's words)? | At once, the fallen power leaving play that season (alternative: each province as it was until the news reaches it) | Open |


## Use against ignore

Every item adds its numbers here: on the same seeds, scripts that use the item's features against scripts that ignore them ("Using a feature must pay" in the builder rules, 28 October 2026). While the game is incomplete a feature may not win yet; once it is feature complete (item 18) none may be left whose users do not come out ahead. Earlier items' numbers are in their reports; item 10+a's audit of every feature built so far adds them here.

| Item | Feature | Users against ignorers (same seeds) | Verdict |
|---|---|---|---|
| 6c | Sleeping script kings planning ahead (`--plan-ahead-half`) | 2.63 growth to 2.34, 41 wins to 39, in 80 games | Pays, a little (from its report) |
| 7a | Sea play: blockades, guards, landings (`--no-sea-play`) | mixed by power (Hatti 3.76 to 3.52, Babylonia 3.06 to 4.15) | Matters; whether it pays as a whole was not measured (from its report) |
| 7b | Closing roads to foes (`--road-play-half`) | 2.80 growth to 2.54, 26 wins to 24 | Pays (from its report) |
| 8 | Inventories with gold (`--no-inventory-play`) | 2.70 growth to 2.65 | Barely (from its report) |
| 9 | Winter strokes over the passes (`--no-winter-play`) | 2.70 growth to 2.72 | Not paying (from its report) |
| 9 | Envoy authority and passage (`--no-authority-play`) | 2.70 growth to 2.67 | Barely (from its report) |
| 9+a | The economy played well: depots, caravans, pricing (`--plain-economy-half`) | 1.02 growth to 0.94, 23 wins to 27 | Grows more, wins less (from its report) |
| 9+b | Trade abroad, ships, tolls (`--trade-play-half`) | 32 wins to 18 | Pays |
| 10 | Characters: seeking, questioning captives, stealing, false names | 22 wins to 28 in 50 games, same growth | Not yet paying: errands come in 11, 11b and 13; re-measure there |
| 10+a | Tax to what farmers bear, famine feeding, levy costing, colonists (`--land-play-half`) | 1.05 growth to 1.04, 25 wins to 25, in 50 games | Barely: the levers are small at these first guesses (10+a's reading 14); re-measure in item 18 |
| 10+b | Settling the loose, returning promised runaways, deporting from taken land at risk, putting mouths out (`--border-play-half`) | 1.08 growth to 1.02, 30 wins to 20, in 50 games | Pays (unevenly by power: Hatti 0.80 to 1.03) |
| 11a | Kings borrowing from lenders at court and repaying what is due (`--money-play-half`) | 1.16 growth to 1.14, 28 wins to 22, in 50 games | Pays, a little: kings are rarely short at these first guesses |
| 11a+ | Tax and famine by the granaries, smaller levies, mouths by share, deporting by safe roads, passage by order, watching spies, winter strokes by sea (`--season-play-half`) | 1.17 growth to 1.15, 29 wins to 21, in 50 games | Pays, a little (unevenly: Hatti 1.20 to 1.51) |
| 11b | Hunting the bands in one's land and buying news of foes (`--outlaw-play-half`) | 1.17 growth to 1.16, 22 wins to 28, in 50 games (26 to 24 before the review's fixes) | Not paying yet: the hunt costs men and keeps armies from the front; re-measure with policing (15) and command (13) |
| 11b+ | Borrowing and repaying, carriers paid by standing order, tablets sold and collected, hoards seized (`--money-play-half`; every king pays fees on completion) | 1.12 growth to 1.09, 22 wins to 28, in 50 games | Not paying yet by wins (carriers' fees and repayment cost gold; a good name pays in hiring); re-measure in item 18 |
| 11b+ | Hunting bands only where it breaks them or drives them abroad, and buying news of foes only (`--outlaw-play-half`) | 1.13 growth to 1.14, 23 wins to 27, in 50 games (1.08 to 1.16, 20 to 30 before the patch) | Even, within noise: troops standing already halve what bands take; re-measure with policing (15) and command (13) |
| 11+ | Vassalage: tribute paid while it is worth it, demands of vassals in arrears, offers either way, paying vassals spared (`--vassal-play-half`) | 0.88 growth to 0.88, 25 wins to 25, in 50 games | Not paying yet: tribute moves score, it does not make it; re-measure with command (13) and policing (15) |
| 11b++ | Hunting bands by order where it breaks them, buying news of foes (`--outlaw-play-half`; the first measure in the thirty-power world) | 0.87 growth to 0.92, 20 wins to 30, in 50 games (the whole-land standing hunt: 0.88 to 0.92, 19 to 31) | Not paying: a hunt costs the army's men and the band's, and troops standing with a band already halve what it takes; re-measure with policing (15) and command (13) |
| 11d | Ceding a capital whole by sealed tablet | n/a: no script cedes its capital, by design (a fallen power's growth is 0); the rest is starting data | Nothing to measure |
| 11e | Reckoning the city's men on the walls and the land's men beside a troop (`--wall-play-half`) | 0.77 growth to 0.75, 24 wins to 26, in 50 games (0.71 to 0.76 before two script fixes) | Even: the rule is the engine's, and reckoning it no longer costs a king |
| 12 | Choosing envoys by the languages they say they speak, and hiring a bridge for an envoy nobody understands (`--language-play-half`; on 11e's game) | 0.75 growth to 0.75, 23 wins to 27, in 50 games (0.69 to 0.72, 21 to 29 before two script fixes and 11e) | Even, within noise: the rules bind every king alike; the seasons a good choice saves do not yet turn into gain; re-measure with command (13) and in item 18 |
| 11f | Kingdoms supplying their armies through foreign land, sneaking where closed (`--caravan-play-half`) | 0.79 growth to 0.77, 20 wins to 30, in 50 games (24 to 26 before the review's open-roads-first fix) | Not paying yet in wins (caravans found and seized in closed land cost grain and porters); re-measure with command at a distance (13) |
| 13 | Granting command, mandates, governors, bands enlisted as soldiers and moving the court (`--command-play-half`) | 0.77 growth to 0.76, 27 wins to 23, in 50 games (0.78 to 0.77, 27 to 23 before two script patches); hunting re-measured with command (`--outlaw-play-half`): 0.76 to 0.77, 28 wins to 22 | Paying a little, within noise: the gain is in far provinces, which the scripts' growth reaches late; re-measure in item 18 |

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 11d | The answers to item 11+ | done (stop for review: question in "For Haakon") | `item/answers-to-11plus` (#145) | [report](rounds/2026-10-29-answers-to-11plus.md) |
| 11e | Cities defended by their men, and a fair scoreboard | done (29 Oct; stop for review: question in "For Haakon"): the men of fighting age count by number, beside a troop in the open and on the walls in a storm, the walls multiplying them; each power ranked against its own position's results; the final score blends size and performance (size weight 50, a first guess). A kingdom fallen in the first two seasons: 1 game of 50 (50 before); wins by performance alone 12 Great Kings / 38 city-states, by the blended score 49 / 1 | `item/cities-defended` (#154) | [report](rounds/2026-10-29-cities-defended.md) |
| 11c+ | The map read at a glance, and the newest version at once | done (29 Oct): borders traced along ridges, frontier rivers and desert edges (`scripts/map-borders.ts`); roads for arrows and travellers; names that give way to names and pieces, measured; counters that gather by zoom; marks and tap cards for crossings and rough ground; the land as it was (bay of Miletus, the old Euphrates, the Delta's branches) and the lands beyond named; views kept, the map opening close; cards pinned; the map light in dark mode; the newest version at once. Web only, no save version | `item/map-at-a-glance` (#165) | [report](rounds/2026-10-29-map-at-a-glance.md) |
| 11f | The rest of the map: its crossings and its missing places | done (29 Oct): the crossings of 1346 with their dossiers (the Marassantiya, the Orontes at Shabtuna and below Niya, the Jordan, the upper Euphrates into Isuwa, Beirut's Lebanon road, the Western Desert, the Negev); Azzi-Hayasa, Niya, Tunip, Beirut, Pella, Ashtaroth, Samuha, Libya and the Shasu (Shechem under Labaya); caravans that go anywhere at risk, open roads first; troops shut in by a siege seize nothing beyond the walls; Haakon's answers to 11e and 12 (size weighs 5 in a hundred; anyone in a court's service bridges; an Akkadian scribe at every court that reads it); save version 30. Wins 27 Great Kings / 23 city-states (49 / 1 before); a kingdom fallen in the first two seasons in 6 games of 50 (the Suteans 5). Not built, for the next item that touches the connections: the live text's rule of revision 106, "neighbours on the map are neighbours in the rules" (56 cases in `scripts/map-borders.ts`'s list, each with its dossier, and a measure of its own) | `item/map-crossings` (#169) | [report](rounds/2026-10-29-map-crossings.md) |
| 11c++ | The map uncluttered | done (29 Oct): markers never overlap (small seals by importance, returning as you zoom in), the phone opening a step closer, borders as natural lines, real relief, every river that mattered from real data, the lakes and marshes of 1346, finer geography past 6x; one question in "For Haakon" | `item/map-uncluttered` (#180) | [report](rounds/2026-10-29-map-uncluttered.md) |
| 12 | Languages | done (29 Oct; stop for review: question in "For Haakon"): languages by province and court from the dossier; every character's and king's skills; learning by living there; the dice of who understands whom before any model is called; envoys nobody understands (told plainly, gifts by the envoy's choice, stay, home or lie); go-betweens and bending in someone else's pay; hiring and carriers by understanding; composing and reading tablets; hearing at court; the competence garbling retired; save version 29. One envoy in five is not understood on arrival (Egypt 31 in a hundred, Babylonia 22) After it, #173 split `character-mind.ts` (51 KB) into it (41 KB), `character-self.ts` and `character-recital.ts`. | `item/languages` (#150) | [report](rounds/2026-10-29-languages.md) |
| 13 | Command at a distance | done (29 Oct; stop for review: questions in "For Haakon"): armies and fleets at the sources' sizes; battles with losses and falling back; marching by size, forced marches; commanders as grants, with mandates, competence in battle, foraging, winter and sacks; standing orders through commanders; the court wherever the king is, orders and reports by courier; governors; a fallen kingdom coming apart, captains from the ranks; bands enlisted as soldiers; gold from far provinces as loads; save version 31 | `item/command-at-a-distance` (#175) | [report](rounds/2026-10-29-command-at-a-distance.md) |
| 14 | Legends | not started | | |
| 15 | Infrastructure and policing | not started | | |
| 16 | The royal council | not started | | |
| 17 | How cities become free | not started | | |
| 18 | The balance pass | not started | | |
| 19 | The living map | not started: with every feature built; may run beside 18 | | |

Side lane, a smaller default world for tests (29 Oct, #136): test games play a few seated powers among idle ones
(`src/game/test/small-world.ts`); suite 2264 s to 955 s, a code PR's CI about 4 min 50 s to 1 min 52 s
(`docs/rounds/2026-10-29-small-test-world.md`).

Done items 1 to 10 and the port's findings (all handled): `docs/archive/progress-done.md`.
