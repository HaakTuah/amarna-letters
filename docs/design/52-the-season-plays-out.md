# The season plays out (item 17+++, part B)

The owner (31 October 2026): "the player needs to feel the weight of the whole world, or it becomes meaningless to
him/her." A season is no longer a new picture but a passage of time on the map, paced by meaning; the next season is
computed while it plays. Presentation only: the engine's rules, the log and the save are unchanged. The item's text is
`docs/intent/build-order/item-17.md` ("17+++, the season plays out"); the report is `docs/rounds/2026-11-03-season-plays-out.md`.

## The worker computes ahead, one season and no more

The page tells the worker when it has played a season out (`played`, with the frame's index and the game's generation;
`protocol.ts`). Auto-play (`core.ts`: `loop`, with `page-gate.ts`: `PageGate`) computes the next season while the page plays
the one before, and then waits: it plays season *n* + 1 only once the page has played season *n* − 1 out, so a slow page
never piles up seasons and a fast one never waits. With a human seat awake it does not run ahead at all: he is asked for
his orders once he has seen the season play out. The worker no longer sleeps between seasons; the page's pace is the pace
(the `delay` message is gone).

The page holds the season computed ahead (`client.ts`: `held`), with every update after it, and applies them in order
when the season playing ends (`finishPlayout`): the frames, the state's stream and the panels all move on together, so
nothing on the page shows a season before it plays. A pause, an error or a notice in a held update shows at once. A new
or loaded game, a resume, or more than one season at once shows at once and is acknowledged at once.

## Paced by meaning (`session/pacing.ts`, `map/moments.ts`)

A season's **moments** are found in the scene the viewer is shown (`momentsOf`), so only what the seat knows plays:

| Phase, in order | What | Kind |
|---|---|---|
| arrival | an envoy reaching the court he was sent to (the seat's own, or any in god view) | great |
| march | every march the seat saw (moves, attacks, stand-offs) | routine, together |
| disaster | a ship lost to a storm, men lost to winter, a caravan robbed, drought, flood, plague, earthquake | great where the seat saw it, else news |
| battle | a march that met troops, a unit destroyed where it stood, one per province | great |
| siege | each siege the seat knows of, laid or pressed on | routine, together |
| fall | a city taken or passed, as the seat's map knows it; a city sacked | great where seen, else news |

`paceSeason` lays them out at the speed's **pace** (`Paces`, first guesses, presentation only):

| Speed | Great moment | Together | At most | Marching | Sieges | Closing line |
|---|---|---|---|---|---|---|
| Slow | 2.6 s | 1 | 6 | 1.6 s | 0.9 s | 2.4 s |
| Normal | 1.8 s | 1 | 5 | 0.9 s | 0.5 s | 1.6 s |
| Fast | 1.2 s | 2 | 4 | 0.35 s | 0.2 s | 0.9 s |
| Simulate | 0 | | 0 | 0 | 0 | 0 |

At Fast the routine compresses while a great moment still lasts over a second. A crowded season plays its greatest
moments first, by rank (a fall, a battle, a disaster, an arrival); the rest land with the results, unplayed but told.
News plays nowhere: "a disaster far away is news, not a scene". Simulate (the fourth speed, key 4) skips to the result.

On the map (`svg-renderer.ts`: `playSeason`): the pieces slide together in the marching (`--march-at`, `--march-ms` on the
units' and the people's layers, read by `.unit` and `.traveller` in `playback.css`, which also holds the closing line's style); each great moment's medallion shows in its
turn (`momentMarkup`, the stylesheet's `scene` animation with the beat's delay and length); a unit gone stays where it
stood until the results land (`reconcile`'s `leaveAfter`); the results (who holds what, the fog, the walls, the cities,
the season's arrows) land when the cities fall (`landAt`: the land layers are written then, `holdLand`); and the
**closing line** shows over the map's foot until another season is shown. Stepping back, jumping, or reduced motion
shows the season as it ended (with reduced motion, the closing line still shows). A replay plays each season out the same
way, at least 0.7 s a season.

The closing line (`closingLine`) says what changed, the greatest first: "Sumur fell to Amurru; battles at Gubla and
Qadesh; an envoy reached Babylon; two columns on the march; word came of plague in Mitanni." A seat's quiet season is
"A quiet season, as far as word has reached you."
