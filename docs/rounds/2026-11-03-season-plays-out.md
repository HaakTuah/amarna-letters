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
| A | A mind's own words kept season by season and shown (the record) | this PR |
| B | The season in sequence: the next season computed while this one plays, pace by meaning, a closing line | built (part B below) |
| C | Zoom shapes the realms' colours (full, then a wash, then borders and banners) | not started |
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

Questions for the owner: none.

## Part B: the season in sequence, paced by meaning

What was there: the worker played a season, sent it, and slept the speed's pause; the page showed each season as it came,
all its moves at once, and played a few small scenes (gifts, sacks, ambushes) over it. Now the worker computes the next
season while the page plays this one, one ahead and no more; the page holds that season until this one has played out;
the season's moments play in the engine's order, paced by meaning and speed; a short line closes each season; and
Simulate, the fourth speed (key 4), skips to the result. Design note: `docs/design/52-the-season-plays-out.md`.

- `src/web/src/session/pacing.ts`: the phases, the paces, `paceSeason` and `closingLine` (plain functions).
- `src/web/src/map/moments.ts`: `momentsOf` (the season's moments from the viewer's scene), `seasonPlay`, `momentMarkup`;
  it replaces `scenesOf` and `sceneMarkup` (life.ts).
- `src/web/src/session/core.ts`: `pageReady`, `pageCaughtUp`, the `played` message in place of `delay`.
- `src/web/src/session/client.ts`: `held`, `startPlayout`, `finishPlayout`, `playoutAt`; the replay plays each season out.
- `src/web/src/map/svg-renderer.ts`: `playSeason`, the land layers held to `landAt`, the closing line; `tokens.ts`:
  `reconcile`'s `leaveAfter`.
- Tests: `src/web/test/pacing.test.ts` (the order, the paces, a crowded season, Simulate, the line, and only what the seat
  knows plays); the living map's draw test now draws the moments and the line for every season and view. The smoke test
  checks that a season played closes with its line.

### First guesses (presentation only)

The paces in `Paces` (the table in the design note): a great moment 2.6, 1.8 and 1.2 s at Slow, Normal and Fast, two
side by side at Fast, at most 6, 5 and 4 a season; the marching 1.6, 0.9 and 0.35 s; the closing line 2.4, 1.6 and 0.9 s.

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

