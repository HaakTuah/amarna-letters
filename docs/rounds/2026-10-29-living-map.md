# Item 19: the living map (29 October 2026)

Branch `item/living-map`, built in passes, each its own pull request into `develop` (pass 1: #201). Stacked on item 17's
branch (`item/free-cities`, #198) by "pipeline, don't wait"; each pass merges only after #198. The item's text is
`docs/intent/build-order/item-19.md`, with Haakon's words there ("In time I want environmental effects, seasons reflected
on the map. Characters, armies, fighting shown, etc. Everything you can think of, which makes it a better game for a
player or viewer."); its section is "The map in true geography, and its look in time" (under Interface, in
`docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`). As built:
[`docs/design/43-the-living-map.md`](../design/43-the-living-map.md).

Presentation only: the web app (`src/web`) and a drawing script (`scripts/map-snow.mjs`). No engine, script-king, batch or
save file is touched, so no new save version, and the script games come out the same before and after (shown per pass
below). Weekly usage could not be read in this session ("unknown"). No model games.

**The check for changes.** The live design document was asked for changes to the Build order tab (since revision 109) and
the Interface tab (since revision 17) at the start of the item: none.

**Passes, most valuable first, each merged on its own** (chosen over one large PR: each pass is reviewable alone, reaches
the live game sooner, and a pass's review cannot hold up the next):

1. The seasons and the land (the environment on the map).
2. Armies, characters and battles as they travel and fight.
3. Every level of what is built.
4. The rest: a map that remembers, life from the simulation, each realm's own map, omens in the margin, small scenes.

## Pass 1: the seasons and the land

### What was built

1. **Papyrus.** The map lies on papyrus, its strips laid across each other, faint, in the static base.
2. **The year on the land**, from the engine's calendar and each province's climate (`seasons.ts`): in Akhet the Nile's
   black land under the flood, the rain-fed lands dry at summer's end, the Anatolian plateau gold at its harvest; in
   Peret the rain-fed lands and the river fields green, snow on the high ground, frost on the hard-winter plateau, storms
   over the open sea; in Shemu harvest gold with sheaves wherever the land reaps, and the Euphrates, the Tigris, the
   Marassantiya, the Orontes and the Jordan in spate. The season's name (in the viewer's calendar) and its look under
   the cartouche.
3. **Snow from real elevation** (`scripts/map-snow.mjs`, `snow.png`, 65 KB, fetched only when winter is shown): the
   same terrain tiles as the relief, white above a winter snow line falling with latitude.
4. **This game's droughts and floods** (copied into each season frame from `GameState.climate`): cracked brown land,
   or water over the province. A seat sees them only where its own eyes last saw the land, as it was then; the
   calendar shows everywhere. A test checks both (`map-scene.test.ts`).
5. **The legend** gains the season's washes.

### Readings taken

- **The year shows everywhere; this game's droughts and floods only as last seen** (pillar 4, "Information moves in
  physical time"): every court keeps the same calendar, but a drought abroad is known only by someone's eyes. A sight of
  the province is required: word of who holds it is not a sight of its fields.
- **Storms over the open sea only** ("Everything on it comes from the game's own facts"): the engine makes only an open-sea
  crossing dangerous in winter, so coastal waters stay calm on the map.
- **The season shown is the one about to be played**, as the header's date is.
- **Snow by elevation and latitude, not by province** ("Period first", "Numbers come from their causes"): the snow lies
  where the land is high, from real elevation, rather than on whole provinces; frost marks the provinces the engine gives
  a hard winter.
- **"Summer drying everything brown"** is drawn in Akhet, the end of the dry summer, over the rain-fed land; river-fed land
  follows its river.

### Measured

To be filled when the pass's PR is readied: the script games before and after, the phone timings before and after.
