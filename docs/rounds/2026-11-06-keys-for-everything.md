# Item 17+++a: keys for everything

The owner (31 October 2026): "pressing spacebar really needs to pause and unpause the game. Everything should have hotkeys
for the computer quiet frankly, and Paradox hotkeys is what people are used to, so we should probably use those.", then
"Agreed to all, expertly!"; and (1 November 2026) "Yes, please! expertly! does the hotkeys become 1, 2, 3, and 4 then?".

The item's text: `docs/intent/build-order/item-17.md` ("17+++a, keys for everything"); its section: "Pace of play" under
Interface, for the pace keys. How it works: `docs/design/54-keys.md`. The live document's copy had no change in these
sections since the item began (6 November). Space and the pace keys came first, in the polish lane (#293); this item adds
the rest.

## What was built

- `src/web/src/ui/keys.ts`: every action in one table (`KeyDefaults`), with its key, its words and its group; the player's
  own keys kept in the browser (`setKey`, `resetKeys`), a key given to one action refused for a second (`actionWithCode`);
  Enter on a button left to the button; only the map's moving repeats while held.
- `src/web/src/pages/Keys.tsx` (new, with `styles/keys.css`): the Keys page, every key listed by group, each changeable,
  clearable or set back to its default; linked from the top bar and the game's menu.
- `src/web/src/pages/Play.tsx`: Enter seals the season (the same `seal` as the orders' button), Escape closes the menu or
  the enlarged panel, else opens the menu (a card over the map closes itself), F1 to F10 open the windows; every tab, the
  menu and the seal name their keys.
- `src/web/src/components/GameMap.tsx`, `map/zoom.ts` (`panBy`): E and R the realms and the mood; W, A, S, D and the
  arrows move the map a fifth of the view a step.
- Space in the middle of a season: `session/client.ts` (`holdPlayout`, `playoutHeld`, `autoPlaying`, `canPlay`) and
  `map/svg-renderer.ts` (`hold`, the season's timers kept by name with what is left of them).
- Tests: `src/web/test/keys.test.ts`. Docs: README (the keys paragraph), `docs/design/54-keys.md`, `DESIGN-NOTES.md`.

Checked in the built app (Playwright, seed 2 and 3): F5, F2, F3, F9, F8, F7 and F1 open their windows; R and E switch the
mood and back; the arrows move the map; Escape opens the menu and closes it again; Space holds a season while its pieces
march (the pieces stand still, the season does not end) and lets it play on (the pieces move again and the season closes);
on the Keys page a key is changed, a clash refused ("F2 is already Provinces"), and the change kept after a reload.

## Readings taken

- **"Each key taken from the games' own key lists, not from memory"**: the Paradox wikis' key pages could not be read from
  this session (a JavaScript bot check, which this session does not get past), so the keys come from the published list of
  Crusader Kings III's Steam version (kosgames, "Crusader Kings III Hotkeys 2022", matched against two other published
  lists: Space, Z and X, 1 to 5, Escape, F1 the ruler to F9 the encyclopedia, E to O the map modes, W, A, S, D). Principle:
  history holds, applied to the source: the nearest primary list reachable, said where it came from. Filed for the owner
  to check against the game (#754).
- **The windows by meaning, not by number**: Crusader Kings III's F-keys open its own windows; each of ours takes the key
  of its nearest like (the seat F1, the provinces F2, the standings F3, the people F5, the inbox F6, the threads F7, the
  events F8, the rules F9, the chronicles F10, the first free key). F4, its council, waits for the council's window. Own
  words, the trail, the follow and the legends have no like and no key by default; a player gives them one on the Keys page.
  Principle: what players of the genre already know (the item's own words).
- **The mood takes R**: Crusader Kings III has no mood map; R is the next key of its map-mode row after E, the realms.
- **F1 is the seat**: the audience or the orders when they wait, else the season, as Crusader Kings III's F1 is the ruler.
- **Escape**: a card over the map (a province, the legend) closes itself, as before; then the menu, then the enlarged
  panel on a phone held upright; with none open, the menu opens.
- **Space mid-season holds the season**, not only the next one: the pieces, the land and the scenes stop where they stand
  and go on from there. The play button does the same, since Space "does what the play button shows".
- **Enter on a focused button is the button's own**, so Enter never seals the season by accident while a button has focus.
- **No key does two things**: a key given to a second action is refused with a word saying which action has it, and a key
  the player gives by its place wins over + and −, which are otherwise matched by what they type.
- **F1 and F5 are the game's, not the browser's**, inside a game: F1 (the browser's help) is the seat and F5 (reload) the
  people, as in Crusader Kings III; outside a game, and with a key changed or cleared on the Keys page, the browser has them
  again. Principle: what players of the genre already know (the item's own words); put to the owner in #754.
- **The timeline's and the zoom's buttons have rows with no key** (one season back, one season on, back to now, zoom in
  and out, the whole map): neither game's lists I could check gives them a sure like, and the wheel already zooms; each can
  be given one on the Keys page. Principle: build the least that meets the text, and invent no key.
- **A season held still lets its sounds already set off play out**, and the music goes on, as a Paradox game's does while
  paused; the pieces, the land, the scenes and the season's results wait.
- **Space on a season played by "one season on"** (auto-play off) starts auto-play, as the play button shows; "one season
  on" while a season is held lets it play on by itself.
- **The Keys page's links are hidden on a touch-only screen**: "The phone is unchanged".

## Benchmarks

Presentation only: the engine's games are `develop`'s. The full `--versus solo` run on seeds 1-40 still due from #523 (the
Gulf follow-up): BENCH

Questions for the owner:
- #754 (closed): are the F-keys and map keys where you expect them from Crusader Kings III? The owner: "Yes to all." (archive item 231).
