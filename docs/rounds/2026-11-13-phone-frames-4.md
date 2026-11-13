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
