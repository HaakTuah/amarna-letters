## Harvests in their season, and the answers to items 8 to 10+b (item 11a+)

Build order item 11a+: Haakon's answers to the reviews of items 8, 9, 10+a and 10+b where they differ from what was
built (28 October 2026: "You figure all this out, expert. You know me by now. But models must be able to alter clauses
also. Remember, everyone plays the same game!"), then the harvest in each land's own season. Save version 20. The report
is `docs/rounds/2026-10-28-harvests-and-answers.md`. Every number is a first guess (item 18 tunes them).

### The harvest in its season ("Period first")

- **State** (`GameState.crop`, `reaped`, `granary`, by land province): the crop growing in the fields since the last
  reaping, the harvest last reaped, and the farmers' granary.
- **Each season** (`harvestSeason`, `turn/economy.ts`): the crop grows by `harvestNow` (the season's hands, the men
  weighing more at sowing and harvest, droughts and floods: as item 10+a's harvest). In the province's reaping season
  (`reapSeasonOf`, `model/geography.ts`: the last of its busy seasons, Shemu everywhere but the Anatolian plateau, which
  reaps in Akhet) the crop is reaped, cut by plague and absorption as the old harvest was (`yieldFactor(..., true) /
  obeyedIn`), into the granary, and becomes `reaped`. Signal `harvest-reaped`.
- **The tax** is reckoned from the last harvest: each season a third of `reaped` at the province's rate, cut by
  absorption and nothing while besieged (`yieldFactor`), taken from the granary as far as it holds, into the stores (what
  does not fit lost). A land without a king pays none. `effectiveYield` (the view's `tax`) is that figure.
- **The farmers eat** from the granary (`_foodNow` is the granary after the tax, less what troops forage: `feedTroops`),
  then buy from the market, and what they lack is hunger as before (`peopleSeason`). What is left stays in the granary,
  at most a whole harvest and `LandData.reserveSeasons` (1) season of their need.
- **At the start** (`newGame`): with `h` a season's harvest at the start and `d` the seasons until the reaping
  (1 to 3, counting the first), the crop is `h × (3 − d)`, the last harvest `3h` and the granary `h × d`.
- **The score** is unchanged: `landWorth` counts the land by its people over the year (`harvestNow(id, false)`).
- **What a king sees**: `ProvinceEconomyView.harvest` is now a season's share of the last harvest (what the tax is
  reckoned from); `granary`, `crop` and `reapsIn` (seasons until it is reaped, 0 this season) are new. A model king reads
  the granaries, the crops, when each land reaps and the granaries that will not last (`peopleLines`); the rulebook's
  PEOPLE and ECONOMY parts say it. The web app's province panel shows the last harvest, the granary, the crop and the
  reaping season.
- **Script kings** (`bots/land.ts`): `bearableTax` is also bounded by the granary over the seasons until the next harvest
  feeds them; `famineFeeding` reckons next season's food from the granary, the harvest if it is reaped then, and the tax.

### Haakon's answers

- **Model envoys alter clauses** ("Full press"; see `14-structured-press.md`, "Model envoys"): in the call that phrases
  their words, `leave_out`, `add_courtesy` and `gift_stated` for the clauses they recite, `answers_left_out` and
  `refusals_as_accepted` for the answer they report (`recitedBy`, `reportedBy` in `llm/src/character-mind.ts`).
- **Winter takes men by size and supplies** (`turn/winter.ts`, `loseToWinter`): a troop crossing a pass or the open sea in
  winter loses `winterArmyLoss` (30) in a hundred of a full army's men, a fleet `winterFleetLoss` (25) of a full fleet's,
  in proportion to its men; `WinterData.suppliedPercent` (50) of that if it carries a season's food; the weather draws
  between half and half again as much. On a pass `WinterData.desertPercent` (50) of those lost desert and are loose where
  it set out. A troop left with fewer than `LandData.levyLeast` (100) men is lost whole. Signals `winter-loss`,
  `winter-crossed`.
- **Passage by order** (order `grant {grantee, kind, province, seasons}`, model `grant_passage`, `grant_basing`):
  a `Grant` with no tablet (`tabletId` ""), standing from next season over land held now; the grantee's court knows it
  from `heardTurn`, the seasons a messenger takes between the capitals (`travelTurns`). It ends as a tablet's grant does;
  `revoke` ends one not yet begun too (`grantLive`). Signal `granted-by-order`. The web app's Court has a "Grant passage /
  Grant basing" row.
- **Levies sized by men** (`levySize`, `model/land.ts`): a full levy (5,000 men, a fleet 2,000) where the province has
  them, else every man of fighting age at home and not away, none below `levyLeast` (100). A unit's price, pay, food and
  what it carries are its share of a full unit's (`shareOfFull`, `forMen`, `unitFood`, `unitCarried`). **In battle a unit
  counts by its men** (`unitWeight` in `rules/adjudicator.ts`): every strength, wall, ground and resistance is reckoned in
  thousandths of a full unit (`FullUnit`), and reports name strengths in units to a tenth (`strengthWords`).
  `UnitView.men` shows every seen unit's men; a model king reads ", 600 men" by a unit short of a full levy.
- **Runaways by what they keep** (`bestRefuge`, `turn/borders.ts`): the farmers weigh their land's living score (how well
  its countryside ate last season, times what the tax leaves them) against the best neighbour's; where it beats home by
  `refugeMargin`, `runPercent` in a hundred of the share they would gain run each season, hungry or not.
- **The king chooses how many mouths** (order `expel {province, percent}`, model `expel_mouths` with the amount): of the
  mouths still inside, up to `LandData.expelMost` (90) in a hundred of the town in all; more may be put out later.
  `ProvinceEconomyView.expelled` is now the share put out.
- **Water from a dossier per city** (`CityWaters`, `model/geography.ts`, from `docs/history/10-water.md`): River,
  Spring and Wells never fail; Outside (a spring outside the walls, cut off: Megiddo, Shechem, Tuwanuwa) and Cisterns
  last `CisternSeasons` (4); Arid `WellSeasons` (2); Island `IslandSeasons` (1) once blockaded. `SafeWater` and
  `IslandWater` are gone (`isIslandWater`).
- **Deportees freed on the road** (`Walk.route`, `departs`, `from`; `deporteesOnRoad`): deportees walk the cheapest road
  as a company; each season they cover their share of it, and where the stretch holds troops of the king whose homeland
  they were taken from, or of one who closed his roads to the deporter, they are freed: loose men there, with the gold
  they carried. Signal `deportees-freed`. Returned runaways walk as before.
- **Loose men outside a besieged city rob only its countryside** (`robbing`): the farmers' granary at the same rate,
  never the purse or the stores, which are inside the walls.

### Found at the audit

- **False names had stopped** since item 11a (0 in 50 games against item 10's 413): a traveller arriving at a court was
  met by its own name, and pitches are now in person. A traveller now chooses on setting out the name it gives where it
  arrives (`LifeChoice.goAs`, `LifeView.alias`, `CourtSeen.stranger`; model field `go_as`; `Journey.asName`), declared on
  arrival at a court that knows nothing of it (`travellerArrives`); script characters by item 10's rule
  (`wantsFalseName`).

### Script kings

- **Watching spies** (`statecraft-court.ts`): a cunning or careful king with two people to spare posts one to watch the
  province of its war's foe, or the most hostile neighbour, nearest its capital that it cannot see (within four hops),
  one at a time for each foe. Signal `spy-watching`.
- **Winter strokes by sea** (`tactics.ts`, after the strokes over the passes): an army on a coast carried by free fleets
  over a chain that crosses the open sea, to a coast it could not reach by winter's safe waters, where no rival could
  step in, when what it wins outweighs the men the storms take from it and the fleets (`winterLoss`). The strokes over
  passes weigh the men lost the same way.
- **Passage by order** (`leaveByOrder`, `bots/authority.ts`): leave a friend asked that the king would grant but did not
  seal, and passage for a sworn ally pleaded with to relieve a besieged city.
- **Levies**: only where at least half a full levy can be raised (`canLevy`); `levyCost` and `settleThere` by the men.
- **Mouths**: as many as make the stores last two seasons, a tenth at least (`borders.ts`).
- **Deportation**: only to land whose road no freeing troops they see stand on.
- `--no-land-play` etc. are unchanged; no new switch: the new levers are every script king's.
