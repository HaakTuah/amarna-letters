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

PLACEHOLDER-BUILT

## Readings taken and design questions

PLACEHOLDER-READINGS

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
