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
  the king's, come home as their own "Word of your troops" notice, with the place and season they are from (`farMovements`); a far
  loss wakes a sleeping seat when that word comes, and a scheduled move or support stopped far off wakes it by word too
  (`wakeFrom`, as #537 did for other orders). `GameState.lastSeen` holds the king's own outcomes only where his
  couriers reach.
- **Rulebook** (`llm/src/rules-command.ts`), **README** (the map paragraph), **design note**
  `35-command-at-a-distance.md` ("Far troops raised and gone"). **Save version 62** (54 on the branch until it was merged with `develop`, which had reached 61).
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

The regression check (`scripts/sim.sh --games 20 --seed 1 --verify-replay`), at the code after review round 2: 20 of
20 games replay exactly. Winners: Babylonia 11, Egypt 7, Hatti 1, Seha 1 (`develop` at the same seeds: below). The
suite: 1635 tests pass.

## Review, round 1

Claude's reviewer (Opus, high): 6 of 10, three blocking, five not, all fixed:

1. **An order for a gone unit was refused at once** ("you have no unit in nippur", blocking): it rides out now, and its
   failure comes home by the road (`orderMissed`); an engine test.
2. **Exits that bypassed `loseUnit`** (blocking): a gift of troops, levies following a rebel, a fleet into cargo service
   now keep a copy for the old king (`keepGone`); the gift's notices come by the road; reading 2 corrected.
3. **A commander's duty changed at once** (blocking): covered (`coverFor`) until word of the army's end; the twin has a
   commander, and a standing order for the army.
4. **Battle events:** a side reads them where its notice is told from (`seeing`'s `told`).
5. **A start unit lost before its first report:** every start unit has a report from the start (Codex's point 3).
6. **A doubled comment** in `core.ts`: one.
7. **The #587 mask hid all of strength:** the canary now tells a strength difference beyond the treasury's gold apart.
8. **Small things:** the `lostUnits` comment, the README's wrap, and a scheduled order due for a gone unit is told
   (`orderMissed`).

Codex, round 1: three P1, all fixed:

1. **A far levy's army lost before word of its raising** lost its orders at once (`lostUnits`): an order is dropped only
   once word that its unit is gone could come (`goneHeard`), whether or not its raising was known.
2. **Its levy name in the scheduled list** changed at once: `plannedAsKnown` finds it among the gone too. An engine test
   of both.
3. **A starting unit lost in the first season** had no report to show: every unit a game begins with has its first
   report from the start (`unitReport`, `rules/factory.ts`), so none is ever shown as it is for want of one.

## Review, round 2

Claude's reviewer: 7 of 10; round 1's points closed but two blocking, four not, all fixed:

1. **Command, relieve, mandate and supply for a gone unit** were refused at once (blocking): their word rides out by
   courier and fails where it arrives (`orderMissed`); the twin gives `supply` every season too.
2. **A gift's event** showed the giver at once (blocking): only where his couriers reach.
3. **The commander's word** was timed a season late: from the gone army's own season and place.
4. **`orderMissed`** tells an order whose supported or carried unit is gone too.
5. **The view and the orders** could pick different units where a gone unit's report shares a place with a live one:
   the gone one gives way in both (`unitShownAt` takes live units first; `unitsSeen` moves the gone one).
6. **Wraps** in the README and design note 35.

The second benchmark run crashed too: a part of an army kept by a defecting commander in a province its king's couriers
cannot reach at all stayed shown, since word never comes from there. A unit's raising and its end there are known at
once, as a unit there is shown as it is (`heardFrom`). A third crash: a gone army's end was timed on the road as it was
the season it ended, while the view reads today's roads, on which its province had come within the couriers' season;
`heardFrom` now reads it known where the couriers reach now, as the view shows the place, and `unitsSeen` keeps the
map's one unit to a province, a gone unit with no older report free left out rather than shown over a live one.

## Review, round 3, and the escalation

Claude's reviewer, round 3: 7 of 10, two blocking (command, relieve, mandate or supply alone for a gone unit was still
refused at once, since the courier path left the order in the submission; and such an order brought no notice at all,
where one for a unit that stands brings "Command taken back", "Mandate sent" or "Command granted" in its season), one not
(a gone unit hidden by the one-unit-to-a-province guard changed the count). Codex, round 3: the first, and the order
lookup reading a gone unit's newest report where the view shows it at an older one.

The escalation helper (Opus, high) fixed all four:

1. **The order stays in the season's orders,** checked and carried out on the gone unit's copy as on a unit that stands
   (`TurnEngine._goneNow`, `commandedUnit`, the validator's `Checking.gone`): the same refusals, the same notices, the
   man setting out; its word then rides out and finds the unit gone (`goneWord`, `orderMissed`). `sendOrders` never
   hands back the submission as given (an order stopped on the road, or renamed, was in it before).
2. **One placement for the view and the orders** (`ownPlaces` in `rules/units-known.ts`, used by `unitsSeen` and
   `unitShownAt`; `shownAt` removed): units in id order, live or gone alike, so neither the view nor the orders depends
   on whether a unit is gone. Reading: a far unit, live or gone, with no free older report where its newest shares a
   place is left out of the view and cannot be ordered until its reports part, as before for live units.
3. **Tests:** two twins (an army lost out of sight, then `relieve` alone, and `mandate` alone; `orders` may now be a
   function of the season), and engine tests of the four orders' receipts lost or standing and of Codex's case.

Left out, as #615's: a live far army's recall shows at once in the view.

The helper found that its worktree's packages pointed at this lane's other worktree, so earlier probes there tested
that one; and so did #613's benchmark, run in a third worktree linked the same way. #613's proof was not rerun: #613
merged long since, and `develop` has changed its code since, so a rerun would prove nothing of it.

Also: the first benchmark run crashed (a script king keyed its own troops by province, and a gone army's report could
share one with a live army); a gone unit now moves to an older report like any far unit (`reportIndex`).

## Blocked, then decided

Codex's review of the escalation's commit found one more P1: a scheduled or standing order for a far unit lost out of
sight is refused at once, since binding it (`TurnEngine.bind`) and checking a standing order's target look only at the
units in the game. The review limit was reached, so the PR stayed a draft: question #621.

The owner (3 November 2026; archive item 204) chose the first alternative: a fresh session fixes the one case, the PR is
reviewed again, and it merges at a clean review; no fifth Codex round, the next review by the fallback reviewer.

## The last case (6 November 2026)

- **Merged with `develop`** (372 commits): the road home (#616's `wordFrom`, `wordHomeAt`) now times what a king hears of
  his far troops (`reportIndex`, `raisedKnown`, `goneHeard`, a commander's leaving), replacing the road out this branch
  used; `shownAt` gave way to `unitShownAt` over `ownPlaces`; the far lines of the season take `develop`'s new wording
  (holds grouped, "Your ..."); #587's known leaks for the far-troops twins are gone, as `develop` fixed #587.
- **A scheduled or standing order for a far unit lost out of sight is kept** (`ownNamed`, `turn/plans.ts`): `bind`, the
  unit supported or convoyed, and a standing order's "when your unit is attacked" name the seat's own unit there, or,
  where none of its own stands, the gone one its view still shows there. It is kept bound to it, fails where it arrives,
  and drops when word of the end comes (`lostUnits`), as one given this season does. Test: `units-known.test.ts`
  ("A scheduled or standing order for a far unit lost out of sight is kept ..."), failing before the fix.

Questions for the owner: none new (#621, answered and closed).

## Review after the decision: the fallback reviewer (Opus, high)

Round 1: 6 of 10, two blocking, seven not:

1. *(P1)* A standing order for a far unit lost out of sight fired at once with no orders, telling its king the unit
   was gone. Fixed: `standingRuns` weighs the gone unit's copy as one that stands (word reached it, the king or its
   commander there, what it sees), a "when your unit is attacked" order waits on the copy's province, and its orders
   ride out and fail where they arrive (`Firing.sent`, `goneWord`), listed among those it gave. Test: "A standing
   order for a far unit lost out of sight fires only as it would for one that stands", failing before the fix.
2. *(P1)* A unit that left its king twice (a fleet back from cargo service, then lost) was lost to him by its first
   leaving's word. Fixed: `keepGone` keeps only the newest leaving. Test: "A unit that leaves its king twice ...",
   failing before the fix.
3. *(P2)* Two twins gave their order after the season they compared. Fixed: the order in the season of the loss.
4. *(P2)* Word of far troops came titled "Movements last season". Fixed: "Word of your troops", from the place and of
   the season it tells (`farMovements`).
5. *(P3)* A commander's leaving was timed by today's road. Fixed: `wordHomeAt` from the season the army ended.
6. *(P3)* A twin knew the fact by the notice it tested. Fixed: timed by the road home.
7. *(P3)* The engine tests timed word home by the road out. Fixed: `wordFrom`.
8. *(P3)* The report promised numbers it lacked. Fixed: the benchmarks below; #613's rerun withdrawn, with why.
9. *(P3)* A part split off a far army has no reports, so it is shown as it is. Moved to #615 (it predates this PR and
   is the rest of a far unit as it truly is, which #615 builds next).

Round 2: 8 of 10, one blocking, two not:

- A. *(P1)* A fired standing order's own orders for a gone unit took a path of their own, unchecked: an order the
  validator refuses was told as given, and one that would displace or be displaced could differ. Fixed: they stay in
  the season's orders and are checked on a state where the copy stands (`_riddenNow`, `resolveSeason`), so a refusal
  reads as for the unit that stands; given, they ride out (`goneWord`) instead of running. Orders of command, recall,
  mandate and food go by the copy as this season's do (`_goneNow`); only the unit supported or carried being gone, the
  order runs and finds nothing. The feint check reads the copy where the move goes. Test: "A commanded far army's
  standing order, fired after it was lost out of sight, ..." (Hatti's army at Taidu, a season of word home beside land
  its king sees), given and refused, failing before the fix.
- B. *(P3)* Point 8's answer said "fixed" before the numbers were in. Fixed: the benchmarks below.
- C. *(P3)* An export nothing imports. Fixed.
