# A far unit of a king's own, the rest of it as reported (bug #615, side lane, 6 November 2026)

Issue #615, built on #612 (bug #600, a far unit's raising and end): its brief is the issue's last comment. A seat's own
unit beyond its couriers' season was shown by its last report for its place and men, but much else a king was shown or
told of it read the unit as it truly is, at once. `scripts/usage.sh` reads "unknown" in this session.

## Found first, by the twin canary

Four new twins in `src/web/test/twin-canary.test.ts`, each an army or fleet of Egypt's two seasons of word from its court
at Nippur, each failing on `develop` before the fix:

- **a far army moved out of sight** (it marches on to Thebes while its king recalls its commander, gives it a mandate and
  orders its food): the notices named its true place, and its commander's line at court said where he truly was;
- **a far fleet gone hungry out of sight**: the treasury notice and the hunger event told of it at once;
- **a far army's scheduled march stopped out of sight**: "A march is held up" came at once, the schedule in the view
  shifted at once, and the commander's record of battles at court counted the lost fight at once;
- and, from the first: **loose men robbing a far province** of the king's were told at once (the army's coming changed
  what they took), a far-province leak (#540's kind) fixed here since the twin found it ("Bugs don't wait").

## What changed

- **Where its king believes it stands** (`placesKnown`, `placeKnown` in `rules/units-known.ts`, by `ownPlaces`): his
  scheduled and standing orders as his view shows them (`asShown` takes a place; they run on the unit itself), a standing order's
  "when your army in X is attacked", "Command granted", "Command taken back", "Mandate sent", the word on its food and
  the gold for it (`setSupply`), pay or food held back in a province (`setUpkeep` and its check), a march's notices, and
  his commander's duty at court (`commanderKnown`).
- **By the road** (`tell`, events by `nearOf`): a far unit's hunger, a winter crossing and its losses, a march held up or
  ended (from where it stands; a refused one, at court, at once), troops joined, walls stormed, colonists settled, a
  commander's defection or victory, the land's men holding it off. Its missing pay, pay held back and food bought or
  taken are its own report's, as its missing pay already was.
- **A far unit's schedule** changed out there (a march held up, ended, or still on a long road) is shown as it was until
  word of the change could come (`SleepState.scheduleUnheard`, `scheduleKnown`); orders the seat gives that unit since
  are shown.
- **A commander's record of battles** at court is his unit's newest report's (`unitReport` adds it to the trail).
- **A part that stays its king's** when the rest of a far army leaves him (a commander's defection, a governor turning
  with his levies) is a new unit known once word of the parting could come (`Unit.raisedAt`, `since` the parting).
- **Gold sent with word on an army's food that finds it gone** comes home with the courier as word from there does
  (`Remittance.food`), not into the treasury at once; it is not among the gold sent to coffers in the view.
- **The map** draws the viewer's own units where and as its view shows them (`Views.ownUnitsShown`, a frame's
  `knownUnits`, read by `buildScene` and the court popup's count).
- **Tests:** the four twins; `src/engine/test/units-known.test.ts`, "FarUnitToldTests" (a part left behind, food gold coming home, pay held
  where the view shows the troops).
- **Docs:** design note `35-command-at-a-distance.md` ("A far unit, the rest of it as reported"), the README's map
  paragraph, the rulebook's commanders line. **Save version 70.**

## Readings taken

1. **The man or the word sets out for where the king's view shows the unit** (command, recall, mandate, food), so the
   season it arrives is reckoned from there, and the notice that says it is true. Principle: hidden information, as the
   game in one page has it ("you see only what your servants report"): a king sends to where he believes his troops are.
2. **A scheduled march is carried out at the unit**, so what becomes of it is the unit's news: held up, ended or still
   on the road, it comes home by the road, and the seat's schedule shows what he last knew. A move refused when the
   orders were checked at court is the court's own news, at once.
3. **A far unit's pay, food bought and food taken** are its own report's, not the treasury's, as #587 already had for
   its missing pay: the view's unit shows them, as reported.
4. **The robbery of a far province** is told by the word from there, as its other news is (#540).

## Not done here

- Orders that ride with a far unit's province in a season a standing order fires for a gone one (enlisting a band,
  shipping by a gone fleet) are still checked on the true state where they run; and a scheduled order not yet reached
  is reckoned from the unit's true place (`notYetReached`). A scheduled or standing order that comes due runs on the
  unit itself, from where it truly stands (Codex's review: naming it by its report broke it), so one refused names that
  place in the court's notice at once. Filed as #759.
- No twin for a winter crossing (the change is the notice and events above, by the road); the far-fleet twin covers the
  same path for hunger.

## Script kings and benchmarks

No rule changed what a seat can do: only when and how it is told. The bot benchmarks run as a regression check
(below).

## Questions for the owner

Questions for the owner: none.
