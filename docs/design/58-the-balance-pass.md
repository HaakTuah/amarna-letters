# The balance pass (item 18)

The item's text: `docs/intent/build-order/item-18.md` ("The balance pass"). Built in parts; the report, with every run's
numbers: `docs/rounds/2026-11-07-balance-pass.md`. Part A (no rule names a power; temperament a setting) is in
[07, temperament](07-script-kings/03-temperament.md).

## Part B: the scoreboard (`rules/par-results.ts`, `GameConfig.sizeWeight`, `GameConfig.provinceWeight`)

- **Par refreshed** on the rules as built at part A (`scripts/sim.sh --games 50 --seed 101 --par-out`): the powers'
  results (`ParResults`) and the characters' (`CharacterPar`) from the same 50 games. The powers' par had not been
  measured since the parts of 17b that changed who falls; on the old par the three strongest powers took 46 of these 50
  games. The script kings rank rivals by par in play (`Board.growth`), so par steers play as well as the score; it is
  refreshed once more at the end of the pass, after parts C to E change the play.
- **The weight of size** stays 5 percent (`GameConfig.sizeWeight`, the one place it is set), the owner's answer of
  29 October 2026 to item 11e; question #825 asks whether it should be half and half, and his answer is that one number.
- **The land against gold and goods** stays the fixed multiple (`provinceWeight` 10 × a season's worth at reference
  prices): the alternative, the gold the land can still yield in the seasons likely left, would move every score as the
  omens darken with no wealth moving, against "every movement of wealth scores itself" (Victory). The script kings already value a
  province by the seasons they believe are left (`Board.baseValue`, [29](29-answers-to-11plus.md)).
- **Bold and careful characters** ("Bold or careful, one goal"): the batch summary says how many of the five
  best-placed living characters in each game took the bold road (`Character.bold`), against the share of bold
  characters in all (`roadsOf` in `game/src/batch.ts`). Part D (money and characters: costs, lending, fees) tunes the
  numbers both roads earn by, and measures this again.
- Save version 88: par refreshed, so the script kings' play and a game's final scores and winner differ from version 87's.

## Part C: length and war (`EconomyData.breachPerLevel`)

- **A breach takes twice the wear** (`breachPerLevel` 6 steps for each level of walls, 3 before): with 3, walls fell to
  wear in two or three seasons and the breach, not the stores, was the clock of most sieges, against "Walls price the
  storm, not the clock" (War). Now hunger and thirst end most sieges, as "How long a siege lasts" asks.
- **Kept**: the age's median (80 seasons) and cap (140 to 160), the owner's of 30 October 2026, since most ages pass the
  length test; the gate a starving city keeps (`UnrestData.gate` 1); the people's help on rough ground (twice).
- **The war report** (`warReport` in `game/src/batch.ts`) measures pillar 8: a letter from each fallen court to its
  conqueror's and the reply (`FallMeasure.reply`, the couriers' seasons there and back, each way by its own road, at the
  game's end, where the conqueror still reigns), the falls sooner than that after his entry, by kingdom; and the games in which a
  Great King's realm fell (held nothing, item 17b), a lower bound on the games in which his capital was taken.
- Save version 89: the slower breach.
