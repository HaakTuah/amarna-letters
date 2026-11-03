# A far levy's dropped orders wait for word of it (bug #569, side lane, 3 November 2026)

PR #610. Issue #569: when a scheduled levy in a far province raised no unit, the orders waiting for its unit were dropped
from the court's list at once, and "Orders for a levy that raised no unit dropped" went straight to its inbox, while the
"Levy failed" notice itself came by the road (#537).

## Step 0

`turn/plans.ts` (44 KB) and `model/sleep.ts` are under the 50 KB mark; `resolve.ts`, near it, is not changed.

## What changed

- **The drop comes when the court learns the levy raised none** (`unraisedLevies`, `turn/plans.ts`): for a levy that
  failed in its province (too few men, the land lost or ceded, or not empty after movement), by the road from there, in the season
  of its "Levy failed" (`levyFailed` keeps that season, `heardAt`); for one the court knows of at once (refused at court,
  short of gold, not given after all), at once, as before. One notice for each season it comes in. The orders stay in the
  seat's list, unbound (as "the army to be raised in nubia in turn 3"), so they cannot run, until that season
  (`PlannedOrder.unraisedHeard`), and leave it then. One whose own season comes first is skipped then, unseen, as it
  would have run unseen.
- **Rulebook** (`llm/src/rules.ts`): the orders are dropped, and the news says so, "as soon as you learn it raised none:
  by word from that province, if it failed there; until then they stay in your list, and cannot run". **Design note:** `05-pacing/03-scheduled-orders-and-the-march.md`.
- **Save version 53** (52 goes to #606, bug #565): a scheduled order's new field, and the notice's new timing.
- **Tests:** a twin in the twin canary (Egypt's court at Nippur, far from its homeland; a levy in Nubia whose men are
  gone in the twin where the fact is true), which fails on `develop` with the drop's notice and the shrunken list; two
  engine tests (`levy-word.test.ts`): the order stays listed until the word's season and is dropped and told then; and
  a far levy refused at court for want of gold drops its orders at once.

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

(at the final code: below)

## Review, round 1

Codex: (below). Claude's reviewer (Opus, high): 7 of 10, one blocking, three not, all fixed:

1. **A levy the court knows failed at once** (blocking): refused at court, short of gold or not given after all, its
   orders' drop was timed by the road all the same, so a seat told "not enough gold" still saw the levy's army in its
   list for seasons, and the rulebook's new words were untrue for it. Now only a levy that failed in its province
   (`levyFailed`) waits for its word; the rest drop at once. A test of a far levy refused for want of gold; the
   rulebook reworded.
2. **Grouped by province:** two near levies failing in one season gave two notices; now grouped by the season the word
   comes, so near seats read one notice, as before.
3. **The design note** said the view names the unit by its levy "until the levy's season": and for a failed levy's
   orders, until its word comes.
4. **Placeholders in the report:** filled.

One idea (Opus): a far province's report comes home a season before a notice told from the same province, two clocks
for one road; aligning them would close the twins' one-season blind gap.

Questions for the owner: none.
