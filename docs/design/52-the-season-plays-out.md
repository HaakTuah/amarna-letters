# The season plays out (item 17+++, parts B, D, E, F and G)

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
units' and the travellers' layers, read by `.unit` and `.traveller` in `playback.css`, which take them from their layer and
pass them no further, and which also holds the closing line's style); each great moment's medallion shows in its
turn (`momentMarkup`, the stylesheet's `scene` animation with the beat's delay and length); a unit gone stays where it
stood until the results land (`reconcile`'s `leaveAfter`); the results (who holds what, the fog, the walls, the cities,
the season's arrows) land when the cities fall (`landAt`: the land layers are written then, `holdLand`); and the
**closing line** shows over the map's foot until another season is shown. Stepping back, jumping, or reduced motion
shows the season as it ended (with reduced motion, the closing line still shows). A replay plays each season out the same
way, at least 0.7 s a season.

The closing line (`closingLine`) says what changed, the greatest first: "Sumur fell to Amurru; battles at Gubla and
Qadesh; an envoy reached Babylon; two columns on the march; word came of plague in Mitanni." A seat's quiet season is
"A quiet season, as far as word has reached you."

## Threads to watch and the director camera (part F)

"And spectator mode points the viewer to what is worth watching" (the item's text). Choosing what is shown, never what
happens: nothing here is read by the engine, a seat or a request.

**Finding them** (`src/game/src/threads.ts`, plain functions). After each season resolves the runner finds the live
stories for every pair of eyes (`findThreads`): god view's in the whole state (`worldThreads`), each living seat's in its
own view alone (`seatThreads`, from `Views.for`), the few with most at stake for each (`ThreadsMost`, 4, a first guess):

| Kind | God view | A seat | The stake (as the model layer's `Stakes.moved`) |
|---|---|---|---|
| siege | every siege; "may fall next season" when one more season's wear breaches the walls or the city starves | the sieges it knows of, as it knows them | one province of the holder's land (`ordersStakes`' share of land), the besieger's for his side, +0.1 when a season from falling (a reason that wakes a king); another's siege moves none of the seat's own land |
| envoy | every envoy on his outbound road (not a false one), where he is on it; whose pay he is in, if not his king's | its own letters not yet reported on, placed at the court he was sent to, never where he is | `courtStakes`' audience: 0.05 + gold against the treasury (the host's in god view, the sender's own for a seat) + 0.5 for a tablet to seal + 0.3 for tablets shown |
| rising | a man the people would follow who chose to lead them this season (the engine's `risePlan`, seen by nobody) | none | as a siege about to fall |

Foreign troops in the viewer's own capital (in god view, the holder's) rank first (`capital`, as the ladder always pays
for them); then the stake; then a fixed order, so a replay ranks the same (`byStake`).

**Telling them.** The narrator words them (`INarrator.threads`, one string a thread from its own facts and the names
of the people it follows); the template narrator's words are `bots/thread-words.ts`, which names powers as the eyes the
thread was found for name them. The model narrator uses the template's words until it is given its own call. The words
are kept in the record the first time, as a decision under `t<n>/threads` (`ThreadsSchema`), read back on replay or
when a game continues and never told again; a record without them (a game saved before) has them told then
(`recorded`'s `told`). A save's threads are checked as written when it loads (`readThreads`), and their words are
blanked by the export's filter without human words like every narrator's text.

**Told anew.** The game's owner (the table that holds the game; a loaded replay only reads) may ask for a season's
threads to be told anew (`tellThreadsAnew`): the narrator words the same threads again under `t<n>/threads/anew<k>`, the
first telling standing beside the new. The annals likewise (`tellChroniclesAnew`, `end/chronicle/<power>/anew<k>`, shown
under the first in the Chronicles tab). A persona is not told anew: it plays the character, so a new one would change the
game, not its telling.

**Who sees them** (`client.ts`: `threads`; the worker filters by `threadsFor`). The Threads tab shows wherever the
record is open to the page (`canSeeAll`): god view's threads in god view, a seat's own through its eyes. A human king
during play sees none: the narrator illuminates and never steers, and a ranked list of his own stakes would be advice.

**The director camera** (`src/web/src/map/director.ts`, `directorShot`), a checkbox in the Threads tab, off by default.
As a season plays out (part B's timeline) it takes the map to one scene: the great moment that plays where the viewer's
highest-stakes thread is, at its beat; else, when a thread weighs more than every moment, that thread's place as the
season begins; else the season's greatest moment (a fall, a battle, a disaster, an arrival). It reads only the viewer's
threads and the moments of its own scene, so it shows no seat more than it knows, and a follow keeps the camera on its
person instead. A replay plays each season out the same way, so the camera works there too.

## The land's season under the realms (part D)

The item: "The season is the land's own state beneath the realms: snow, flood, green and drought are drawn on the ground
under the realm colours, which lie over it as a light wash with clear borders so that nothing bleeds through, and the
change moves". The season (`map/seasons.ts`) is its own drawing, `map-ground`, between the land and the realms' colours
(`map-realms`, the tints), which wash over it at part C's strength by zoom; the realm bands and the relief stay above both,
so a border stays sharp whatever the season draws under it. Being its own drawing, the season's change repaints only
itself, never the realms.

Everything the season shows is a fixed slot (part G): two a river's fields, two a province, one a river with a flood season
of its own (its spate), three bands of the snow and the storms. A look the season leaves keeps its class, marked `gone`
(`classFor`), and a pattern keeps its fill, so it fades out as it was; a slot never shown is `none`. The stylesheet
(`map-living.css`) times every change by `--move`, which the renderer sets on the season's layer while a season plays out
(`moveSeason`, with the class `moving`) and clears otherwise (Fast, stepping, jumping, reduced motion: the season then
shows at once). Each slot comes or
goes over the last 0.4 of `--move` after a lag of up to 0.6 of it (`--lag`, 0 first to 1 last); a look appearing fades in
from nothing (`@starting-style`), one changing crosses its colour:

| Change | Order (`--lag`) | Grounded in |
|---|---|---|
| The green of the winter rains, the river fields sown | from the coast inland (`--r`: `Inland`, borders crossed from the nearest coastal province, 0 to 1) | #03-levant: "400-1,000 mm on the coast and western slopes, less inland" |
| The summer's brown, a drought, a look leaving | from the inland edges to the coast (1 − `--r`) | the same |
| The snow | down from the heights: three bands by depth over the snow line (`snow-high`, `-mid`, `-low`, `--b`), the heights first; it melts from below | the snow line by elevation (`43-the-living-map.md`) |
| Frost | midway | |
| The Nile's flood | rises from the south up its valley (`nile-rise`: the field revealed from its southern end over 0.8 of `--move`) | #03-nile-rise-north: "Flooding reached Aswan about a week earlier than modern Cairo" |
| A river in spate, the storms, the harvest | at once, fading in | |

The pace decides whether the land moves (`Pace.ground`: Slow and Normal move it, Fast and Simulate do not, however long
their great moments run); under that, `--move` is half the season's playout, at most 5 s, and nothing under 1 s (first
guesses): about 2 to 3 s at Normal, 5 s at Slow, and none at Fast, where the routine compresses and the land changes at once (on the phone profile, moving it
there cost a fifth more long frames). Only while the layer is marked `moving` do the transitions exist at all. The order is only the drawing's: the engine's seasons change at once, as before. Nothing new reaches the page:
the looks are what the season layer already drew (the calendar for every seat, droughts and floods as the seat last saw
them), and the order is read from the map alone.

## The pieces travel their roads, drawn as what they are (part E)

The item: "units travel their roads at their real pace, each drawn as what it is after the period's relics, a column as
long as its men are many, dust behind marching troops, ships heeling under sail through the waves, an envoy's small
caravan, and nothing teleports; battles flare as a clash with their outcome, sieges tighten, and the world acts on them
visibly". Presentation only; nothing new reaches the page.

**Along their roads** (`map/marching.ts`). In the season's marching (part B's `marchAt`, `marchMs`) each unit that marched
goes along the way its arrow draws (`wayThrough(unitWay(...))`, through every province on it, by sea for a fleet), at even
speed along the road and slow to start and to stop; a march thrown back goes out its arrow's length (`BounceReach`, in
`ways.ts`) and comes home. Zoomed out, where a province's tokens gather into one a power (item 11c+), a unit that joins
or leaves a gathering has no token of its own to move: the gathered token shows its new count, and zooming in shows each
march. A traveller the page drew before goes on along his road from where he was drawn. Each is a Web
Animation of the token's `transform` (on the compositor, as the plain slide was) that holds the token at the road's start
until its turn (`fill: backwards`); the token's own slide is off meanwhile (`.marching`, `playback.css`). A piece the seat
had not seen before appears where it is seen, and stepping, jumping and reduced motion show the season at once, as before.

**As what it is.** While it moves each piece draws a trail behind it, put in the token for the march and taken away after,
turning with the road: an army a column of figures in its realm's colour, by the square root of the men it is seen to have (a band of a
hundred one, a full levy of 5,000 ten, at most fourteen), with dust at its tail; a fleet its wake, and its figure heeling under sail; an envoy or gold the pack donkeys of
their caravan (`fig-caravan`), facing the way they go. A spy goes alone.

**Battles, sieges and the world** (`map/moments.ts`). A battle's medallion flares and carries the winner's seal, as the
moves layer's clash shows him (the march, or the troops that threw it back; where several met in one province, a march
that took the place over any thrown back: `battlesOf`); a unit destroyed where it stood has none. The
season's scenes lie over the pieces (`scenes`, above `units` and `people`), so none is hidden under the tokens it
concerns. In the sieges' beat each siege the seat knows of shows its tents closing round the city (a wide ring giving way
to a tight one). A hazard shows its own figure and
what it does at the place, under its medallion:

| Event | Figure | At the place |
|---|---|---|
| a ship lost; men lost to winter at sea | storm | rain driving |
| men lost to winter on land | avalanche | snow and stone tumbling down |
| a river in flood | flood | the water swelling |
| a drought | the sun | |
| an earthquake | the ground cracked | |
| plague, a caravan robbed | fire, as before | |

First guesses (presentation only): a figure for each seventh of the men's square root, at most 14; the trail's sizes; the
tents' rings (44 and 28) and the wide giving way to the tight over the sieges' beat. The flare and the weather are drawn
still and fade with their medallion: shapes animated by `transform` repaint every frame, and on the phone profile at
Normal they cost about a third more long frames (the report's frame times).

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
- **The browser layerized more than the map needs.** Every frame that changes the map's markup has the whole page's paint
  chunks layerized again, and an element's own `opacity` makes its own chunk and effect. A single shape fades by
  `fill-opacity` or `stroke-opacity` instead (the map's stylesheets), which looks the same; `opacity` stays only on groups
  (a ghost unit, news, a person or traveller only believed to be where it is drawn) and on what animates. An animation
  that ends at the element's own look (the arrows drawn, the support lines, the burst, the capture's ring) fills
  `backwards`, not `both`: a finished animation that still holds its last frame keeps the element on a compositing layer
  of its own, and every piece drawn over it on another (56 layers on the paused map, 25 now). The pieces' slide already
  runs on the compositor (a CSS transition of `transform`).

On the phone profile at Fast the frames over 50 ms fell from about a fifth to an eighth; the bar is met on desktop at Slow,
Normal and Simulate, not at Fast (3.3% of frames) and not on the phone profile (#666), where the browser's own layerization and paint of a map of thousands
of SVG elements is what remains (the report's "What is left", with the measured way to the bar). What a lane after part G
changed: `60-the-phones-frames.md`.

