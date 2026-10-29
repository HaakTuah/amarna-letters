# Item 15: Infrastructure and policing (29 October 2026)

Weekly usage: unknown (this session cannot read it).

Build order item 15 (`docs/intent/build-order/item-15.md`, stop for review), built on item 14's branch (#189), with the
sections it names: "One rule for everything built" and "Paid in gold or in labour" (Land, people and economy), the roads
term of "What sets a company's pace", "A road belongs to the land it crosses", "Pirates and bandits", "Tolls and
smuggling", "Distance inside your own realm", "Walls price the storm, not the clock", "Water too" and "Starting
positions come from the sources". Built from the walls dossier (`docs/history/12-walls-roads-harbours.md`: "Walls by
city", "Roads and their upkeep", "Relay stations", "What a harbour held") and the pirates dossier
(`docs/history/15-pirates-bandits-tolls.md`: "Where piracy was", "Where banditry was", "Smuggling", "What policing
cost"). The check for changes against the live design document found nothing changed since the copy (Build order rev
109, War rev 66, Land rev 33, Overview rev 567), at the start and again before the pull request.

## What was built

The design note is [`docs/design/39-infrastructure-and-policing.md`](../design/39-infrastructure-and-policing.md); in short:

- **One rule for six kinds**: walls, roads, relay stations, harbours, policing and water works are levels with upkeep a
  season (gold, or men by corvée), decay when unpaid at each kind's rate (policing at once, roads and harbours in 6
  seasons, walls and water works in 30), and projects that raise a level over the seasons. A standing `build` order
  (gold) or `build_corvee` names the level to keep; what nobody ordered is kept by corvée as it stands. War stops a
  project; a province changes hands with what stands. Item 5's `fortify` order is gone, walls are a kind like the rest.
- **Roads and relay stations in the pace**: the roads term of item 7b's pace rule, a road's level in each half of a
  connection for everyone on the road (armies included), stations for a lone traveller on top; the couriers' reach of
  item 13 reckoned with them. Letters and orders passing openly through another king's stations are read by his men.
  An army in another's land may raze a level of roads, stations, a harbour or water works.
- **Policing**: police, where the king's men can go, hold the loose men's take, the bands' odds and a crowd's chance of a
  chief down, keep men on the land, lower piracy from their coast, and find smugglers and sneaking travellers.
- **Harbours** shelter fleets through the winter; crews beyond the room lose a tenth to storms. **Water works** lengthen
  a city's drinking under siege. **Walls under siege** may be repaired with the men and food inside, in place of
  item 5's ban.
- **Starting positions from the dossiers**: walls city by city with the capitals (Akhetaten none, Egypt's forts raised),
  roads 1 in every lord's land and 2 on the Ways of Horus with relay stations there, harbours by the ports, police 20 and
  50 men.
- **Script kings** (`game/src/bots/works.ts`): stations and roads to the provinces their couriers do not reach in a
  season, police where the loose gather and bands work, harbours for their fleets, water works for threatened cities,
  repairs under siege, razing a besieged foe's stations; walls as before, now as projects.
- **Rulebook and view**: BUILDING AND POLICING in the rulebook, a WORKS block in the model king's view, the build form
  and the works of a province in the web's orders panel; the other parts of the rulebook (walls, smuggling, the loose,
  bands, the road check) say where police and roads now count.
- **Save version 35.**

## Readings taken

1. **Each king starts with a standing order to keep what stands, by corvée.** "Each level costs gold every season; paid,
   it holds" and "Nothing happens unless someone orders it" ("A king may automate his own acts with standing and
   scheduled orders, but the engine never does it for him"): what no order keeps decays, and the start's order is the
   king's own, seen and changed like any standing order, set the way the age kept things ("Paid in gold or in labour":
   "the normal way of the age"). Land taken from another is unkept until its new holder orders it kept. (Revised on the
   review: the first build kept unordered land by corvée, which was the engine acting for the king.)
2. **A level-1 road is the attested pace.** The geography dossier's journey times are on tracks kept by the local lord
   ("Roads and their upkeep"), so a kept track changes nothing and the townless lands' unkept tracks are slower.
3. **Relay stations speed only a lone traveller**: fresh animals and stores serve a messenger, not a caravan or an army
   ("speed messages and orders but also invading armies": roads speed the armies).
4. **Letters are read where they pass openly**: a traveller on the road rests at the stations; one sneaking off the road
   passes none. Reading is what station men do, not a new order ("may be read there"); a station where foreign troops
   stand reads nothing, which is the "cut" beside razing.
5. **Who pays for a joint road is words**: each holder builds his own half in his own land, and gold changes hands as
   gifts do, so no funding order ("A road belongs to the land it crosses", "Anyone can fund a project").
6. **Policing in men, by tens**, with diminishing returns: the dossier's 20 and 50 men change little, hundreds hold a
   land down as troops do; troops and police do not add up, the lower share counts.
7. **The corvée's restlessness is the harvest it costs** ("What follows needs no rule"): its men are away from the fields
   for the season, as item 10+a's corvée for walls was.
8. **A repair under siege is an order given during the siege**: the besieged "may repair", so the standing order from
   before keeps but never repairs, and the order stands while the siege lasts.
11. **Hostile troops are not guests**: "nowhere hostile troops stand" leaves out troops the holder lets stand by passage
    or basing, so an ally's army stops neither police, upkeep, projects nor station reading.
12. **Under siege gold cannot reach the city**: walls and water works are kept by corvée with the men inside; police go
    unpaid there and fall, and are hired back by the order once the siege is over.
13. **Word of far provinces' works travels**: the "Works" notice gives at once only what the couriers bring within the
    season; a courier's order is read at the stations on its road when it is sent (the road is known then).
9. **A harbour's level is room to winter, not to land** (the walls dossier: "a harbour's level limits the ships that can
   winter or refit there, not the ships that can land").
10. **Water works add seasons, and a guarded way down** where a spring lies outside the walls; none where water never
    fails, and an island's comes by boat ("Water too").

## Numbers added (first guesses, for item 18)

`WorksData` (top, upkeep, building, decay per kind), `WorksEffect` (road 120/100/90/80%, stations 100/85/75%, police
60 × men / (men + 300), a point for 25 police, harbour room 300/800/2,400 men, a tenth lost beyond it, 2 seasons of water
a level, twice the cost in arid ground), `RepairData` (500 men and 20 measures a step), police pay a shekel for 50 men.

## Measured

All on seed 1, 50 script games each, after item 14 (#189) merged: "before" is `develop` at 0390684, "after" this
branch at fe59ed2. Every game replayed exactly in both (`--verify-replay`, 50 of 50). Games stay playable: a capital fell
in 50 of 50 both ways, the first fall on the median in season 4 both ways, 19 games with a kingdom fallen in the first
two seasons both ways (the same chiefs' lands); kingdoms fallen 706 before, 621 after.

| Power | Growth before | Growth after | Wins before | Wins after |
| --- | --- | --- | --- | --- |
| Egypt | 0.90 | 0.89 | 6 | 6 |
| Hatti | 1.13 | 1.06 | 2 | 1 |
| Babylonia | 0.91 | 0.98 | 3 | 5 |
| Mitanni | 0.83 | 0.90 | 4 | 3 |
| Assyria | 0.84 | 0.64 | 2 | 1 |
| Arzawa | 0.91 | 0.88 | 2 | 1 |
| Alashiya | 0.99 | 0.95 | 0 | 0 |

Akhetaten's open city did not bring Egypt down (fallen 0 of 50 both ways). Assyria lost most: Nineveh's walls fell to 1
from the dossier and its steppe frontier is bandit country; item 18 looks at it.

**What the item changed in the record** (games with it / times): policing held the loose down, robbed 2,116 times
before and 1,013 after, a chief rising from a crowd 519 and 366 times, outlaws on the road 1,182 and 1,082; levels built
or hired 10,477 times in 50 games (police hires most of them); a besieged foe's relay stations razed 10 times in 5
games; letters and orders read at relay stations 106 times in 27 games; fleets wintering beyond their harbours' room 144
times in 42 games; smugglers found once; walls repaired under siege once (after the script patch below, which keeps
repairs for a breach that is near).

**Use against ignore** (`--works-play-half`, 50 games; the baseline builds only walls): growth 0.79 against 0.76, wins
23 against 27. Per power, using it against ignoring it: Egypt 0.93/0.88, Hatti 1.13/1.07, Babylonia 1.01/0.98, Mitanni
0.88/0.73, Assyria 0.57/0.86, Arzawa 0.91/1.02, Alashiya 0.96/0.96. Using it pays in growth; the wins are within noise.

**Weaknesses found and patched** (each re-measured): the first script kings paid projects by corvée when gold was short,
taking a thousand men from a small realm's harvest for a road (using it: 0.78 against 0.79); they now build roads,
stations, harbours and water works only when the gold covers the whole project (0.77 against 0.79, 30 wins to 20). Then
they repaired every besieged wall, eating the stores a starving city needs; they now repair only within two steps of a
breach and with six seasons of the repair's food in store (0.79 against 0.76). **Left open**: Assyria still grows less
using the item (0.57 against 0.86), and fleets still winter short of harbour room; both for item 18's measurements.

**Workshop check**: checks for this code PR took 3 to 7 minutes on GitHub (down from about 10 on 29 October); CLAUDE.md
17.0 KB, the builder rules 11.1 KB, the progress file 17.2 KB, all under 20 KB; no source file over 50 KB but the map's
generated data (`geo-fine-data.ts`) and its relief image; this session cannot delete merged branches on GitHub (403, as
item 14 found); no leftovers added (the scratch logs stay outside the repository).

## Design questions

None for Haakon: the item's text, its sections and "The game in one page" settled every reading above.
