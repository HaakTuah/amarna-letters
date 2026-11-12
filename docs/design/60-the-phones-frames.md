# The phone's frames (#666)

A lane after item 17+++ part G (`52-the-season-plays-out.md`, "Smooth on a phone"), presentation only, on the same bar
and the same measure (`soak.mjs`); its report: `docs/rounds/2026-11-11-phone-frames.md`. What each long frame on
the phone profile was made of, and what changed:

- **A change recorded its whole drawing again.** The marks and the pieces were two `<svg>`s of some 1,600 and 2,300
  elements, and the least change in one had the browser record all of it again (7 to 9 ms a frame). Each of their layers
  is now an `<svg>` of its own, in the same order and with the same classes (`mount`), so a change records only its
  own layer.
- **The page read the layout it had just dirtied.** The camera's size (`zoom.ts`, `geometry`) is kept from the view's
  resize observer, and read afresh only where the player or an opening sets the view (`remeasure`), and the map's opening view (`GameMap`'s `opening`, which reads the window's width) is asked only when
  a view first opens; both read inside React's redraw forced a style and layout of what it had just written.
- **One task held the worker's message, the state's first read and the page's redraw.** The reader's first step runs
  in a task of its own, and the page redraws after a worker's update, a season played or a read in a task of its own
  (`notifySoon`), asked before the read so it comes first; React renders a change of the store in the microtasks of the
  task that tells it.
- **The works at the cities and the bands were parsed whole.** A city's works are its marks and their tooltips apart
  (`WorksPart`): a granary's tooltip, which changes every season, is written in place, and a city whose marks changed is
  patched where it stands (`patchParts`); the bands are a part a province, so a season parses only the bands that
  changed.
- **The slide's timing restyled every piece.** `--march-at` and `--march-ms` are registered as not inherited
  (`playback.css`), and each unit and traveller takes them from its layer, so a change restyles the pieces, not
  everything inside them (13 and 6 ms of style, twice a season).
- **The names checked every box placed for each name**: now a grid (`map/boxes.ts`), with the same answers.
- **Smaller costs**: the map's numbers are kept once written (`F`), thousands are formatted by one formatter, and the
  steps' budget is 4 ms, since a frame that writes the map pays some 30 ms of the browser's own work after them.

What is left is the browser's own layerization, paint and style (each about a fifth of a long frame, with the script that
writes the map) and the steps that still take 10 to 30 ms on the phone (the names, the tints, the works, the units). One
transform a symbol was tried and did not pay: the browser's work seems to follow how much is drawn together (or how many drawings; the bench does not
tell the two apart), not the transforms
(`docs/rounds/2026-11-12-phone-frames-2.md`, which also names the next lever, drawing only what the view shows;
`src/web/scrub.mjs` is the bench that sets two builds against each other).
