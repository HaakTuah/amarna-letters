# Item 18b, the player's screen: part 1, the first game and the season brief

A lane beside item 18 (build order item 18, "Beside it, from now, 18b"), built from "The player's screen" under Interface
(`docs/intent/interface-and-the-council/the-players-screen.md`), the first of its parts: "the first game and the season
brief". What is built is described in `docs/design/62-the-players-screen.md`; this report says what was found, measured
and read.

## What changed

- **The first game**, offered first on the start page under "Which game?": Egypt, Hatti and Mitanni with the cities and
  chiefs of Syria and Canaan between them (34 powers), the other 13 absent, half of all ages over by the 20th season and a
  cap drawn from 28 to 32. A table setting, `GameConfig.absent`, empty in the full game.
- **The absent land lies beyond the first game's map** (`WorldMap.play`): no road leads there, and nothing grows, moves
  or rises in it. The seat view, the request and the rulebook's opening leave the absent powers out.
- **The season brief**, the first of the four questions: at most six lines, most urgent first, under the panel's tabs
  while the seat's orders are open, each line with its icon and word, a tap showing its place on the map and opening
  what answers it. The model's orders request gives the same lines in the same order, from the same function, and a test
  fails where they differ.
- **Save version 96**, since the request changed.

## Pictures

The start page, before and after (desktop light, phone dark):

![Before: the start page](<media/2026-11-19-players-screen-1/before-desktop-light-start.jpg>) ![After: "Which game?" first](<media/2026-11-19-players-screen-1/after-desktop-light-start.jpg>)
![Before, phone dark](<media/2026-11-19-players-screen-1/before-phone-dark-start.jpg>) ![After, phone dark](<media/2026-11-19-players-screen-1/after-phone-dark-start.jpg>)

Egypt's fourth season, before (the full game, no brief) and after (the first game, its brief under the tabs), at each size
and in each theme (each a game of its own, so its season differs); and a battle line tapped (desktop dark): the map at
Hazzatu and the orders at the troops.

![Before, phone light](<media/2026-11-19-players-screen-1/before-phone-light-season.jpg>) ![After, phone light](<media/2026-11-19-players-screen-1/after-phone-light-season.jpg>)
![Before, phone dark](<media/2026-11-19-players-screen-1/before-phone-dark-season.jpg>) ![After, phone dark](<media/2026-11-19-players-screen-1/after-phone-dark-season.jpg>)
![Before, desktop light](<media/2026-11-19-players-screen-1/before-desktop-light-season.jpg>) ![After, desktop light](<media/2026-11-19-players-screen-1/after-desktop-light-season.jpg>)
![Before, desktop dark](<media/2026-11-19-players-screen-1/before-desktop-dark-season.jpg>) ![After, desktop dark](<media/2026-11-19-players-screen-1/after-desktop-dark-season.jpg>)
![A line tapped](<media/2026-11-19-players-screen-1/after-desktop-dark-tapped.jpg>)

## Measured in script games

- **The first game plays to its end and replays exactly.** Eight games, seeds 1 to 8, every one of its 34 seats a script
  king: they ended after 29, 30, 9, 18, 19, 10, 26 and 29 seasons (median 22.5; the curve's first guess is about 20), and
  every one replayed exactly. Before the absent land lay beyond the map, it rose into a dozen new small powers within a
  few seasons (Arbail, Ashur, Apasa), and the script kings marched on it; after, none.
- **Every winner was a city-state** (Gezer three times, Akko, Niya, Isuwa, Carchemish, Lachish). Not tuned here (balance
  stays frozen): for item 18, whose par is measured on the full game's long age; a short age may need its own.
- **The full game is unchanged:** six full script games (`scripts/sim.sh --games 6 --seed 1 --verify-replay`) give the
  same summary, line for line, on `main` (c5cda6b) and on this branch, and replay exactly.
- **The brief's lines** in one first game (seed 5, 19 seasons, Egypt, Hatti, Mitanni and Amurru): threats 9, battles 8,
  running short 8, promises 8, word 5, errands 1. Two faults found by reading them were fixed: armies merely standing at
  home next to the seat's land filled every brief (now only troops that came there last season), and a spy's report
  twice made two identical lines (now one, "twice").
- **The tests:** `scripts/test.sh` passes (1878 tests); the smoke test of the built app passes, playing the first game
  as the start page now offers it (it first found the standings panel failing on the absent powers, fixed).
- **Use against ignore:** nothing to add; this part changes no rule.

## Readings taken

Unsure first.

- **"The other powers absent" is read as their land beyond the first game's map**, not as unruled land: unruled land
  raises its own rulers by the full game's rule, and the absent world filled with new powers. Rests on "the other powers
  absent" and "on that part of the map" in the section, and on "every rule as in the full game": the map in play changes,
  no rule does. The land stays on record, unroaded and still.
- **Which powers are "between them":** Isuwa, the cities of Syria, Canaan and the coast, the Suteans and the Shasu; Kaska
  and Azzi, beyond Hatti rather than between the three, are out, as are western Anatolia, Alashiya, Libya, Terqa,
  Arrapha and Elam. Rests on the map's capitals. A call of geography and taste for the owner.
- **The ending:** a median of 20 seasons and a cap drawn from 28 to 32, the section's "first guesses".
- **The brief shows while the seat's orders are open**, under the tabs; for a seat watched, it comes with the part
  "Watching a seat". Rests on the section's order of parts.
- **"A foreign army at its border"** is troops that came there last season: the brief answers "what happened to me?",
  and an army that has stood at home next door all game is no news (the seal button's own wording, "newly in sight",
  says the same).
- **The lines' words:** an envoy's, spy's or servant's line names who, from its notice's title or first sentence; the
  full text stays in the inbox, where a tap on it leads.
- **The rulebook's general sections** (the courts' languages, par) still describe every court of the age; its opening says
  which are absent from the first game and that their lands are beyond its map.
- **The request changed, so the save version is 96.** It was tried with script stand-ins only; the free local model was
  not run in this cloud session, and its trial is queued on 18b's row in the progress file.
- **The live design document refused this session** (by role), so the copy was used and, before the PR was marked
  ready, `docs/intent` on `main` was compared with c5cda6b, where the part began.
- **The start page names no number for the ending** (the stand-in, sure: the cap is secret, and a model king reads the
  ending in words): "an evening: a short age" and "a few evenings: a long age".
- **The pictures are in `docs/rounds/media/`**, since this session may push only to its own branch (the polish lane
  keeps its pictures on a branch of their own).

## Finds not fixed

- **The map draws the absent land as unruled land.** Drawing it as beyond the map belongs to the part "The map does the
  showing"; the map renderer is the #666 lane's now.
- **Some lists still name every power:** the map's legend, the search's filter, the Legends' court picker and the list of
  provinces for a standing order. For the part "Records, one tap away".
- **One fight can take three lines** (troops in the land, a unit destroyed, the place taken); merging them is for the
  next part's brief work, with "what waits" counted on the seal button.
- **The first game's winners** (all city-states in eight games): item 18.

## Reviews

- **The design check** (a fresh reviewer): passes the design, nothing blocking. Done from it: word and errand lines placed
  at the court's seat, the overflow line naming the request's own "news" rather than a "record" it has no section for,
  two comments that still said "unruled", a test that a first game and a full game in one process each play on their own
  map, and the owed work queued in the progress file. Left for later parts: a word line opening its own report rather than
  the inbox's top (with "What waits for my answer").
- **Codex's code review** (four findings, each checked against the code and fixed, with a test): a move that got in said
  "took" though land changes hands only as the next season begins, or by a siege (now "entered", either way round); an
  old report of a far troop or province shown as last season's shortage (now only what the court knows this season); the
  pool's baseline still counting the people who left with the absent courts, so newcomers came to fill their places
  (now the baseline is the people in play, as in the full game); and an absent seat given a model asking for a key (an
  absent seat is now always a script seat that plays nothing, and a preset matches without it).
- **The stand-in's notes:** no ending numbers on the start page; the absent Great Kings named on the first game's card;
  the brief's place said as it is (under the tabs, not above); a spy's line saying whose spy and where ("Your spy Haya
  in Amurru sent word"); the tapped picture retaken on a battle line. The stand-in agreed with every reading but the
  untried local model, now queued.

## Next

Part 2, "the seal button that knows what waits", in a fresh PR off `main`.
