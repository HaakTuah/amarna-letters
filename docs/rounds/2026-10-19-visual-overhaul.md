# Round report: the visual overhaul (Build order item 2)

Specification: `docs/prompts/VISUAL-OVERHAUL.md` (the owner's prompt, clarified during the round to put watching
on a phone first) and "The map (planned next)" under "Spectator mode and analysis" in the design document's main
tab, including the date labels and the "follow this character" view. Branch `item/visual-overhaul`, built on
`develop` (item 1). Presentation only: no rule, state, view, prompt or balance changed.

## Summary

- The web map is redrawn as a museum map in a Late Bronze Age palette: seas and coasts, the Nile, Euphrates and
  Tigris with four lesser rivers, mountain ranges, deserts, irrigated fields, and each province's fertility as field
  furrows. Provinces have shapes; each power has a colour, an emblem on every city it holds and every unit, and a
  border line of its own, so the map reads without colour. Armies are chariots, fleets ships, envoys clay tablets,
  spies eyes, gold oxhide ingots.
- Each season's moves, attacks, supports, bounces, captures and destroyed units are drawn and stepped through with
  the timeline; units slide along their moves. Envoys, spies and gold are drawn on a guessed road with where they go
  and when they arrive, and at foreign courts and posts, as each view may know them.
- In a power's view the fog of war is a gradient from the court's own earlier sights: in sight is clear, seen before
  is washed over more thickly with age, never seen is hatched; units it saw are kept as dated ghosts; rumours and spy
  reports are placed where they came from. Ownership is drawn as known.
- "Follow this character": a person's path on the map and their life, read from the record, within what the view
  may know.
- One date label everywhere, an ending line in the header, a status for unfinished messages in the trail, and the
  sleeping kings in god view, all with the same labels.
- Phone first: a whole bot game can be followed on a phone held upright, one-handed, without the page scrolling;
  the map fits with pinch-zoom and pan; panels open from it and drop back without losing its place; landscape and
  safe areas work. A human seat can play on a phone (a province list, thumb-sized targets, a short letter field).
  The app installs to the home screen and starts from cache.
- Measured on an emulated mid-range phone (4x CPU slowdown, slow 4G): numbers and limits below. The browser build
  shrank from 5.0 to 3.2 MB compressed.
- Terrain (rough provinces, the Sinai desert, six crossings, the ordered river courses) is stored as engine map
  data that nothing in the engine reads, for the siege package. All 654 tests pass (633 before, plus 21 new), and
  seeds 1-10 replay to logs identical byte for byte with those before the round.
- After review: a court's view no longer says how a province changed hands unless the court saw it or was a party to
  it, and four smaller leaks and slips are fixed (see "Review findings").

## What was built

### Ground rules: what touched the engine project

Two additions, both read by nothing in the engine:

- `Geography` (`src/Amarna.Engine/Geography.cs`): terrain per province (rough: Mira, Lukka, Isuwa, Amurru, Arbela,
  Tamassos; desert: Sinai), crossings per connection (the Cilician Gates, the Taurus, the Amanus as mountain passes;
  the Euphrates twice and the Tigris as river crossings) and the ordered courses of the Nile, Euphrates and Tigris,
  exactly the lists of question 5 (plan steps 14-15) and question 10 (plan step 2). "A landing by convoy counts as a
  crossing" is a rule about any convoyed landing, so it is left to the siege package.
- `Calendar.Label`, `Short`, `SeasonName` and `Ending`: display helpers beside the existing ones. `Calendar.Season`,
  which the seat view and prompts use, is unchanged and tested to be so.

Everything else is in `src/Amarna.Web` and a new test project, `tests/Amarna.Web.Tests`.

### Style

- Palette (light and dark): parchment and clay ground, lapis sea, bitumen ink. Powers: Egypt gold, Hatti carnelian,
  Babylonia lapis, Mitanni murex purple, Assyria malachite, Arzawa faience turquoise, Alashiya copper. The light or
  dark theme follows the system, and the game's menu can fix one (kept in this browser only).
- Without colour: an original emblem per power (Egypt a lotus, Hatti a rayed sun for "My Sun", Babylon an
  eight-pointed star, Mitanni a winged disc, Assyria a spearhead, Arzawa a crescent for Arma, Alashiya a jug), on
  every city it holds, every unit and every inline mention in the panels; and a border line per power (solid,
  dashed, dotted, dash-dot and so on). Armies sit on square tokens and fleets on round ones, so kind reads without
  the icon too.
- Original icons: a chariot, a ship with a square sail, a clay tablet with wedges, an eye, an oxhide ingot, fetters.
  Ornament is limited to a cartouche ("The lands of the Great Kings") and a compass; no ancient artwork is copied.
- Type: a serif for headings and names (Iowan Old Style, Palatino or Book Antiqua, whichever the device has) and the
  system sans-serif for body text and labels. No web fonts: they would cost a download on the first load and work
  offline only once cached.

### Geography

- Hand-placed drawing data in `Components/Map/MapArt.cs`, fitted to the engine's 1000 x 720 coordinates, which are
  unchanged, so provinces stay where they were: the Great Green, the Aegean shore, a sliver of the Black Sea, the
  Lower Sea (the Gulf), Cyprus; the Nile and its Delta branches, the Euphrates from the highlands past Carchemish to
  Ur, the Tigris from Nineveh to the Gulf, and the Marassantiya (Halys), Orontes, Khabur and Balikh for the eye; the
  Taurus, Amanus, Lebanon, Zagros, Troodos and the northern highlands; the Syrian and Arabian deserts and the Sinai;
  the irrigated black land of the Nile and the alluvium below Sippar.
- Province shapes are Voronoi cells of the cities, clipped to land or sea, with each shared border wobbled the same
  way from both sides so it looks drawn rather than ruled; a few unclaimed points keep the deserts and the Zagros
  from swelling the provinces beside them.
- Fertility: field furrows, closer the richer the land (four bands of yield: up to 25, 30-35, 40-45, 50 and more).
- Terrain from `Geography`: peaks beside the six rough provinces, a pass mark on the three mountain crossings and a
  ford mark on the three river crossings. The legend and the province card say terrain has no effect yet.
- Room is left for roads and relay stations, walls and sieges, and generals: nothing of them is drawn. The walls of
  free and bought cities that already exist in the game are drawn as before, as a ring round the city.

### Map

- The whole map fits the space on every screen with pinch-zoom, pan, wheel zoom, double-tap zoom and a button that
  shows the whole map again. The gesture moves one GPU layer (`wwwroot/js/mapzoom.js`) with no Blazor render; when it
  settles, the sizes of symbols, names and lines are recomputed from the scale so that tokens stay about 14 pixels
  across on a phone showing the whole board, 22 on a desktop, and never balloon when zoomed in. Minor names appear
  once the map is large enough to hold them; capitals are always named.
- Units are tokens in the owner's colour with the owner's emblem, standing above the city so that the city's seal,
  which shows the province's owner, stays in view below them; a count shows when several stand together (the engine
  allows one per province today). Capitals have a gold ring and their names in small capitals; walled cities a
  crenellated ring; free cities a dashed seal; sea zones their names in italics and a dotted boundary.
- What happened in the season shown: an arrow for each move in the mover's colour, drawing itself in; an attack ends
  in a red burst; a bounce stops short at a red bar; a support is a thin dashed line ending in a dot (faded if cut or
  void); a convoy is dotted; a destroyed unit is a struck-out token where it stood; a province that changed hands
  gets a ring in its new owner's colour. Stepping the timeline slides every unit from where it stood to where it
  ended. The same season is told in words in the Season panel, each line pointing at the map.
- A compact legend opens from the map and closes back to it. The courts row above the map is the colour key, with
  each power's province count.

### Characters and what's on the road

- Envoys on the road, spies going to or from their posts, and gold (a ransom on its own road, gold carried by an
  envoy as a small ingot on the envoy) are drawn on the shortest path between the two places (`MapArt.Route`) at a
  position interpolated by season, kept off both ends, with a soft halo and a dotted road: it is a guess, and it
  looks like one. Each shows where it is going and, zoomed in, when it arrives; the Season panel lists them with the
  full date. Travellers on the same road are spread apart.
- Envoys at foreign courts, spies at their posts, captives and detained envoys, and envoys whose court has lost
  track of them ("?", at the court they went to) stand in an arc beside the city.
- Each view sees only what its court knows (`Services/MapScene.cs`): its own people where it believes them (for a
  servant whose fate it has not heard, its cover, read from the cover's own texts: at its post, on the road home, has
  not returned), foreign envoys only while they stand at its court, and anyone it holds. God view shows everyone,
  with a red mark on a double agent.
- "Follow this character": a tap on anyone (on the map, in the Season panel, the People panel or the message trail)
  draws their path season by season and opens their life (`Services/LifeRecord.cs`): who they served and when,
  where they have been, their missions with what was written, said abroad and reported home, and in god view their
  hidden traits, facts and own memory. In a court's view only what that court knows: its own servants' service, and
  only the messages it sent or heard. The life is a list of sections of dated lines, so later roles and lives (a
  past before the game, generals, governors, outlaws) can add sections; the narrator's legends can grow from it.

### Fog of war as a gradient

- Derived from the court's own earlier views, without changing the engine: every season the web app keeps a frame
  (`Services/SeasonFrames.cs`) with each court's sight, so a province's age is the seasons since it was last in that
  court's sight. In sight: clear. Seen before: a parchment wash, thicker at one, two to three, and four or more
  seasons. Never seen: hatched. Zoomed in, each province seen before carries "seen y2 s3".
- Units the court saw in a province it cannot see now stay as dashed ghosts, fainter with age, marked with the season
  they were seen. Rumours and spy reports that reached the court are drawn where they came from (a rumour is placed
  by the court its text came from, a report at the court or province watched) as dashed markers that fade over eight
  seasons, with their text and date on tap. These are what the court believes; the god view shows the true state.
- Ownership is not fogged: who holds each province is public and live in the engine, so tints, border lines and city
  seals are drawn as known, above the fog, with no invented age.

What the gradient will need once news travels (item 7):

- In the seat view, each province's owner as last known and the season that knowledge dates from (and whether it
  came by sight, report or rumour), instead of today's live `Owner`. The map would then wash the tint, border line
  and seal by that age, keep an old owner as a ghost tint with its date, and list in the Season panel only the
  changes of hands the court has heard of, with when it heard.
- Reports of troops as structured observations (province, power, kind, the season observed) rather than text, so
  that a spy's or envoy's report can be drawn as ghost units where it says they stood, not only as a marker at the
  place watched.
- Who carried each piece of news, for the "follow" view and the narrator.

### Dates and status

- Every date the web app writes uses `Calendar.Label`: the court's season, the year BCE and the turn, "Peret,
  1343 BCE (turn 8)" at Egypt's court, "the second season, 1343 BCE (turn 8)" at the others, "season 2, 1343 BCE
  (turn 8)" in god view; dense lists use "Peret 1343 BCE" or "s2 1343 BCE" with the full label in a tooltip. Years
  are counted from 1345 BCE (see "Owner's additions" below; quotations elsewhere in this report from before that
  change still show "year N"). This covers the browser title, the header, the timeline, events and
  signals, the annals' true record, memories, contracts and timings, tablets ("sealed"/"dated"), the message trail,
  the growth chart, the inbox, the orders panel and the sleep lines. Engine texts shown in the interface (a servant's
  timing and term, inbox items, events) have each "turn N" given its label for display only (`Ui.Dated`); the texts
  kings read are unchanged. The rulebook tab still shows the rulebook word for word.
- The header's ending line: "The age cannot end before Shemu, 1341 BCE (turn 15)." until then, "Any season may now be
  the last (15% each season)." after, and at the end "The age has ended: …. Winner: …". On a narrow phone it reads
  "Can end from Shemu 1341 BCE (turn 15)".
- The message trail shows where an unfinished message stands instead of dashes: "On the road, arrives in season 3 of
  year 3 (turn 9).", "Heard; on the road home, back in …", "Detained at the court of …", "At the court of …", "Never
  came home: held captive by …", "Never reported: went over to …".
- God view shows the sleeping kings three ways: a moon on the court's chip in the courts row, with "asleep, wakes by
  … at the latest" on hover and a popover giving since when, until when, the season it named, and what last woke it;
  the same in the Season panel; and the Standings line, now dated with labels. No court's view shows another's sleep.

### Phone first: watching

- Upright: header, courts row, the map at full width (its whole extent, nothing cropped), the panel below it with
  the season in words by default, and at the bottom, within a thumb's reach, the timeline: back, play (auto-play in a
  live game, a replay of the recorded seasons in history), forward (one season on, or play the next season), the
  slider and the date. Tapping the open tab again, or the grip, pulls the panel up over the map; tapping again drops
  it back. The map is never unmounted, so its place and zoom survive. A province card and the legend open over the
  map and close back to it.
- Sideways: the map takes the full height on the left; header, panel and timeline share the right.
- Safe areas (notches, the home bar) are respected on every edge, with `viewport-fit=cover`. The page itself never
  scrolls; panels scroll inside themselves.
- A link to `play?watch=SEED` starts a game of script kings to watch.

### Playing on a phone

- Touch targets of 44 pixels or more on touch screens (tabs, timeline, buttons; inputs at 16 px so phones do not zoom
  on focus); the zoom buttons give way to pinch-zoom there, keeping only "show the whole map".
- A Provinces tab lists every province by owner, with its units (and ghosts in a court's view) and yield, in large
  rows; in a human seat's orders it picks a unit or a destination exactly as a tap on the map would, and returns to
  the orders once a move is set.
- The letter field shows a running count and suggests that letters beyond 600 characters are long ("kings and
  envoys read short letters best"); numeric fields bring up the number pad; the layout stays still when the keyboard
  opens (`interactive-widget=resizes-visual`).
- Installable: a manifest, an original icon (a clay tablet on lapis, at 192 and 512 pixels and maskable) and a
  service worker adapted from the Blazor template that caches the published app at install and starts from cache.
  Push notifications are left for later, as the prompt allows.

### Layout

- Desktop and tablets held sideways: the map on the left, always whole, the panels on the right, the timeline under
  the map. Phones: the map first, the panels easy to reach, as above.
- No panel, statistic or piece of tracking was removed. The panels kept are Audience, Orders, Inbox, Trail, People,
  Standings, Events, Rules and Chronicles; Season, Follow and Provinces are new. Controls that were in the old top
  bar (speed, export, reveal all) are in the ⋯ menu; errors and notices head the panel.

### Credits

On the About page (with a new "Reading the map" section) and in the README: Irving Finkel, *Curator's Corner* episode
100, "Reading the Pharaoh's private mail with Irving Finkel", The British Museum
(https://www.youtube.com/watch?v=3MZq_ZQDhJA), with William L. Moran's *The Amarna Letters* for the translations.

## Performance

**How it was measured.** The published Release build, served as a CDN would serve it (precompressed Brotli, long
caching for fingerprinted files), in headless Chrome 155 driven over the DevTools protocol with Lighthouse's mobile
settings: a 412 x 823 screen at 1.75x, 4x CPU slowdown, slow 4G (150 ms, 1.6 Mbps down). Smoothness is the frame
intervals seen by `requestAnimationFrame`; responsiveness is the browser's long tasks. Headless Chrome draws without
a GPU, so these numbers are conservative for drawing. The machine was shared with another project's simulations
during the round, so each figure below is given from a quiet run (the build of `ca88beb`) and a loaded one (the build
of `be458ab`, whose changes since do not touch what is measured); no physical phone was available.

| Measure | Quiet run | Loaded run |
|---|---|---|
| First load: bytes over the network | 3.27 MB | 3.27 MB |
| First load: first paint (loading screen) | 0.6 s | 0.6 s |
| First load: home page ready to use | 19.8 s | 21.2 s |
| Second visit (from the service worker; 0 bytes downloaded): ready | 2.2 s | 3.5 s |
| Opening a game to watch from a link (warm): map shown | 6.2 s | 9.9 s |
| Switching seasons in the timeline, Season panel open: median / 95th percentile | 125 / 195 ms | 210 / 309 ms |
| The same, a season seen before | 92 / 110 ms | 186 / 234 ms |
| The same, with the Events panel open | 223 / 924 ms | 738 / 2,515 ms |
| The same, with the People panel open | 463 / 1,219 ms | 529 / 1,516 ms |
| Units sliding after a step: frame rate, worst frame | 58 fps, 18 ms | 32 fps, 62 ms |
| Pinch-zoom: frame rate, worst frame | 55 fps, 54 ms | 23 fps, 249 ms |
| Pan: frame rate, worst frame | 57 fps, 35 ms | 30 fps, 127 ms |
| Playing a season of script kings: median / 95th percentile | 4.6 / 11.2 s | 7.2 / 15.6 s |
| Longest stretch the page could not respond while a season plays | 2.9 s | 3.2 s |

On an unthrottled desktop (same network): second visit ready in 0.7 s, a game to watch in 1.8 s, a season switch in
76 ms (69 ms revisited), a season played in 1.2 s with the page never blocked for more than 0.55 s.

**What was done for it.** The static geography is written once as SVG markup that Blazor never diffs again; each
layer above it redraws only when what it shows changes (`ShouldRender` against the scene object); the map is two
stacked drawings on their own compositing layers, so sliding units repaint only the light upper one; gestures move a
GPU layer without a render; the map steps through small per-season frames and never deserializes a whole state; the
Events panel reads history from the newest state filtered by season; the last four states read back for the panels
are kept; a season is shown before it is saved; and the browser build runs in the invariant culture (no ICU data)
and trims the Anthropic SDK, which the browser never constructs, from 2.1 MB to 0.46 MB compressed (5.0 MB to
3.2 MB in all). The service worker takes fingerprinted files from the HTTP cache, so installing downloads nothing
twice. Reduced motion turns off every transition and animation.

**What limits it.**

- **The first load** is the download: 3.2 MB over slow 4G is about 16 s by itself, most of it the .NET runtime
  (0.95 MB), the core library (0.53 MB) and what is left of the Anthropic SDK (0.46 MB). The design document's
  "Load size" risk stands: splitting the SDK path out of `Amarna.Llm` would save 0.46 MB (not done: it is not
  presentation); beyond that, only a lighter engine would. Later visits start from cache in 2-3.5 s on a slow phone.
- **Playing a season** is the script kings' look-ahead in the orders phase (95% of a season's time, measured by
  phase), running in interpreted WebAssembly on the page's one thread. The web app now lets the browser draw and
  answer taps between kings (`YieldingSeat`: they decide one after another in the same order, and the web game of
  seed 7 ends as the batch runner's does: 19 seasons, Egypt winning), but one king's thinking still blocks for up to
  about 3 s on a slow phone. Candidates, not built: ahead-of-time compilation (the `wasm-tools` workload, a larger
  download) or running the game in a Web Worker. Model kings wait on the network, not the page.
- **Season switches with a heavy panel open** (Events, People, Trail, Standings) pay for reading that season's whole
  state back from its snapshot (People and Trail) or for building long lists. With the Season panel (the default),
  switching is about 0.1-0.2 s on a slow phone.
- **Smoothness** depends on load: on a quiet machine, sliding, pinching and panning hold 55-58 fps under 4x
  slowdown; under contention they drop to 23-32 fps, mostly because headless Chrome draws without a GPU.

## Decisions and readings

1. **Phone first.** The prompt's opening line was clarified during the round (commit `dd82ff6`: both matter, but
   watching on a phone comes first); the build already followed the "Phone first" section.
2. **Terrain data in the engine, drawing data in the web project.** The prompt allows map data in the engine
   project; only what the siege package will need (terrain, crossings, river courses) went there. Coasts, river
   paths, ranges and province shapes are drawing, so they live with the web map.
3. **The season shown.** The map at a point in the timeline shows the world as a season begins, with the moves of the
   season just resolved drawn on it; the Season panel and the timeline name the season whose moves are shown, the
   header the season being played.
4. **Date-label formats.** The ending line uses the one label ("The age cannot end before Shemu, 1341 BCE (turn
   15).") rather than question 26's "turn 15 (Shemu, year 5)", since the prompt asks for one helper for every date.
   The year BCE was added at Haakon's request (see "Owner's additions").
5. **Foreign spies are never drawn in a court's view,** as the prompt says (its own spies, and foreign envoys only
   while at its court). The engine's own view still lists a spy posted at a court in that court's People panel with
   its employer (question 19, bug 4, an engine matter, recorded under "Characters" in the design notes); this round
   changes no view.
6. **Believed positions.** A court's servant whose fate it has not heard is drawn where the court believes it, read
   from the engine's cover texts ("at the court of X", "due back about turn N"); the engine has no structured
   position for a cover.
7. **Rumours and reports placed by matching.** A rumour that reached a court is placed at the court its journey came
   from, found by its text; a spy's report at the place watched, found by the spy. Word that cannot be placed stays in
   the panel only.
8. **Ghosts.** A court cannot tell one unit from another, so a ghost is drawn for each province where it last saw
   units, even if the same unit may since have been seen elsewhere.
9. **Script kings yield to the browser** (a web-only seat wrapper). It changes no decision (same order, own views),
   which the web game of seed 7 confirms against the batch runner, but the order in which decisions are written to
   a web game's log can differ; replay reads decisions by key, so logs replay as before.
10. **The Anthropic SDK is trimmed in the browser build** (`TrimmableAssembly`): the browser never constructs it.
11. **Tests for the web map** in a new project, `tests/Amarna.Web.Tests` (15 tests): every person drawn in a court's
    view is in that court's own engine view and is its own, an envoy at its court or held by it, never a foreign
    spy; fog is clear exactly where the court sees, units drawn as seen equal the view's units, and every ghost is a
    unit the court really saw; god view shows every unit and no fog; frames taken live equal frames read from
    snapshots; a court draws only moves it saw; a court learns how land changed hands only from marches it saw
    (seeds 1, 3, 5, 7 and 9), and is told of an attack only from what it could see; no fallen court's orders are
    drawn again; a life read in a court holds only messages it sent or heard, dated as that court knows them; and
    the "turn N" labelling.
12. **Merging.** The prompt asks to merge into `develop` after one reviewer; the session's instructions say never to
    touch `develop`, so the branch is left unmerged for the reviewer and the orchestrator.

## Left out, and why

- Regnal years and other courts' calendar names: not asked (question 26 steps 5-7).
- Roads, relay stations, walls that vary, sieges and generals: not in the game; the prompt says not to draw them.
- Fog of war for ownership: ownership is public and live in the engine; what it will need is listed above.
- Push notifications: the prompt lets them wait.
- Ahead-of-time compilation or a Web Worker for the script kings, and splitting the SDK out of `Amarna.Llm`: not
  presentation (see "What limits it").
- Measurement on a physical phone: none was available; all phone figures come from Chrome's emulation.

## Owner's additions

Haakon added two things to the item on 19 October, after the review:

1. **Years counted from 1345 BCE.** The first year of a game is 1345 BCE and each later year is one less, so the
   date-label helper shows the court's season, the year BCE and the turn: "Peret, 1344 BCE (turn 5)" at Egypt's
   court, "the second season, 1344 BCE (turn 5)" at the others, "season 2, 1344 BCE (turn 5)" in god view, and
   "Peret 1344 BCE" or "s2 1344 BCE" in dense lists. `Calendar.FirstYearBce` and `Calendar.YearBce` in the engine
   project are display helpers like the rest of the label; nothing in the engine reads them. The kings' own text is
   unchanged: the seat view's `Season` line still reads "Peret (growing), year 3" and no prompt names a year BCE, as
   question 26 advised (a precise year invites models to replay real history). The annals (template and model
   narrators) still count game years; the 60-season cap would end in 1326 BCE. The engine and web label tests check
   the new format (all 654 tests pass); the seeds replay exactly, since no rule changed. The screenshots below were
   taken before this change and show the old "year N" labels.
2. **The prompt's opening line** (phone first): already done in `dd82ff6` (see "Decisions and readings", 1).

## Review findings

The reviewer found one blocking problem and eight minor notes. Each was checked; what was real is fixed in
"Fix review findings: …", with the design notes updated in the same commit.

**Blocking: how land changed hands leaked into a court's view. Confirmed and fixed.** `MapScene` decided "taken by"
against "passed to" from every order of the season, whoever saw it, so a court's Season panel and the capture ring's
tooltip told it that a province fell to arms, and so that the taker's army now stood there, even where the fog hid
that army and the court had seen no such march. A new test reproduced it on every seed tried (seeds 1, 3, 5, 7 and
9: in each, Egypt read Lukka as "taken by Arzawa" within the first two seasons, from a march it never saw). Now a
scene decides from the orders the viewer saw (`SeenBy`): "taken by" only if it saw the new owner's troops march in;
"passed to" if it lost or gained
the province, since a march into its own land or its own march would have been seen; any other court reads "now held
by Hatti, no longer by Arzawa", which says only what is public. God view is unchanged. In the browser, seed 7 after
the last season: as Egypt, "Kanesh now held by Hatti, no longer by Arzawa" and "Isuwa now held by Mitanni, no longer
by Assyria", with only the Arzawan moves Egypt saw listed; as Hatti, which saw both marches, "taken by" for both; as
Alashiya, "now held by" for both and "No moves were seen." The test,
`A_court_learns_how_land_changed_hands_only_from_moves_it_saw`, checks every change of hands in every court's view
against the court's own `LastSeen` and against the god view.

**Minor notes.**

1. *An attack told from troops out of sight.* Fixed. A march is called an attack on troops only if the court saw them
   standing in the target as the season began (`Sight` of the frame before) and did not see them march out; the same
   test checks it. God view now calls a march into a province whose occupant left a plain move. A probe of seeds 1-10
   found no such god-view case in practice.
2. *A receiving court saw when a foreign envoy reported home* (the follow view's date range). Fixed: a court that only
   received the envoy sees the mission dated by the audience it gave, with no end date; the sender keeps the range
   from sending to the report home. Seen in the browser: Egypt following Alashiya's envoy Ili-iddina sees four
   missions, each dated by its audience alone ("y2 Peret", "y5 Shemu", …). Tested.
3. *"season of the second season" in a spy report.* Fixed: `Ui.Dated` turns "season of turn N" into the label alone,
   so Hatti reads "From Arzawa, the second season, year 3 (turn 8)." and god view "season 2 of year 3 (turn 8)". A
   "Turn N" opening a sentence now gives a capitalised label. Seen in the browser in Hatti's Season panel; tested.
4. *Bare "turn N" labels.* Fixed: a saved game's line reads "Seed 1, season 3 of year 5 (turn 15) (ended), 7 Script
   bot", and the replay notice "The log ends during season … (turn N)". Games saved before keep the line stored with
   them.
5. *Two commits changed behaviour without touching the design notes.* Fixed: the notes now say that a faded province
   carries the season it was last seen, that the courts row gives unit counts only for the court's own power, and
   what the follow view shows a court.
6. *`docs/BUILD-PROGRESS.md` not updated.* Left: this session's instructions say not to edit it; it is the
   orchestrator's.
7. *The follow view and People panel show the employer of a foreign spy posted at the court.* Left: they read the
   engine's own view, which the king reads too (question 19, bug 4, recorded under "Characters" in the design notes);
   hiding it in the web app alone would make the page disagree with what the seat is told, and changing the view is
   not presentation.
8. *The service worker did not register in the reviewer's browser pane.* Checked: in this session's pane the
   development worker registered and was active (`navigator.serviceWorker.getRegistrations()`), and registering it
   again raised no error, so the failure looks like the pane's. Installing to a home screen could not be tried
   without a phone; starting the published build from its cache was measured earlier (second visit, 0 bytes
   downloaded).

**Found while fixing: a fallen court's last orders were drawn again every season.** The engine keeps a fallen court's
`LastSeen` from the season it fell, unchanged, and the frames took the union of every court's `LastSeen`, so god view
redrew that season's orders, the fallen court's and those it saw, every season after. A probe of seeds 1-10 found it
in seeds 1, 8 and 10 (17 seasons of fallen courts in all): in seed 1, for example, "Mitanni's army in Ashur moved to
Arbela" was drawn again in every season from turn 10 to 14, after Assyria fell. Fixed in `SeasonFrame.From`: a
court's `LastSeen` is read only if it still stood as the season began. Tested
(`A_fallen_court_s_last_orders_are_not_drawn_again`, which fails without the fix) and checked in the browser on seed
1: from turn 10 on, only the moves of courts still standing are listed. Presentation only, like the rest: the engine
is unchanged and still keeps the fallen court's `LastSeen`.

## How it was verified

- `dotnet test`: 654 tests pass (204 engine, of which 6 new for the labels and terrain data; 435 game; 15 web map).
- Seeds replay exactly: `dotnet run --project src/Amarna.Batch -- --games 10 --seed 1 --verify-replay
  --no-chronicles` prints the same results as before the round, and the logs and final states of seeds 1-10 are
  identical byte for byte with those saved before the first change.
- A whole bot game in the browser, on a desktop and on a phone held upright (seed 7, 19 seasons, played with
  auto-play), then in god view and each power's view, every season stepped through, every tab opened and a person
  followed: no error, and the page never scrolled on the phone. The web game ended as the batch runner's does.
- A human seat on a phone (Egypt): the orders open, a unit picked on the map and its destination from the province
  list, the move set.
- A game of model kings with the simulated API: the sleeping kings shown in god view with their dates and reasons.
- The built-in browser pane for the first checks; headless Chrome (scripts driving it over the DevTools protocol) for
  full-resolution screenshots, the whole-game checks and the measurements.
- After the review fixes, in the built-in browser pane (development server, desktop size): seed 7 played to its end
  and read in god view and as Egypt, Hatti and Alashiya (changes of hands, the capture rings' tooltips, the moves
  listed); Egypt following a foreign envoy; Hatti's spy reports stepped through season by season; seed 1 played to
  its end and its god view stepped through after the two courts fell; the saved-games list; no console errors. The
  pane drew no screenshots (it was hidden), so these checks read the page's text; no new screenshots were taken. The
  full suite (654 tests) and the replay check of seeds 1-10 were run again and pass, with the same results.

## Screenshots

In `docs/rounds/2026-10-19-visual-overhaul/` (seed 7, script kings):

- `phone-portrait-god.jpg`: a phone held upright, god view, after eight seasons. The header gives the season being
  played and "Ready · Can end from y5 s3 (turn 15)"; the courts row shows each power's emblem and province count;
  the whole board fits the width, tinted by owner, with tokens above the cities and the season's arrows; the Season
  panel below lists what changed hands and each move in words; the timeline sits at the bottom.
- `phone-portrait-hatti-fog.jpg`: the same season as Hatti sees it. Anatolia and the north are clear; Arzawa's land is
  washed over, with dashed ghosts of Arzawan troops Hatti saw there; the Levant, Babylonia and Egypt are hatched as
  never seen; ownership tints and border lines stay crisp under the fog; Hatti's own envoy is on the road to Egypt.
- `phone-dark-hatti.jpg`: the same view in dark mode.
- `phone-portrait-follow.jpg`: following Ammistamru, a Babylonian envoy: the map has zoomed to his path, drawn dashed
  from Ashur to Babylon and on along his later journeys, and the panel shows his service, places and missions.
- `phone-landscape-god.jpg`: the phone held sideways: the map takes the full height on the left, the Season panel and
  timeline the right.
- `phone-orders-start.jpg`, `phone-orders-list.jpg`, `phone-orders-move.jpg`: Egypt as a human seat on a phone: the
  orders tab, the province list used to pick Sinai for the army at Memphis, and the orders showing the move with the
  panel pulled up over the map.
- `desktop-god-legend.jpg`: a desktop with the legend open over the map: tokens, people, gold, travellers, rumours,
  capitals, walls, moves, attacks, bounces, supports, changes of hands, fog, fertility, deserts, mountains, passes and
  fords, and each power's emblem and border line.
- `desktop-hatti-fog-zoomed.jpg`: Hatti's view zoomed in on Cilicia: "seen y3 s2" on the Cilician Sea, the hatched
  Syrian Sea, Arzawa's fleet and army in Kizzuwatna, Hatti's units with their emblems, and the Season panel with the
  moves Hatti saw, its envoy on the road to Egypt, its spy at Arzawa's court and that spy's report.
- `desktop-dark-trail.jpg`: god view in dark mode with the message trail: "On the road, arrives in season 3 of year 3
  (turn 9)." in place of dashes.
- `desktop-sleeping-kings.jpg`: a game of model kings with the simulated API: every court's chip carries a moon, and
  the popover gives Egypt's sleep with its dates.

## Commits

- `4a9ec5a` Add terrain map data and the date-label helper
- `d7b1d85` Redraw the web map and lay the game out phone first
- `ca88beb` Make the web app installable, lighter and responsive on a phone
- `7753d69` Keep map symbols at a steady size on screen; date faded provinces
- `be458ab` Keep envoys on their way and rivals' strength out of a court's view
- `061bedd` Write the visual-overhaul report, with the last touches to the header
- "Fix review findings: …", the fixes above, with this report's review section and the design notes.
