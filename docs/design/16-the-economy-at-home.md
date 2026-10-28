## The economy at home (item 9+a)

Build order item 9+a ("Economy and resources" and the entries it names): grain and gold produced by province, stores,
local markets with one price formula and the people's purse, taxes in goods at the default rate, one treasury, troops'
pay and food with hunger and mutiny, caravans at home under orders, the pace factors for size, load, pack animals and the
slowest part, the siege's clock, and strength as the wealth of the realm. Save version 14. The report is
`docs/rounds/2026-10-27-economy-at-home.md`. Every number is a first guess (item 18 tunes them); they are in
`EconomyData` (`src/engine/src/model/economy.ts`), `PaceData` (`model/travel.ts`) and the per-province table
`ProvinceEconomies`.

### Data

- **Grain** is counted in measures; a measure's base price, and its reference price in the score, is a shekel
  (`basePrice` 100, in hundredths). Prices are kept in hundredths so the formula stays in integer arithmetic.
- **Harvest** a season: `yield × 3`, by the province's surplus from the dossier's grain table (High 120%: Egypt's Nile
  and Babylonia; Fair 100%; Low 80%: the Anatolian plateau and the Lebanon coast; Thin 50%: Sinai, Dilmun, the lands
  without a king). The province's `yield` keeps its meaning as the king's share at the default tax, so the old values
  still describe what a province brings in. Even each season (a harvest season of its own waits for 10+'s land and
  climate).
- **Tax** in grain at the default rate, `taxPercent` 33, into the province's own stores; since item 10+a each king sets
  his own rate by province, and the harvest follows the province's people (`19-people-at-home.md`). A free city's tax goes into its
  own stores; a land without a king collects none.
- **Mines** (gold a season, straight into the holder's treasury; a free city's into its purse): Nubia 70, Thebes 30,
  Tuwanuwa 6, Kizzuwatna 5, Isuwa 4, Mira 2, Enkomi 2. About 120 a season, the dossier's shares (Egypt 84%); the absolute
  scale is a guess chosen to make good what leaves the markets for characters' wages and bought cities (see the report).
- **Local need** a season, also the market's normal stock: `town × 2 + harvest × 15%` (the town's people from dossier 4,
  plus the craftsmen, servants and temple staff of the countryside). **Storage**: `need × 3 + 30`. **Start**: stores at
  half capacity, the market holding a season's need, the purse 20 seasons of need at the base price, twice that in a
  trading city.
- **Treasuries** at the start (`StartGold`): Egypt 900, Babylonia 600, Mitanni 450, Alashiya 400, Hatti, Assyria and
  Arzawa 300 (from 600, 650, 500, 350, 300, 350, 300): Egypt richest, as the letters say; proportions marked [G].

### The season (turn/economy.ts, called from `incomeAndUpkeep` at the start of the season)

1. Harvest and mines (`harvestSeason`): tax into stores (what does not fit is lost), mines into the treasury; then stores
   and markets lose `spoilPercent` 5%. Absorption and catastrophes cut both; a besieged province yields nothing.
2. Towns eat their need from their market (`townsEat`). A besieged city not fed from the sea eats from its market and then
   its stores; one that cannot eat in full is `starving`.
3. Each king pays his troops nearest his capital first (`payTroops`): `armyUpkeep` 20, `fleetUpkeep` 25 (their pay
   only: food is grain), plus `siegeUpkeep` for a besieger. The men spend `spentPercent` 75% where they stand if it is
   their king's land (a fleet: the coast of its waters), into its purse; the rest is the unit's `savings`, which go into
   the purse of its `home` (where it was raised) when it disbands, and are lost if it is destroyed. A unit not paid in
   full counts a season `unpaid`. Then walls' upkeep (into each walled province's purse: builders' pay) and wages.
4. Every unit eats (`feedTroops`, 10 measures): from its king's stores where it stands, refilling its baggage from them
   (up to `carried` 2 seasons); else its baggage; else the land: at home the market's stock (requisition), elsewhere
   `forageShare` 33% of the farmers' share of this season's harvest (half in winter, none in the desert or at sea),
   shared among the troops there. Short: `hungry`. Hungry `hungryMutiny` 2 seasons running, or unpaid `unpaidMutiny`
   3: the unit mutinies and, until bands exist, disbands with its men going home with their savings.
5. Caravans go on (`caravansTravel`): pay `ceil(grain / 10)` a season (spent where they stand at home; unpaid, they
   desert with the grain), advance `travelDays` at their pace, eat `caravanEatPercent` 20% of the load a season on the
   road (`boatEatPercent` 4% by boat), meet the road's check once (foreign troops in a province they reached take the
   grain into their own baggage; outlaws rob one with `caravanOutlawPercent` 1% × (100 + load) / 100), and hand over
   their grain where they arrive (`caravanArrives`): their king's troops there first, emptiest first, then the stores if
   the province is his; what is left goes home again.

### Orders (validated in rules/validator.ts, settled in `settleMarkets` after the levies)

- `sell {province, amount}` and `purchase {province, amount}` at the province's own market (only one's own, never while
  besieged: a foreign market is reached by a trading caravan or ship, item 9+b). A market's trades are netted and the rest priced along the curve, measure by
  measure (`sellAlongCurve`, `buyAlongCurve`); a sale stops when the purse cannot pay the next measure. The price is
  `base × normal / stock` between a quarter and four times the base (the ceiling at a stock of none); the market buys
  `cutPercent` 10% under it and sells 10% over.
- `feed {province, amount}`: stores to the market's stock, for nothing.
- `caravan {from, to, amount}`: from a province's stores through the king's own land (the destination may be foreign land
  his troops stand in), by road or river; from item 9+b through any land open to it, and by sea as a ship.
- The condition `StoresAtLeast` (stores of a province of the seat's at least an amount) lets scheduled orders keep a
  floor, as "Building it" asks.
- The levy's cost goes into the purse of the province where it is raised, and the fortify cost into the walled
  province's purse (the men, smiths and builders are its people). A bought city's price (`cityPrice`, public in the view
  as `cityPrices`) is what it adds: `10 × (harvest at reference + mines) + purse + stores and market`; it leaves the world.

### The pace of a company (model/travel.ts)

`Company` gained `size`, `load`, `capacity`, `animals` and `parts`. `sizeAndLoad`: a percent longer for every 4 men or
measures beyond the first 20 (at most 100% longer), an empty company 80% of a full one's time in proportion to its load,
oxcarts 150% and porters 110% of donkeys; a company of parts goes at its slowest part's pace. A lone traveller leaves
them out, so envoys and spies move as before. Only caravans use them today; an army's size waits for item 13, which
marches armies by distance.

### Sieges

A city falls by hunger (it was `starving` as the season began and the siege still stands) or by a breach, once its wear
reaches `breachPerLevel` 3 for each level of its walls (it was the walls' level until 9+a). Wear still advances as in
item 5 (a step, two with an uncut support, less when the city is supplied by sea). An unblockaded coastal city is fed from
the sea and ate nothing from its stores until item 9+b; since then ships carry its grain (`17-the-economy-abroad.md`). Water inside the
walls is not built: the dossiers give no city's wells, so every city holds as long as its food (reading in the report).
The event `siege-starved` marks a fall by hunger.

### The score

`Strength = provinceWeight (10) × land worth + treasury + holdings` (`rules/scoring.ts`): land worth is the whole
harvest at reference prices plus the mines, as far as it is absorbed (`landWorth`); holdings are the purses, stores and
markets of the realm's provinces at reference prices, and its units' grain and savings and its caravans' grain
(`holdings`), less (until item 11a) the back pay it owed; since item 11a nothing owed is subtracted (`21-money-and-work.md`). The opening lines in the
rulebook (`rules/opening.ts`) compute the same figure from the data.

### The desert

The desert's supply cost of item 5 (`desertUpkeep`, `inDesert`) is gone: the food it stood in for is now real. Desert
land gives nothing to forage, so an army there lives on its baggage, its king's stores and his caravans.

### What a king sees

`SeatView.provinces` (each own province's stores, capacity, tax, need, market stock, purse and price), `caravans`,
`cityPrices`, and each own unit's food, carried, hungry, unpaid and savings; `income` is the gold that came in since the
last orders (mines this season and sales last season). A model king reads it compactly (`llm/src/prompt-economy.ts`):
totals, the provinces with grain in store, the towns short of grain, the dearest and cheapest markets, purses nearly
empty, the troops' grain and the caravans; the rulebook's ECONOMY part is `llm/src/rules-economy.ts`. The web app shows a
province's stores and market in its panel, and has a Grain row in the orders panel.

### Script kings (game/src/bots/grain.ts)

See "Treasury" in `07-script-kings/13-treasury.md`, "The economy at home".
