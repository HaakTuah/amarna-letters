# The answers to item 11b+ (29 October 2026)

Build order item 11b++, "The answers to item 11b+" (`docs/intent/build-order/item-11.md`), added by Haakon's PR #130:
his answers to item 11b+'s review (29 October 2026: "Agree to all"), each by "The game in one page", which gained
"Memory" and "Reports" for them. Branch `item/answers-to-11b-plus`, PR #137. Save version 26. What was built, rule by
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
   and gets it in its summary of older memories, to keep or drop when it condenses them.
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

How often script players used each new rule, and with what result (50 games, seeds 1-50, `after` run):

- **Stays at court**: 450 times in 47 games. A king with nobody else at hand and ample gold keeps a proven person four
  seasons; each errand then given is its own job.
- **The border walk**: 58 walks in 24 games; a script spy at a post just across the border walks at once (waiting
  seasons for a carrier slowed the script kings' news of their neighbours).
- **Robbers named**: 570 travellers named their robbers; people died of the world's dangers 499 times (350 before; every traveller is now a witness).
- **Reports sold**: never, in these games. A script servant notes news of the court its job sent it to, but sells it
  only standing at another court, and a spy rarely leaves its post with its job still running; the rule is checked by
  its test. Listed for item 18's audit with the other characters' gaps.
- **Hunting**: as before 11b++, by order only where it breaks a band or drives it out (2,194 hunts, 2,312 before); the standing hunt
  over the whole land was measured and lost (below). Script kings withhold the fee of, and dismiss, a servant known to
  have sold what belonged in its report or its master's secrets.
- **Letters**: carried by the writer's own people 545 times, by passing travellers 758, by carriers hired 831, by the
  spy itself 827.

The review found two blocking problems, both fixed: a spy walking to the border told his master at once that he had
left his post (he now keeps his master's belief), and a witness's word left from a capital instead of from where he was
robbed. Also fixed from it: talk of promises is kept without a cap, so nobody silently stops hearing older promises; a
stay's rest follows withholding, renewing and dismissal; a lifted hunt is feared until talk of the lifting arrives; old
talk is one note in memory. Left: a stay that resumes after an errand loses its standing offer of the same job again,
and a border walk turned back before the border loses its reports (rare).

## Benchmarks and script games

**Before** (`develop` after #135, seeds 1-50) and **after** (this branch, final code), `scripts/sim.sh --games 50 --seed 1
--verify-replay`: 50 of 50 replays exact after. A capital fell in 48 games both times (158 kingdoms before, 148 after);
the first fall of a game came in season 8 on the median both times. The Great Kings (the city-states and chiefs are in
the logs):

| Power | Wins before | Wins after | Growth before | Growth after |
|---|---|---|---|---|
| Egypt | 0 | 0 | 0.84 | 0.84 |
| Hatti | 4 | 5 | 0.83 | 0.87 |
| Babylonia | 2 | 0 | 1.02 | 0.99 |
| Mitanni | 5 | 6 | 0.89 | 0.86 |
| Assyria | 7 | 5 | 0.84 | 0.89 |
| Arzawa | 1 | 2 | 1.06 | 0.94 |
| Alashiya | 0 | 1 | 0.97 | 0.96 |

SOLO

Letters before: own people 530, passing travellers 580, hired 687, the spy itself 719; news sold 16 times (48 after).
The suite's growth guard (one script king among baseline seats, two seeds) moved out of the suite with the small test
world (#136); while it was in, it read 0.05-0.11 across every variant tried here, against 0.22 before, which the solo
benchmark (40 seeds) did not confirm (above): two seeds do not tell these changes apart.

## Readings taken

Each is settled by "The game in one page" or the item's own text (Haakon, 29 October 2026: "settled questions are
readings").

1. **Old talk is kept per party at its mean season**, not promise by promise, once a person holds more than it keeps one
   by one: the weighting by age is then reckoned from the mean season. ("Memory": never lost; a script character's own
   formula.) First guess: `talkHalf` 8 seasons, plus one per ten of loyalty, so a loyal man weighs an old betrayal longer.
2. **A model character keeps old talk in its own notes**: each fold renews a sentence of old talk in its summary of older
   memories, which its `SummarizeMemory` call is given back and keeps or drops; the counts it is shown are all it ever heard, unweighed. ("Memory": he chooses what to keep.)
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
13. **Script kings give no standing hunt**: the one over the whole land was measured and lost (below), and one naming
    provinces would steer bands into the rest. (Script players play as well as they can.)
15. **A script spy at a post just across the border walks its reports there at once**: the border is a short walk and
    its couriers sure; waiting seasons for a carrier slowed the script kings' news of their neighbours. (Script players
    play as well as they can; a model spy decides in its own request, which now offers the walk.)
14. **Script kings use a stay only to keep a proven person when nobody else is at hand**, for four seasons (a first
    guess of the bots), and only with spare gold: idle seasons are paid seasons.

## Design questions

None: every answer was settled by "The game in one page" and the item's own text (the readings above).

## Use against ignore

`--outlaw-play-half` (hunting bands and buying news of foes), seeds 1-50, on the final code: users 0.87 growth and 20
wins, ignorers 0.92 and 30. This is the first measure of the flag in the thirty-power world (item 11+ did not run it;
11b+'s 23 to 27 was in the seven-power world). Measured too: the standing hunt over the whole land, which chiefs hear of
and avoid (0.88 to 0.92, 19 to 31), so the script kings give none. Nearly every hunt they order already breaks the band
(1,195 hunts in 42 games), so the loss is the hunt's own cost (the army's men, the band's men killed out of the land's
people) against troops standing with a band already halving what it takes. Verdict: not paying; as 11b's row says,
re-measure with policing (item 15) and command (item 13), which give hunting its use.
