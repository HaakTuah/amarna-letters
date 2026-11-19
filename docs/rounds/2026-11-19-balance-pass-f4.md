# Item 18, the balance pass: part F4, the bold road and Arzawa

The fourth part of part F (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 2), from
`main` at c5cda6b (save version 95, par of 767cab8): whether bold and careful characters reach the top of the
characters' ranking at comparable rates, with the bold road tuned until it pays, and why Arzawa so seldom stands first.
One of the two builds of model trial 2 (`docs/rounds/2026-11-12-model-trial-2.md`).

**The check for changes:** the docs connector refused this session's read of the live design document (a session on
another account), so the copy on `main` stands in, as `docs/intent/INDEX.md` allows; its diff since c5cda6b was read
again before the pull request was made ready (PENDING).

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
   his purse: without it a band kept the size of its best seasons and a falling take was paid out of what its chief had
   gained (with the first change alone the bands still took 4.1 a season and cost 4.0).

No number of the bands changed (`BandData`); the two seasons of the steady take are a first guess, listed here. The
chief still pays his men from his own purse, and men still leave or turn on him unpaid, as before.

**What it gave**, seeds 1-100, the same seeds as the baseline (the first change alone; the second was added after it
and is in the runs below):

| | Baseline | The chief's share of the take |
|---|---|---|
| Characters who never reigned, a game | 275 | 220 |
| Heads risen by a split, a game | 91 | 45 |
| Bands at the end, a game (median men) | 42 (93) | 26 (82) |
| Leading a band at the end: gained a head | 5 | 15 |
| ... of them in the top five, the top twenty, in a hundred | 0.31, 1.0 | 1.03, 3.4 |
| Bold: top five, top twenty, in a hundred heads | 1.76, 5.84 | 2.32, 7.62 |
| Careful: the same | 1.93, 9.85 | 2.20, 11.38 |
| A careful character against a bold one, a head: top five | 1.10 | 0.95 |
| ... top twenty | 1.68 | 1.49 |
| The Great Kings' growth (Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya) | 1.12, 1.48, 1.17, 0.75, 0.49, 0.72, 0.93 | 1.14, 1.52, 1.21, 0.70, 0.41, 0.82, 0.93 |
| The people's purses at season 80 (all markets) | 20,100 | 19,300 |

The roads are level at the top five and nearer in the top twenty; the realms and the people's purses are as they were,
so the powers' par moves only by its sample. What is left of the top twenty's gap is the newcomers' fewer seasons. A
chief's median band still takes two or three shekels a season, so most chiefs stay poor and the few in rich land gain
most of it: how much the roads yield, and how many bands a land holds, is F5's ("How many bands", against the sources).

PENDING: the final play on seeds 101-200 (the par run) and the road's use against ignore.

### Arzawa

**Nothing marks Arzawa's position or play.** On seeds 1-100 it falls as its par says (17 games in a hundred, 18 in par),
its median growth is par's (0.76 against 0.79), and its mean standing 0.91. It holds one province at the end of 55
games of the hundred and none in 17; the 13 games it ends a tenth or more above its start are those where it took and
kept a neighbour or two (Lukka, Seha, Mira). Hatti holds its capital at the end of 12 games, Seha of 4.

**First place is decided where par is thinnest.** The winner of a game stands at about 0.98 or better against his own
par, the top fiftieth, where a par of 100 games holds two results. Which positions land there in another hundred games
follows the draw of par's games: on seeds 1-100 Assyria and Arwad stand first 8 times each, Egypt once, Arzawa and
Alashiya never, and of the 40 other states 11 never. The same baseline games halved at random into par and play, 200
times, give each position's own chance with the draw averaged out, firsts in a hundred games:

| Egypt | Hatti | Babylonia | Mitanni | Assyria | Arzawa | Alashiya | A character | Each other state |
|---|---|---|---|---|---|---|---|---|
| 3.2 | 3.6 | 4.6 | 2.8 | 3.6 | 2.8 | 0.8 | 8.2 | 1.8 (0 to 3.4) |

PENDING: the same on 200 games (seeds 1-200) halved into pars of 100.

Arzawa stands first as often as Mitanni and nearly as often as Egypt; in any one halving a Great King's firsts run from
none to ten. So its two firsts in F2's 200 games, and none here, are the draw of one par, and **no number was tuned for
it**. The batch report now says, under the wins, how often each Great King's results land in the upper quarter and the
top tenth of his own par, which is where a misfit shows first.

**What the halvings did show: the age's length.** Par takes a position's results at the end of ages of every length
together, and the realms move one way with time: Egypt's mean rank against its par is 0.19 of 1 in ages under 60
seasons and 0.61 in ages of 100 or more, Assyria's 0.74 and 0.22, Arzawa's 0.64 and 0.38. So a short age is won by
whoever has not yet fallen (Elam, which fell in every one of par's hundred games, stood first in an age of 8 seasons
having shrunk to 0.64 of its start), and the growing realms stand first only in long ones: in the baseline's 25 ages
under 60 seasons the Great Kings stood first 4 times, all Assyria's; Egypt and Babylonia only in ages of 100 seasons or
more. With par taken among ages of like length (thirds, in the same halvings) Egypt, Hatti and Babylonia each stand
first about as often in short, middle and long ages (4 to 6 in a hundred) and the Great Kings together 26 times in a
hundred for 21. That is a change to "One scoreboard for every power" (par for a position's start and for the age's
length), not a number: it is filed for the design session (PENDING: the issue), not built.

## Benchmarks

PENDING.

## Readings taken

PENDING.

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

### Still to do, in order

1. Par on the final play (55e9a9e), seeds 101-200, running; merged into `rules/par-results.ts`, save version 96.
2. The road's use against ignore (`--band-life-half`), seeds 1-100, on that par.
3. The benchmarks after (`--versus solo`, seeds 1-4).
