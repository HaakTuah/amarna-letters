# The phone's frames, the third step (#666): only what the view shows is drawn

The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666, after the second step
(`docs/rounds/2026-11-12-phone-frames-2.md`), whose "The next lever" named this one: at least half of every drawing's
elements lie off a phone's screen, and the browser's layerization, paint and style follow how much is drawn, so draw only
what the view shows. Presentation only, from `main` at 33fab48 (measured there; `main` at 25cc7bd merged in after).

The machine: a cloud container (4 cores, Chromium's headless shell with software raster, Playwright 1.64.1), one run at a
time, nothing else running. The phone profile is 390x844 with the CPU slowed four times. The bench is the second report's
(`src/web/scrub.mjs`: seed 1 played to season 30 at Fast, paused, ten seasons back and ten on, each traced 1.5 s; per
season shown, means in ms); its runs differ by 15% or more, so only a large step is read.

## What was built

`src/web/src/map/in-view.ts` (new): a mark or piece of the map whose place lies outside the view and a margin round it is
left out of the drawing (`data-out`, `display: none` in `map.css`), so the browser neither styles, lays it out, layerizes
nor paints it. It stays in the page as it was written; the layers are patched as before (`morph.ts` keeps the mark), and it
comes back as the view comes near it.

- **Where a mark is:** its own translate (a city, a name, a unit, a token, a city's works, a crossing's mark), or the bounds
  of a path written in absolute points (a road, a band). Anything else is kept whole: a path with arcs or relative steps, a
  group of shapes, the drawings below the marks (the land, the season's ground, the realms' colours), the season's arrows,
  scenes and selection (they play animations of their own, which would start again on coming back), and a piece marching
  (it may cross the view from outside it). A piece sliding from one season's place to the next counts where it stood too,
  until its slide ends.
- **How far a mark reaches** from its place, by its kind, in screen pixels: the most measured at every zoom on the phone and
  on desktop (seed 1, season 30), and a third more: a city's works 185, a court's people 130, an outlaws' band 105, a
  traveller 100, a city 50, a stele 45, a crossing 30, a life mark 25; a name, a unit and anything else 200 (a name 125
  measured, longer under other name settings; a unit 150); a path's stroke 20. The margin is a tenth of the view a side.
- **When:** in the frame the view moves (`zoom.ts` tells the renderer at each move, before the frame is painted), only when
  the view has left what is drawn; for a glide, all it crosses from start to end, since each edge of a view moves one way
  only; when a gesture or glide settles, exactly for the view; after each layer is written, for what was written; and when a
  piece's slide or a season's marching ends.
- **The names' placement** (`svg-renderer.ts`, `placeNamesNow`) skips a name left out, and leaves what is left out as it
  was placed last.

## No hole at the view's edge

`node src/web/scrub.mjs --holes [--desktop]` (new, on the bench): seed 1 at season 30, and at each check every element
left out measured as if drawn; none may lie on the screen. 78 checks on the phone and 78 on desktop: at rest; at each of
eight steps of a drag in each of four directions, mid-gesture, and after each; after each of seven wheel steps out and in;
three times during each of five button glides (zoom out and in) and after each; twice during each of five key pans; after
stepping two seasons back and two on. None on either, for both tries. A first run of the check found one: the season's
capture marks, kept whole for their animations, were still marked when their own layer was written; fixed before any
measurement below.

**The look.** The same views on both builds, with reduced motion so nothing is caught mid-animation (seed 1, season 30, the
opening view, after the drags, and after the zooms and pans), compared pixel by pixel: on desktop 64, 32 and 133 pixels of
a million differ, none by more than 24 levels of 255; on the phone 854, 1,813 and 206 of 329,160, all along the rims of a
few marks (the camp-fire and band marks, a crossing), every element present and in its place, the pictures the same to the
eye. With motion the pictures also differ where the battles' bursts and the marchers' dust were caught at another moment.

## Measured

**What is left out** at the bench's view (the phone's opening view, zoom 6.7, season 30; elements in each drawing, of all,
left out and off the screen):

| Drawing | all | left out (first try) | left out (second) | off the screen |
|---|---|---|---|---|
| the roads (`works`) | 303 | 91 | 158 | 204 |
| the steles (`memory`) | 137 | 17 | 48 | 75 |
| the bands | 165 | 25 | 48 | 106 |
| the crossings' marks | 406 | 128 | 210 | 247 |
| the names | 217 | 84 | 84 | 146 |
| the cities | 494 | 178 | 264 | 301 |
| the outlaws | 151 | 36 | 66 | 92 |
| the works at the cities | 952 | 376 | 376 | 570 |
| the life marks | 96 | 25 | 65 | 72 |
| the units | 470 | 135 | 135 | 345 |
| the people | 103 | 54 | 54 | 77 |

The first try: translates only, every mark's reach 200 px, which left out about a third of all the marks and pieces (1,150
of 3,600) and half of those off the screen. The second: each kind's own reach, and the paths of points: about 1,500, two
thirds of those off the screen.

**The bench, phone** (`scrub.mjs`, per season shown):

| Run | busy | layerize | style | layout | paint | commit | script | tasks over 50 ms |
|---|---|---|---|---|---|---|---|---|
| `main` 1 | 1,391 | 302 | 92 | 36 | 251 | 33 | 167 | 76 |
| `main` 2 | 1,430 | 327 | 93 | 37 | 270 | 36 | 184 | 80 |
| `main` 3 | 1,380 | 311 | 89 | 35 | 255 | 37 | 171 | 67 |
| first try 1 | 1,325 | 262 | 79 | 42 | 223 | 35 | 160 | 54 |
| first try 2 | 1,399 | 281 | 87 | 43 | 234 | 36 | 177 | 62 |
| second try 1 | 1,164 | 212 | 73 | 38 | 196 | 34 | 155 | 41 |
| `main` 4 | 1,288 | 296 | 82 | 35 | 248 | 35 | 150 | 54 |
| second try 2 | 1,266 | 221 | 79 | 43 | 216 | 35 | 164 | 44 |
| `main` 5 | 1,361 | 304 | 85 | 36 | 259 | 35 | 163 | 62 |

`main` on desktop (one run): busy 308, layerize 73, style 21, layout 8, paint 56, commit 9, script 29; 16 tasks over 50 ms.

The first try: layerize and paint about a tenth less, in line with a third of the marks left out, and within the bench's
noise. The second, each run beside a run of `main`: layerization 212 and 221 against 286 to 327 in all five of `main`'s
runs (about a quarter less), paint 196 and 216 against 248 to 270 (a fifth less), style a tenth less, busy time 1,164 and
1,266 against 1,288 to 1,430, and 41 and 44 tasks over 50 ms against 54 to 80. Layout and script stand where they stood:
the marking costs little (`map:inview`).

**Soak, phone, Fast** (`soak.mjs --phone --speed fast --minutes 2`, seed 1; the second try against `main`, one run each in
turn):

| Run | frames over 50 ms | the worst in play (ms, after season 0) | the browser's long tasks | seasons reached |
|---|---|---|---|---|
| `main` 1 | 281 of 5,275 (5.33%) | 217 | 217 | 63 |
| second try 1 | 250 of 5,446 (4.59%) | 300 | 192 | 62 |
| `main` 2 | 303 of 5,258 (5.76%) | 250 | 209 | 62 |
| second try 2 | 168 of 5,884 (2.86%) | 183 | 109 | 69 |

The opening's first draw (season -1 and 0) is 3.1 to 3.6 s and 0.7 to 0.9 s in every run, as before. Per step on the phone
(mean ms, `main`'s two runs, then the second try's): the names 27.7 and 29.1, then 24.0 and 19.7 (fewer names measured);
the works at the cities 13.6 and 12.6, then 13.6 and 10.9; the cities 8.8 and 11.5, then 11.3 and 9.9; the bands 8.6 and
9.1, then 10.0 and 7.7. The marking itself (`map:inview`) ran some nine times a season, 2.0 and 1.8 ms on average, about
1 s in two minutes. Its worst, 120 to 124 ms, is its first pass, at season 0 inside the opening's first draw (every mark's
place read for the first time; 81 ms in a run of its own); in play its longest are 17 to 19 ms, a few times a minute.

**Soak, desktop, Fast** (`soak.mjs --speed fast --minutes 2`, one run each in turn): `main` 20 of 6,856 frames over 50 ms
(0.29%) and 6 of 7,006 (0.09%); the second try 19 of 6,938 (0.27%) and 11 of 7,013 (0.16%); the worst in play 67 to 83 ms
on both, the opening 0.6 s on both. The same: desktop opens on the whole board, where nothing lies off the view. The
marking ran some four times a season, 0.8 ms on average.

## Play unchanged

Nothing under `src/engine`, `src/game` or `src/batch` changed, nor the worker's messages or the save, so a seed plays as
before and the bot benchmarks cannot move; no save version. `scripts/test.sh` passes (1,860 tests, 1 skipped, as on
`main`), the smoke test of the built app passes (its check that no name overlaps a marker now skips a name not drawn,
which measured as an empty box at the screen's corner), and `scripts/sim.sh --games 50 --seed 1 --verify-replay`:
SIMRESULT.

## What is left

The bar is not met: on the phone at Fast about one frame in 25 to 35 is still over 50 ms, and on desktop one in 400 to
1,000, the worst in play 67 to 83 ms. Normal and Slow were not measured again; nothing here adds work to a season at any
speed. What remains, in the order the evidence points:

1. **The units' paint** (the second report: a third of a season's paint on the bench): what repaints a unit while it
   marches, which the compositor should do alone. The units are the drawing this step leaves out least of (135 of the
   345 elements off the screen), since a unit with its counters reaches 200 px.
2. **The names in slices across frames**, the step that is still 20 to 24 ms on the phone.
3. **The marking's own passes**: about 1 s in two minutes on the phone, 17 to 19 ms at worst in play; a pass reads every
   mark's place in the layers written, where a kept index of each layer's marks would read only those that changed.
4. **A real phone.** All of this is a slowed desktop browser with software raster.

#666 stays open.

## Readings taken

- **Unsure: the reach of each kind of mark** (`ReachPx` in `in-view.ts`) is measured, not derived: the most each kind
  reached at every zoom of one game, on the phone and on desktop, and a third more. A mark drawn larger later (a longer
  name under other name settings, a city with more works) could reach past it and show cut at the view's edge until the
  view moves. `scrub.mjs --holes` is the check to run when a mark grows; a name, a unit and any mark not in the table take
  200 px, a third past the largest measured.
- **Unsure: names keep their last placement while left out.** A name or marker that comes into view mid-drag shows as it
  was last placed until the gesture settles and the names are placed again (140 ms after it ends), where before every
  name was placed for the whole board each time. With a margin of a tenth of the view, this is the strip a drag uncovers.
- **Unsure: a hole could show on a real phone where the bench saw none.** A mark comes back in the frame the view moves,
  before it is painted; on a phone far slower than the profile, the frame that brings back a wide strip at once (a fast
  fling) is a long one rather than a hole.
- **What is kept whole:** the season's arrows, scenes and selection, since a mark that comes back plays its CSS animation
  from its start; the drawings below the marks (the season's ground animates its change; the realms' colours and the
  land are paths with arcs). A piece marching, and a piece sliding from one season's place to the next, stays drawn until
  it stops.
- **The two tries:** the brief allows two tries at a step before writing it up. The first (one reach of 200 px for every
  mark, translates only) left out a third of the marks and moved the bench by about a tenth, within its noise; the second
  (each kind's own reach, the paths of points) left out two thirds of what is off the screen and paid.
- **The look compared with reduced motion**, so that both builds stand still at the same moment; with motion, the
  battles' bursts and the marchers' dust differ by when the picture was taken.
- **A lane, not an item:** no check of the design document; its brief is #666 and its line in the progress file.
- **The bot benchmarks were not run:** nothing they play changed.
