# Item 9+a: the economy at home (27 October 2026)

Build order item 9+a ("The economy at home", the first part of 9+, "The economy, first phase"): grain and gold produced
by province, stores with their basic capacity, local markets with one price formula and the people's purse, taxes in goods
at the default rate, one treasury, troops' food and pay with hunger and mutiny, caravans at home under orders, the pace
factors for size, load, pack animals and the slowest part, the siege's clock, and strength as the wealth of the realm;
with Haakon's design change of 27 October (#90), sleep for human seats too. Branch `item/economy-at-home`; save version
14. What was built is in `docs/design/16-the-economy-at-home.md` (and the script kings' part in
`docs/design/07-script-kings/13-treasury.md`, "The economy at home"); this report says why, what it cost and what was
found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers: one reviewer, none other.

## The check for changes

Asked at the start (Build order since 61, Land, people and economy since 24, War, travel and the seas since 53, Victory
since 9, Work, money and lending since 11): nothing new. While the item was built Haakon merged #90-#92 into `develop`
(sleep for every seat, shadow scripts, the first model games): the one that touches this item is #90, which adds to 9+a
"sleep for human seats, as an automatic end of turn when nothing concerns them, woken by the same triggers as model seats
and able to wake themselves at any time". It is built (below). Asked again before the pull request (Build order since 64,
Engine and models since 55, and the tabs above): nothing newer than the copy.

## The audit at the start

Seeds 1-50 from a clean copy of `develop`: the same figures as item 9's after-numbers, signal for signal (capitals fell
in 38 games; Egypt 27 wins). No feature built so far went unused but the one item 9 found (no spy posted to watch a
province, item 9's reading 10). Nothing to patch.

## What was built

- **Grain and gold by province.** Each province's whole harvest a season is three times its yield, by the surplus the
  dossier gives its land (the Nile and Babylonia 120%, the Anatolian plateau and the Lebanon coast 80%, desert and steppe
  50%); a third goes into its own stores as the tax in grain. Gold comes only from the mines, where the dossier puts them
  (Nubia, Thebes, Hatti's silver at Tuwanuwa, Kizzuwatna and Isuwa, a little in Mira and Enkomi), straight into the
  holder's treasury. A province's `yield` keeps meaning what it brings its king a season, so the old values still read.
- **Stores** hold three seasons of local need and a modest depot; what does not fit is lost; stores and markets spoil a
  twentieth a season. They fall with the province.
- **Markets and the people's purse.** Each province's market holds a stock of grain and its people's gold; its price is
  the one formula of "Prices" (base × normal stock ÷ stock, between a quarter and four times the base), in hundredths of a
  shekel; it buys 10% under and sells 10% over. Lots are priced measure by measure; a market's trades are settled
  together, and it buys only while its purse lasts. Each season the town and the non-farming countryside eat their need
  from it. The purse fills only with what is paid in: soldiers' pay spent there, porters' pay, the levy's and the
  builders' pay, and savings brought home.
- **Orders**: `sell_grain` and `buy_grain` at one's own market, `feed_town` (stores to the market for nothing),
  `caravan` (from a province's stores through one's own land to another province or to one's troops there), and the
  condition `stores_at_least`, so scheduled orders can keep a floor as "Building it" asks. In the rulebook (ECONOMY), the
  model schemas and parser, the web app's orders panel and province card.
- **Troops' pay and food.** Pay 20 a season an army, 25 a fleet (their old upkeep less their food), nearest the capital
  first; 75% spent where they stand in their king's own land, the rest saved and carried home. Food, ten measures: the
  stores where they stand (and the baggage refilled from them, two seasons at most), then the baggage, then the land (at
  home the town's market; elsewhere a third of the farmers' share of the harvest, half in winter, none in the desert or at
  sea). Two seasons hungry, or three unpaid, and the unit mutinies and disbands, its men going home with their savings.
- **Caravans**: their porters are paid and eat from the load (a fifth a season overland, little by boat); a big caravan is
  slower (the pace's size and load terms) and draws outlaws more readily; foreign troops in a province it reaches take it.
- **The pace of a company**: size, load against capacity, pack animals and the slowest part, in `legPoints`; neutral for
  a lone traveller, so envoys and spies move as before.
- **The siege's clock**: a besieged city eats from its market and stores (unless the sea feeds it) and surrenders when it
  cannot feed its people; the walls are breached only after three seasons of wear a level. A besieger forages the fields
  outside the walls.
- **The wealth of a realm**: 10 × the land's whole harvest and mines at reference prices + treasury + its provinces'
  purses, stores and markets + what its men carry. Back pay owed still counts against it, until item 11a, as "Scoring" says. A free city's price is what it
  adds, and it leaves the world.
- **Starting positions from the sources**: towns from dossier 4 (purses, need, storage), mines from dossier 5, and the
  treasuries in the proportions the letters give (Egypt richest).
- **Human seats may sleep** (#90): the orders panel seals the orders awake or "with a sleep until something concerns me";
  a sleeping human is woken by the same triggers as any seat, or by "Wake now", which the runner reads once a season and
  logs as a decision, so a replay wakes him the same.
- **The desert's supply cost of item 5 is gone**: the food it stood in for is real now (the desert feeds nobody).

## Script kings

They sell their surplus at each market while it pays about what the grain is worth (a little under the reference price,
since grain kept spoils), lower when they need gold, and at any price for what the next tax would push out of the stores;
keep two seasons of food for the troops each store feeds and a two-season depot on the frontier where their armies stand;
send caravans to their armies beyond their land whose baggage will not last, and to frontier depots running short; hand
their towns what would still be lost; and reckon their cash flow from what the markets can go on paying. The frozen
baseline was adapted only as the rules required: it sells everything every season and sends no caravans.

How often each feature was used and how often it succeeded, seeds 1-50 (every king a script king):

| Feature | Used | Succeeded / what came of it |
|---|---|---|
| Sales at one's own markets | 79,864 sales in 50 games | every one priced along the curve; a sale the purse could not cover in full is cut short |
| Caravans | 5,427 sent | 4,929 arrived; 214 taken by a hostile king's troops, 84 robbed by outlaws, 53 deserted unpaid |
| Feeding a town | 45,178 times | grain that would have been lost for want of room, to towns short of grain |
| Buying grain | 1 | see reading 7: at home it is rarely worth it |
| Foraging | 2,086 seasons a king's troops took from the land | |
| Hunger and mutiny | 471 hungry seasons, 185 mutinies (153 seasons unpaid) | mostly armies deep in foreign land beyond their caravans' two-season reach |
| The siege's clock | 1,126 sieges begun, 632 won | 350 of them by hunger, the rest by breach or storm |

**Using the feature against playing it plainly** (`--plain-economy-half`, the same 50 seeds, half the kings on each side):
those that play the economy well grow 1.02 against 0.94 for those that sell everything every season and send no
caravans, and win 23 games to 27. So the careful play grows more but does not win more. Every side plays the economy
(grain must be sold to pay troops), so this measures the depots, caravans and pricing, not the economy itself. Its first
version lost (1.00 against 0.98, 20 wins to 30): kings rich in gold held their grain for more than its reference price
while it spoiled, and kept three-season depots, so the threshold was lowered to 0.9 of the base price and the depots to
two seasons, which gave 1.07 against 0.96 and 25 to 25 before the review's fixes, 1.02 against 0.94 and 23 to 27 after.
The rest of the gap is the plain side's gold in hand sooner: selling everything at once buys troops and cities a
season or two earlier. Left as found; the script's pricing is in its design note.

## Benchmarks and script games

**Before** (item 9's after-numbers, the same code as `develop`, confirmed signal for signal by the audit): seeds 1-50
with every king a script king, and `--versus solo`, 40 seeds, 9.73 growth alone and 1.27 as baseline over all, 91% and
14% of wins.

**After**, the same seeds (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): 50 of 50 replay exactly.

| | Before 9+a | After 9+a |
|---|---|---|
| Capitals fell (games; kingdoms) | 38; 69 | 38; 54 |
| First fall, median season | 19 | 20 |
| Entry to fall, median seasons | 15 | 20 |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 27, 11, 5, 4, 3, 0, 0 | 2, 9, 18, 8, 2, 11, 0 |
| Mean growth (same order) | 4.98, 4.03, 2.82, 2.56, 1.00, 0.67, 2.83 | 1.19, 1.01, 1.39, 0.80, 0.38, 1.17, 0.84 |
| Tablets sealed; detentions | 1788; 404 | 1401; 335 |
| Sieges begun / won | 979 / 788 | 1126 / 632 |
| Gold to characters (50 games) | 472,561 | 418,481 |

`--versus solo`, 40 seeds (one current king against six baselines): 2.12 growth alone and 0.99 as baseline over all,
60% and 14% of wins. By power, alone / as baseline: Egypt 1.42 / 1.13, Hatti 2.71 / 0.81, Babylonia 1.84 / 0.98,
Mitanni 1.58 / 1.21, Assyria 3.78 / 0.90, Arzawa 2.67 / 1.17, Alashiya 0.82 / 0.72 (9.73 and 1.27, 91% and 14%, before).

What moved, and why:

- **Growth figures are much smaller.** Strength now counts the purses, stores and markets, which are large and grow
  little, and gold no longer piles up in a treasury from the land's yield: it circulates, coming back to a king only as
  far as he spends it at home. So the same conquests are a smaller share of strength. The win counts are what compare.
- **Egypt wins far less, Babylonia and Arzawa more** (2, 18 and 11 wins, from 27, 5 and 0): Egypt grew by hoarding its
  yield (its treasury held over 7,000 shekels by season 37 on seed 1); now its hoard counts no more than its people's gold
  (reading 9). Arzawa, poor in gold, loses less to the change than the gold-rich kings.
- **Wars are a little slower and starve more often**: the median from the conqueror's entry to a capital's fall went from
  15 to 20 seasons, and more sieges are begun but fewer won (hunger is the clock, the breach slow). Pillar 8 ("War is
  slower than diplomacy") is the balance pass's to judge.
- **The current bot alone beats the baseline less often** (60% of wins, from 91%): the baseline's plain economy, which it
  needed to pay its troops at all, is nearly as good as the careful one (above), and the smaller growth figures compress
  the margins. The baseline was adapted only as the rules required (it sells everything each season).

## Readings taken and design questions

Each is the reading taken, with its alternative; the first ten are also in the progress file's "For Haakon" table.

1. **The mines' scale.** The dossier gives only shares, so the absolute output is a guess: about 120 shekels a season over
   the map (Egypt 84%), enough to make good the gold that leaves the markets for characters' wages (about 200 a season
   over the map in the script games) and bought cities. With the first guess of 53 kings ran dry within ten seasons and
   disbanded their armies. Alternative: smaller mines and scarcer gold.
2. **Local need counts the countryside.** A market's need is its town's (dossier 4) plus 15% of the province's harvest
   for the craftsmen, servants and temple staff who grow none of their own. With towns alone, Hatti's and Alashiya's
   markets could take a third and a tenth of their tax, prices sat at the floor and most grain was unsellable.
   Alternative: towns only.
3. **Deep purses.** A purse starts at 20 seasons of its need at the base price (40 in a trading city), since the sources
   give no sums and thinner purses drained kings within a few seasons. Purses count in strength, so growth figures are
   smaller than before. Alternative: thinner purses and scarcer gold.
4. **Walls price the storm.** Wear breaches walls after three seasons a level (until 9+a, one), so hunger is usually the
   clock: 350 of 632 sieges won ended in starvation. Alternative: no breach at all, a city falling only to hunger or a storm.
5. **A mutiny's savings go home.** Until bands exist a mutinous unit disbands and its men go home, so their savings reach
   their home purse, and a mutiny costs no score. Alternative (the reviewer's reading of "carried off if he deserts"):
   the savings are lost, so starving or unpaid troops cost score.
6. **One harvest a season.** The harvest is the same every season until 10+'s land and climate give it its season.
   Alternative: one harvest a year now, in its region's season.
7. **Buying grain at home is rarely worth it.** At home an army takes from the town's market for nothing when its stores
   are empty, and the town eats its market down before orders are given; so script kings bought grain once in 50 games,
   to stock a depot whose market held a season's need. Its real use is abroad (9+b). Alternative: make requisition at home
   cost something now (it will, with 10+'s hunger).
8. **No wells yet.** The dossiers name no city's water, so every city holds as long as its food. Alternative: a short
   history pass naming the cities with springs, cisterns or shafts.
9. **Egypt wins much less** (2 of 50 games, from 27): its gold hoard no longer counts for more than the same gold in its
   people's purses, as "The wealth of a realm" intends, and Babylonia (18, from 5) and Arzawa (11, from 0) gain. Left for item 18.
   Alternative: read it as a sign that the treasuries or the mines are off, and change them now.
10. **Human sleep.** A human seals his orders awake (the old way) or with a sleep; a sleeping human is woken by every
    trigger, by the hidden cap, or by "Wake now". Alternative: sleep after every turn by default, waking only on triggers.

Other readings, not questions:

- Soldiers spend their pay only in their own king's land in 9+a and save the rest abroad; spending in land by leave comes
  with 9+b, so no rule here is a stand-in.
- A coastal city whose waters its besieger's fleet does not hold is fed from the sea (item 7a's built rule): its town eats
  from its market, never its stores, until ships carry cargo in 9+b; its garrison still eats from its stores.
- A free city's tax goes into its own stores and its mines' gold into its purse; nobody sells for it until city-states are
  powers (11+). Its stores and purse are a prize for whoever takes or buys it.
- Back pay still counts against strength, as "Scoring" under Victory says, until item 11a ("What is owed counts neither
  way" then).
- The pace's oxcarts, porters and parts (the slowest part) are in the one pace function, but nothing chooses them yet: a
  caravan is donkeys, its size its load; armies march a province a season until item 13 marches them by distance.
- The view's `income` is now the gold that came in since the last orders (mines and sales); the script kings' court and
  letters still read it as income, which shifts their gifts a little.

## First guesses (item 18 tunes them)

All of `EconomyData` and `PaceData` and the per-province table: harvest 3 × yield by surplus (120/100/80/50%), tax 33%,
need 2 a thousand townspeople + 15% of the harvest, storage 3 × need + 30, stores half full and purses 20 seasons of need
(40 in a trading city) at the start, spoiling 5%, cut 10%, food 10 a unit, baggage 2 seasons, 75% of pay spent at home,
foraging a third of the farmers' share (half in winter), mutiny after 2 seasons hungry or 3 unpaid, caravans eating 20% a
season overland and 4% by boat and paid a shekel for ten measures, outlaws 1% × (100 + load)/100, breach after 3 seasons a
level, mines about 120 shekels a season, the treasuries; the scripts' own thresholds in their design note.

## The review

One reviewer (the diff and the item's text, model Opus at high effort) found three blocking issues and nine others:

- Blocking, fixed: any foreign unit took a caravan with certainty, a guest or a king granted basing included (now only a
  king who closed his roads to the caravan's king and has no passage there, with the road check's odds of 40 in 100, as
  for any traveller); back pay had been dropped from strength, though "Scoring" under Victory keeps it until item 11a (now
  subtracted again, true back pay in the score, believed back pay in the seat's view, and the rulebook says so); the map's
  tooltip still told of the desert's old supply cost (now "it feeds no army").
- Fixed: the rulebook said a city fed from the sea eats nothing from its stores (its town does not; its garrison does: now
  said so); a caravan's grain with nowhere to go was said to be "sold off for nothing" (it is lost); a human's "Wake now"
  pressed in a season he was woken anyway stayed set (now cleared when he is asked); two doc comments in `sleep.ts` were
  out of place.
- Not changed, with the reason: a mutiny's savings going home (reading 5, a question for Haakon); the pace's oxcarts,
  porters and parts that nothing chooses yet, and a caravan's load always near its capacity (in "Other readings");
  the validator reserving a purchase's full cost where the engine would buy as far as the gold goes (a refused order is
  told, and the script kings buy within their gold); the court's and letters' reading of `income` (in "Other readings");
  a rival's estimated strength leaving out its troops' baggage (a few dozen shekels in thousands).

## Left for later

- `src/llm/src/rules.ts` (50.9 KB) and `src/web/src/components/OrdersPanel.tsx` (53.6 KB) grew past the 50 KB guideline
  with this item's rules and grain row; each is to be split by responsibility in a pull request of its own, with
  behaviour unchanged.
- The script kings' armies deep in foreign land still go hungry beyond their caravans' reach (185 mutinies in 50 games);
  marching by distance (item 13) and buying abroad by leave (9+b) give them the means to do better.
