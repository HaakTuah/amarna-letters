# The phone's frames, the third step (#666): only what the view shows is drawn

The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666, after the second step
(`docs/rounds/2026-11-12-phone-frames-2.md`), whose "The next lever" named this one: at least half of every drawing's
elements lie off a phone's screen, and the browser's layerization, paint and style follow how much is drawn, so draw only
what the view shows. Presentation only, from `main` at 33fab48.

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

`docs/rounds/2026-11-12-phone-frames-3/holes.mjs` (kept with this report, not shipped): with every mark left out measured
as if drawn, none lies on the screen. 79 checks on the phone and 79 on desktop, each at rest, at each of eight steps of a
drag in each of four directions, after each of seven wheel steps out and in, three times during each of five button glides
(zoom out and in), twice during each of five key pans, and after stepping two seasons back and two on: none with a mark
left out on screen.

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

`main` on desktop (one run): busy 308, layerize 73, style 21, layout 8, paint 56, commit 9, script 29; 16 tasks over 50 ms.

The first try: layerize and paint about a tenth less, in line with a third of the marks left out, and within the bench's
noise.
