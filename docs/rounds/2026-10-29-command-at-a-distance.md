# Command at a distance (29 October 2026)

Build order item 13, "Command at a distance" (`docs/intent/build-order/item-13.md`), from the armies and fleets dossier
(`docs/history/11-armies-and-fleets.md`) and the attested people (`docs/history/06-attested-people.md`). Branch
`item/command-at-a-distance`, PR #175, pipelined from item 11f (`item/map-crossings`, #169), merged in as it moved. Save
version 31. What was built, by file: `docs/design/35-command-at-a-distance.md`. Weekly usage: unknown (`scripts/usage.sh`
cannot read it in this session). Effort: medium, as set. Carried over to item 13 on its row of the progress file, and
built here: governorship and command as grants of authority, hiring bands as soldiers, gold reaching the treasury by
carriers, the grant back of a ceded capital, a skilled commander cutting winter losses, and hunting re-measured with
command.

## The check for changes

The copy was cut from Build order revision 103, War, travel and the seas 66, Overview 567, Characters 20, Land, people
and economy 33, Engine and models 57. Asked at the start: nothing had changed. Asked again before the pull request:
Build order 105 and Characters 21 changed only item 11f's text and the Akkadian scribe it builds (Haakon's answers to
items 11e and 12), which came in with 11f; nothing in item 13's text or sections changed.

## The audit at the start

The 50 script games on 11f's game (seeds 1-50) used every feature built so far except those earlier audits list for
later items (no hire abroad, no secrets caught or reports sold). None is this item's.

## What was built

See `docs/design/35-command-at-a-distance.md`. In short:

- **Armies and fleets from the sources**: 64 units at the dossier's sizes (Egypt's two field armies of 7,500, Hatti's
  two, Arzawa's 10,000, the cities' ships by their fleets); a unit's strength is its men against a full levy.
- **Battles**: one season each, losses by the margin (the loser at least a tenth, the winner half of what he inflicts),
  the beaten falling back to a free province of their own or neighbouring, destroyed when routed or with nowhere to go;
  the men lost turn loose where the battle was fought.
- **Marching**: by item 7's distance, an army's pace by its size, forced marches (two thirds of the time, one man in
  twenty lost).
- **Commanders**: command granted to a character, who travels to the army; his competence weighs in battle, in
  foraging (in order rather than by looting), in winter losses and in what a sack brings; a record of battles won and
  lost; recall reaching him by courier, refused by a disloyal one, who keeps the army as his band; taken when his army
  is destroyed, half the time.
- **Mandates** in a fixed vocabulary (guard, besiege, take, hold the line, raid, shadow, with engage, avoid and
  withdraw), read by the commander on the spot each season no order of the king's reaches the army; "No commander, no
  mandate". Standing orders run only where a commander or the king is, reach the army by courier, and fire on what
  the army sees.
- **Distance inside the realm**: the court is wherever the king is; every order to a place a courier cannot reach
  within the season goes by courier and is carried out when it arrives, and may be stopped where a king who closed his
  roads has troops; what a king sees as current is what a courier brings within the season (the map's fog draws it),
  the rest by each unit's last report. A king may move his court, by the roads, at a cost.
- **Governors**: a granted province's governor raises up to the levies granted him when foreign troops threaten it, and
  skims the yield by his greed and loyalty; recall by courier, refused by a disloyal one.
- **A kingdom falls with its capital**: it comes apart (the king's province to the conqueror, with the land his troops
  stand on and, until item 17, the governed provinces; the rest lawless); commanded armies become their commanders'
  bands, the others raise a captain from the ranks or disband.
- **Hiring bands as soldiers**: a fee for a term; the chief's men join the army and leave as his band when it ends.
- **Gold by carriers**: gold from mines and sales in provinces a courier cannot reach in the season travels to the
  court as a load.
- The rulebook's COMMAND AT A DISTANCE part, the schema's `command` actions and four other actions, the seat view (court,
  commanders, mandates, reported units, governors), and the web app's command section.

## The review

One reviewer (given the diff, the item's text and "The game in one page") found four blocking points and six to fix,
all fixed in this branch:

- **A grant revoked at a distance at once** (blocking): a new commander could be named while word of the old one's recall
  was still on the road, so he left before it reached him and never had his chance to refuse. Now refused until the
  recall reaches him (tested).
- **Orders naming a unit known only by report** (blocking): command, recall and mandate were checked at the unit's true
  place, and a near unit truly at a place could lose an order to a far one only reported there. One helper now names the
  unit for every order: the one truly there within the season's reach, else the one the king's reports show there.
- **The seat view leaking a far unit's present** (blocking): a report that clashed with another unit was shown where the
  unit truly stood, and food, hunger and pay owed were current. Now a clashing report is shown by an older free report
  of it (or left out), the report carries food, hunger and pay owed, and the notices of recalls, refusals, governors'
  levies and enlisted bands travel back by courier.
- **Governed provinces passing to the conqueror** (blocking): the section gives the governor his province with a seat of
  his own, never to the conqueror; that seat is item 17's risen seats, so governed land now falls lawless with the rest
  (question 1 below).
- Also fixed: a captain rises only in an army owed pay or hungry ("an army that is paid and fed never does"); a mandate
  needs a commander; the march notice gives the seasons left; a fallen court's road and couriers end; script commanders
  read the game's map, not the full one; the sack notice counts the commanders' share apart; no power named in code; the
  rulebook's HOW YOU WIN line on a kingdom's fall said all its land passed to the conqueror.
- Raised as a question rather than changed: the fall coming apart at once rather than as the news reaches each province
  (question 2).

## Readings taken

Each rests on "The game in one page", the item's sections or the dossier.

1. **One connection a season for armies, whatever their pace** ("Distance-based marching" keeps the board's moves):
   pace decides whether a move arrives this season, never more than one province.
2. **A governor's seat of his own waits for item 17** ("A revolt with no leader" brings risen seats): his province
   falls lawless with the rest, and he walks home. Principle: no stopgaps (the conqueror is never given it, which the
   section rules out); the seat comes with the item that brings risen seats. Question 1 asks whether to bring it forward.
3. **A fallen kingdom comes apart at once**, not as the news reaches each province: the parts' rulers are the conqueror
   and nobody (lawless) until item 17, so timing changes little a king can act on. The item's text says "once the news
   reaches it", so this goes to Haakon as question 2.
4. **Script commanders only** ("Models only where they matter"): a commander's mind is a script reading his mandate by
   his competence; kings write the mandates.
5. **A commander's journey to his army is not a road journey** with interception: it takes the courier's time.
6. **Scheduled and conditional orders read the king's knowledge**, which is now only what couriers bring ("Scheduled,
   conditional orders" says "what is known where they run"): a standing order fires only on what its own army sees, and
   other conditions read what the king knows, which is the nearest the orders' triggers allow without a second view.
7. **Realm-wide decrees (roads, tolls) take effect at once**: they are proclamations, not orders to a unit or place.
8. **A feint fools a standing order only by twice as many men** threatening as the order's own: a probe by a few
   cannot set off a whole army.
9. **The map draws the king's reach as its fog**: a seat's sight is what a courier brings within the season.

## First guesses (for item 18)

Battles: loser at least 10 in a hundred plus 4 per point of margin, winner 50 in a hundred of that, rout at 67, half
the lost dead. Pace: armies 100 points a thousand men up to 100, fleets 50; forced march two thirds of the time, 5 in a
hundred lost. Commander: strength 85 to 115 in a hundred by competence (×(competence − 50)/3.33), winter losses a percent less for every 2 points above 50, foraging waste half of 100 less competence over 2, a sack's spoils kept by greed over 4, look-ahead 2 moves plus one per 10 competence, a feint seen through by competence in a hundred. Courier: 45 days a season. Moving the court 20 shekels and 5 for every ten days of road, a company of 300. Governor's skim greed × (100 − loyalty) / 20,000. Enlisting: a chief takes a fee covering his men's cost or take.

## Script players

How often each feature was used, and succeeded, in the 50 script games after (seeds 1-50, every king a script king):
commands granted 1,595 (in every game); battles won under a commander 910; orders carried out by a commander by his
mandate (other than holding) 358; orders sent by courier beyond the season's reach 3,090, stopped on the road 9; units
falling back from a lost battle 296; courts moved 6 (in 4 games); governorships granted 25 (in 21 games); bands enlisted
as soldiers 538; commanders and governors refusing their recall 15. Weaknesses found and patched: the command grants took
every free person at court before a governor could be named (6 governorships in 50 half-games; patched: a threatened
province's governor is named first, 17 after), and a king left his besieged court only after two seasons, when it had
mostly fallen (no court ever moved; patched: at once). A probe of the courts still besieged showed them all single-city
states with no other city to go to; the Great Kings' capitals are rarely besieged in script games, which fall to storms.
Left: script commanders and chiefs are script minds only ("Models only where they matter"); a script king never
recalls a governor, since it cannot see skimming.

## Benchmarks and script games

**Before** (11f's game, `item/map-crossings` at a085a94) and **after** (this branch), `scripts/sim.sh --games 50 --seed 1`;
after with `--verify-replay`: 50 of 50 replays exact. A capital fell in every game both times (699 kingdoms before, 709
after); the first fall came in season 4 on the median, and a kingdom fell in the first two seasons in 19 games of 50 both
times (all city-states; this item changes nothing there, and item 11e's line for a playable game is unchanged by it).
Standing orders kept 3,364 and 3,342, fired 47 and 42. The Great Kings (the city-states and chiefs are in the logs):

| Power | Wins before | Wins after | Growth before | Growth after | Score before | Score after |
|---|---|---|---|---|---|---|
| Egypt | 21 | 21 | 0.93 | 0.93 | 0.80 | 0.82 |
| Hatti | 1 | 0 | 1.17 | 1.21 | 0.52 | 0.57 |
| Babylonia | 1 | 0 | 0.94 | 0.94 | 0.55 | 0.52 |
| Mitanni | 0 | 0 | 0.83 | 0.80 | 0.52 | 0.56 |
| Assyria | 1 | 0 | 0.90 | 0.90 | 0.49 | 0.47 |
| Arzawa | 4 | 3 | 0.95 | 0.77 | 0.76 | 0.78 |
| Alashiya | 1 | 0 | 0.99 | 0.98 | 0.54 | 0.53 |

Arzawa's growth falls most (0.95 to 0.77), most likely its one army of 10,000 at Apasa (the dossier's) marching at
a great army's pace; not measured further, a matter for item 18. The runs took 3,225 s before and 3,445 s after (a fifth of the time is the
replays).

**Hunting re-measured with command** (`--outlaw-play-half`, carried over from 11b++): 0.76 growth to 0.77, 28 wins to 22;
before item 13, 0.87 to 0.92 and 20 to 30. Hunting now comes out ahead in wins and even in growth, within noise; not
measured further, and re-measured with policing (15).

## Use against ignore

`--command-play-half` (half the script kings grant no command, give no mandates, name no governors, enlist no bands and
never move their court), seeds 1-50: 0.77 growth to 0.76, 27 wins to 23 (before the two patches above: 0.78 to 0.77, 27
to 23). Using command pays a little, within noise: an uncommanded army fights at its men's average and holds where no
order reaches it, so the gain is in the far provinces, which the scripts' growth reaches only late in a game.

## Questions for Haakon

1. **A governor's seat when his kingdom falls.** The section makes each governor "his province's leader with a seat of
   his own", but seats rising in play are item 17's. Reading taken: until item 17, a fallen kingdom's governed provinces
   fall lawless with the rest and the governor walks home. Alternative: bring item 17's risen seats forward into item 13
   for governors only, so a governor rules his province as a city-state from the fall. Which do you want?
2. **When a fallen kingdom comes apart.** The item says each part goes its own way "once the news reaches it". Reading
   taken: it comes apart at once, since the fallen power leaves play that season and its parts are then the conqueror's
   or nobody's, so a delay would change only who may march in unopposed for a season or two. Alternative: each province
   stays as it was (its levies holding, untaxed) until word of the fall reaches it at a courier's pace. Which do you
   want?
