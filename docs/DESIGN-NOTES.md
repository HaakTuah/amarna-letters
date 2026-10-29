# Design notes

Decisions and simplifications made while building the prototype from the design document.
Every number here lives in `GameConfig` or `MapData` and is meant to be tuned.

Split into one file per topic under `docs/design/` on 26 October 2026, word for word, so that a session reads only
the topics its task needs. The text as it stood before the split is in git history. A new topic gets its own file and a line
here.

The historical sources behind the data (item 6+) are in [`history/`](history/README.md): dossiers on 1346 BCE, each
claim graded and sourced.

| File | Topic | KB |
| --- | --- | --- |
| [`design/01-rules-as-implemented.md`](design/01-rules-as-implemented.md) | Rules as implemented | 45.0 |
| [`design/02-communication.md`](design/02-communication.md) | Communication | 16.4 |
| [`design/03-characters.md`](design/03-characters.md) | Characters | 34.1 |
| [`design/04-models.md`](design/04-models.md) | Models | 16.9 |
| [`design/05-pacing/00-overview-and-what-wakes-a-king.md`](design/05-pacing/00-overview-and-what-wakes-a-king.md) | Pacing: sleeping seats: overview, and what wakes a king | 14.5 |
| [`design/05-pacing/01-an-envoy-at-the-door.md`](design/05-pacing/01-an-envoy-at-the-door.md) | Pacing: an envoy at the door | 10.9 |
| [`design/05-pacing/02-the-digest-what-kings-are-told-and-the-cap.md`](design/05-pacing/02-the-digest-what-kings-are-told-and-the-cap.md) | Pacing: changes, the digest, what the kings are told, and the cap | 8.0 |
| [`design/05-pacing/03-scheduled-orders-and-the-march.md`](design/05-pacing/03-scheduled-orders-and-the-march.md) | Pacing: scheduled orders and the march | 7.9 |
| [`design/05-pacing/04-standing-orders.md`](design/05-pacing/04-standing-orders.md) | Pacing: standing orders | 12.5 |
| [`design/05-pacing/05-conditions-answers-alerts-and-replay.md`](design/05-pacing/05-conditions-answers-alerts-and-replay.md) | Pacing: conditions, planning ahead, standing answers, light alerts, failures and replay | 7.5 |
| [`design/06-file-seats-and-the-agent-simulation.md`](design/06-file-seats-and-the-agent-simulation.md) | File seats and the agent simulation | 15.4 |
| [`design/07-script-kings/00-overview.md`](design/07-script-kings/00-overview.md) | Script kings: overview and "Every feature is every seat's" | 2.8 |
| [`design/07-script-kings/01-a-season-in-order.md`](design/07-script-kings/01-a-season-in-order.md) | Script kings: A season, in order | 1.3 |
| [`design/07-script-kings/02-terms-used-below.md`](design/07-script-kings/02-terms-used-below.md) | Script kings: Terms used below | 3.5 |
| [`design/07-script-kings/03-temperament.md`](design/07-script-kings/03-temperament.md) | Script kings: Temperament | 3.0 |
| [`design/07-script-kings/04-memory-and-learning.md`](design/07-script-kings/04-memory-and-learning.md) | Script kings: Memory and learning | 5.1 |
| [`design/07-script-kings/05-choosing-a-war.md`](design/07-script-kings/05-choosing-a-war.md) | Script kings: Choosing a war | 2.6 |
| [`design/07-script-kings/06-betrayal.md`](design/07-script-kings/06-betrayal.md) | Script kings: Betrayal | 0.8 |
| [`design/07-script-kings/07-coalitions-and-defence-pacts.md`](design/07-script-kings/07-coalitions-and-defence-pacts.md) | Script kings: Coalitions and defence pacts | 4.5 |
| [`design/07-script-kings/08-rivals-for-the-crown-and-bandwagoning.md`](design/07-script-kings/08-rivals-for-the-crown-and-bandwagoning.md) | Script kings: Rivals for the crown, and bandwagoning | 0.8 |
| [`design/07-script-kings/09-good-faith.md`](design/07-script-kings/09-good-faith.md) | Script kings: Good faith | 1.9 |
| [`design/07-script-kings/10-tactics-the-first-plan.md`](design/07-script-kings/10-tactics-the-first-plan.md) | Script kings: Tactics: the first plan | 8.1 |
| [`design/07-script-kings/11-the-look-ahead.md`](design/07-script-kings/11-the-look-ahead.md) | Script kings: The look-ahead | 6.1 |
| [`design/07-script-kings/12-standing-orders.md`](design/07-script-kings/12-standing-orders.md) | Script kings: Standing orders | 5.6 |
| [`design/07-script-kings/13-treasury.md`](design/07-script-kings/13-treasury.md) | Script kings: Treasury | 8.5 |
| [`design/07-script-kings/14-court-and-intelligence.md`](design/07-script-kings/14-court-and-intelligence.md) | Script kings: Court and intelligence | 8.4 |
| [`design/07-script-kings/15-letters-and-gifts.md`](design/07-script-kings/15-letters-and-gifts.md) | Script kings: Letters and gifts | 5.5 |
| [`design/07-script-kings/16-audiences.md`](design/07-script-kings/16-audiences.md) | Script kings: Audiences | 5.2 |
| [`design/07-script-kings/17-greetings.md`](design/07-script-kings/17-greetings.md) | Script kings: Greetings | 0.9 |
| [`design/07-script-kings/18-script-envoys.md`](design/07-script-kings/18-script-envoys.md) | Script kings: Script envoys | 7.4 |
| [`design/07-script-kings/19-known-quirks.md`](design/07-script-kings/19-known-quirks.md) | Script kings: Known quirks | 3.6 |
| [`design/07-script-kings/20-benchmarks.md`](design/07-script-kings/20-benchmarks.md) | Script kings: Benchmarks | 1.7 |
| [`design/08-balance.md`](design/08-balance.md) | Balance (script kings) | 6.6 |
| [`design/09-the-web-map-and-the-interface.md`](design/09-the-web-map-and-the-interface.md) | The web map and the interface (visual overhaul) | 16.1 |
| [`design/10-where-the-code-differs-from-the-design-document.md`](design/10-where-the-code-differs-from-the-design-document.md) | Where the code differs from the design document (as it stood on 19 October 2026) | 6.6 |
| [`design/11-not-built-yet.md`](design/11-not-built-yet.md) | Not built yet | 7.3 |
| [`design/12-the-map-and-the-seas.md`](design/12-the-map-and-the-seas.md) | The map and the seas (item 7a) | 7.5 |
| [`design/13-travel-and-news.md`](design/13-travel-and-news.md) | Travel and news (item 7b) | 9.3 |
| [`design/14-structured-press.md`](design/14-structured-press.md) | Structured press, recognition, gold without an inventory, local agent characters (item 8) | 13.4 |
| [`design/15-envoy-authority-and-passage.md`](design/15-envoy-authority-and-passage.md) | Winter dangerous, spy reports by road, envoy authority, passage and basing (item 9) | 8.6 |
| [`design/16-the-economy-at-home.md`](design/16-the-economy-at-home.md) | The economy at home: grain, stores, markets, pay and food, caravans, the siege's clock, the wealth of a realm (item 9+a) | 9.5 |
| [`design/18-characters-who-they-are.md`](design/18-characters-who-they-are.md) | Characters, first package: the pool of 60, skills and belief, names made of outcomes, declared names and false envoys, what servants know, captives handed over, tablets taken (item 10) | 9.3 |
| [`design/17-the-economy-abroad.md`](design/17-the-economy-abroad.md) | The economy abroad: trade at foreign markets, ships in cargo service, tolls, smuggling, troops abroad by leave, the sack (item 9+b) | 7.5 |
| [`design/19-people-at-home.md`](design/19-people-at-home.md) | People at home: the three groups and their flows, the harvest by the hands on the land, the tax and hunger, levies, colonists, droughts and floods, winter in the field, the people's resistance (item 10+a) | 10.5 |
| [`design/20-people-across-borders.md`](design/20-people-across-borders.md) | People across borders and in kings' hands: flight and runaways, settling the loose, returning runaways, deportation, mouths put out, robbing; ships at a besieged harbour, prices and tolls as reported, characters' own claims and words, false envoys' audience, captives under guard, the sack and archive as loads, one price at a market, water under siege (item 10+b) | 10 |
| [`design/21-money-and-work.md`](design/21-money-and-work.md) | Money and work: jobs with a fee and a court's record, the going rate, hiring in person, living from the markets, hoards, debt tablets, borrowing and repaying, the characters' own seasons and dealings, collectors, newcomers through the doors, strategy and road, the score counting what is held (item 11a) | 9 |
| [`design/22-harvests-and-answers.md`](design/22-harvests-and-answers.md) | Harvests in their season (crop, reaping, granaries, the tax from them) and Haakon's answers to items 8 to 10+b: model envoys altering clauses, winter by men, passage by order, levies and battle by men, runaways by what they keep, mouths chosen, water by a dossier, deportees freed, robbing outside a siege; watching spies and winter strokes by sea (item 11a+) | 9 |
| [`design/23-roads-and-reputations.md`](design/23-roads-and-reputations.md) | Roads and reputations: bands and chiefs (crowds, mutineers, refugees, successors, splits, outlaws), robbing and pay, hunting, pirates, the way back; travellers robbed on the road, the leader's pace; letters from abroad waiting for carriers; news for sale; reputation from losses abroad; natural losses (item 11b) | 8 |
| [`design/24-jobs-and-money-answers.md`](design/24-jobs-and-money-answers.md) | Haakon's answers to items 11a and 11a+: jobs as errands, every payment by order, offers abroad by envoy, no going rate, records, a tablet's end and grants as news, seizing hoards, tablets collected and sold, a captive's purse, the levy's size, dealing in a shared province; script players (after item 11b) | 7 |
| [`design/25-chiefs-and-spies-choose.md`](design/25-chiefs-and-spies-choose.md) | Model chiefs' and spies' own requests: where a band works, ships, whom it kills, the way back; a spy's waiting reports (after item 11b+) | 3 |
| [`design/26-city-states-as-powers.md`](design/26-city-states-as-powers.md) | City-states as powers: the 23 city-states and chiefs as powers, Gaza and Sumur Egypt's, no purchase; vassal tablets and their template clauses, the opening bonds; par for each starting position; the state of the realm; staff by size and the pool of 100; script vassalage (item 11+) | 8 |
| [`design/27-answers-to-11b-plus.md`](design/27-answers-to-11b-plus.md) | Haakon's answers to item 11b+: talk of promises never forgotten, a dead man's purse, travellers who decide whether to carry, a stay at court as an errand, standing hunts by province heard by talk, every traveller a witness, the border walk, reports and the evidence of a broken job (item 11b++) | 6 |
| [`design/29-answers-to-11plus.md`](design/29-answers-to-11plus.md) | Haakon's answers to item 11+: walls from the dossier and none for the chiefs, Terqa, Mira and Seha as vassal city-states, par over all games with a fall as 0, land in the scripts' reckoning, a capital ceded whole by sealed tablet (item 11d) | 4 |
| [`design/30-languages.md`](design/30-languages.md) | Languages: who speaks what where, skills as time, learning by living there, the dice of speaking, go-betweens and bending, composing, reading tablets, hearing at court, the retired garbling, script kings choosing envoys by claims (item 12) | 6 |
| [`design/28-the-true-map-and-the-red-sea.md`](design/28-the-true-map-and-the-red-sea.md) | The true map, the Red Sea and six cities of Canaan (item 11c): the board in a true projection from Natural Earth, names by zoom step, the Red Sea and Punt, Akko, Hazor, Gezer, Ashkelon, Lachish and the Hebron hills as Egypt's vassals |
| [`design/32-the-map-at-a-glance.md`](design/32-the-map-at-a-glance.md) | The map read at a glance (item 11c+): borders traced along ridges, rivers and desert edges, roads for arrows, names that give way to everything over the land, counters that gather by zoom, marks for crossings and rough ground, views kept, the map light in dark mode, the newest version at once |
| [`design/33-the-rest-of-the-map.md`](design/33-the-rest-of-the-map.md) | The rest of the map (item 11f): the crossings of 1346 (the Marassantiya, the Orontes, the Jordan, the upper Euphrates, Beirut's Lebanon road, the Western Desert and the Negev) with their dossiers and what was checked and left out; Azzi-Hayasa, Niya, Tunip, Beirut, Pella, Ashtaroth, Samuha, Libya and the Shasu; caravans that go anywhere at risk, and troops shut in by a siege seizing nothing beyond the walls | 6 |
| [`design/34-the-map-uncluttered.md`](design/34-the-map-uncluttered.md) | The map uncluttered (item 11c++): markers that never overlap (small seals), borders as natural lines, real relief, every river that mattered, the lakes and marshes of 1346, finer geography close up |
| [`design/35-command-at-a-distance.md`](design/35-command-at-a-distance.md) | Command at a distance (item 13): armies and fleets at the sources' sizes, battles with losses and falling back, marching by size and forced marches, commanders as grants with mandates, the court wherever the king is, orders by courier, governors, a fallen kingdom coming apart, captains from the ranks, bands enlisted as soldiers | 12 |
| [`design/36-map-neighbours.md`](design/36-map-neighbours.md) | Neighbours on the map are neighbours in the rules (item 11f+): touching provinces connected, roads over a third province's land passing through it, and seven roads' land redrawn, each with its dossier | 3 |
| [`design/37-legends.md`](design/37-legends.md) | Legends (item 14): biographies from the record, histories of tablets, the rise and fall of courts, the record opened to every seat at the end, "a new Idrimi" and Finkel's third plea for gold | 4 |
