# Item 18, the balance pass: part F3

The third part of part F (`docs/rounds/2026-11-11-balance-pass-f2.md`, "Split, and where to pick up (F3)"), from
`main` at 8c2baff (#895, save version 94): every feature's use against ignore on seeds 1-100, in halves of 50, and a
patch for each that does not pay. **Not finished:** the owner asked on 12 November to wrap up ("I think we need to wrap
up as soon as it is at a point where it can wrap up what it has, and push it all"; before it, "Don't start any new
tasks after this, but let all already started, fully finish, expertly"), so five features' runs, the war of choice's
run on the patched play, the par refresh and the benchmarks are not done; each is listed below as not done, not claimed.

**The check for changes:** the live design document answered, at the start and again before the pull request: no
change since the copy's revisions (Build order 377; Land, people and economy 35; Victory and the ending 28). The copy
was refreshed on `main` while this part ran (revision 373 to 377); item 18's text did not change.

## How the halves are read: the null split and standing

Each `--*-play-half` switch splits the 47 powers by index, alternating with the seed's parity, and turns the feature off
for one half (the "baseline") while the other plays it (the "current"). Two things are new here, both in the batch
runner only:

- **Standing beside growth** (`versusReport` in `game/src/batch.ts`): each side's mean standing against par, the
  scoreboard's own measure, since a city-state's growth and a Great King's do not weigh alike.
- **The null split** (`--null-half`): the same halves with nothing switched off, to show how far the halves differ by
  seat alone. On seeds 1-100: growth 0.805 / 0.805, standing 1.0245 / 1.018, wins 38 / 51. The baseline side wins
  thirteen more of the hundred with nothing switched off (the powers of each parity win more on seeds of one parity), so
  wins are read against that; per-power gaps of 0.2 to 0.3 between the sides are noise (Mitanni 0.75 / 0.49 in the null
  run's first half). A feature is judged by growth and standing against the null's.

The sea play and the inventories get half switches of their own here (`--sea-play-half`, `--inventory-play-half`;
`SeaPlay` and `InventoryPlay` take the `only` set the other switches do). Fifty games take about 21 minutes alone; two
runs at once are what a session's machine holds (each grows to about 4.5 GB; a third was killed twice for memory).

## The economy at home: sell all the spare grain (9+a)

Kings that play the economy (depots, caravans, feeding, purchases, trade abroad) against kings that keep two seasons of
food and sell the rest (`--plain-economy-half`), seeds 1-100: **0.80 growth to 0.865, standing 1.02 to 1.066, 40 wins
to 53**, the clearest loss of any feature. Most of it was one choice: the playing king sold only while the market paid
nine tenths of the base price (six tenths, then a third, as the treasury ran low), and kept the rest in the stores to
spoil. A sale moves grain from the king's stores to his own people's market and gold from their purse to his treasury,
both counted in his strength, so no price lowers the score; and the treasury's gold pays for troops, works and errands,
where grain in the stores pays for nothing. With the floor at nothing (trial D, everything else of the economy kept):
**0.865 to 0.765, standing 1.082 to 1.012, 57 wins to 37.** The script kings now sell all their spare grain at whatever
the market pays (`grainOrders`, `game/src/bots/grain.ts`); the treasury note
([13](../design/07-script-kings/13-treasury.md)), which still gave the floors of an older build, says so.

## Vassalage (11+)

Script players that pay tribute, demand it and offer vassalage against those that do not (`--vassal-play-half`), seeds
1-100: **0.77 growth to 0.79, 38 wins to 57** (standing, from trial B below, which plays the same but for a few games:
0.981 to 1.013), the Great Kings losing most (0.92 to 1.01; the rest even).
Tried, each on the same seeds:

| Trial | Users / ignorers (growth, standing) | |
|---|---|---|
| A: an overlord weighs keeping each paying vassal by its tribute's stream, not a fixed 600 | 0.76 / 0.79 (37 wins to 59) | no help |
| B: no third king weighs an overlord's troops before falling on his vassal | 0.76 / 0.78, 0.981 / 1.013 (seeds 1-50 the same games as without it) | no help |
| C: no offers of vassalage either way | 0.79 / 0.785, 1.009 / 1.011 | about even |
| **E: a vassal who pays is weighed for war as any king is** | **0.765 / 0.745, 1.005 / 0.985** | **ahead** |
| G (on E and the grain patch): no offers by the strong | 0.75 / 0.73, 1.023 / 1.014 on seeds 1-50 (the patch there: 1.053 / 1.020) | no better; stopped |

An overlord held a vassal who paid a friend never to be attacked, worth more paying than conquered; but the tribute a
script overlord asks is half a season's yield a year, and the vassal's land yields the whole of it every season. The
overlord now weighs that war as any other, with a sealed tablet's price where one binds them (`bondWar`,
`vassalSeason`; `game/src/bots/vassals.ts`); one in arrears is still the more welcome a war. On the branch with both
patches: **0.75 to 0.765, standing 1.031 to 1.026, 42 wins to 55**: even against the null split, where it lost. The
Great Kings still come out a little behind by it (0.96 to 1.015); the rest ahead. The vassal's own sum still reckons
that an overlord who is paid spares it (`tributeReturn`), now a hope rather than a rule of the script overlords: the
notes ([26](../design/26-city-states-as-powers.md), [05](../design/07-script-kings/05-choosing-a-war.md)) say so.

## Use against ignore, every feature

Seeds 1-100, users / ignorers; the null split's own gap is standing +0.006 and wins 38 / 51, so a side that wins about
thirteen fewer is level. "Old" is the play on `main` (before either patch; the first five without the standing line),
"patched" the play with both.

| Feature (switch) | Play | Growth | Standing | Wins | Verdict |
|---|---|---|---|---|---|
| 10+a land play (`--land-play-half`) | patched | 0.855 / 0.715 | 1.070 / 0.962 | 55 / 40 | pays, the most of any |
| 9+a the economy (`--plain-economy-half`; ignorers play it plainly) | old | 0.80 / 0.865 | 1.020 / 1.067 | 40 / 53 | lost: patched (above) |
| the same, trial D (the patch) | patched grain | 0.865 / 0.765 | 1.082 / 1.012 | 57 / 37 | pays |
| 9 authority (`--authority-play-half`) | patched | 0.78 / 0.735 | 1.036 / 1.011 | 47 / 45 | pays |
| 17+ holding back pay (`--upkeep-play-half`) | patched | 0.78 / 0.76 | 1.051 / 1.032 | 43 / 52 | a little ahead |
| 12 languages (`--language-play-half`) | patched | 0.765 / 0.75 | 1.031 / 1.014 | 42 / 50 | a little ahead |
| 17++ D talk of a province's leaning (`--talk-play-half`) | old | 0.835 / 0.805 | 1.041 / 1.024 | 37 / 52 | a little ahead |
| 9 winter strokes (`--winter-play-half`) | old | 0.82 / 0.80 | 1.032 / 1.016 | 37 / 50 | a little ahead |
| 17 buying food and stirring (`--freedom-play-half`) | old | 0.805 / 0.79 | | 42 / 53 | a little ahead in growth |
| 11e walls (`--wall-play-half`) | patched | 0.77 / 0.785 | 1.047 / 1.036 | 48 / 46 | even; ahead in wins |
| raiders from beyond the map (`--raider-play-half`) | patched | 0.775 / 0.79 | 1.050 / 1.040 | 41 / 54 | even |
| 11+ vassalage (`--vassal-play-half`) | patched | 0.75 / 0.765 | 1.031 / 1.026 | 42 / 55 | even (lost before: above) |
| 10 judging people (`--people-play-half`) | old | 0.815 / 0.805 | 1.035 / 1.034 | 41 / 53 | even |
| 18 E gifts by their return (`--gift-play-half`) | old | 0.815 / 0.82 | 1.029 / 1.028 | 42 / 47 | even |
| 11b hunting bands, buying news (`--outlaw-play-half`) | old | 0.805 / 0.80 | | 47 / 45 | even |
| 11b+ borrowing and repaying (`--money-play-half`) | old | 0.80 / 0.795 | | 41 / 52 | even |
| 11f caravans through foreign land (`--caravan-play-half`) | old | 0.81 / 0.815 | | 46 / 44 | even |
| 17++a the war of choice (`--war-play-half`) | old | 0.81 / 0.835 | 1.038 / 1.065 | 41 / 45 | mixed: behind in standing, ahead in wins |

**Not done** (the wrap-up stopped them; each two halves of 50, in this order): the tidings (`--tidings-play-half`), the
ride (`--ride-play-half`), the coffer (`--coffer-play-half`), 7a sea play (`--sea-play-half`), 8 inventories
(`--inventory-play-half`), and the war of choice again on the patched play, since the vassal patch changed which bonds
bar a war (`keptBond`). Nor were 17++ A the ledger's script play and 17++ D a carrier caught measured again.

Since both patches change every script king's play, the old rows above were read on the play before them: a feature
that was even then may move on the patched play, and the patched rows' standings run above 1 because par is the old
play's (below).

## Benchmarks and par: not done

The par (`rules/par-results.ts`) is measured on the old play; both patches raise every script king's growth (the patched
rows' mean standing, both sides, is about 1.03, the null split's 1.02), so standings read high
until par is measured again (`scripts/sim.sh --games 100 --seed 101 --par-out`, as F2 did). The benchmarks
(`--versus solo`, seeds 1-4, before and after) were not run either. Both are first in where to pick up. No save
version: no rule changed (the patches are the script kings' choices and the batch runner's report), and no test's
recorded game moved (`scripts/test.sh`: 1,830 passed; the one failure, `model-layer.test.ts`'s browser header test,
fails in this cloud container with and without the patches, untouched here, and passes in CI).

## Readings taken

- **Wrapping up on what is measured** (the owner, 12 November, above): what ran is reported and what did not is listed
  as not done; the par refresh and the benchmarks wait for the next part. Principle: the owner's word; "No description
  left untrue".
- **No `question` issues:** the open points are settled by the best reading here (the orchestrator, passing on the rules
  at core 83aad2e). Principle: "Nothing goes to him to be answered".
- **Judged against the null split, not against zero:** the halves differ by seat alone by thirteen wins in a hundred,
  so a feature level in standing and thirteen wins behind is even. Principle: "Numbers are first guesses until play
  tunes them"; measure the measure.
- **Sell at any price,** not a lower floor: a sale is a transfer between two things the score counts alike, so any
  floor only keeps grain to spoil; the trial with no floor is what was measured. Principle: "Using a feature must pay".
- **A paying vassal weighed as any king,** not a smaller fixed restraint: the tribute a script overlord asks is a small
  share of what the land yields, and trial A (the tribute's stream in place of the 600) did not help; trial G (no offers
  by the strong) did no better on its first half, so it was stopped. The vassal's own belief that a paid overlord spares
  it (`tributeReturn`) is left as it is: it was measured with the patch, and changing it is a further trial (F3's
  remainder). Principle: tune what the measure shows, one change at a time.
- **The features after the patches measured on the patched play,** those before on the old: the queue was half run
  when the patches landed, and measuring on the play that ships was worth more than one set of conditions for all; the
  table says which is which. Principle: what counts is the final game.
- **No save version:** no rule changed and no recorded game moved. Principle: "A version of the rules is counted by the
  save version".
- **Another builder's findings:** a second F3 session, started by the orchestrator before it knew this one was still
  at work, stopped and sent its findings on the old play; they are kept for F4 and F5 below, not built here. Principle:
  the numbered items run one at a time.

## Split, and where to pick up

The owner asked that nothing new be started, so these are listed, not begun:

1. **F3's remainder,** on a fresh branch off `main`: par measured again on the patched play; the benchmarks; the five
   features not measured and the war of choice on the patched play (above); 17++ A and 17++ D; and the Great Kings'
   small loss by vassal play (0.96 to 1.015 growth on the patched play), where the vassal's belief that a paid overlord
   spares it (`tributeReturn`) is the next lever to try.
2. **F4, the bold road and Arzawa.** The careful reach the top five 1.40 times as often a head as the bold (F2). The
   second builder's diagnostic (12 games, old play; people and top five by way): bold Climbers 1,298 and 18, Keepers
   1,200 and 12, Steady 89 and 3, Sellers 122 and 1; careful Steady 576 and 17, Climbers 253 and 5, Keepers 251 and 2,
   Sellers 299 and 2. Within a way the two roads pay about alike; the gap is the mix (the bold are mostly Climbers and
   Keepers, the Steady way mostly the careful's), and the careful rise to rule about three times as often a head, so
   the Climber and Keeper ways are what to tune. Halving the bravest's danger premium made it worse (1.40 to 1.63).
   A line counting the top five by way, bold and careful apart, is on branch `claude/f3-per-way-line` (commit f2e973c,
   the money report and design note 58), ready to take. Arzawa: its mean performance, 0.59, matches its falls (15 in
   100 in its par); it scored 0.90 or better in 4 of 84 games where about 10 were due; two firsts in 200 games has a
   Poisson chance of about 0.045, plausibly chance among seven Great Kings.
3. **F5, the people 17+ added** (decisions asked / times sent, 100 games, old play): Thutmose 6 / 0, Eshuwara 82 / 14,
   Enlil-kidinni 103 / 37, Addaya 218 / 34, Ili-ippashra 207 / 57, Pahanate 368 / 155, all governors or commissioners
   away from court; every other person of the sources 1,000 or more (each batch log's "People of the sources" line).
   Then starting positions, banditry and far provinces against the sources, and commanders' worth by the distance of
   the front and the realm's size.
4. Then **stop for review**, its points settled by the best reading in the report, and on to item 18a.
