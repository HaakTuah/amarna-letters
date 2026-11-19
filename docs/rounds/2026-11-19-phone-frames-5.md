# The phone's frames, the fifth step (#666): the season's layers in slices

Sonnet built it. The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666, after the fourth step
(`docs/rounds/2026-11-13-phone-frames-4.md`), whose "What is left" named this first: the season's single steps. Presentation
only, from `main` at c5cda6b.

The machine: a cloud container (4 cores, Chromium's headless shell 153 with software raster, Playwright 1.64.1, run through a
browsers folder of the session's own), one run at a time. The phone profile is 390x844 with the CPU slowed four times. **No
real phone is available here**, so, as the earlier steps, all of it is a slowed desktop browser: numbers are set only against
`main`'s, run in turn on the same binary.

## Where the long frames come from

`soak.mjs --phone --speed fast --trace` on `main`, and the invalidations the browser's trace records:

- The steps that run over the 4 ms budget, the mean of each on the phone profile: the names 16 ms, the tints 15 to 17, the
  works at the cities 9, the bands 9, the cities 8, the memory 8. Each ends its frame, and the browser's own work on what it
  wrote (style, layout, layerization, paint, 30 ms and more) comes in the same frame: one such step is a frame over 50 ms.
- No one layer is the cost. With the season, the roads and works, or the tints hidden (`display: none`, one run each) the
  frames over 50 ms stay at 3.0 to 3.4%, against 3.0% (the soak's spread is about a point); with the whole map hidden, 1.0%. So it
  is the many writes together, in the frames they come in.
- The page's own panels: with `aside.side` hidden, 2.2% became 1.8%, inside the noise. Those panels are item 18b's and are
  not touched.

## What was built

A step of the season's drawing may give the step that goes on from it (`Step` in `map/svg-renderer.ts`), so a layer is written
in slices of the budget's size across frames:

- `map/morph.ts`: `patchSteps` (parse, then patch, stopping after the markup is parsed and after each of the layer's own
  children, `patchChildrenSteps`), and `patchParts` as a generator that stops after each part written anew. The patch's
  one-child step is shared with the whole patch (`patchOne`).
- `map/land-layers.ts`: `retint` stops after each 16 provinces' tints and before the governors' blocs.
- `map/svg-renderer.ts`: `layer()` writes the cities, the memory, the works at the cities, the bands and the tints in slices;
  the key of a layer is taken as drawn when its last slice is written (before that it stands as `Pending`), so a render that
  drops the steps still waiting writes it over where it stood, even to a key the layer had been drawn with before. Each
  slice is timed as `map:<layer>` (the soak's table: counts rise, the worst is a slice), and adds its layer to those the view's
  pass looks at that frame. The works layer, when the zoom changes, is still written whole in that frame.

## Measured

**Soak, phone, Fast** (`soak.mjs --phone --speed fast --minutes 2 --trace`, seed 1; `main` then the branch, two each):

| Run | frames over 50 ms | the browser's long tasks (over 50 ms) |
|---|---|---|
| `main` 1 | 167 of 6,084 (2.74%) | 108 |
| `main` 2 | 150 of 6,119 (2.45%) | 99 |
| branch 1 | 123 of 6,186 (1.99%) | 70 |
| branch 2 | 136 of 6,151 (2.21%) | 70 |

(Earlier runs of `main` that day: 2.39% and 2.17%.) About a seventh fewer frames over 50 ms and a third fewer long tasks:
the lane's first measured gain on the bar in a while, still far from it. The tints' step fell from a mean of 15 to 17 ms to
under 2 per slice. The names (15 to 17 ms, one step) are now the biggest single step left.

**Soak, desktop** (`soak.mjs --speed <speed> --minutes 2`, 1280x800; `main`, then the branch, one run each):

| Speed | `main` | branch |
|---|---|---|
| Fast | 21 of 6,991 (0.30%) | 8 of 7,033 (0.11%) |
| Normal | 122 of 5,588 (2.18%) | 121 of 5,624 (2.15%) |

Normal is the raster-bound one of the fourth report (the land's change of season drawn in software): no change, as expected.

## Play unchanged

Nothing under `src/engine`, `src/game` or `src/batch` changed, nor the worker's messages, the requests or the save, so a seed
plays as before and the benchmarks cannot move; no save version. `scripts/test.sh` passes (1,877 tests, 1 skipped), with two
new tests (a layer patched in slices stops after each child and ends as the whole patch does; a layer in parts stops after
each part written anew). The engine did not change, so the replays were not run again.

## What is left

The bar is not met: phone at Fast about one frame in 45; desktop Normal and Slow one in 45. #666 stays open. In order:

1. **The names' placement** (one step of 15 to 17 ms, now the largest): it measures every box in one layout state, so it
   cannot simply stop between frames; slicing it means measuring in slices against a layout nothing writes meanwhile, or
   measuring fewer boxes (a city's badge by its kept box, as the names are).
2. **The frames led by a layout** (10 to 16 ms of layout, ~150 dirty objects, in the season's first frame): the invalidation
   trace names the season's panel lines (`LI`, inline emblems) and the map's crop marks (`sheaves`); the panel is item 18b's.
3. **Desktop at Normal and Slow**: the raster of the land's change of season, to be measured with a graphics card.
4. **A real phone.**

## Readings taken

- **Unsure: slicing kept for a modest gain.** Two runs each, the branch's two inside nothing of `main`'s three: the long
  tasks (70 against 99 to 108) are the clearer sign than the frames' percentage.
- **A layer is partly written for a frame or two** between slices (some cities with this season's colours, the rest with the
  last's); the layers were already written in different frames, so the map was never all of one season in a frame.
- **The first slice is timed from the start of its step** (what builds the markup counts) and each later one from its own.
