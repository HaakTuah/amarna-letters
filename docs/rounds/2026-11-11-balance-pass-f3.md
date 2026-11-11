# Item 18, the balance pass: part F3

The third part of part F (`docs/rounds/2026-11-11-balance-pass-f2.md`, "Split, and where to pick up (F3)"), from
`main` at 8c2baff (#895, save version 94): every feature's use against ignore on seeds 1-100, in halves of 50, and a
patch for each that does not pay.

**The check for changes:** FILL.

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

Fifty games take about 21 minutes alone; two runs at once are what a session's machine holds (each grows to about
4.5 GB; a third was killed twice for memory).

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

FILL

## Benchmarks

FILL

## Readings taken

FILL

## Split, and where to pick up (F4)

FILL
