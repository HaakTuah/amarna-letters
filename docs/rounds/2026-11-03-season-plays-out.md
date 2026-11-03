# Item 17+++: the season plays out

The owner (31 October 2026): "the player needs to feel the weight of the whole world, or it becomes meaningless to
him/her.", then "Agreed, 100% sir!"; on zoom, "If you are zoomed in near a unit in the waves, I want to hear it. And if I
zoom in on the map, I like how Imperator makes the state color more and more transparent and you see the ground and
effects under more clearly."; on the threads and the director camera, "And yes to" it; on a mind's words, "Yes, I think
so. And it should maybe store what it looked like at every step? And the narrator should also have its take stored from
the first time it runs on a game, so it must not be ran each time you watch it potentially afterwards?" and "Yes to both.
But I think it should only show their name like that when you click on the character? Or di you want it in parenthesis
in every letter they receive?".

The item's text: `docs/intent/build-order/item-17.md` ("17+++, the season plays out"); the section: "The season plays
out, and zoom shapes what you see and hear" (`docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`).
The live document had no change since the copy in the Build order or Interface tabs when the item began (3 November).

Presentation only, built in parts, each its own pull request.

| Part | What | State |
|---|---|---|
| A | A mind's own words kept season by season and shown (the record) | merged, #627 |
| B | The season in sequence: the next season computed while this one plays, pace by meaning, a closing line | merged, #645 |
| C | Zoom shapes the realms' colours (full, then a wash, then borders and banners) | merged, #634 |
| D | The land's season under the realms, and its change moving | not started |
| E | Units drawn as what they are, with weight; the world acting on them | not started |
| F | Threads to watch and the director camera (spectator) | merged, #664 |
| G | Smooth on a phone: frame times in the busiest season, with a recording | this PR (bar not met on the phone profile: #666) |

## Part A: a mind's own words

What was there: every model reply is in the log as its raw text, and the narrator's personas and chronicles are kept
the first time they are written and read back on replay, never written again. What was missing: the king's journal (his
notes, summary, plan and ledger) as it stood at each season. Now each seat with a mind gives its pages after each season
(`ISeat.mindPages`, the model king from `LeaderJournal.pages`), and the log keeps each page only when it changed
(`src/game/src/minds.ts`). The web app's **Own words** tab shows a model king's pages at the season shown, only where the
record is open to the page. Design note: `docs/design/38-legends.md`, "A mind's own words".

### Readings taken

- **A model character's words need no pages of their own**: its memory summary is already part of the game state,
  saved every season ("store only what changed": the snapshots already share what did not change).
- **"Shown beside the seat's decisions"** is read as a tab of the seat view, beside its inbox and the season's moves:
  the side panel is where a seat's decisions are read.
- **Told anew, keeping the first telling beside the new** (the narrator's writings): nothing is told anew yet, since no
  view asks the narrator again; the button belongs with the threads to watch (part F), the next writing the narrator
  does for a viewer.

## Part C: zoom shapes the realms' colours

Zoomed out the realms' colours are full; zoomed in they thin to a wash, then almost to nothing but the realm bands
(borders) and the emblems on the city seals (banners), so the ground, the season and the figures show through. One
factor, `washAt` (`src/web/src/map/wash.ts`), multiplies the realm colour's opacity (ruled, governed and a vassal's wash
alike): 1.6 at 0.45 screen pixels a map unit or less (the whole board in view), 0.2 at 3 or more, log-linear between, in
eight steps. `zoom.ts` sets it as `--wash` when a gesture settles, and only when the step changes, so the realms' layer is
painted again only then. The sound already followed the zoom (item 17a+: what is near the view is heard, louder the
nearer); nothing changed there.

### Readings taken

- **"Borders and banners"** are the realm bands and the owner's emblem on each city seal, both already drawn: no new
  banner, since a flag per province would clutter the map the owner asked to keep readable ("The main map and its views").
- **Steps, not a smooth fade**: eight steps keep the heavy layer from being painted at every settle on a phone (17a's 50 ms
  bar), and each step is small enough not to jump.
- **First guesses** (item 18 may tune them): the ends 1.6 and 0.2, the scales 0.45 and 3, eight steps.

Questions for the owner: none.

## Part B: the season in sequence, paced by meaning

What was there: the worker played a season, sent it, and slept the speed's pause; the page showed each season as it came,
all its moves at once, and played a few small scenes (gifts, sacks, ambushes) over it. Now the worker computes the next
season while the page plays this one, one ahead and no more; the page holds that season until this one has played out;
the season's moments play in the engine's order, paced by meaning and speed; a short line closes each season; and
Simulate, the fourth speed (key 4), draws nothing: a progress bar and the count of seasons while the worker plays on
ungated, then the game opens at its last season. Design note: `docs/design/52-the-season-plays-out.md`.

- `src/web/src/session/pacing.ts`: the phases, the paces, `paceSeason` and `closingLine` (plain functions).
- `src/web/src/map/moments.ts`: `momentsOf` (the season's moments from the viewer's scene), `seasonPlay`, `momentMarkup`;
  it replaces `scenesOf` and `sceneMarkup` (life.ts).
- `src/web/src/session/page-gate.ts`: `PageGate`, how far the worker may run ahead; `core.ts` waits on it, and the
  `played` message replaces `delay`.
- `src/web/src/styles/playback.css`: the pieces' slide in the marching, the disaster medallion, the closing line.
- `src/web/src/session/client.ts`: `held`, `startPlayout`, `finishPlayout`, `playoutAt`, `simulating`; the replay plays
  each season out.
- `src/web/src/components/SimulateProgress.tsx`: Simulate's screen (`Play.tsx` shows it in place of the game).
- `src/web/src/map/svg-renderer.ts`: `playSeason`, the land layers held to `landAt`, the closing line; `tokens.ts`:
  `reconcile`'s `leaveAfter`.
- Tests: `src/web/test/pacing.test.ts` (the order, the paces, a crowded season, Simulate, the line, only what the seat
  knows plays, the worker one season ahead, and an envoy caught on his last season never arriving); the living map's draw test now draws the moments and the line for every season and view. The smoke test
  checks that a season played closes with its line.

### Frame times (soak tool, seed 1, three minutes a speed; the whole game at Simulate), before the design check's retune

| Run | Seasons | Seconds a season | Frames over 50 ms | Worst after the opening |
|---|---|---|---|---|
| desktop, Slow | 9 | about 20 | 31 of 10,674 (0.3%) | 117 ms |
| desktop, Normal | 15 | about 12 | 52 of 10,400 (0.5%) | 150 ms |
| desktop, Fast | 37 | 5.0 | 126 of 9,214 (1.4%) | 117 ms |
| desktop, Simulate | 102 (the end) | 1.7 | 360 of 5,982 (6.0%) | 150 ms |
| phone (CPU 4x), Fast | 37 | 5.0 | 384 of 8,107 (4.7%) | 400 ms |

The worst frame of every run is the opening's first draw (600 to 870 ms on desktop, 2.75 s on the phone profile), as
before. While a season plays, the long frames are its layer writes (100 to 150 ms, headless software raster); Simulate
reads and draws every season as fast as the worker plays it, as Fast did before. The bar (no frame over about 50 ms) is
not met yet: part G measures the phone and takes the layer writes up. The smoke test passes on desktop, phone and a human
seat, with the closing line checked.

### After the retune (soak tool, seed 1, two minutes a speed, desktop)

| Run | Seasons | Seconds a season, with the result | Frames over 50 ms | Worst after the opening |
|---|---|---|---|---|
| Slow | 6 | about 18 | 22 of 7,148 (0.3%) | 33 ms in play |
| Normal | 15 | about 7 | 37 of 6,982 (0.5%) | 100 ms |
| Fast | 75 | about 1.5 (1 s of highlights, the rest the worker's time) | 184 of 5,539 (3.3%) | 83 ms |
| Simulate | 93 | about 1.2 (the worker's time; nothing drawn) | 4 of 7,243 (0.06%) | 17 ms |

Simulate's page holds 29 DOM nodes while it runs, against about 4,200 for the map. The smoke test passes on desktop, the
phone and a human seat, with the closing line checked.

### First guesses (presentation only)

The paces in `Paces` (the table in the design note), set to "Pace of play" after the design check: a season's playout
about 15 s at Slow with 4 s on the result, about 6 s at Normal with 2 s on the result, and about 1 s of highlights at
Fast, a capital falling taking a second more; Simulate draws nothing.

### Readings taken

- **"Orders resolve in sequence" is read as phases, not one unit after another**: arrivals, the marching (every march
  together), what the road and weather did, the battles one by one, the sieges together, the cities falling. Fifty powers
  marching one at a time would take minutes a season; the engine resolves the marches together too (pillar: the engine
  is the truth, presentation follows it).
- **The results land when the cities fall**: who holds what, the fog, the walls and the season's arrows are written at
  that moment, not at the season's start, and a unit gone stays until then, so nothing changes before it plays ("nothing
  teleports").
- **With a human seat awake, the worker does not run ahead**: he is asked for his orders once he has seen the season play
  out ("Nothing happens unless someone orders it": a king orders from what he has seen).
- **A crowded season plays its greatest moments** (a fall, a battle, a disaster, an arrival, at most a few a season)
  and tells the rest in the closing line: "never faster than can be read" holds for what plays.
- **News is told, never staged**: a disaster or a change of hands the seat only heard of is in the closing line as "word
  came of ...", with no place drawn (hidden information).
- **`ms` stays each speed's key** (1500, 400, 50, and 0 for Simulate), as the reload into an update and the soak tool keep
  it; the pace itself is `Paces`, by the speed's place.
- **The 4 key for Simulate comes with Simulate** here, rather than with 17+++a, since the speed it picks arrives now.
- **An arrival is what the seat knows to stand at a court**, never a journey's end (an envoy caught on his last road
  leaves his journey too): a foreign envoy received at one's court, one's own envoy known there, not believed under a
  cover (hidden information; Codex's P1).
- **Simulate's bar has no end**: when the age ends is hidden from every seat (the drawn last season), so the bar runs
  without one beside the count of seasons and the date.
- **"Opening in replay at the end"** is read as the game opening at its last season with the timeline and its replay
  button, paused, so the player chooses where to watch from and at what pace.
- **The biggest events at Fast are a capital falling**: the engine records no king's death as an event yet, so there is
  none to give a beat.

## Part F: threads to watch and the director camera

The Threads tab lists the few live stories with most at stake this season for the eyes the page sees through, each a
click away (follow the person, open the message trail in god view, show the place on the map); the director camera, a
checkbox there and off by default, takes the map to the highest-stakes scene as each season plays out. The narrator's
words are kept in the record the first time and read back; the game's owner may have them, and the annals, told anew
beside the first telling. Design note: `docs/design/52-the-season-plays-out.md`, "Threads to watch and the director camera".

- `src/game/src/threads.ts`: `worldThreads`, `seatThreads`, `findThreads`, `byStake`, `threadsFor`, `readThreads`.
- `src/game/src/bots/thread-words.ts`: the template's words; `INarrator.threads` (`contracts.ts`), the template, model and
  replay narrators.
- `src/game/src/runner.ts`: `threads` (each season, kept under `t<n>/threads`), `tellings`, `tellThreadsAnew`,
  `tellChroniclesAnew`, `chroniclesAnew`; `recorded`'s `told`; the batch runner tells none (`tellThreads`).
- `src/game/src/log.ts`: a save's threads checked as written when it loads.
- `src/web/src/map/director.ts`: `directorShot`; `components/ThreadsPanel.tsx`; `Play.tsx` (the tab, the camera);
  `TrailPanel` opens one trail; `ChroniclePanel` shows the annals told anew; `core.ts` and `client.ts`: the `threads` and
  `chroniclesAnew` messages.
- Tests: `src/game/test/threads.test.ts` (the ranking; a capital about to fall leading god view and its holder, unknown
  to a far court; a bribed envoy god view's story, his king seeing only his letter away; told once and replayed without
  telling again; told anew keeping the first, through a save and a replay; the annals anew; an older record without
  threads; a malformed save failing to load); `src/web/test/director.test.ts`; the canary checks every telling through
  each seat and that the export blanks the threads' words; the export test sorts the thread's fields; the smoke test opens
  the tab and turns the camera on and off.

### Readings taken

- **The stake, read for one story in the viewer's own terms.** The ladder's measures (`ordersStakes`, `courtStakes`)
  weigh a king's whole decision; a thread is one story, so their quantities are reused for it: a province's share of the
  land, +0.1 for a season from falling (a reason that wakes a king), the gold against the treasury, 0.5 for a tablet, 0.3
  for tablets shown, and troops in one's own capital first. For a seat they are measured from its own view (its land, its
  treasury), so even the order of its threads tells it nothing it does not know (hidden information).
- **The engine finds and ranks; the narrator words.** "Find the thread, don't make it": the narrator receives only the
  facts the engine released for each thread and phrases them. The model narrator uses the template's words until it is
  given its own call (no model games until the build order is done; a call every season costs).
- **A human king during play sees no threads at all**, only once the record opens to him (the age's end, Reveal all, or
  his fall into god view): "the narrator illuminates; it never steers", and a ranked list of his own stakes is advice.
- **A seat's threads come only from its own view**: the sieges it knows of, and its own envoys away, placed at the court he
  was sent to, never where he is on his road. A rising (asked in secret, seen by nobody) and a bribe are god view's alone.
- **Kept per pair of eyes**: god view's and each living seat's few, as decisions in the log rather than a record of a
  new type, so the export's filters and its blanking already hold them; a save's are checked as written on loading.
- **The game's owner** is the table that holds and plays the game; a loaded replay is read only, so it offers no Tell anew.
  The annals are told anew the same way; a persona is not, since it plays the character and a new one would change the game.
- **An older record without threads** has them told when it is watched: "the first time it is written" is then.
- **One shot a season for the director**: the moment where the top thread is, at its beat, or the top thread's place as
  the season begins, or the greatest moment; a follow keeps the camera instead. One move a season stays readable.
- **First guesses**: four threads for each pair of eyes; the director's zoom of 2.2.

Questions for the owner: none.

## Part G: smooth on a phone

The item's text: "Smooth on a phone, measured as item 19 measures it, in the busiest season, and held to 17a's bar: no
frame over about 50 ms while a season plays, at every speed, on desktop and on a throttled phone, with the frame times and
a short recording in the PR." Design note: `docs/design/52-the-season-plays-out.md`, "Smooth on a phone (part G)".

### The causes found (phone profile, Fast, the timeline kept whole with the soak tool's new `--trace-file`)

- **The state's read ran past its budget**: a field was one step, and the characters and the provinces' reports (433 KB of
  new text a season, since every report was parsed again as a lone piece) took up to 200 ms in one task.
- **Each layer step was one long frame**: the step's own draw (tints 38 to 95 ms, the season's washes 26 to 54, the works
  at the cities 30 to 63, bands 25), then its parse, style, layerization and paint, since the layer was written whole.
  The first step ran inside the worker's message task, with React's redraw.
- **The names were placed about three times a season** (the pieces drawn, the slide ended, the results landed), and each
  placement showed and hid every marker again: some 1,700 elements restyled, 60 to 90 ms a placement.

### What changed

- `src/web/src/session/incremental.ts`: `value` is a generator paused between items when the step's time is spent;
  `leaf` keeps and reuses a lone piece of 48 characters or more (`LeafReuse`).
- `src/web/src/map/morph.ts` (new): `patch` (write only the elements and attributes that differ) and `patchParts` (a
  layer in parts, only the changed parts parsed); `svg-renderer.ts`: `layer` patches (the arrows still written whole),
  takes an in-place `update`; `stepSoon` starts the steps at the next frame; names wait while the results are held back
  (`landPending`); `placeNamesNow` hides and shows only what changed, reads each stroke width once a kind, and keeps each
  name's box while the view stands still (`nameBoxes`).
- `land-layers.ts`: `tintsKey` and `retint`; a band traced again only when what it is traced from changes (`BandsDrawn`).
  `seasons.ts`: fixed slots and `reseason`. `built.ts`: roads traced once; the works at the cities in parts.
- Tests: `src/web/test/map-morph.test.ts` (patch and parts, on a stand-in DOM), `realm-borders.test.ts` (a kept band is
  the band traced afresh); `history.test.ts` already reads with a 1 ms budget, so every field pauses mid-way.

### Frame times (soak tool, seed 1, two minutes a run; a busy machine, load 2 to 5 from other lanes)

| Run | Before: frames over 50 ms, worst after the opening | After: frames over 50 ms, worst after the opening |
|---|---|---|
| phone (CPU 4x), Fast | 611 of 3,091 (19.8%), about 300 ms (22.3% in a second run beside this one) | 483 of 4,025 (12.0%), 250 to 300 ms |
| phone (CPU 4x), Normal | 163 of 6,125 (2.7%), 283 ms | 138 of 6,304 (2.2%), 267 ms |
| desktop, Slow | 22 of 7,148 (0.3%), 33 ms in play (Part B) | 15 of 7,179 (0.2%), 100 ms |
| desktop, Normal | 37 of 6,982 (0.5%), 100 ms (Part B) | 19 of 7,089 (0.3%), 83 ms |
| desktop, Fast | 184 of 5,539 (3.3%), 83 ms (Part B) | 179 of 5,371 (3.3%), 150 ms |
| desktop, Simulate | 4 of 7,243 (0.06%), 17 ms (Part B) | 9 of 7,239 (0.1%), 83 ms |

Per step on the phone at Fast, before and after (mean ms): the season's washes 47 to 4, the tints 51 to 13, the names 92
to 50 and placed 0.65 times a season instead of 2.7, the steps run in the message task 29 to 0.8; the seasons reached in
two minutes 50 to 65. The opening's first draw, outside the bar, costs 2.5 to 3 s on the phone profile and 0.55 to 0.65 s
on desktop, as before. The desktop rows' "before" are Part B's, measured on a quieter machine; the after runs had other
lanes' test suites beside them. The share of long desktop frames is no worse, but the worst desktop frame grew in every row
(33 to 100, 17 to 83, 83 to 150 ms); load is the likely cause, not shown, so those worst frames are unexplained until a
run on a quiet machine.

### Recording

`docs/rounds/media/2026-11-03-17ppp-g-phone-fast.webm` (2.1 MB): the phone profile (390x844, CPU 4x slower) at Fast,
seed 1, from the soak tool's `--video`.

### What is left

The bar is met on desktop at Slow, Normal and Simulate, not at Fast (3.3% of frames), and **not on the phone profile**
(#666, blocked): there one frame in eight at Fast
and one in forty-five at Normal is over 50 ms. What remains is the browser's own work whenever the map changes, which no
JavaScript mark sees: layerization (20 to 60 ms a frame; the map's thousands of SVG elements each carry a transform or a
clip, so the whole page is layerized again), paint, and the frames of the pieces' slide, which software raster paints
on the main thread; and the step draws still over 15 ms on the phone (the works at the cities, whose granaries' tooltips
change every season, the bands where holders change, the cities, the names). Meeting it would take a map with far fewer
paint chunks (the cities, names and pieces drawn without a transform each, or on a canvas), a larger change than this
part; it is left as a follow-up for the item's pull request to file, not built here.

### Readings taken

- **"While a season plays" excludes the opening's first draw**, as Part B and item 17a read it.
- **The phone profile is a worst case**: the soak tool's software raster and CPU slowed four times in a headless browser
  overstate a phone's cost (17a's note), so the remaining long frames are reported, not chased with a rewrite.
- **The tints' tooltips and the works' tooltips are kept as they were**: a lighter tooltip would have made the writes
  cheaper but changes what a player reads (presentation the item does not ask to change).

