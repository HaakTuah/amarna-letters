# People moving in the fog (side lane, 2 November 2026)

Haakon (2 November 2026, `docs/archive/instructions.md`, the entry quoting it):

> Who are these people i can see moving about in the fog of war when viewing a game as egypt? Different caravan and
> what looks like scout units or something?

## What they are

I played script games in the built app as Egypt (Playwright, 3, 8 and 24 seasons) and listed every figure the map
drew, with its title, season by season. His own Haiku game (seed 407184) is save version 38 and no longer replays, so
it could not be checked directly; the figures below are the ones such an opening shows. Nothing Egypt should not know
was drawn. The figures moving through Egypt's fog are of three kinds:

1. **Egypt's own caravans.** A trading caravan crosses foreign land to a market and comes home (Qatna to Qadesh,
   Biruta to Gubla, Ṣumur to Ugarit in the games played). A court knows its own caravans wherever they are: the
   engine's view gives each king his caravans with their place (`views.ts`, `v.caravans`), so script and model kings
   have them too, and the map draws only the viewer's own (`memory.ts`; `docs/design/43-the-living-map.md`, "Life from
   the simulation"). Their title read "Egypt's caravan", which in Egypt's view looks like any power's.
2. **Egypt's own envoys and spies on the road,** where Egypt believes them (`seatPeople` in `scene.ts`): a round chip
   with the envoy's figure, or an eye, in Egypt's colour.
3. **The nomads' armies next to Egypt:** the Shasu in Seir and the Tjehenu in their land, drawn in the steppe's style
   (two archers), which looks like a scouting party. Both provinces border Egyptian land, so they are in Egypt's sight
   (its land and where its troops stand, within a season's courier ride of its court, and one link beyond: `Views.sight`, `docs/design/01-rules-as-implemented.md`,
   "Sight"), and the Shasu army really is moving (Seir, Hazzatu, Lakisha in the 3-season game).

The white discs with a dotted line along the borders are crossings (passes and fords), not people.

The scene's units come only from each frame's sight, which is the engine's `Views.sight`; caravans are filtered to the
viewer's own and deportees to roads in its sight; travellers are the viewer's own, or foreign envoys at its court. So
there is no leak, and the kings' view needs no change: no benchmarks were run, since no rule, view or script changed.

## What changed: making it plain on screen

- In a court's view a caravan's title is "Your caravan ... You hear from your own caravans wherever they are", and a
  deportees' title ends "in your sight" (`life.ts`).
- The legend says whose figures a king's view shows: the caravan "in a king's view, only his own, wherever it is"; the
  envoy "in a king's view, his own where he believes them"; people carried off "on a road in sight"; and the fog line
  gives the sight rule, with its courier reach ("Distance inside your own realm", `docs/design/35-command-at-a-distance.md`).
- README ("Watching a game") and the design note say the same.
- The test that a court sees only its own caravans now also checks the drawn titles (`map-scene.test.ts`).

The polish lane works on the map's camera and labels, and item 17++ part C (#378) on the map's colour steps: this lane
touched only titles and the legend's words, no drawing.

## Readings taken

1. **A court's own caravans out of its sight are rightly drawn** (the design note's "A court sees its own caravans only,
   as the engine's view tells it"; "Only what the seat knows plays": the engine's view already gives the king them).
   Alternative: draw them only in sight, which would hide from the player what his model and script rivals are told.
2. **The fix is words, not a new look** ("Everything on it comes from the game's own facts, never decoration that
   could mislead"): the figures were true; what misled was a title naming Egypt as if a third party, and a legend that
   did not say whose figures a king sees.

## Helpers

None: one pass, a few files.
