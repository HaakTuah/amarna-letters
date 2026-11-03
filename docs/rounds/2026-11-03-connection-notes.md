# Why some connections take longer than they look (#554, 3 November 2026)

The owner's accepted idea (archive item 182), from the escalation review of #523: a short note, from its sourced basis,
on each connection whose travel days are not the plain distance, shown where the player sees the connection.

## What was built

- `Attested.note` in `src/engine/src/model/distance.ts`: one sentence a player reads, on the five attested
  connections whose length a reason explains, each from the same dossier line as its length (its anchor in
  `DistanceAnchors`, checked by the anchors test): the Ways of Horus out of the Delta and on to Gaza
  (`02-route-delta-gaza`), the Wadi Hammamat road to Mersa Gawasis (`02-route-thebes-redsea`), the Sinai to el-Markha
  (`02-route-sinai-redsea`), and Ur's way down the Euphrates to the Gulf's head (`02-gulf-head`). `connectionNote(a, b)`
  reads it either way round.
- The crossing marks' cards (`src/web/src/map/crossings.ts`) add the note after the journey's days.
- Ur's river to the Gulf is no crossing and no mark shows it, so the province card (`ProvinceInfo.tsx`) adds the note
  and the voyage's days (about 2) after the line on landings from the sea.
- Test: `src/web/test/connection-notes.test.ts`. README ("Long roads") and design note 32.

No rule, number or draw changes; no save version.

## Readings taken

- Only connections whose length is attested get a note: the notes come from the attested basis, so a connection the
  game reckons by the straight line has nothing to explain.
- Ur's note sits on its province card, the one place a player looks at Ur's sea, rather than a new mark on a
  connection no mark draws.

## Questions for the owner

None.
