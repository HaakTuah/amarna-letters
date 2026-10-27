## The economy abroad (item 9+b)

Build order item 9+b ("The economy abroad", the second part of 9+): caravans and ships trading at foreign markets they
have passage to, ships carrying cargo with a starting harbour level on every coast, armies spending only where they stand
by leave and foraging and looting where they do not, tolls with a rate for each partner, and smuggling through item 7b's
sneaking check ("Caravans carry a kingdom's goods", "Ships carry goods", "Where gold comes from and where it goes",
"Prices", "Tolls and smuggling"). Save version 15. The report is `docs/rounds/2026-10-27-economy-abroad.md`. Every number
is a first guess (item 18 tunes them), in `TradeData` (`src/engine/src/model/trade.ts`).

### Where a caravan may go

A caravan (`caravan`, and the new `trade`) goes by road or river through land open to it (`TurnEngine.openTo`,
`tradeRoute` in `turn/trade.ts`): its king's own land, a free city's, land without a king, and any king's land unless its
court has heard he closed his roads to it (`roadsHeard`) and he granted it no passage there. This is the reading of "a
foreign market they have passage to": passage is the travellers' rule of items 7b and 9, open unless closed. At each border
into a foreign king's land (`atBorder`): an open caravan whose roads that king has in fact closed (and granted no passage)
is turned back home, and its court learns the closure; otherwise it pays his toll there. A besieged city takes in nothing
by land.

### Trade at a foreign market

`TradeOrder {from, to, grain, gold, sneak}`: grain from a province's stores, gold from the treasury (reserved by the
validator like any spending), to a market not the king's own. On arrival (`tradeAtMarket`) it sells its grain along that
market's curve, from its people's purse, and buys grain with the gold it brought (the proceeds of the sale go home, they do
not buy), then goes home (`caravanHome`): grain into the stores it set out from, gold into the treasury (`income`). Porters
are paid `ceil((grain + gold/10) / caravanPayPer)` a season and eat the load as in 9+a; outlaws' odds count gold at a tenth.
Troops of a king who closed his roads to it take the grain into their baggage and the gold into his treasury. A besieged
market trades with nobody.

### Ships

`harbourOf(province)`: every coastal province has harbour level `harbourStart` 1 (item 15 makes it a built level); inland
and at sea, none. `ShipOrder {fleet, from, to, grain, gold, trade}`: the king's fleet standing in the harbour `from` or in
its waters (`shipFleet`; the model's order names the harbour and the engine finds the fleet) loads up to `shipCapacity`
400 measures there and gold from the treasury, and sails by sea (`shipRoute`: out onto its waters, sea zones only, into
the far harbour) to `to`, where it trades as a caravan does (`trade` true) or hands its grain to its king's troops there
and to the stores if the city is his (`trade` false). The fleet leaves `GameState.units` for the voyage and travels inside
the caravan (`Caravan.ship`): it holds no waters, fights no battle and blockades nothing until it is home, when it takes
its place again in its harbour, or the nearest free waters on its way home (`rejoinFleet`); if all are held, its crew go
home with their savings. Its crew are paid `fleetUpkeep` a season instead of its pay (into its savings while abroad), and
eat `boatEatPercent` of the load a season. At sea the road check is the fleets of a king who closed his roads to it (they
take it, "a loaded ship fights badly", and the fleet is lost) and storms (`RoadOdds.storm` 2, 8 in winter), which sink it
with its cargo. Ships do not smuggle.

**A besieged harbour**: the sea no longer feeds it (`TurnEngine.supplied` is gone): it eats from its market and stores as
any city, and a ship of its king's may unload grain into its stores while no fleet of the besieger holds its waters
(`openToSea`). The wear's slower pace for a city "supplied by sea" (item 7a) stays as it was, reworded: the harbour is
open, men and materials come in.

### Tolls

`TollOrder {province, partner, percent}` (`toll`), standing until changed (`GameState.tolls`, `Toll`): a percent of the
goods entering the holder's land, at most `tollMost` 50, in all his land or one province, on everyone or one partner. The
most particular rate applies (`tollRate`: province and partner, then province, then partner, then all). Goods pay at each
border into a king's land, from a province not his (a ship at his harbour too): grain in kind into that province's stores
(what does not fit is lost), gold into his treasury. A free city and land without a king charge none (city-states set
their own in item 11+). A rate of nothing is kept only as the exception to a wider rate. Each holder reads one notice a
season of what his tolls and seizures brought (`TollsTitle`). Tolls are posted at the borders, so every court sees those
that bear on it and its own (`SeatView.tolls`).

**Trade rights** are the clauses `tollFree` (the writer takes no toll on the reader's goods) and `askTollFree` (asks it of
the reader). Like every clause but passage and basing they oblige nobody: the rate is what the engine charges, so a
promise not kept is a broken tablet ("Exemptions"). `askTollFree` gives something away unless the same tablet carries
`tollFree` (a mutual exemption).

### Smuggling

A `trade` with `sneak` goes off the road through foreign kings' land (the pace's sneaking term, half as long again), may
cross land closed to it, and pays no toll. Each time it enters a foreign king's land (`atBorder`) his people find it with
`smuggleOdds`: `smuggleFound` 20, a point for every `smugglePerMeasures` 10 measures of grain, `smuggleGold` 10 more with
gold, and a third of what he spends on watchmen that season (the road check's policing), at most `RoadOdds.most` 90. A
caravan has no leader, so no skill lowers the odds ("a caravan without a character to lead it has no skill"); caravans with
leaders come with the economy's later phases. Found, its goods are seized (grain into that province's stores, gold into his
treasury; events `smuggler-found`, else `smuggled`).

### Troops abroad by leave, foraging and the sack

`TurnEngine.byLeave(u)`: a unit stands by leave in its king's own land or land whose holder granted it passage or basing
there (`grantCovers`). Its men spend their pay (`spentPercent`) only there, into that province's purse; elsewhere they keep
it all. Abroad by leave its king buys its food at the market where it stands, at the market's ask, from the treasury,
before it eats into its baggage (event `food-bought`); in land without leave it forages as in 9+a. A province taken by
force (stormed, surrendered to a siege, or taken by troops standing in it) is sacked (`sack`): `sackPercent` 33 of its
people's purse goes into the taker's treasury.

### What a king knows of foreign markets

`GameState.marketsSeen` (`MarketSeen`: price, stock, normal stock, purse, the season): each season, after the caravans,
every court learns the markets within half a season's travel of its land (`wordSeasonsShare` 2), by road, river or sea,
and those in the land it sees, as they stand then; a caravan or ship that trades at a market brings home what it found
(`seeMarkets`, `seeMarket`). The reading of "Prices are known where they are and through news". `SeatView.markets`; the
model's view lists the dearest and cheapest it knows (FOREIGN MARKETS) and the tolls on its goods.

### Orders, rulebook and the web app

Orders `trade`, `ship`, `toll` (model actions `trade`, `smuggle`, `ship_trade`, `ship_deliver`, `set_toll`, with a new
`gold` field), validated in `rules/validator.ts`, settled after the moves with the other trades (`sendTraders`); tolls
with the roads at the end of the season. The rulebook's ECONOMY part (`llm/src/rules-economy.ts`) has trading abroad,
ships, tolls, smuggling and loot; the blockade's line in `rules-ground.ts` says the sea no longer feeds a city. The web
app's orders panel has a "Trade abroad" row (caravan, smuggling, ship to trade or deliver, with the prices known) and a
"Toll" row (with the tolls posted); the clause editor has the two trade rights. Events: `trade-out`, `ship-out`,
`traded`, `sale-abroad`, `purchase-abroad`, `toll-set`, `toll-paid`, `smuggled`, `smuggler-found`, `ship-lost`,
`food-bought`, `sack`.

### Script kings (`game/src/bots/trade.ts`)

See "The economy abroad" in `07-script-kings/13-treasury.md`.
