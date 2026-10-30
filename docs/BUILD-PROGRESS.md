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
| 11b++ | None: "The game in one page" and the item's text settled every answer | Readings 1-15 in `docs/rounds/2026-10-29-answers-to-11b-plus.md` | For review, no questions |
| 13+ (#190) | None: the item's text, "A kingdom falls with its capital" and the page settled every reading | Readings 1-10 in `docs/rounds/2026-10-29-answers-to-13.md` | For review, no questions |
| 16 (#194) | None: the page and the item's sections settled every reading | Readings 1-13 in `docs/rounds/2026-10-29-royal-council.md` (the darkest omen at the bottom of the cap's range, as the text says, against the reviewer's wish to place it by the curve: reading 10) | No questions |


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
| 11f+ | Neighbours on the map are neighbours in the rules | No lever to use or ignore (the map's neighbours); the script kings ordered 18 in a hundred of their moves over the 23 new connections, every one used, in all 50 games | Used; nothing to compare |
| 13 | Granting command, mandates, governors, bands enlisted as soldiers and moving the court (`--command-play-half`) | 0.77 growth to 0.76, 27 wins to 23, in 50 games (0.78 to 0.77, 27 to 23 before two script patches); hunting re-measured with command (`--outlaw-play-half`): 0.76 to 0.77, 28 wins to 22 | Paying a little, within noise: the gain is in far provinces, which the scripts' growth reaches late; re-measure in item 18 |
| 13+ | A risen governor's seat (no script choice to ignore: the same script king plays it) | No governor rose in 50 games; in a small game the risen seat kept its men, took lawless land beside it and replayed exactly | Not measurable yet: governors are rarely in place when a Great King falls; re-measure once item 17 raises more powers in play |
| 16 | Playing troops and levies by the royal council, the whole plan of the advisor the others agree with most (`--council-play-half`) | 0.82 growth to 0.76, 29 wins to 21, in 50 games (a troop-by-troop majority across the plans: 0.81 to 0.79, 17 to 33) | Pays, followed as a plan; the omens are words, nothing to measure |
| 14 | Legends, and a greedy king's begging letter | n/a: the legends are read by people, never by a seat; the begging letter is an Easter egg (3 letters in 50 games, 1 granted) | Nothing to measure |
| 15 | Roads and relay stations, policing, harbours, water works, repairs under siege and razing (`--works-play-half`; baseline builds only walls) | 0.79 growth to 0.76, 23 wins to 27, in 50 games (first build, before two script patches: 0.78 to 0.79, 28 to 22) | Pays in growth, wins within noise; Assyria grows less using it (0.57 to 0.86): re-measure in item 18 |

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 11d | The answers to item 11+ | done (stop for review: question in "For Haakon") | `item/answers-to-11plus` (#145) | [report](rounds/2026-10-29-answers-to-11plus.md) |
| 11e | Cities defended by their men, and a fair scoreboard | done (29 Oct; stop for review: question in "For Haakon"): the men of fighting age count by number, beside a troop in the open and on the walls in a storm, the walls multiplying them; each power ranked against its own position's results; the final score blends size and performance (size weight 50, a first guess). A kingdom fallen in the first two seasons: 1 game of 50 (50 before); wins by performance alone 12 Great Kings / 38 city-states, by the blended score 49 / 1 | `item/cities-defended` (#154) | [report](rounds/2026-10-29-cities-defended.md) |
| 11c+ | The map read at a glance, and the newest version at once | done (29 Oct): borders traced along ridges, frontier rivers and desert edges (`scripts/map-borders.ts`); roads for arrows and travellers; names that give way to names and pieces, measured; counters that gather by zoom; marks and tap cards for crossings and rough ground; the land as it was (bay of Miletus, the old Euphrates, the Delta's branches) and the lands beyond named; views kept, the map opening close; cards pinned; the map light in dark mode; the newest version at once. Web only, no save version | `item/map-at-a-glance` (#165) | [report](rounds/2026-10-29-map-at-a-glance.md) |
| 11f | The rest of the map: its crossings and its missing places | done (29 Oct): the crossings of 1346 with their dossiers (the Marassantiya, the Orontes at Shabtuna and below Niya, the Jordan, the upper Euphrates into Isuwa, Beirut's Lebanon road, the Western Desert, the Negev); Azzi-Hayasa, Niya, Tunip, Beirut, Pella, Ashtaroth, Samuha, Libya and the Shasu (Shechem under Labaya); caravans that go anywhere at risk, open roads first; troops shut in by a siege seize nothing beyond the walls; Haakon's answers to 11e and 12 (size weighs 5 in a hundred; anyone in a court's service bridges; an Akkadian scribe at every court that reads it); save version 30. Wins 27 Great Kings / 23 city-states (49 / 1 before); a kingdom fallen in the first two seasons in 6 games of 50 (the Suteans 5). Its third part, "neighbours on the map are neighbours in the rules", is item 11f+ | `item/map-crossings` (#169) | [report](rounds/2026-10-29-map-crossings.md) |
| 11f+ | Neighbours on the map are neighbours in the rules | done (29 Oct): the 56 disagreements between the drawn map and the connections settled, each with its dossier: 23 touching pairs connected (the steppe's desert roads, the Jordan by Jericho, the Anti-Taurus, the Negev), 24 roads over a third province's land now passing through it (the Ways of Horus through the Sinai, the coast road by Gezer and Megiddo, Ashur and Ekallate to the Euphrates by Suhu), seven roads' land redrawn (Aruna to Megiddo, the King's Highway to the Shasu, Der to Dur-Kurigalzu, Kumidi to Damascus, and three in Anatolia); par measured again; save version 32. Wins over 28 powers, 13 Great Kings / 37 city-states and chiefs; a kingdom fallen in the first two seasons in 19 games of 50 (17 before; Lukka 12, the Suteans 4) | `item/map-neighbours` (#185) | [report](rounds/2026-10-29-map-neighbours.md) |
| 11c++ | The map uncluttered | done (29 Oct): markers never overlap (small seals by importance, returning as you zoom in), the phone opening a step closer, borders as natural lines, real relief, every river that mattered from real data, the lakes and marshes of 1346, finer geography past 6x; one question in "For Haakon" | `item/map-uncluttered` (#180) | [report](rounds/2026-10-29-map-uncluttered.md) |
| 12 | Languages | done (29 Oct; stop for review: question in "For Haakon"): languages by province and court from the dossier; every character's and king's skills; learning by living there; the dice of who understands whom before any model is called; envoys nobody understands (told plainly, gifts by the envoy's choice, stay, home or lie); go-betweens and bending in someone else's pay; hiring and carriers by understanding; composing and reading tablets; hearing at court; the competence garbling retired; save version 29. One envoy in five is not understood on arrival (Egypt 31 in a hundred, Babylonia 22) After it, #173 split `character-mind.ts` (51 KB) into it (41 KB), `character-self.ts` and `character-recital.ts`. | `item/languages` (#150) | [report](rounds/2026-10-29-languages.md) |
| 13 | Command at a distance | done (29 Oct; stop for review: questions in "For Haakon"): armies and fleets at the sources' sizes; battles with losses and falling back; marching by size, forced marches; commanders as grants, with mandates, competence in battle, foraging, winter and sacks; standing orders through commanders; the court wherever the king is, orders and reports by courier; governors; a fallen kingdom coming apart, captains from the ranks; bands enlisted as soldiers; gold from far provinces as loads; save version 31 | `item/command-at-a-distance` (#175) | [report](rounds/2026-10-29-command-at-a-distance.md) |
| 13+ | The answers to item 13: governors' seats, and a realm coming apart as the news arrives | done (29 Oct; stop for review, no questions): the capital passes at once, the rest of a fallen realm as word of the fall reaches it, its gold going to whoever holds the capital meanwhile; a governor there rules his province as a power risen in play with a seat of his own; save version 33 | `item/command-answers` (#190) | [report](rounds/2026-10-29-answers-to-13.md) |
| 14 | Legends | done (29 Oct; no questions): biographies, histories of tablets and the rise and fall of courts read from the record; the record opened to every seat at the end (lies, skims, forged seals, bent words, secret masters, the drawn season); "a new Idrimi" on 13+'s risen governors; Finkel's third plea in the record and the annals, and a greedy script king's begging letter; save version 34 | `item/legends` (#189) | [report](rounds/2026-10-29-legends.md) |
| 15 | Infrastructure and policing | done (29 Oct; stop for review, no questions): walls, roads, relay stations, harbours, policing and water works as one rule (levels with upkeep in gold or corvée, decay, projects), each king's standing order at the start keeping what stands; roads and stations in the pace and the couriers' reach, letters read at stations, police on the loose, the bands and smugglers, harbours for wintering fleets, water works, repairs under siege, razing; walls city by city from the dossier, Akhetaten none; save version 35 | `item/infrastructure` (#192) | [report](rounds/2026-10-29-infrastructure-and-policing.md) |
| 16 | The royal council | done (29 Oct; no questions): four advisors on the script kings' planner with known tilts for model, file and human seats, numbers from the pictured seasons, compact counsel, titles from the dossier, the toggle in the log; omens of the end for every seat and character in each court's voice; save version 36 | `item/royal-council` (#194) | [report](rounds/2026-10-29-royal-council.md) |
| 17 | How cities become free | not started | | |
| 17+ | The opening as it stood, the land east of the Jordan, and every place by its own name | not started: troop positions and documented debts from the sources (no letters or memories written for a court); the Shasu of Seir, the Bashan Ashtaroth's and the land south of it Pella's, the plateau beyond the Salt Sea outside the game, labelled by description (11f+'s question answered); every name shown as the sources of 1346 give it (Dimashqa, Gubla, Pihil), the modern name on the province card's second line and in the gazetteer; only what stood in 1346 drawn as standing (Shuwardata's land on Gath, not Hebron; Nesa a land with no great town); every town's people as it stood in 1346 (Akhetaten about 15,000-20,000, Kalavasos small and new) | | |
| 17++ | What a king can count | not started: the province card shows a province's town and its land apart; a king sees his own soldiers exactly, his own people and stores to two figures, others' lands as dated estimates; god view exact; the census (scribes sent to count a province: full tax and levy where counted, a growing hidden share where not, some unrest); the king always states an amount of grain and men per province (replacing item 10+a's tax rate), collectors who may skim or squeeze, the census measuring fields too | | |
| 18 | The balance pass | not started | | |
| 19 | The living map | not started: with every feature built; may run beside 18 | | |

Side lane, a smaller default world for tests (29 Oct, #136): test games play a few seated powers among idle ones
(`src/game/test/small-world.ts`); suite 2264 s to 955 s, a code PR's CI about 4 min 50 s to 1 min 52 s
(`docs/rounds/2026-10-29-small-test-world.md`).

Side lane, map labels overlapping on a busy machine (29 Oct, #196): names and markers are placed again when a zoom's
glide or a piece's slide really ends, not on timers guessed from their length; the smoke test waits for a still map and
plays a game in slow motion (`docs/rounds/2026-10-29-map-label-overlap.md`).

Side lane, the smoke test in CI (29 Oct, #199): a `smoke` job beside the test shards, only when a PR changes what the
app bundles; it caught names still overlapping after #196: Chromium re-sized map text after placement, now laid out at its own size
(`docs/rounds/2026-10-29-ci-smoke.md`).

Done items 1 to 10 and the port's findings (all handled): `docs/archive/progress-done.md`.
