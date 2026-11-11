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

FILL

## Vassalage (11+)

FILL

## Use against ignore, every feature

FILL

## Benchmarks

FILL

## Readings taken

FILL

## Split, and where to pick up (F4)

FILL
