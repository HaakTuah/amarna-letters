# The twin canary at a second place (#566, side lane, 6 November 2026)

The owner's yes to idea #566 ("Four more ideas from the reviews, accepted" in `docs/BUILD-PROGRESS.md`): every twin in
the twin canary (`src/web/test/twin-canary.test.ts`) played its hidden fact at Nippur, a season of couriers from
Egypt's court, so a leak tied to another distance or road would not show. Each twin bound to a place now takes the place
as a parameter and is played at a second one too.

## Step 0

`twin-canary.test.ts` is 24 KB, under the 50 KB mark; the design note changed is smaller.

## What changed

- **The far place, a parameter** (`Far`: the province, the power that takes or besieges it, its army's home, a market
  a caravan from it goes to). The thirteen twins bound to a place are functions of it (`AtPlaces`); the eight bound to
  none (a death abroad, the grants and tablets, an ally's word) are played once.
- **The places** (`Places`): Nippur, as before, and Dilmun, Babylonia's island in the Gulf, two seasons of couriers from
  Akhetaten and reached only by sea, so another distance and a sea crossing. Every twin at Dilmun plays one season
  longer before word comes than at Nippur.
- **When word could come, read from the place** (`reportOf`, the season of the newest report the seat has of it): the
  siege twins stopped at a fixed season (two or three) with no word, which fits Nippur only; they now play until a
  report of the fact's season has come, wherever the place is. At Nippur they now run a season further than before.
- **Test titles** name the place ("…, at dilmun").
- **Design note** 13 ("Travel and news") says the twins are played at two places; its stale list of #540's leaks
  (fixed) points to the test's `Known` instead.

## What it found

At once, one leak at Dilmun that Nippur hid: Egypt's king holding court at Dilmun, the levy that raised nothing in
Nubia (two seasons of word from there) still shows its army holding in Kush in the next season's movements notice and
in `lastSeason`, before word of the levy could come. It is bug #600's family (a far unit known by its reports, the
far-units lane, PR #612), so it is listed under `Known` with #600, beside that twin's other #600 entries, for that lane
to clear.

## Readings taken

- **One second place, Dilmun.** The issue asks for "a far province of another power, or one reached only through winter
  roads or by sea": Dilmun is another power's land (Babylonia's), reached only by sea, and farther. A place whose road
  differs in winter (Ur from Akhetaten: two seasons in Peret, one otherwise) would be a third run of every twin; the
  levy twins already cross winter seasons. Principle: the smallest game that tests the rule (archive item 28).
- **A leak the second place finds that another lane is fixing is listed as known, not fixed here,** since #612 changes
  the same engine files for #600. Principle: lanes keep to different files.

## Checks

`scripts/test.sh`: passed. The twin canary takes about 22 s (12 s before) in its own worker.

Questions for the owner: none.
