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
season of the year, the viewer or what the viewer knows of the land changes: each step of the timeline changes the season
and repaints it, while the same season a year apart over unchanged land does not.

**Papyrus.** The whole map lies on papyrus, its strips laid across each other (`#papyrus`, faint, in the static base). The
tablets stay clay.

**The calendar.** The season about to be played (`seasonOfTurn` of the frame's turn), and each land province's climate
from the environment dossier as the engine keeps it (`climateOf`, `reapSeasonOf`; `docs/history/03-environment-and-seasons.md`):

| Season | On the map |
| --- | --- |
| Akhet (the flood) | The Nile's black land under water, rippled; rain-fed land dry and brown at summer's end; the Anatolian plateau, which reaps in Akhet, harvest gold |
| Peret (the winter rains) | Rain-fed land green; the river fields sown green; snow where the land stands above the winter snow line (`snow.png`); frost over hard-winter provinces; storms along the open-sea crossings, the only sea the engine makes dangerous in winter |
| Shemu (the harvest) | Harvest gold, with sheaves, over every province that reaps now; the river fields gold; every river whose flood season in the engine is Shemu (`floodSeasonOf`: the Euphrates, the Tigris, the Marassantiya, the Orontes and the Jordan) in spate |

The season's name, in the viewer's own calendar (`seasonName`), and its look are written under the map's cartouche.

**Snow from real elevation.** `scripts/map-snow.mjs` writes `src/web/src/map/snow.png` from the same public-domain terrain
tiles as the relief (`map-dem.mjs`): white where the land stands above a winter snow line that falls with latitude (about
1,300 metres at 40 degrees north, 2,000 at 33), softened and quantised to eight steps (65 KB). It is fetched only when
winter is shown.

**This game's land.** The droughts and rivers' bad years under way (`GameState.climate`, copied into each season frame as
`climate`, with the river, whether its flood was ruinous, and the seasons since it struck) are drawn over the calendar: a
drought as cracked, browned land whatever the season. A river's bad year strikes in its flood season and hurts the next
three: the season after a flood rose (a ruinous one, or the Tigris's and the Euphrates's damaging floods) the water still
lies over the province; after that its fields are spoiled, a grey-brown silt; and the Nile's bad year that is not
ruinous is a low Nile ("a low Nile one Akhet in eight", the environment dossier), drawn as unwatered land, pale and dry. In a seat view they show only where the court's own eyes last saw the province, as it was then (a court's sight
of each province, frame by frame, as the fog of war already reads it; word of who holds a province is not a sight of its
fields). The calendar itself shows everywhere: every court keeps the same year.

**Readings taken.**

- The calendar's look shows in every view, the game's droughts and floods only as last seen (pillar 4, "Information moves
  in physical time": the year is common knowledge; a drought far away is not).
- The season shown is the one about to be played, as the header's date is.
- Storms are drawn along the open-sea crossings only (the map's open edges), since that is where the engine makes a winter
  crossing dangerous; coastal waters stay calm ("Everything on it comes from the game's own facts").
- A river's bad year is drawn by what it was: the Nile's bad year that is not ruinous is a low Nile, never water on the
  land; a flood's water lies one season, then its fields are spoiled (nothing on the map may mislead).
- The Levant's "hills greening with the winter rains" is drawn for every rain-fed province in Peret, and "summer drying
  everything brown" over the rain-fed land in Akhet, the end of the dry summer; river-fed land follows its river.

**Measured.** On a phone (390 by 844, CPU slowed four times), with and without the pass: the long tasks of playing a
season and of stepping back one on the timeline (`src/web/season-shots.mjs`), in the PR.

## Pass 2: armies, characters and battles

`src/web/src/map/figures.ts`: every figure is a symbol in the map's `<defs>`, drawn in one fill over its power's colour,
so a unit is told apart by its style as well as its colour and emblem. Presentation names a power here ("Different data,
same rules"); no rule reads it.

| Style | Powers | After |
| --- | --- | --- |
| Egypt's companies | Egypt | Mesehti's wooden soldiers at Asyut: three spearmen in file behind tall round-topped shields |
| The Anatolian chariot | Hatti, Arzawa, Kaska, Lukka, Seha, Mira, Isuwa, Azzi | the Hittite chariots of the Egyptian reliefs, three men in a deep car, the warrior gods' pointed caps of Yazılıkaya |
| The Hurrian chariot | Mitanni, Assyria, Arrapha and the north Syrian cities (Carchemish, Alalakh, Aleppo, Niya, Nuhashshe, Tunip, Terqa) | their cylinder seals: a galloping horse and an archer at full draw |
| Babylonia's standard | Babylonia, Suhu, Elam | the spade of Marduk on its pole, as the Kassite boundary stones carve it, before a spearman |
| Canaanite foot | the Levant's cities | the sickle sword raised and the round shield |
| The steppe's archers | the Shasu, the Suteans, Libya | archers at full draw |
| The Aegean's shields | Alashiya | the figure-of-eight shield of the Aegean's figurines and frescoes |

Fleets: Egypt's river ship (Tutankhamun's model boats: the papyriform hull, the wide sail, the steering oar); the Aegean
galley for Alashiya and the western coast (the Thera flotilla fresco: the long hull, the stern cabin, the oars); the
Syrian merchantman for every other (Kenamun's tomb: the deep hull between upright posts, the lookout at the masthead). A
power risen in play takes the style of the fixed power whose capital is nearest its own: the land's own idiom.

- **Envoys on the road** walk as a figure holding his tablet, after the foreign delegations in Meryre II's tomb; at a
  court they keep their tablet chip, which reads at the smaller size.
- **Battles.** Where an attack met troops in the field, a clash of arms (a spear across a sickle sword) in the colour of
  the side that won it: at the arrow's head for an attack that carried, where it was stopped for one thrown back. Only
  troops the viewer saw standing there count (`SceneMove.against`); an attack on empty land or walls keeps its burst.
- **Siege camps.** The besieger's tents, in its colour, ring the walls of each city under a siege the viewer knows of.
- **Bands and pirates.** A campfire below the city of each province a band works, and a pirate's ship for a crew that
  has one, with its men and chief in the tooltip, as the engine's own view of a court shows them (in its sight, or in its
  own land); every one in god view. They give way to more important markers as the others do. A pirate crew is drawn at
  its coastal city like any band, since the engine keeps it on the land province whose coast it works.

**Readings taken.** A battle is drawn only where the viewer saw the troops met (pillar 4): the same test that already
tells it an attack from a march. The styles follow the item's list of relics; the Levantine cities, the nomads and the
north Syrian cities, which it does not name, take the idiom of their neighbours and their own reliefs.
