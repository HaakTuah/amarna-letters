# Whom a province obeys (item 17++, first part)

Build order item 17++ (`docs/intent/build-order/item-17.md`, "Then **17++**"), its first part: "Whom a province obeys",
"Loyalty is a ledger", "Revolt follows conditions, not dice" as read through the ledger, and "A handful holds nothing by
itself" (War); the governors and commissioners of 1346 and the town rulers as characters. The census, the king's demands,
counts as the scribes knew them, governors over several provinces, grants of kingship and the map's three steps follow in
the item's later parts. The report: `docs/rounds/2026-11-01-whom-a-province-obeys.md`. Save version 39. Every weight is a
first guess in `UnrestData` (`src/engine/src/model/unrest.ts`), tuned in item 18.

## The ledger (`GameState.ledger`, `turn/unrest.ts`)

- Each province's people keep one ledger, by actor: a power, or a character's id. **Takings**: famine under its holder
  (`hunger` 40 at no food, against the hand they see), levies (`levy` 60 for every man of fighting age, `levyMen`), food
  troops took (`taken` 400 for all the farmers' food, against the takers' king, `TakenBook.settle`), a sack (`sacked` 30 by
  the share of the purse, against the sacker), a tax above the usual (`tax` 1 a season for each 10 points of rate above
  `EconomyData.taxPercent`, against the collector). **Givings**: a rival's gold spent by his spy (`stir` 25 a hundred
  shekels, to his master), the holder's troops in it (`troops` 4 a season) or next to it (`near` 1), policing (`policing` 2
  a level), a harvest left to people who ate their fill (`harvest` 2), a tax below the usual, a work built in gold
  (`work` 10, to its builder), a battle won in it by its holder's troops (`victory` 10, and `relief` 20 more when it lifts a siege of it), grain handed
  to its town (`grain` 20 for a season's need in a famine, a quarter of it in plenty, to the hand they see unless handed
  out in the king's own name, the order `feed` with `own`, proclaimed by the courier who brings it). A band's robbing is a
  taking too (`sacked` by the share of the purse, against its chief). What the holder gives counts less the farther his court (`far` 15 in a hundred a season of road beyond the first,
  at most `farMost` 60), except through his governor there.
- **The hand they see** (`handOf`): where a governor of the holder governs, the tax, levies and hunger are his, and the
  harvest left them is his credit; the troops and works stay the king's.
- **Memory fades**: every entry a tenth nearer nothing a season, at least a point (`fade` 10).
- **It starts as 1346 stood** (`openingLoyalties` in `rules/factory.ts`): a king in a province whose people's chief tongue
  is his court's `home` 100, elsewhere `held` 40 (Gaza, Ṣumur, the Ways of Horus and Kush for Egypt; Kizzuwatna, Nesa and
  Tuwanuwa for Hatti; Dilmun and Suhu for Babylonia); each person with a stake `stake` 30 there (Artatama II in Washukanni,
  Tagi in Magidda, Ilirabih in Gubla, ...); Aziru's house 30 in Gubla (`Leanings1346`); each governor and resident 30 in his
  province. Nobody sees a number.

## Whom it obeys (`obeySeason`, as each season begins, after the people eat)

- **Weight**: force, the men of a power's armies standing in it against its own men of fighting age as they defend their
  land, twice in hill land and half on open plain (`force` 100 for as many men as theirs, at most `forceMost` 200); men
  next door, or before walls they have not stormed (`GameState.breached`), weigh a quarter as much and at most `nearMost`
  50 in all, for every power alike; plus love, his ledger and that of the men serving him there who have not chosen to
  rise against him; less, for the holder, his weakness (`besieged` 20, up to `weakness` 40 as his realm shrinks). A guest
  by sealed passage weighs nothing.
- **Conquest is this rule alone**: moving in takes nothing by itself, and a unit that storms walls breaks in (`stormed`
  event, the walls a level lower, townspeople killed) and stands within them from then on; the province is the taker's
  when the next season's reckoning finds his weight clear of its holder's (or, in land without a ruler, of the floor). A
  siege's surrender is the city's own act, as before (`sieges.ts`). The taker sacks it and takes its archive then.
- **Rivals**: a power with troops standing in it; a man of standing there (`leaders`: the holder's governor there, a chief
  with his band there, a claimant, a town's ruler or a former ruler standing there and not in the holder's service) whose
  weight, his ledger and his band, would clear the holder's. **He chooses** ("Rising" request, `RisingView`,
  `Character.risePlan`): a model by its own judgement, a script by its traits (`wants`: ambition at least 50, and not loyal
  to its holder); a rising he chose breaks out the next season if his weight still clears.
- **It changes hands** to the rival whose weight clears the holder's by `margin` 20 (exactly at it, the seeded dice): to a
  power ("Gubla now answers to Amurru: Amurru's men stand at its gates, and Byblos's hold on it was weak"); to a man, who
  rules it in his own name (`ruleOwn`, how `revolt`), with his band, or, a governor, those of his levies who follow him (the
  armies' ledger, below); or, where the holder's weight is below `floor` -40, to nobody (lawless).
- **Risings are fought** (`risingWins`): where the holder's troops stand, the men who rise (its men of fighting age by how
  far they lean to the leader over the master, `riseLeast` 10 in a hundred at the least; with nobody at their head, by how
  far they hate him) and the leader's band, against the troops and one in `loyalShare` 4 of its men as far as they love
  the master; the loser loses men by `battleLosses`, the dead among them (`BattleData.dead`) and the rest loose; troops
  beaten stay where they stand; a rising beaten halves its leader's standing. A court's own city changes hands only to a
  foe's troops standing within it; a besieged city is the siege's.
- **Degrees** (`GameState.obeyed`, `obeyedIn`): the holder's lead over the best rival or the floor gives a third of the
  yield at nothing and all of it from `full` 60; the tax, the harvest's worth in his strength and the score read it.
- **Unrest**, as governors and spies put it in words, is `threshold` 100 less the lead (`GameState.restless`).
- **The people's resistance** to an army entering (`resistance`, combat) is as hostile as their ledger: 100, plus half
  their standing with the master the mover comes against, less half their standing with the mover, from 0 to 200.

## The armies' ledger (`turn/army-ledger.ts`, `GameState.armies`)

Each unit's men remember what each actor gave and took, fading as the provinces' do: pay (`pay` 3 a season), plunder
shared (`plunder` 5) and victories (`won` 10), to the hand they see (their commander, or the governor of the province a
levy was raised from while it stands there, else their king); pay missed (`unpaid` 6) against the king; hunger (`starved`
6) and defeats (`beaten` 10) against the hand they see. The armies of 1346 start at `held` 40 with their king; a new levy
at nothing. **What follows** (`follows`: 50 in a hundred, plus the leader's standing less the king's): a commander who
refuses his recall keeps only those who follow him (below a band's least he leaves them); a governor who rises or refuses
his recall takes only those of his levies who follow him, and rules the province only if its people would follow him
(`turnsWith`), else turns with those men as a band.

## A handful holds nothing by itself (`turn/battles.ts`)

A move on a unit that the land's people or its ground held out still fights it: when the attack beats the unit's own
strength (its weight and supports, `Fight.own`) by the rout margin (`BattleData.rout` 67), the unit loses by far and is
destroyed, though the attacker does not get in. Script kings fold their remnants (fewer men than a quarter of a full levy)
into a larger unit of their kind next to them that stays put, or disband them in their own land (`bots/remnants.ts`;
`--no-remnant-play`, `--remnant-play-half`). Order `fold` (unit, the province of the troops it joins; every seat): it
marches there and joins them after the season's moves, its men, food, chest and savings with it; not a unit under a
commander or with a hired band.

## The people of 1346 in their posts (`Governors1346`, `Residents1346` in `rules/cast.ts`)

- **Governors** from the first season, as grants (no fee): Thutmose over Kush, Addaya at Hazzatu, Pahanate at Ṣumur,
  Enlil-kidinni at Nippur, Ili-ippashra at Dilmun, Eshuwara over Alashiya's copper hills; invented, the office attested and
  the name lost: Hatti's lords of the watchtower at Tuwanuwa and Samuha, Babylonia's governors at Sippar, Urim and Suhu.
  Heartlands and Kizzuwatna (Telipinu, a prince) stay out. A governorship over land its king no longer holds ends, as before.
- **Commissioners over vassals' lands are characters**, open residents (`Character.openly`: a watcher nobody hunts) in
  Pharaoh's service: Maya at Gazru, Haya in Amurru, Rianap at Ashkelon, Tahmashshi at Magidda, Yanhamu at Gubla, and an
  invented commissioner at Kumidi in Upe. They report home as any watcher does.
- **Town rulers too small for a province** (Tagi of Ginti-kirmil, Endaruta of Akshapa, ...) are characters with their
  purse and a share of the province's love from their stake; their men are their town's following, counted in it.

## The seat view follows what the court knows (`rules/views.ts`)

A court's own provinces in its view (`provinces`, the yields) are those it knows it holds (`knownHolders`): one gained
out of its sight appears once word comes, and one lost out of its sight stays as its officials last reported it
(`GameState.ownLast`, kept by `setOwner` when the court's couriers cannot bring the news within the season) until word of
the loss arrives, as the web map does since #356 and #359 (`src/web/src/map/known.ts`).
