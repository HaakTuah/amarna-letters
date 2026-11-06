# A court's own people, their places named once and by name (bug #734, 6 November 2026)

The line describing each of a court's own people (the People tab, a person's card, and the seat view a model king
reads) showed a province's internal id ("governing kizzuwatna · in kizzuwatna") and said an envoy's court twice ("at the
court of Kaska as envoy … · at the court of Kaska"). "Requests are rules too": no internal ids a king could repeat.

## Step 0

Every file changed is under the 50 KB mark (`rules/views.ts` the largest).

## What changed

- **Names, not ids** (`rules/views.ts`, `dutyText`, `whereText`, `placeName`): a governor, a general, a band's leader and
  a spy on his quiet errand name their province as the map does ("governing Kizzuwatna").
- **Each place once**: an envoy at a court is "as envoy", where he is the other half of the line says ("at the court of
  Kaska"); a ruler is "ruling in his own name"; "in …" is left out where the duty already names the province (governing,
  commanding, leading, watching a province).
- **A place field for looking one up** (`CharacterView.province`, the province id one of the court's own people stands
  in, as his duty has it; `Cover.province`, frozen with the rest of what a court believes): the script kings read it
  (`bots/freedom.ts`, `watchedProvinces`) instead of cutting an id out of "in …". The field follows the duty, not the
  person, so a spy caught out of sight shows the same place as one still free (the cover tests' twin found it).
- **Save version 63** (the cover's new field).

## Measured

The same 10 script games (seed 1) before and after print the same summary line for line: the script kings play exactly
as before. `scripts/test.sh`: 1633 passed, 1 skipped.

## Review (Codex, round 1)

One finding, fixed: a spy caught out of sight and then recalled by his unknowing court had his place written by the
recall's own path (`recallCovered`) with the province's id, unlike a free spy's; it now names it, and keeps the place
field, as the free one's line does. A test compares the two.

## Readings taken

- **"In …" dropped where the duty names the place**, rather than the duty's place dropped: the duty says what he does
  there, which the place alone does not. Principle: each fact once, in the words that carry the most.

Questions for the owner: none.
