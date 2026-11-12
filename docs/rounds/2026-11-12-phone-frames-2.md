# The phone's frames, the second step (#666): one transform a symbol did not pay

The phone-frame lane of the polish lane (`docs/BUILD-PROGRESS.md`), on bug #666, after the first step
(`docs/rounds/2026-11-11-phone-frames.md`), whose "What is left" named this one: fold each symbol's nested transforms
into one, starting with the works at the cities. Presentation only, from `main` at dde658d. Sonnet built it. The step was
built, measured twice, and **taken back**: it does not pay. No game code changes in this PR; what it adds is a bench
(`src/web/scrub.mjs`) and the measurements below, which say where the next gain is not and where it might be.

The machine: a cloud container (4 cores, Chromium's headless shell with software raster, Playwright 1.64.1), one run at a
time, nothing else running. It is slower than the machine of the first report, so its numbers are only set against each
other (`main` here 6.7% where the first report had 4% on its branch); the phone profile is 390x844 with the CPU slowed
four times.

## What was built

The works at a city were four nested groups round each mark: `works-at` (the city's place, an attribute), `wring` (the
ring's offset, a CSS translate by `--ring`, `--cs`, `--sym`), `sym` (the scale `--sym`) and `wk` (the mark's place in the
row). The step made `works-at` a plain group carrying `--ax`, `--ay` and `--ring`, and each `wk` carried one CSS transform of its
own (`translate(...) scale(var(--sym))` from those and its index `--wi`): the same place, size and look by the same
arithmetic, two groups fewer a city and one transform a mark where there had been four. The placement of the names read the
same `.wk-bg` boxes and the `.off` class, so nothing else needed to change.

## Measured

**Soak, phone, Fast** (seed 1, two minutes, `soak.mjs --phone --speed fast --minutes 2 --trace --profile`; the same
as part G measured):

| Build | Frames over 50 ms | Worst frame in play | The browser's long tasks |
|---|---|---|---|
| `main` | 344 of 5,169 (6.66%) | 217 ms (season 38) | 256 |
| the works folded | 327 of 5,162 (6.33%) | 233 ms | 256 |

The difference is inside the noise of a single run (about half a point). The opening's first draw is 3.07 and 3.48 s,
and one frame at season 17 is 1.2 s where the soak tool starts its trace and profiler, in both runs, as in the first report.

**Soak, desktop, Fast** (`main`, one run): 31 of 6,934 frames over 50 ms (0.45%), the worst in play 83 ms (234 ms at
season 17, the trace starting). The first report had 0.39 to 0.41% on its branch, so desktop stands where it stood.

**The scrub bench** (`src/web/scrub.mjs`, new): seed 1 played to season 30 at Fast, paused, the CPU slowed, then ten seasons
back and ten on, each traced for 1.5 s. The same seasons are drawn every time, so two builds, or one build with a drawing
taken away, are set against each other to about 10% (the soak's single run is not good enough for that). Per season shown,
means in ms, phone profile:

| Run | busy | layerize | style | layout | paint | commit | script | tasks over 50 ms |
|---|---|---|---|---|---|---|---|---|
| `main` (five runs) | 1,289 to 1,493 | 286 to 325 | 81 to 98 | 34 to 41 | 244 to 272 | 33 to 36 | 160 to 195 | 56 to 84 |
| the works folded | 1,426 | 314 | 96 | 38 | 265 | 36 | 183 | 82 |

The fold changed nothing the bench can see: layerization is not counted by transforms. (Desktop, `main`: busy 381, layerize
27, style 7, paint 20, script 11; 7 tasks over 50 ms.)

**What a drawing costs, by taking it away** (the bench with a layer set to `display: none`; each run is one build, and the
first row of each series is the same build with nothing hidden, so a series is read against its own first row):

| Hidden | busy | layerize | style | paint | script | tasks over 50 ms |
|---|---|---|---|---|---|---|
| nothing | 1,493 | 325 | 98 | 267 | 195 | 81 |
| the works (`works`) | 1,298 | 292 | 81 | 247 | 151 | 61 |
| the memory | 1,353 | 296 | 92 | 255 | 173 | 72 |
| the bands | 1,361 | 292 | 87 | 261 | 164 | 71 |
| the cities | 1,364 | 265 | 82 | 275 | 147 | 58 |
| the names | 1,396 | 319 | 89 | 256 | 168 | 70 |
| the works at the cities (`worksat`) | 1,417 | 299 | 91 | 259 | 178 | 67 |
| the units | 1,347 | 290 | 85 | 182 | 180 | 69 |
| the life marks | 1,494 | 334 | 99 | 272 | 195 | 86 |
| the outlaws | 1,452 | 319 | 93 | 265 | 180 | 82 |
| the people (`.people`) | 1,394 | 318 | 86 | 243 | 162 | 73 |
| the tints | 1,365 | 304 | 87 | 255 | 162 | 67 |
| the season's ground | 1,443 | 328 | 93 | 269 | 188 | 74 |

| Hidden (further runs; the folded build for the pieces) | busy | layerize | style | layout | paint | script | tasks over 50 ms |
|---|---|---|---|---|---|---|---|
| all the marks (`.map-marks`) | 1,349 | 216 | 74 | 38 | 274 | 161 | 60 |
| the pieces' drawings (`worksat`, `units`, `life`, `courts`, `travellers`, `outlaws`, `moves`, `scenes`) | 1,265 | 267 | 75 | 41 | 105 | 170 | 47 |
| the marks and all the pieces (`.map-marks`, `.map-upper`) | 647 | 6 | 7 | 16 | 26 | 130 | 19 |

Read together:

- **No one drawing is the cost.** Each drawing taken away alone saves 0 to 18% of the layerization (the cities most) and 5 to
  32% of the paint (the units most); the pieces together save 18% of the layerization and 60% of the paint, the marks together
  34% of the layerization. Yet taking away **both** the marks and the pieces leaves layerization at 6 ms from 310, style at 7
  and paint at 26. So the browser's work follows how much is drawn together, not any one drawing and not the number of
  transforms: what hiding a whole layer saves is an upper bound on what folding the transforms inside it can save.
- **Other levers tried in the bench, with no effect:** `overflow: hidden` on the drawings (busy 1,433, layerize 314), and
  `contain: strict` (1,272 and 303; the same build with nothing was 1,289 and 287). Without `will-change` on the drawings
  (a forced-layerize probe, one layer's visibility toggled each frame) layerization went from 8 to 14 ms, as the first report
  found: the composited drawings stay.
- **A forced probe of the floor:** with the whole map drawn, one toggled drawing costs 7 to 8 ms of layerization on the phone
  profile; with one drawing on the page 2.4; with six small ones 3 to 4; with six large ones 6 to 6.6. A season's frames are
  full of this: in a step back, 16 layerizations of 7 ms each.

**What the long frames are made of** (a 25 s trace on the works-folded build, 48 tasks over 50 ms, 3.25 s in all):
script 0.92 s (the renderer's steps and the page's redraw), paint 0.74 s, layerization 0.61 s, style 0.60 s, layout 0.25 s,
commit 0.08 s. Five costs of about a fifth each: a lever on one of them cannot take a 70 to 100 ms frame under 50 ms.

**Where the elements are** (the phone's opening view, season 30, elements whose box meets the screen, of all in the layer):
works 152/302, the cities 249/493, the works at the cities 304/809, the units 145/469, the bands 86/164, the tints 63/223,
the memory 57/136, the season's ground 67/166. About half of each drawing lies off the screen.

## What was not done

- **Other speeds:** Normal and Slow were not measured; nothing here changes what a season writes at any speed.
- **Desktop with the fold:** not run, since the step was taken back.
- **The bot benchmarks and the seed replays were not run:** no game code changed.

## The next lever

Not transforms: layerization, paint and style follow how much is drawn together, in about equal parts with the script that
writes it, and nothing in one drawing stands out. In the order the evidence points:

1. **Draw only what the view can show** (a design call, for an Opus helper at high): about half of every drawing's elements
   lie off a phone's screen, and the browser's layerize, paint and style costs follow the element count in a drawing, as hiding
   the whole of it shows. The marks and pieces would be written for the view and a margin, and the rest when the view moves
   (a pan redraws, a zoom already does). Risks: a redraw on every pan, the names' placement, taps, the followed path.
2. **The units' paint** (a third of a season's paint on the bench, 85 ms in 20 steps): what repaints a unit while it marches,
   which the compositor should do alone.
3. **The names in slices across frames** (the first report's list), the step that is still 23 ms.
4. **A real phone.** All of this is a slowed desktop browser with software raster; a phone's GPU rasterises the layers
   that this machine's CPU does.

#666 stays open.

## Readings taken

- **Unsure: the step is taken back, not kept as harmless.** It leaves two groups fewer a city and the same look, but no
  measure sees a gain, and its look is unproven (no pixel comparison was made once the numbers said it did not pay). A
  fold kept for no gain is a change to the stylesheet's arithmetic that a later reader must trust.
- **Unsure: hiding a drawing as the upper bound for folding its transforms.** A drawing taken away stands for the most any
  change inside it could save; it is a proxy, and the bench's runs differ by about 10%, so only the large steps (both layers
  hidden; the units' paint) are certain.
- **Unsure: how much is drawn, or how many drawings.** Hiding both sets of drawings also takes away 16 of the 20 composited
  drawings, and the bench does not tell the two apart; the first report found the drawings merged cost more layerization,
  so drawing less is the lever tried first, a probe of the layer count the cheap one beside it.
- **The stop rule:** the brief says to stop when a measured step stops paying and to name the next lever. The step was
  measured twice (the soak and the bench) and the bench was then used to look for where a cost lies, once.
- **A lane, not an item:** no check of the design document; its brief is #666 and its line in the progress file. No line
  is added under "Fixes, one line each" in the polish lane's report, since nothing was fixed.
- **The bench is a tool:** `src/web/scrub.mjs` is a development script like `soak.mjs`, not shipped in the app.
