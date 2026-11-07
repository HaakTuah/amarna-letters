# Courts by their shown names in the people's lines (bug #797, bugs lane, 7 November 2026)

Found by the polish lane. `scripts/usage.sh` reads "unknown" in this session.

## What changed

- **The lines about a court's own people** (`rules/views.ts`: `whereText`, `dutyText`, `timingText`, `envoyHomeTiming`,
  `captiveText`, and a cover's captive line) name every court with `powerName`, as the game shows it: "at the court of
  Gubla", "has not returned from the Seha River Land", "set out in turn 4 for Urusalim", never the power's id. Before,
  a power whose id differs from its name (Byblos, Jerusalem, Ashkelon, Arwad, Terqa, Seha and others) was named by its
  id in the People tab, on a person's card and in the seat view a model king reads.
- `Views.character` now names powers as the court it is for gives them (`asSeenBy`), as `Views.for` does, so a cover
  keeps the line its master read.
- **The web map** reads a court back from those lines (`placeOf`, the set-out line in `map/scene.ts`): its patterns now
  take the whole name, of several words ("the Seha River Land"), and `parsePower` already knows the shown names.
- The script kings read only "at your court", "watching …" and "has not returned", which are unchanged: four script games
  (`scripts/sim.sh --games 4 --seed 1`) play out the same on `develop` and on this branch (turns, winners, scores).
- **Tests:** `src/engine/test/people-lines.test.ts`, "A court is named as the game shows it, never by its id (bug #797)".
- **Docs:** design note `03-characters.md`. **Save version 80** (the lines a cover keeps in the game state change).

## Readings taken

1. **`powerName`, not `land`,** for the courts named here, as every screen and notice names a power ("Babylonia", not
   "Karduniash"); the spy's "watching …" line, which already used `land`, is left as it was. Principle: build nothing
   outside the item.

## Questions for the owner

Questions for the owner: none.
