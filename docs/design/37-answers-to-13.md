# Haakon's answers to item 13 (item 13+)

Build order item 13+ (`docs/intent/build-order/item-13.md`, the 13+ entry), Haakon's answers of 29 October 2026 to item
13's review: "I agree with all your takes." ("A kingdom falls with its capital" under War.) Report:
`docs/rounds/2026-10-29-answers-to-13.md`. Save version 33.

## A realm comes apart as the news arrives (`turn/falls.ts`, `TurnEngine.fall`, `fallsSpread`)

- When a king is taken, his capital passes at once to whoever took it (a capital ceded by tablet passes whole, as
  before). Every other part of his realm stays as it was until word of the fall reaches it: it reaches each province at
  the pace word of the fall reaches foreign courts (`travelTurns` from the fallen capital, so a season at least), and his
  armies where they stand. Until then the land is the fallen power's still: its harvest is reaped and taxed into its
  stores, its people live as before, its troops hold where they are (no orders reach them, and nobody pays them), and the
  gold of its mines goes to the fallen capital as before, so to whoever holds it (`harvestSeason`; a load on the road if
  beyond the season's reach, `lootHome(..., to)`); with nobody holding the capital it stays with the province's people.
  Troops marching into unwalled land of the fallen kingdom take it as any other land (`updateOwnership`). The fallen
  kingdom's own armies press no siege and take no land for a king who is no more, and any gold that comes into its
  hands meanwhile (tolls, a caravan its troops seize) goes where its mines' gold goes (`credit`). Its governors and
  commanders serve on until the word reaches their province or army, and are their own men from then.
- When the word arrives in a province: where the conqueror's troops stand, it is his, held by force (a walled city his
  army stood before without storming it, too); where a governor of the fallen king's governs, he rules it in his own name
  (below); the rest falls lawless ("Land without a ruler"). Then the armies there hear it: a commanded one is its
  commander's band, an uncommanded one owed pay or hungry may raise a captain, any other disbands (item 13's rule, now
  per unit as the word reaches it, `fallenUnit`).

## A governor's seat of his own (`governorRises`, `model/power.ts`)

- **Powers risen in play.** `Power` is a power the map starts with (`FixedPower`, `FixedPowers`) or one risen in play,
  named by its land: the governor's province's name (with his own after it if a power already goes by that name).
  `GameState.risen` keeps each (`RisenPower`: names, ruler, capital, the season and kingdom it rose from, and his temper),
  and a registry in `model/power.ts` mirrors it for what names a power without the state (`setRisen`, called by every
  new game, every `TurnEngine` and the web page as a state arrives). `AllPowers` is every power in play's order, the
  fixed ones and then the risen as they rose; `cmpPower` sorts risen powers after the fixed. A risen power's capital is
  its province (`WorldMap.capital`), its court there, and its province is its homeland (`WorldMap.homeOf`, `isHome`: levies,
  the people's resistance, absorption, the script kings' reckoning), with nothing to absorb.
- **What he brings.** His purse becomes his treasury ("Nothing appears or vanishes"); the troops in his province (or
  its waters) follow him if his treasury covers a season of their pay, each in turn, first guess; those he cannot pay
  hear the news as the rest of the army does. His character stays in play, duty `Ruling`, employed by his own power,
  at its court, so the same man plays the seat. He reads a notice that he rules in his own name, what he holds and what
  he may do (keep silent, or send envoys with any terms), and the state of his realm; courts that see his city learn at
  once, the rest when word of it travels from there (`word`, "Realm").
- **The seat.** A script seat plays a risen power (`GameRunner.seatOf`: the table's seats are the map's powers; a
  risen one takes the runner's script king, or the log's decisions on replay), with a personality from its ruler's
  traits (`personalityFor`: aggression from ambition, caution from fear, honesty from loyalty, greed from greed, the rest
  a city's middling weights). From then on it is a power like any city-state: it falls with its capital, its envoys,
  tablets, vassalage and wars are the ordinary rules, and the conqueror may treat with it, ignore it or march in.
- **On the board** risen powers share one colour and a city's tower (`glyphId` "risen", `city-states.css`); their names
  are on the board.

## Measured

`--games 50 --seed 1`: no governor rose (none was in place in a kingdom that fell); 17 provinces passed to the
conqueror's troops as the word arrived and 106 fell lawless. A small game in which one rises
(`src/game/test/risen-seat.test.ts`) has its script seat keep his men, take lawless land beside it and replay exactly;
see the report. The batch report prints the governors' seats (`risenReport`): how many rose, how
long they lasted, their growth, and the envoys and tablets their seats sent and sealed; the signals `risen`,
`fall-held` and `fall-lawless` count the parts of fallen kingdoms as they come apart.

## Not built here

- A risen seat played by a model: it is a script seat; model seats return with model games ("No model games until the
  build order is done").
- The other ways a city becomes free (a revolt, a commander keeping his army, a governor turning on his recall and
  ruling a city of his own): item 17, by the same powers risen in play.
