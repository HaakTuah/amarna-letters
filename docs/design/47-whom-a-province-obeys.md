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
  a level), a harvest left to people who ate their fill (`harvest` 2), a tax below the usual, a governor's rule (`rule` 3, to
  him). What the holder gives counts less the farther his court (`far` 15 in a hundred a season of road beyond the first,
  at most `farMost` 60), except through his governor there.
- **The hand they see** (`handOf`): where a governor of the holder governs, the tax, levies and hunger are his, and the
  harvest left them is his credit; the troops and works stay the king's.
- **Memory fades**: every entry a tenth nearer nothing a season, at least a point (`fade` 10).
- **It starts as 1346 stood** (`openingLoyalties` in `rules/factory.ts`): a king in a province whose people's chief tongue
  is his court's `home` 100, elsewhere `held` 40 (Gaza, Ṣumur, the Ways of Horus and Kush for Egypt; Kizzuwatna, Nesa and
  Tuwanuwa for Hatti; Dilmun and Suhu for Babylonia); each person with a stake `stake` 30 there (Artatama II in Washukanni,
  Tagi in Magidda, Ilirabih in Gubla, ...); Aziru's house 30 in Gubla (`Leanings1346`); each governor and resident 30 in his
  province. Nobody sees a number.

## Whom it obeys (`obeySeason`, each season after the people eat)

- **Weight**: force, the men of a power's armies standing in it against its own men of fighting age (`force` 100 for a tenth
  of them, at most `forceMost` 200), and for its holder a quarter of his men next door; plus love, his ledger and that of
  the men serving him there who do not want it themselves; less, for the holder, his weakness (`besieged` 20, up to
  `weakness` 40 as his realm shrinks). A guest by sealed passage weighs nothing.
- **Rivals**: a power with troops standing in it; a character who wants it (`wantsIt`: a disloyal, ambitious governor, a
  chief with his band, a man of standing among its people or a former ruler, standing there) by his ledger and his band.
- **It changes hands** to the rival whose weight clears the holder's by `margin` 20 (exactly at it, the seeded dice): to a
  power ("Gubla now answers to Amurru: Amurru's men stand at its gates, and Byblos's hold on it was weak"); to a man, who
  rules it in his own name (`ruleOwn`, how `revolt`; a governor's levies go with him and weigh nothing against him), his
  people's regard becoming his realm's; or, where the holder's weight is below `floor` -40 and none of his troops stand in
  it, to nobody (lawless). A rising where the holder's troops stand is put down if their force is at least the leader's
  standing (some die, his standing halves); else they are overwhelmed (half killed, the rest loose, their savings the
  people's). A court's own city changes hands only to a foe's troops standing in it; a besieged city is the siege's.
- **Degrees** (`GameState.obeyed`, `obeyedIn`): the holder's lead over the best rival or the floor gives a third of the
  yield at nothing and all of it from `full` 60; the tax, the harvest's worth in his strength and the score read it. This
  replaces slow absorption (item 5) and item 17's unrest stocks.
- **Unrest**, as governors and spies put it in words, is `threshold` 100 less the lead (`GameState.restless`).
- **Conquest on entry stands** (`updateOwnership`): an army that beat its way in past the old master's troops and the land's
  own men has tipped it by force; the season rule decides from then on whether it holds.

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
