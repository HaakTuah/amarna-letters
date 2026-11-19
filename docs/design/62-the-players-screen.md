# The player's screen

Build order item 18b, "The player's screen" under Interface (copy: `docs/intent/interface-and-the-council/the-players-screen.md`),
built in the parts that section gives, each merged playable. This note says what is built, part by part.

## Part 1: the first game and the season brief

### The first game

A setup for an evening, offered first on the start page ("Which game?", `src/web/src/components/GameChoice.tsx`), every
rule as in the full game. Its data is `src/engine/src/rules/first-game.ts`:

- **The powers:** Egypt, Hatti and Mitanni; Isuwa between Hatti and Mitanni; the cities of Syria and Canaan and the coast
  between all three (Carchemish to Gath, Ugarit to Ashkelon, Damascus, Qatna, Qadesh); the Suteans of the steppe and the
  Shasu of Seir. Kaska and Azzi beyond Hatti, western Anatolia (Arzawa, Lukka, Seha, Mira), Alashiya, Libya beyond Egypt,
  and Terqa, Arrapha and Elam towards Babylonia and Assyria are not between them, and are absent with Babylonia and
  Assyria.
- **The ending:** half of all ages over by the 20th season, and a cap drawn in secret from 28 to 32 seasons
  (`firstGameConfig`). First guesses for the balance pass, as the section says.
- **The table setting:** `GameConfig.absent`, the powers left out; empty in the full game. The start page's choice sets it
  and the ending; "Customize the table" may still change the ending.

### Absent powers lie beyond the map's edge

A new game is set up whole, then `leaveOut` takes the absent powers out before the first season: their troops, people,
tablets, debts and claims go, a present court's servant standing at an absent court is at his own instead, and every
loyalty and tie to them goes. They count as out of the game (`eliminated`), but no court hears of a fall, since they were
never in the age.

Their land is then beyond this game's map (`WorldMap.play`): the map in play keeps every province on record, but no road
leads into an absent power's homeland and it is no part of the land in play (`landProvinces`), so nothing moves, travels,
grows or rises there. Unruled land would not do: a walled town without a ruler raises an elder by the full game's rule
("A head rises in time"), and the absent world filled with new small powers within a few seasons. The map in play is set
when a game begins and whenever its engine is built, as the powers risen in play are, and read when used, never kept from
the module's loading (the script kings' `Board.Map`, the orders' `map()`). The doors the newcomers and raiders come
through open only onto the map in play. What a seat is shown leaves the absent powers out: the land standings, the
journeys to every court, the rulebook's opening (which names the three Great Kings and says the others are absent, their
lands beyond the map) and the script kings' list of living powers (`WorldMap.isAbsent`).

### The season brief

The first of the four questions, "What happened to me?": at most six lines, most urgent first, of what this season
brought the seat, from its own view alone (`seasonBrief` in `src/engine/src/rules/brief.ts`). In order:

1. **Threat:** a city of its own under siege; foreign troops in its land, by power; foreign troops that came next to its
   land last season (troops that merely stand at its border, in their own land or another's, are no news).
2. **Battle:** last season's, its own: a unit destroyed or beaten back, its attacks that took land or failed, and attacks
   on its land, held off or not.
3. **Word:** an envoy received at its court, an envoy home with a report, a spy's word ("Your spy Tahmaya at Hatti sent
   word"), a tablet ready.
4. **Promise:** a debt repaid, to it or by it, or past its season unpaid; a servant's fee paid, or fallen due unpaid.
5. **Errand:** a servant home or gone, an envoy let go, gold brought home, a candidate seeking service.
6. **Short:** the treasury below a season's pay of troops, works and servants; its troops hungry or unpaid; its people
   short of grain.

Past six lines, the sixth says how many more wait in this season's news. Each line names its place, for the map (the court's
seat for word and errands), and what
answers it: the troops, the court or the treasury in the orders, or the season's news in the inbox.

**One source for the screen and the request** ("A model seat reads the same"): the screen shows `seasonBrief`'s lines
under the panel's tabs while the seat's orders are open (`SeasonBrief.tsx`, rows by `src/web/src/ui/brief.ts`), each
with its own icon and word as well as its colour; a tap shows its place on the map and opens what answers it. The model's
orders request gives the same lines in the same order under "SEASON BRIEF", right after the season (`briefText` in
`src/llm/src/prompts.ts`). `src/web/test/season-brief.test.ts` fails where the two differ. The page shows the lines in
the player's own names (`shown`), as it does all the engine's text.

Save version 96: the request changed.
