# Item 10+a: people at home (28 October 2026)

Build order item 10+a (`docs/intent/build-order/item-10plus.md`, the 10+a part): "People of the land" (the three
groups and the flows between them, births, disbanded men walking home or settled as colonists, settled people moving
within their kingdom with their share of the purse, the loose drifting), "Land and climate", "Rivers" and "Seasons"
(capacity, drought, flood, fields and winter in the field), the pace terms for water, fodder and the season ("What sets
a company's pace"), the king's tax rate with hunger answering in the season it bites ("How a king lives", "The wealth of
a realm"), every use of men drawing on the men of fighting age, yield changing during a game, "The people defend their
land", and the loose men's numbers following what the roads pay against the land ("Bandits rob the purse"). Per PR #76
the starting people come from the sources (`docs/history/04-people-and-settlement.md`, `03-environment-and-seasons.md`).
Branch `item/people-at-home`; save version 17. What was built is in `docs/design/19-people-at-home.md` (the script
kings' part in `docs/design/07-script-kings/13-treasury.md`, "People at home"); this report says why, what it cost and
what was found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers: one reviewer,
none other.

## The check for changes

Asked at the start (Build order since 64; Land, people and economy since 24; War, travel and the seas since 53; Victory
and the ending since 9; Work, money and lending since 11): nothing new. Haakon had not answered the questions of items 8,
9, 9+a, 9+b or 10 in `docs/BUILD-PROGRESS.md`, so their readings stand. Asked again before the pull request: nothing newer
than the copy, and nothing new on `develop`.

## The audit at the start

Seeds 1-50 from `develop` as it stood (every king a script king) and `--versus solo` (40 seeds). The 50 games did not
repeat item 10's after-numbers exactly (wins 2, 9, 9, 21, 2, 7, 0 against item 10's reported 2, 11, 11, 17, 4, 5, 0):
probably item 10's last change to its script kings (they question only captives of kings they are at odds with,
`fe0ca7a`) came after its benchmarks were run; `--versus solo` gave 2.51 / 1.00, 66% / 14% (item 10: 2.50 / 1.00, 67% /
14%). These, measured on `develop`'s head, are the "before" figures below.

Four signals never fired. `reputation` and `pact-with-consequences` are read from model kings' letters, which script
kings do not write. `food-bought` is the engine's own fallback for troops abroad by leave with nothing in their baggage
or depot; script kings keep such troops fed by caravan, so it is never needed (not a choice they miss). `gift-to-person`
is item 10's `gift` order given to someone who is not a false envoy: script kings give it only to false envoys (fired 3
times in 2 games, as `false-envoy-paid`), since a gift to anyone else buys nothing the rules count (it earns the person
gold and a memory; loyalty to a court comes from wages and treatment). That is a reading, not a gap: patching it would
mean inventing a use. No other feature went unused, so nothing was patched.

## What was built

See `docs/design/19-people-at-home.md` for every formula. In short:

- **People in three groups** per province (settled with their men of fighting age, under arms on their units, loose),
  from the people dossier's regional middles shared by harvest; each province starts at its old yield.
- **The harvest follows the hands on the land**: the square root of the labour's share, men of fighting age weighing
  more at sowing and harvest, porters and the corvée away from the fields. The score and free cities' prices count the
  people over the year, not the season's weather or work.
- **The king's tax rate** by province or for all his land, with **hunger in the same season**: the farmers' food is
  what the tax leaves, topped up from the province's market; what is still short sends people off the land, a third dead.
- **Births and coming of age**, **the settled moving within a kingdom** towards room with their share of the purse,
  **men moving between the land and the roads** by what each pays, and **the loose drifting** towards richer land.
- **Levies draw on the men of fighting age** (5,000 an army, 2,000 a fleet), refused where too few are at home;
  **discharged men walk home**, some turning loose when discharged far away, or **settle as colonists**; a destroyed
  unit's men die or run; storms, sieges, plague and earthquakes kill people.
- **Droughts by region and one flood a year per river** along its whole course, replacing the per-power drought and
  flood catastrophes (plague and earthquakes kept at their old frequency).
- **Winter in the field** (an army abroad eats more where the winter is cool or hard) and the **pace terms** for the
  season on land, water in arid land and fodder.
- **The people defend their land**: a resistance of 0 to 2 that a move into empty land not its own must beat
  (`peopleDefence`, on by default).
- What kings see: their provinces' people, tax, harvest and hunger; yields and resistance in their sight; the rulebook's
  PEOPLE part; model kings' `set_tax` and `settle`; the web app's province panel and orders.

## Readings taken and design questions

Each is a question Haakon can answer; the reading taken comes first, the alternative in brackets.

1. **The people defend their land, and free cities keep their walls**: the brief says the people's resistance comes "in
   place of the walls a patron's gold buys a neutral city today". The walls are physical (they hold sieges, fall to
   earthquakes, are raised for gold), so they stay, and every province's people resist an army entering it where no
   troop stands, free cities included; a storm must beat walls and people together (or remove the free cities' starting
   walls, so their people alone defend them).
2. **The size of a levy**: an army takes 5,000 men and a fleet 2,000, so Egypt can levy many times over while Hatti
   feels its "constant shortage of manpower", and small Levantine provinces (Sumur, Byblos, Tyre, Sidon, Megiddo, Gaza,
   Jerusalem, Amurru) and the Sinai and Dilmun can never raise an army (or smaller units, so every province can levy).
3. **The harvest's curve**: the square root of the labour's share (half the people reap seven in ten), men of fighting
   age counting four times another person at sowing and harvest and two and a half in the slack season (or a straight
   line, so a levy costs its exact share).
4. **What the farmers eat**: 60% of the starting harvest for the starting people, so they can bear a tax of about 37%
   before going hungry, and the default 33% leaves them a little over (or a different margin, which sets how far a king
   can squeeze).
5. **Hunger's toll**: for each tenth of their food the farmers went without, a hundredth of them leave the land that
   season, a third dead and the rest loose; until item 10+b they stay in their province as loose men (or harsher, as
   famine was).
6. **No cap on the tax**: 0 to 100, as "no rule caps the rate" says (or a cap, such as 80).
7. **Droughts and floods replace the per-power drought and flood**, drawn by region and by river; plague and earthquakes
   keep their old frequency; with catastrophes off (`catastropheChance` 0), the weather is kind too (or keep them
   separate, so a table can turn catastrophes off but keep the weather).
8. **The harvest stays even across the year**: the seasons weigh only what a levy costs and winter supplies; a harvest
   gathered in its own season waits for a later item (or a harvest season of its own per province now).
9. **The score counts the people, not the weather**: a drought cuts the harvest and the tax but not the land's worth;
   only the people it drives off lower it (or let the land's worth fall with the weather).
10. **Yields and resistance in sight only**: a court sees the people's yield and resistance of its own land and the land
    in its sight, and the map's yield elsewhere; a free city's asking price stays public and so follows its people (or
    make them public, like strength).
11. **What the roads pay**: 5 thousandths of a province's wealth (purse, stores and market) shared among its loose men,
    against what the farmers keep; the robbing itself is item 10+b's, so for now the loose only gather (or wait for 10+b
    before men move to the roads).
12. **Winter supplies are food**: an army abroad in Peret eats half as much again where the winter is cool and twice as
    much where it is hard, rather than paying gold (or gold, as the desert cost of item 5 was).
13. **The season on land slows everyone**, envoys included, by a tenth where the winter is cool and a quarter where it
    is hard (or companies only).
14. **The levers matter little at these numbers**: kings that use the tax, famine feeding, levy costing and colonists
    grow 1.05 against 1.03 for those that ignore them, with equal wins; left to item 18, which sets how much room a
    greedy king has (or widen it now, for example by letting farmers eat less of the harvest).

## First guesses (item 18 tunes them)

`LandData` (`model/land.ts`): men 20% of the settled; an army 5,000 men, a fleet 2,000; men weigh 3 more halves at
sowing and harvest, 1.5 in the slack season; above the reckoned labour a quarter of the share; the farmers eat 60% of the
starting harvest; tax up to 100; a tenth of the shortfall's share leaves, a third dead; births 8% a season by the room
left; the men's gap closes over 30 seasons; 5% a season moves within a kingdom; 5% between land and roads; the roads pay
5‰ of the wealth; 10% of the loose drift; half of a destroyed unit's men die; 5% killed and 5% fled at a storm or a
surrender; plague 5%, earthquake 2%; strays one in a hundred more for every 3 days beyond 15, at most half; porters 5 a
measure; the corvée 3,000; resistance 1 from 5,000 and 2 from 30,000 effective men, half as hostile in the mover's
homeland; winter food +50% cool, +100% hard. `DroughtRegions` and `RiverFloods` (`model/geography.ts`): the dossier's
odds; a drought halves the harvest for three seasons, a bad flood 60%, a ruinous one 30% and 1% drowned. `ClimatePace`
(`model/travel.ts`): wells 30, 2% a head beyond, fodder a quarter of capacity, winter roads 110% and 125%.
`catastropheChance` 0.0175 (from 0.035), since it now picks only plague or earthquake.

## Script kings and the feature

What the script kings do with each lever is in `docs/design/19-people-at-home.md`, "Script kings": the tax set to what
the farmers bear (less 3 points, and down at once where they went short), the countryside fed from the stores before
any grain is sold, levies only where the men are and cheapest in harvest first, colonists where the land has room, and
the people's resistance counted as the defence of empty land in every tactic. The frozen baseline was adapted only as
the rules require: it brings the strength to beat a land's people, and raises only where the men are.

How often each new feature was used in the 50 games after (seeds 1-50, every king a script king), and how it went:

| Feature | Used | Outcome |
|---|---|---|
| Tax set by province (`tax-set`) | in all 50 games, 41,270 times (each province's rate follows its harvest) | taxes run about 35-38 in good years, fall to near nothing in a drought |
| Famine (`famine`, a power's hungry provinces in a season) | all 50 games, 5,216 | mostly droughts and floods, which strike 468 times each |
| Colonists (`colonists`) | 33 games, 71 units settled | every one settled (the order is checked before it is given) |
| The people's resistance (`resisted`) | 39 games, 193 moves held off | script kings bring the support it asks for where they see the land; the moves held off are ones that met more than they reckoned (land out of sight, or a troop that moved away and left its people) |
| Levies where the men are | every levy | script kings check the men before ordering one (`canLevy`); the small Levantine provinces never levy (reading 2) |

**Using the levers against ignoring them** (`--land-play-half`, seeds 1-50, half the kings on each side by seed): 1.05
growth and 25 wins of 50 using them, against 1.03 and 25 ignoring them. The levers matter little at these first guesses:
a farmer can bear only about four points of tax above the default before going hungry, so the extra grain is small, and
the famines come mostly from the weather, which both sides suffer alike (a run with a wider tax margin, 6 points, gave
the same famines and no more growth). That is the feature's size at these numbers rather than poor play; item 18 decides
how much room a greedy king should have (reading 4).

## Benchmarks and script games

**Before** (the audit, `develop`'s head) and **after**, seeds 1-50, `scripts/sim.sh --games 50 --seed 1
--verify-replay`: 50 of 50 replay exactly.

| | Before 10+a | After 10+a |
|---|---|---|
| Capitals fell (games; kingdoms) | 37; 57 | 26; 40 |
| First fall, median season | 19 | 19 |
| Entry to fall, median seasons | 21 | 16 |
| Wins: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 2, 9, 9, 21, 2, 7, 0 | 0, 15, 1, 27, 1, 6, 0 |
| Mean growth (same order) | 1.17, 0.96, 1.33, 1.46, 0.42, 0.90, 0.87 | 1.12, 1.25, 1.24, 1.49, 0.49, 0.92, 0.79 |
| Tablets sealed; detentions | 1471; 423 | 1540; 427 |
| Sieges begun / won | 1197 / 770 | 1146 / 788 |
| Troops hungry; mutinies | 761; 196 | 856; 218 |

`--versus solo`, 40 seeds (one current king against six baselines): 2.27 growth alone and 0.96 as baseline over all, 72%
and 14% of wins (2.51, 1.00, 66% and 14% before). By power, alone / as baseline: Egypt 1.50 / 1.06, Hatti 2.83 / 0.89,
Babylonia 2.00 / 0.96, Mitanni 2.65 / 1.24, Assyria 4.34 / 0.91, Arzawa 1.82 / 0.88, Alashiya 0.76 / 0.81.

What moved, and why: fewer kingdoms fall (40 from 57), since empty land is no longer free to walk into and a long war
costs harvests; Hatti grows more (its plateau is hard to enter, and its rivals' armies cost them men they lack), and
Babylonia less (its flat river land resists little, and the Euphrates and Tigris flood at the harvest one year in six).
Troops go hungry a little more (winter supplies abroad). Growth alone against the baseline fell (2.27 from 2.51) because
the baseline now also brings the strength to beat a land's people, which the current bot's attacks used to exploit; the
current bot still wins more of those games (72%). Nothing reads as a new imbalance that would make games unplayable; the
balance pass (item 18) tunes it.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. Its findings, and what was done:

1. Model kings saw none of the new state (the rulebook pointed at view parts that did not exist): fixed, the prompt's
   YOUR PEOPLE, the hungry, rates, land with room, men for levies, YIELDS and RESISTANCE (`peopleLines`), with a test.
2. Every court saw every province's live yield and resistance, a leak (a levy in Thebes showed at once everywhere):
   fixed, own land and land in sight only, as walls are; the web app shows a foreign province's map yield (reading 10).
3. The report and progress file were unfinished: done.
4. The score dipped while caravans were out or walls built: the land's worth now leaves the men away out.
5. Free cities keep their walls under the people's resistance: kept, as reading 1.
6. The tax was capped at 80 where the design says no rule caps it: now 0 to 100.
7. Porters and builders only lowered the harvest, so a levy could take men away building or carrying: fixed
   (`menAvailable`), and the corvée takes only the men available; with a test.
8. Storm notices counted the ground twice when only the people resisted: fixed.
9. A rulebook sentence on the plateau's seasons was garbled: fixed.
10. The rulebook's catastrophes line still described drought and flood as before: fixed.
11. Susa shared its droughts with Arzawa and Cyprus: it has its own region now.
12. A nearly emptied province could never refill (its need rounded to nothing): its countryside needs at least a measure.
13. Foraging troops and the farmers ate the same food: the people's season now follows the troops' meals, and what
    troops forage comes out of the farmers' food.
14. A river's flood missed the harvest it falls on: floods are drawn the season before their flood season.
15. The look-ahead reckons the people's resistance only for its own moves: left, since a court cannot see a rival's
    reckoning; the cost is a little over-defending.
16. Balance observations (levies the small provinces can never raise, Egypt's resistance 2): readings 2 and 1.

Checking its findings also turned up two faults of mine: some of my new tests compared with a "precision" that is
decimal places, not a tolerance, so they checked nothing; they now check ranges. And the script kings reset their taxes
almost every season: a rate now goes up only once the farmers can bear three points more.

## Tests

`src/engine/test/people.test.ts` (the starting people, levies and the season's weight, tax and hunger, feeding,
discharged men and colonists, strays, resistance, battle losses, droughts and floods, births, moving within a kingdom,
the pace, the tax's bounds) and `src/game/test/people-play.test.ts` (the rulebook and the new orders, the script kings'
tax, levies and colonists, what a court sees, men away). Tests about other rules that walk into empty land now turn the
people's resistance off (`peopleDefence: 0`), as tests of other rules turn catastrophes off; the absorption test reckons
its thirds from the people's harvest; three seeds moved (the terrain play test's first blow beating the ground is at seed
23, so it has more time; two "who decides" tests use seeds 1 and 2); the save version was taken again.

## Left for later

Item 10+b: refugees and runaways crossing borders (hungry people stay loose in their province until then), settling
newcomers and returning runaways under a tablet, deportation, putting the mouths that cannot fight out of a besieged city,
and loose men robbing the purse (the roads' pay is reckoned already). Investment in canals and dikes (raising capacity,
softening floods), granaries, policing, a harvest gathered in its own season, and bands drawing on the loose (item 11).
