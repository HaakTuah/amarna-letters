# Item 11a+: harvests in their season, and the answers to items 8 to 10+b (28 October 2026)

Build order item 11a+ (`docs/intent/build-order/item-11.md`, the 11a+ part), added by Haakon's PR #110. Branch
`item/harvests-and-answers`. Save version 20. What was built, file by file: `docs/design/22-harvests-and-answers.md`.
Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session). Effort: medium, as set.

Haakon's words for this item, as the item quotes them (28 October 2026): "You figure all this out, expert. You know me by
now. But models must be able to alter clauses also. Remember, everyone plays the same game!"

## The check for changes

The copy in `docs/intent/` is cut from Build order revision 75, Land and economy 29, War and the seas 59, Diplomacy 24.
The live document was asked for what changed since each, at the start and again before the pull request: nothing had.

## The audit at the start

Seeds 1-50 from `develop`, every king a script king, repeated item 11a's "after" figures exactly (wins 0, 4, 2, 28, 0,
16, 0; a capital fell in 25 games, 32 kingdoms), and `--versus solo` (40 seeds) gave 2.38 / 1.07 and 73% / 14%, as 11a
reported. These are the "before" figures below. Every feature built so far was used except those earlier audits explained
(`reputation`, `pact-with-consequences`, `gift-to-person`, `food-bought`, the interception of captives under guard,
`fee-withheld`, deals of tablets and collectors), `forgery-exposed` (an outcome of examining forgeries, rare), and one
regression: **no false name was ever given** (0 in 50 games, against item 10's 413). Since item 11a's hiring in person, a
traveller arriving at a court was met there by its own name before it could pitch under another. Patched: a traveller now
chooses, as it sets out, the name it will give where it arrives (`goAs`), for script and model characters alike; 248 false
names in the first 10 games after.

## What was built

First Haakon's answers to the reviews of items 8, 9, 10+a and 10+b, where they differ from what was built, then the
harvest in each land's own season. Details and names: `docs/design/22-harvests-and-answers.md`.

- **Model envoys alter clauses** (item 8's question 3): in the call that phrases their words, a model envoy may leave
  clauses out, add good wishes and state a gift as less; reporting home, leave answers out and report refusals as
  acceptance. No extra call.
- **Winter takes men by size and supplies** (item 9's question 1): a share of a full unit's men in proportion to the
  troop's, halved for one carrying a season's food, with half of a pass's losses deserting loose.
- **Passage and basing by order** (item 9's question 4): order `grant`, from next season, the grantee's court told as a
  messenger would ride between the capitals.
- **Script kings post watching spies and strike by sea in winter** (item 9's questions 7 and 8).
- **Levies sized by the men a province has** (item 10+a's question 2), and with them **every unit counts in battle by its
  men**, with its price, pay and food in proportion.
- **Runaways by what they keep at home against elsewhere** (item 10+b's question 3).
- **The king chooses how many mouths to put out** (item 10+b's question 7).
- **Water from a dossier per city** (item 10+b's question 15): `docs/history/10-water.md`, Megiddo's spring outside its
  Late Bronze walls.
- **Deportees freed on the way** (item 10+b's question 16).
- **Loose men outside a besieged city rob only its countryside** (item 10+b's question 18).
- **The harvest in each land's season** (item 10+b's question 1, "Period first"): the crop grows each season and is
  reaped once a year, in Shemu or on the plateau in Akhet, into the farmers' granaries; they eat from them all year, and
  the tax is reckoned from the last harvest and taken from the granaries a third at a time.
- **The audit's patch**: false names given on arrival (above).
- **Views, rulebook, web**: `UnitView.men`; `ProvinceEconomyView.granary`, `crop`, `reapsIn`; `expelled` as a share;
  model actions `grant_passage`, `grant_basing`, `expel_mouths` with the share; the rulebook's PEOPLE, ECONOMY, WAR,
  TRAVEL and AUTHORITY parts; the web app's province panel (harvest, granary, crop, a unit's men), Court (grant passage
  or basing) and People (the share of mouths).

## Readings taken and design questions

Each with the principle it rests on ("Reason from the pillars"). None needs Haakon unless he disagrees; the questions
for him are the ones a matter of taste or that bend a pillar, listed first in the progress file and the milestone PR.

1. **The harvest is reaped once a year, but the tax is taken from the granaries a third at a time**, reckoned from the
   last harvest, not the whole year's tax at the reaping. *Period first, given up for playability only after trying to
   keep both*: tribute was assessed on the harvest and delivered over the year, and the king's stores, built for three
   seasons of a town's need, could not take a year's tax at once without losing most of it. Alternative: the whole tax
   at the reaping, with larger stores.
2. **The reaping season is the last busy season**: Shemu from Egypt to Babylonia and across the rain-fed lands, Akhet on
   the plateau (the people dossier's calendar). *Period first.*
3. **The farmers keep at most a whole harvest and a season of their need**, the rest eaten better or lost; no rot in
   their granaries. *Nothing appears or vanishes without a cause* (what is beyond it is eaten); a first guess. Alternative:
   granaries rot like stores, which leaves the farmers short each spring at the default tax.
4. **A unit counts in battle by its men**, in thousandths of a full unit, and reports name strengths to a tenth. *Numbers
   come from their causes*: a levy of a few hundred is not an army. Alternative: one unit one strength, which makes a tiny
   levy as strong as a full army.
5. **A levy takes every man of fighting age at home where the province has fewer than a full levy**, none below 100.
   *Numbers come from their causes; don't prohibit, give it its real cost*: emptying a province of its men costs its
   harvest. Alternative: a levy takes at most a share of the men.
6. **Winter losses: a share of a full unit's men in proportion to the troop's** (so a larger army loses more men and a
   larger share, "a snowbound pass feeds nobody"), half with a season's food carried, the weather drawing half to half
   again; on a pass half of those lost desert and are loose where it set out. *Numbers come from their causes; nothing
   vanishes without a cause.* Alternative: a fixed share whatever the size.
7. **Passage by order stands from next season, and the grantee's court learns it as a messenger rides between the
   capitals.** *Information moves in physical time*: the engine tells him then, as it tells a court any order that touches
   it. Alternative: the grantee learns only from the grantor's letters and his troops finding the road open.
8. **Runaways weigh how well their land fed them and what the tax leaves them against the best land next door**, running
   in proportion to the gain, if it beats home by a tenth. *Incentives, not quotas.* Alternative: by what they keep alone.
9. **Mouths put out: a share of those still inside, up to 90 in a hundred of the town.** *Don't prohibit; give it its real
   cost*: the fighting men and those who feed them stay. Alternative: no limit.
10. **Water kinds**: wells reaching groundwater never fail (the coastal plains, Cyprus, Harran, Arbela, Aleppo); a spring
    outside the walls is cut off and the city drinks its cisterns (Megiddo, Shechem, Tuwanuwa). *Period first*, from the
    dossier, each claim graded. Alternative: wells as cisterns.
11. **Deportees are freed by troops of the king whose homeland they were taken from, or of a king who closed his roads to
    the deporter**, on the stretch they walk that season, and are loose men there. *Everything is somewhere; no menus*:
    what becomes of them goes through ordinary actions (settling, the roads). Alternative: freed deportees walk home and
    resettle.
12. **Loose men outside a besieged city rob its farmers' granaries at the same rate**, never its purse or stores.
    *Everything is somewhere.*
13. **A traveller chooses on setting out the name it will give where it arrives.** *Deceit is information*: the court
    finds it out by sight, inquiries or letters, as before.
14. **Script kings raise a levy of at least half a full one**, and the frozen baseline only full ones. *Every feature is
    every seat's*, while a script king's board counts a unit as one.
15. **Grants by order and the alias offered for the road** reuse existing records (a `Grant` with no tablet, an invented
    name from the same list). *One fact, one place.*

## First guesses (item 18 tunes them)

- `LandData.levyLeast` 100: the fewest men a levy raises.
- `WinterData.suppliedPercent` 50, `desertPercent` 50: a supplied troop's winter losses against an unsupplied one's; the
  share of a pass's losses who desert.
- The weather's draw on winter losses: half to half again.
- `LandData.expelMost` 90: the most of a town's mouths put out.
- `LandData.reserveSeasons` 1: the farmers' granary holds at most a harvest and a season of their need.
- The water dossier's kinds, where the sources are silent ([G] in `docs/history/10-water.md`).
- Script kings: half a full levy at least; a watching spy within four hops of the capital; mouths put out to make the
  stores last two seasons, a tenth at least.

## Script players and the feature

PLACEHOLDER-SCRIPTS

## Benchmarks and script games

PLACEHOLDER-BENCH

## The review

PLACEHOLDER-REVIEW

## Tests

PLACEHOLDER-TESTS

## Left for later

Water works (a well sunk, a cistern dug) wait for item 15; the commander's part in winter losses for item 13; bands that
waylay deportees for item 11b; tuning every first guess for item 18.
