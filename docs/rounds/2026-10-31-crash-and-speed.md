# Item 17a: the crash and an optimization round

31 October 2026. Branch `item/crash-and-speed`, PR #236. The item text is `docs/intent/build-order/item-17.md`
(the 17a passage). Built from the copy in `docs/intent/` (this account has no live design document); the copy did not change
between the item's start (`f1007bc`) and the check before review. Design note: `docs/design/44-the-crash-and-speed.md`.

## Haakon's words in this session

Relayed by the orchestrator, 31 October 2026, word for word: "Before anything else: every lane commits and pushes what it
has now, unfinished work included, as a work-in-progress commit on its branch (a draft PR if it has none). From now on, push
after every commit, not only at gates or hourly. We're near this account's limit for the next few hours: when it resets,
carry on from the pushed branches."

And for item 17++, from the same message: "Haakon answered the audit's tiny-troops question, and it is now written into item
17++ as 'A handful holds nothing by itself' (War tab). There is no size threshold. A move into a far weaker unit is a battle
it loses by far. A garrison holds a town only as far as its people's ledger stands with its master. Script kings fold or
disband remnants. Read it from develop (git fetch origin develop) before building 17++."

## Where it stands (pick-up line)

See "Where it stands (31 October 2026, 19:30 UTC)" at the end.

## The crash, reproduced

Haakon: "Got a white page with an error. Was on github", watching a game at high speed on the live site.

`node src/web/soak.mjs` watches a whole Free game (seed 1) at Fast speed in the built app and records the season, the page's
and the worker's heap, seconds a season and the frames. On this 16 GB machine nothing crashed, desktop or phone profile (CPU
slowed four times): the age ended at season 102. But the worker's heap grew by about 5 MB a season and the page's by 2 to 3
MB a season at the troughs, with peaks of 430 MB. With V8's old space capped at 400 MB for the page and the worker, as a
phone's browser caps them (`--heap 400`), the renderer died at season 20, 45 seconds in: Playwright reports "Page crashed",
the white page.

The cause, from the Node probe (`src/web/test/probe.test.ts`): the worker kept the whole state as a JSON string at the end
of every season (the runner's snapshots). The state's JSON grows with the record, about 150 KB a season (the courts' inboxes
first, then the characters, the events and the message trails): 958 KB at the start, 3.5 MB by season 11, 6.7 MB by season
31, so the snapshots summed to 130 MB by season 31 and would have passed a gigabyte by the age's end. The page added a cache
of up to 600 map scenes at about 2 MB each and a frame a season at about 1 MB.

## The root: the stream, and the page's own history

Haakon, 31 October 2026, to the design session's finding that the page held a full copy of the game for every season:
"Agreed, 100% sir!". The item's text now asks that "the engine sends the page what happened each season as a stream of
events, not a whole new copy of the world, and the page keeps a compact history (each season's events and what each seat
knew), from which any past season is rebuilt when looked back at; the same events drive item 17+++'s playback and item
19+++'s sounds."

Built as `docs/design/44-the-crash-and-speed.md` describes under "The stream": after each season the state's JSON is cut
into pieces at the items of its lists and dictionaries, each distinct piece kept once under a number (`SnapshotStore`); the
worker sends the page only the pieces new that season and the season's list of numbers (`SnapshotDelta`, `Live.states`),
the two members the page must never read redacted; the page keeps the pieces as its history (`SnapshotHistory`), rebuilds a
past season's JSON by joining when the player looks back, and reads the newest season incrementally (`IncrementalReader`):
an item whose text did not change keeps last season's object, and only new texts are parsed. The state the page reads is
exactly the state the engine wrote (`src/web/test/history.test.ts`). The season's `SeasonFrame`, with the season's
`GameEvent`s, is what each seat knew and what happened; it rides the same update, is built once in the worker and kept on
the page only. The worker's `stateAt` message is gone.

## What else changed

See the design note: snapshots share what did not change in the worker too (17 MB kept instead of 130 MB at season 31;
guarded by `src/game/test/snapshots.test.ts`; each piece copied flat, since V8 keeps a sliced string's whole parent alive),
the worker keeps only the last frame, the page shares unchanged frame parts and keeps six scenes, the JSON reader takes
names as written first, season fallbacks are counted once. Behaviour is unchanged: seeds replay exactly (the runner suite's
replay test), the web suite passes, the benchmarks are re-run before the PR.

With the shared snapshots alone, the capped run played the whole age: the worker's heap settled between 150 and 310 MB and
the page's between 50 and 240 MB over 102 seasons. The numbers with the stream are below.

## No white page

An error boundary and the page's uncaught errors show a plain screen with the seed, the season, the error and the build to
copy, and a way back ("Back to the game", "Reload into this game", "To the start screen"). The smoke test plants an error
and checks the screen and the way back.

## The newest version

Takes over by itself: at once off the game screen, at the next season on it (reloading into the same game with auto-play and
speed as they were, "Updated to the newest version" shown after); a version with new rules waits until the game is left.

## The recording

`docs/rounds/media/2026-11-01-17a-desktop-normal-speed.webm` (27 seconds, 800x500, 2.9 MB): the first seasons of a Free
game of seed 1 at normal speed on desktop, from the build as merged, recorded by `node src/web/soak.mjs --speed normal
--video <dir> --video-size 800x500 --minutes 0.45`. (A one-minute recording at full size, 7.6 MB, was made too; a release
to host it would be a new public surface, which this session did not open; the smaller one is kept with the report.)

## Readings taken

1. **"Until that game ends" means until the player leaves it.** A new version with new rules waits for the game on screen;
   the age's end is not the game's end for its players, who read the legends and chronicles then (item 14), and the new
   version could not show them an old-rules game. Principle: "Every rule a king needs is in the rulebook or the seat view":
   the record at the end is part of the game. The alternative, taking over the moment the age ends, would cut the ending off.
2. **The error screen is the page's, not the engine's.** An error in the engine's worker during a season already shows as a
   notice with the season (core.ts); the screen catches what the page itself throws, which is what leaves a white page.
3. **Snapshots stay whole in meaning.** A past season's panels read the exact state of that season, as before; only how the
   worker keeps the text changed.
4. **The stream carries the state's changes as pieces, and the frames carry the events.** The text's "stream of events"
   is read as two things that already exist in the engine: the season's `GameEvent`s and what each seat knew (the
   `SeasonFrame`), which travel once a season and are the compact history, and the state's changes, which travel as the
   pieces of its JSON new since the last season, so every panel reads exactly the engine's state with nothing re-derived on
   the page. Principle: "Code decides facts" (pillar 6): the page shows the engine's facts, never its own reconstruction of
   them; and behaviour unchanged, which the item asks of the optimization round. The alternative, rebuilding the panels'
   data on the page from semantic events alone, would re-implement the engine's rules on the page and could drift from them.
7. **The throttled phone's remaining frames: a question, not a reading.** The item states the bar for the throttled
   phone too, and the page does not settle a bar, so it goes to Haakon (question 1 below) with the reading taken: the
   long frames left there are the rendering of the season's layer writes (the season's washes change every turn by
   design) and the names placed, and item 17+++ "redraws the season textures" and plays the season out, which is where
   the season's drawing is rebuilt ("No stopgaps": not twice). The alternative is to rebuild the season drawing here,
   ahead of 17+++'s text, and hold 17a open until the phone profile passes.
6. **The page shows whole seasons.** Its state comes from the season's snapshot, taken after resolution, not from every
   change of phase within a season; nothing shown mid-season was ever a rule, and a half-resolved season is not a fact.
   Principle: "Code decides facts": the engine's season is the unit of truth the page shows.
5. **The script brains' memory is left as it is.** The script seats (the kings' and the council's brains) hold about 150 MB
   by season 31 in a Free game: what every script king remembers of every tablet, sighting and character ("a script
   character ... never loses it", "The game in one page"). It does not grow past the game's own ids and did not cause the
   crash; noted for item 18 or a later optimization round.

## The review

The reviewer (Opus, high; the diff, the item's text and "The game in one page") found two blocking points and seven to fix,
and checked the speed-ups equivalent (the heap's tie-break, the leg caches, the reader's fast path). Fixed:

1. **Blocking: the update took over 600 ms after a season showed, before its save might have finished**, so a reload on a
   slow phone could resume the season before. Now the worker tells the page the turn last saved (`Live.savedTurn`), and a
   new version takes over only once the newest season is saved and no season is under way.
2. **Blocking: the report's blanks**: filled below.
3. Leaving the game screen with a game held reloaded to the start screen: now a held game, on screen or not, is resumed
   into once saved; a version with new rules waits until the game is closed.
4. The "new rules" line showed while the version was still being read, or for good when it could not be: nothing is said
   while unknown, and the question is asked again at the next change.
5. Every window error event took the whole page to the error screen, Chrome's harmless ResizeObserver notice and
   cross-origin "Script error." included: events with nothing thrown are ignored.
6. The error screen itself read the session's state without a guard: it now stands whatever broke.
7. A play-on replayed on resume did not amend the season's snapshot: the runner amends it on every path.
8. The slot iterator read the live arrays for values but the captured ones for the walk: both from the captured arrays.
9. A null item in a list or dictionary would have been read as its type's zero: nulls stay null, and the schema given to
   the reader keeps its `opt`. Tests added for an amended season, the redaction of `finalByCap: true`, and a reset.

Notes kept as readings: the page's state changes at the season's snapshot, not at every phase change, so a panel in god
view reads the season just resolved, never a season half resolved (reading 6); the cut stops three levels down, so a
deeper list that grows is stored whole each season (none does today; the figure is watched in longer ages).

## Numbers before and after

All on this machine (4 cores, 16 GB), seed 1, a Free game of script kings watched at Fast speed in the built app
(`node src/web/soak.mjs`), the age ending at season 102. "Before" is develop as the item started; "after" is this branch.

| Whole game at Fast speed, desktop | Before | After |
|---|---|---|
| Time to the age's end | 155 s (1.0 s a season at first, 2.5 s late) | 117 s (about 1.0 s a season throughout) |
| Page heap, troughs and peak | 70 to 180 MB, peak 429 MB | 50 to 220 MB (holds the history), peak 314 MB |
| Worker heap | not readable then (grew about 5 MB a season) | 150 to 240 MB, flat from season 30 |
| Heap capped at 400 MB (a phone's) | the renderer died at season 20 ("Page crashed") | the age ended, worker 236 MB, page 50 to 240 MB |
| Phone profile (390x844, CPU slowed 4x) | 184 s; frames up to 655 ms mean, worst 2.8 s | to be measured in the review round |

| Engine, 31 seasons in Node (`src/web/test/probe-run.ts`) | Before | After |
|---|---|---|
| Time | 70.0 s | 59.7 s |
| Snapshots kept | 130 MB of strings (one whole state a season) | 17 MB of pieces, 50 MB of heap |
| Garbage collection | 11% | 11% |
| `Dict.entries` generators | 9% | gone (the iterator's tuples 5.6%) |
| Route-finding family | 17% (`cheapestRoute` 4.3, `connectionDays` 4.7, `edgeBetween` 3.2, `legPoints` 2.7, `crossingBetween` 2.0) | 7% (`edgeBetween` 2.3, `legPointsOf` 1.8, `crossingBetween` 1.7, `cheapestRoute` 1.7) |
| The snapshot cut | none | 3.7% (`add` and `take`) |

What the page does a season now, from the browser profile over 31 s of the game: idle 44%, V8's own work 38% (the messages'
structured clone and compilation), the incremental reader 3.6%, the map's layers 2.8%, garbage collection 1.8%. The worker
is the pace: the engine's season, then the cut and the frame.

What the state's JSON weighs, by field, at season 31 (KB): inbox 3118, characters 1193, events 1054, trails 502, scores
131, tablets 97, marketsSeen 94, payKnown 78, journeys 62, payFacts 55; the whole 6724. A frame: knownOwner 130, journeys
48 to 114, people 39, knownWalls 33, events 32; the whole about 1000 (shared on the page since).

The suite, the smoke test and the benchmarks (20 games, seed 1, `--verify-replay`, before against after) are recorded
below once run.

## Smoothness, measured (the bar of 31 October: no frame over about 50 ms)

Haakon, 31 October 2026: "The game still doesn't move slowly and smooth enough. Still hicks. hope that polish pass isn't
done already, because it far from sufficed.", then "Agreed to all, expertly!" to the design session's bar: frame times
recorded through a whole game, at normal and top speed, desktop and throttled phone, no frame over about 50 ms, the
longest frames and the count over 50 ms before and after, and a short recording.

`node src/web/soak.mjs --speed fast|normal [--phone]`, seed 1, whole games (102 seasons), before (develop) and after the
stream, before the smoothness work:

| | Frames drawn | Over 50 ms | Worst | Longest frames (ms at season) |
|---|---|---|---|---|
| Before, desktop, fast | 6572 | 337 (5.1%) | 617 ms | 617@80, 600@start, 467@66, 467@90, 400@85 |
| Before, desktop, normal | 8085 | 327 (4.0%) | 500 ms | 500@88, 467@98, 433@91, 350@102 |
| Before, phone, fast | (not ended in 40 min at season 95) | 9 to 14 of every 50 frames | 1550 ms | means of 100 to 140 ms a frame |
| Before, phone, normal | **the renderer crashed at 180 s** ("Target crashed": the white page) | | | |
| After the stream, desktop, fast | 4021 | 338 (8.4%) | 383 ms | 383@start, 233@98, 233@81, 217@95 |
| After the stream, desktop, normal | 6096 | 308 (5.1%) | 367 ms | 367@start, 250@102, 233@100, 233@79 |
| After the stream, phone, fast | 1123 | 177 (15.8%) | 2050 ms | 2050@start, 1417@96, 1400@102, 1250@63 |
| After the stream, phone, normal | 2477 | 338 (13.7%) | 1800 ms | 1800@start, 1417@99, 1317@96, 1100@86 |

A find on the way (1 November): with the state read deferred behind the frames, a season in which a new power rose drew
its frame before the page had registered the risen power, and the map's scene threw ("Sequence contains no matching
element" in `capital`); the error screen took over, as it should, and the game stood still on screen. The risen powers
now travel with every update (`Live.risen`) and are registered before a frame is drawn.

So the crash was gone on the phone profile too, and the worst frame halved on desktop, but every season still cost about
three long frames (200 to 380 ms on desktop, about a second on the throttled phone): the season's whole work, the worker's
message, the state read, React's redraw and the map's layers, landed in one or two tasks.

### The smoothness work, step by step (1 November)

Each step measured with `--trace` (the browser's timeline, the long tasks and what each was made of) on desktop at Fast
speed, whole games; the design note describes each.

| Step | Frames over 50 ms (of drawn) | Worst in play | Long tasks (count, total) |
|---|---|---|---|
| After the stream (above) | 338 of 4021 (8.4%) | 233 ms | 323, 33 s |
| The state read in a task of its own; the map's layers in budgeted steps | 406 of 4111 (9.9%) | 233 ms | 393, 37 s |
| The reader keyed by pieces, lists reused by prefix, objects member by member, the cut deep only under the characters | 351 of 4024 (8.7%) | 233 ms | 331, 32 s |
| The read spread over tasks of about 10 ms | 426 of 4015 (10.6%) | 200 ms | 369, 30 s; no script task over 50 ms |
| The timeline's verdict: 87 of 93 long tasks were the main thread waiting on the compositor (85 to 146 ms each) | | | |
| **The map in five composited layers** | **126 of 5123 (2.5%)** | **117 ms** (100 at a few seasons) | **33, 2.4 s** |

Whole games with the layered map, every speed and profile (`node src/web/soak.mjs --speed fast|normal [--phone]`):

| | Frames drawn | Over 50 ms | Worst in play | Longest frames (ms at season) |
|---|---|---|---|---|
| Desktop, fast | 5123 | 126 (2.5%) | 117 ms | 333@start, 133@0, 117@102, 100@10, 100@98 |
| Desktop, normal | 7345 | 81 (1.1%) | 83 ms | 333@start, 133@0, 117@102, 83@49, 83@73 |
| Phone (CPU slowed 4x), fast | 1669 | 558 (33%) | 433 ms | 1667@start, 600@0, 433@87, 417@79, 383@36 |
| Phone (CPU slowed 4x), normal | 3541 | 681 (19%) | 467 ms | 1633@start, 633@0, 467@87, 283@88, 267@99 |

The start (season -1 and 0) is the game's setup and the whole map's first drawing, not a season playing. On desktop the bar
is met in all but a few frames a game; on the throttled phone, where every step costs four times as much, it is not.

### The phone profile, traced

Its long frames, by the timeline: animation frames in which a map layer was rewritten (the draw, then the style
recalculation, layerization and paint of that layer: 150 to 180 ms each at that speed), the worker's message (44 ms mean,
224 worst), the reader's chunks (26 ms mean, since a 10 ms budget is checked only between fields), and the names placed
(49 ms mean). And a find: at Fast speed a season arrived before the last was read, and each new season replaced the read
under way, so the panels were read for 14 of 103 seasons. Fixed (a read finishes first, then the newest season), with: a
layer written only when its markup changed, the names placed only when something was written, and frames sent as
differences in their per-court maps (the design note has each). The final whole-game numbers are below.

### The final numbers (the build as merged)

Whole games of seed 1 (102 seasons), the last run of every profile, against develop as the item began:

| | Frames drawn | Over 50 ms | Worst while seasons play | Long tasks (count, total) |
|---|---|---|---|---|
| Desktop, normal: before | 8085 | 327 (4.0%) | 500 ms | 320, 36 s |
| **Desktop, normal: after** | 7474 | **69 (0.9%)** | **117 ms** (one at season 21; most 67 to 83) | 15, 1.3 s |
| Desktop, fast: before | 6572 | 337 (5.1%) | 617 ms | |
| **Desktop, fast: after** | 5254 | **110 (2.1%)** | **117 ms** (most 83 to 100) | 22, 1.8 s |
| Phone (CPU slowed 4x), normal: before | the renderer crashed at 180 s | | | |
| Phone (CPU slowed 4x), normal: after | 3797 | 706 (18.6%) | 283 ms (most 217 to 250) | 724, 63 s |
| Phone (CPU slowed 4x), fast: before | not ended in 40 minutes (season 95) | 9 to 14 of every 50 frames | 1550 ms | |
| Phone (CPU slowed 4x), fast: after | 2219 | 553 (24.9%) | 300 ms (most 233 to 283) | 629, 56 s |

The start (seasons -1 and 0: the game's setup, the first state read whole, the whole map's first drawing) is 333 to 350 ms on
desktop and about 1.7 s on the phone profile, before any season plays.

So the bar is met on desktop at both speeds but for a few frames a game (none over 117 ms while seasons play, against 500
to 617 ms before), and not on the throttled phone profile, where the game now runs to its end at both speeds (before, it
crashed at normal speed and did not get through at fast) but every season still brings a few frames of 200 to 300 ms: the
rendering of a season's layer writes and the names placed, at four times the cost and in software raster. What those frames
are made of is above; the next levers (season washes pre-drawn and toggled rather than rewritten, names placed from cached
measurements) belong with item 17+++, which redraws the season textures and plays the season out (reading 7).

## Benchmarks

20 games, seed 1, `--verify-replay`, develop as the item started against this branch: every line of the batch runner's
summary identical (wars, falls, press, standing orders, risen seats, characters' gold), every replay exact; 904.8 s before
(under load), 714.9 s after. Behaviour unchanged.

## Where it stands (31 October 2026, 19:30 UTC)

Haakon (via the orchestrator): "We are running out of usage. 97 percent. commit and push." Stopped here. Done and pushed:
everything above, the review's fixes, the suite (1264 passed), the smoke test, the benchmarks. Left: the throttled-phone
soak after the fixes (`node src/web/soak.mjs --phone`, one row of the table above), then mark PR #236 ready, CI green, merge
into develop, the milestone PR (check `merged_at` first), and the report to the orchestrator.

## Questions for Haakon

1. **The throttled phone's frames.** On desktop the bar of no frame over about 50 ms is met but for a few frames a game
   (69 at normal speed, 110 at fast, none over 117 ms while seasons play; 327 to 337 before, the worst 617 ms). On the
   phone profile (Chromium with the CPU slowed four times, rasterizing in software) the game now runs to its end at both
   speeds, where before it crashed, but each season still brings a few frames of 200 to 300 ms: the rendering of the
   season's layer writes and the names placed, not script. **Reading taken:** merge 17a with the desktop bar met and the
   phone's numbers stated, and take the phone's remaining frames up in item 17+++, which redraws the season textures and
   plays the season out. **Alternative:** hold 17a open and rebuild the season drawing now (pre-drawn washes toggled
   instead of rewritten, names placed from cached measurements), ahead of 17+++. Answerable with "merge" or "hold".
