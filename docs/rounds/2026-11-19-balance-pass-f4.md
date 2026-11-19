# Item 18, the balance pass: part F4, the bold road and Arzawa

The fourth part of part F (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 2), from
`main` at c5cda6b (save version 95, par of 767cab8): whether bold and careful characters reach the top of the
characters' ranking at comparable rates, with the bold road tuned until it pays, and why Arzawa so seldom stands first.
One of the two builds of model trial 2 (`docs/rounds/2026-11-12-model-trial-2.md`).

**The check for changes:** the docs connector refused this session's read of the live design document (a session on
another account), so the copy on `main` stands in, as `docs/intent/INDEX.md` allows; its diff since c5cda6b was read
again at 04:45 UTC on 19 November, before the pull request was made ready, and is empty (`main` had moved on by item
18b's first part, which took save version 96 and leaves a full script game as it was: seed 101 played on the merged
code ends in the same state but for the version and the new settings).

## What was found

### The bold road

**On the play as F3 left it the two roads already reach the top five alike.** Seeds 1-100, those who never reigned: the
bold 17,657 characters and 310 of the top five (1.76 in a hundred heads), the careful 9,830 and 190 (1.93): a careful
character reaches the top five 1.10 times as often a head as a bold one (a standard error of 0.10), where F2 measured
1.40 on the play before F3's patches. The top twenty is another matter: 1,032 against 968, the careful 1.68 times as
often a head.

**The gap is who comes late, not the road.** Of a game's 275 characters, 122 are there from the start; the rest come
through the doors or rise as chiefs, and three in four of those are bold (a crowd's chief is bold by how he rises,
`newHead`). Counted apart (the money report's new lines):

| Seeds 1-100, the baseline | Characters a game | Top five, in a hundred heads | Top twenty | The living gained a head |
|---|---|---|---|---|
| There from the start, bold | 60 | 3.32 | 10.0 | 48 |
| There from the start, careful | 62 | 2.45 | 12.4 | 53 |
| Came later, bold | 116 | 0.95 | 3.7 | 16 |
| Came later, careful | 36 | 1.05 | 5.4 | 19 |
| Leading a band at the end (bold and careful) | 42 | 0.31 | 1.0 | 5 |

Among those there from the start the bold are ahead at the very top and the careful in the top twenty, as "Bold or
careful, one goal" expects of a road of higher stakes; among those who come later the roads pay alike. So no number of
the danger premium or of lending was tuned (F3's second builder found that halving the bravest's premium made it
worse). What does not pay is **leading a band**: 42 chiefs a game stood at the end having gained 5 shekels each, 93 in a
hundred of them nothing, on the leg of the bold road that should pay most and end worst ("raids and piracy ... high
returns, and a real chance of ending with nothing, or dead").

**Why a chief gained nothing.** Men joined a band while it had a surplus over its men's cost, the chief's cut (20 to 50
in a hundred, by his greed) being taken of that surplus; so the band grew until the surplus was gone, and the cut with
it. At the end of the baseline's games the bands took 4.5 shekels a season and cost 4.7, and their chiefs held 5. Unpaid
bands split, and each split raised a new chief: 91 heads a game rose by a split and 28 by taking over a band, against 14
from a crowd, which is where most of the bold who "came later" came from.

**What changed** (`bandsSeason`, `turn/bands.ts`; the rule in `docs/design/23-roads-and-reputations.md`):

1. **Men join by the band's steady take less the chief's cut of it.** As many join as a fifth of what the lesser of
   this season's and last season's take, less the chief's cut and the cost of the men it has, could pay. A band stops
   growing where the rest of its take pays its men, the cut stays the chief's every season, and one haul on the roads
   draws nobody.
2. **A band grown past that frays.** From its second season, when the steady take less the chief's cut no longer covers
   its men, those it cannot cover go back to the loose, at most a fifth a season, though the chief could pay them from
   his purse. With the first change alone a band kept the size of its best seasons, since men stayed while its chief
   paid them, and a falling take was paid out of what he had gained: its bands still took 4.1 a season and cost 4.0.

No number of the bands changed (`BandData`); the two seasons of the steady take are a first guess, listed here. The
chief still pays his men from his own purse, and men still leave or turn on him unpaid, as before.

**What it gave**, seeds 1-100 (the baseline; the first change alone; both, on the par measured with them, in the run
that holds half of those who would take the road back, below) and seeds 101-200 (both, the par run):

| | Baseline, 1-100 | The first change, 1-100 | Both, 1-100 | Both, 101-200 |
|---|---|---|---|---|
| Characters who never reigned, a game | 275 | 220 | 204 | 207 |
| Heads risen by a split, a game | 91 | 45 | 29 | 32 |
| Bands at the end, a game (median men) | 42 (93) | 26 (82) | 19 (78) | 22 (77) |
| A chief's purse at the end | 5 | 15 | 21 | 21 |
| Leading a band at the end: the living gained a head | 5 | 15 | 21 | 22 |
| ... in the top five, the top twenty, in a hundred of them | 0.31, 1.0 | 1.03, 3.4 | 1.47, 4.3 | 1.86, 4.3 |
| Bold: top five, top twenty, in a hundred heads | 1.76, 5.84 | 2.32, 7.62 | 2.59, 8.49 | 2.59, 8.45 |
| Careful: the same | 1.93, 9.85 | 2.20, 11.38 | 2.25, 11.79 | 2.14, 11.47 |
| A careful character against a bold one, a head: top five | 1.10 | 0.95 | 0.87 | 0.83 |
| ... top twenty | 1.68 | 1.49 | 1.39 | 1.36 |
| There from the start: top five, bold and careful | 3.32, 2.45 | 3.38, 2.49 | 3.09, 2.58 | 3.12, 2.30 |
| The Great Kings' growth (Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya) | 1.12, 1.48, 1.17, 0.75, 0.49, 0.72, 0.93 | 1.14, 1.52, 1.21, 0.70, 0.41, 0.82, 0.93 | 1.15, 1.57, 1.20, 0.68, 0.42, 0.76, 0.94 | 1.15, 1.35, 1.27, 0.68, 0.38, 0.72, 0.94 |
| The people's purses, and the treasuries, at season 80 | 20,100 and 13,100 | 19,300 and 13,300 | 18,300 and 14,300 | 18,800 and 14,400 |

The roads now reach the top five at comparable rates with the bold a little ahead (a standard error of 0.08 on each
ratio), as a road of higher stakes should be at the very top, and the top twenty's gap has halved; among those there
from the start nothing moved. What is left of the top twenty's gap is the newcomers' fewer seasons. The realms are as
they were (the Great Kings' growth moves within what two sets of a hundred games differ by); within them about a
twentieth of the people's gold has moved to the treasuries, the smaller bands robbing less of the kings' stores, which
the kings sell to their own people, and both count alike in a realm's wealth. A chief's median band still takes two or three shekels a season, so most chiefs stay poor and the few in rich land gain
most of it: how much the roads yield, and how many bands a land holds, is F5's ("How many bands", against the sources).

**Taking the road, use against ignore** (`--band-life-half`, new: half the script persons, by their number and the
seed, never take to the hills; everyone whose own reckoning chose the road, long without work and near the end of his
purse, is counted). Seeds 1-100, both changes, the new par:

| Whose reckoning chose the road | Persons | Top five, in a hundred | Top twenty | The living gained a head | Dead |
|---|---|---|---|---|---|
| Took it | 594 | 2.9 (17) | 10.4 (62) | 37 | 9% |
| Never took it (held back) | 577 | 0.2 (1) | 4.5 (26) | 13 | 10% |

It pays, by more than chance: three times the gain and more than twice the places in the top twenty, at the same
deaths. The same measure on the baseline's play (the switch alone on 5280231) is running as this is written and is
added under "Finished" (PENDING-BEFORE).

### Arzawa

**Nothing marks Arzawa's position or play.** On seeds 1-100 of the baseline it falls as its par says (17 games in a
hundred, 18 in par), its median growth is par's (0.76 against 0.79), and its mean standing 0.91. It holds one province
at the end of 55 games of the hundred and none in 17; the 13 games it ends a tenth or more above its start are those
where it took and kept a neighbour or two (Lukka, Seha, Mira). Hatti holds its capital at the end of 12 games, Seha
of 4.

**First place is decided where par is thinnest.** The winner of a game stands at about 0.98 or better against his own
par, the top fiftieth, where a par of 100 games holds two results. Which positions land there in another hundred games
follows the draw of par's games. Three pars, the same seeds 1-100:

| First places in 100 games | Egypt | Hatti | Babylonia | Mitanni | Assyria | Arzawa | Alashiya | A character | Other states (most by one) |
|---|---|---|---|---|---|---|---|---|---|
| The baseline, on the par it began with (767cab8) | 1 | 1 | 3 | 0 | 8 | 0 | 0 | 12 | 75 (Arwad 8) |
| Both changes, on the par this part leaves | 1 | 10 | 3 | 2 | 4 | 4 | 0 | 5 | 71 |
| 200 games (seeds 1-200) halved at random into par and play, 300 times: the mean, and the 5th to 95th percentile | 3.5 (1-9) | 4.9 (0-10) | 3.8 (0-7) | 3.0 (0-7) | 4.4 (1-9) | 2.8 (0-6) | 2.5 (0-5) | 5.4 (2-10) | 1.7 each (0.2 to 2.9) |

The halvings give each position's own chance with the draw of par averaged out (each halving takes a hundred of the
games as par, each power's results and the best five characters' of each game, and scores the other hundred as the
scoreboard does; offline, from the games' final states). Arzawa stands first 2.8 times in a hundred, with Mitanni (3.0)
and Alashiya (2.5): the three smallest Great Kings, whom the weight of size helps least (Arzawa's realm is a ninth of
the largest, Egypt's and Babylonia's nine tenths). In any one par a Great King's firsts run from none to ten. So Arzawa's
two firsts in F2's 200 games, none on the last par and four on this one are the draw of a par, and **no number was
tuned for it**. The same draw now favours Hatti, whose par of seeds 101-200 came out low this time (a mean growth of
1.35 where it grows 1.5 on seeds 1-100): a quarter of its results on seeds 1-100 land in the top tenth of its par.
The batch report now says, under the wins, how often each Great King's results land in the upper quarter and the top
tenth of his own par, which is where a misfit shows before it shows in wins.

**What the halvings did show: the age's length.** Par takes a position's results at the end of ages of every length
together, and the realms move one way with time: on the baseline Egypt's mean rank against its par is 0.19 of 1 in ages
under 60 seasons and 0.61 in ages of 100 or more, Assyria's 0.74 and 0.22, Arzawa's 0.64 and 0.38. So a short age is won
by whoever has not yet fallen (Elam, which fell in every one of par's hundred games, stood first in an age of 8 seasons
having shrunk to 0.64 of its start), and the growing realms stand first only in long ones: in the baseline's 25 ages
under 60 seasons the Great Kings stood first 4 times, all Assyria's; Egypt and Babylonia only in ages of 100 seasons or
more. In the halvings Egypt stands first in none of the short third of ages and in 10 in a hundred of the long third;
with par taken among ages of like length (the same thirds) it is 5 in a hundred in each, and Hatti, Babylonia and
Assyria likewise 3 to 7 in every third. That is a change to "One scoreboard for every power" (par for a position's
start and for the age's length), and more games for par would narrow the draw; neither is a number, so both are filed
for the design session (#1028), not built.

## Benchmarks

PENDING-BENCH

## Readings taken

Unsure first.

- **Unsure: "comparable rates" is read at the top five, a head,** as F2 measured it, with the top twenty beside it. By
  that the roads were level before anything changed, and what was tuned is the leg of the bold road that paid nothing,
  not a ratio: after it the bold stand a little ahead in the top five (0.87 and 0.83, each within two standard errors
  of level) and behind in the top twenty (1.39). If the owner reads the test at the top twenty, the newcomers' fewer
  seasons are what is left, and that is how the ranking counts, not a number. Principle: "Both roads must be
  legitimate"; a ranking "favours the bold road's variance".
- **Unsure: the rule of when men join and go was changed, not a number tuned.** The chief's cut is an old number
  (`chiefCut`); taken of a surplus that the joining men ate, it was never paid. Reading "A chief's share is his own
  gold" and "a leader keeps only as many as he can pay and feed" as the rule meant, the cut is of the take and the band
  as large as the rest pays, rising and falling. Tuning the cut or the men's cost instead would have left the share at
  nothing. Principle: "Effects from causes, as deep as pays"; "No solutions, only trade-offs" (a greedier chief keeps
  more of a smaller band).
- **Unsure: the steady take is two seasons,** the lesser of this season's and the last's, a first guess: one season let
  a single haul on the roads draw men the band could not keep. Principle: "Numbers are first guesses until play tunes
  them".
- **The fraying rule was added on the first change's measure, and checked on eight games before par,** not on its own
  hundred: the first change's bands still cost what they took, the rule is the mirror of the first, and its hundred
  games are the par run and the road's run (the table's last two columns). Principle: "Match effort to the task"; a run
  is an hour.
- **Men leaving a band they are still paid in is the chief's keeping "only as many as he can pay and feed",** written as
  the band's rule for every chief, script or model, as joining and leaving unpaid already are: a chief chooses where
  his band works, when to give up the road and whom to kill, not its size. Principle: the game in one page ("the
  engine ... keeps the facts"); no choice was added that only scripts would use.
- **The bands' yield and number are F5's** ("banditry ... against the sources"): this part changes who keeps what a band
  takes, not how much the roads give. Bands at a game's end fell from 42 to about 20 as the splits of unpaid bands
  stopped; F5 measures them against "most bands from tens of men to a few hundred". Principle: the split of part F.
- **Nothing tuned for Arzawa, and the scoreboard left as it is:** its firsts follow the draw of par, and the two things
  that would even first places (par by the age's length; par from more games) change the design's "One scoreboard for
  every power" and the pass's seeds (par from 101-200, measured on 1-100), which are the design session's. Principle:
  "only numbers every realm shares are tuned"; a design decision goes to the design session.
- **Par from seeds 101-200 again, last,** as F3's rest left it: the characters' par had to follow the chiefs' gains (on
  the old par a character stood first in 17 games of a hundred), and the powers' par is measured with it on the same
  games. Its draw favours Hatti on seeds 1-100 (above); another hundred games would draw again, not better. Save
  version 97: `main` took 96 while this was built. Principle: "A version of the rules is counted by the save version".
- **Use against ignore for a person's choice is measured use for use,** by a switch that holds half the persons back and
  counts everyone whose reckoning chose the road, since the halves of the kings' switches do not fit a choice one person
  in fifty makes. Chiefs who rise from a crowd or a split choose nothing and are not in it. Principle: "One too rare to
  move whole games is judged per use".
- **The baseline was not played on seeds 101-200:** its play there is F3's rest's par run (767cab8, the same play),
  whose powers' results are par itself; the roads' "before" is seeds 1-100. Principle: read little, run little.
- **The live design document could not be asked** (above); the copy on `main` did not change. Principle:
  `docs/intent/INDEX.md`.
- **Model trial 2:** built from c5cda6b on the brief's word, not merged and not set to merge by its builder; the
  orchestrator measures both builds together.

## Left to the next part

1. **F5** as F3's report lists it (17+'s people, starting positions, banditry and far provinces against the sources,
   commanders' worth), with, for banditry: what the roads yield (a chief's median band takes two or three shekels a
   season), and the bands' number and size now that unpaid bands no longer split (about 20 a game at the end, a median
   of 78 men).
2. **F3's rest's list,** untouched here: its rows measured on the play before F3's patches, vassal play's loss, the
   coffer's wins.
3. **The scoreboard's par** (#1028), for the stop for review.

## How the runs are kept

All are `scripts/sim.sh` from a worktree of the named commit, one at a time (a run uses all four cores; 50 games take
about 25 minutes), with `--out` so that each game's final state is kept and can be counted again without playing it.
A run not in this table does not exist.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
| Baseline, seeds 1-50 | `--games 50 --seed 1 --out <dir>` | 5280231 (`main`'s play, with the per-way line) | 25 minutes. Median age 89 seasons. Bold 8,359 characters, 158 of the top five, 519 of the top twenty, 10% dead, the living gained 27 a head; careful 4,853, 92 and 481, 13% dead, gained 39. A careful character reaches the top five 1.00 times as often a head as a bold one, the top twenty 1.60 times. Wins: Egypt 0, Hatti 0, Babylonia 2, Mitanni 0, Assyria 3, Arzawa 0, Alashiya 0; a character 4; another state 41 |
| Baseline, seeds 51-100 | `--games 50 --seed 51 --out <dir>` | 5280231 | 24 minutes. Median age 87 seasons over the hundred. Bold 9,298 characters, 152 of the top five, 513 of the top twenty, 12% dead, gained 26 a head; careful 4,977, 98 and 487, 14% dead, gained 41. **Seeds 1-100:** bold 17,657 characters, 310 of the top five (1.76 in a hundred) and 1,032 of the top twenty (5.84); careful 9,830, 190 (1.93) and 968 (9.85): a careful character reaches the top five 1.10 times as often a head (a standard error of 0.10), the top twenty 1.68 times. First places: Egypt 1, Hatti 1, Babylonia 3, Mitanni 0, Assyria 8, Arzawa 0, Alashiya 0; a character 12; another state 75 (Arwad 8) |
| The chief's share, seeds 1-50 | `--games 50 --seed 1 --out <dir>` | 52104fd (men join by the steady take less the chief's cut) | 24 minutes. Bold 6,535 characters, 157 of the top five, 498 of the top twenty, 11% dead, gained 36 a head; careful 4,258, 93 and 502, 11% dead, gained 47. A Great King's realm fell in 27 of 50 games (30 in the baseline) |
| The chief's share, seeds 51-100 | `--games 50 --seed 51 --out <dir>` | 52104fd | 25 minutes. Bold 6,915 characters, 155 and 527, gained 36; careful 4,306, 95 and 473, gained 49. **Seeds 1-100:** bold 13,450, 312 of the top five (2.32) and 1,025 of the top twenty (7.62); careful 8,564, 188 (2.20) and 975 (11.38): the careful 0.95 times as often a head in the top five (a standard error of 0.09), 1.49 in the top twenty. First places on the old par, which the characters' gains have outgrown: a Great King 15, a character 17, another state 68 |
| The fraying rule, seeds 1-8 | `--games 8 --seed 1 --out <dir>` | 55e9a9e (with it) | 5 minutes, a check before par: bands at the end 25 a game (21 with the first change on these seeds, 47 in the baseline), chiefs gained 28 a head (26, 3), the Great Kings' growth within the eight games' noise |
| Par on the final play, seeds 101-150 | `--games 50 --seed 101 --par-out <file> --out <dir>` | 55e9a9e (both changes) | 35 minutes beside the tests. Median age 79 seasons. Growth (standing on 767cab8's par): Egypt 1.15 (0.93), Hatti 1.35 (0.89), Babylonia 1.23 (1.04), Mitanni 0.73 (1.04), Assyria 0.45 (1.02), Arzawa 0.65 (0.87), Alashiya 0.95 (1.05); wins 2, 1, 0, 0, 1, 0, 2. Bold 6,390 characters, 168 of the top five, 545 of the top twenty; careful 4,108, 82 and 455 |
| Par on the final play, seeds 151-200 | `--games 50 --seed 151 --par-out <file> --out <dir>` | 55e9a9e | 22 minutes. Median age 91. Egypt 1.15 (0.98), Hatti 1.35 (0.93), Babylonia 1.31 (1.17), Mitanni 0.62 (0.90), Assyria 0.31 (0.94), Arzawa 0.80 (1.03), Alashiya 0.93 (0.87); wins 0, 0, 1, 2, 2, 1, 1. Bold 6,177, 157 and 516; careful 4,068, 93 and 484. **Seeds 101-200:** bold 12,567, 325 of the top five (2.59) and 1,062 of the top twenty (8.45); careful 8,176, 175 (2.14) and 938 (11.47). Results in the upper quarter and the top tenth of 767cab8's par, its own seeds (25 and 10 are due): Egypt 22 and 7, Hatti 14 and 6, Babylonia 35 and 16, Mitanni 23 and 8, Assyria 27 and 8, Arzawa 26 and 5, Alashiya 23 and 5. The two halves merged (each power's results pooled and sorted, the characters' likewise) into `rules/par-results.ts`, 100 games: the par this part leaves, save version 97 (2aa0eab) |
| The road, use against ignore, seeds 1-50 | `--games 50 --seed 1 --band-life-half --out <dir>` | 2aa0eab (both changes, the new par, `main` merged) | 19 minutes. Took the road 294 persons, 11 of the top five, 30 of the top twenty, the living gained 41 a head, 10% dead; never took it 290, 0, 18, 15 a head, 8% dead. Bold 5,962 characters, 160 and 553; careful 4,086, 90 and 447. Wins: Egypt 1, Hatti 6, Babylonia 1, Mitanni 1, Assyria 1, Arzawa 2, Alashiya 0 |
| The road, use against ignore, seeds 51-100 | `--games 50 --seed 51 --band-life-half --out <dir>` | 2aa0eab | 21 minutes. Took the road 300, 6 and 32, 34 a head, 9% dead; never took it 287, 1 and 8, 10 a head, 12% dead. Bold 6,234, 156 and 483; careful 4,090, 94 and 517. Wins: Egypt 0, Hatti 4, Babylonia 2, Mitanni 1, Assyria 3, Arzawa 2, Alashiya 0. **Seeds 1-100:** in "What was found". Results in the upper quarter and the top tenth of the new par (25 and 10 are due): Egypt 25 and 8, Hatti 47 and 25, Babylonia 13 and 5, Mitanni 26 and 11, Assyria 25 and 14, Arzawa 21 and 12, Alashiya 27 and 12; the other states 23% and 9% of theirs |

### Still to do, in order

1. The benchmarks after (`--versus solo`, seeds 1-4, 2aa0eab), running.
2. The road's use against ignore on the baseline's play (the switch alone on 5280231), seeds 1-100, queued behind them.
