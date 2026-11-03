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
| B | The season in sequence: the next season computed while this one plays, pace by meaning, a closing line | not started |
| C | Zoom shapes the realms' colours (full, then a wash, then borders and banners) | built |
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
