# The phone's frames (#666): a lane after item 17+++ part G

The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666: "On a phone at Fast, about one frame in
eight still takes over 50 ms". Presentation only, from `main` at 35cc31e. Measured as part G measured it
(`docs/rounds/2026-11-03-season-plays-out.md`, "Part G"): `npm run build --workspace src/web`, then
`node src/web/soak.mjs --phone --speed fast --minutes 2 --trace --profile` (seed 1), and the same without `--phone` for
desktop. The design note: `docs/design/60-the-phones-frames.md`.

## What the long frames were made of

Four looks, all on the phone profile (390x844, the CPU slowed four times, software raster), at Fast, seed 1:

- **The timeline of each long task** (the soak tool's `--trace-file`, each task over 50 ms taken apart with the page's
  own measures inside it). On `main`, 79 tasks over 50 ms in 20 s: the worker's message task, 60 to 130 ms (the state's
  first read step and React's redraw ran in its microtasks); the read's last step with the redraw again; the works at
  the cities (20 to 53 ms every season); the step after life (the units and the people, 20 to 45 ms, unmeasured); the
  names (28 to 61 ms); the bands, tints and memory (12 to 29 ms each); and after each, 10 to 44 ms of layerization and
  5 to 20 of paint.
- **A paused map, one small change a frame** (a bench: the season paused at 12, a circle written each frame for 30
  frames, the browser's own steps summed). A one-circle change cost 9 to 10 ms of paint and 8 to 9 of layerization:
  paint recorded the whole `<svg>` the change was in (the pieces' drawing held some 2,300 elements). With each layer
  moved into an `<svg>` of its own, the same change cost 1 to 2.6 ms of paint and 5.3 to 6.7 of layerization.
- **A CPU profile of an unminified build**: `geometry` (`zoom.ts`) read the view's width inside the sounds' look at the
  camera after each redraw, forcing a style and layout (655 ms in 25 s); `openingView` read the window's width at every
  redraw of the page, again a forced layout (70 ms); the names' overlap checks scanned every box placed (`touch`, a third
  of the placement); `toLocaleString("en")` in the towns' tooltips, and `fmt` writing every coordinate, a few ms a season.
- **What changes each season** (a mutation count): the works at the cities put about ten cities' marks in anew a season
  (213 nodes); `--march-at` and `--march-ms`, set and cleared on the pieces' layers each season, are inherited by every
  element inside every piece: 12.8 ms of style on the units' layer and 5.9 on the people's, each time, on the bench.

## What changed

All in `src/web` (the engine, the game, the worker's messages, the requests, the numbers and the save are untouched):

- `map/svg-renderer.ts` `mount`: the marks and the pieces in an `<svg>` a layer, in the same order and with the same
  classes, each its own compositing layer as the map's drawings already were.
- `map/zoom.ts`: the view's size kept from its resize observer. `components/GameMap.tsx`, `pages/Play.tsx`: `opening`
  is a function, asked when a view first opens.
- `session/incremental.ts`: the read's first step in a task of its own. `session/client.ts`: `notifySoon`, the page's
  redraw after a worker's update, a season played out or a finished read in a task of its own.
- `map/built.ts`, `map/morph.ts`: a city's works are its marks and their tooltips apart (`WorksPart`), and `patchParts`
  writes the tooltips in place and patches a changed part where it stands. `map/land-layers.ts`: the bands a part a
  province, drawn by the renderer's `drawBands`.
- `styles/playback.css`: `--march-at` and `--march-ms` registered as not inherited; a unit and a traveller take them
  from their layer. `svg-renderer.ts` `march` sets them on the travellers' layer, no longer on the people's group.
- `map/boxes.ts` (new): the names' overlap checks by a grid, with a scan's answers.
- `map/art.ts` `F`: each number kept once written. `ui/format.ts` `thousands`: one `Intl.NumberFormat("en")`.
- `svg-renderer.ts`: the steps' budget 4 ms (was 8).
- Tests: `map-boxes.test.ts` (the grid against a scan), `map-numbers.test.ts` (kept numbers and thousands write what
  they replace), `map-morph.test.ts` (tooltips written in place, a part patched where it stands), and
  `realm-borders.test.ts` and `map-scene.test.ts` read the new parts.

## Frame times (seed 1, two minutes a run, on a quiet machine, one run at a time)

| Run | `main` (35cc31e): frames over 50 ms | This branch |
|---|---|---|
| phone, Fast, run 1 | 359 of 4,726 (7.60%) | 216 of 5,650 (3.82%) |
| phone, Fast, run 2 | 352 of 4,838 (7.28%) | 229 of 5,614 (4.08%) |
| desktop, Fast, run 1 | 98 of 6,677 (1.47%) | 27 of 6,936 (0.39%) |
| desktop, Fast, run 2 | 96 of 6,678 (1.44%) | 28 of 6,901 (0.41%) |

- **The worst frames.** The opening's first draw (outside the bar) is 2.65 to 2.87 s on the phone and 0.55 to 0.63 s on
  desktop on both. Next in every run of both builds comes one frame at season 15 to 17, where the soak tool starts its
  trace and profiler: phone 917 and 767 ms on `main`, 700 and 750 on the branch; desktop 250 and 183, 200 and 200. After
  those, the worst frame in play: phone 317 and 267 ms on `main`, 200 and 200 on the branch; desktop 133 and 167, 83 and 83.
- **The browser's count of tasks over 50 ms** on the phone: 342 and 326 on `main`, 130 and 152 on the branch.
- **Per step on the phone** (mean ms, `main`, then the branch): the names 43.9 and 38.6, then 23.2 and 22.8; the works at
  the cities 22.8 and 22.6, then 10.8 and 10.4; the bands 18.9 and 20.0, then 8.6 and 7.3; the worker's message 5.6 and
  5.9, then 2.1 and 2.2; the tints 17.5 and 15.9, then 17.9 and 16.9 (unchanged).
- The seasons reached in two minutes: phone 72 and 71 on `main`, 74 and 74 on the branch; desktop 73 and 74, 76 and 78.

Along the way, on the phone (single runs, so within about half a point of noise): the first stage (the drawings split,
the size kept, the works' tooltips, the reads and redraws in tasks of their own) about 6.3% (a run with other work
beside it); with the names' grid, the formatter and the kept numbers, the works patched in place and the bands in parts,
4.8%; with the march's timing on the pieces only, 5.0%; the budget at 4 ms, 4.1%; at 2 ms, 4.5%.

## Same seed, same game, and the same look

Nothing under `src/engine` or `src/game` changed, nor the worker's messages, so a seed plays as before. The look: the
same season (seed 1, season 12, paused, reduced motion) shot on both builds and compared pixel by pixel. Desktop
(613,470 pixels): 5,677 differ, 5,378 of them by one or two levels of 255, 12 by 9 to 24, none by more. Phone (109,980 pixels):
27,912 differ: 26,531 by 1 to 24 levels, 1,359 by 25 to 48, 22 by more than 48, all along the edges of the marks, the
pieces and the bands (a map of the differences shows the outlines and nothing inside them), where each is now composited
from a layer of its own rather than drawn into one. No element is missing or moved, and the two pictures are the same to
the eye.

## Tried and not kept

- **The new drawings merged into the composited ones** (`will-change` left off them): the same gain in paint, but 1.4 ms
  more of layerization a change on the bench than with each drawing composited.
- **A step budget of 2 ms**: 4.5% against 4.1% at 4 ms, single runs, within noise; 4 ms draws a season's layers in
  fewer frames.

## What is left

The bar is not met: about one frame in 25 on the phone at Fast and one in 250 on desktop at Fast is still over 50 ms.
What remains in each long frame, from the last trace: the browser's layerization, 8 to 20 ms in every frame that writes
the map, then paint and style; and the steps that still take 10 to 30 ms on the phone, the names (23 ms), the tints (17,
mostly the governors' blocs patched), the works at the cities (10), the memory (10), the units (10 to 20, much of it the
marching's animations). Layerization follows the number of elements that carry a transform, clip or opacity of their own:
on the phone's opening view (close up) the works at the cities have 385, the units 248, the names 215, the cities 167,
the crossings' marks 153, the bands 115 (from 1,560 in all). The next step is part G's part 2, one transform a symbol
(its inner offsets and its `<use>` offsets folded into its coordinates), starting with the works at the cities; then the
names placed in slices across frames. #666 stays open.

## Readings taken

- **Unsure: every new drawing composited.** Each layer's `<svg>` keeps `will-change: opacity`, as the map's drawings
  had, so there are 20 compositing layers instead of 6. A phone's GPU memory could feel it; the tiles of a mostly empty
  layer that hold nothing are not rastered, and the merged variant cost more on the bench. A real phone was not measured.
- **A lane, not an item:** no check of the design document; its brief is #666 and its line in the progress file.
- **Measured on the base commit**, 35cc31e, the commit `main`'s runs used, before the branch was brought up to date with
  `main`, which since changed the engine (`order-makers.ts`), so that both builds play the same game.
- **The worst frame at season 15 to 17 is the soak tool's own** (its trace and profiler start there, in both builds),
  reported apart from the worst frame in play.
- **Fast only**, as the lane's brief measures it; the other speeds were not measured again, and nothing here adds work to a
  season at any speed.
- **The bot benchmarks were not run:** nothing they play changed.
- **The order of the reviews:** Codex's code review and the fallback reviewer's code and security review over the whole
  diff while the PR is a draft; the PR is marked ready only once they are clean (the trial's rule), and Codex's own
  security review on the ready mark is read when it comes.
