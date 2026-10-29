# The map uncluttered (item 11c++)

As built in item 11c++ (report: [`rounds/2026-10-29-map-uncluttered.md`](../rounds/2026-10-29-map-uncluttered.md)). The
web app's drawing and its drawing scripts only: no rule, number or save version changed. Builds on item 11c+
([`32-the-map-at-a-glance.md`](32-the-map-at-a-glance.md)); the land drawn and its sources are in the dossier
[`history/13-the-land-drawn.md`](../history/13-the-land-drawn.md).

## Markers never overlap (`svg-renderer.ts`, `placeNames`; `styles/map-uncluttered.css`)

- After every render and every zoom, once whatever slides has stopped, the renderer measures every marker as drawn and
  places them greedily, most important first. A city comes in `NameOrder` (a Great King's capital, then the other
  capitals and the fortresses, then the rest by yield) with its badge, its counters, its people at court and its news.
  Where none of them touches a marker already placed, all are shown. Where one would, the city shows its small seal (the
  seal at 45 percent, no rings or emblem; a dark rim when troops of its stand hidden) and its counters, people and news
  give way; where even the small seal would touch, the city's mark gives way too and its province's colour says who
  holds it. Then the fleets at sea, the units destroyed this season, the travellers and the marks of the crossings, each
  where it touches nothing placed. Then the names, as item 11c+ placed them.
- Everything zooms back as the map is zoomed in: at the closest zoom nearly every badge is full.
- So that a city's own markers never touch each other, the counters stand above the city clear of its outermost ring
  (`--ring`, which grows with the walls), its people in rows of three to its left and its news to its right.
- A phone opens on the Levant a zoom step closer than item 11c+ opened it (6.7x, from 4.2x).
- The smoke test fails if any marker shown touches another (a badge, a counter, a person, news, a traveller, a unit
  destroyed, a mark), at every zoom step from the whole board to the closest, at 390 pixels and on desktop, from the
  opening and four seasons in, besides the names item 11c+ checked.

## Borders as natural lines (`art.ts`, `naturalLine`)

Each traced border (`border-data.ts`) is simplified past the steps of the grid it was traced on (0.45 board units) and its
corners rounded (Chaikin's cutting, three times), its two ends fixed, so borders still meet at their junctions and each is
smoothed once for both its sides. The traced data is unchanged.

## Relief (`scripts/map-relief.mjs`, `relief.jpg`, `relief-frame.ts`)

Real elevation (public-domain terrain tiles, zoom 7), resampled onto the board's projection at a pixel a board unit,
softened by three box blurs, shaded from the north-west at 40 degrees with the heights nine times exaggerated, high ground
a touch darker. Mid-grey where flat; drawn over the land and the holders' colours in soft light, clipped to the land.
115 KB. The hand-placed chevrons are gone; the ridge lines (`RangeLines`) remain as what the border tracer treats as ridges.

## Rivers (`scripts/map-rivers.mjs`, `river-data.ts`; `scripts/map-geography.ts`)

Natural Earth's courses where it has them (its European supplement for Anatolia's: the Hermos, the Kaystros, the Saros,
the Kalykadnos, the Iris, the Sangarios and the Arsanias); the rest traced on the elevation: the land drained by a priority
flood, each river followed downhill from its source to its mouth or the river it joins (the Orontes, the Litani, the
Khabur, the Balikh, the two Zabs, the Diyala, the Karun). Every lesser river is a border where it lies between two cities
(item 11c+'s rule), so the borders were traced again (`scripts/map-borders.ts`).

## The lakes and marshes of 1346 (`period-water.ts`)

Lake Huleh and its swamp, the Lake of Antioch, the Faiyum's larger lake, Lake Mareotis and the Delta's lagoons, drawn as
lakes; the marshes at the Gulf's head drawn as reed beds. A legend row each for marsh, relief and the small seals.

## Finer geography close up (`fine-geo.ts`, `geo-fine-data.ts`)

Natural Earth's 1:10m land, small islands, lakes and rivers, fine (a twentieth of a board unit) in the Levant and Cyprus,
the Nile and its Delta, and the Aegean coast, and as coarse as the board's elsewhere. A chunk of its own (103 KB, 40 KB
compressed), imported the first time the map is zoomed past 6x; the land's paths (the land, its clips, the coast, the
lakes and those rivers) take the finer set above 6x and the board's own again below 4.5x, so the whole board stays light
on a phone. The land of 1346 (the Gulf's head, the bay of Miletus) is cut from both sets alike.
