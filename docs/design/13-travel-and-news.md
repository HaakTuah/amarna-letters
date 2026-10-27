## Travel and news (item 7b)

Build order item 7, part 7b: routes and the one measure of distance on the finished map, the one rule for what sets a
company's pace, passes closed in winter and rivers slower upstream, interception in its simple form with nature in the
same check, passage and sneaking through a host's land, choosing a route, and news travelling ("What sets a company's
pace", "A road belongs to the land it crosses", "Interception on the road", "Choosing a route", "Passage and access",
"Distance and travel", "Land and climate", "Rivers", "Hidden by default", "Information as a structured asset"; question 6
of the old round report). Save version 11. Why, what it cost and what was found: `docs/rounds/2026-10-27-travel-and-news.md`.

### Routes and pace

- **One pace function** (`legPoints` in `src/engine/src/model/travel.ts`): the points one connection costs a company in a
  season, a point being a tenth of a day, so a factor worth a day still counts. Its terms, in the order of "What sets a
  company's pace": the land it crosses (item 7a's `connectionDays`: terrain, passes, desert, the sea's passage and
  current), a boat on a great river where that is quicker (`boatDays`: the Nile 60 km a day down and 40 up, under sail;
  the Euphrates and the Tigris 40 down and no boats up, so upstream a traveller walks), a river crossing (a day for the
  ferry, four more in the river's flood season: the Euphrates and the Tigris in Shemu; `Rivers[].flood`), winter (an
  open-sea crossing or a mountain pass is Infinity in Peret), and sneaking (off the road on land, half as long again).
  The terms whose systems do not exist yet are in the function and neutral (100%): size and load (9+), water and fodder
  (10+), the leader (11b), roads (15); an army's size and forced marches come with distance-based marching (13).
- **Progress carries over**: a traveller makes `GameConfig.travelDays` (45, a first guess) days of road a season, 450
  points, and keeps what it has made on the connection it is on (`Journey.leg`, `Journey.along`). 45 days was chosen so
  most journeys between capitals keep today's 1 or 2 seasons (the rest of a 120-day season goes on halts, audiences and
  waiting at borders): Hatti–Assyria became 2 seasons (60 road days) and journeys to and from Alashiya became quicker by
  sea (25-47 days), until winter closes the crossings.
- **Winter** (`closedInWinter`, `WorldMap.winter`): the mountain passes (the Cilician Gates, the Taurus, the Anti-Taurus,
  the Amanus, the Syrian Gates, the Lebanon twice) close in Peret with the open sea, for armies (an order over one is
  refused, as at sea; a city across one cannot be bought then) and travellers (who go round or wait).
- **A route** (`cheapestRoute`): Dijkstra over every connection, ties to the province first in the map's order, so every
  engine finds the same route. A traveller's route (`TurnEngine.planRoute`) weighs each connection's points this season
  and the risk of the provinces at its ends, by the share of a season spent on it (the check falls once a season): for each
  percent of risk over a whole season a careful traveller (courage 0) gives 25 points (2.5 days), a bold one (100) 5
  (`RiskWeight`; "Bold or careful, one goal"). Risk is the road check's odds as its court knows the place (below). The route is chosen when it sets out, again when it is turned back at a
  border, and again when it stands before a connection winter has closed (it goes round if a road is open, else waits). Model characters' own choice of route comes with item 11b (reading in the report).
- **Word** (`wordSeasons`, `TurnEngine.travelTurns`): reports, rumours, overdue notices, ransoms and word of the world
  (`JourneyKind` "Word": roads closed or opened, a kingdom's fall) go by the fastest road open, in whole seasons, at least
  one, waiting a season when none is open (an island in winter). They are never stopped: the engine carries them until
  item 11b ("Messengers are errands").

### The road check

Once a season (`TurnEngine.travelOne`, at the start of each turn, before arrivals), for each envoy and spy on the road:
it advances, and the check falls on one province of the stretch it crossed, picked by the points spent in each (a
connection's time counts half in each end's province, all of it in the desert province where the desert lies on one side;
"A road belongs to the land it crosses"). There the odds (`RoadOdds`, percent; first guesses):

| Cause | Odds | Outcome |
| --- | --- | --- |
| Troops (army or fleet) of a king who closed his roads to its court | 40 | his captive (an envoy's letter, mandate, gold and tablets are his; a spy as when caught spying) |
| Found sneaking through such a king's land | 20, +10 with gold, +5 with tablets, + a third of his watchmen's spend | his captive |
| Outlaws: land without a king, a free city's land, a king's | 8, 3, 1 | robbed of its gold; on the way out the errand is given up and it comes home |
| Nature: storms at sea (in winter), the desert | 2 (8), 4 | on the way out it turns back; on the way home it loses the season |

They add up to at most 90, and its skill (competence) takes off up to half. A traveller's own king never stops it, nor
does the king it goes to or comes from. Escort, policing and roads are neutral until their items. Its master hears of a
capture only as an overdue notice, a season after it was due home; of a robbery or a turning back when it comes home
(`Journey.turnedBack`; a turned-back envoy hands back its gold, with no audience to report).

### Passage and closed roads

`RoadsOrder` (`close_roads` / `open_roads` naming a power) stands until changed (`GameState.roadsClosed`). An open
traveller of that court crossing into the king's land from outside it (at the border on the connection; at the desert's edge where the
desert lies on one side) is turned back by his men (one already inside when the roads close goes on): it
learns the land is closed (`Journey.sneak`) and chooses a new route from where it stands, round the land or through it off
the road. Its master learns of the closure by word from the closer's capital (`GameState.roadsHeard`), or when that
traveller comes home. Travellers going to or coming from the closer's own court pass. Closing one's roads is the simple
form of "a host can stop anyone passing through his land"; what he does with them is his captive choices; passage granted
on sealed tablets comes with item 9.

### News

- **Who holds what** (`Views.knownHolders`, `SeatView.owner`, `ownerAsOf`, `ownerFrom`): a court sees the holders of the
  land in its sight (`Views.sight`) as they are; elsewhere the newest of word (the holder as of `turn − wordSeasons` from
  that province to its capital, from `GameState.ownerLog`, which `TurnEngine.setOwner` writes at every change) and what
  its own people saw or brought home (`GameState.known`: its sight at the start of each season's resolution, and each
  province a traveller of its passed, as of when it passed, `TurnEngine.bringNews`). A province's age of news is
  therefore its distance in seasons, unless a traveller brought fresher news. A king who loses a province knows it at
  once (`TurnEngine.setOwner` writes it into his `known`), as his notice tells him. Engine rules (moves, purchases,
  scoring) read the true holder; only the view is late, and a refusal can still tell a court a province changed hands
  (an order on a province whose holder changed is refused with the reason, read next season: accepted in question 6).
- **Fallen kingdoms** (`GameState.fallsHeard`, `SeatView.fallen`): a court that sees the fallen capital hears at once,
  the rest by word; the fall's event is visible only to the fallen court and those that saw it. Until it hears, a court
  may still send an envoy or a spy to the fallen court, or close or open its roads to it (the validator accepts them):
  the envoy turns back on arrival. Ceding land or giving troops to it is still refused, which tells the court (a known
  leak, kept so that no land or troops go to a dead kingdom). ENVOY TRAVEL lists every court not heard to have fallen.
  An envoy at an audience weighs whether its lord looks doomed by what the host's court knows.
- **Structured**: each holder comes with its season and source ("seen", "word from abroad", or a traveller's name), shown
  in the rulebook's LANDS ("heard in turn N, from Hani") and on the web map. Sharing reports with other courts ("Attach a
  report") is not built: it needs the structured press of item 8 and the carriers of item 11b.
- **The web map** colours a seat's land by the holders it knows (`SeasonFrame.knownOwner`, `MapScene.owner`), and its fog
  shows the age of that news on land ("as of" a season), and of its last sight at sea.

### Script kings

`bots/roads.ts`: a king closes his roads to a court he is at war with (a blow either way within 4 seasons, a sworn foe,
or a grudge) and opens them at peace (a friend, or no blow for 8 seasons); a court that hears another closed its roads to
it holds a grudge. Script travellers choose their routes by the engine's formula. `--no-road-play` turns the kings' roads
off, to measure them. The frozen baseline never closes its roads.
