## People at home (item 10+a)

**Since item 11a+** some of this is changed: see [`22-harvests-and-answers.md`](22-harvests-and-answers.md) (the harvest is reaped once a year into the farmers' granaries and the tax taken from them; levies sized by men; winter by men).

Build order item 10+a ("People of the land", "Land and climate", "Rivers", "Seasons", "How a king lives", "The people
defend their land", and the pace terms of "What sets a company's pace"): each province's people in three groups and the
flows between them, the harvest by the hands on the land, the king's tax rate with the hunger that answers it, levies
drawn from the men of fighting age, discharged men walking home or settled as colonists, droughts by region and floods by
river, winter in the field, and the people's resistance. Save version 17. The report is
`docs/rounds/2026-10-28-people-at-home.md`. Every number is a first guess (item 18 tunes them): `LandData`
(`src/engine/src/model/land.ts`), `Climates`, `DroughtRegions` and `RiverFloods` (`model/geography.ts`), `ClimatePace`
(`model/travel.ts`).

### Data

- **People** (`GameState.people`, by land province): `settled` (with `men`, the men of fighting age, among them) and
  `loose`. The men under arms are on their units (`Unit.men`, 5,000 an army, 2,000 a fleet), counted out of their home's
  settled and men when levied.
- **At the start** (`startPeople`): each region's middle estimate in the people dossier
  (`docs/history/04-people-and-settlement.md`), shared among its provinces by their harvests (arid land a tenth as
  thickly); men of fighting age a fifth of the settled; loose 10% in the Levant's Habiru country, 30% in the lands
  without a king, 2% elsewhere. Provinces the dossier does not name (Isuwa, Lukka, the Kaska lands, the steppe) are
  guesses [G].
- **The reckoning** (`reckonedOf`): the people at the start less the starting armies' men; each province's harvest is
  calibrated to it, so every province starts at its old yield. What the land carries (`room`, for births) is the settled
  before those levies.
- **Climate** (`Climates`): each province's water (river, rain or arid), winter (mild, cool or hard), busy seasons (Peret
  and Shemu nearly everywhere; Akhet on the Anatolian plateau, which reaps then) and drought region.

### The harvest (model/land.ts, `harvestIn`)

`harvest = harvestOf(p) × g(labour / reckoned labour) × climate`. Labour is counted in halves: every settled person 2,
each man of fighting age 6 more in a busy season and 3 in the slack one, less the men away (caravan porters, 5 a measure
the caravan carries, and the corvée, 3,000 for a season when walls are built). `g(r)` is `√r` below full strength (half
the people reap seven in ten; a levy of a twentieth costs about a fortieth) and `1 + (r−1)/4` above. The climate share is
the product of the droughts and floods striking the province. The land's worth in the score (`landWorth`) and a free
city's price use the harvest without the climate share or the men away, and with a man's weight averaged over the three seasons: the score
counts the people over the year, not a passing season's weather or work. A province's countryside needs at least a
measure, so even a nearly emptied one has room to fill.

### The season (turn/people.ts, `peopleSeason`, after the towns eat)

It runs after the troops eat: troops foraging in a province take their share from what its farmers kept
(`_foodNow`), before the countryside eats.

1. Discharged men whose walk ends arrive home (`walking`); the corvée is cleared.
2. The countryside eats: its food is what it kept of the harvest after the tax (`_foodNow`, set in `harvestSeason`: the
   harvest as catastrophes leave it, less the tax collected; a besieged province's farmers keep it all, and the tax not
   yet collected in land being absorbed is theirs). Its need is 60% of the starting harvest, by settled against the
   reckoned settled. It buys what it lacks from its market's stock (after the town ate); what is still short is hunger:
   `fed` (thousandths, kept in `GameState.fed` for the view), and `settled × (1 − fed) × 10%` leave the land, a third
   dead and the rest loose. A drought at the default tax costs about 4% of the settled a season.
3. Births: `settled × 8% × (room − settled) / room`; the men of fighting age close a thirtieth of their gap to a fifth
   of the settled a season (a lost generation).
4. The settled move to a neighbouring province of the same kingdom with more room, measured in food (the land's food at
   its room plus the stores, against what its settled eat), at most 5% a season, in proportion to the difference, with
   their share of the purse. Every flow is reckoned before any applies.
5. Men move between the land and the roads: the land pays the farmers' food against their need, the roads 5‰ of the
   province's wealth (purse, stores and market) shared among its loose (counted from a floor of a thousand); 5% of the
   gap a season, back to the land only where it has room ("Bandits rob the purse": the robbing itself, and flight across borders, are item 10+b's:
   `20-people-across-borders.md`).
6. The loose drift: a tenth of them at most, to the richest neighbour by wealth per loose man, if it beats home by a tenth.

### Orders

- `tax {province | null, percent}` (0 to 100: "no rule caps the rate"): stands until changed or the province changes hands (`taxes`, by province,
  left out at the default 33). Validated in `rules/validator.ts`, set in `setTax`.
- `disband {unit, settle}`: `settle` in a province of one's own settles the men there (`menHome`). Otherwise they walk
  home with their savings (into their home's purse when they arrive; Haakon's answer of 28 October 2026: nothing reaches
  home before they do), arriving after the fastest route's days at 45 a season; one in a hundred more for every 3 days beyond 15 (at most
  half) turn loose where they stood. A mutinous unit and a fallen kingdom's troops walk home too.
- `raise` needs the men: refused at validation and at resolution where the province's men of fighting age at home and
  not away carrying or building (`menAvailable`) are fewer. The corvée takes at most the men available.

### Battle, sieges and catastrophes

- A destroyed unit (`unitDestroyed`): half its men dead, the rest loose where it fell. A unit lost to winter or plague
  is lost with its men.
- A city stormed (`updateOwnership`) or surrendering to a siege (`surrender`): 5% of its settled dead and 5% loose.
- Plague kills 5% of the stricken realm's settled; an earthquake 2% of its province's. Drought and flood are no longer
  drawn by power: `catastropheChance` halved to 0.0175, so plague and earthquakes come as often as before.
- **Droughts** (`climateSeason`, called from `worldEvents`): once a year, in Shemu, one draw a region (the plateau 1 in
  6, the Levant and Syria and the Habur and Assyria 1 in 8, the western coasts and Cyprus and the Susiana plain 1 in 10):
  its rain-fed provinces reap half for the next three seasons. **Floods**: one draw a river a year, the season before its
  flood season (the Nile floods in Akhet, the Tigris and Euphrates in Shemu), striking from it: a bad one (Nile 1 in 8, the others 1 in 6) leaves 60% for three seasons along the whole
  course, a ruinous one (1 in 30, 1 in 20) 30% and drowns 1%. Droughts and floods are drawn only while catastrophes are
  on (`catastropheChance` above 0). Holders are told when it is drawn, as are courts that see any of the land.

### The people defend their land (rules/adjudicator.ts)

`run(..., resist)`: a move into a province not its mover's, where no unit stands or its unit moved away, must beat the
people's resistance (`resistanceOf`: 0, 1 or 2, by the men of fighting age times hostility, doubled on rough ground and
halved on open plain; 1 from 5,000, 2 from 30,000; hostility 100, 50 in the mover's own homeland). A guest by passage or
basing meets none. A move it stops fails with the stop `Resisted`; a storm must beat the walls plus it. Free cities keep
their walls: the people resist in every province alike (reading in the report).

### Seasons and the road

- **Winter in the field** (`feedTroops`): an army outside its king's land in Peret eats 50% more where the winter is cool
  and 100% more where it is hard.
- **The pace** (`legPoints`): on land in Peret, cool-winter provinces take 110% and hard-winter ones 125% of the time;
  in arid land (an arid province at either end, or a desert crossing) a company larger than 30 takes 2% longer for each
  beyond (at most double: "Water"); in arid land or a cool or hard winter, pack animals carry fodder, a quarter of their
  capacity added to the load ("Fodder"; porters carry none).

### What a king sees

`ProvinceEconomyView` gains `settled`, `men`, `loose`, `room`, `taxRate`, `harvest` and `fed`; `SeatView.yields` (the
yield of its own land and the land in its sight as its people bring it in now, on the map's scale; elsewhere the court
knows only the map's), `resistance` (what this court's troops would meet in the land it sees, where any) and `walking`.
A model king reads them compactly (`peopleLines` in `llm/src/prompt-economy.ts`): YOUR PEOPLE, the hungry, the rates,
land with room, the men for levies, YIELDS that changed and RESISTANCE. A free city's asking price (`cityPrices`) is public
as before and follows its people. The rulebook's PEOPLE part is `llm/src/rules-people.ts`; model kings
order `set_tax` and the unit order `settle`. The web app shows a province's people in its panel and has "Set the tax" in
the grain row and "Disband and settle its men here" for a unit.

### Script kings (game/src/bots/land.ts)

- Each province's tax is set to the highest its farmers can bear this season without going hungry, less 3 points
  (`bearableTax`), and at least 5 under its rate where it went short; a rate comes down at once and goes up only once
  the farmers can bear 3 points more, so it is not reset every season; grain from the stores feeds a countryside that
  will go short, before any is sold (`famineFeeding`).
- Levies only where the men are (`canLevy`), cheapest in harvest first (`levyCost`, which also enters a levy's price).
- A unit disbanded in a province of ours with room settles its men there (`settleThere`).
- Tactics count the people's resistance as the defence of empty land (`Board.resistance`), in attacks, landings, winter
  strokes, marching and the look-ahead (for its own moves only: a rival's it does not reckon); land values use
  `SeatView.yields` where the court sees the land and the map's yield elsewhere (`Board.yieldOf`).
- `--no-land-play` / `--land-play-half` turn off the tax, feeding, levy costing and colonists (the resistance is a rule
  every script king keeps).
