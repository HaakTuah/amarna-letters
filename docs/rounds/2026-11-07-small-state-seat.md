# Item 17++++: a small state as a seat

The owner (31 October 2026, in the build order's text): "maybe there should be an option to play as one of the small
states, even if that's not what represented at the front and adviced", then "Yes, expertly to all!".

The item's text: `docs/intent/build-order/item-17.md` ("17++++, a small state as a seat"); its sections: "For every ruler
played by a model or a human" (the royal council), "One scoreboard for every power" and "Relative score" (Victory). How it
works: `docs/design/26-city-states-as-powers.md`, "A small state as a seat". The live design document could not be read
from this session (the owner's second account); the copy on `develop` was read instead, and it had no change in these
sections since the item began.

## What was there already, and what was built

Most of the item stood before it began: every power's seat could already be given to a human or a model on the start
screen (the seat menu and the table's "Played by"), every seat plays by the same rules with its own seat view, letters and
council, and every power is judged on the one scoreboard against par for its start (item 11+). What the item adds is the
seat choice's words and the seat view's fit for a small realm:

- **The seat choice** (`src/web/src/pages/Home.tsx`): the seven Great Kings first, "the advised start", then "a small state:
  harder, not the advised start", each with its ruler where the sources name him and whether it is a small kingdom or a
  chief's land; choosing one says why it is harder and that it can win.
- **How a seat is styled** (`rulerStyle`, `rulerOf` in `src/engine/src/model/power.ts`): a request's identity line said
  "Great King of" to every seat, so Rib-Hadda was told he was the Great King of Gubla. It now says "Rib-Hadda, king of
  Gubla", "the king of Tunip", "the chief of the Kaska"; the phrasing of a court's answers speaks of "a ruler … a Great King,
  a city's king or a land's chief"; the chronicle's annals style each ruler so.
- **The envoys' journeys** in the seat's orders, grouped by their length once the list is long ("1 season to every court but
  these; Arrapha, Elam: 2 seasons"), where it was forty-six courts one by one.
- Tests: a model's file seat played as Byblos for a season (`src/game/test/file-seat.test.ts`), the styles
  (`src/engine/test/king-names.test.ts`), the journeys (`src/web/test/travel-times.test.ts`).
- Docs: README ("Playing with Claude"), `docs/design/26-city-states-as-powers.md`, `DESIGN-NOTES.md`.

Checked in the built app (Playwright): the seat menu shows the two groups (7 and 40 seats), the note under a small state,
and a game begun as Gubla opens on its orders, its council and its map, with no page error.

## Readings taken

- **"Marked as harder and not the advised start"** is the menu's grouping and its label, and a line when one is chosen;
  nothing stops or warns a player beyond that. Principle: freedom to do ("The game in one page").
- **The style is presentation, never rank**: a city's ruler is a king, a land under a chief a chief, the seven Great Kings
  Great Kings; whether anyone calls him Great King is earned in greetings, as before. The model's request no longer tells
  it a rank it does not hold ("Requests are rules too").
- **No rule changes**: nothing checks which power a seat is (the item's own words), so script kings, the benchmarks and
  the saves are untouched; no save version.

## Script kings and the benchmarks

No rule, request field or script changed but the identity line's words, which script kings do not read. The batch of script
games is the regression check: below.

## Questions for the owner

None.
