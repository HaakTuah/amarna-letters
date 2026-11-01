# The crash and the optimization round (item 17a)

Haakon saw a white page with an error on the live site while watching a game at high speed (30 October 2026). This note
says what a long game keeps, where it went wrong, what changed, and how the page now fails when something throws. The
numbers are in the item's report, `docs/rounds/2026-10-31-crash-and-speed.md`.

## What a long game keeps, and the crash

The state grows with the age: the courts' records (`inbox`), the characters, the events and the message trails are the
record, kept by design ("Memory" in "The game in one page": the tablets and a court's records stay as they are). Its JSON
is about 1 MB at the start, 3.5 MB by season 11, 6.7 MB by season 31 and grows by about 150 KB a season after.

The engine's worker kept the whole state as a JSON string at the end of every season (the runner's snapshots, for the
timeline and for reading a past season's panels). Those strings summed to 130 MB by season 31 and would pass a gigabyte by
the age's end, which lasts about 100 seasons since item 17. With the browser's heap capped at 400 MB, as a phone caps it, the
renderer died at season 20 ("Page crashed": the white page). The page kept its own growing shares too: a scene cache of up
to 600 map scenes at about 2 MB each, and one frame a season at about 1 MB, most of it each court's known holders, known
walls and sight, maps of the whole board a court that seldom change.

## The stream: the state travels as its changes, and the page keeps the history

Haakon (31 October 2026, "Agreed, 100% sir!") named the root of the stutter and the crash: the page held a full copy of the
world for every season. Now the engine's worker sends the page what changed, and the page keeps a compact history of its own:

- **The cut.** After each season the state's JSON is cut into pieces at the items of its lists and dictionaries, three levels
  down (`SnapshotStore`, `src/game/src/snapshots.ts`): a character, an event, a court's inbox item, a message trail is a
  piece or a run of pieces, with its comma. Every distinct piece is kept once under a number; a season is the list of its
  numbers, most of them the season before's.
- **The delta** (`SnapshotDelta`): the pieces first seen this season, with their numbers, and the season's list of numbers.
  That is what `Live.states` carries to the page (`protocol.ts`), one delta a season (several after a replay or a resume),
  instead of the whole state's JSON. The two members the page must never read, the drawn last season (`finalSeason`,
  `finalByCap`, item 6a), are redacted from the deltas (`core.ts`: `redactForPage`), their closing bracket and comma kept so
  the JSON stands; the store itself keeps every piece whole for the engine's own `stateAt`.
- **The page's history** (`SnapshotHistory`): the pieces by number and each season's list. Any season's JSON is rebuilt by
  joining when the player looks back (`Session.displayed`), read with the ordinary reader and kept for a few seasons; the
  worker answers no question about the past any more (the `stateAt` message is gone).
- **The incremental reader** (`src/web/src/session/incremental.ts`, `IncrementalReader`): the newest season's pieces are
  read into a tree of the containers the cut opened, and each field of the state is read from its text: a list's or
  dictionary's item whose text is the same as last season's keeps last season's object (reused by text, per field, down to
  the items of a court's inbox), and only new texts are parsed and read with their schema. So a season costs the page its
  changes, not the whole world: about 150 KB of new text against 7 to 16 MB. The state read is exactly the state written
  (`src/web/test/history.test.ts` compares the serialized text season after season, and the looked-back JSON too).
- **What else rides the stream.** The season's `SeasonFrame` (what each seat knew: holders, walls, sight, units, moves,
  journeys, people, news, and the season's `GameEvent`s with `visibleTo`) goes with each update as before, built once in the
  worker and kept only on the page. Item 17+++'s playback and item 19+++'s sounds read the frames' `events` and `moves`:
  one `SeasonFrame` per season, in `Session.frames`, its `events` the engine's events of that season.
- **Amendments.** When a table plays on into an open age, the season's state changes after its snapshot: the worker pushes
  the amended state as a replacement of the last season (`replaceLast`), and the delta says so (`replace`).

The page never mutates the state's objects (they are shared between seasons where unchanged): it reads them.

## What else changed (behaviour unchanged: seeds replay exactly, the suites and benchmarks as before)

- **Snapshots share what did not change** (the cut above, in the worker too). Reading back joins the pieces: the text is
  exactly what was pushed (`src/game/test/snapshots.test.ts` guards both, with the smallest game that shows the sharing).
  31 seasons of seed 1 keep 17 MB of pieces instead of 130 MB of strings. Each piece is a string of its own: V8 makes a slice
  of 13 characters or more a view that keeps the whole string alive, which at first kept every season's JSON alive through
  its short pieces (309 MB of heap for 17 MB of text, until every piece was copied flat).
- **The worker keeps only the last frame** (`frames.ts`: `framesSince`; `core.ts`): frames go to the page once, which holds
  the history.
- **The page shares unchanged frame parts** (`client.ts`: `shareUnchanged`): a frame's known holders, known walls, sight and
  people take the earlier frame's references where equal, so a season's frame costs its changes.
- **The scene cache keeps six scenes** instead of 600 (`client.ts`): a scene is rebuilt in a few milliseconds.
- **The JSON reader takes names as written first** (`src/engine/src/core/json.ts`, `readObj`): the lower-cased index that
  case-insensitive matching needs is built only for a name not found as written. Every read of a state, on the page each
  season and in `stateAt`, is cheaper; what is read is the same.
- **Season fallbacks are counted once** (`core.ts`, `fallbacksUpTo`): a played season's count is final, so the worker's
  update no longer scans the whole log for every season at every change.

The engine's own time, from a CPU profile of 30 seasons of seed 1 in Node (`src/web/test/probe-run.ts` under
`--cpu-prof`; the item's report has the tables): garbage collection 11%, the generators behind `Dict.entries` 9%, and the
route-finding family (`cheapestRoute`, `edgeBetween`, `legPoints`, `connectionDays`, `crossingBetween`, `boatDays`) 17%.
With the results unchanged (every seed replays exactly; the suites pass):

- **Dicts and sets iterate with a hand-written iterator** (`core/collections.ts`, `SlotIterator`) instead of a generator:
  the same slots in the same order, without the generator's frames and much of the garbage.
- **Legs are remembered once a map**: `connectionDays` (a pure function of the map and the two provinces), `boatDays`,
  `crossingBetween` (fixed data, by pair) and `legPoints` for the lone traveller on the road, the leg every route search
  asks for, a pure function of the connection and the season (`model/distance.ts`, `travel.ts`, `geography.ts`). A company
  with terms of its own (size, load, troops, roads) is still computed each time.
- **The route search keeps its frontier in a heap** on (cost, the map's order), the same province settled next as the scan of
  every province found before, ties to the first in the map's order; the map's order is built once a map (`cheapestRoute`).

## Smoothness, measured: the 50 ms bar (31 October 2026)

Haakon: "The game still doesn't move slowly and smooth enough. Still hicks." The bar: frame times recorded through whole
games at normal and top speed, desktop and throttled phone, no frame over about 50 ms, the longest frames and the count
over 50 ms before and after, with a short recording. Measured by `soak.mjs` (every frame drawn is timed; `--trace` adds
the browser's own timeline of the main thread, and the page's steps are timed with `performance.measure`: `page:receive`,
`page:reader`, `reader:tree`, `reader:fields`, `map:render`, `map:<layer>`, `map:names`, `page:play`).

What a season cost the page before, in one or two tasks of 200 to 600 ms: the worker's message (its structured clone and
the frame), the state read whole (60 to 140 ms by mid-game), React's redraw, every map layer's rewrite, the names placed,
then style, layout and paint. What changed, step by step, each measured:

- **The state is read in a task of its own**, after the frames have shown (`client.ts`: `readSoon`), and **spread over tasks
  with a budget of about 10 ms each** (`IncrementalReader.read`): the first builds the tree of pieces, the next read the
  state's members a few at a time, and the state is published once all are read. A newer season replaces a read under way.
- **The reader does less per season.** Items are keyed by their pieces' numbers, not their text: a container's key is a hash
  over its numbers, confirmed against the numbers on a hit; a scalar piece is parsed straight (cheaper than remembering
  it); a list that grew at its end keeps its earlier items by comparing the raw numbers with last season's (the record's
  lists only grow, and there were 30,000 events); an object is read member by member only where a large part sits inside
  (a character and its memories), else parsed whole, one parse not forty; a member's name is sliced, not parsed.
- **The cut goes three levels deep, five under the characters** (`CutDepth`, `DeepCutDepth`, `DeepMembers` in
  `snapshots.ts`): a piece for each memory keeps a character whose gold changed from being read whole, while an event's
  list of courts stays one piece (cut five deep everywhere, 30,000 events became 300,000 pieces a season). Piece lists are
  `Uint32Array`s.
- **The map draws its layers in budgeted steps** over frames (`SvgMapRenderer.renderNow`, `runSteps`, about 8 ms a frame): a
  new render drops the steps still waiting, since every layer whose key changed is written by it anyway; the names are
  placed after the last step.

- **The map in five composited layers** (`SvgMapRenderer.mount`; `app.css`). With the page's work spread, the browser's
  own timeline (`--trace` with the `cc` category) showed what was left: nearly every long frame was the main thread
  waiting for the compositor (`LayerTreeHost::WaitForCommitCompletion`, 85 to 146 ms), stuck behind rasterizing the whole
  lower map, since its holders' tints and the season's washes change every turn and the land, the rivers, the relief and
  the names were painted with them. Now the land itself is one layer (painted once a zoom), the tints and washes another,
  the relief a third (blending in soft light with the layers below, as a layer of its own), the fog, bands, marks, names
  and cities a fourth, and the pieces the fifth; each lets taps through where it has nothing. In a whole fast game on
  desktop the frames over 50 ms fell from 454 to 152 (3%) and the long tasks from 333 to 51. (Headless Chromium
  rasterizes in software, so the compositor's numbers here are pessimistic; the structure helps a GPU too, since a
  season invalidates fewer tiles.)

- **After the split, the phone profile** (CPU slowed four times, software raster) still showed long frames: the browser's
  timeline named them as animation frames in which a layer was rewritten (its draw, then the style recalculation,
  layerization and paint of that layer, 150 ms and more at that speed), the worker's message (its structured clone), and
  the names placed (a layout and every marker measured). So: **a layer is written only when its markup changed**
  (`layer`, `written`: most seasons the cities, tints and bands come out the same, and a write skipped is a style
  recalculation and a repaint spared); **the names are placed only when something on the map was written** (`changed`);
  **a frame travels as a difference** in its per-court maps (`toWire`, `fromWire` in `frames.ts`: known holders, known
  walls and sight equal to the frame before's are left out and put back on the page, in the board's order); and **a read
  under way finishes before the newest season is read** (`client.ts`: `readSoon`): replacing it each time, as at first,
  left the panels on a slow phone at Fast speed never caught up (14 of 103 seasons read).

The numbers, before and after each step, are in the item's report. On desktop the bar is met but for a few frames a game;
on the throttled phone profile the remaining long frames are the rendering of the season's layer writes (the season's
washes change every turn by design) and the names placed, which item 17+++ takes up when it redraws the season textures and
plays the season out.

## No error leaves a white page (`src/web/src/ui/ErrorScreen.tsx`)

An error boundary wraps the app, and the page's uncaught errors and unhandled rejections are reported to it. The screen
says what went wrong in plain words and shows a report to copy: the build and the rules' version, the seed, the season and
the game, the error with its stack, the browser. The game itself lives in the engine's worker and is saved after every
season, so the screen offers "Back to the game" (the page draws again; if that fails at once with the same error, the
button goes and reloading is the way), "Reload into this game" (`ui/update.ts`: `reloadInto`, carrying auto-play and speed)
and "To the start screen". The smoke test plants an error on the page and checks the screen, its report and the way back.
The build's commit is `__BUILD_ID__` (vite.config.ts: the publishing workflow's `GITHUB_SHA`, else the checkout's).

## The newest version, without asking

See "The newest version" in `32-the-map-at-a-glance.md`: it takes over by itself off the game screen and at the next season
on it, reloading into the same game; only a version with new rules waits for the game to be left.

## The tools (`src/web/soak.mjs`, `src/web/test/probe.test.ts`)

- `node src/web/soak.mjs [--phone] [--heap 400] [--seed N] [--minutes M] [--log file]` serves `dist/` as the smoke test
  does, opens the spectator link `play?watch=N`, sets Fast and auto-play, and prints every five seconds the season reached,
  the page's heap, the worker's heap (asked through the devtools protocol), seconds a season, the frames drawn with the long
  ones and the worst, and the DOM's size; it stops at the age's end, at a page error, a blank page or the time limit, and
  reports every problem with its season. `--phone` is 390x844 with the CPU slowed four times; `--heap` caps V8's old space
  for the page and the worker alike, as a phone's browser does, which is how the crash is reproduced.
- The probe (`AMARNA_PROBE=1 AMARNA_PROBE_FIELDS=1 AMARNA_PROBE_SEASONS=30 NODE_OPTIONS=--expose-gc npx vitest run
  src/web/test/probe.test.ts`) plays a Free game in Node as the web app does and prints, every ten seasons, the season's
  time, the frame's, the heap, the snapshot's size, the state's JSON write and read times, a frame's and a scene's size and
  the biggest fields of each, and at the end what holds the heap. It is skipped in the suite.
