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
- **Bold and careful characters** ("Bold or careful, one goal"): counted by road (`Character.bold`) among the
  best-placed living characters; since part D in the money report (below).
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

## Part D: money and characters (`WaryLost`, `WaryKilled`, `WaryMost` in `turn/court.ts`; `game/src/money-report.ts`)

- **Danger money goes to the bold** ("Bold or careful, one goal": the bold road's "well-paid errands into danger"). What
  a person asks more of a court it heard loses its people abroad or puts others to death is doubled, and the timid now
  ask up to twice it and the bravest nothing more, where it ran from all of it down to half (the rule and its numbers:
  [23](23-roads-and-reputations.md), "Reputation from losses abroad"). Kings hire the cheapest candidate who will go, so the
  careful, who asked least, took most jobs, dangerous service among them. Now the careful shun courts heard to lose their
  people, and the bold take more of that service (the report gives the shares). What a person asks more of a court heard to seize
  hoards (`WarySeized`, at most `WarySeizedMost`) keeps its old scale: it threatens a keeper's hoard, not his life.
- **The money report** (`MoneyWatch`, `moneyReport`), read after each season by the season played: the world's gold at
  seasons 1, 20, 40, 60 and 80 (treasuries, the kings' gold away from them, markets' purses, characters' purses and
  hoards, the loose men's loot); in each twenty seasons the jobs agreed with their mean fee a season (over the term
  agreed), the share of living characters in service and what a free man takes in a season working for himself
  (lending and dealing at face, loot, news and carrying); and for each road its characters, deaths, places in the top
  five and top twenty, jobs with courts heard to lose their people, gains a head and earnings by source. It replaces
  part B's line on the roads. Beside the average wake-ups, the batch summary gives the busiest season's
  (`GameSummary.characterPeak`).
- **Kept as built**, by the measure (the report): characters' living and a hoard's keep (`MoneyData.living`,
  `hoardFee`), lending's rates (`interest*`), the pool's baseline, the markets' purses, and the gift threshold of routine
  audiences (the standing answers' backstop, a quarter of the treasury), which only model kings meet.
- Save version 90: a person's price at a dangerous court, so who is hired, and what follows, differ from version 89's.

## Part E: script kings' spending as investment (`bots/investment.ts`, `game/src/spending-report.ts`)

- **Gifts, bribes and tribute are investments** ("Gold is a lifeline"): the rule is in
  [the script kings' letters and gifts](07-script-kings/15-letters-and-gifts.md), "Gifts as investments". It replaces
  the spare-gold, generosity and chance thresholds; `--gift-play-half` measures it (the report).
- **The spending report** (`spendingReport`), in every batch summary: per Great King and season, in the opening (seasons
  1-20), the middle and the last 8, gold given abroad, jobs offered, levies, works, ransoms, the treasury's share of the
  realm's wealth and the darkest seasons' four grabs; and each court's first march into another's land across the seeds.
- **Kept as built**, by the measure: no grab at the end of the age (the seasons a king believes are left stay long under
  the random ending, so a good name keeps paying), and openings that follow the map (#840 to the owner).
- Save version 91: script kings give by the receiver's odds against them, so play from the same seed differs from
  version 90's.
