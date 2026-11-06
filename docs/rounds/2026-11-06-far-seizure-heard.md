# A far force's seizure of a caravan, heard by the road (bug #675, side lane, 6 November 2026)

Issue #675: when a king's troops or fleet beyond his couriers' season took another king's caravan or ship, his notice
("Your troops at ... took ...") came at once through `notify`, and the `caravan-taken` event listed him whatever the
distance.

## What changed

- `turn/caravans.ts`: the taker's notice goes by `TurnEngine.tell` from the province where it happened, so it comes as
  word from there does (at once within the season's reach, else a season and the road home later); the event is
  visible to the taker only where his couriers reach (`nearOf`), as to the caravan's king (`caravanNear`).
- Test: `map-crossings.test.ts`, "A king hears of his far troops' seizure of a caravan as word comes from where it
  happened (#675)", failing on `develop`, passing here.

## Left to its issue

- #726 (filed here): a captured archive becomes the far taker's copies at once (`archiveArrives`).

## Readings taken

1. **The gold a far force takes is still credited where it is** (its coffer, or its men's savings at sea), as before:
   only what the king is told moves to the road. Principle: keep the fix to what a king could not know.

Questions for the owner: none.
