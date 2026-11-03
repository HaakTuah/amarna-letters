# Item 17+++: the season plays out

The owner (31 October 2026): "the player needs to feel the weight of the whole world, or it becomes meaningless to
him/her.", then "Agreed, 100% sir!"; on zoom, "If you are zoomed in near a unit in the waves, I want to hear it. And if I
zoom in on the map, I like how Imperator makes the state color more and more transparent and you see the ground and
effects under more clearly."; on the threads and the director camera, "And yes to" it; on a mind's words, "Yes, I think
so. And it should maybe store what it looked like at every step? And the narrator should also have its take stored from
the first time it runs on a game, so it must not be ran each time you watch it potentially afterwards?" and "Yes to both.
But I think it should only show their name like that when you click on the character? Or di you want it in parenthesis
in every letter they receive?".

The item's text: `docs/intent/build-order/item-17.md` ("17+++, the season plays out"); the section: "The season plays
out, and zoom shapes what you see and hear" (`docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`).
The live document had no change since the copy in the Build order or Interface tabs when the item began (3 November).

Presentation only, built in parts, each its own pull request.

| Part | What | State |
|---|---|---|
| A | A mind's own words kept season by season and shown (the record) | merged, #627 |
| B | The season in sequence: the next season computed while this one plays, pace by meaning, a closing line | this PR |
| C | Zoom shapes the realms' colours (full, then a wash, then borders and banners) | merged, #634 |
| D | The land's season under the realms, and its change moving | not started |
| E | Units drawn as what they are, with weight; the world acting on them | not started |
| F | Threads to watch and the director camera (spectator) | not started |
| G | Smooth on a phone: frame times in the busiest season, with a recording | not started |

## Part A: a mind's own words

What was there: every model reply is in the log as its raw text, and the narrator's personas and chronicles are kept
the first time they are written and read back on replay, never written again. What was missing: the king's journal (his
notes, summary, plan and ledger) as it stood at each season. Now each seat with a mind gives its pages after each season
(`ISeat.mindPages`, the model king from `LeaderJournal.pages`), and the log keeps each page only when it changed
(`src/game/src/minds.ts`). The web app's **Own words** tab shows a model king's pages at the season shown, only where the
record is open to the page. Design note: `docs/design/38-legends.md`, "A mind's own words".

### Readings taken

- **A model character's words need no pages of their own**: its memory summary is already part of the game state,
  saved every season ("store only what changed": the snapshots already share what did not change).
- **"Shown beside the seat's decisions"** is read as a tab of the seat view, beside its inbox and the season's moves:
  the side panel is where a seat's decisions are read.
- **Told anew, keeping the first telling beside the new** (the narrator's writings): nothing is told anew yet, since no
  view asks the narrator again; the button belongs with the threads to watch (part F), the next writing the narrator
  does for a viewer.

## Part C: zoom shapes the realms' colours

Zoomed out the realms' colours are full; zoomed in they thin to a wash, then almost to nothing but the realm bands
(borders) and the emblems on the city seals (banners), so the ground, the season and the figures show through. One
factor, `washAt` (`src/web/src/map/wash.ts`), multiplies the realm colour's opacity (ruled, governed and a vassal's wash
alike): 1.6 at 0.45 screen pixels a map unit or less (the whole board in view), 0.2 at 3 or more, log-linear between, in
eight steps. `zoom.ts` sets it as `--wash` when a gesture settles, and only when the step changes, so the realms' layer is
painted again only then. The sound already followed the zoom (item 17a+: what is near the view is heard, louder the
nearer); nothing changed there.

### Readings taken

- **"Borders and banners"** are the realm bands and the owner's emblem on each city seal, both already drawn: no new
  banner, since a flag per province would clutter the map the owner asked to keep readable ("The main map and its views").
- **Steps, not a smooth fade**: eight steps keep the heavy layer from being painted at every settle on a phone (17a's 50 ms
  bar), and each step is small enough not to jump.
- **First guesses** (item 18 may tune them): the ends 1.6 and 0.2, the scales 0.45 and 3, eight steps.

Questions for the owner: none.

## Part B: the season in sequence, paced by meaning

What was there: the worker played a season, sent it, and slept the speed's pause; the page showed each season as it came,
all its moves at once, and played a few small scenes (gifts, sacks, ambushes) over it. Now the worker computes the next
season while the page plays this one, one ahead and no more; the page holds that season until this one has played out;
the season's moments play in the engine's order, paced by meaning and speed; a short line closes each season; and
Simulate, the fourth speed (key 4), draws nothing: a progress bar and the count of seasons while the worker plays on
ungated, then the game opens at its last season. Design note: `docs/design/52-the-season-plays-out.md`.

- `src/web/src/session/pacing.ts`: the phases, the paces, `paceSeason` and `closingLine` (plain functions).
- `src/web/src/map/moments.ts`: `momentsOf` (the season's moments from the viewer's scene), `seasonPlay`, `momentMarkup`;
  it replaces `scenesOf` and `sceneMarkup` (life.ts).
- `src/web/src/session/page-gate.ts`: `PageGate`, how far the worker may run ahead; `core.ts` waits on it, and the
  `played` message replaces `delay`.
- `src/web/src/styles/playback.css`: the pieces' slide in the marching, the disaster medallion, the closing line.
- `src/web/src/session/client.ts`: `held`, `startPlayout`, `finishPlayout`, `playoutAt`, `simulating`; the replay plays
  each season out.
- `src/web/src/components/SimulateProgress.tsx`: Simulate's screen (`Play.tsx` shows it in place of the game).
- `src/web/src/map/svg-renderer.ts`: `playSeason`, the land layers held to `landAt`, the closing line; `tokens.ts`:
  `reconcile`'s `leaveAfter`.
- Tests: `src/web/test/pacing.test.ts` (the order, the paces, a crowded season, Simulate, the line, only what the seat
  knows plays, the worker one season ahead, and an envoy caught on his last season never arriving); the living map's draw test now draws the moments and the line for every season and view. The smoke test
  checks that a season played closes with its line.

### Frame times (soak tool, seed 1, three minutes a speed; the whole game at Simulate), before the design check's retune

| Run | Seasons | Seconds a season | Frames over 50 ms | Worst after the opening |
|---|---|---|---|---|
| desktop, Slow | 9 | about 20 | 31 of 10,674 (0.3%) | 117 ms |
| desktop, Normal | 15 | about 12 | 52 of 10,400 (0.5%) | 150 ms |
| desktop, Fast | 37 | 5.0 | 126 of 9,214 (1.4%) | 117 ms |
| desktop, Simulate | 102 (the end) | 1.7 | 360 of 5,982 (6.0%) | 150 ms |
| phone (CPU 4x), Fast | 37 | 5.0 | 384 of 8,107 (4.7%) | 400 ms |

The worst frame of every run is the opening's first draw (600 to 870 ms on desktop, 2.75 s on the phone profile), as
before. While a season plays, the long frames are its layer writes (100 to 150 ms, headless software raster); Simulate
reads and draws every season as fast as the worker plays it, as Fast did before. The bar (no frame over about 50 ms) is
not met yet: part G measures the phone and takes the layer writes up. The smoke test passes on desktop, phone and a human
seat, with the closing line checked.

### After the retune (soak tool, seed 1, two minutes a speed, desktop)

| Run | Seasons | Seconds a season, with the result | Frames over 50 ms | Worst after the opening |
|---|---|---|---|---|
| Slow | 6 | about 18 | 22 of 7,148 (0.3%) | 33 ms in play |
| Normal | 15 | about 7 | 37 of 6,982 (0.5%) | 100 ms |
| Fast | 75 | about 1.5 (1 s of highlights, the rest the worker's time) | 184 of 5,539 (3.3%) | 83 ms |
| Simulate | 93 | about 1.2 (the worker's time; nothing drawn) | 4 of 7,243 (0.06%) | 17 ms |

Simulate's page holds 29 DOM nodes while it runs, against about 4,200 for the map. The smoke test passes on desktop, the
phone and a human seat, with the closing line checked.

### First guesses (presentation only)

The paces in `Paces` (the table in the design note), set to "Pace of play" after the design check: a season's playout
about 15 s at Slow with 4 s on the result, about 6 s at Normal with 2 s on the result, and about 1 s of highlights at
Fast, a capital falling taking a second more; Simulate draws nothing.

### Readings taken

- **"Orders resolve in sequence" is read as phases, not one unit after another**: arrivals, the marching (every march
  together), what the road and weather did, the battles one by one, the sieges together, the cities falling. Fifty powers
  marching one at a time would take minutes a season; the engine resolves the marches together too (pillar: the engine
  is the truth, presentation follows it).
- **The results land when the cities fall**: who holds what, the fog, the walls and the season's arrows are written at
  that moment, not at the season's start, and a unit gone stays until then, so nothing changes before it plays ("nothing
  teleports").
- **With a human seat awake, the worker does not run ahead**: he is asked for his orders once he has seen the season play
  out ("Nothing happens unless someone orders it": a king orders from what he has seen).
- **A crowded season plays its greatest moments** (a fall, a battle, a disaster, an arrival, at most a few a season)
  and tells the rest in the closing line: "never faster than can be read" holds for what plays.
- **News is told, never staged**: a disaster or a change of hands the seat only heard of is in the closing line as "word
  came of ...", with no place drawn (hidden information).
- **`ms` stays each speed's key** (1500, 400, 50, and 0 for Simulate), as the reload into an update and the soak tool keep
  it; the pace itself is `Paces`, by the speed's place.
- **The 4 key for Simulate comes with Simulate** here, rather than with 17+++a, since the speed it picks arrives now.
- **An arrival is what the seat knows to stand at a court**, never a journey's end (an envoy caught on his last road
  leaves his journey too): a foreign envoy received at one's court, one's own envoy known there, not believed under a
  cover (hidden information; Codex's P1).
- **Simulate's bar has no end**: when the age ends is hidden from every seat (the drawn last season), so the bar runs
  without one beside the count of seasons and the date.
- **"Opening in replay at the end"** is read as the game opening at its last season with the timeline and its replay
  button, paused, so the player chooses where to watch from and at what pace.
- **The biggest events at Fast are a capital falling**: the engine records no king's death as an event yet, so there is
  none to give a beat.

