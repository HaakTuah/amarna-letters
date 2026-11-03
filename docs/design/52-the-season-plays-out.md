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
(the `delay` message is gone). At Simulate (the `simulate` message, `PageGate.free`) there is no gate at all, but a human
seat awake still holds the game for his orders.

**Simulate draws nothing** ("Pace of play": "no visuals at all, the game computed as fast as the machine allows with a
progress bar and a count of seasons, opening in replay at the end"). While auto-play runs at Simulate and no human seat
is asked anything (`client.ts`: `simulating`), the page keeps each season's frame and stream but builds no scene, reads no
state and plays nothing; the game screen gives way to `SimulateProgress` (a bar without an end, since when the age ends
is hidden from every seat, the count of seasons and the date). Pausing, another pace, or the age's end reads the last
season and opens the game there, its timeline holding every season to watch at any pace.

The page holds the season computed ahead (`client.ts`: `held`), with every update after it, and applies them in order
when the season playing ends (`finishPlayout`): the frames, the state's stream and the panels all move on together, so
nothing on the page shows a season before it plays. A pause, an error or a notice in a held update shows at once. A new
or loaded game, a resume, or more than one season at once shows at once and is acknowledged at once.

## Paced by meaning (`session/pacing.ts`, `map/moments.ts`)

A season's **moments** are found in the scene the viewer is shown (`momentsOf`), so only what the seat knows plays:

| Phase, in order | What | Kind |
|---|---|---|
| arrival | an envoy the seat knows to stand at a court he did not stand at before: a foreign envoy received at its own court, its own envoy known (not believed, under a cover) to be there; every one in god view | great |
| march | every march the seat saw (moves, attacks, stand-offs) | routine, together |
| disaster | a ship lost to a storm, men lost to winter, a caravan robbed, drought, flood, plague, earthquake | great where the seat saw it, else news |
| battle | a march that met troops, a unit destroyed where it stood, one per province | great |
| siege | each siege the seat knows of, laid or pressed on | routine, together |
| fall | a city taken or passed, as the seat's map knows it; a city sacked | great where seen, else news |

`paceSeason` lays them out at the speed's **pace** (`Paces`, first guesses, presentation only):

| Speed | Playout (a quiet season at least) | Marching | Sieges | Each great moment | At most | On the result |
|---|---|---|---|---|---|---|
| Slow | about 15 s (9 s) | 3 s | 1.5 s | 2 to 3.5 s | 6 | 4 s |
| Normal | about 6 s (3.5 s) | 1.2 s | 0.5 s | 1 to 1.8 s | 4 | 2 s |
| Fast | about 1 s | 0.45 s | none | the rest flash together for 0.55 s; a capital falling takes 1 s | 2 | none |
| Simulate | nothing drawn | | | | | |

A season's great moments share what its playout leaves after the marching and the sieges, each within its bounds, so a
busy season lasts about its speed's length. At Fast, as "Pace of play" asks, a season is about a second of highlights:
the units slide, the battles, arrivals and disasters flash where they happened, the borders change, and only the biggest
events (`big`: a capital falling; the engine records no king's death yet) take a beat of their own.

A speed chosen while a season plays paces the seasons from the next one on: the season playing ends at the pace it began
at, so the map and the page's timer end it together. A crowded season plays its greatest moments first, the biggest
then by rank (a fall, a battle, a disaster, an arrival); the rest land with the results, unplayed but told. News plays
nowhere: "a disaster far away is news, not a scene".

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

## Smooth on a phone (part G)

The bar is item 17a's (`44-the-crash-and-speed.md`, "Smoothness, measured"): no frame over about 50 ms while a season
plays, at every speed, on desktop and on the phone profile (`soak.mjs --phone`: 390x844, the CPU slowed four times,
software raster). The phone profile's timeline (`--trace`, and `--trace-file` to keep it whole) named three causes, and
each was changed and measured (the numbers are in the item's report, "Part G"):

- **The state's read ran past its budget.** A field was read whole in one step, and the characters and the provinces'
  reports took up to 200 ms at once on the phone. Now a field is read item by item and pauses where its budget runs out
  (`IncrementalReader`: `value` is a generator, resumed by the next task), and a piece read by itself and long enough
  (`LeafReuse`, 48 characters) is kept and reused while it recurs, as containers already were: a province's reports, a
  memory. The new text a season read fell by about a half.
- **A layer written whole cost its parse, its style and its repaint.** A layer is now patched (`map/morph.ts`: `patch`):
  the markup is parsed off the page and only the elements and attributes that differ are written. The tints and the
  season's washes are written in place without parsing at all (`retint`, `reseason`): the season layer keeps a fixed pair
  of slots over each river's fields and each province, hidden where the land shows nothing, and a season writes only
  their looks; the tints are drawn only when what they show changes (`tintsKey`). The works at the cities are written in
  parts, a city each (`patchParts`); the season's arrows are still written whole, since each plays its drawing anew. A
  province's band is traced again only when its holder, its neighbours' or the armies facing it change, and each road's
  path is traced once.
- **The names were placed three times a season, and each time restyled every marker.** Placing them now hides only what
  must give way and shows only what may come back (a hidden marker keeps its box, so it is measured where it stands),
  instead of showing every marker and hiding them again; and while a season's results are held back, the names wait for
  them, so they are placed once a season. The layers' steps start at the next frame, never in the task of the worker's
  message or React's redraw.

On the phone profile at Fast the frames over 50 ms fell from about a fifth to an eighth; the bar is met on desktop at Slow,
Normal and Simulate, not at Fast (3.3% of frames) and not on the phone profile (#666), where the browser's own layerization and paint of a map of thousands
of SVG elements is what remains (the report's "What is left").
