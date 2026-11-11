# The season's writes in one frame (#666, the polish lane)

The bar is item 17a's (`44-the-crash-and-speed.md`, "Smoothness, measured"): no frame over about 50 ms while a season
plays, at every speed, on desktop and on the phone profile (`soak.mjs --phone`).

Part G (`52-the-season-plays-out.md`, "Smooth on a phone") left each layer step a frame of its own, and every frame that
changes the map's markup costs the phone profile the browser's style, layerization and paint of the whole page, 30 to 50
ms however small the change: six or seven long frames a season, each a step's own time and that cost. So finding what to
write and writing it are apart (`docs/rounds/2026-11-11-phone-frames.md` has the numbers):

- **A layer step only finds its writes.** `map/morph.ts` (`patch`, `patchChildren`, `patchParts`) and the writers in place
  (`retint`, `reseason`) compare the new drawing with the page as it stands and put each change on a list (`Writes`); the
  page is not touched. Such a frame costs its step's time and nothing of the browser's.
- **The last step makes them together** (`SvgMapRenderer.write`, timed as `map:write`), with what was always written
  directly (the pieces, the people, the selection, the margin), in a frame of its own when the frame has already worked
  (`ownFrame`, past 2 ms); the season's results, held back until its cities fall, are found and written the same way when
  they land. The names are placed in the frame after, as before.
- **A layer drawn again before its writes are made** (a season arriving before the last was written) has them made first,
  since what differs is found against the page; the works at the cities need not, their parts being kept as they will
  stand (`Parts`). A new render keeps the writes found and makes them with its own.
- **The state's read takes the page's spare time** (`44-the-crash-and-speed.md`, "Smoothness, measured"), so its slices
  no longer stand between two frames that are due.

On the phone profile at Fast the frames over 50 ms fell from about one in twelve to one in twenty, and on desktop at Fast
from 1.5% to 0.6%; the longest frames are no longer than before. The bar is still not met on either (#666): what remains
is the one writing frame a season (its style, layerization and paint, with the pieces drawn), the names' frame after it,
and the task that takes the worker's message.
