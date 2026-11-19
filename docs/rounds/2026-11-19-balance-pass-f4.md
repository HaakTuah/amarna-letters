# Item 18, the balance pass: part F4, the bold road and Arzawa

Part F4 of item 18 (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 2), from `main` at
c5cda6b (save version 95, par from 767cab8). Model trial 2's Opus builder (`docs/rounds/2026-11-12-model-trial-2.md`).

**The check for changes:** the live design document could not be read from this session (the docs connector refused
access), so the copy on `main` was read again by its diff since c5cda6b, at the start and before the pull request.

## What was found

**The bold road pays as the careful does.** The careful reached the top five of the characters' ranking 1.19 times as
often a head as the bold over seeds 1-200 on the play F4 started from (1.10 on seeds 1-100, 1.29 on 101-200; F2's 1.40
was on an older play), and 1.07 times over the 200 games of this part's play. The gap a head is the mix of how men
came into play, not the road:

| Seeds 101-200, the play F4 started from | Bold: heads, top five (a hundred heads) | Careful: heads, top five |
|---|---|---|
| Those who chose their road (the starting cast and arrivals) | 5,330, 148 (2.78) | 6,139, 169 (2.75) |
| Heads raised by circumstance (risen from loose men, a band, mutineers, refugees) | 11,188, 136 (1.22) | 3,794, 39 (1.03) |
| Raiders from beyond the map | 713, 0 | 21, 0 |
| Men who took to the hills by choice | 695, 7 (1.0) | 83, 1 (1.2) |

Two thirds of the bold are heads raised by circumstance or raiders, against two fifths of the careful: the engine draws
a mutineer's leader or a crowd's chief bold, by how he rose ("The circumstance picks the man", `newHead` in
`turn/bands.ts`), and 1,246 of the 2,957 bold in a 16-game look walked off from a band that could not pay its men. They
start with nothing and seldom rise, bold or careful alike. Within each way to a fortune the two roads pay about alike
too (Steady 3.5 / 3.1, Keeper 2.2 / 1.8, Seller 2.0 / 2.1, Climber 2.7 / 2.8 among those who chose), so no number is
tuned for the bold road. On this part's play, over seeds 1-200, those who chose: bold 378 of 12,053 (3.1), careful 303
of 12,447 (2.4), the bold ahead on seeds 1-100 (216 of 6,026 against 131 of 6,210) and level on 101-200 (2.7 / 2.8).
Reading par by length moves no character's place: the order by gain alone and the scoreboard's differ in 1 top-five
place of 1,000 over those 200 games, so the shift is the seeds and the kings' play, and neither road always wins. The top twenty leans careful (1.67 times over seeds 1-200; among those who chose, 9.5 against 12.3),
as the design has it: the careful road "is slower, but it compounds", and its steady fees give the higher middle.

**The age's random end, more than play, chose who stood first.** Par pooled the results of games of every length, and
a realm that usually grows stands low in a short age and high in a long one, one that usually falls the reverse: in the
shorter half of par's ages Egypt ranked 0.32 of the way up its par, in the longer half 0.67; Assyria 0.61 and 0.40
(table below). So in a short age the realms that usually fall, Assyria and the cities most fallen in par, stood first,
and in a long one the realms that usually grow. **Par is now read by the age's length** (`ParNear` in
`rules/scoring.ts`): a result is ranked among the 30 of par's 100 games nearest in length to its age, a character's
among their best five's. Par keeps each game's length and its results in game order (`ParSeasons`,
`rules/par-results.ts`), the script kings reckon rivals the same way by the season it is, and the rulebook's PAR says
so. Mean rank of each Great King in its par, ages shorter / longer than the median:

| Great King | Seeds 1-100, pooled | Seeds 1-100, by length | Seeds 101-200, pooled | Seeds 101-200, by length |
|---|---|---|---|---|
| Egypt | 0.29 / 0.66 | 0.42 / 0.52 | 0.32 / 0.67 | 0.45 / 0.53 |
| Hatti | 0.51 / 0.58 | 0.49 / 0.58 | 0.51 / 0.49 | 0.49 / 0.49 |
| Babylonia | 0.39 / 0.50 | 0.43 / 0.40 | 0.43 / 0.56 | 0.48 / 0.49 |
| Mitanni | 0.57 / 0.48 | 0.52 / 0.52 | 0.56 / 0.44 | 0.51 / 0.48 |
| Assyria | 0.69 / 0.40 | 0.65 / 0.48 | 0.61 / 0.40 | 0.54 / 0.48 |
| Arzawa | 0.52 / 0.41 | 0.44 / 0.50 | 0.58 / 0.42 | 0.51 / 0.50 |
| Alashiya | 0.48 / 0.39 | 0.51 / 0.42 | 0.49 / 0.51 | 0.51 / 0.50 |

First places on seeds 1-100, out of par's sample: the Great Kings 13 on the pooled par (Assyria 8, Babylonia 3, Egypt
1, Hatti 1, the other three none), 10 read by length (Assyria 3, Egypt 2, Mitanni 2, Alashiya 2, Hatti 1, Babylonia and
Arzawa none); a character 12 and 14; the other states 75 and 76. On seeds 101-200 the Great Kings stood first in 25
games read by length (Egypt 4, Hatti 2, Babylonia 5, Mitanni 5, Assyria 5, Arzawa 3, Alashiya 1) against 11 pooled. A
cross-check ranking each half of seeds 101-200 against a par from the other half put the strong three first in 3 of 49
shorter ages and 8 of 51 longer ones pooled, 5 and 8 by the nearest 30 games; the cities 42 and 32, then 35 and 31.

**Arzawa** has no handicap a shared number could mend. Its standing is at par over the 200 games (0.92 to 1.07 in each
half), it falls about as often as its par (18 to 19 in 100), and in its own par's games it reaches the top tenth of its
results as often as the other Great Kings (9 to 13 in 100, by the cross-check). On seeds 1-100 it reached that tenth in
4 of 100 games, on both pars (F3 found 4 of 84 there): its top tenth needs a growth of about 1.5, a conquest that came
in about 10 of par's games on seeds 101-200 and 4 on seeds 1-100, a gap within chance (a two-sided p of about 0.1 to 0.2).
Its 0 first places in those 100 games, against about 1.4 due a Great King, are about as likely (one in four). Over
seeds 1-200 on this part's play it stood first in 3 of 200.

**What changed:** par read by the age's length (above); the money report's top five by how men came into play
(`raisedByCircumstance` in `game/src/money-report.ts`) beside F3's by way to a fortune (taken from commit f2e973c); each
power's games in the top tenth of its par in the batch's powers' lines. **Save version 96.** No script's play changed
but the kings' reckoning of rivals by par, which now reads it by the season it is.

**Checked and not patched: a bold chief who pays his men from his own purse** until his band melts away (only a
careful chief gives up a dwindling band, `wayBack` in `turn/bands.ts`). A band's men cost 20 shekels a season a thousand
(`BandData.menCost`), so a chief loses little by it; his results are low because a band's take beside his own living is
small, not by a choice a script chief could make better.

## Readings taken

Unsure first.

- **Unsure: par is read by the age's length, 30 of its 100 games** (`ParNear`). Item 18 leaves "how par is computed" to
  be tuned here ("One scoreboard for every power", Victory), and the measure it names is that "every power has about the
  same chance of first place" and "every position has the same chance when played as the scripts play". A pooled par
  gave each position the same chance only on average over ages of every length; within an age the random end, which no
  king can see coming, chose between the realms that grow and those that fall. The number 30 is a first guess between
  a narrow window (a noisy rank) and a wide one (the bias back): 20, 30, 40 and 60 were tried in the cross-check, and
  30 took out most of the bias (the tables above). Kings are told of it under PAR in the rulebook, in words, with no
  number, as they are told of par itself; they know the season, so they lose nothing by it.
- **Unsure: the script kings reckon rivals by the season it is**, the age's length so far, since the end is unknown
  ("Random ending"): the reading nearest the engine's own function ("Neutrality is accidental": "the kings'
  victory-threat assessment must use the same function"). The other reading, the length a king believes the age will
  run to from its omens, would rank rivals against an end no court can know and is not taken. It changed their play a
  little, so par was measured again on that play (seeds 101-200, d40570b) before the evaluation on seeds 1-100.
- **Unsure: the bold road is kept as built.** The item asks the two roads to "reach the top of the ranking at comparable
  rates" and to be tuned "until both roads pay"; among those who chose their road the bold reach the top five as often
  as the careful or more (3.1 to 2.4 a hundred heads on this part's play, 2.78 to 2.75 on the play before), and
  the gap a head over all characters (1.07 to 1.19) is the mix of how men came into play, which is the engine drawing
  the heads by their circumstance, a rule of item 11's ("A head rises where men lack one"), not a road that pays less.
  Tuning the bold road until the per-head rate over everyone matched would have made the bold who chose richer than the
  careful who chose. The money report now gives both counts.
- **Unsure: Arzawa's few first places are read as chance and the sample of par**, on the measures above; the item tunes
  only numbers every realm shares, and none found a fault. Out of par's sample, on seeds 1-100, the Great Kings' games in
  the top tenth of their par spread wider than chance (Arzawa 4, Assyria 20, against about 10 each), so par from seeds
  101-200 does not carry over to other seeds power by power as well as it should: "Par from more games" below.
- **The live design document could not be read** from this session (the docs connector refused access), so the check
  for changes read the copy on `main` again by its diff since c5cda6b, at the start and before the pull request: no
  change.
- **Par's own games could not be replayed**: the par F3 left was measured on play that read the par before it (the
  script kings rank rivals by par), so seeds 101-200 replayed today give the same spread with other games (Egypt's mean
  1.175 against 1.167, Arzawa's 0.782 against 0.780). The baseline's 100 games stood in for par's own in the cross-check.
- **Each game's length is the season it ended**, the same in par (`GameSummary.turns`) and on the scoreboard (`S.turn`).
- **The diagnostics were scripts reading the saved final states** (`--out`), not kept: their counts are reproducible
  from the commands above, and the lines kept in the money report and the powers' lines give the same counts in every
  batch from now on.

## Left to the next part

- **F5,** as F3's split gives it: the people 17+ added, starting positions, banditry and far provinces against the
  sources, and commanders' worth.
- **Par from more games:** read 30 games at a time, par's tails are thin, and a power's top tenth rests on three of
  them; at the next par refresh, 200 games (seeds 101-300) would halve the noise that Arzawa's tail and Assyria's 20
  top-tenth games on seeds 1-100 show.
- From F3's rest, still open: vassal play behind, the coffer's wins, and the rows read on the play before F3's patches.

## How the runs are kept

Every run is written here, with its command, seeds, commit and result, as it finishes; each is 50 games, from a worktree
of the named commit, two at once at most.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
| Baseline, seeds 51-100 | `--games 50 --seed 51` | 1af19bc | 50 minutes beside another run. Bold 9,298 characters, 152 of the top five (1.63 a hundred heads), 513 of the top twenty, 12% dead, 9,352 jobs, the living gained 26 a head, earned 180 a head (fees 59%, loot 30%, dealing 8%); careful 4,977, 98 of the top five (1.97), 487 of the top twenty, 14% dead, 9,749 jobs, gained 41, earned 226 (fees 78%, loot 12%, dealing 8%). **The careful reach the top five 1.21 times as often a head, the top twenty 1.78 times.** By way, top five a hundred heads, bold / careful: Steady 2.9 / 2.0 (272 / 2,156 heads), Keeper 1.4 / 1.3 (4,173 / 916), Seller 2.7 / 2.6 (329 / 1,030), Climber 1.6 / 1.9 (4,415 / 858), Outlaw 2.8 / 0 (109 / 17). Great Kings' wins 1, 1, 1, 0, 5, 0, 0 (Egypt to Alashiya); standing 0.86, 0.98, 0.90, 1.14, 1.10, 0.95, 0.92 |
| Baseline, seeds 1-50 | `--games 50 --seed 1` | 1af19bc | 48 minutes beside another run (a first try was stopped by the session's time limit for background commands, and run again detached). Bold 8,359 characters, 158 of the top five (1.89 a hundred heads), 519 of the top twenty, 10% dead, gained 27 a head; careful 4,853, 92 of the top five (1.90), 481 of the top twenty, 13% dead, gained 39. By way, bold / careful: Steady 2.2 / 2.0, Keeper 1.9 / 2.0, Seller 1.5 / 1.8, Climber 1.9 / 1.5, Outlaw 3.4 / 3.4. **Seeds 1-100: bold 310 of the top five from 17,657 (1.76), careful 190 from 9,830 (1.93): 1.10 times, about one standard error; the top twenty 1.69 times.** Great Kings' wins 0, 0, 2, 0, 3, 0, 0; standing 0.91, 1.05, 0.89, 1.04, 1.07, 0.92, 0.91. **Seeds 1-100: the Great Kings first in 13 games (Egypt 1, Hatti 1, Babylonia 3, Mitanni 0, Assyria 8, Arzawa 0, Alashiya 0)**; a king first in 88, a character in 12 |
| Diagnostic, seeds 201-216, final states kept | `--games 16 --seed 201 --out <dir>` | 1af19bc | 21 minutes. Read by scripts not kept (each character's road, way, traits, how it came into play, earnings and place). Of 4,624 characters who never reigned, 2,546 are heads risen from loose men or bands, 74% of them bold by the lean of how they rose; 1,246 of the 2,957 bold walked off from a band that could not pay its men (a split). Top five a hundred heads, bold / careful: the starting cast and arrivals 2.46 / 3.02 (853 / 992 heads), risen heads 1.27 / 0.76 (1,887 / 659), raiders 0 / 0 (113 / 3). A risen head earns about what it spends (loot 78, fees 56, spent 126 a head) |
| Baseline, seeds 101-150, final states kept | `--games 50 --seed 101 --out <dir>` | 1af19bc | 55 minutes beside another run. Bold 9,140, 146 of the top five (1.60), 525 of the top twenty; careful 5,048, 104 (2.06), 475. Great Kings' wins 0, 1, 1, 0, 0, 0, 1; a character first in 8 |
| Baseline, seeds 151-200, final states kept | `--games 50 --seed 151 --out <dir>` | 1af19bc | 54 minutes beside another run. Bold 8,788, 145 of the top five (1.65), 512 of the top twenty; careful 4,991, 105 (2.10), 488. Great Kings' wins 1, 3, 0, 1, 1, 1, 1; a character first in 2. **Seeds 1-200: bold 601 of the top five from 35,585 (1.69 a hundred heads), careful 399 from 19,869 (2.01): 1.19 times; the top twenty 1.67 times** |
| The roads by how men came into play, seeds 101-200 | the final states of the two runs above, read by a script not kept | 1af19bc | Top five a hundred heads, bold / careful: **those who chose their road** (the starting cast and arrivals) 2.78 / 2.75 (148 of 5,330 / 169 of 6,139), top twenty 9.5 / 12.3; **heads raised by circumstance** (risen from loose men, a band, mutineers or refugees) 1.22 / 1.03 (11,188 / 3,794 heads), top twenty 4.4 / 5.3; raiders from beyond the map 0 of 713 / 0 of 21; men who took to the hills by choice 1.0 / 1.2 (695 / 83). Of the bold, 67% are heads raised by circumstance or raiders, of the careful 38%. By way among those who chose, bold / careful: Steady 3.5 / 3.1, Keeper 2.2 / 1.8, Seller 2.0 / 2.1, Climber 2.7 / 2.8 |
| Par read by length, a cross-check on seeds 101-200 | the same final states: each half's games ranked against the other half's par, pooled and by the nearest 20, 30, 40 or 60 games in length, a script not kept | 1af19bc | Mean rank in par, ages shorter / longer than the median (86 seasons), pooled: Egypt 0.31 / 0.68, Hatti 0.49 / 0.51, Babylonia 0.43 / 0.57, Mitanni 0.59 / 0.41, Assyria 0.62 / 0.38, Arzawa 0.56 / 0.44, Alashiya 0.53 / 0.47; by the nearest 30 of the half's 50: Egypt 0.40 / 0.60, Mitanni 0.56 / 0.47, Assyria 0.59 / 0.46, the rest within 0.03 of a half. First places, shorter / longer ages, pooled: Egypt, Hatti and Babylonia 3 / 8, the other Great Kings 3 / 4, the other states 42 / 32, characters 1 / 7; by the nearest 30: 5 / 8, 8 / 4, 35 / 31, 1 / 8. The Great Kings first in 18 of 100 pooled (Arzawa 2), 25 by the nearest 30 (Arzawa 2), 20 by the nearest 40. Games in the top tenth of their par, pooled: Egypt 10, Hatti 9, Babylonia 11, Mitanni 12, Assyria 10, Arzawa 9, Alashiya 10 |
| Par on par read by length, seeds 101-150 | `--games 50 --seed 101 --par-out <file> --out <dir>` | 9b4bd9b | 54 minutes beside another run. Great Kings' wins 2, 1, 3, 3, 3, 1, 0 (Egypt to Alashiya); games in the top tenth of par (the par of 9b4bd9b, from the play before) 7, 2, 6, 6, 6, 1, 4; a character first in 2. Bold 9,585, 144 of the top five; careful 5,196, 106. Heads raised by circumstance, bold 70 of 6,553 (1.1), careful 18 of 2,084 (0.9); the rest, bold 74 of 3,032 (2.4), careful 88 of 3,112 (2.8) |
| Par on par read by length, seeds 151-200 | `--games 50 --seed 151 --par-out <file> --out <dir>` | 9b4bd9b | 53 minutes beside another run. Great Kings' wins 2, 1, 2, 2, 2, 2, 1; top tenth 6, 7, 4, 5, 6, 3, 3; a character first in 4. Bold 8,655, 152 of the top five; careful 4,936, 98. Heads, bold 64 of 5,660 (1.1), careful 14 of 1,811 (0.8); the rest, bold 88 of 2,995 (2.9), careful 84 of 3,125 (2.7). **Seeds 101-200: the Great Kings first in 25 games (Egypt 4, Hatti 2, Babylonia 5, Mitanni 5, Assyria 5, Arzawa 3, Alashiya 1), 11 on the pooled par at 1af19bc; those who chose their road, bold 2.69 / careful 2.76 a hundred heads.** The two halves joined in game order into `rules/par-results.ts` (d40570b) |
| Par read by length, seeds 1-50, final states kept | `--games 50 --seed 1 --out <dir>` | d40570b | 53 minutes beside another run. Great Kings' wins 0, 1, 0, 2, 1, 0, 1; top tenth 4, 3, 1, 4, 10, 2, 5; standing 0.96, 1.07, 0.82, 1.03, 1.13, 0.94, 0.94; a character first in 5. Bold 8,243, 165 of the top five; careful 4,788, 85. Heads, bold 54 of 5,254 (1.0), careful 18 of 1,651 (1.1); the rest, bold 111 of 2,989 (3.7), careful 67 of 3,137 (2.1) |
| Par read by length, seeds 51-100, final states kept | `--games 50 --seed 51 --out <dir>` | d40570b | 53 minutes beside another run. Great Kings' wins 2, 0, 0, 0, 2, 0, 1; top tenth 4, 2, 4, 4, 10, 2, 6; standing 0.93, 1.07, 0.83, 1.05, 1.13, 0.94, 0.92; a character first in 9. Bold 8,974, 165 of the top five; careful 4,917, 85. Heads, bold 60 of 5,937 (1.0), careful 21 of 1,844 (1.1); the rest, bold 105 of 3,037 (3.5), careful 64 of 3,073 (2.1). **Seeds 1-100: the Great Kings first in 10 (Egypt 2, Hatti 1, Babylonia 0, Mitanni 2, Assyria 3, Arzawa 0, Alashiya 2), on the pooled par 13 (1, 1, 3, 0, 8, 0, 0); a character first in 14 (12); top tenth Egypt 8, Hatti 5, Babylonia 5, Mitanni 8, Assyria 20, Arzawa 4, Alashiya 11. Bold 330 of the top five from 17,217 (1.92), careful 170 from 9,705 (1.75)** |
| The length check, seeds 1-100 and 101-200 | the final states of the four runs above, a script not kept: each Great King's mean rank, pooled and by length as built, in ages shorter and longer than the median | d40570b | Seeds 1-100 (out of par's sample), shorter / longer: pooled Egypt 0.29 / 0.66, Hatti 0.51 / 0.58, Babylonia 0.39 / 0.50, Mitanni 0.57 / 0.48, Assyria 0.69 / 0.40, Arzawa 0.52 / 0.41, Alashiya 0.48 / 0.39; by length 0.42 / 0.52, 0.49 / 0.58, 0.43 / 0.40, 0.52 / 0.52, 0.65 / 0.48, 0.44 / 0.50, 0.51 / 0.42. Seeds 101-200: pooled Egypt 0.32 / 0.67, Assyria 0.61 / 0.40, Arzawa 0.58 / 0.42; by length every Great King within 0.45 to 0.54 |
