# Phone frames (#666, the polish lane)

Bug #666: on the phone profile at Fast about one frame in eight still took over 50 ms after item 17+++ part G
(`docs/rounds/2026-11-03-season-plays-out.md`, "Part G"). Presentation only: nothing in the engine, the requests, the
numbers or the save changes, so seeds replay as before and the benchmarks cannot move. Design note:
`docs/design/60-the-seasons-writes-in-one-frame.md`.

**The bar is not met by this change.** Long frames at Fast fell by about two fifths on the phone profile and three fifths
on desktop; #666 stays open, with what is left below.

## What the timeline showed

The phone profile at Fast on `main`, seed 1, the soak tool's timeline kept whole (`--trace-file`) and each frame over 50 ms
broken down by what ran between it and the frame before (20 s, 141 long frames of 642 while tracing):

- The main thread is busy nearly all the time (19.4 of 20.4 s), so the share of long frames does not fall when work gets
  cheaper: the next season's work fills the room. What counts is how much work stands between two frames.
- A long frame held, on average, the page's own steps in the frame (17 ms), layerization (16), the worker's message (12,
  in a fifth of them), the state's read in timer tasks (12, in four of five), style (9) and paint (8).
- The long frames were the frames that changed the map's markup: each layer step over its budget was a frame of its own
  (the works at the cities, the bands, the tints, the cities, the steles, then the names), six or seven a season, and each
  paid the browser's style, layerization and paint of the whole page again, 30 to 50 ms, beside its own time. 437 long
  frames in 69 seasons.

## What changed

- **`src/web/src/map/morph.ts`:** `patch`, `patchChildren` and `patchParts` find what differs and list the writes
  (`Writes`); nothing is written until the list is run. **`land-layers.ts`** (`retint`) and **`seasons.ts`** (`reseason`)
  list theirs the same way.
- **`svg-renderer.ts`:** `layer` and `drawWorks` only find; `write` makes the season's writes together, in the last step,
  with the pieces, the people, the selection and the margin, in a frame of its own (`ownFrame`); the results held back
  until the cities fall are found and written the same way when they land. A layer drawn again before its writes were
  made has them made first. Timed as `map:write`.
- **`src/web/src/session/idle.ts`** (new): `whenIdle`. **`incremental.ts`:** the state's read takes the page's spare
  time, a slice of at most 10 ms in what is left of a frame once drawn; after 50 ms without spare time it runs anyway,
  and a browser without idle callbacks reads in timer tasks as before. The first slice no longer runs inside the task
  of the worker's message.
- **Tests:** `src/web/test/map-morph.test.ts`: a patch found leaves the layer as it stood until its writes are made; a
  layer in parts found twice before anything is written ends as the last markup.

## Frames (soak tool, seed 1, two minutes a run, at Fast)

`node src/web/soak.mjs [--phone] --speed fast --minutes 2 --trace --profile`, each build served from its own `dist`
(`--site`), one run at a time on a quiet machine of four cores (nothing else running). `main` is 35cc31e.

| Run | `main`: frames over 50 ms | This branch |
|---|---|---|
| phone (CPU 4x), Fast, 1 | 437 of 4,460 (9.80%) | 262 of 5,539 (4.73%) |
| phone, Fast, 2 | 308 of 4,965 (6.20%) | 266 of 5,428 (4.90%) |
| phone, Fast, 3 | 432 of 4,570 (9.45%) | 288 of 5,268 (5.47%) |
| phone, Fast, 4 | 365 of 4,759 (7.67%) | |
| **phone, Fast: mean, and from run to run** | **8.3%, 6.2 to 9.8%** | **5.0%, 4.7 to 5.5%** |
| desktop, Fast, 1 | 104 of 6,651 (1.56%) | 41 of 6,850 (0.60%) |
| desktop, Fast, 2 | 99 of 6,681 (1.48%) | 36 of 6,925 (0.52%) |
| **desktop, Fast: mean, and from run to run** | **1.5%, 1.48 to 1.56%** | **0.6%, 0.52 to 0.60%** |

**The worst frame.** Every run's three longest frames are the tool's and the opening's on both builds: the opening's
first draw (2.7 to 3.4 s on the phone profile, 0.55 to 0.6 s on desktop, outside the bar as in part G), the first seasons
drawn (650 to 780 ms on the phone), and the frame in which the tool starts its profile and timeline at about season 15
(750 to 1,120 ms on the phone, 170 to 230 ms on desktop). After those, the worst frame in play:

| Run | `main` | This branch |
|---|---|---|
| phone, Fast | 317, 267, 350, 283 ms | 217, 267, 300 ms |
| desktop, Fast | 117, 117 ms | 100, 200 ms (one frame at season 10; the next longest 117) |

The seasons reached in two minutes: 69 to 72 on `main` and 74 to 76 on this branch on the phone; 71 and 72 against 75 and
77 on desktop. In the timeline's 20 s on the phone, the long frames fell from 141 of 642 to 70 of 905, and the long tasks
from 107 to 57. The state's read took 1.2 s a season on both (mean 1,186 and 1,221 ms), so the panels follow as before.

Each change alone, one run each on the phone at Fast: the read in spare time 9.0%; the writes in one frame 5.7%; both 4.7%.

## Same seed, same game

The change is in `src/web/src/map` and `src/web/src/session` (the page's reader and its map); nothing under the engine,
the requests, the batch runner or the save is touched. `scripts/test.sh` passes (the replays and the save round trip
among it), and the smoke test of the built app passes.

## What is left (#666)

On the phone profile a season now makes two or three long frames instead of six or seven. In the timeline of this
branch, the 70 long frames held on average the page's steps in the frame (18 ms, in 57 of them), the worker's message
(12, in 23), layerization (12), style (11), the state's read (8, in 46) and paint (7); taking away any one of them
leaves 50 or more of the 70 long.

- **The writing frame**, one a season and one more when the results land: the writes themselves (5 ms), the pieces and
  the people drawn, then the browser's style (up to 36 ms), layerization (up to 25) and paint (10) in one go: 100 to 140
  ms. The browser's part is what #666's design (the land on a canvas, one transform a symbol) takes away.
- **The names' frame** after it: 34 ms of measuring on the phone profile, then its own writes and their style and paint.
- **The worker's message**: the task that takes it runs 40 to 160 ms on the phone profile, of which the page's own
  handling (`page:receive`) is 2 to 5 ms; the rest is taken to be the message's structured clone, not measured apart. It
  carries the whole of `Live` each time (the annals, who wrote each trail, every season's counts).
- **Steps over the frame's budget that only find**: the works at the cities (18 ms), the bands (17), the tints (15). Alone
  in a frame they stay under the bar; beside a slice of the read or React's redraw they do not always.

## Readings taken

- **Unsure: one long frame a season in place of six.** The bar is "no frame over about 50 ms", and writing a season
  together makes one frame of 100 to 140 ms on the phone profile where there were six or seven of 60 to 80. Taken as
  serving the bar: fewer hitches, less of the browser's work in all, and the longest frame measured no longer than
  before. It rests on the worst frames above and on the bound tried first (every step in one frame: 5.7% long, but
  frames of up to 380 ms, so the finding stays spread and only the writes are gathered).
- **The lane is not done.** Its bar is not met, so #666 stays open and the commit does not close it; what is left is
  above, for whoever takes the lane on.
- **The lane's entry in `docs/BUILD-PROGRESS.md`** was not on `main` when this was built, so none is added here (it
  would collide with the change bringing it); the fix has its line in the polish lane's report.
- **Only Fast was measured in full** (the bug's own speed, on both profiles); Normal on the phone and on desktop was
  run once each as a check against regressions (below).
