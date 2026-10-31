# The map read at a glance, and the newest version at once (item 11c+)

As built in item 11c+ (report: [`rounds/2026-10-29-map-at-a-glance.md`](../rounds/2026-10-29-map-at-a-glance.md)). The web
app's drawing and offline cache only: no rule, number or save version changed, so the engine and the script kings play
exactly as before.

## Borders along the land (`scripts/map-borders.ts`, `src/web/src/map/border-data.ts`)

- The board is laid on a grid of half a board unit (about 1.3 km). Each land province's city claims the land it reaches
  first; crossing a ridge (the ranges drawn), a river, or a desert's edge costs a long detour (36, 12 and 18 board units;
  30 for a great river where it was a frontier: the Euphrates from Carchemish and Emar upstream, the Tigris between Taidu
  and Nineveh). So a border runs along the feature between two cities, and along their midline where none lies between
  them. A great river that is the spine of the provinces along it (the Nile, the Euphrates below Emar, the Tigris below
  Nineveh) is no barrier. Right about a city nothing is a barrier: towns stood at their fords and passes.
- The empty lands' points (`Wastes`) claim land too, which is no one's; land no city reaches over land (an island no
  province is on: Lesbos, Chios, Samos, Rhodes) is no one's. A province reaches four units out to sea, and the coast clips
  it; it never crosses water onto land.
- Each border is traced once between its two sides, smoothed and simplified (0.12 units inland, 0.6 at sea), so
  neighbours meet without a seam; a province's shape is its rings of borders. Sea zones keep their Voronoi cells.
- Each connection's road is the cheapest way between its two cities within their two provinces (desert land 1.6 times
  as costly to cross, a barrier a quarter of its border cost), with the point where it crosses their border; a voyage's
  is the way over water. The script prints where the drawing and the connections disagree (in the report); neither is
  changed for it. Connections come from the attested roads (`distance.ts`) and do not follow the drawing.
- The land as it was in 1346 (`features.ts`; dossier `02-geography.md`, "The land as it was"): the Gulf's head towards Ur,
  the bay of Miletus, the Euphrates in its old bed by Sippar, Babylon, Nippur's country, Uruk and Ur, and the Delta's
  Pelusiac, Tanitic, Sebennytic and Canopic branches. The lands beyond the game are named as no one's (`GeoLabels`;
  dossier `08-beyond-the-edges.md`): Wilusa, Masa, Ahhiyawa, Keftiu, Tjehenu, Pala, Lullubi, Anshan.
- Run the script again (8 seconds) after changing a feature, a city's place or the map's provinces.

## Marks for what makes a journey hard (`src/web/src/map/crossings.ts`)

Every crossing in `Geography.Crossings` has a mark where its road crosses the border, by kind: a pass, a ford or ferry, a
desert's edge (a strait once the rules have one, item 11f); every rough province one at the heart of its land. Each has
its row in the legend. A tap opens a card that says, from the engine's own numbers (`legPoints`, `connectionKm`, `Pace`,
`TravelData`, `snowbound`, the game's `terrainDefence` and `winterArmyLoss`): the journey's days in each season against
open ground, the ferry and the flood, winter's danger on a snowbound pass, and whether it helps a defender who stands.

## Names, counters and arrows (`svg-renderer.ts`, `markup.ts`)

- **Names give way.** In order of importance (a Great King's capital, other capitals and fortresses, then by yield:
  `NameOrder`), each name is shown only where its box, measured as drawn, touches no name shown before it and no badge
  (another city's seal, walls, capital ring), counter, person, news or mark. It is placed again whenever the zoom settles
  and whenever the scene changes (and once the pieces have slid into place). Each name stands off its own city's
  outermost ring (`--ring`, which grows with the walls the viewer knows). The names of the land (rivers, ranges,
  deserts, the lands beyond) give way last, to everything above.
- **Counters gather by zoom.** A province's tokens stand in a row above its city, a token for each power's armies and
  for its fleets; where the row would not fit in the room to the nearest city at the current zoom, they gather into one
  token per power with its count, opening as the map is zoomed in.
- **Arrows follow the roads.** A move, a bounce, a support and an order being drafted are drawn along the roads of each
  province the unit passes (an army carried by sea along its sea zones), with a small mark at each province on the way
  and the mark of each crossing it takes. Travellers' tokens and roads follow the same roads.
- The test: the smoke test (`src/web/smoke.mjs`) fails if any name shown overlaps another name or a marker, at 390
  pixels and at 1280, at every zoom step from the whole board to the closest, at the opening and four seasons in.

## Views, cards and colours

- **Where the map opens** (`Play.tsx`, `openingView`): a seat on its capital at zoom 2.5; god view and watching on the
  Levant at zoom 4.2 on a screen narrower than 700 pixels, on the whole board on a wider one. Each view (the game and
  whose eyes) keeps its centre and zoom when left and come back to, for the tab's life. The ⤢ button shows the whole map;
  it then turns into ↩, which returns to where the map was.
- **Cards** (`MapCard.tsx`: a province, a mark, the legend) keep their title and close button pinned at the top, close on
  Escape, and close on a tap on the map outside them (that tap then does nothing else). While an order is drafted, a tap
  on a mark chooses the province under it.
- **Dark mode**: the map keeps its light colours, dimmed to 88 in a hundred; the panels and the cards over the map darken
  (`map-glance.css`).

## The newest version (`src/web/src/ui/update.ts`, `service-worker.template.js`)

The newest version is always the one played, without asking (item 17a, replacing item 11c+'s note and tap). The app looks
for a new version at start, when it comes back to the front, and every half hour. A new service worker installs beside the
old one and takes over by itself: at once when no game is on screen (on opening, on the start screen, when a game is started
or continued, a game still held from before counting as off screen while the start screen shows), and during a game at the
next season played, reloading into the same game from its last saved season (its log is saved after every season) under its
own id, with auto-play and speed as they were, and a line "Updated to the newest version" for a few seconds after. The
build writes the rules' save version to `version.json` (never cached); only a new version whose rules the game on screen
cannot carry on in (a save version is the rules') waits, with a line saying it takes over when the game is left, and takes
over as soon as the game screen is left or the game is closed. Another tab's take-over counts as a new version found here:
a page with no game on screen reloads at once, one with a game reloads into it at the next season. The error screen's way
back ("Reload into this game", `ui/ErrorScreen.tsx`) uses the same reload, carrying the game, auto-play and speed.
