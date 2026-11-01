# How cities become free (item 17)

Build order item 17 (`docs/intent/build-order/item-17.md`): "Revolt follows conditions, not dice", "How cities become
free" and "How long a siege lasts" (the gate opened from within) under War; "A head rises where men lack one" and "Land
without a ruler" under Bands; "Armies need food as well as pay" under Land, people and economy. Built from the dossier
`docs/history/14-courts-and-free-cities.md` ("How cities became free or changed rulers" and its closing table). Report:
`docs/rounds/2026-10-29-free-cities.md`. Save version 37. Every number is a first guess in `UnrestData`
(`src/engine/src/model/unrest.ts`), tuned in item 18.

## Unrest (`turn/unrest.ts`)

Replaced in item 17++ by the ledger and the one rule of whom a province obeys: [47](47-whom-a-province-obeys.md). What
item 17 summed as unrest (hardship, newness, the master's weakness, distance, a cause, outside help, and what lowered it)
is read there as entries in the ledger and as the moment; the governor's reports in words (`moodWords`) and the spies'
are unchanged.

## Rulers of their own (`turn/rulers.ts`, `ruleOwn`)

One path for every new ruler, generalised from item 13+'s `governorRises` (`RisenPower.how`): `governor` (his kingdom
fell), `turned` (a governor refusing his recall, loyalty below 30 and ambition above 60, rules his province with the levies
he raised there unless other troops of the king's stand there; before, he took them off as a band), `revolt`, `chief` and
`elder`. His purse and an elite's share of the province's purse (`elitePurse` 20%) are his treasury; followers he can pay
a season follow him; the land is his homeland, absorbed and content. The chronicle's "A new Idrimi" reads each way
(`newIdrimi`).

- **Lawless land raises a ruler in time** (`lawlessRulers`): a walled town an elder of its own (`newHead`, rose `elder`),
  `elder` 8 in a hundred a season a level of walls, plus 1 a season it has waited; thin land only bands. A chief whose band
  holds lawless land with his ambition 50 or more, `chiefHold` 8 seasons (years, the dossier's band case) or `captainHold` 2
  for a band that was a king's army (a commander who kept it, or a captain), with men at least a fifth of its men of
  fighting age and no troops there, rules it (`chief`), his band his army (`bandToArmy`; `Band.held`, `heldAt`).

## The gate opened from within (`sieges.ts`, `gateHolds`)

A besieged city that cannot feed its people no longer surrenders the season it starves: it counts its seasons starving
(`Siege.hungry`) and its gate opens from within after `gate` 1, one more where its ruler is there (his court or his
governor; Rib-Hadda lost Byblos the one time he left it), one more where its people were content (unrest below half the
threshold), one fewer where they were restless. `siege-starved` now marks a gate opened.

## Buying or taking (`turn/supply.ts`, `feedTroops`)

- Order `supply {unit, buy, gold}` (model kings: command actions `buy_food`, `take_food` with `gold`; the web's "Buy food,
  send gold" and "Take food"): the gold leaves the treasury now and travels with the word by courier (`GameState.foodWord`,
  `SeatView.foodSent`), holding from the season it arrives (`Unit.buy`, `Unit.chest`, carried in the men's packs within
  `savings`); if the army is gone or not his, the gold comes back.
- Where an army stands by leave (own land, or passage or basing), after its depot's stores: it buys at the market with its
  chest if its word is to buy, unless its commander keeps the gold (greed × (100 − loyalty) at least `keepFood` 5000,
  `supply-kept`), then eats its baggage, then takes (at home the market, then the farmers' share; elsewhere the farmers').
  Abroad by leave its king no longer buys from his treasury at a distance: the chest replaced it. Each army-season by
  leave counts `supply-buy` if it bought and `supply-take` if it took (a season can count both); each word sent counts
  `supply-word-buy` or `supply-word-take`.
- What troops take raises unrest by how much (above) and is told to the land's ruler: his people's complaint, or "Troops
  took food" naming whose, which a script king counts as a wrong (grudge 0.5 plus a hundredth a measure, trust −0.1).

## Outside help (`stirSeason`)

`spy {province, stir}` (model kings: `place_spy` with `gold`): the gold leaves the treasury with him (`Character.stirGold`);
posted, he spends half of it a season (at least 50) into the province's purse, keeping (greed − loyalty)/200 of it, and
`stir` points go to `GameState.stirred`. Caught, it is in his purse; home, he hands back what is left.

## Script kings (`bots/freedom.ts`)

- Each army by leave whose depot will not feed it gets word to buy and gold for three seasons at the price its court last
  heard, when what it carries and has on the road is below a third of that and the treasury can spare it (`supplyOrders`).
- A province a governor calls restless or near revolt pays 15 points less tax (`reliefOrders`); from item 17++ a lighter tax is a giving in its ledger.
- A cunning king (cunning above 0.4) posting a watching spy in a foe's land that is not the foe's homeland sends a third of
  his spare gold with him, 50 to 200, to stir it (`stirGold`).
- `--no-freedom-play` / `--freedom-play-half` turn all three off (the king then sends no word, so his armies take).

## Not built here

- Model kings' and characters' play of it: script seats only until model games return.
- Travellers' talk of a province's mood: what travellers carry is the news of a revolt itself, as of any change of hands.

## The age lengthened (item 17, revision 111; Haakon, 30 October 2026: "Yes to 1.")

`GameConfig` defaults: `endMedian` 80 (was 44), the cap drawn from `capMin` 140 to `capMax` 160 (was 80 to 100); the omens'
darkest tier comes at the bottom of the cap's range, so at season 140 (with no cap, at 140/80 of the median,
`DarkestNoCap`). The age bands the kings read are re-centred on the new default (`ageBand`, `BandMedian`): short up to a
median of 55 (believed 44), usual 80, long from 110 (believed 130). The batch report gives the median length and in how
many ages a Great King's war was decided (`greatWarOf`: a Great King's capital taken, or a Great King made another's
vassal, whichever first). First guesses for item 18.
