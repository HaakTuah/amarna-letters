# Command at a distance (item 13)

Build order item 13 (`docs/intent/build-order/item-13.md`), with "Command at a distance", "Ruling by mandate", "Commanders",
"Distance inside your own realm", "A kingdom falls with its capital", "Battles: one season, losses, no dice",
"Distance-based marching", "What sets a company's pace", "Armies need food as well as pay", "A head rises where men lack
one", "Scheduled, conditional orders" and "Starting positions come from the sources" (question 7 of the old round report).
Save version 31. The report, with the readings taken and the measures, is `docs/rounds/2026-10-29-command-at-a-distance.md`.

## Armies and fleets from the sources (`model/map.ts`)

- **The Great Kings** start at the armies dossier's "Start from" men (`docs/history/11-armies-and-fleets.md`): Egypt and Hatti
  15,000, Mitanni, Babylonia and Arzawa 10,000, Assyria 4,000, Alashiya 1,500, split between the cities where each kept its
  troops; Egypt's garrisons at Gaza and Sumur a hundred men each. Until item 13 every unit was a full levy (5,000; a fleet's
  crews 2,000).
- **Fleets** by ships, `MenPerShip` 25 men a ship [G]: Egypt 40 ships, Ugarit 80, Alashiya 30, Arwad, Sidon and Tyre 20,
  Byblos and Arzawa 10, Hatti 5. A city's fleet stands in the waters off its city (one unit to a province), its men levied
  from the city.
- **The city-states** at the dossier's ranges (`CityRange`): the middle for the cities that fight in the letters (Amurru,
  Damascus, Shechem, Qatna), the low end for those that only plead (Byblos, Jerusalem, Megiddo, Tyre), and elsewhere the old
  guess (50 men a shekel of yield, 250 in the lands without a town) kept within the range; without a range, the old guess.
- A unit's men are levied from where its men live (`StartUnit.home`), as the people dossier counts them.

## Battles: one season, losses, no dice (`turn/battles.ts`, `model/command.ts`)

- The adjudicator decides who wins as before, each unit by its men, now shaped by its commander (below); it also returns
  each battle (`Fight`): a move on another power's unit that stood or met it head on, with the strengths compared.
- **Losses** (`BattleData`, first guesses): the loser loses 10 in a hundred of its men and 4 more for each ten points of
  margin (the winner's strength less the loser's, over the winner's); the winner 50 in a hundred of what the loser lost,
  times the loser's strength over its own. Half the men lost die; the rest turn loose where the battle was.
- **Falling back**: a unit beaten from its place falls back to a neighbouring province of its side's, one granted to it,
  one nobody holds or (a fleet) a sea zone, never where the attack came from, where a unit ends the season or where two
  moves bounced; its own land first, then a friend's, then where fewest foreign troops stand next to it. Units falling
  back choose in an order the seed draws. One with nowhere to go, or beaten by 67 or more (three to one), is destroyed.
- Each side's king is told of the battle and his own losses (`tell`: from far off, when a courier brings it).

## Marching by distance and pace (`turn/marching.ts`, `model/travel.ts`)

- A move still crosses one connection a season (the season's one battle), at the unit's pace (`legPoints` with
  `Company.troops`): an army a percent slower for each 100 men (at most twice), a fleet for each 50 (at most half again);
  `GameConfig.armyPace` scales the term (100). A connection longer than a season's march takes several: the unit marches
  on, holds where it stands for the fighting, and keeps what it made while its orders keep it on that road
  (`Unit.march`, `Unit.along`); one stopped at the far end waits there and goes in at once if ordered on again.
- **Forced march** (`MoveOrder.forced`, `force_march`): two thirds of the time, and 5 in a hundred of the men drop out each
  season it forces the pace, staying loose where they fall out.
- A scheduled move still on its long road is kept for next season, not counted as stopped.

## Commanders (`turn/command.ts`, `rules/validator-command.ts`)

- **A grant, not a job**: order `command` grants a person standing at the king's court, his own or free, the command of a
  unit; he travels there and commands from the season he arrives (`Unit.commander`, `commandFrom`), duty `Commanding`,
  `Character.grantedBy` the king. `relieve` sends word; when it reaches him he steps down and walks to court, or (loyalty
  below 30 and ambition above 60) keeps an army as his band (`armyToBand`). A commander whose army is gone walks home; one
  whose army is destroyed is taken by the side that beat it half the time.
- **What a good one does better** (`CommandData`, from his traits; nobody, or the king himself, counts as 50): strength in
  battle ±15% (`commandStrength`, passed to the adjudicator), winter's losses a percent less for each 2 points of competence
  above 50, waste when taking food from the land half of 100 less competence plus half of 100 less loyalty (in percent of
  what is taken), and of the king's share of a sack he keeps his greed over 4 in a hundred. Each commander's battles won and
  lost are counted (`Character.won`, `lost`) and shown to anyone who knows him.
- **Mandates** (`Mandate`, order `mandate`): task, target, power, rules of engagement, a power never to fight, withdrawal and
  a last season; it reaches the unit with the couriers (`mandateFrom`). In a season no order of the king's reaches a unit
  with a commander and a mandate in force, the engine asks the commander's mind (`CommanderMinds.decide`): the game's
  script commanders (`bots/commander.ts`) weigh `2 + competence / 10` of the moves the task and limits allow, read
  strengths with an error by their competence, keep to the rules of engagement and withdrawal, and a disloyal one may sit
  his task out. With no mind set (engine-only tests), a mandated unit holds.
- **Standing orders belong to commanders** (`standingRuns`): each unit's part of a standing order runs only once word of it
  has reached the unit (`StandingOrder.given` and the couriers' road), with its commander or the king himself there, and on a
  move its army sees (its province and next to it); a disloyal commander may look away (twice his disloyalty under 50, in a
  hundred), and a competent one sees through a feint (a move into troops at least twice as many as the mover's) his competence in a
  hundred times.

## Distance inside the realm (`turn/couriers.ts`, `rules/court.ts`)

- **The court is wherever the king is** (`GameState.court`, `courtOf`, `TurnEngine.courtAt`): travel, envoys, reports,
  archives and the fall read it where they read the map's capital before. 
- **Couriers** (`courierSeasons`): a lone traveller's pace on the fastest road; 0 where a courier makes it within the season
  (45 days of road). `sendOrders`: an order for a unit or place beyond that sets out with a courier (`GameState.couriers`),
  bound to its unit as a scheduled order is, and is carried out in the season it arrives; orders arriving join the season's
  as orders given now. A courier crossing land whose king closed his roads to his court, where that king's troops stand, is
  stopped 40 in a hundred of such places, and that king reads the order. Scheduled orders run once their word can reach
  their place (`PlannedOrder.given`, `notYetReached`).
- **Word home from a province, one clock** (`wordHomeAt` in `rules/court.ts`, bug #616): the season word of a province's
  season reaches a court, by the couriers' road home from the place to the court in that season (it may differ from the
  road out: rivers, winter at the destination): the same season where they make it within the season, else one more
  than `courierSeasons`. What a court sees as current (`sight`: word comes within the season), a province's report (who
  holds it, `knownHolders`; its sieges, `siegesKnown`), the notices told from it (`TurnEngine.heardAt`, `tell`), a
  census's count, and what is known of caravans and units there (`wordCame`, a caravan's setting out) all read it, so the
  same season's report and notices arrive together. Any new news brought from a province uses it, and whether word
  comes within the season (what a court is told at once, sees as it is, or knows of its own units and caravans there)
  reads the road home too (`TurnEngine.wordFrom`). Orders going out (`sendOrders`, `wordTo`) and loads carried keep
  the road out. The clock reads today's roads and relay stations, so what word has
  brought is kept as it came (`seeLand` stores each court's word of each province in `GameState.known`, which
  `knownHolders` and `siegesKnown` read): roads cut later take nothing back. Save version 57.
- **Reports**: a king's sight takes in his land and troops only within the season's courier reach; beyond, his units are
  shown where they stood as many seasons ago as the road is long (`Unit.trail`, `UnitView.reported`) and orders naming
  them there follow them (`unitShownAt`); notices from there come by a `Realm` word (`tell`); losing land far off is known
  when word comes. Mines and sales beyond the reach fill the province's coffer, which pays what is done there; the rest
  goes to the court as a load that can be waylaid (`53-gold-travels-both-ways.md`).
- **Far land as last reported** (bug #540; `rules/province-reports.ts`, `rules/caravans-known.ts`): as each season begins,
  every held province's report of the season just ended is kept (`GameState.reports`: its economy, works, worth, holdings
  and last reaping, seven seasons; the first, labelled 0, is the land as the game began). A court shows a province it
  knows it holds beyond its sight as the report of the season the word of its holder is from (`knownHolders`), the same
  clock, dated (`ProvinceEconomyView.reported`); a siege begun after that season is not in the report. Its works, walls
  (`wallsKnown`), yields and the `build` check read the same (`ownWorks`, `knownLevel`). Its strength is reckoned from what
  it knows: its land and stores so, its troops and caravans as their reports have them, walkers bound for land it knows it
  holds, gold by its ledger. Caravans keep a report as they set out and as each season ends (`Caravan.trail`); one ended
  is kept a while (`GameState.caravansGone`); a court knows one once word of its setting out could come (its first
  report, which the trail always keeps), then by its newest report whose word has come, dated (`CaravanView.reported`),
  and drops it once word of its end comes; its notices and events are never told before that word (`caravanTell`,
  `caravanNear`). The web map draws a seat's own caravans the same way (`Views.caravansKnown`, `SeasonFrame.knownCaravans`).
  The harvest and the grain lost for room of a far province, and what a far province's works cost, come home by the
  road (`tell`, `nearOf`); a caravan that comes home to a far province sends its gold, word and archive on as a load.
  A unit's trail carries its men's savings; men walking home count once word of their setting out could come
  (`Walk.departs`, `Walk.from`). Still open: what the treasury pays for far off, a far caravan's porters and far works
  paid in gold, leaves it at once (question #587).
- **Far troops raised and gone** (bug #600; `rules/units-known.ts`): a unit is known to its king once word of its raising
  could come (`Unit.since`, from its levy's province; at once for the troops a game begins with), and one that leaves the
  game (`loseUnit`), or passes to another (a gift, levies following a rebel, a fleet into cargo service: `keepGone`, a
  copy for its old king), is kept among `GameState.unitsGone` with its reports, `goneTurn` its season, until word of
  its end could come (`wordCame`; at once from where its couriers cannot reach at all), shown as its last report has
  it (`reportOf`, its newest report the last it sent). The view's units, upkeep (`TurnEngine.upkeep` over the view's own
  troops) and strength, the standings' Units, and a scheduled order for a unit not yet heard of (named by its levy,
  `plannedAsKnown`) read the same; a sleeping seat's orders for a lost unit drop when word of its end comes
  (`lostUnits`); a battle's events name its sides only where their couriers reach (`battles`, the "destroyed" event),
  and a far unit's lines of the season, and an assault on a far walled city, come home by the road as their own
  "Word of your troops" notice, with the place and season it is from (`farMovements`), a loss there waking a sleeping seat by the same word. An order for
  a gone unit rides out and its failure comes home by the road (`orderMissed`); a scheduled or standing order given for
  it is kept, bound to it (`ownNamed` in `bind`), as for one that stands; its commander stays in command as his
  king believes (`coverFor`) until word of the army's end tells of his leaving. Save version 69.
- **A far unit, the rest of it as reported** (bug #615; `rules/units-known.ts`): its king believes each of his units stands
  where his view shows it (`placesKnown`, by `ownPlaces`), and everything he is told of his own doings with it names that
  place: his scheduled and standing orders as his view shows them (`asShown` with a place; they run on the unit itself), a
  standing order's "when your army in X is attacked", the command, recall and mandate notices, whose seasons are reckoned
  from it (the man or the word sets out for where he named it), the word on its food and the gold for it, pay or food
  held back in a province (`setUpkeep` and its check), a commander's duty and his record of battles at court
  (`commanderKnown`, the record from the unit's report, `unitReport`), and the map (`Views.ownUnitsShown`, a frame's
  `knownUnits`). What befalls it out there comes home by the road (`tell`, events by `nearOf`): hunger, a winter
  crossing, a march held up or ended (its seat's view keeps the schedule as it was until then:
  `SleepState.scheduleUnheard`, `scheduleKnown`), troops joined, walls stormed, colonists settled, a commander's
  defection or victory, the land's men holding it off; its missing pay, pay held back, food bought or taken stay its
  own report's. A part that stays its king's when the rest leaves him is a new unit known once word of their parting
  could come (`Unit.raisedAt`, `since`), and gold sent with word on an army's food that finds it gone comes home with the
  courier, as word from there does (`Remittance.food`). Loose men robbing a far province of the king's are told by the
  word from there too. Save version 70.
- **Moving the court** (order `court`, `move_court`; `turn/kings.ts`): 20 shekels and 5 for every ten days of road, at the
  pace of a company of 300. Each season the king goes on, his court where he got to. Envoys, servants and reports that
  reach a court the king has left are sent on after him (`ForwardedKinds`). He is taken, and his kingdom falls, where the
  province he stands in is taken from him (`kingsTaken`, by the season's changes of holder), or on the road through the
  besiegers of a city of his or where a king who closed his roads to him has troops (40 in a hundred each such place); a
  king who has moved is not taken with his old seat. The archive moves with him.

## Governors (`turn/governors.ts`)

- Order `govern` (a person at court, a province of the king's, up to 3 levies): he travels there and governs from the
  season he arrives (`GameState.governors`, duty `Governing`). He raises his levies there on his own when foreign armies
  stand in or next to the province (`governorsLevy`, paid like the king's), and the province's gold passes through his
  hands: he keeps greed × (100 − loyalty) / 20,000 of it. `unseat` sends word; he steps down, or (loyalty below 30,
  ambition above 60) turns with the levies he raised. A province lost ends the governorship.
- Granting a former ruler his city back (item 11d) is a governorship like any other.

## A kingdom falls with its capital (`TurnEngine.fall`)

- The province where the king was passes to whoever took him at once; since item 13+ the rest comes apart only as word
  of the fall reaches each part, land where the conqueror's troops stand then his, a governed province its governor's
  own seat, the rest lawless ([37](37-answers-to-13.md)). A capital ceded by tablet passes whole, as before. The fallen
  king's armies, once the word reaches them, with a commander become the commanders' bands; one with none, if owed pay or hungry, raises a captain from its ranks (`Rose` "captain",
  `BandData.mutinyHead` plus a percent for each 500 men), and any other disbands. Its court's road and couriers end.

## Hiring bands as soldiers (order `enlist`)

- Where an army of the king's stands with a band, its commander or the king there carries the offer: a fee paid now for a
  term. A script chief takes it if it covers his men's cost or their take, whichever is more, over the term, and his cut
  by his greed. His men join the army (`Unit.hiredMen`, `hiredUntil`, `hiredChief`), and he commands it if it has no
  commander; when the term ends they leave as his band.

## Script players

- `bots/generals.ts` (`CommandPlay`, `--no-command-play`, `--command-play-half`): grants command of the largest army away
  from the court to a person at court with no errand, keeping one for letters; gives commanded armies a mandate (besiege the
  city they besiege, else guard where they stand, with the advantage, falling back if outnumbered); recalls a commander
  who has lost two battles more than he won; grants the governorship of the most threatened province with two levies (before
  the season's grants of command), and a former ruler at court his old city; enlists a band of a hundred or more at war;
  moves the court out of a besieged city at once to the farthest safe walled city of its own.
- `bots/commander.ts`: the script commanders' minds (above).

## Not built here

- (Built in item 13+, [37](37-answers-to-13.md): a governor's seat of his own when his kingdom falls, and a fallen
  kingdom coming apart as word of its fall reaches each province.)
- Governors' false reports, and a commander keeping the gold sent for his army's food (item 17's buying by order).
- A ring drawn for the king's reach: the map shows it as its fog, since a seat's sight is what a courier brings within
  the season (`Views.sight`, which the map's frames read). Seizing a king who visits a foreign court by order (he is taken only by
  his province changing hands or on the road).
- Model commanders and governors: all are script minds ("Models only where they matter").
