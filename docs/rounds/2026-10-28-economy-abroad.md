# Item 9+b: the economy abroad (27–28 October 2026)

Build order item 9+b ("The economy abroad", the second part of 9+, "The economy, first phase"): caravans and ships
trading at foreign markets they have passage to; ships carrying cargo, with a starting harbour level on every coast;
armies spending only where they stand by leave, and foraging and looting where they do not; tolls with a rate for each
partner; and smuggling through item 7b's sneaking check. Branch `item/economy-abroad`; save version 15. What was built is
in `docs/design/17-the-economy-abroad.md` (the script kings' part in `docs/design/07-script-kings/13-treasury.md`, "The
economy abroad"); this report says why, what it cost and what was found. Weekly usage: unknown (this session cannot
read it). Effort: medium, as asked. Helpers: one reviewer, none other.

## The check for changes

Asked at the start (Build order since 64, Land, people and economy since 24, War, travel and the seas since 53,
Diplomacy and intelligence since 23): nothing new. Haakon had not answered the questions of items 8, 9 or 9+a in
`docs/BUILD-PROGRESS.md`, so their readings stand. Asked again before the pull request (Build order, Land, people and economy, War, travel and the seas, Victory): nothing newer than the copy.

## The audit at the start

Seeds 1-50 from a clean copy of `develop`, every king a script king, and `--versus solo` (40 seeds): the same figures as
item 9+a's after-numbers, signal for signal and to the hundredth (2.12 growth alone, 0.99 as baseline, 60% and 14% of
wins). No feature built so far went unused but the one item 9 found (no spy posted to watch a province, item 9's reading
7). Nothing to patch.

## What was built

- **Caravans abroad.** A caravan goes through any land open to it: its king's, a free city's, land without a king, and a
  king's land unless its court has heard he closed his roads to it (a passage grant keeps it open). At the border of a
  king who has in fact closed them it is turned back and goes home round that land. The new `trade` order sends grain
  from a province's stores and gold from the treasury to a foreign market, where it sells its grain along that market's
  curve and buys grain with the gold, and brings the proceeds home.
- **Ships.** Every coast has a harbour (level 1). The `ship` order puts a fleet standing in a harbour of its king's, or its
  waters, into cargo service: up to 400 measures and gold, by sea to another harbour, to trade there or to deliver grain to
  its king's troops and stores; it is out of the war until it is home. Storms and the fleets of a king who closed his roads
  to it may take it at sea, fleet and cargo.
- **The sea no longer feeds a besieged harbour** (item 7a's built rule, kept by 9+a "until ships carry cargo in 9+b"): it
  eats from its market and stores as any city, and its king's ships may unload grain into it while its waters are open.
  The wear's slower pace for a city open to the sea stays.
- **Tolls**, standing until changed (`toll`): a percent of the goods entering a king's land (at most 50), on everyone or one
  partner, in all his land or one province; the most particular rate applies, a partner's before a province's. Grain is
  taken in kind into that province's stores, gold into his treasury, at each border.
- **Trade rights**: the clauses `tollFree` and `askTollFree` (free passage for a partner's goods), which item 9 deferred
  here (its question 3). Words, like every clause but passage and basing: the rate is what is charged.
- **Smuggling**: a `trade` that sneaks goes off the road, through closed land too, pays no toll, and at each border into a
  king's land is found with 20 in a hundred, a point for every 10 measures, 10 more with gold and a third of his watchmen's
  spend; found, its goods are seized.
- **By leave**: troops spend their pay only in their king's land or land granted to them by passage or basing (into that
  province's purse); abroad by leave their king buys their food at the market where they stand. A province taken by force
  is sacked: its taker carries off a third of its people's purse.
- **Foreign prices**: each court knows the markets within half a season's travel of its land, and those it sees, as they
  stand when the season begins; a trader brings home what it found. In the view (`markets`, `tolls`), the model's
  FOREIGN MARKETS line, the web app's trade row.
- **The rulebook, the model's orders and the web app**: ECONOMY gains trading abroad, ships, tolls, smuggling and loot; the
  model's actions `trade`, `smuggle`, `ship_trade`, `ship_deliver`, `set_toll` and a `gold` field; the orders panel a
  "Trade abroad" row and a "Toll" row; the clause editor the two trade rights.

## Script kings

They weigh, for each province with grain to spare, every foreign market they know by open caravan, by smuggler and by an
idle fleet, counting the tolls posted on the way, what the porters eat, the risk of a storm or of being found, and the
grain sent at its reference price (a sale at home only moves their own people's gold into the treasury, where a sale
abroad brings in another realm's), and send the best venture that clears a margin set by their commerce; they send gold
to buy where their town is short or its grain dear; ship grain first to a besieged harbour of theirs whose waters are open;
move an idle fleet to a harbour with grain to carry; set a toll of 10 to 20 in a hundred by greed, none for allies and for
partners they promised free passage; and write free passage both ways into the peace and alliance tablets they propose
where tolls stand between them, which a script king seals since a mutual exemption gives nothing away. The frozen
baseline trades nothing abroad and sets no tolls (no rule requires it to).

What testing found and patched (each before the benchmarks below):

- **Kings knew no foreign market but those in sight**, so the island of Alashiya knew none and could not trade at all.
  "Prices are known where they are and through news" now gives every court the markets within half a season's travel
  (reading 4).
- **A market seen empty told nothing of its size**, so every foreign sale was misjudged: the view now carries each
  market's normal stock (a season of its town's need).
- **Ships never sailed**: the military plan's hold for an idle fleet was listed first, so the ship order was refused as a
  second order for the unit; and ventures were judged against what grain would fetch at the king's own market, which
  makes trade look worthless while every market sits at its ceiling. Fixed: the hold gives way to the voyage, grain is
  valued at its reference price, and an idle fleet's voyage clears a lower bar (it is paid the same at war or at sea).

How often each feature was used and how often it succeeded, seeds 1-50 (every king a script king):

| Feature | Used | Succeeded / what came of it |
|---|---|---|
| Trading caravans | 9,394 sent | 7,855 traded at their market (6,304 sales, 1,695 purchases); the rest taken, robbed, turned back or deserted |
| Ships in cargo service | 811 voyages | 62 lost to storms or enemy fleets |
| Tolls | 956 set | 2,477 tolls paid at borders |
| Smuggling | 635 border crossings | 460 slipped through, 175 found and seized |
| Trade rights | 7 to 10 tablets with free passage proposed a game, nearly all sealed (seeds 1-3, 30 seasons) | kept: script kings set no toll for those partners |
| The sack | 1,762 | a third of the purse to the taker each time |
| Food bought abroad by leave | 0 | see reading 8: the host's market is empty when troops eat |

**Using the feature against ignoring it** (`--trade-play-half`, the same 50 seeds, half the kings on each side): those
that trade abroad, ship and set tolls grow 1.08 against 0.97 and win 32 games to 18. Every power but Assyria and
Alashiya grows more using it. Before the patches above the margin was 1.04 against 0.97 and 27 to 23.

## Benchmarks and script games

**Before** (the audit: item 9+a's after-numbers) and **after**, seeds 1-50, `scripts/sim.sh --games 50 --seed 1
--verify-replay`: 50 of 50 replay exactly.

| | Before 9+b | After 9+b |
|---|---|---|
| Capitals fell (games; kingdoms) | 38; 54 | 38; 67 |
| First fall, median season | 20 | 19.5 |
| Entry to fall, median seasons | 20 | 19.5 |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 2, 9, 18, 8, 2, 11, 0 | 0, 8, 6, 23, 2, 11, 0 |
| Mean growth (same order) | 1.19, 1.01, 1.39, 0.80, 0.38, 1.17, 0.84 | 1.12, 0.88, 1.38, 1.36, 0.45, 0.99, 0.92 |
| Tablets sealed; detentions | 1401; 335 | 1505; 417 |
| Sieges begun / won (by hunger) | 1126 / 632 (350) | 1211 / 771 (467) |
| Caravans lost unpaid | 53 | 80 |

`--versus solo`, 40 seeds (one current king against six baselines): 2.57 growth alone and 1.00 as baseline over all, 68%
and 14% of wins (2.12, 0.99, 60% and 14% before). By power, alone / as baseline: Egypt 1.48 / 1.20, Hatti 3.61 / 0.68,
Babylonia 2.04 / 1.00, Mitanni 3.14 / 1.21, Assyria 4.38 / 0.95, Arzawa 2.51 / 1.28, Alashiya 0.83 / 0.71.

What moved, and why:

- **Mitanni wins far more** (23, from 8), Babylonia less (6, from 18): Mitanni sits between Hatti, Assyria, Babylonia and
  the Levant, so its markets are within reach of most realms and goods cross its borders, and its purses fill from both;
  the sack also pays the conqueror of rich cities at once. Reading 10.
- **More sieges won, more by hunger**: a besieged harbour is no longer fed by the sea for nothing (reading 3), and the sack
  gives a conqueror gold to keep his armies paid.
- **The current bot beats the baseline more often alone** (68% of wins, from 60%): trade abroad is a real edge the frozen
  baseline does not have.

## Readings taken and design questions

Each is the reading taken, with its alternative; they are also in the progress file's "For Haakon" table.

1. **Passage for trade is the travellers' rule.** Caravans trade at any market whose roads are open to them (no closure
   heard, or a passage grant), as envoys travel. Alternative: a caravan needs a passage tablet to enter a king's land.
2. **Smuggling without leaders.** "A caravan without a character to lead it has no skill, so it pays or is stopped": read
   as a caravan smuggling at full odds, with no skill to lower them (about one in four found at each border for a small
   load); leaders come with the economy's later phases. Alternative: no smuggling until caravans have leaders.
3. **The sea feeds no one for nothing.** A besieged harbour eats its stores like any city; only its king's ships bring it
   grain while its waters are open (9+a's note foresaw this). Alternative: keep item 7a's free feeding by sea.
4. **Prices by word within half a season.** Each court knows every foreign market within half a season's travel (on this
   map, most of its region) as it stood when the season began. Alternative: only markets in sight or traded at, or a
   longer reach with the price as it stood seasons ago.
5. **The sack.** A third of the purse of any province taken by force goes to the taker's treasury. Alternative: a smaller
   share, or into the soldiers' savings, or only cities taken by storm or siege.
6. **Tolls are posted.** Every court sees the tolls that bear on it. Alternative: learned only by paying them.
7. **Trade rights are words.** Sealing free passage changes no rate; the engine charges what the king sets, and script
   kings keep their promises. Alternative: the engine sets the rate to nothing when the tablet is sealed.
8. **Food bought abroad never happens.** Troops by leave buy at the host's market, but its town has eaten it empty before
   troops eat, so in 50 games none was bought. Alternative: troops buy before the town eats (the host's town then goes
   short).
9. **A partner's rate beats a province's.** A rate set for one partner holds in all the land, so a promise of free passage
   is kept by one order. Alternative: the province's rate first.
10. **Mitanni now wins 23 of 50** (Egypt none): leave it to item 18. Alternative: look at tolls, the sack or the reach of
    prices now.
11. **A fleet in cargo service leaves the war wholly**: it holds no waters and blockades nothing until it is home.
    Alternative: a loaded fleet still holds its waters, fighting badly.

Other readings, not questions:

- A free city and land without a king charge no toll until city-states are powers (item 11+).
- A ship's crew is paid a fleet's pay, into its savings while at sea; it eats from the cargo at the boat's rate.
- The porters' pay counts the gold they carry (a shekel a season for every hundred), and is spent where they stand in land
  open to them; a smuggler's goes home at once.
- One harbour level everywhere does nothing yet but let ships load and unload; item 15 builds harbours.

## First guesses (item 18 tunes them)

`TradeData`: ship capacity 400, tolls at most 50, smuggling's base 20 + 1 per 10 measures + 10 with gold, the sack 33%,
harbour level 1, prices known within half a season. The scripts' own: at most three trading caravans abroad, lots of 100
(50 smuggling), markets trusted six seasons, ventures at most three seasons away, gold sent at most 150, a venture's bar
of 15 shekels and `0.25 − 0.15 × commerce` of its worth (a ship's 5 and half that), tolls of `10 + 10 × greed`.

## The review

One reviewer (Opus, high effort) read the diff and the item's text. One blocking finding: porters' pay outside their
king's land left the treasury and went nowhere (gold destroyed); fixed, it is spent where they stand. Fixed besides: a
caravan turned back on its way home was lost with its proceeds (it now finds a way round), a besieged city took in grain
from a caravan coming home by land, the ship order marked the harbour rather than the fleet as ordered and accepted
fleets anywhere, and a partner's rate of nothing could be dropped by the order of a season's toll orders. Left as found,
and noted here: trades on arrival and food bought abroad are settled caravan by caravan, not netted together at each
market as "Prices" says for the season's orders; two caravans at one market in a season get slightly different prices.
The two design questions it raised (smuggling without leaders, the sea's feeding) are readings 2 and 3.

## Tests

New: `src/engine/test/trade.test.ts` (a caravan trading at a free city's market, tolls and their ranking, smuggling over
twelve seeds, a caravan turned back, a fleet in cargo service coming home, troops by leave and without, the sack). Changed
because the play changed, not the rules they test: model-reply fixtures gained the `gold` field; the sack's loot in the
purchase test; two sleep tests now also list "a caravan of yours was lost" (the stand-in's trading caravan, which wakes a
king as any lost caravan does; a ship sunk or smugglers seized now wake one too); the 6c audience tests play seed 2, since
on seed 3 the script armies now wake the model kings every season; the map test lets a fleet back from cargo service give
an order from where the last frame did not show it; and the runner's five replayed games have five minutes, not two.

## Left for later

- Netting arrivals at a market together (above).
- Caravans with leaders (skill against the smuggling odds, a bargain over a toll, the chance he steals it): the economy's
  later phases.
- Harbours as a built level, policing as a built level: item 15.
