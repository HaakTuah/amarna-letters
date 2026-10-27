# Item 7b: travel and news (27 October 2026)

Build order item 7, part 7b ("Travel and news"): routes and the one measure of distance on the finished map, one rule for
what sets a company's pace, passes closed in winter and rivers slower upstream, interception in its simple form with
nature in the same check, passage and sneaking through a host's land, choosing a route, news travelling with people and
distant provinces shown in their last known state with its date, reports from abroad travelling by themselves until item
11b. Branch `item/travel-and-news`; save version 11. What was built is in `docs/design/13-travel-and-news.md`; this report
says why, what it cost and what was found. Weekly usage: unknown (this session cannot read it).

## The check for changes

The live design document (Claude Docs) was asked for changes since the copy's revisions in the tabs this item reads:
Build order (rev 37), War, travel and the seas (18), Diplomacy and intelligence (18), World and history (23). None: the
copy in `docs/intent/` is current. Item 7a's ten questions are still open in "For Haakon"; this item builds on their
readings (winter closes the open sea; travel bands kept until now, which 7b replaces).

## What was built

- **Routes and one pace rule** (`src/engine/src/model/travel.ts`): every connection costs a whole number of points (tenths
  of a day) from item 7a's lengths, by one function with a term per factor of "What sets a company's pace". On from here:
  terrain and passes (7a's paces), boats on the great rivers (the Nile both ways, faster down; the Euphrates and the
  Tigris down only), river crossings (a day at the ferry, five in the river's flood season), winter (open sea and passes
  closed), the sea's current, and sneaking (off the road, half as long again). The rest of the table's terms are in the
  function and neutral until their items. A traveller makes 45 days of road a season and carries what it does not use.
- **Winter closes the passes** (the Cilician Gates, the Taurus, the Anti-Taurus, the Amanus, the Syrian Gates, the
  Lebanon) with the open sea, for armies and travellers.
- **Envoys and spies travel routes**, chosen from what their court knows, weighing time against risk by their courage;
  they re-route when turned back at a border or stopped by a closed pass.
- **The road check**, once a season, in one province of the stretch crossed, by the share of the season spent in each:
  a hostile king's troops, his people finding a sneaker, outlaws, storms and the desert (the odds are in the design note).
  Captured, robbed (and on the way out turned home), turned back by nature, or held up a season on the way home.
- **Closing one's roads** (`close_roads` / `open_roads`): a king's men turn back a court's open travellers at his border,
  his troops anywhere may seize them, and word of the closure travels to that court.
- **News travels**: a court sees the holders of the land in its sight as they are, and elsewhere as late as word from
  there reaches it, or as its own people saw it on their way; fallen kingdoms too. The seat view dates each province it
  does not see ("heard in turn 12, from Hani"), the web map colours a seat's land by what it knows and shades its fog by
  the age of that news. Reports, rumours, ransoms and word go by the fastest road open, by themselves, until item 11b.
- **What kings read**: a NEWS AND TRAVEL section in the rulebook (`src/llm/src/rules-travel.ts`, so `rules.ts` stays under
  50 KB), WHAT YOU SEE and LANDS updated, ENVOY TRAVEL by this season's roads, the roads closed by and to the court; the
  schema's `close_roads` and `open_roads`; the web order form, legend, province card and About page.
- **Script kings** (`src/game/src/bots/roads.ts`): close their roads to courts they are at war with, open them at peace,
  and hold a grudge against a court that closes its roads to them. `--no-road-play` turns this off.

## The calibration: a season's road

Journeys between capitals by the fastest road run from 8 days (Arzawa to Alashiya by sea) to 78 (Babylon to Akhetaten).
Today's pace of letters is one or two seasons each way. 45 days of road a season keeps 26 of the 42 directed journeys
between capitals at the same number of seasons in the sailing season (14 a season quicker, by sea or down the Nile: Egypt now reaches Hatti, Mitanni and Arzawa in one; Hatti and Assyria two seasons apart, both ways), and Alashiya is quicker to
reach by sea in the sailing season and cut off in winter (7a's reading 6). The rest of a 120-day season goes on halts,
audiences and waiting at borders.

## Benchmarks, script games and the feature audit

Before the item (seeds 1-50 and the solo benchmark, run from a clean copy of `develop`), the audit at its start: the
same figures as item 7a's after-numbers, signal for signal, and every feature built so far is used (as 7a found), so no
gap was found to patch. After the item, on the same seeds (`scripts/sim.sh --games 50 --seed 1 --verify-replay`): 50 of 50
replay exactly.

| | Before 7b | After 7b | After, `--no-road-play` |
|---|---|---|---|
| Capitals fell (games; kingdoms) | 37; 69 | 38; 65 | 37; 81 |
| First fall, median season | 22 | 20 | 20 |
| Entry to fall, median seasons | 21 | 16 | 19 |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 24, 10, 10, 4, 0, 2, 0 | 15, 10, 15, 4, 4, 2, 0 | 14, 12, 16, 3, 2, 1, 2 |
| Mean growth: Egypt, Hatti, Babylonia, Mitanni | 4.87, 3.76, 3.06, 2.37 | 4.22, 4.12, 3.55, 2.10 | 4.52, 4.57, 3.78, 1.58 |
| Tablets sealed; detentions | 1762; 416 | 1643; 300 | 1781; 343 |
| Sieges begun / won | 1071 / 804 | 881 / 665 | 969 / 734 |
| Envoys caught by besiegers; spies caught | 39; 32 | 19; 36 | 36; 30 |
| Landings, blockades | 9, 35 | 6, 29 | 8, 48 |
| Roads closed / opened | none | 755 / 213 | 0 / 0 |
| Travellers turned back at a border; caught on the road | none | 205; 171 | 0; 0 |
| Robbed by outlaws; stopped or held up by nature | none | 154; 156 | 144; 162 |

`--versus solo`, 40 seeds (one current king against six baselines): 9.30 growth alone and 1.38 as baseline over all, 89%
and 14% of wins (9.49, 1.45, 96% and 14% before). By power, alone / as baseline: Egypt 7.24 / 0.87, Hatti 10.64 / 1.55,
Babylonia 11.48 / 1.05, Mitanni 9.75 / 2.71, Assyria 14.04 / 1.41, Arzawa 4.39 / 1.38, Alashiya 7.59 / 0.67. Arzawa alone
fell from 7.10 to 4.39 (88% of wins to 58%): not analysed further; noted for item 18 with the closed winter passes, which
shut the Anatolian roads south for a season each year. The baseline was adapted only as the rules required (it never
closes its roads; its travellers choose routes like everyone's).

What moved, and why:
- **Egypt is less dominant** (24 wins to 15), probably because news of
  distant land reaches every court late and Egypt is far from the rest (not measured further); Babylonia and Assyria gain.
- **Fewer sieges, quicker falls once begun** (entry to fall 21 seasons to 16): the open sea and the passes close in
  winter for armies, and courts learn late of distant falls.
- **Fewer envoys caught at besieged gates and fewer detentions**: some never get there (road checks), and the closures
  turn foes' envoys elsewhere.

**Every feature is every seat's.** The script kings use each new rule:
- **Closing roads**: 755 closures in 50 games (213 reopened at peace); foes' travellers were turned back at the border
  205 times and caught on the road 171 times (their letters, gold and tablets taken). Against the same seeds with half
  the kings closing their roads (`--road-play-half`, alternating by seed): those that close grow 2.80 against 2.54 and win
  26 games to 24. A first policy that closed roads to any distrusted court (and made every closure provoke a grudge) won
  25 to 25 (2.78 against 2.61) and cost Mitanni, ringed by neighbours, most of its growth (0.99 against 3.05); the policy
  kept closes them only to a court that attacked within 4 seasons or a sworn foe, and a closure now costs only a little
  trust. Per power over 25 games a side the figures swing (Hatti 3.90 against 5.27, Babylonia 4.32 against 2.66).
- **Routes**: every envoy and spy chooses its road by the formula; the travellers turned back at a border re-routed
  round or through (none gave up), and those at a closed pass went round where a road was open.
- **News**: script kings read the dated holders as the view gives them (the Board reads `SeatView.owner`), so their
  estimates of distant rivals lag, as the design wants.

## First guesses (item 18 tunes them)

- `GameConfig.travelDays` 45: days of road a season.
- Boats: the Nile 60 km a day down, 40 up; the Euphrates and the Tigris 40 down, none up. A ferry 1 day, 4 more in flood.
- Sneaking: half as long again.
- The road check (`RoadOdds`): troops 40, found sneaking 20 (+10 gold, +5 tablets, + a third of watchmen), outlaws 8 / 3 / 1,
  storms 2 (8 in winter), desert 4, at most 90, skill takes off up to half.
- The travellers' formula (not game numbers): 25 points per percent of risk for a season at courage 0, 5 at courage 100.
  The script kings' roads: war within 4 seasons, peace after 8.

## Readings taken and design questions

1. **A season is 45 days of road** (above), a first guess for item 18. Alternative: a faster or slower pace of letters.
2. **Passes are closed in winter, not only slower**, for armies and travellers alike, by the same season as the open sea
   ("slow or closed"; the 7b text says "passes closed in winter"). A city across a pass cannot be bought in winter, as
   across the open sea. Alternative: passes only slower, and open to armies.
3. **"A hostile army" is the troops of a king who closed his roads to the traveller's court.** The engine has no state of
   war, so hostility is the host's own declared choice, which also makes it one rule with "a host can stop anyone passing
   through his land". Alternative: troops of any king who attacked the traveller's court lately.
4. **Closing one's roads is a standing order per court**, and it never stops travellers going to or coming from the
   closer's own court (refusing audiences is the audience's business). A traveller turned back at the border chooses a new
   road (round, or through off the road) rather than giving up its errand. Alternative: turned back home.
5. **What stopping does**: troops or a host's people take the traveller captive (an envoy's letter, mandate, gold and
   tablets are theirs, as with item 5's besiegers); outlaws rob it of its gold and, on the way out, it gives up and comes
   home; nature turns it back on the way out and holds it up a season on the way home. Nobody dies on the road: deaths of
   characters come with their items. Alternative: storms and outlaws can kill.
6. **Only envoys and spies walk the road themselves.** Reports, rumours, overdue notices, ransoms and word of the world
   travel by themselves and cannot be stopped, as the item says, until item 11b gives them carriers.
7. **Model characters' own choice of route comes with item 11b** (characters who travel). Until then every traveller,
   model characters included, chooses by the script formula from its own courage; and the sender laying down a route in
   the mandate comes with item 9's mandates. Alternative: ask a model envoy its road now (one more call per journey).
8. **Armies still move one connection a season.** "What sets a company's pace" names armies, and the function is built
   for every company, but distance-based marching is item 13's ("An army's size and forced marches: 13"); in 7b armies
   meet only the winter's closed passes.
9. **Policing is the watchmen a king pays** (counter_intelligence): a third of the season's spend adds to the odds of
   finding a sneaker in his land. Escort, roads and the leader stay neutral until their items.
10. **A spy's watched province stays in its master's sight as it is**, as before (question 6, plan step 3, would delay
    spies' sight too). Alternative: delay it by the road home.
11. **Sharing news** ("Attach a report", selling or faking reports) is not built: it needs item 8's structured press and
    item 11b's carriers. News is structured (holder, season, source) and the view and map show it.
12. **The start is not dated**: every court knows the map as it began, so provinces are dated only from turn 1 on.
13. **Known leaks kept**: an order on a province whose holder changed is refused with the reason (question 6 accepted
    it); ceding land or giving troops to a court that fell but whose fall has not been heard is refused, so that nothing
    goes to a dead kingdom.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. Its findings, and what was done:
1. (Blocking) A spy caught on the road kept its post in its master's sight, and its master was never told it was
   overdue. Fixed: road captures of spies have their own path (the cover of the journey, the overdue word, the right
   notice), tested.
2. (Blocking) ENVOY TRAVEL dropped a fallen court at once, telling every court of the fall. Fixed: it lists every court
   not heard to have fallen.
3. The validator refused envoys, spies and roads orders to a fallen court, telling of the fall. Fixed for those three
   (the envoy turns back on arrival); cession and gifts keep the refusal (reading 13).
4. The fall's event was public to the web panels. Fixed: visible to the fallen court and those that saw it.
5. The map and the fallen list timed word differently. Fixed: both by the season word sets out.
6. No border check coming out of the desert. Fixed.
7. An envoy caught at its own besieged gates still brought its news home. Fixed.
8. A re-route after a turn-back took sneaking through that king's land as safe. Fixed.
9. A king's lost province stayed his in his own view where word was slow. Fixed: he knows at once, as his notice says.
10. A connection grown cheaper could give free road. Fixed.
11. A traveller at a closed winter pass never went round. Fixed: it re-routes if a road is open.
12. The return text of a robbed envoy (fixed); the rulebook's paces now from the engine (fixed); a character's sense of
    its lord's doom read true ownership (fixed: what the host's court knows); travellers already inside a land when its
    roads close are let go on (now so, and noted); armies keep one step a season (reading 8).

## Haakon's words in this session

None: the session ran from the item's start prompt.
