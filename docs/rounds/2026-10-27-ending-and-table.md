# Item 6a: the ending and the table (27 October 2026)

Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session). Effort: medium. Helpers: one reviewer.
**Stop for review**: the review questions are at the end, and in `docs/BUILD-PROGRESS.md`.

## The specification

`docs/intent/build-order/item-6.md`, the 6a part ("The last season drawn once at the start, the cap and the median as
settings, the open age, the first year moved to 1346 BCE, and the ending said in words"), with the sections it names:
"Random ending" and its first guess, "What kings are told" and "Tuning", "An open age" (all in
`docs/intent/victory-and-the-ending/victory-relative-scoring-and-the-random-ending.md`) and "Calendar"
(`docs/intent/world-and-history/voice-of-the-age-letters-customs-and-vocabulary.md`).

**Check for changes.** The live document was asked what changed since the copy (Build order since revision 23, Victory
and the ending since 7, World and history since 22): only item 5+'s line in the Build order changed (its four steps
marked done). Nothing touches 6a.

## What was built

- **The last season, drawn once in secret** (`src/engine/src/rules/ending.ts`). The chance that season t is the last,
  if the age reaches it, is k × t, with k found by bisection so that exactly half of all ages outlive the median season
  (`endSlope`): 0.07% in season 1, 1.1% in season 15, 2.1% in season 30, 3.1% in season 44 with the default median.
  `drawFinalSeason` draws the cap from its range, then walks the seasons with the rising chance up to the cap, from the
  stream keyed to (seed, 0, "end") alone, so no other roll can shift it; `newGame` stores the result in
  `GameState.finalSeason` and `finalByCap` before anything else is rolled. `endOfTurn` ends the game after that season
  ("the gods have ended the age"; at the cap "the age has run its course") or when one kingdom is left. Over 4,000
  seeds: 50% end by season 44, 7% by 14, 26% by 30, about 3% play season 90 (tested).
- **The cap and the median as settings** (`GameConfig.endMedian` 44, `capped` on, `capMin` 80, `capMax` 100; `minTurns`,
  `endChance` and `maxTurns` are gone). A range of one season is a known cap. The setup menu (Customize the table) sets
  them: "An open age, with no end", "Half of all ages end by [1342 to 1322 BCE]" (the middle season of that year: 1332
  BCE is season 44), and "A hard cap, from [80] to [100] seasons", or none. The batch runner takes `--cap 80-100|N|none`
  and `--median N`; `--max-turns N` is now a known cap of N.
- **Nothing shown reads the drawn season.** The seat view lost `minTurns` and `endChance` and gained only `openAge`; the
  web frames carry `openAge` and, after playing on, when the age ended and who won; the look-ahead builds its pictured
  views from the seat view. Tested: no view carries `finalSeason` or the ending's numbers.
- **The ending said in words.** The rulebook: "Any season may be the last, from the first. Early on it is very unlikely,
  and it grows likelier with every year. Nobody knows which season is the last, and nothing you see foretells it." (step
  18 of a season: "the age may end"). The header: "Any season may be the last: early on it is very unlikely, and it
  grows likelier with every year." (phone: "Any season may be the last"). The About page likewise. No number in any of
  them (tested).
- **The open age.** Set at the start (no last season, no cap; the rulebook says "This is an open age: it has no end",
  the header "An open age: this age has no end."), or chosen when the age has ended by its last season: the header then
  offers "Play on into an open age". Playing on (`playOn`, `GameRunner.playOn`) keeps the winners and the reason,
  records the season the age ended (`ageEndedTurn`, shown in the header: "The age ended in …; Babylonia won it."), logs
  `t<N>/play-on` so a replay, a read-only replay in the web app and a continued game all play on too (tested), and
  does not write the chronicles again. An age that ended with one kingdom left cannot be played on. The spending limit
  an open age needs is the table's existing budget, at which every model game pauses; the setup's cost estimate is now
  for a game of median length (44 seasons, `CostEstimate.TypicalSeasons`), and for an open age for its first 44
  seasons.
- **The first year is 1346 BCE** (`FirstYearBce`): every date label in the web app moves one year; season 44 is 1332
  BCE. Kings' prompts still count game years and never name a year BCE.
- **Save version 8**: new rules, new dice for the end.
- Design notes updated: `01-rules-as-implemented.md` (Ending), `09-the-web-map-and-the-interface.md` (date label,
  ending line, setup), `05-pacing-sleeping-seats.md`, `06-file-seats-and-the-agent-simulation.md`,
  `07-script-kings/02-terms-used-below.md` (H) and `20-benchmarks.md`, and the README.

## Script kings and the new ending

Kings are told the ending in words only, so a script king turns the words into a belief of its own
(`src/game/src/bots/ending-belief.ts`): the design's default curve (median 44), never the table's settings or the drawn
season. Its planning horizon H (the seasons it expects the age still to run, which weighs land against gold, levies and
purchases) is about 41 seasons at turn 1, 31 at turn 15 and 18 at turn 44, against 20.7 falling to 6.7 from turn 15
before; in an open age it plans as far as at the start. "The end may be near" (when a faithless king stops betraying a
sworn partner) now starts when the believed chance reaches 1%, season 15, as before. Characters are told nothing of
the ending yet: their prompts never mentioned it, and "Omens of the end" builds what they see with the royal council
(item 16).

Feature against no feature, the same 40 seeds, one current king against six baselines (`--versus solo`):

| Script king | Growth alone | Wins alone |
|---|---|---|
| Reads the ending (built) | 8.26 | 94% |
| Ignores it (the old belief: 15 − turn + 6.7, then 6.7) | 7.82 | 89% |
| Reads it, planning capped at 20 seasons | 7.96 | 90% |

Reading the ending wins, most for Arzawa (100% of its seeds against 70%). The capped variant was tried because the war
score adds land's value (which grows with H) to fixed diplomatic terms, so a longer H weighs treaties less; it played
worse, so the uncapped belief stays. One visible effect: Babylonia now opens a war on Assyria in its first year on most
seeds (the siege-bot test's scenario moved from seed 4 to seed 1, where it keeps the peace and besieges Mari).

## Benchmarks

Before (develop, unchanged since the C# build was removed; `docs/rounds/2026-10-27-remove-csharp.md`) and after:

| Power | Growth alone | Growth as baseline | Wins alone | Wins as baseline |
|---|---|---|---|---|
| Egypt | 3.16 → 5.83 | 1.08 → 1.34 | 100% → 98% | 5% → 13% |
| Hatti | 3.65 → 9.05 | 0.92 → 1.06 | 98% → 95% | 8% → 8% |
| Babylonia | 3.53 → 8.18 | 1.05 → 1.28 | 100% → 98% | 3% → 15% |
| Mitanni | 2.80 → 9.33 | 1.22 → 1.16 | 95% → 90% | 18% → 10% |
| Assyria | 4.25 → 13.19 | 1.00 → 1.32 | 98% → 90% | 5% → 10% |
| Arzawa | 1.78 → 7.04 | 1.34 → 1.51 | 65% → 100% | 43% → 38% |
| Alashiya | 2.28 → 5.23 | 0.96 → 1.11 | 80% → 85% | 20% → 8% |
| All kings | 3.06 → 8.26 | 1.08 → 1.25 | 91% → 94% | 14% → 14% |

Growth rose mostly with game length (about twice as many seasons to grow in); the script kings' longer horizon is the
only change to their play.

50 script games, seeds 1-50, `--verify-replay`: 50 of 50 replay exactly. Game length: median 42 seasons (about 20
before), mean 47.3, range 5-94; 5 ended before season 15, 15 by 30, 28 by 44, 7 reached season 80 and 3 season 90
(the draw over 4,000 seeds gives 7%, 26%, 50% and about 3% for season 90). A capital fell in 44 of 50 games (30 before),
99 kingdoms in all (38), at most 4 in one game; the first fall at season 11 on the median (14.5); Assyria fell in 40
games, Hatti in 23, Mitanni in 14. Standing orders fired 100 times in 44 games (46 in 30).

## The feature audit

The fix pass after item 4 audited every feature then built, and item 5 audited its own; item 5+ added no game
features. The signals of the 50 games above, games with at least one / total: every feature the script players can use
was used, and succeeded somewhere: sealed tablets 50/1744, authentication 47/503, evidence shown 44/351, bribes 23/44,
defections 28/52, detentions 38/219, skims 40/198, debasement found 14/63, spies caught 20/38, double agents 5/6,
archives copied 40/588 and taken 44/106, inventories swapped 20/38, forgeries 4/4 (2 exposed), sieges begun 50/869 and
won 50/799, storms 33/64, walls strengthened 50/1846, sallies 46/310 (won 298), envoys out of a besieged capital 20/33
(29 caught, 14 stayed), terrain held 36/190 and beaten 12/18, desert supplies 7/10, coalitions 4/4. Three signals
read zero, as before this item: "messenger-blamed" and "reputation" are markers of what model kings write (script
letters never use those words), and shared victory is a house rule, off. No new gap was found, so nothing was patched.

## First guesses (not tuned; item 18 tunes them)

- The median, the cap's range and the curve's shape: the design's first guess (median 44, cap 80-100, chance in
  proportion to the season number).
- The setup's median years: 1342 to 1322 BCE.
- The script kings' belief: the default curve, an open age planned like the start of an age, "near" from 1%.

## Readings taken and review questions

1. **The cap is drawn before the rising chance, from the same stream.** Either order is the same game; this one means
   a table's cap range never changes when the rising chance would end the age.
2. **"Play on" is offered only when the age ended by its last season,** not when one kingdom is left ("When one power is
   left" ends any game). The chronicles stay those of the age.
3. **The open age's spending limit is the existing budget,** not a new setting: every model game already pauses at it.
   Should an open age with models refuse to start without one set by hand?
4. **Characters are not told the ending yet:** nothing they decide depends on it until lending (item 11a), and their
   view of it comes with the omens (item 16).
5. **Script kings believe the default curve,** whatever the table set: they read the rule as kings are told it, in
   words. Should a table's median reach them in words ("the age is likely to be long")?
6. **Longer games mean more conquest:** capitals fall in 44 of 50 games (30), Assyria in 40, and Babylonia opens a war on
   Assyria in its first year on most seeds. Balance is frozen; this is for item 18, which weighs game length.
7. **The cost estimate doubled** with the median game (44 seasons, not 20): the Budget preset is now "about $1".

## Review

<!-- the reviewer's findings -->
