# Item 18, the balance pass: the rest of part F3

The remainder of part F3 (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 1), from
`main` at dde658d, on the play F3 patched (grain sold at any price; a paying vassal weighed as any king): par measured
again, the benchmarks, the five features not yet measured and the war of choice, 17++ A and 17++ D, seeds 101-200 for
the close rows, the caretaker's realm against the war of choice, and the Great Kings' small loss by vassal play.

**The check for changes:** the live design document answered at the start: no change since the copy's revisions (Build
order 377; Land, people and economy 35; Victory and the ending 28).

## How the runs are kept

Every run is written here, with its command, seeds, commit and result, and pushed as it finishes; a run not in this file
on the branch does not exist. Each is half a seed set (50 games) or less, so none outlasts a session; two run at once
(about 4.5 GB each). All are `scripts/sim.sh` from a worktree of the named commit.

### Still to do, in order

1. The ride (seeds 1-50 **running**), the coffer (seeds 1-50 **running**), 7a sea play, 8 inventories, the war of choice: each `--*-play-half`, seeds 1-50
   and 51-100, on the new par.
2. The vassal line (paying vassals taken by their own overlords) and the trial on `tributeReturn`, seeds 1-100.
3. Benchmarks before (`--versus solo`, seeds 3-4, on dde658d) and after (seeds 1-2 and 3-4, on the branch's last patch).
4. Seeds 101-200 for the close rows and the null split, the rows named once 1 is in.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
| Par, seeds 101-150 | `--games 50 --seed 101 --par-out <file>` | dde658d | 61 minutes beside another run. Median age 79 seasons. Growth (old par's standing): Egypt 1.14 (0.95), Hatti 1.53 (1.19), Babylonia 1.29 (1.08), Mitanni 0.74 (1.08), Assyria 0.39 (0.98), Arzawa 0.78 (0.95), Alashiya 0.94 (1.34); wins 1, 3, 3, 2, 3, 0, 0 |
| Par, seeds 151-200 | `--games 50 --seed 151 --par-out <file>` | dde658d | 61 minutes. Median age 91. Egypt 1.16 (1.01), Hatti 1.61 (1.16), Babylonia 1.26 (0.97), Mitanni 0.67 (1.05), Assyria 0.34 (1.02), Arzawa 0.81 (0.84), Alashiya 0.93 (1.30); wins 1, 9, 3, 0, 0, 1, 2. The two halves merged (each power's results pooled and sorted, the characters' likewise) into `rules/par-results.ts`, 100 games |
| Benchmarks before, seeds 1-2 | `--versus solo --games 2 --seed 1` | dde658d | 46 minutes. Growth alone / all-baseline: Egypt 1.40 / 0.84, Hatti 1.31 / 0.99, Babylonia 1.47 / 0.60, Mitanni 3.35 / 0.74, Assyria 1.82 / 0.83, Arzawa 1.38 / 0.84, Alashiya 1.39 / 0.73; all kings 2.94 / 1.05, wins alone 30% / 1% |
| Null split, seeds 1-50 | `--games 50 --seed 1 --null-half` | 81c9490 | 56 minutes. Halves: growth 0.78 / 0.78, standing 1.043 / 1.026, wins 26 / 22; Great Kings 0.96 / 0.95 (standing 1.012 / 0.958), the rest 0.75 / 0.74. Vassals taken by their own overlords: 15 provinces of paying vassals in 50 games (0.3 a game), 400 of vassals in arrears. Great Kings' standing on the new par: Egypt 1.04, Hatti 0.86, Babylonia 0.80, Mitanni 0.95, Assyria 1.14, Arzawa 1.13, Alashiya 0.97; wins 3, 0, 1, 0, 4, 3, 3 |
| Null split, seeds 51-100 | `--games 50 --seed 51 --null-half` | 81c9490 | 58 minutes. Halves: growth 0.77 / 0.78, standing 1.027 / 1.007, wins 17 / 25; Great Kings 0.95 / 0.99 (1.000 / 1.015), the rest 0.74 / 0.74. Paying vassals' provinces taken by their overlords 21, in arrears 409. Great Kings' standing: Egypt 0.91, Hatti 1.13, Babylonia 0.89, Mitanni 0.93, Assyria 1.04, Arzawa 1.06, Alashiya 1.09; wins 0, 3, 1, 1, 1, 0, 4. **Seeds 1-100: growth 0.775 / 0.78, standing 1.035 / 1.017, wins 43 / 47; Great Kings' standing 1.006 / 0.987** |
| Tidings, seeds 1-50 | `--games 50 --seed 1 --tidings-play-half` | 81c9490 | 55 minutes. **Every game the same as the null split's, line for line**: no decision of a king leaving the word unread changed in 50 games. A check with the word logged (2 games, seed 3, 80 seasons, `--no-tidings-play`, a print in `asRead` not kept): a vassal's or ally's word was a court's newest of a province twice in 160 seasons over 47 courts. The word of who holds a land comes by itself, by the couriers' clock from that land (`knownHolders`); a vassal's word sets out from the vassal's court, no nearer, and so almost never comes first. Seeds 51-100 stopped, the answer being plain |
