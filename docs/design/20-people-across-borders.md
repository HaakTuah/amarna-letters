## People across borders and in kings' hands (item 10+b)

**Since item 11a+** some of this is changed: see [`22-harvests-and-answers.md`](22-harvests-and-answers.md) (runaways by what they keep; mouths chosen; water from a dossier per city; deportees freed on the road; robbing outside a siege).

Build order item 10+b ("Where people go", "Deportation", "People are worth having, not free to keep", "Bandits rob the
purse"), opened by Haakon's answers carried from 10+a and the "Reason from the pillars" list that 10+a's text gained after
it was built. Save version 18. The report is `docs/rounds/2026-10-28-people-across-borders.md`. Every number is a first
guess (item 18 tunes them): `LandData` (`model/land.ts`: `runPercent`, `refugeMargin`, `deportDead`, `expelPercent`,
`policedPercent`, `lootSpentPercent`), `TradeData` (`model/trade.ts`: the sack), `WaterData` (`model/geography.ts`).

### People across borders (turn/borders.ts)

- **Flight** (`refuge`): those who leave the land cross to the neighbouring land best to live in last season
  (`livingScore`: how well its countryside ate, `S.fed`, times what the tax leaves the farmers; a besieged one scores
  nothing), whoever holds it, if it beats home by `refugeMargin` 10%; otherwise they stay loose at home. Who flees: those
  hunger drives off the land (`peopleSeason`); **runaways** from a heavy tax, `runPercent` 2% of the settled for each share
  of their food the farmers could not keep from their own harvest, hungry or not; those who run when a city is stormed or
  surrenders (`killSettled`); and the mouths put out of a besieged city. Both holders are told; signal `refugees`.
- **Runaways** (`S.runaways`: by province, the loose standing there who fled each king's land) move with the loose
  (`moveLoose`, which also carries their share of the gold the loose carry) and shrink as the loose settle or die
  (`looseLeave`). Those who drift back into their own king's land are home again.
- **Settling the loose** (order `welcome {province}`): a king settles the loose of a province of his, runaways included,
  as far as its land has room (`reckonedOf(..).room`); a fifth of them men of fighting age; the gold they carry goes into
  its purse. Signal `welcomed`.
- **Returning runaways** (order `returnRunaways {province, to}`, model `return_runaways`): the runaways from `to`'s land
  standing loose in a province of one's own walk to `to`'s nearest province (by hops) and settle there. The clause
  `fugitives` ("each of us sends back the other's runaways") writes the promise on a tablet; words, like every clause.
- **Deportation** (order `deport {province, to, number, purse}`): from a province one holds that is not one's homeland,
  to one of one's own. The people walk (`sendPeople`, a `Walk` with `deported` and `by`): `deportDead` 5% die, and on a
  long road some slip away and stay loose where they set out (the discharged men's stray rule); the rest arrive as the
  settled of `to`, a fifth of them men of fighting age, with their share of the purse if `purse`. Unrest among the
  deported and those left behind waits for item 17's revolts. Signal `deported`.
- **Mouths put out** (order `expel {province}`, model `expel_mouths`): a besieged city of one's own eats
  `expelPercent` 50% less of its town's need for the rest of the siege (`townNeed`, `S.expelled`, cleared when the siege
  ends); the townsfolk put out (that share of the town's need, in people) are refugees outside the walls. Signal
  `mouths-expelled`.

### Bandits rob the purse

`robbing`, in the people's season after men move between the land and the roads: the loose of a province take what the
roads pay them, `robPermille` 5‰ of its people's purse and of its holder's stores, times loose / (loose + 1,000), so
each man's take falls as they multiply and a robbed land has less to take; half where its holder's troops stand
(`policedPercent`; policing proper is item 15's). They eat the grain; the gold goes into `S.loot` (by province), half of
it spent each season at their province's market (`lootSpentPercent`), the rest carried as they drift. Holders read a
line in the treasury notice; signal `robbed`. Bands gathering them are item 11b's.

### Haakon's answers carried from 10+a

- **Anyone's ships at a besieged harbour** (`tradeTogether`): a ship of any king may sell grain at a besieged harbour while
  no fleet of its besieger holds its waters, at what its starving market pays, buying none there; the besieger's fleet in
  its waters turns it away. Its own king's ships still unload into its stores (`caravanHome`). Signal `besieged-fed`.
- **Prices and tolls only as reported** (`model/word.ts`, `Word`): a caravan or ship notes the markets it trades at and
  the tolls standing at each border it reaches on its king's goods (`noteMarket`, `noteTolls`), and its court learns
  them when it comes home (`hearWord`); an envoy brings home its host's market and tolls as they stood when it left
  (`HomeCargo.word`). Lost on the road, the word is lost. A court still sees the markets in the land it sees
  (`seeMarkets`), and at the start of the game it knows those within half a season's travel and the tolls on its goods
  there, as last reported before the game. `GameState.tollsKnown` replaces the posted tolls in `SeatView.tolls`.
- **Model characters choose their claims** (`MindReply.claims`, the pitch's `say_gather`, `say_stealth`, `say_forge`,
  each a band's words, read at the band's middle, `BandValues`): what it tells the court it can do, from the belief its
  request shows it; the formula (`claimOf`) serves when no claim is given (script characters).
- **And their words when questioned**: questioning rolls what the captive gives way on as before; what it then says is
  its own decision the next season (task `Questioning`, mind task `Questioned`, `questionedSays`): the tablets it saw, or
  a tablet that never was, a league of its master with a king it names (`MindReply.lies`, `league`), its words in the
  host's notice. The script mind keeps item 10's formula (loyal 60+ and brave 50+ lie).
- **Rumour by road at the pace of news**: as built in item 10 (`rumor`: `travelTurns`, the fastest route's seasons);
  checked, nothing to change.
- **A false envoy's full audience** (`pretendedAudience`): it is received like any envoy (a `PendingAudience` whose
  `Dispatch.pretended`), with no letter, sealed greeting or seal; gifts and gold sent back for "its king" it keeps
  (signal `false-envoy-paid`); taken into service it simply enters it; it stays at the court afterwards. Its trail is
  `pretended`, so no court's record of its own envoys shows it.
- **A captive handed over travels under guard** (`CaptiveConvoy` journey, duty `UnderGuard`): the giver's guards walk
  it to the receiver's capital like any company, at the road check's odds with no skill of the captive's: a king whose
  men stop the giver's people takes it (or frees it, if it is his own servant), outlaws let it escape, the weather holds
  it up. Nobody may dispose of it on the road. Signals `captive-arrived`, `captive-taken`, `captive-freed`,
  `captive-escaped`.

### Reason from the pillars (10+a's list)

- **No false name exposed by chance** (`impostors`): the 3% slip is gone; a false name falls only to someone at the court
  who has seen the man, a real envoy of the king claimed, a letter to that king (`checkClaim`) or inquiries.
- **The sack follows its causes** (`sack`): the taker's men in the province carry off at most `sackStormedPercent` 50% of
  its purse when stormed or taken unwalled, `sackSurrenderPercent` 25% when it surrendered, and no more than
  `lootPerHundred` 10 shekels a hundred men; `kingSharePercent` 33% of it is the king's and travels home as a load
  (`lootHome`, a returning caravan with gold), the rest goes into the units' savings. Discipline joins with commanders
  (item 13). **A captured archive** (`takeArchive`) is lost to its court at once and travels to the taker's capital the
  same way (`Caravan.archive`); its tablets become his copies when it arrives (`archiveArrives`), or the copies of a king
  whose troops take the load. The breach's pace already follows the besiegers' numbers (support) and time; engineers
  and commanders wait for item 13.
- **One price at a market** (`tradeTogether`): caravans and ships reaching one market in the same season sell as one lot
  and buy as one purse along the curve, each taking its share in proportion to what it brought.
- **Water by where a city stands** (`waterSeasons`): river land and a city with a spring inside its walls or a walled way
  down to one (`SafeWater`: Jerusalem, Megiddo) never run dry; elsewhere a besieged city drinks its cisterns,
  `CisternSeasons` 4 seasons in rain-fed land, `WellSeasons` 2 in arid ground, and then surrenders whatever its food
  (signal `siege-thirst`); an island city without water of its own (`IslandWater`: Tyre, Arwad) runs dry
  `IslandSeasons` 1 after its besieger's fleet holds its waters. Water works are item 15's.
- **Not built here**: a harvest gathered in each land's own season (a question for Haakon in the report).

### What a king sees and orders

`ProvinceEconomyView.runaways` and `expelled`; the town's `need` is what it eats now. A model king reads the runaways in
his land and the cities that put out their mouths (`peopleLines`), the rules in the rulebook's PEOPLE part
(`rules-people.ts`), the loot and the sea in `rules-economy.ts` and the siege's water in `rules.ts`; his actions
`welcome_loose`, `deport`, `return_runaways`, `expel_mouths`. The web app has a "People" row in the orders panel and the
clause `fugitives` in the clause editor.

### Script kings (game/src/bots/borders.ts)

`peopleAcrossBorders`, each season: send back the runaways of a king they promised it to (a sealed tablet with
`fugitives`), settle the loose where the land has room and fed its people, put out a besieged city's mouths once its
stores hold less than two seasons of its town's need, and deport a quarter of the people of land they took that is at
risk (a foreign army next to it, none of theirs in or next to it) to the homeland province with the most room within
four hops. They write `fugitives` into their peace and alliance tablets with kings whose land borders theirs. A foreign
besieged harbour is a market like any other for their ships, unless its besieger's fleet is seen in its waters.
`--no-border-play` / `--border-play-half` leave all of it alone.
