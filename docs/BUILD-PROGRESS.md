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

Answered review points, and the rows of items 1 to 10, are in `docs/archive/progress-done.md` (moved 28 October 2026,
"The workshop check").

| Item | Review question | Reading taken | State |
|---|---|---|---|
| 11c (#143) | None: the page and the sections settled every reading | Readings 1-12 in `docs/rounds/2026-10-29-true-map.md` | Lane, no questions |
| 11e (#154) | The weight of size in the final score: at equal weights the Great Kings win 49 of 50 games; by performance alone 12 of 50 (an even share is about 9), at 15 percent 29. Keep 50 until item 18 (or set it near 5 now)? | 50 until item 18, as the text says; readings 1-16 in `docs/rounds/2026-10-29-cities-defended.md` | Open |
| 11b++ | None: "The game in one page" and the item's text settled every answer | Readings 1-15 in `docs/rounds/2026-10-29-answers-to-11b-plus.md` | For review, no questions |


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

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 10+a | People at home | done (28 Oct): #104 into `develop`, carried to `main` by the milestone PR #105: each province's people in three groups from the people dossier (settled with their men of fighting age, under arms on units, loose) and the flows between them; the harvest by the hands on the land, men weighing more at sowing and harvest; the king's tax by province with hunger in the same season; births, moving within a kingdom with the purse, the roads against the land, the loose drifting; levies drawn from the men, discharged men walking home or settled as colonists; droughts by region and floods by river; winter in the field and the pace terms; the people's resistance (`peopleDefence`); save version 17; the mutinous and discharged men carry their savings home (Haakon's answer). Script kings tax to what farmers bear, feed famines, levy where it costs least and settle colonists (`--land-play-half`: 1.05 growth to 1.04, 25 wins each) | `item/people-at-home` | `docs/rounds/2026-10-28-people-at-home.md` |
| 10+b | People across borders and in kings' hands | done (28 Oct): #107 into `develop`, carried to `main` by the milestone PR: Haakon's answers carried from 10+a (anyone's ships at a besieged harbour; prices and tolls known only as reported; model characters' own claims and words under questioning; a false envoy's full audience; captives under guard; rumour by road was already so); 10+a's "Reason from the pillars" list (no false name exposed by chance; the sack by its causes, the king's share and a captured archive as loads; one price at a market; water by where a city stands), all but the harvest in its own season (question 1); flight and runaways across borders, settling the loose, returning runaways (clause `fugitives`), deportation, mouths put out, robbing; save version 18; the batch keeps no turn snapshots. Script kings use all of it (`--border-play-half`: 30 wins to 20) | `item/people-across-borders` | `docs/rounds/2026-10-28-people-across-borders.md` |
| 11a | Money and work | done (28 Oct): jobs with a fee and an advance replace wages and back pay, a court's record of paying, one going rate of service, hiring in person, characters living from the markets with hoards and debt tablets, kings borrowing and repaying by order, characters' own season (`Life`), newcomers through the doors, strategies and roads, the score without debts and the dead ranked last; save version 19. Before it, #109 split `OrdersPanel.tsx` and `rules.ts`. Collector errands and tablet deals unused by scripts (report, "Script players") | `item/money-and-work` | `docs/rounds/2026-10-28-money-and-work.md` |
| 11a+ | Harvests in their season, and the answers to items 8 to 10+b | done (28 Oct): Haakon's answers to items 8 to 10+b (model envoys alter clauses; winter takes men by size and supplies; passage and basing by order; levies sized by men, and every unit counts in battle by its men; runaways by what they keep; mouths by the king's share; water from a dossier per city, `docs/history/10-water.md`; deportees freed on the road; robbing outside a siege only the countryside's) and the harvest reaped in each land's season into the farmers' granaries, the tax taken from them a third at a time; the audit restored false names (given on arrival); script kings post watching spies, strike by sea in winter and grant by order (`--season-play-half`: 29 wins to 21); save version 20 | `item/harvests-and-answers` | `docs/rounds/2026-10-28-harvests-and-answers.md` |
| 11b | Roads and reputations | done (28 Oct), #121: bands and chiefs, letters needing carriers, news for sale, reputation from losses abroad, natural losses, travellers robbed on the road, the leader's pace; save version 21. Haakon's answers to items 11a and 11a+ it left are built in 11b+ (below) | `item/roads-and-reputations` | `docs/rounds/2026-10-28-roads-and-reputations.md` |
| 11b+ | Jobs as errands, and the answers to items 11a, 11a+ and 11b | first part done (28 Oct), #124: Haakon's answers to items 11a and 11a+: jobs as errands offered at court or abroad by envoy, every payment by order (fees, carriers), renewing as a new offer, no going rate, records, a tablet's end and grants as news, seizing hoards, tablets collected and sold, dealing in a shared province, the levy's size, a captive's purse kept until taken; 11b's crowding and outlaw weaknesses patched; save version 22. second part done (28 Oct), #125: Haakon's answers to item 11b's review (ransom demands carried, the spy decides, the border hand-over, hunting only on order or standing order, robbers choosing whether to kill, anyone selling what he knows, a servant's secrets at their real cost); the script kings hunt only where it breaks a band or drives it abroad, and buy news of foes only (even with ignoring, within noise). A model chief's own request and a model spy's own choice: built in the side lane #128 (`docs/rounds/2026-10-28-model-chief-requests.md`) | `item/jobs-and-money-answers`, `item/answers-to-11b` | `docs/rounds/2026-10-28-jobs-and-money-answers.md`, `docs/rounds/2026-10-28-answers-to-11b.md` |
| 11b++ | The answers to item 11b+ | done (29 Oct), #137: Haakon's answers to item 11b+'s review: talk of promises never forgotten (old talk per person, weighed by age for script characters, a note for model ones), a dead captive's purse to his captor, travellers who decide whether to carry letters, a stay at court as an errand, standing hunts by province heard of by talk, every traveller a witness, the spy's own border walk, the evidence of a sold report; the starting servants' order to pay listed among the king's standing orders, a ransom carrier's fee shown; save version 25. Script kings hunt by order only (the whole-land standing hunt lost), keep a proven person with a stay, dismiss a servant who sold what belonged in his report | `item/answers-to-11b-plus` | `docs/rounds/2026-10-29-answers-to-11b-plus.md` |
| 11+ | City-states as powers | done (28 Oct): the 23 city-states and chiefs as powers (Gaza and Sumur Egypt's), no purchase, vassal tablets and their template clauses, the 17 opening bonds of 1346, par for each starting position, the state of the realm, staff by size and the pool of 100, the chiefs' strongholds; save version 24. Script players pay, demand and offer vassalage by their sums (`--vassal-play-half`) | `item/city-states` | `docs/rounds/2026-10-28-city-states.md` |
| 11c | The map in true geography, and the Red Sea | done (29 Oct): the board in a true projection from Natural Earth, names by zoom step, the map opening on the seat's realm; the Red Sea (Thebes and the Sinai its coasts by desert roads, Punt a door); Akko, Hazor, Gezer, Ashkelon, Lachish and the Hebron Hills as city-states, Egypt's vassals; save version 27 | `item/true-map` (#143) | [report](rounds/2026-10-29-true-map.md) |
| 11d | The answers to item 11+ | done (stop for review: question in "For Haakon") | `item/answers-to-11plus` (#145) | [report](rounds/2026-10-29-answers-to-11plus.md) |
| 11e | Cities defended by their men, and a fair scoreboard | done (29 Oct; stop for review: question in "For Haakon"): the men of fighting age count by number, beside a troop in the open and on the walls in a storm, the walls multiplying them; each power ranked against its own position's results; the final score blends size and performance (size weight 50, a first guess). A kingdom fallen in the first two seasons: 1 game of 50 (50 before); wins by performance alone 12 Great Kings / 38 city-states, by the blended score 49 / 1 | `item/cities-defended` (#154) | [report](rounds/2026-10-29-cities-defended.md) |
| 11c+ | The map read at a glance, and the newest version at once | not started: a lane beside 11e and 12, web app only (`docs/intent/build-order/item-11.md`) | | |
| 11f | The rest of the map: its crossings and its missing places | not started: after 11e, with 11c+'s drawing (`docs/intent/build-order/item-11.md`) | | |
| 12 | Languages | not started | | |
| 13 | Command at a distance | not started | | |
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
