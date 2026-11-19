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
- **The season brief**, the first of the four questions: at most six lines, most urgent first, above the panel's tabs
  while the seat's orders are open, each line with its icon and word, a tap showing its place on the map and opening
  what answers it. The model's orders request gives the same lines in the same order, from the same function, and a test
  fails where they differ.
- **Save version 96**, since the request changed.

## Measured in script games

<!-- filled below -->

## Readings taken

<!-- filled below -->

## Finds not fixed

<!-- filled below -->
