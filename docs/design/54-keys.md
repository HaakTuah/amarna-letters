# Keys for everything (item 17+++a)

The item's text: `docs/intent/build-order/item-17.md` ("17+++a, keys for everything"); the report:
`docs/rounds/2026-11-06-keys-for-everything.md`. Presentation only: no rule, request, log or save changes.

**One table, one listener** (`src/web/src/ui/keys.ts`). `KeyDefaults` holds every action with its default key, what it
does in the Keys page's words and its group; `useKeys` runs the handlers where each action lives (the time and the
windows in `pages/Play.tsx`, the map's views and moving in `components/GameMap.tsx`). The keys are in that table only;
the Keys page (`pages/Keys.tsx`) and every tooltip (`withKey`) read them from it. An item that adds a window, a view or
an action adds its row there and its handler where it lives.

**Whose keys.** Crusader Kings III's, by meaning, since it is the closest of Paradox's games to this one: Space, the pace
keys, Escape, its windows on F1 to F10 (the ruler is the seat; the realm, the provinces; the military, the standings;
the courtiers, the people; intrigue, the inbox; factions, the threads; decisions, the events; the encyclopedia, the
rules; F10, the first free key, the chronicles), E for its realms map, and W, A, S, D with the arrows to move the map.
Enter seals one's season, as in Civilization (seasons are turns). Where neither game has a like (the mood of the land, a
model's own words, the trail, the follow, the legends) the mood takes R, the next key of Crusader Kings III's map-mode row,
and the rest have none until a player gives them one. F4, Crusader Kings III's council, waits for the council's window.

**Each changeable.** A player's own keys are kept in this browser (`amarna-keys` in local storage; the page works without
it). A key already given to an action is refused for a second, so no key ever does two things, and the keys the browser
keeps (Tab, F11, F12, the modifiers) are never taken. No key acts while something is typed, nor with Ctrl, Alt or the
Command key held; Enter on a button or a link is the button's own. Only the map's moving repeats while its key is held.

**Space in the middle of a season.** Pausing holds the season playing out where it stands: the page's clock
(`client.ts`, `holdPlayout`) and the map's (`svg-renderer.ts`, `hold`: its animations paused, its timers kept with what is
left of them) both stop, and playing again goes on from there. The worker is told at once, but says auto-play stopped
only once it has computed the season it was on, so the page's play button follows the hold (`autoPlaying`, `canPlay`).
The phone has no keys and is unchanged.
