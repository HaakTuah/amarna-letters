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
- **The weight of size** stayed 5 percent (`GameConfig.sizeWeight`, the one place it is set), the owner's answer of
  29 October 2026 to item 11e, while #825 waited; part F2 set it by his answer (below).
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
- **The spending report** (`SpendingWatch`, `spendingReport`), in every batch summary: per Great King and season, in
  the opening (seasons 1-20), the middle, and the seasons of grave or darker omens (`omenTier`, what every court reads),
  gold given abroad (envoys' gold, gifts to persons, and at audiences the gifts envoys took and gold sent back), jobs
  offered, levies, works, ransoms, the treasury's share of the realm's wealth, and the four grabs: provinces whose share
  of the harvest rose, provinces whose countryside went hungry while their stores held grain and none was sent, hoards
  seized, fees withheld (and troops' pay held back beside them); and each court's first march into land another held
  when the season began.
- **Kept as built**, by the measure: no grab at the end of the age (the seasons a king believes are left stay long under
  the random ending, so a good name keeps paying; a hungry countryside goes unfed more often late in the age because the
  troops' depots and sieges hold its stores, not by any reckoning of the end), openings that follow the map (#840 to the owner), and gifts that buy a
  neighbour's peace but not a far friend's favour (#841 to the owner).
- **A vassal's tribute** is judged by the peace it buys: [city-states as powers](26-city-states-as-powers.md).
- Save version 91: script kings give, and vassals pay, by what it returns, so play from the same seed differs from
  version 90's.
- **Fees that fall when many wait** (part F, #837): one seeking service unhired past its patience asks less, a master
  sees his servant's price for a new job, and script kings renew at it: [money and work](21-money-and-work.md), "Fees
  clear the market". Save version 92.

## Part F2: the audit on the tuned play (`rules/par-results.ts`, `CharacterParBest`; `game/src/captives-report.ts`)

- **Par refreshed** once more, from 100 games (seeds 101-200), with parts A to F1, #850 and #878 in play.
- **A character's par** is what the best five characters who never reigned gained in each of those games
  (`CharacterParBest`), not every character's: ranked against everyone's results, the characters together stood first
  in a third of the games at any weight of size that kept the Great Kings level (#825's test: "a character wins now
  and then"); see [57](57-every-person.md).
- **The weight of size is 2 percent** (`GameConfig.sizeWeight`, 5 before), set by testing against #825's test on seeds
  1-200: at 2 the Great Kings stand first about equally (Arzawa apart, looked into in F3) and each about twice as often
  as another state, and a character in about one game in nine; at 5 the Great Kings drift apart and stand first three
  times as often as another state.
- **Holding a king forever** is measured by the "Held long" line ([59](59-a-captive-kings-realm.md)); the escape odds
  and the guard (`KingData`) stay as they are, since holding a king long gains his captor nothing measurable.
- **The bold and careful lines** count only those who never reigned.
- Save version 94.

## Part F3: every feature's use against ignore (`versusReport` in `game/src/batch.ts`)

- **Each side's standing against par** is reported beside its mean growth and wins: wins in 100 games carry a noise of
  about ten either way, and mean growth the outliers of the fast-growing states.
- **The null split** (`--null-half`): the same halves with nothing switched off, so a feature's numbers are read against
  what the seeds alone give each side. On seeds 1-100 the powers of one parity win more often on the seeds of the other.
- Every feature now has its half switch: `--sea-play-half` ([12](12-the-map-and-the-seas.md)) and
  `--inventory-play-half` ([14](14-structured-press.md)) are new.

## Part F3's rest: the last features and par again (`versusReport`, `game/src/bonds-report.ts`, `rules/par-results.ts`)

- **The Great Kings and the rest apart:** each half-switch run also reports the Great Kings' and the other states' growth
  and standing, current against baseline, since a feature can help one and cost the other (the war of choice did).
- **Vassals taken by their own overlords** (`BondWatch`, `bondReport`): the provinces overlords take from vassals paying
  their tribute, and from vassals in arrears, by side in a half-switch run. Overlords take about 0.3 provinces a game
  from paying vassals (0.1 to 0.4 in each run) and 6 to 8 from those in arrears, so a paid overlord sparing his vassal
  holds.
- **A city keeps a plain peace** as a bar to its war of choice ([05](07-script-kings/05-choosing-a-war.md)).
- **Par refreshed** from 100 games (seeds 101-200) with the city's peace in play, measured after every feature's run so
  that their standings, all read on the par before it, stay comparable.
- Save version 95: par refreshed, so a game's final scores and winner, and the script kings' play that ranks rivals by
  standing, differ from version 94's (as at part B's version 88).
