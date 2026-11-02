# A governor's letter says where he now sits (#480)

The owner's words (2 November 2026, in the design chat, archive item 170): on #480, "Sure, don't really know what it
involves from the little you shared." Queued in "Follow-ups" in `docs/BUILD-PROGRESS.md`: "his seasonal letter says
where he now sits, truly or not, as he chooses by his stakes", right after item 17++ part C.

## Built

- A governor of several provinces whose seat moved (the province he sat in lost or given up, item 17++ part C) before
  his king heard of it writes from his new seat that he sits there now, if he is loyal to his king. The king's view shows
  the new seat from the season that letter can be read, if that is sooner than word of the province (`seatLetters` in
  `src/engine/src/turn/unrest.ts`, run with the governors' seasonal reports).
- One who wants his land for himself (the test that has him call his people quiet, `wants`) says nothing of it, and his
  king learns of the move only by the road, as before.
- Rulebook (`rules-command.ts`, Governors) and design note 49. Test: `seat-word.test.ts`.

## Readings taken

1. **"Truly or not"**: a governor who wants the land keeps silent about the move rather than naming a false seat. His
   lie is the one he already tells, that all is quiet. A false seat would only delay what the road brings in any case, and
   an order sent to the seat the king believes in reaches the man all the same (part C's escalation round). Principle:
   "Deceit is information"; "Stakes, not dispositions".
2. **Who chooses**: the governor, by the same stakes that decide his mood reports. A model governor is not asked
   separately, since the seasonal report is not a request today; a model governor's choice comes with the request that
   gives him his reports, when there is one. Principle: "Every feature is every seat's", for kings: the script kings
   read the seat through the view as they already do.
3. **No use against ignore**: the choice is the governor's, made by his traits, and no script king has a lever to use or
   ignore; what changes for a king is only when he learns the move. Principle: "Using a feature must pay" applies to
   kings' features.

## Benchmarks

None run: a script king's play changes only in the seat it is shown, and only for a governor of several provinces whose
seat has moved, which part C's runs found rare.

Questions for the owner: none.
