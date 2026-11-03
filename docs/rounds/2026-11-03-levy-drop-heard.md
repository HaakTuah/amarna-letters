# A far levy's dropped orders wait for word of it (bug #569, side lane, 3 November 2026)

PR #610. Issue #569: when a scheduled levy in a far province raised no unit, the orders waiting for its unit were dropped
from the court's list at once, and "Orders for a levy that raised no unit dropped" went straight to its inbox, while the
"Levy failed" notice itself came by the road (#537).

## Step 0

`turn/plans.ts` (44 KB) and `model/sleep.ts` are under the 50 KB mark; `resolve.ts`, near it, is not changed.

## What changed

- **The drop comes by the road** (`unraisedLevies`, `turn/plans.ts`): the notice is told from the failed levy's province
  (`tellAt` at `heardAt`, the clock of "Levy failed"), one notice for each province. The orders stay in the seat's list,
  unbound (as "the army to be raised in nubia in turn 3"), so they cannot run, until that season
  (`PlannedOrder.unraisedHeard`), and leave it then. One whose own season comes first is skipped then, unseen, as it
  would have run unseen.
- **Rulebook** (`llm/src/rules.ts`): the orders are dropped "once word from that province comes; until then they stay in
  your list, and cannot run". **Design note:** `05-pacing/03-scheduled-orders-and-the-march.md`.
- **Save version 53** (52 goes to #606, bug #565): a scheduled order's new field, and the notice's new timing.
- **Tests:** a twin in the twin canary (Egypt's court at Nippur, far from its homeland; a levy in Nubia whose men are
  gone in the twin where the fact is true), which fails on `develop` with the drop's notice and the shrunken list; an
  engine test (`levy-word.test.ts`) that the order stays listed until the word's season and is dropped and told then.

## Found by the twin, left to their issues

The new twin shows the far levy's army itself at once in the twin where it is raised: `view.units`, `view.upkeep`,
and the waiting order bound to it in `view.scheduled` (the far unit known by its reports: #600, next in this lane), and
the levy's price and its army's pay leaving the treasury at once (`view.gold`, `view.strength`, the treasury notice's
"Paid: your troops": #587). They are listed as known in the canary, the scheduled list's only where both twins list
the order, so the drop this PR fixes cannot hide behind them.

## Readings taken

1. **The twin knows of the levy once the report of its season comes,** not only by "Levy failed": a far province's report
   (#540) reaches the court a season before a notice told from it (`wordSeasons` against `heardAt`), and it is honest
   word. Principle: "Hidden information" asks only that nothing be known before some word of it could come.
2. **A dropped order whose own season comes before the word is not listed after its season,** as an order that ran is
   not; no notice is due then, since none would be in the twin where it ran. Principle: the same receipts until word.

## Benchmarks

(below, at the final code)

## Review

(below)

Questions for the owner: none.
