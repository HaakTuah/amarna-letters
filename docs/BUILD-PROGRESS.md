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
| 11b | 1. Only spies' reports from abroad wait for a carrier; rumours, word of the world and ransom demands still travel as talk by themselves (or ransom demands need a carrier too)? 2. A spy with nobody to carry its reports for two seasons carries them home itself and leaves its post (or it waits at its post however long it takes)? 3. A spy watching a province next to its master's land hands its reports to the realm's couriers (or every post outside the realm needs a carrier)? 4. A king's army standing in his own province where a band works falls on it each season by itself (or only on an order to hunt)? 5. A band cannot be hired as soldiers until item 13's command at a distance; a chief who gives up the road can be hired like anyone (or hire a band now, sparing its master's land)? 6. A king's pardon is hiring the chief once he has given up the road (or a pardon order or clause now)? 7. Chiefs choose raids, ships and the way back by a formula, model chiefs too, with no request of their own (or a chief's own request now)? 8. A band that robs a traveller kills him 1 time in 10 (or robbers never kill)? 9. Only free people sell news; servants abroad do not sell what they see (or envoys and spies may sell it too)? 10. A court's record of paying is still known to all at once, as 11a's question 3 left it (or carried as news, now that people carry news)? | Readings 1-16 in `docs/rounds/2026-10-28-roads-and-reputations.md`, "Readings taken and design questions" | Open |


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

## Items

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 10+a | People at home | done (28 Oct): #104 into `develop`, carried to `main` by the milestone PR #105: each province's people in three groups from the people dossier (settled with their men of fighting age, under arms on units, loose) and the flows between them; the harvest by the hands on the land, men weighing more at sowing and harvest; the king's tax by province with hunger in the same season; births, moving within a kingdom with the purse, the roads against the land, the loose drifting; levies drawn from the men, discharged men walking home or settled as colonists; droughts by region and floods by river; winter in the field and the pace terms; the people's resistance (`peopleDefence`); save version 17; the mutinous and discharged men carry their savings home (Haakon's answer). Script kings tax to what farmers bear, feed famines, levy where it costs least and settle colonists (`--land-play-half`: 1.05 growth to 1.04, 25 wins each) | `item/people-at-home` | `docs/rounds/2026-10-28-people-at-home.md` |
| 10+b | People across borders and in kings' hands | done (28 Oct): #107 into `develop`, carried to `main` by the milestone PR: Haakon's answers carried from 10+a (anyone's ships at a besieged harbour; prices and tolls known only as reported; model characters' own claims and words under questioning; a false envoy's full audience; captives under guard; rumour by road was already so); 10+a's "Reason from the pillars" list (no false name exposed by chance; the sack by its causes, the king's share and a captured archive as loads; one price at a market; water by where a city stands), all but the harvest in its own season (question 1); flight and runaways across borders, settling the loose, returning runaways (clause `fugitives`), deportation, mouths put out, robbing; save version 18; the batch keeps no turn snapshots. Script kings use all of it (`--border-play-half`: 30 wins to 20) | `item/people-across-borders` | `docs/rounds/2026-10-28-people-across-borders.md` |
| 11a | Money and work | done (28 Oct): jobs with a fee and an advance replace wages and back pay, a court's record of paying, one going rate of service, hiring in person, characters living from the markets with hoards and debt tablets, kings borrowing and repaying by order, characters' own season (`Life`), newcomers through the doors, strategies and roads, the score without debts and the dead ranked last; save version 19. Before it, #109 split `OrdersPanel.tsx` and `rules.ts`. Collector errands and tablet deals unused by scripts (report, "Script players") | `item/money-and-work` | `docs/rounds/2026-10-28-money-and-work.md` |
| 11a+ | Harvests in their season, and the answers to items 8 to 10+b | done (28 Oct): Haakon's answers to items 8 to 10+b (model envoys alter clauses; winter takes men by size and supplies; passage and basing by order; levies sized by men, and every unit counts in battle by its men; runaways by what they keep; mouths by the king's share; water from a dossier per city, `docs/history/10-water.md`; deportees freed on the road; robbing outside a siege only the countryside's) and the harvest reaped in each land's season into the farmers' granaries, the tax taken from them a third at a time; the audit restored false names (given on arrival); script kings post watching spies, strike by sea in winter and grant by order (`--season-play-half`: 29 wins to 21); save version 20 | `item/harvests-and-answers` | `docs/rounds/2026-10-28-harvests-and-answers.md` |
| 11b | Roads and reputations | in progress (28 Oct): bands and chiefs, letters needing carriers, news for sale, reputation from losses abroad, natural losses, travellers robbed on the road, the leader's pace; save version 21. Opens with Haakon's answers to items 11a and 11a+ (jobs as errands, fees agreed, payments and renewals by order, records as news; `docs/intent/build-order/item-11.md`): see the report | `item/roads-and-reputations` | `docs/rounds/2026-10-28-roads-and-reputations.md` |
| 11+ | City-states as powers | not started | | |
| 12 | Languages | not started | | |
| 13 | Command at a distance | not started | | |
| 14 | Legends | not started | | |
| 15 | Infrastructure and policing | not started | | |
| 16 | The royal council | not started | | |
| 17 | How cities become free | not started | | |
| 18 | The balance pass | not started | | |

Done items 1 to 10 and the port's findings (all handled): `docs/archive/progress-done.md`.
