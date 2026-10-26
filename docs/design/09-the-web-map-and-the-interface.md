## The web map and the interface (visual overhaul)

Build order item 2 (`docs/prompts/VISUAL-OVERHAUL.md`; report `docs/archive/rounds/2026-10-19-visual-overhaul.md`).
Presentation only: no rule, state, view, prompt or balance changed, and seeds replay to the same logs byte for byte.
Item 4 changed two things here: the engine's view now hides a foreign spy from the court it watches (fix (a), noted
under "Each view sees only what its court knows"), and fix (b), phone performance, rewrote "Load size" and added
"Script kings and characters in a worker" and "What is left in the page" (presentation and build only; report
`docs/archive/rounds/2026-10-19-second-simulation.md`).

- **Terrain is map data** (`Geography` in the engine project), given its effects by the siege package (Build order item 5;
  see Terrain under Rules as implemented); until then it was drawn only. Rough provinces: Mira, Lukka,
  Isuwa, Amurru, Arbela, Tamassos. Desert: Sinai. Crossings on six connections: the Cilician Gates
  (Tuwanuwa–Kizzuwatna), the Taurus (Kanesh–Kizzuwatna) and the Amanus (Kizzuwatna–Carchemish) as mountain passes;
  the Euphrates (Carchemish–Harran, Isuwa–Harran) and the Tigris (Taidu–Nineveh) as river crossings. The ordered
  courses of the Nile (Thebes to the Delta), the Euphrates (Carchemish to Ur) and the Tigris (Nineveh to
  Dur-Kurigalzu). These are the lists of question 5 (plan steps 14-15) and question 10 (plan step 2) of the
  sleep-and-simulation round, so the siege package can use them unchanged, and it did. Until the siege package nothing
  in the engine read them and only the web map drew them; now the adjudicator reads rough ground and the crossings, and
  the map's tooltips, province card, legend and about page say what they do (the drawing is unchanged: peaks beside
  each rough city, a pass or ford mark across each crossing). "A landing by convoy counts as a crossing" is a rule
  about any convoyed landing, so it is a rule of the adjudicator (`Geography.DefenceGround`) rather than stored on a
  connection.
- **One date label** (`Calendar.Label`, question 26, plan steps 1-4): the court's season, the year BCE and the
  turn. Years are counted from 1345 BCE: the first year of a game is 1345 BCE and each later year is one less
  (`Calendar.FirstYearBce`, `YearBce`; Haakon, 19 October). Egypt's court reads "Peret, 1344 BCE (turn 5)", the
  others "the second season, 1344 BCE (turn 5)", and the spectator "season 2, 1344 BCE (turn 5)". Dense lists use
  the short form, "Peret 1344 BCE" or "s2 1344 BCE", with the full label in a tooltip. The header's ending line
  reads "The age cannot end before Shemu, 1341 BCE (turn 15)." until the first season that may end the age, then
  "Any season may now be the last (15% each season)." The year BCE is shown in the interface only: the seat view's
  own `Season` text ("Peret (growing), year 3") and the prompts are unchanged, so kings are never told the year
  (question 26: a precise year invites models to replay real history), and the annals still count game years. Every date the web app writes uses the label; engine texts shown
  in the interface (a servant's timing and term, inbox items, events) have each "turn N" given its label for display
  (`Ui.Dated`; a spy report's "season of turn N" becomes the label alone, which names the season), while the texts
  kings read stay as they are. The rulebook tab still shows the rulebook word for word.
- **The map is drawn, not computed by the engine.** The coasts, rivers (the three great ones of `Geography.Rivers`
  plus the Marassantiya, Orontes, Khabur and Balikh for the eye), ranges, deserts and fields are hand-placed drawing
  data in the web project (`Components/Map/MapArt.cs`), fitted to the engine's 1000 x 720 coordinates, which are
  unchanged. Province shapes are Voronoi cells of the cities, clipped to land or sea, with each shared border wobbled
  the same way from both sides; a few unclaimed points keep the deserts and the Zagros from swelling the provinces
  next to them. Fertility is drawn as field furrows, closer the richer the yield (four bands: up to 25, 30-35, 40-45,
  50+).
- **Powers without colour.** Each power has a colour from the Late Bronze palette, an emblem (Egypt a lotus, Hatti
  a sun, Babylon an eight-pointed star, Mitanni a winged disc, Assyria a spearhead, Arzawa a crescent, Alashiya a
  jug) shown on every city it holds and every unit, and a border line of its own (solid, dashed, dotted, dash-dot …).
  Armies are chariots on square tokens and fleets ships on round ones; envoys are clay tablets, spies eyes,
  captives fetters, gold an oxhide ingot.
- **What the map shows each season** comes from a frame taken at every snapshot (`SeasonFrame`): owners, units,
  the orders of the season just resolved with how each went (from the engine's `LastSeen`, whose union is every
  order), each court's sight, the journeys, the characters and the sleeping seats. The map steps through frames
  without deserializing whole states; the panels still read the full state of the season shown. A fallen court's
  `LastSeen` stays in the state unchanged, so a frame reads it only in the season the court fell; read later, it
  redrew that season's orders every season after.
- **Travellers are drawn on a guessed road.** The engine keeps only a departure and an arrival season, so each one is
  drawn on the shortest path between the two places (`MapArt.Route`), at a position interpolated by season, with a
  halo and a dotted road to say it is a guess. A ransom travels as gold on its own.
- **Each view sees only what its court knows** (`MapScene`). A court sees its own people where it believes them
  (its cover of a servant whose fate it has not heard, read from the cover's own texts), foreign envoys only while
  they stand at its court, and anyone it holds (a caught spy marked with the master it confessed to, or none; a
  held envoy with the king who sent it); never a foreign spy it has not caught. Since Build order item 4 the
  engine's own view hides that spy too (see "A spy at a court is hidden from it" under Characters), so the People
  panel and the follow view, which read it, no longer list it or its employer; until then they did (question 19,
  bug 4). A court is drawn only the orders it saw resolve. Who holds a province
  is public, but how it changed hands is not (the engine tells a conquest only to the taker and the loser, a
  purchase only to courts with sight): a court reads "taken by" only when it saw the new owner's troops march in,
  "passed to" when it lost or gained the province (it would have seen a march), and otherwise "now held by". A march
  is called an attack on troops only if the court saw them standing in the target as the season began and did not
  see them march out; god view likewise calls a march into a province its occupant left a plain move. The courts row
  gives unit counts only for the court's own power.
- **Fog of war as a gradient**, from the court's own earlier sights (the frames): a province in sight is clear; one
  seen before is washed over, more the older the sight, and zoomed in carries the season it was last seen; one never
  seen is hatched. Units the court saw in a province it cannot see now stay as dashed ghosts, fainter with age, with
  the season they were seen. Rumours and spy reports that reached the court are placed where they came from, dashed
  and fading over eight seasons. Ownership is not fogged: who holds each province is public and live in the engine,
  so tints, border lines and seals are drawn as known. Walls are (since the review of the siege package): a court's map
  draws them standing now in its sight and as it last saw them elsewhere (`SeasonFrame.KnownWalls`, `MapScene.Walls`).
- **Follow this character** builds a life from the record (`LifeRecord`): service, places season by season (and the
  path on the map), missions with what was written, said and reported, and in god view the hidden traits, facts and
  the character's own memory; in a court's view only what that court knows: its own servants' service, the messages
  it sent, and those of envoys who have stood before it (never one still on the road to it). A court that only
  received an envoy sees that mission dated by its audience alone; the report home, and when it came, only the
  sender reads. It is built from sections so that later roles and lives can add their own.
- **Phone first.** On a phone held upright the map comes first, at the full width, with the courts above it, the
  panel (the season in words by default) below it and the timeline at the bottom within reach of a thumb; a panel can
  be pulled up over the map and dropped back without the map losing its place or zoom. Held sideways, the map takes
  the left and the panels the right; on a desktop they stand side by side. The layout keeps to the phone's safe areas,
  and the page itself never scrolls. Pinch-zoom and pan move one layer on the GPU (`js/mapzoom.js`); symbols, names and lines
  keep a readable size on screen whatever the zoom (tokens about 14 pixels on a phone showing the whole board, 22 on a
  desktop, at most 40), and minor names wait until the map is large enough to hold them. A province list stands in for
  tapping small provinces; in a human seat's orders it picks a destination as a tap on the map would.
- **Installable.** A manifest and a service worker (the Blazor template's, adapted): the published build caches
  every file at install and starts from the cache afterwards. Fingerprinted files are taken from the browser's own
  cache, so installing downloads nothing twice; HTML files are not checked against the publish hashes, since the
  Pages workflow rewrites their base path. In development the worker caches nothing. A PR's preview, served at
  `pr-<number>/` inside the root worker's scope (since the docs and preview pass), is left to the network by that
  worker, and has no worker of its own: one would delete the root's caches when it activated. Pages serves only the
  root's `404.html`, which sends a deep link inside a preview to that preview's start.
- **Load size.** The browser build runs in the invariant culture (no ICU data) and carries none of the Anthropic
  SDK, which it never constructs (it posts with HttpClient; the SDK path is in `Amarna.Llm.Sdk`, see "Transport"
  under Models): about 2.8 MB with Brotli, 3.4 MB with the gzip GitHub Pages serves. On a first visit the loading
  screen says that the game is being downloaded, about 3 MB, and that later visits start from the device; a visit
  started by the service worker does not show the note.
- **Script kings and characters in a worker.** The kings' look-ahead is nearly all of a season's time (seconds on a
  slow phone), and a character's text code takes a second or two to warm up the first time it writes; in the page's one
  WebAssembly thread both froze the page. In a browser game they now think in a Web Worker of their own
  (`ScriptWorker.cs`, `js/script-worker.js`): it boots a second .NET runtime from the files the page has already
  downloaded (nothing more to download), warms up on a throwaway game while the page sets up the real one, and
  answers one request at a time. Each request carries what the engine handed the seat or the mind, the king's view or
  the character's context, written out as JSON as a file seat's view is, and the answer comes back the same way into
  the runner, which records it as before (serialization code generated at build time was tried and dropped: 69 KB
  more to download, and no shorter first season in the page). The kings keep their memory in the worker from season to
  season (one `ScriptLeader` per game, as in the page), so each answer is the one the same code gives in the page:
  tests play seeds 1, 2, 5, 7 and 14 both ways and compare every decision and the state after every season. Where no
  worker can start the kings think in the page as before, letting the browser draw between them (`YieldingSeat`); a
  worker not ready within two minutes of being started counts as one that cannot start, and is stopped (a first guess,
  well above the 1-1.4 s it takes to boot and warm up on a desktop, 4.5-5.6 s on a slow emulated phone). If the worker
  stops during a game, the page takes over and says so (the kings then start that season with no memory of the earlier
  ones; the characters keep none, so theirs is the same answer). Model kings and characters wait on the network and
  stay in the page. So do local agent kings, which wait on the local bridge (see "Local play on a Claude
  subscription"), and the runner's script stand-in for a model or local agent king whose call failed. The script
  decision logged beside each model character's (its shadow line, which nothing in the game reads) is worked out in
  the worker, since it is the script character's own text code (`LlmCharacterMind.Script`); a test plays a table of
  model characters both ways and gets the same shadow lines. (Until item 4's review it was worked out in the page.)
- **What is left in the page** is the engine's own work and drawing. A season's redraws are coalesced and made in a
  task of their own, after the engine's work rather than within it (`GameSession.NotifySoon`), the page draws that a
  season is under way before its work begins, and a season is shown before it is saved. The log writes each decision's
  line once and keeps it (`GameLog.ToJsonl`, which the autosave calls every season, used to write and re-read every
  line each time; the text is the same, model characters' shadow lines included). The map never reads a whole state
  back from its snapshot. Measurements are in the round reports.
- **A link to watch**: `play?watch=SEED` starts a game of script kings, for showing a game to someone.
- **A fallen player's game is over** (the design document's rule, built with the siege package, Build order item 5). Once
  every human seat at the table has fallen with its capital, and the table's setting allows it (`GameConfig.FallenSeeAll`,
  on by default; "A fallen player watches in god view" when a game is started), the players watch the rest of the game in
  god view, seeing everything, and the view opens on it with a notice: "The kingdom of Arzawa has fallen with its capital:
  your game is over. You watch the rest of the game in god view, seeing everything." (`GameSession.FallenSeesAll`, `TellFall`).
  While another human seat at the same screen still plays, nobody sees all (a reading: one screen cannot show one player
  what the other must not see). With the setting off, for a table worried that a fallen player might pass hidden facts to a
  friend still in the game, he keeps his own view: what his kingdom knew when it fell (its news, its record, its last
  sight of the board, fading), and what is public since (who holds what, which kingdoms fell), as the seat view of a
  fallen court already showed; nothing his court could no longer learn (a reading). Spectating a game without human seats
  keeps both god view and each king's own view, as before. The setting is carried in the log, so a game loaded to
  continue keeps it, and the batch runner sets it with `--fallen-view god|kingdom` for a game it writes to be opened in
  the web app. The rules tab tells a human player which it is.
- **Standing orders in the orders panel** (since the owner's additions to the fix pass after item 4: every seat may keep
  them, so a human seat has a form for them). Under Troops, a section lists the seat's standing orders by id, each with a
  Cancel button (Keep undoes it), and the new ones written this season, each with Remove. A new one is written in two
  rows: what it waits for ("When troops enter…" a province, of any foreign power or of one named, or "When my troop is
  attacked…", one of its troops), then its orders one at a time (a troop of its own that supports a troop in sight,
  holding or into a province, moves, or holds; until the siege package also the walls of a city of its own), each added with "Add this order", and the whole
  with "Add this standing order". The draft sends them with the season's orders (`OrderDraft.Standing`,
  `OrderDraft.CancelStanding`, `OrderDraft.Build`); the form offers no other orders (levies, letters) in a standing order,
  which a model king's reply may carry. The rules tab says that standing orders apply to a human seat, which never sleeps.

