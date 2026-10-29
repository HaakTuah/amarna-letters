# The answers to item 11b+ (29 October 2026)

Build order item 11b++, "The answers to item 11b+" (`docs/intent/build-order/item-11.md`), added by Haakon's PR #130:
his answers to item 11b+'s review (29 October 2026: "Agree to all"), each by "The game in one page", which gained
"Memory" and "Reports" for them. Branch `item/answers-to-11b-plus`, PR #137. Save version 25. What was built, rule by
rule, is in `docs/design/27-answers-to-11b-plus.md`. Effort: medium; no helpers but the one reviewer.

## The check for changes

The live design document's Build order tab had no change since the copy's revision 82 at the start of the item.
Asked again before the pull request: no change in the Build order (82) or Overview (567) tabs.

## The audit at the start

The 50 script games before this item (seeds 1-50 on `develop` after #135) used every feature built so far except the
three item 11+'s audit found and left to item 18's audit: no hire abroad (a court does not know where free people stand
at other courts), no character's dealing without a loan (script characters only lend), and no servant caught selling
its own court's secrets (script servants are rarely both greedy and disloyal). This item touches none of them.

## What was built

Fifteen answers; five of them were built already in item 11b+ and are only checked or shown here:

1. A starting servant's standing order to pay on completion: built in 11b+; now listed among the king's standing orders
   in the web app, with Cancel, and said in the rulebook.
2. A hire abroad known at home by the roads: built in 11b+.
3. An unpaid fee broken once the man has stood at the payer's court a season unpaid: built in 11b+; the rulebook's
   sentence ("by the end of the season after it fell due") corrected to say what is built.
4. A dead man's purse goes to whoever is with him: robbers who kill already took it; a captive who dies held now leaves
   it to his captor's treasury; otherwise the town where he died, as before.
5. No rule forgets talk of promises: the dozen-season forgetting and the 60-promise cap are gone; a person keeps old
   talk folded per party (`Character.payOld`), a script person weighs it by age (`talkWeight`), a model person sees it all
   and gets a note to keep or drop when its memory is condensed.
6. A traveller decides whether to carry a letter: a script traveller carries free for his own court's people and asks a
   fee of anyone else (on delivery only from a court he trusts that pays carriers by standing order).
7. A levy larger than a full unit: built in 11b+.
8. "Stay at my court until a deadline" is an errand (`stay`); an errand given during it is a job with its own fee, and
   the stay goes on after it.
9. A captor's ransom demand hires a carrier from his treasury when nobody is going (built in 11b+); the captive's line
   now shows the fee.
10. A spy's thresholds are script spies' only; model spies decide in their own request (side lane #128).
11. A standing hunt names provinces or the whole land.
12. A report is the servant's own words; selling what belonged in it is evidence of a broken job (`sold-report`).
13. A spy walks to the border himself, leaving his post and meeting the road's dangers.
14. Every traveller is a witness who names his robbers; chiefs hear of a standing hunt by talk.
15. A hunted chief chooses where to flee; a script chief avoids land under a standing hunt.

## Script players

SCRIPT_PLAYERS

## Benchmarks and script games

BENCHMARKS

## Readings taken

Each is settled by "The game in one page" or the item's own text (Haakon, 29 October 2026: "settled questions are
readings").

1. **Old talk is kept per party at its mean season**, not promise by promise, once a person holds more than it keeps one
   by one: the weighting by age is then reckoned from the mean season. ("Memory": never lost; a script character's own
   formula.) First guess: `talkHalf` 8 seasons, plus one per ten of loyalty, so a loyal man weighs an old betrayal longer.
2. **A model character keeps old talk in its own notes**: each fold writes a memory note, which its `SummarizeMemory`
   call keeps or drops; the counts it is shown are all it ever heard, unweighed. ("Memory": he chooses what to keep.)
3. **Courts' records stay as they are** (`payKnown`, unweighed). ("Memory": the tablets and a court's records.)
4. **A dead captive's purse goes to his captor's treasury**, and the tablets on him to that court's archive as before.
   ("whoever is with him".)
5. **"His own court's people" for a ransom demand are the captor's people**: they carry it free; a stranger's fee is
   paid now from the captor's treasury. (The captor is the sender; the payer has not agreed to pay anything.)
6. **A model traveller decides by the script formula** until a character's request asks it: no model games run until
   the build order is done, and none would test it. (No model games; no stopgap rule: the formula is the script
   traveller's own choice.)
7. **An errand given during a stay replaces the stay for its term, and the stay resumes after**, rather than a man
   holding two jobs at once: one man does one errand at a time ("A job is always an errand").
8. **Selling news counts as evidence only for the court the present job's errand named, seen during that job.** A spy
   on a province has no court's news to sell from his errand. (Reports: "what his errand asked for".)
9. **The master hears of a sale to another king as often as of secrets sold** (`NewsData.secretsCaught`, 30 in a
   hundred): "anyone the employer hears of" needs word to travel.
10. **A robbed traveller names his robbers to the land's king and his own master**, by the roads from the land's king's
    court (or his master's, in land without a king): the chief's hidden Habiru fact becomes known there. (Everything
    travels; a witness's word goes where he would tell it.)
11. **Talk of a standing hunt travels from its king's capital from the season it is given**; a hunt given anew
    starts its talk anew. (Everything travels.)
12. **A model chief's flight follows the land his request named to go to**, if no army stands there; his request now
    says so and shows the land he heard is hunted. (The chief chooses; no new request field.)
13. **Script kings give the standing hunt over the whole land, never naming provinces**: naming some would steer bands
    into the rest. (Script players play as well as they can.)
14. **Script kings use a stay only to keep a proven person when nobody else is at hand**, for four seasons (a first
    guess of the bots), and only with spare gold: idle seasons are paid seasons.

## Design questions

None: every answer was settled by "The game in one page" and the item's own text (the readings above).

## Use against ignore

USE_AGAINST_IGNORE
