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
| D | The land's season under the realms, and its change moving | this PR |
| E | Units drawn as what they are, with weight; the world acting on them | not started |
| F | Threads to watch and the director camera (spectator) | merged, #664 |
| G | Smooth on a phone: frame times in the busiest season, with a recording | #667 (bar not met on the phone profile: #666) |

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

## Part D: the land's season under the realms, and its change moving

The item's text: "The season is the land's own state beneath the realms: snow, flood, green and drought are drawn on the
ground under the realm colours, which lie over it as a light wash with clear borders so that nothing bleeds through, and
the change moves (snow creeping down from the passes, the Nile rising along its banks, green spreading with the rains,
the land browning from its edges)". Design note: `docs/design/52-the-season-plays-out.md`, "The land's season under the
realms (part D)".

### What was built

- `svg-renderer.ts`: the season is its own drawing, `map-ground`, under the realms' colours (`map-realms`, was
  `map-season`, which held the tints under the season); `moveSeason` sets `--move` on the season's layer while a season
  plays out (half its playout, 0.4 to 5 s) and clears it otherwise.
- `map/seasons.ts`: everything the season shows is a fixed slot, the spates, the snow and the storms too (they were
  written anew each season); a look the season leaves is marked `gone` and keeps its look and fill (`classFor`); each
  province's slots carry how far inland it lies (`Inland`, `--r`), each snow band its depth (`--b`).
- `map-living.css`: the slots' transitions (opacity, fill, display), timed by `--move` and a lag by place; a look appearing
  fades in from nothing (`@starting-style`); the Nile's flood rises from the south (`nile-rise`); none with reduced motion.
- `scripts/map-snow.mjs`: the snow in three bands by depth (`snow-high.png`, `snow-mid.png`, `snow-low.png`, 52 KB in all,
  replacing `snow.png`'s 66 KB); the bands were cut from the committed `snow.png` exactly as the script now cuts them (its
  alpha is already in eight steps), since the terrain tiles are not on this machine.
- `docs/history/03-environment-and-seasons.md`: `#03-nile-rise-north`, the flood seen first at Aswan and about a week
  later at Cairo [B].
- Test: `src/web/test/season-ground.test.ts` (every season draws the same slots; a look leaving is marked gone; coast first,
  ranks from 0 to 1). README: the map's season paragraph.

### Readings taken

- **"Under the realm colours, which lie over it as a light wash with clear borders so that nothing bleeds through"**: the
  season moves under the tints, at part C's strength by zoom, with the realm bands and the relief above both; nothing new
  is drawn for the borders, which were already their own sharp layer. Principle: build the least that meets the text
  (keep it lean); part C already set how light the wash is.
- **"Snow creeping down from the passes"** is read as the snow coming by depth over the snow line, the heights first
  (the passes lie among them), and melting from below: the snow is drawn from real elevation, so its depth is the honest
  order. **"The Nile rising along its banks"**: from the south up its valley, as the flood came (#03-nile-rise-north),
  the black land along both banks filling as it rises; the Delta last, since it lies downstream of Cairo, which the source names. **"Green
  spreading with the rains"**: from the coast inland, and **"browning from its edges"**: from the inland edges toward the
  coast, both on #03-levant's "less inland"; the order is counted in borders from the nearest coastal province, since
  the game has no rainfall per province. Principle: history holds; a real-world order on the map rests on a dossier line.
- **The change moves while the season plays at Normal and Slow, and only then**: stepping, jumping and reduced motion
  show the season at once, as the pieces do (Part B); a replay plays it as it plays the pieces. At Fast, a second of
  highlights a season, the land changes at once ("at fast speed the routine compresses"), which also kept the phone's
  long frames from growing a fifth (below). Principle: pace by meaning, and smooth on a phone.
- **Its own drawing**: the season's change repaints the season only, not the realms over it, at the cost of one more
  layer to composite. Principle: smooth on a phone (part G's bar); measured below.
- **Hidden information**: nothing new reaches the page; the looks are those the layer already drew (the calendar for
  every seat, droughts and floods as the seat last saw them) and the order comes from the map alone, so the canary test
  needed no new case.

### First guesses (presentation only)

`--move` half the season's playout, at most 5 s, and none under 1 s, and none at Fast, whose pace does not move the land (`Pace.ground`); each slot's change over the last 0.4 of it after a lag
of up to 0.6; frost at mid-lag; the Nile's rise over 0.8 of it; the snow bands cut at depths 160 and 96 of 255.

### Frame times

Soak tool, seed 1, phone profile (390x844, CPU 4x), two minutes a run. The machine carried other lanes' suites (load 6 to
25), so Part G's own build was rebuilt and run beside this part's at the same time, pair by pair; a single run of the same
build varied between 9% and 20%.

| Run | Part G's build: frames over 50 ms | Part D's build |
|---|---|---|
| Fast, five pairs | 1,920 of 14,628 (13.1%; 9.0 to 17.3% a run) | 2,018 of 14,238 (14.2%; 9.1 to 19.0% a run) |
| Normal, two pairs | 617 of 9,072 (6.8%) | 622 of 7,472 (8.3%) |

At Fast the land changes at once, as before; the first build, which moved it there too (half a second a season), had a
fifth more long frames than Part G's beside it (23.4% against 19.5%), so at Fast the routine compresses (`Pace.ground`:
Fast never moves the land). What is left at Fast, about one point, is within the runs' spread but showed in four pairs of
five; one drawing more to composite is the likeliest cause (season and tints in one drawing measured the same at Fast
and worse at Normal, so the season keeps its own). At Normal the long frames are as many as before (622 against 617);
fewer frames are drawn while the land moves, each painting the season's drawing, so their share rises.

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
- The browser's own work (an escalation after the numbers below): `styles/map.css`, `map-living.css`, `map-glance.css`:
  about 750 single shapes (the road net, the fields, the bands, the rivers' casing, the markers' and works' discs, the
  season's washes, the fog's veils, the roads) fade by `fill-opacity` or `stroke-opacity` instead of `opacity`, so none
  makes a paint chunk and effect of its own; the `believed` fade is kept to people and travellers, the only groups it
  was for (a believed road kept its own .45). The arrows' `draw`, `fadein`, `pop` and the capture's `ring` fill
  `backwards`, the ring's last look (.85) set on the ring itself. A screenshot of the same season before and after
  differs only in anti-aliasing at the pieces' edges.

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
clip, so the whole page is layerized again), paint, and the step draws still over 15 ms on the phone (the works at the
cities, whose granaries' tooltips change every season, the bands where holders change, the cities, the names).

**The browser's own work, measured (the escalation).** Two benches beside the soak, both on seed 1 paused at season 12:
a forced one-chunk change timed with every source of paint chunks taken away by CSS, and the phone profile stepping the
timeline back and forth eight times (the pieces slide, the season's results land, as in play). The machine ran other
lanes' suites throughout (load 10 to 17), so each comparison was run side by side, both builds at once.

- The slide is already the compositor's: the pieces' `transform` transitions run there (no failure reason in the
  timeline). What costs is the frames that change the markup: each has the whole page layerized again (about 27 such
  frames a season shown, 13 ms each on the phone profile), then painted (6 to 10 ms) and restyled.
- In the tasks over 50 ms on the bench, the page's steps took 27% of the time, layerization 21%, paint 12%, style 12%,
  layout and pre-paint 9%.
- Finished animations filled `both` kept 8 elements composited and 23 more layers made for what overlaps them (56 cc
  layers in all on the paused map); filling `backwards`, 25. About 750 shapes each made an effect of their own by
  `opacity`. Both changed (above): layerization fell by about a seventh on the bench (2.9 and 2.7 s against 3.2 and 3.2
  s), and the soak's frames over 50 ms at Fast from 12.9% to 11.9% (paired runs, two minutes each), and from 19.0% to 18.4%
  in a second pair on a quieter machine, where the game ran faster (42 and 44 seasons in two minutes against 25 and 26,
  so more changes of the map a minute); within the noise.
- Tried and not kept: `will-change: transform` on every piece, so a slide neither makes nor drops a layer (8.5% and 8.4%
  of frames over 50 ms against 9.5% and 11.1%, within the noise, with more commit); the governors' rim drawn without its
  SVG filter (the filter puts that province's tints on a layer of their own, and 3.7 megapixels of what is drawn after it
  on others; 8.1% and 6.3% against 11.2% and 7.6%, within the noise, and it changes how the rim looks).
- **The ceiling of flattening**: with every per-element transform, clip, opacity and `<use>` offset taken away at once
  (a map drawn wrong, as a bound on any flattening), the bench's frames over 50 ms fell from 6 to 7% to 3.7 and 3.8%,
  layerization by five sixths and paint by a half. So no contained change to the SVG reaches the bar: what is left after
  it is the page's steps and the style they cause.

The way to the bar (a design for a follow-up, not built here), in three parts, each measured on the same two benches:

1. **The land on a canvas, painted off the main thread.** The tints, the season's washes, the fog, the bands, the road
   net, the governors' rims, the steles and the wild land are drawn as `Path2D` from the same path strings on an
   `OffscreenCanvas` held by a painter worker, keyed as the layers are now; the relief is drawn over them with
   `soft-light`, the patterns made once as canvas patterns, the colours read from the stylesheet's variables once and on a
   change of theme. A pinch scales the canvas by CSS and it is painted again when the gesture ends, in tiles past 4,096
   pixels. Provinces keep their taps and tooltips in an SVG of bare shapes (`fill: none; pointer-events: fill`, which
   paints nothing). That takes some 1,600 of the map's 3,700 elements, and most of its clips and fades, out of every
   style, layout, layerization and paint. The worker is sent the viewer's scene only, as the SVG is now (hidden
   information unchanged). Files: a new `map/land-canvas.ts` and its worker; `land-layers.ts`, `seasons.ts`, `built.ts`,
   `memory.ts`, `holding.ts` and `markup.ts` (`Base`) give draw lists instead of markup; `svg-renderer.ts` (`mount`, the
   land steps), `zoom.ts` (paint at the gesture's end), the land rules of `map.css` and `map-living.css`; the tests that
   read the land's markup (`realm-borders.test.ts`, `map-morph.test.ts`) move to the draw lists, and a screenshot
   comparison guards the look.
2. **One transform a symbol.** A city, marker, name, piece or work is placed by a single `translate() scale()` written
   when the zoom changes, its inner offsets and its `<use>` offsets folded into its coordinates, instead of a translate,
   a CSS scale and further translates nested.
3. **No page step over about 10 ms on the phone profile.** The names placed in slices across frames, with each marker's
   box taken from a cache kept by zoom instead of read from the layout; the works at the cities and the cities patched a
   few at a time.

Risks: a canvas blurs during a pinch until painted again; a phone's canvas memory (tiles); the land's look is then drawn
by hand, not by the stylesheet, so a screenshot test must hold it; `OffscreenCanvas` needs Safari 16.4 or later (else a
canvas on the page, still one paint chunk). Part 1 is the larger win (six of a season's fourteen layer steps are the
land's); parts 2 and 3 are needed as well, since the ceiling above leaves the steps.

### Readings taken

- **"While a season plays" excludes the opening's first draw**, as Part B and item 17a read it.
- **The phone profile is a worst case**: the soak tool's software raster and CPU slowed four times in a headless browser
  overstate a phone's cost (17a's note), so the remaining long frames are reported, not chased with a rewrite.
- **The tints' tooltips and the works' tooltips are kept as they were**: a lighter tooltip would have made the writes
  cheaper but changes what a player reads (presentation the item does not ask to change).

