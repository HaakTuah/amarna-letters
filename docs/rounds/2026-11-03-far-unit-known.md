# A far unit known by its reports, raised or gone (bug #600, side lane, 3 November 2026)

PR #612. Issue #600: a seat's own unit destroyed far beyond its couriers' season (in battle, by mutiny or plague) left its
view at once, and the standings' Units cell counted it the same way. The twin canary of #569 showed the other side of the
same fact: a far levy's army was shown at once, its upkeep counted and the orders waiting for it bound to it.

## Step 0

`resolve.ts` was 49.7 KB, at the mark, and this lane changes what a king learns of his far troops' movements, which
lived in it: #613 moved the season's movement news to `turn/movement-news.ts` (behaviour proven unchanged), leaving
`resolve.ts` at 43.6 KB. The new work is in a new file, `rules/units-known.ts`, which takes `reportOf` and `trailEntry`
out of `views.ts` (47 KB).

## What changed

- **A unit gone is kept with its reports** (`loseUnit`, `keepGone`, `GameState.unitsGone`, `Unit.goneTurn`, in
  `model/state.ts`): every removal goes through it but a turned levy rejoining its unit in the same season, and so does
  every change of a unit's owner (a gift of troops, levies following a rebel governor, a fleet taken into cargo service),
  which keeps a copy for its old king. His view shows it as its last report has it (`reportOf`: its newest report the
  last it sent) until word of its end could come (`wordCame`, from where it ended), then drops it. One with no report
  yet is not kept: he knows it only as it is, within his couriers' season.
- **An order for it rides out** (`unitShownAt`, `sendOrders`): the king may name it where its report has it; the order
  goes by courier and, finding it gone, its failure comes home by the road (`orderMissed`, "Order failed"), as does a
  scheduled order that comes due for it. A gift of troops far off, made or failed, is told the same way.
- **Its commander** stays in command as his king believes (`coverFor`) until word of the army's end, which tells of his
  leaving, or the man himself reaches court.
- **A unit raised far off is known once word of its raising could come** (`Unit.since`, from its levy's province; the
  troops a game begins with at once; a split keeps its unit's).
- **What reads the court's own troops follows** (`ownUnitsKnown`): the view's units, its upkeep (`TurnEngine.upkeep`
  over the view's own troops) and so its strength, the web standings' Units, and the scheduled list, where an order for
  an army not yet heard of is still named by its levy (`plannedAsKnown`). A sleeping seat's orders for a unit lost far
  off stay until word of its end comes, then drop and are told (`lostUnits`, read as the coming season reads it).
- **News of a far unit comes by the road:** a battle's events name each side only where its couriers reach (the
  "destroyed" event, `battles`' `seeing`); a far unit's lines of the season, and an assault on a far walled city of
  the king's, come home as their own "Movements last season" notice from where they happened (`movementNews`); a far
  loss wakes a sleeping seat when that word comes, and a scheduled move or support stopped far off wakes it by word too
  (`wakeFrom`, as #537 did for other orders). `GameState.lastSeen` holds the king's own outcomes only where his
  couriers reach.
- **Rulebook** (`llm/src/rules-command.ts`), **README** (the map paragraph), **design note**
  `35-command-at-a-distance.md` ("Far troops raised and gone"). **Save version 54** (53 goes to #610).
- **Tests:** a twin in the twin canary (a far army beaten out of sight), failing on `develop` (its view, upkeep, last
  season, two events and the movement notice), passing here; #569's twin (a far levy that raised nothing) no longer
  lists its army's view, upkeep and scheduled binding as known leaks (#600), which the ratchet's last test proves; `units-known.test.ts`: a far unit lost stays as reported
  until word of its end, and one raised far off is known once word of its raising comes.

## Left to their issues

- **#615:** the rest of a far unit as it truly is: its food, pay, march, and the notices and events of its doings that
  are not battles (filed from a search of the code in this lane), and the web map, which draws the viewer's own troops
  where they stand.
- **#587:** the treasury pays a far army as it truly is (one gone costs nothing at once): the twin lists it as known.

## Readings taken

1. **Reports sent before a unit's end still come in after it:** the view moves on through them, never past the last.
   Principle: one clock, the unit's trail, as for a caravan's.
2. **A turned levy rejoining its unit in the same season is not a loss** (it never left its king's reports); a fleet taken
   into cargo service far off is, until word of the caravan's setting out comes. Principle: keep the rule to what a king
   could not know.
3. **A far unit's lines of the season are their own notice, told from where they happened,** not held back from the
   season's notice: the seat reads them when a courier could bring them. Principle: "Hidden information", and requests
   are rules too (no line about troops it cannot yet know of).

## Benchmarks

(at the final code: below)

## Review, round 1

Claude's reviewer (Opus, high): 6 of 10, three blocking, five not, all fixed:

1. **An order for a gone unit was refused at once** ("you have no unit in nippur", blocking): it rides out now, and its
   failure comes home by the road (`orderMissed`); an engine test.
2. **Exits that bypassed `loseUnit`** (blocking): a gift of troops, levies following a rebel, a fleet into cargo service
   now keep a copy for the old king (`keepGone`); the gift's notices come by the road; reading 2 corrected.
3. **A commander's duty changed at once** (blocking): covered (`coverFor`) until word of the army's end; the twin has a
   commander, and a standing order for the army.
4. **Battle events:** a side reads them where its notice is told from (`seeing`'s `told`).
5. **A start unit lost before its first report:** not kept.
6. **A doubled comment** in `core.ts`: one.
7. **The #587 mask hid all of strength:** the canary now tells a strength difference beyond the treasury's gold apart.
8. **Small things:** the `lostUnits` comment, the README's wrap, and a scheduled order due for a gone unit is told
   (`orderMissed`).

Also: the first benchmark run crashed (a script king keyed its own troops by province, and a gone army's report could
share one with a live army); a gone unit now moves to an older report like any far unit (`reportIndex`).

Questions for the owner: none. Filed: #615 (bug).
