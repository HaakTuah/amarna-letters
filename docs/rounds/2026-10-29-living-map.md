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
4. **This game's droughts and rivers' bad years** (copied into each season frame from `GameState.climate`): cracked
   brown land; a flood's water over the province, then spoiled fields; a low Nile as pale, unwatered land. A seat sees them only where its own eyes last saw the land, as it was then; the
   calendar shows everywhere. A test checks both (`map-scene.test.ts`).
5. **The legend** gains the season's washes.

### Readings taken

- **The year shows everywhere; this game's droughts and floods only as last seen** (pillar 4, "Information moves in
  physical time"): every court keeps the same calendar, but a drought abroad is known only by someone's eyes. A sight of
  the province is required: word of who holds it is not a sight of its fields.
- **Storms along the open-sea crossings only** ("Everything on it comes from the game's own facts"): the engine makes only
  an open-sea crossing dangerous in winter, so coastal waters stay calm on the map.
- **A river's bad year as what it was** (nothing on the map may mislead): a low Nile is unwatered land, not water; a
  flood's water lies the season after it rose, then its fields are spoiled.
- **The season shown is the one about to be played**, as the header's date is.
- **Snow by elevation and latitude, not by province** ("Period first", "Numbers come from their causes"): the snow lies
  where the land is high, from real elevation, rather than on whole provinces; frost marks the provinces the engine gives
  a hard winter.
- **"Summer drying everything brown"** is drawn in Akhet, the end of the dry summer, over the rain-fed land; river-fed land
  follows its river.

### Measured

- **The script games are the same.** Ten games (`src/batch`, `--games 10 --seed 1 --verify-replay`) on the branch's base
  and with the pass: the two summaries are identical line for line (302 lines) but for the wall-clock time.
- **A throttled phone** (390 by 844, CPU slowed four times, `src/web/season-shots.mjs`), the main thread's long tasks
  summed, three runs each, before and after: playing season 2 and drawing it, 407 and 426 ms; season 3, 487 and 470 ms;
  one season back on the timeline, 473 and 460 ms. Within the runs' own spread (about 15%): the layer costs nothing
  measurable. The snow (65 KB) is fetched only when winter is first shown.
- **The smoke test** passes (at 390 and 1280 pixels, names and markers never overlapping, with the season layer drawn).

### The review

One reviewer (Opus, high): nothing blocking. Fixed from it: the measurements above; a river's bad year drawn by what it
was (a low Nile as unwatered land, a flood's water for one season, then spoiled fields), not as water for three seasons;
the rivers' flood seasons and winter read from the engine (`floodSeasonOf`, `WinterSeason`) rather than copied; a river
in spate keeps the finer course when the season changes close up; storms along the open-sea crossings, where the
engine's winter danger lies, rather than over coastless sea zones; comments and the notes' index.

## Pass 2: armies, characters and battles

PR #202, branch `item/living-map-figures`, stacked on pass 1.

### What was built

1. **Every army and fleet after the period's relics**, each culture in its own idiom (`figures.ts`; the table in the
   design note): Egypt's spearmen after Mesehti's models, the Anatolian three-man chariot, the Hurrian chariot of the
   seals, Babylonia's standard, Canaanite foot with the sickle sword, the steppe's archers, the Aegean's figure-of-eight
   shields; Egypt's river ship, the Aegean galley and the Syrian merchantman.
2. **Envoys walk the roads** as a figure with his tablet, after Meryre II's tomb.
3. **Battles as a clash** in the winner's colour, where an attack met troops the viewer saw.
4. **Siege camps**: the besieger's tents round the walls.
5. **Bands' campfires and pirate crews**, as a court's own view shows them.
6. The papyrus made finer and fainter, so it does not read as a grid close up.
7. The legend shows every style; a scene test checks the bands a court draws against the engine's view of it, and that a
   battle is drawn only where the court saw the troops.

### Readings taken

- **A battle only where the viewer saw the troops met** (pillar 4): the test the map already used to tell an attack.
- **Bands as the engine's view shows them** (in sight, or in the court's own land: "its people tell of them").
- **Styles for the powers the item does not name** ("Period first"): the north Syrian cities take the Hurrian chariot of
  their seals, the Levant's cities the Canaanite foot of the Egyptian reliefs, the Shasu, Suteans and Libyans the archer;
  a risen power the style of the nearest fixed power's land.

### Measured

- **A throttled phone** (390 by 844, CPU slowed four times, nine seasons played first, `season-shots.mjs --play 6`), long
  tasks summed, mean of three runs, pass 1 against pass 2: playing season 2, 357 and 321 ms; season 3, 315 and 300 ms;
  one season back, 309 and 230 ms. The first build cost more (one season back 258 against 416 ms), since each figure was
  some twenty paths that every unit's `<use>` cloned; each figure is now one path of pieces all turned clockwise
  (`clockwise` in `figures.ts`, tested), with a chariot's wheel its own.
- **The script games** are untouched by construction (only `src/web` changed; pass 1 showed the batch identical).
- **The smoke test** passes, now also requiring that band marks and siege tents never touch another marker.

### The review

One reviewer (Opus, high). Blocking, fixed: band marks did not hide when they gave way (`.band-mark.off`); the smoke test
now counts them. Fixed besides: siege tents count in their city's badge, hide with a small seal and stand close enough
not to touch the counters above (the smoke test caught the first try at Ur); the figures' cost on a phone (above); the
old chariot and ship symbols removed; the note says a pirate crew is drawn at its coastal city.

## Pass 3: every level of what is built

PR (pass 3), branch `item/living-map-works`, stacked on pass 2.

### What was built

1. **Roads by quality**, each half in its own province's level (track nobody keeps, kept track, road with posts, royal
   road), widths following the zoom; **relay stations** along them.
2. **At each city, close up**: harbours from a beach to quays, wells and cisterns, granaries filled as the stores go,
   mines; placed last, giving way to every marker and name.
3. **What a court knows**: its own works as they stand, others' as last seen, land never seen as an unknown track, only
   its own stores. A scene test checks it.
4. The legend shows the roads' levels and each work.
5. `season-shots.mjs` can zoom at a point (`--at`).

### Readings taken

- **Works known as walls are** (pillar 4; the engine's `worksSeen`): own land now, others as last seen.
- **Stores only one's own** ("Truth is expensive"): another king's granaries are counted by spies, not by the map.
- **Policing has no mark**: it is men on the road, not something built.
- **Mines by the economy's data**, since the engine has no level for them yet (its works name fields, mines and storage
  as later phases); no level is invented for the map (no stopgaps).
- **Works give way to names** ("names that give way" put names above lesser markers; the works are the least of all).

### Measured

- **A throttled phone** (390 by 844, CPU slowed four times, six seasons played first), long tasks summed, mean of three
  runs, pass 1 against pass 3 (passes 2 and 3 together): playing season 2, 377 and 377 ms; season 3, 340 and 381 ms; one
  season back, 239 and 346 ms. The runs' own spread is wide (one season back measured from 182 to 463 ms across the
  session's runs on the same build), and switching parts off finds no cause: with the roads hidden 377 ms, with the
  relay stations hidden 385 ms, as built 377 ms (three runs each). The works at the cities are built only close up,
  where they show; at the other zooms their layer is empty.
- **The script games** are untouched by construction (only `src/web` changed).
- **The smoke test** passes, counting the works as markers that must touch nothing.

### The review

One reviewer (Opus, high). Blocking, fixed: half the roads were never drawn (the map lists each edge once, either way
round, and the first build kept only those listed one way); a test now requires every land connection's road, once.
Fixed besides: the note on what a court knows of others' works (the engine's view is today's sight; the memory is the
map's, from earlier sights); relay stations hidden on the whole board, said in the note.
