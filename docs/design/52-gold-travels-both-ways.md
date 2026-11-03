## Gold travels both ways (follow-up, #587)

From "One treasury, many stores" under Land, people and economy (revision 35; the owner, 3 November 2026: "Contracts
with characters can stipulate one pay upfront and one after. Paying infrastructure work would presumably require pay or
labour as tax upfront, no?", then "Yes, expertly"). What is done far off is paid only from gold that is there, never from
the treasury at a distance, so the treasury never shows a far outcome before word of it could come. Code:
`turn/coffers.ts`, `model/coffers.ts`; the script kings' part in `game/src/bots/coffers.ts`. Save version 58.

### Far and near

A province is **far** for its king when it lies beyond the season's reach of his court (`TurnEngine.isFar`: the couriers'
seasons, `wordTo`, at least one): the same line that decides which orders wait for their word and which provinces the
court knows by report. Near, nothing changes: the treasury pays at once and receives at once.

### The coffer

Each far province of a king's may keep his gold there (`GameState.coffers`: province, power, gold, owed).

- **In:** the gold of its mines and its sales at its market (until now sent home each season as a load), gold taken there
  (tolls, a caravan seized by his troops: `TurnEngine.credit`), the pay a caravan did not need when its road ends there,
  and gold sent with the couriers (below).
- **Out:** its works paid in gold (upkeep and projects), grain bought at its market, a levy's price, the pay of his
  troops standing there, and the gold and porters' pay of a caravan or ship setting out from there.
- **Debt first:** gold reaching a coffer pays what the province is owed before anything can spend it.
- **As the season ends** (`coffersSettle`, after the markets): the coffer keeps what its works in gold and the troops there cost a season, times the seasons word takes to the court plus one
  (until word could go and come back), and sends the rest home as a load (`lootHome`), as the province's gold always went.
  A province near again hands its coffer to the treasury, which pays what is still owed there. A besieged province sends
  nothing out.
- **It falls with its province:** the new holder takes the gold (into his own coffer or treasury, by the same rule); the
  debt dies with the old holder's rule. Land nobody holds keeps it in its people's purse.

### Credit and bills

What the coffer lacks for works, a levy or troops' pay is done on credit (`payFar`), and the pay of troops far off in
another king's land always is, since no coffer of his is there. One bill per province and season (`GameState.bills`:
works and levies, and each unit's pay) is due at court when word of that season could reach it, and is paid then from the
treasury (`goldArrives`, as the season's economy begins, before the troops are paid), the troops' pay first. The people
of the province are paid when the bill is; the troops' pay goes into their packs then.

- **A bill the treasury cannot pay in full:** each unit it does not cover counts a season of missing pay; what it owes
  for works and levies is owed to the province's people (`Coffer.owed`), and nothing more is done there on credit until
  the coffer has paid it: works paid in gold stop and go unkept, a levy fails, and troops standing there go unpaid. The
  coffer pays its debt first from whatever gold comes to it.
- **No road for word:** no credit is given, since no bill could come home.

### Gold sent ahead (order send)

`send` (a province of the king's and the shekels; the rulebook's `send_gold`) is given at court: the gold leaves the
treasury now and travels with the couriers (`GameState.sent`), reaching the coffer when word would. If the province is
lost or besieged by then, the couriers bring it back, as long again. A province within the season's reach refuses it
(the treasury pays there at once). The seat view lists the gold on its way (`SeatView.goldSent`); the gold coming back it
learns of when it arrives.

### Caravans carry their pay

Every caravan and ship carries its porters' (its crew's) pay for its road (`Caravan.pay`), loaded where it sets out from
the gold that is there: a season's pay for each season of its road at the pace it sets out with, on the roads as the map has them
(not as built since, which the court may not know of), twice for a trader or a
ship, which come back (`payLoad`). Each season's pay comes out of it, then out of the gold it carries; with neither, they
desert as before. It sets out only if the pay is there. What it did not need goes, when it comes home (`caravanHome`), into the coffer or treasury there, or stays
where its road ended, in its king's coffer or treasury if the province is his, else spent there. A load going home to its court (`lootHome`: a far province's gold, loot, a captured archive) carries no pay: its
porters are owed it (`Caravan.bill`), a bill they carry home, paid on arrival from the gold there. Robbed, taken or seized, the pay goes with the goods.

### What the seat sees

The coffer and the debt of each far province come with its report (`ProvinceEconomyView.coffer`, `owed`), dated like the
rest; they count in its holdings, so the strength a seat reckons sees them as reported. The bills, when they come, are
lines in the treasury notice; gold arriving at a coffer is told by the road. The twin canary's #587 leak is gone.

### First guesses (tuned in item 18)

The coffer's keep (a season's need times the word's seasons plus one), the caravans' pay load (the road's seasons at
its pace when it sets out, doubled to come back), and the script kings' sends (a far coffer short of two seasons' need,
or owing, at most two a season, keeping 150 shekels to spare).
