# The phone's frames, the fourth step (#666): the units' paint

The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666, after the third step
(`docs/rounds/2026-11-12-phone-frames-3.md`), whose "What is left" named this one first: the units' paint, a third of a
season's paint on the bench (the second report), what repaints a unit while it slides or marches. Presentation only, from
`main` at b2b6b11.

The machine: a cloud container (4 cores, Chromium's headless shell 153 with software raster, Playwright 1.64.1), one run at
a time, nothing else running. The phone profile is 390x844 with the CPU slowed four times. The bench is the second
report's (`src/web/scrub.mjs`: seed 1 played to season 30 at Fast, paused, ten seasons back and ten on, each traced 1.5 s;
per season shown, means in ms); its runs differ by 15% or more, so only a large step is read.

## Where the units' paint comes from

**The bench, phone, on `main`** (b2b6b11), with the pieces' slide taken away (`--css` with `transition: none` on the units and
the travellers) and with the units' drawing hidden (`--hide units`), two rounds in turn:

| Run | busy | layerize | style | layout | paint | commit | script | tasks over 50 ms |
|---|---|---|---|---|---|---|---|---|
| `main` 1 | 1,101 | 204 | 65 | 38 | 186 | 33 | 145 | 33 |
| no slide 1 | 923 | 85 | 52 | 26 | 130 | 30 | 141 | 37 |
| units hidden 1 | 1,128 | 191 | 66 | 39 | 151 | 35 | 153 | 33 |
| `main` 2 | 1,188 | 213 | 69 | 39 | 200 | 35 | 146 | 31 |
| no slide 2 | 846 | 77 | 48 | 23 | 126 | 31 | 117 | 25 |
| units hidden 2 | 1,306 | 224 | 82 | 47 | 170 | 35 | 186 | 57 |

With no slide, layerization falls to about 80 from about 210 (three fifths less) and paint by about a third, in both
rounds; with the units hidden, layerization does not move and paint falls by a fifth at most. So the cost is not the units'
drawing but their **slide**: while a piece slides, the browser does work on the main thread in every frame.

**The slide is the compositor's, but it makes every other frame dear.** Four probes on the phone profile (seed 1, the map
paused, the browser's own trace, the probes kept out of the repository):

- *One unit slid alone*, nothing else moving: 6 to 7 main-thread frames with layerization and paint, whatever the slide's
  length (0.6 s or 2 s), and the same for 1, 5, 20 or 27 units slid at once (about 25 ms of layerization and 20 of paint on
  the phone profile); the same units moved without a slide, 2 frames and a third of that. A whole layer's `<svg>` faded by
  opacity also costs 6 such frames. The slide runs on the compositor (Chrome's trace gives no reason it could not); what costs
  is its start and its end.
- *`will-change: transform`* on every unit, kept, changes nothing of that.
- *The frames of a stepped season, 100 ms at a time*, with and without the slide: the same frames come (the renderer writing
  the season's layers in steps, the arrows drawing in), but while pieces slide each layerization costs 8 to 10 ms, and 1 to
  3 ms without. Only 8 units and 1 or 2 travellers slide in a step, all starting within 50 ms.
- *Under a load of one small paint change a frame* (as the renderer's steps make), 8 units slid on the compositor took
  layerization over 1.5 s from 60 to 120 to 150 ms and paint from 155 to 215 to 285; slid by the `translate` property, which
  Chrome plays on the main thread for an SVG element, 230 to 330 ms of layerization; each piece moved into an outermost
  `<svg>` of its own and slid there, 80 to 100 ms and 185 to 235 (the first, with the cloning).

So a running animation of an SVG piece makes every main-thread frame re-layerize the whole map at two to three times the
cost. The cheapest lever is to give the main thread no frames of its own while the pieces move. **During play at Fast**
(the probe watching the game from season 15 for 20 s), Chrome's trace names the animations that it could not hand to the
compositor: the army's dust (`transform-box: fill-box`, "the transform depends on the box's size") and the fleet's heel
(the same, and on a `<use>` placed by `x` and `y`). Both run through every march, so every frame of every march was a whole
main-thread frame at that dearer price. With the dust and the heel taken away (one run each): layerization 2,033 ms in the
20 s against 1,526, long tasks 34 against 28.

## What was built

The dust and the heel, drawn so that the compositor plays them, with the same look:

- `map/marching.ts` `trailMarkup`: each puff of dust stands at the origin of a group of its own and swells about it
  (`transform-origin: 0 0`), where it swelled about the centre of its own box.
- `map/tokens.ts`: a unit's figure is placed by its `transform` rather than `x` and `y` (the same place); a fleet's figure
  carries the point it heels about (`transform-origin`), `heelOrigin` in `map/figures.ts`: half across and 85% down the
  figure's drawn bounds, in the figure's own drawing, which is where Chrome turned it when it measured the figure's own box
  (found by a search for the pivot whose picture matched pixel for pixel). The bounds come from the fleet's path
  (`pathBounds`: moves, lines and cubic curves, a curve's bulge and not its handles), so nothing is measured on the page.
- `styles/playback.css`: the dust and the heel without `fill-box`; the heel's keyframes carry the figure's place.
- Tests (`figures.test.ts`): a path's bounds are its drawn extent (a curve's bulge, steps from the pen), and every power's
  fleet heels about a point inside its figure.

With them, the probe in play finds neither among the animations left to the main thread, and layerization over the same
20 s is 1,556 ms (2,033 on `main`, one run each).

**The look.** Every fleet in view at season 12 (desktop, zoomed in) set sailing and heeling, with the armies marching in
their dust mid-season, frozen at six moments over 1.7 s on both builds and compared pixel by pixel (1,024,000 pixels): from
0.65 s on, 51 and 242 pixels differ, by at most 4 levels of 255; at 0 and 0.3 s, 315 to 337 differ, all but 16 to 54 of them
by a level or so, and those in a spot 7 by 17 pixels at the window's left edge, off the map. On a page of their own, the
dust alone differs in 943 of 8,090 inked pixels, by at most 24 levels (the puffs' rims).

## Measured

**Soak, phone, Fast** (`soak.mjs --phone --speed fast --minutes 2`, seed 1; `main` and this branch, one run each in turn):

| Run | frames over 50 ms | the worst in play (ms, after season 0) | the browser's long tasks | seasons reached |
|---|---|---|---|---|
| `main` 1 | 180 of 5,751 (3.13%) | 250 | 114 | 69 |
| the dust and heel 1 | 229 of 5,633 (4.07%) | 200 | 157 | 66 |
| `main` 2 | 232 of 5,572 (4.16%) | 233 | 183 | 62 |
| the dust and heel 2 | 229 of 5,597 (4.09%) | 267 | 189 | 62 |

The step does not show in the frames over 50 ms: `main`'s two runs span 3.1 to 4.2% on this machine, and the branch's
lie inside them. The opening's first draw is 2.8 to 3.2 s and 0.7 to 1.0 s in every run, as before.

**What the long frames hold now** (the branch, `--trace`, 26 s from about season 15, 44 tasks over 50 ms): 26 are led by the
renderer's own step (`FireAnimationFrame`, 23 to 47 ms: one layer written in one step, past the 4 ms budget), with 12 to 20
ms of style and 10 to 17 of layerization after it; 10 by a layout of 16 to 32 ms; the rest by style or layerization. So the
frames over 50 ms are the season's writing and the browser's work on it, not the march's frames in between: taking the
march's own main-thread frames away removes work (a quarter of the layerization) but no long frame.

**The ceiling of the whole lever: nothing moving at all.** The same soak with reduced motion (the browser told the user
prefers it, so no piece slides or marches and no animation plays on the map; a copy of `soak.mjs` with that one setting,
kept out of the repository), on the branch: 212 of 5,927 frames over 50 ms (3.58%) and 184 of 6,050 (3.04%), against 3.1 to
4.2% with motion on either build. So everything the pieces' motion costs is worth at most about half a point of frames
over 50 ms on this machine, inside the soak's noise: no change to how the units are drawn or moved can bring the phone
under the bar. That is why there is no second try here (the brief's two tries at a step): the measure says where the
long frames are not.

**The work it saves, again** (the probe in play: seed 1 at Fast on the phone profile, the browser's trace for 20 s from
season 15; three pairs, each `main` then the branch):

| Pair | layerization, `main` | layerization, branch | paint, `main` | paint, branch | tasks over 50 ms, `main` | branch |
|---|---|---|---|---|---|---|
| 1 | 2,033 | 1,556 | 1,614 | 1,552 | 34 | 36 |
| 2 | 2,002 | 1,587 | 1,626 | 1,609 | 39 | 29 |
| 3 | 1,964 | 1,313 | 1,500 | 1,362 | 33 | 17 |

A fifth to a third less layerization in every pair, paint and style a little less or the same: less work for a phone in
every march, with the same look. Kept for that.

**Soak, desktop, every speed** (`soak.mjs --speed <speed> --minutes 2`, 1280x800, not slowed; `main` then the branch, one
run each in turn):

| Speed | `main`: frames over 50 ms | branch | the worst in play (ms), `main` / branch | the browser's long tasks, `main` / branch |
|---|---|---|---|---|
| Fast | 17 of 6,867 (0.25%) | 13 of 6,823 (0.19%) | 83 / 67 | 6 / 5 |
| Normal | 191 of 5,307 (3.60%) | 173 of 5,332 (3.24%) | 200 / 133 | 9 / 11 |
| Slow | 122 of 6,190 (1.97%) | 103 of 6,233 (1.65%) | 217 / 183 | 9 / 6 |

The opening's first draw is 0.57 to 0.68 s in every run, as before. At Fast desktop stands where it stood. At Normal and
Slow it is far from the bar, on both builds alike, and differently: the browser counts only 6 to 11 long tasks on the main
thread in two minutes, while 100 to 190 frames run over 50 ms (most of them 117 to 200 ms, in the first 15 seasons the
slower paces reach). Those frames are held up off the main thread. Normal and Slow are the paces where the land's change of
season moves (`--move`, 1 to 5 s a season: the season's ground fading slot by slot, the Nile rising by a clip-path), which
Fast skips.

**The hole check** of the third report (`scrub.mjs --holes`, and `--desktop`) on the branch: 104 checks on each, none with
anything left out on the screen.
