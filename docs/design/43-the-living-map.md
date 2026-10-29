# The living map (item 19)

Build order item 19 ("The map in true geography, and its look in time" under Interface): the map's look becomes a blend of
Imperator: Rome's map and a museum map of the Bronze Age world, drawn on papyrus. Presentation only: no rule, number or
balance changes, no new save version, and the script games come out the same before and after (each pass's PR shows it).
Everything drawn comes from the game's own facts, never decoration that could mislead; a seat sees only what it knows.

Built in passes, each its own pull request, most valuable first:

1. **The seasons and the land** (this note, below).
2. Armies, characters and battles as they travel and fight.
3. Every level of what is built.
4. The rest: a map that remembers, life from the simulation, each realm's own map, omens in the margin, small scenes.

## Pass 1: the seasons and the land

`src/web/src/map/seasons.ts`, drawn as its own layer of the lower drawing (`svg-renderer.ts`, layer `season`), over the
holders' colours and under the relief, so the shading still models the hills through it. It is drawn again only when the
season of the year, the viewer or what the viewer knows of the land changes, so stepping the timeline within a year of
quiet land repaints nothing.

**Papyrus.** The whole map lies on papyrus, its strips laid across each other (`#papyrus`, faint, in the static base). The
tablets stay clay.

**The calendar.** The season about to be played (`seasonOfTurn` of the frame's turn), and each land province's climate
from the environment dossier as the engine keeps it (`climateOf`, `reapSeasonOf`; `docs/history/03-environment-and-seasons.md`):

| Season | On the map |
| --- | --- |
| Akhet (the flood) | The Nile's black land under water, rippled; rain-fed land dry and brown at summer's end; the Anatolian plateau, which reaps in Akhet, harvest gold |
| Peret (the winter rains) | Rain-fed land green; the river fields sown green; snow where the land stands above the winter snow line (`snow.png`); frost over hard-winter provinces; storms over the open sea, where the engine makes winter crossings dangerous |
| Shemu (the harvest) | Harvest gold, with sheaves, over every province that reaps now; the river fields gold; the Euphrates, the Tigris, the Marassantiya, the Orontes and the Jordan in spate (their flood season in the engine) |

The season's name, in the viewer's own calendar (`seasonName`), and its look are written under the map's cartouche.

**Snow from real elevation.** `scripts/map-snow.mjs` writes `src/web/src/map/snow.png` from the same public-domain terrain
tiles as the relief (`map-dem.mjs`): white where the land stands above a winter snow line that falls with latitude (about
1,300 metres at 40 degrees north, 2,000 at 33), softened and quantised to eight steps (65 KB). It is fetched only when
winter is shown.

**This game's land.** The droughts and river floods under way (`GameState.climate`, copied into each season frame as
`climate`) are drawn over the calendar: a drought as cracked, browned land whatever the season, a flood as water over the
province. In a seat view they show only where the court's own eyes last saw the province, as it was then (a court's sight
of each province, frame by frame, as the fog of war already reads it; word of who holds a province is not a sight of its
fields). The calendar itself shows everywhere: every court keeps the same year.

**Readings taken.**

- The calendar's look shows in every view, the game's droughts and floods only as last seen (pillar 4, "Information moves
  in physical time": the year is common knowledge; a drought far away is not).
- The season shown is the one about to be played, as the header's date is.
- Storms are drawn over the open sea only (sea zones with no coast of their own), since that is where the engine makes a
  winter crossing dangerous; coastal waters stay calm ("Everything on it comes from the game's own facts").
- The Levant's "hills greening with the winter rains" is drawn for every rain-fed province in Peret, and "summer drying
  everything brown" over the rain-fed land in Akhet, the end of the dry summer; river-fed land follows its river.

**Measured.** On a phone (390 by 844, CPU slowed four times), with and without the pass: the long tasks of playing a
season and of stepping back one on the timeline (`src/web/season-shots.mjs`), in the PR.
