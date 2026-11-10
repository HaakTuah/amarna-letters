# A far unit's orders refused, and their road (bug #759, side lane, 7 November 2026)

Left over from #615 (#760). `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **A refused order for a far unit of a king's own** (`refused` in `turn/resolve.ts`, "Orders that could not be
  carried out"; a scheduled march refused, `endMarch`) is told by the road from where the unit truly stands, naming the
  unit where his view shows it (`placesKnown`). It was told at once, naming the true place. A unit lost out of sight
  is told of by its copy, as it was checked.
- **A scheduled order not yet reached** (`notYetReached` in `turn/plans.ts`) is put back by the road to where the king's
  view shows its unit, not to where it truly stands.
- **Tests:** `src/engine/test/units-known.test.ts`, "A far unit's scheduled order refused where it truly stands…"; a twin
  in `src/web/test/twin-canary.test.ts` ("a far army's scheduled order refused where it truly stands").
- **Docs:** design note `35-command-at-a-distance.md`. **Save version 73.**

## Readings taken

1. **An order for a far unit is refused where the unit is**, since it is carried out there: its king learns of the
   refusal as he learns of everything else from there. Principle: hidden information ("Distance inside your own realm").

## Not done here

- The issue's first point, other orders for a far province checked "as if the army stood" in a season a standing order
  fires for a gone one: enlisting a band rides to the province and, finding no army there, does nothing and says
  nothing. So no leak was found; the silence is the same whether or not the army stands.

## Questions for the owner

Questions for the owner: none.
