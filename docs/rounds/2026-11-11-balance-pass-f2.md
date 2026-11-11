# Item 18, part F2: the audit, on the tuned play

The second half of part F of the balance pass (`docs/rounds/2026-11-07-balance-pass.md`, "Split, and where to pick up
(F2)"), from `main` at 1bddefe (#850, a captive king's realm under a caretaker, merged so that this part can measure
it). Written in a report of its own, since the pass's report is at the size where a file is split before it grows.

**The check for changes:** the live design document answered this time. Build order: no change since revision 373.
Victory, "One scoreboard for every person" (revision 28, newer than the copy's 24): the weight of size is set by
testing here, against one test (the seven Great Kings with roughly an equal shot at the least, ideally every state,
and a character now and then; #825), and whether holding a king forever pays is measured here, its levers the escape
odds and what holding him costs (#806).

In progress: the last measurements run in the background; this report fills as they come.

## The baseline (`main` at 1bddefe, seeds 1-100)

`scripts/sim.sh --games 100 --seed 1` (60 minutes): 85.2 seasons on average; a king first in 62 games, a character in
38 (26 in part F1's baseline, before #850). The Great Kings win 19 (Assyria 13, Egypt 2, Hatti 2, Mitanni 1, Arzawa 1,
Babylonia and Alashiya none), a city-state 43, a weak power 1. Standings against par: Egypt 0.80, Hatti 0.78, Babylonia
0.85, Mitanni 1.05, Assyria 1.13, Arzawa 0.92, Alashiya 1.02. Captive kings: 799 held while their courts knew it, 9.9
seasons on average (median 6, longest 104); at the age's end 541 free again, 169 dead, 89 still held; 467 got away, 49
helped by a spy; 308 of 7,942 seasons held under the captor's watchmen.

## The watch as a season begins (#878)

A king's watchmen were cleared as each season began, before the road, the border and a held king's escape read them,
so they never found a traveller sneaking through his land or a smuggler at his border, and #850 had kept a copy of the
season's watch for the escape alone. The watch is now set anew with the season's orders (`resolveIntelligence`), and
every check as a season begins reads the season just past's; the copy is gone. The rulebook (the road, smuggling, the
captive king) and the design notes ([17](../design/17-the-economy-abroad.md), [59](../design/59-a-captive-kings-realm.md))
say "the season before". Save version 94.

## Bold and careful: the kings out of the count

The batch's bold and careful lines took every person on the scoreboard without a realm as a character, dead kings
among them, so the kings who died in battle and in falling cities were counted as careful characters' deaths (1,870
of the 2,720 who reigned in these games were careful by their traits). Counted again on the baseline's 100 games without anyone who reigned: the
bold 12.6% dead (the road 7.2%, plague 3.8%, hunger 1.4%), the careful 13.8% (the road 7.8%, plague 4.0%, hunger 1.7%),
against 14% and 18% as the line read. Most of "the careful dying more often" (parts D and F1) was the kings; what is
left is the road, where the careful, who take more of the jobs, travel more. The lines now count only those who never
reigned.

## Par refreshed, and the weight of size (#825)

**Par** measured again on the play as it now stands (`scripts/sim.sh --games 100 --seed 101 --par-out`, 100 games
where part B took 50, with #878 in play): `rules/par-results.ts`. On the old par that run gave Assyria 16 of the Great
Kings' 23 wins. On seeds 1-100 (`--games 100 --seed 1`, out of the par's sample) the Great Kings' standings came to
Egypt 1.01, Hatti 1.02, Babylonia 0.80, Mitanni 1.09, Assyria 1.15, Arzawa 0.88, Alashiya 1.10, and their first places
to Egypt 5, Hatti 6, Babylonia 6, Mitanni 3, Assyria 3, Arzawa 0, Alashiya 3 (19 before, 13 of them Assyria's).
Mitanni stands above par now, not below.

**The weight of size, by #825's test** ("the seven Great Kings have roughly an equal shot at the least, and ideally
every state ...; and a character wins now and then"). No script reads the weight, so each board of the same 100 games
(seeds 1-100, the new par) is scored again at other weights (`sizeWeight`), first with characters ranked against every
character's results, as built:

| Weight | Characters first | Great Kings (Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya) | Other states |
|---|---|---|---|
| 0 | 51 | 2, 4, 0, 1, 0, 0, 4 | 38 |
| 2 | 44 | 2, 6, 1, 1, 1, 0, 4 | 41 |
| 5 | 36 | 5, 6, 6, 3, 3, 0, 3 | 38 |
| 10 | 25 | 10, 6, 8, 3, 5, 1, 3 | 39 |
| 15 | 12 | 12, 8, 15, 3, 8, 1, 3 | 38 |
| 20 | 8 | 17, 9, 16, 3, 7, 1, 3 | 36 |
| 30 | 0 | 24, 14, 21, 5, 11, 2, 1 | 22 |

No weight meets the whole test: the Great Kings stay about level only up to about 5 to 8 (at 5, a spread chance alone
would give), where characters stand first in a third of the games or more, and characters fall to "now and then" only at 15
and above, where Egypt and Babylonia take most of the Great Kings' wins. The cause is the characters' par: a realm is
ranked against one result a game, while each of some 300 characters was ranked against every character's results, so
each had about a realm's chance of topping his par, and together a crowd's. Ranked instead against what the best k
characters of each par game gained (the same 100 games, the weight 5): the best 1, characters first in 1 game; the
best 3, in 4; **the best 5, in 9** (the Great Kings 5, 7, 6, 3, 4, 0, 3; the other states 63); the best 10, in 18.

Built: a character's par is what the best five characters who never reigned gained in each par game
(`CharacterParBest`, written by `--par-out`), and **the weight stays 5**. Scored so, at each weight:

| Weight | Characters first | Great Kings | Other states |
|---|---|---|---|
| 0 | 14 | 3, 3, 1, 1, 1, 0, 4 | 73 |
| 2 | 11 | 3, 6, 1, 1, 1, 0, 4 | 73 |
| 5 | 9 | 5, 7, 6, 3, 4, 0, 3 | 63 |
| 8 | 6 | 10, 7, 8, 3, 6, 1, 3 | 56 |
| 10 | 6 | 10, 8, 9, 3, 7, 1, 3 | 53 |

At 5 the Great Kings stand first in 28 games, about 4 each (Arzawa none, within what 100 games can tell apart), the
other states in 63 (about 1.6 each), and a character in 9. **Why a Great King stood first more often than a city-state
at a weight of 0** (part B) holds no longer: at 0 the Great Kings stand first 13 times, about 1.9 each, the other
states 73, about 1.8 each. Only the end's scoreboard reads a character's par, so no seed's play moves by it.

## Holding a king forever (#806)

The batch's "Held long" line, new here, gives for kings held 12 seasons or more, or still held at the end, where
their realms and their last captors stood against par at the end, beside kings held less long and free again
(captors are war's winners, so their standing alone says little) and every realm.

- **Before** (`main` with the measure, `--king-play-half`, seeds 1-100 in two halves of 50): kings that play captivity
  grow 0.83 against 0.82 and win 19 games to 22 on seeds 1-50 (as #850 measured), 0.80 against 0.79 and 20 to 15 on
  seeds 51-100: 39 to 37 over the hundred, even. Held long: 139 kings; their realms at 1.03 to 1.06, every realm at
  1.02 to 1.05; their captors at 1.18 to 1.21.
- **After** (this branch, the new par, every king playing captivity, seeds 1-100): 784 kings held, 10.4 seasons on
  average (median 6, longest 104); at the end 529 free again, 168 dead, 87 still held. Held long, 272 kings: their
  realms at 1.02 and their captors at 1.16; held less long and free again, 385 kings: their realms at 0.88 and their
  captors at 1.15; every realm at 1.00.

So holding a king long gains his captor nothing that taking him did not (1.16 against 1.15), and his realm under its
caretaker ends at par, above the realms of kings held briefly. **The levers stay as they are:** the escape odds (1 in a
thousand a season for each point of his skill at going unseen) and the guard (100 shekels of watchmen halve them).
Nothing in the measure asks them to move: holding a king forever is allowed and neither pays nor ruins.
