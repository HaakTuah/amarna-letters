### Treasury

> **Since item 11a** (`21-money-and-work.md`): wages and back pay are replaced by jobs with a fee (an advance now, the rest when the job is done), and strength no longer subtracts anything owed. Passages below about wages and back pay describe the build before item 11a and are kept for its history.

- **Gold** the king plans with is its treasury by its ledger less the back pay its view shows it owes: back pay owed is gold already spent, since the people it is owed to claim it when they are back at court. Everything below (disbanding, levies, cities, and the spare gold that pays for the court, gifts and bribes) reckons with that figure, so a script king never spends what a returning servant will claim. (Since the simulation-fixes round's Part G.)
- **Flow** = income − upkeep − the walls' upkeep − wages (all wages, those built up as back pay included).
- **Reserve**:
  - while flow is not negative, 0.3 × (upkeep + walls' upkeep + wages) × (0.5 + caution);
  - while flow is negative, (upkeep + walls' upkeep + wages) × (1 + caution);
  - in both cases, + 40 × greed + 20.
- **Disbanding.** While flow is negative and the treasury would not last two more seasons (gold + 2 × flow < 0), the king disbands a troop. It picks the troop in the least valuable province among those that are only holding or moving and not threatened.
  - **Or gives it to a friend** (since the fix pass after item 4): the troop goes instead to a friend the king would not betray, whose land the troop stands in or whose land or troops stand next to it, and whose treasury, as the king reckons it, feeds the troop for four seasons (the most trusted first). It costs nothing more than disbanding, and the troop serves a friend against the kings both face. Never a troop standing in the king's own land: land passes to whoever's troops stand in it, so the friend would take the province with it. When no idle troop is left and the treasury cannot pay next season's upkeep (gold + flow < 0), troops will desert whatever they are doing, so one a friend can take (by the same test, threatened or busy) is given to it. A king given troops or land trusts the giver 0.25 more (0.35 for land) and counts it as a support given.
- **Levies**, at most two a season. A levy is raised in a province of the king's homeland that it holds, that is empty and is not a destination. The provinces least likely to be attacked this season come first (no threat, then the lowest chance of the likeliest attack), then the capital, then higher yield; a levy stands only if the province is still the king's after movement. (Until the fix pass after item 4 threatened provinces came first. More than a third of levies fail all the same, nearly all in a homeland being overrun, where every empty province is threatened; a failed levy costs nothing.) The province must be in or next to a place where the plan fell short, best shortfall first.
  - It is a fleet if that place is reached only by sea, or for Arzawa and Alashiya while they have fewer than two fleets.
  - It is raised only if all of these hold:
    - the shortfall is worth at least (price + upkeep × min(H, 10)) × (0.7 + 0.5 × caution) × (1.3 − 0.6 × aggression);
    - the price leaves the reserve intact;
    - the new flow is no worse than −(gold left − reserve) ÷ max(3, H).
  - Until turn 11, an army costs 400 over its life (100 + 30 × 10). The bar is then 277 for Hatti's archetype and 570 for Alashiya's.
  - A king with no troops at all raises an army if 100 leaves the reserve intact.
- **Walls** (the siege package; `fortification`), at most a level a season, after the levies: in a province the king holds, below walls 3, not besieged and with no foreign troops within, walled already or with a troop of ours in it (walls rise after the moves, so an empty province without walls that a feared king can walk into would be his before they stood: in the first script games such orders failed nearly five times a game; trying still costs nothing when it fails), whose likeliest attack this season is feared at a chance of at least 0.4. Net = chance × value × (0.35 for a first level, 0.15 for a further one) − the price of the new level − (5 × min(H, 10) if the level is above the map's). The best net above 0 is bought if its price leaves 60 above the reserve. (A first level turns a province a lone army would take at once into one it must storm or besiege; a further level adds a season of siege.)
  - **Against fleets alone** (since the script players' audit of the siege package, which found Alashiya's empty Tamassos taken by a lone fleet in 23 of 100 games, its walls never raised; Tamassos was then lost in 9). Land of ours that only fleets threaten (a foreign fleet could move in now, and every foreign troop that could move in now or move next to it first is a fleet; a friend's fleet counts at the fear of 0.25, since open land is what tempts a friend to betray) is walled by its own rule, after the cities of the season are bought, from turn 4: an unwalled province, empty or not, at a chance of the most feared such king's fear (at least 0.25), worth chance × value × 0.6 (fleets never take walls, so a first level keeps the land from them for good), less the price and the upkeep as above; if the fleet walks in before the walls stand, the order fails at no cost. No further level is raised against fleets alone. In the first year the gold goes to cities: walled at once, Alashiya won 26 of 40 seeds against six baselines instead of 33; from turn 4, 30 (its growth 1.87 instead of 1.96: the frozen baseline seldom sends fleets against Tamassos).
- **Cities.** The king considers free walled cities within buying reach that are not a destination, nor held by another king's troops (its own may stand in one it besieges, and buy it).
  - Score = (yield × H − danger × 10 × yield) × (1.15 if no rival can bid; otherwise 1 − 0.1 × the number of rivals who can, at most three).
  - Danger is 0.35 if a king with hostility above 0.4 can bring two troops to the city, else 0.08.
  - Cities are ranked by score per shekel.
  - It buys up to two a season if commerce is above 0.45, else one.
  - It buys only while the gold left is at least reserve × (1.2 − 0.7 × commerce). A merchant therefore dips into its reserve: Alashiya keeps half of it, Hatti nearly all.
  - After the elders refused to choose between rival buyers, it bids again within three seasons only half the time, and for those three seasons it scores that city at 0.6 of its worth, so another city nearly as good is bought instead (since the fix pass after item 4).
- **Spare gold** is what is left above the reserve. It pays for the court, gifts and bribes.
- **Sallies** (the siege package): every move of ours into a city of ours whose walls can sally, with foreign troops within
  it, goes with a sally from its walls (`Tactics.sallies`; the first such move into each city, by province). The look-ahead
  pictures sallies for every king's moves into his own walled cities, a rival's as he may give them, so a besieger reckons
  with a relief army and its sally, and supports its army to hold. A city of ours besieged by a king who is no friend, with
  no move of ours into it, sallies for a friend's troop next to it (an army first, then by province), should it come to
  drive the besiegers out; a sally that finds no attack is void (since the script players' audit of the siege package).
- **Under siege** (the siege package): while its capital is besieged, a king sends no gifts or tribute (the gold would be
  taken with a caught envoy), and does not ask an envoy who would not leave to go again for two seasons. As besieger, it
  ransoms a caught envoy where it would have turned a spy (a caught envoy cannot be turned).
- **Cessions** (since the fix pass after item 4), at most one a season: land the king cannot keep goes to a friend before a rival ahead of it takes it. The province is outside its homeland, has no walls, no troop of the king in it, none that could reach it, is not a destination, and was not ceded to the king by a friend (that land is kept, rather than passed round). Next to it, or a move from it, stands a troop of a king who is not a friend, leads the race or stands at or above the king's growth, and has been taking land (belligerence 0.8 or more) or is hostile; and next to it stands a troop, or lies the land, of a friend the king would not betray, who does not lead and whose growth with the province stays below the rival's with it. The land is lost to the king either way; ceded, it does not carry the rival further ahead, and a king at peace with the friend will not march into it. The cession fails, at no cost, if the rival takes the province first.


#### The economy at home (item 9+a; `game/src/bots/grain.ts`)

Before the rest of the treasury, each season:

- **What each store keeps**: for every unit it feeds (an army in that province, a fleet in the waters of that coast), two
  seasons of food and a refill of its baggage; and in a frontier province (one next to land not ours) with our armies
  next to it, a depot of three seasons of food for each of them.
- **Caravans**, at most three a season: to each army of ours beyond our land (where its move this season takes it) whose
  baggage holds a season or less, and to each frontier depot that its stores and next tax will not fill; from the nearest
  store with that much to spare, by a route through our land of at most two seasons, with enough on top for what the
  porters eat. Never two to one place at once. A depot whose own market holds more than its need buys the grain there
  instead (if its gold covers two seasons of costs): that costs nothing in strength, where a caravan's porters eat a share
  of the load and must be paid. Troops depending on a store that their food and its next tax will not fill buy there too.
- **Sales** at each market, measure by measure along the curve, while the market pays at least 1.12 of the base price (a
  sale under the reference price lowers the score), 0.7 while the treasury is below `costs × (2 + caution)`, 0.4 while it
  is below one season's costs; and at any price for what the next tax would push out of the stores. Its income for the
  season is the mines and these sales.
- **Feeding**: what would still be lost for want of room goes to a town whose market holds less than its need.
- **Flow** for disbanding and levies is the mines plus what the markets can go on paying: no more than the realm's local
  need, its grain to spare after its troops' food, and the pay its troops spend at home plus a share of the purses
  (`purses / max(6, horizon)`). A levy's lifetime cost counts its food at the base price.

The baseline (frozen) and kings run with `--plain-economy` keep only two seasons of their troops' food in each store and
sell the rest every season at whatever the market pays, with no caravans, depots, feeding or purchases
(`plainGrainOrders`). Rivals' strength is reckoned from public data (`Board.worth`: a province's land worth and its purse
and stores as at the start).

#### The economy abroad (item 9+b; `game/src/bots/trade.ts`)

Inside the grain plan, after what each store keeps and the caravans to troops, before the home sales:

- **A besieged harbour of ours** whose waters no fleet of the besieger holds, its stores under two seasons of its need, is
  sent grain first: up to a ship's load from the store with most to spare that has an idle fleet (one the military plan
  leaves holding, or gives no order) in its harbour or waters, within two seasons' sail.
- **Ventures**, at most three trading caravans abroad at once (fleets are their own limit). For each province with grain
  to spare, the most spare first, every foreign market known within six seasons is weighed three ways where they exist:
  an open caravan (at most 100 measures, by the land open to us, paying the tolls it knows of on its way), a smuggler (at most
  50, off the road, paying none but risking the odds of being found entering each realm, going and coming), and a ship
  (from the province's harbour with an idle fleet, not in winter, not with a hostile fleet within two moves of its waters;
  up to 400). Each reckons what arrives (the tolls and what the porters eat), what it sells for along that market's
  curve, and, where our town there is short or its grain dear, what the gold we send (at most 150, keeping two seasons of
  costs and a margin for caution) buys and brings home, worth our own price; less the porters' pay, a ship's risk of a
  storm (the fleet and its cargo), the gold sent and the grain sent at its reference price. The grain is valued at its
  reference price, not at what our own market would pay, because a sale at home only moves our people's gold into the
  treasury, where a sale abroad brings another realm's gold into ours (the wealth of a realm is the score). A caravan's
  venture is sent if it gains at least 15 shekels and a share of its worth of `0.25 − 0.15 × commerce`, a ship's at least
  5 and half that share (an idle fleet is paid the same at war or in cargo service), at most three seasons away. The
  fleet's hold in the military plan gives way to the voyage.
- **Idle fleets to the grain**: one idle fleet a season whose harbour has under 60 measures to spare moves to a harbour of
  ours next to it with at least 80, to load there next season.
- **Tolls**: a rate on everyone's goods entering our land of `10 + 10 × greed`, rounded to five (10 to 20 in a hundred), and
  none for each partner we promised free passage on a sealed tablet, nor for an ally. Only changes are ordered.
- **Trade rights**: a peace or alliance tablet a script king proposes carries free passage both ways (`tollFree` and
  `askTollFree`) where tolls stand between the two; a script king seals such a tablet, since a mutual exemption gives
  nothing away (`givesAwayIn`).

The gold sent abroad is taken from the treasury the rest of the season reckons with. The frozen baseline trades nothing
abroad and sets no tolls; `--no-trade-play` and `--trade-play-half` turn this part off for all script kings or half.

### People at home (item 10+a)

Each season a script king sets each province's tax to the highest its farmers can bear without going hungry this
season, less three points, and at least five under its rate where it went short (raising it only once they can bear
three points more); it feeds a countryside that will go
short from its stores before selling any grain; it levies only where the men are, cheapest in harvest first, and counts
the harvest a levy costs in its price; and it settles a unit it disbands in a province of its own with room. Its
tactics count the people's resistance as the defence of empty land. The details are in `../19-people-at-home.md`,
"Script kings" (`game/src/bots/land.ts`).

### People across borders (item 10+b)

It sends back the runaways of a king it promised them to on a sealed tablet (and writes that promise, `fugitives`, into
its peace and alliance tablets with neighbours), settles the loose where the land has room and fed its people, puts out
a besieged city's mouths once its stores run low, and deports people from land it took that is at risk to its homeland.
The details are in `../20-people-across-borders.md`, "Script kings" (`game/src/bots/borders.ts`).
