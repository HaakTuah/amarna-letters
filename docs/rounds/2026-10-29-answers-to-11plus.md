# The answers to item 11+ (29 October 2026)

Build order item 11d, "The answers to item 11+" (`docs/intent/build-order/item-11.md`), built as a lane beside 11b++ (#137)
and 11c (#143). Branch `item/answers-to-11plus`, PR #145. Save version 25. What was built, by file:
`docs/design/29-answers-to-11plus.md`. Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session).
Effort: medium, as set.

Haakon's words (29 October 2026, the item's own text): "Agree to all. Though a character based on the incentive
structure we have now should never say yes to point 6, as it is essentially game over."

## The check for changes

The copy was cut from Build order revision 88, World and history 35, Victory 9, Overview 567. Asked at the start: nothing
had changed in any of them. Asked again before the pull request: still nothing.

## The audit at the start

The 50 script games on `develop` before this item (seeds 1-50) used every feature built so far but the ones earlier
audits already list for later items (captives handed over, smuggling, winter crossings, gifts to persons, false envoys
paid, fees withheld, characters' own dealings, secrets caught, hiring abroad, reputation and pacts with consequences).
None is this item's; nothing to patch here. After it, sea landings went from a few to none (Arzawa lost its fleet at Seha
with the land), and one newcomer came through the doors where there were two.

## What was built

- **Walls from the sources**: each city-state's city as the walls dossier proposes (Qatna and Qadesh 3; Carchemish,
  Aleppo, Ugarit, Arwad, Byblos, Tyre, Shechem and Susa 2; the rest 1); the Kaska lands, Lukka and the Sutean steppe
  none. The Great Kings' capitals keep 3 until item 15.
- **Terqa (Hana), Mira and Seha** are city-states, vassals by sealed tablet of Mitanni and Arzawa, each with its own army,
  ruler and personality.
- **Par** is a power's mean growth over all games, a fall counted as 0, refreshed from this branch's 50 games.
- **The land** keeps its fixed weight in the score; the script kings' reckoning already discounts what it will still
  yield by the seasons they believe are left (tested).
- **A capital ceded whole**: by the king's own order, only where a sealed tablet between him and the receiver gives the
  city; the kingdom falls to the receiver by agreement, and the ruler lives on as a free character at his old city.
- **The rulebook** says all of it (THE MAP's walls, WALLS AND SIEGES, HOW YOU WIN with PAR and the cession), and the web
  app's About page.

## Script players

No script ruler cedes its capital, by Haakon's answer: a fallen power's growth is 0, so nothing in a seat's incentives
makes it pay (tested: Byblos with the tablet sealed gives no such order). Script kings refuse every demand for land, as
before. The three new city-states play by the same brain as every other, as vassals by `bots/vassals.ts`.

Weaknesses looked for: the early falls (below) are the walls Haakon chose, not a script's mistake: a city at walls 1
next to an army of a Great King falls to a storm in the first season, before any envoy or levy could answer. No script
weakness found that this item's changes expose; the scripts' land reckoning was already what the answer asks.

## Benchmarks and script games

**Before** (`develop` at #144) and **after** (this branch, with the refreshed par), seeds 1-50,
`scripts/sim.sh --games 50 --seed 1 --verify-replay`: 50 of 50 replays exact in both, 47.3 seasons on average in both.

| | Before | After |
|---|---|---|
| Kingdoms fallen | 158 (a capital fell in 48 games) | 525 (in all 50) |
| First fall of a game | season 8 on the median (range 2-13) | season 1 in every game |
| Falls, most often | Elam 41, Arrapha 29, Lukka 13, Suhu 13, Jerusalem 11 | Arrapha 50, Lukka 47, Kaska 45, Suteans 42, Terqa 40, Nuhashshe 34, Elam 34, Suhu 31, Damascus 27 |
| Wins, Great Kings / city-states | 19 / 31 | 2 / 48 |
| Growth: Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya | 0.84, 0.83, 1.02, 0.89, 0.84, 1.06, 0.97 | 0.87, 1.17, 0.95, 0.82, 1.28, 0.80, 0.97 |

What the walls do: with the chiefs' lands open and a dozen cities at walls 1, the Great Kings' armies take a
neighbouring city in the first season, and Hatti (Kaska, Isuwa) and Assyria (Arrapha, Terqa, Suhu) grow most. Arzawa,
with Apasa alone and two vassals that fall more often than they stand (Seha 20 falls, Mira 7), grows least. What par
over all games does: a city-state that falls in most games has a par near its survival rate (Lukka 0.10, Kaska 0.17,
Terqa 0.21), so in the few games it survives its standing is five to ten times anyone's, and the fragile city-states win
(Terqa, Damascus and the Suteans 6 each, Nuhashshe 5). Survival itself scores, as asked; the result is that the Great
Kings, whose par is their usual growth, almost never win. That is item 18's to balance (question 1).

The run with the item's walls and the old par (before the refresh) had the same falls (526) and gave the Great Kings 20
wins of 50; the par refresh moved the wins, not the play.

## The review

One reviewer (Opus, high effort) read the diff against the item and "The game in one page": the cession needs the
giver's own order and a sealed tablet, the engine never acts for him, word of the fall travels as for a conquest, the
former ruler's draws are seeded. **Blocking, fixed**: the rulebook's PAR line still said "in the games it survives".
**Fixed besides**: two capital cessions chained in one season depended on the order of reckoning (now a king who cedes
his own capital receives none that season); the tablet is checked again as the cession resolves; the receiver's notice
capitalises an unnamed ruler; a build artefact (`tsconfig.tsbuildinfo`) committed by mistake; a test for a tablet giving
another city; comments on two changed seeds; one phrasing of the city-states' walls. **Kept**: the receiver hears of a
ceded realm at once (reading 13).

## Readings taken

1. **Walls by the dossier's "Proposed" column, for the city-states only** (Starting positions come from the sources;
   build nothing outside the item): the Great Kings' capitals, Akhetaten's 0 among them, are item 15's, as the dossier
   says.
2. **Mira, Seha and Terqa at walls 1**: the dossier does not list them; it gives 1 to the other city-states' towns
   nobody has dug (Period first).
3. **All three have "their own rulers"**: the politics dossier gives Hana "local kings" and Mira and Seha "each its own
   ruler", though no names; their rulers are "the king of ..." (Starting positions come from the sources).
4. **The kings' troops in those lands are gone with them** (Mitanni's army at Terqa, Arzawa's army at Mira and fleet at
   Seha); each city-state has its own army by 11+'s rule (Numbers come from their causes). Arzawa keeps Apasa alone.
5. **Par from the run with this item's changes**, floor 0.1 kept (Arrapha fell in all 50 games).
6. **The land's discount is the scripts' horizon**: the score's weight stays fixed; the yield term already shrinks with
   the seasons a script believes are left, and item 16's omens will feed that belief (Incentives, not quotas).
7. **The agreement is a sealed tablet with a cede clause** naming the capital (the giver's "I give you" or the
   receiver's "Give me"), both seals, not forged or repudiated; the cession is still the giver's order (Words are words;
   Keeping a promise is an act).
8. **The realm passes as land ceded**, without new absorption, as any cession does (Different data, same rules).
9. **His troops disband as in any fall**; capital cessions resolve after gifts of troops, so he may give them first (No
   menus: ordinary orders).
10. **A king who cedes his capital receives none that season** (The order of resolution never decides).
11. **The former ruler** is free at his old city with an empty purse (Nothing appears without a cause), his name the
    sources' or his land's style, traits first guesses.
12. **Granting him his city back is a governorship**, item 13's ("No stopgaps").
13. **The receiver hears at once**, as of any land ceded today; how word of a cession travels comes with distance inside
    the realm (item 13) (Information moves in physical time: left as built).
14. **Old tests**: a helper (`formerHomes`) gives Hana, Mira and Seha back to their kings for tests written in that
    world, as `oldWorld` did for the free cities.

First guesses for item 18: the walls above, the former ruler's traits.

## Use against ignore

The one lever this item adds, ceding a capital, is never used by a script, by design; the rest is starting data. Row:
"n/a".

## Questions for Haakon

1. **The early falls and who wins.** With the walls from the dossier, a city falls in the first season of every game
   (525 kingdoms fall in 50 games, against 158), and with par over all games the fragile city-states that survive win
   48 of 50 games; the Great Kings win 2. Reading taken: both as you answered, left to item 18's balance pass.
   Alternative: before item 18, keep a floor of walls 2 for every city-state, or count par only over the games a power
   survives again, so the Great Kings can win. Leave it to item 18?
