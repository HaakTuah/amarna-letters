# Infrastructure and policing (item 15)

Build order item 15, from "One rule for everything built", "Paid in gold or in labour", the roads term of "What sets a
company's pace", "A road belongs to the land it crosses", the later layer of "Distance inside your own realm", "Pirates
and bandits", "Tolls and smuggling", "Walls price the storm, not the clock", "Water too" and "Starting positions come
from the sources", built from the walls dossier (`docs/history/12-walls-roads-harbours.md`) and the pirates dossier
(`docs/history/15-pirates-bandits-tolls.md`). The data and arithmetic are `src/engine/src/model/works.ts`; the season's
work is `src/engine/src/turn/works.ts`; the script kings' play is `src/game/src/bots/works.ts`; the rulebook's part is
BUILDING AND POLICING (`src/llm/src/rules-works.ts`). Every number is a first guess for item 18.

## One rule for everything built

- **Six kinds, one rule**: walls, roads, relay stations, harbours, policing and water works are each a level in a
  province (`GameState.walls` as since item 5, the rest `GameState.built` by `kind:province`). Each kind differs only
  in its data (`WorksData`): its top level, its upkeep a level a season in gold or in men by corvée, the gold or men a
  season of building costs, the seasons a level takes, and the seasons unpaid after which a level falls.

  | Kind | Top | Upkeep a level | Building a level | Decay unpaid |
  | --- | --- | --- | --- | --- |
  | Walls | 3 | 1 shekel or 100 men | 2 seasons, 25 × level or 1,500 men a season (item 5's 50, 100, 150) | a level in 30 seasons |
  | Roads | 3 | 1 or 100 men | 2 seasons, 15 × level or 1,000 men | a level in 6 seasons |
  | Relay stations | 2 | 1 or 50 men | 1 season, 20 × level or 300 men | a level in 6 seasons |
  | Harbours | 3 | 1 or 100 men | 2 seasons, 25 × level or 1,500 men | a level in 6 seasons |
  | Policing (10 men a level) | 500 men | a shekel for every 5 levels, or the police themselves | hired at once | at once |
  | Water works | 2 | 1 or 50 men | 2 seasons, 20 × level or 800 men, twice in arid ground | a level in 30 seasons |

- **The standing order** (`BuildOrder`, other_orders `build` in gold or `build_corvee`, item the kind, amount the level;
  police in men): the level to keep in a province of the king's, and how it is paid, until changed (`WorkPlan` in
  `GameState.works`). Above what stands, a project raises it a level at a time; below, the levels above go unkept and
  decay. **Nothing is kept unless someone orders it**: what no order keeps decays. At the start each king has a standing
  order to keep what stands in his land as it is, by corvée, the normal way of the age, seen in his view and his to change
  (seeded in `newGame`); land taken from another is unkept until its new holder orders it kept (since the review).
- **The season's work** (`worksSeason`, after the moves, sieges, falls and transfers, where item 5's fortify step was):
  for each king, nearest his court first, each kind in each province pays its upkeep (gold from the treasury into the
  province's purse; corvée men into `GameState.corvee`, away from the next harvest, and only if the men are at home),
  unpaid levels count towards their decay, and a project advances a season if it can be paid and worked. **War stops a
  project**: none is worked where hostile troops stand (`hostileAt`: not a guest by the holder's passage or basing grant)
  or a siege lies, and under siege only walls and water works are kept, by corvée with the men inside (no treasury gold
  reaches a besieged city), and police there go unpaid. The "Works" notice gives what it cost and, for the provinces the
  court's couriers reach this season, what was done, is under way, was not worked and why, and fell; word of farther
  provinces comes by courier (`tell`).
- **A province that changes hands** (`setOwner`) passes with what stands, and its old holder's orders for it lapse; it is
  unkept until the new holder orders it kept.
- **Repairs under siege** ("Walls price the storm, not the clock", in place of item 5's ban): a besieged city whose walls
  are ordered kept during the siege (a build order on its walls given since the siege began, kept at least at the level
  standing) makes good a step of the siege's
  wear each season with 500 of its own men and 20 measures from its stores (`RepairData`), nothing from the treasury;
  the order stands while the siege lasts. A repair is an order: the standing order from before the siege keeps but never
  repairs.
- **Razing** (`RazeOrder`, unit order `raze`, target the kind): an army standing in land another holds razes a level of
  its roads, relay stations, harbour or water works. Standing there it still presses a siege.

## What each kind does

- **Roads and relay stations: the roads term** (`model/travel.ts`, `Company.ways`, from `waysOf(state)`): on land, off
  the boat and on the road, each half of a connection takes `roadPercent` of the time by its province's road (0 120%, 1
  100%, 2 90%, 3 80%: level 1 is the kept track the geography dossier's journey times are on), the mean of the two
  halves; a lone traveller (a courier, an envoy, a spy: no size, troops or load) also gets `stationPercent` (0 100%, 1
  85%, 2 75%). Armies, caravans and the court on the road get the road only; sneaking gets neither. Every engine path
  that moves people passes the ways: journeys, couriers and their reach (`courierSeasons`, cached for each map and each
  state of the ways, renewed when a road or station level changes), marches, caravans, trade, the court's road, spies'
  roads and deportations.
- **Letters read at the stations** ("messages passing a neighbour's stations may be read there"): a traveller passing
  openly into a province with relay stations held by a king who is neither its master nor the court it goes to has its
  letter read there (`readAtStation`): that king is told by his own report from that province ("Read at a relay
  station"), and the record marks it `station-read`. A courier carrying an order across another king's stations has the
  order read likewise (`courierRead`). Sneaking travellers pass no stations; a station where foreign troops stand reads
  nothing.
- **Policing** ("Pirates and bandits", "Tolls and smuggling"): a province's police at work (`policeAt`: its holder's,
  none where foreign troops stand, none on the roads and fields of a besieged city) hold the loose men's take, the bands'
  odds on the road and the chance that a crowd raises a chief down to 100 − 60 × men / (men + 300) percent
  (`policePercent`); the holder's troops standing there still hold them to half, and the lower counts (`policedShare`).
  What the roads pay is that held-down take, so police also keep men on the land. At sea a pirate band's odds fall with
  the police of the coast it puts out from. Police add a point for every 25 men to the odds of finding a smuggler at the
  border and a traveller sneaking through (`policeFound`), beside a third of the watchmen's pay.
- **Harbours** (the walls dossier, "What a harbour held": room to winter, not to land): at the end of winter (Peret)
  each king's fleets on a sea's waters share the room of the harbours he holds or has basing in on that coast (300, 800,
  2,400 men of crews at levels 1 to 3); crews beyond it winter on open beaches and the storms take a tenth of them
  (`harboursWinter`, `harbour-short`). A landing needs no harbour.
- **Water works** ("Water too"): a city whose water can fail drinks 2 seasons of siege longer for each level, and one
  whose spring is outside its walls never runs dry once it has a level (`drinkingSeasons`). A city on a river, with a
  spring inside or wells, needs none; an island's water comes by boat.

## Starting positions (from the dossiers)

- **Walls**, city by city as the walls dossier's "Proposed" column gives them, the capitals included (decided 29 October
  2026): Akhetaten 0, Egypt's forts raised (Nubia 2, the Delta's Tjaru 1), Memphis 1, Apasa and Enkomi 2, Kanesh,
  Nineveh 1, Sapinuwa and Arbela 1 [G], Dur-Kurigalzu, Sippar, Nippur and Ur 1; Washukanni and Babylon stay 3 as
  capitals where the sources are silent; the city-states as item 11d set them.
- **Roads**: a kept track (1) in every land with a lord; the Ways of Horus, Delta, Sinai and Gaza, 2; the townless lands
  (Kaska, Lukka, the steppe, Libya, the Shasu) 0. **Relay stations** only on the Ways of Horus (1), the forts with wells.
- **Harbours**: Ugarit, the Delta, Byblos, Tyre 3; Sidon, Arwad, Akko, Gaza, Ashkelon, Enkomi, Kizzuwatna (Ura), Apasa 2;
  every other coast 1.
- **Policing**: 20 men in every land with a lord, 50 in bandit country and on the frontiers (the hills of Canaan, Amurru
  and Byblos's land, Galilee and the valley, Damascus and the Bekaa, the Sinai road, the Kaska frontier) and round
  Akhetaten (the Medjay); none in the townless lands. **Water works** none: the existing water dossier already gives the
  works that stood (Jerusalem's walled way to the Gihon).

## Readings taken

- Each king starts with a standing order to keep what stands by corvée: upkeep must be paid for anything to hold, and
  nothing happens unless ordered, so the engine keeps nothing for anyone; the order is the king's own, at the start the
  way the age kept it, labour as tax, and its price is harvest hands, not gold (revised on the review: at first the
  engine kept unordered land by corvée).
- Level 1 is the attested pace: the dossier's journey times are on kept tracks, so a level-1 road changes nothing, and a
  land nobody keeps (0) is slower.
- Policing counts men in tens; its effect follows the men with diminishing returns, so 20 or 50 police change little and
  hundreds hold a land down, as troops do.
- Who pays for a joint road is words on a tablet and gold changes hands by gift: no funding order, since each holder
  builds his own half ("A road belongs to the land it crosses", "Anyone can fund a project").
- The corvée's restlessness is the harvest it costs: no new rule ("What follows needs no rule").
- Stations are cut by razing them, or by foreign troops standing at them (they read nothing then); they keep speeding
  travellers until razed.

## Script kings

`worksOrders` (`bots/works.ts`), each season after walls: repairs every besieged city of theirs with worn walls (by
corvée); police where the loose men number half a crowd or bands work, enough to hold them down; relay stations, then
roads, in the province of theirs on the most roads to the provinces their couriers do not reach within the season, not
roads on a threatened frontier; a harbour where their fleets on a sea outnumber their harbours' room; water works for a
threatened walled city whose water can fail; and an army pressing a siege razes the foe's relay stations there. They
pay in gold with 150 shekels to spare, else by corvée. `--works-play-half` measures it against kings that build only
walls; `fortification` (walls) now reckons a level as a project of two seasons.
