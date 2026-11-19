# Item 18, the balance pass: part F4, the bold road and Arzawa

The fourth part of part F (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 2), from
`main` at c5cda6b (save version 95, par of 767cab8): whether bold and careful characters reach the top of the
characters' ranking at comparable rates, with the bold road tuned until it pays, and why Arzawa so seldom stands first.
One of the two builds of model trial 2 (`docs/rounds/2026-11-12-model-trial-2.md`).

**In progress.** Every run is written under "How the runs are kept" as it finishes, with its command and commit, so a
fresh builder can pick up from this branch.

**The check for changes:** the docs connector refused this session's read of the live design document (a session on
another account), so the copy on `main` stands in, as `docs/intent/INDEX.md` allows; its diff since c5cda6b is read
again before the pull request is made ready.

## How the runs are kept

All are `scripts/sim.sh` from a worktree of the named commit, one at a time (a run uses all four cores; 50 games take
about 25 minutes), with `--out` so that each game's final state is kept and can be counted again without playing it.
A run not in this table does not exist.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
| Baseline, seeds 1-50 | `--games 50 --seed 1 --out <dir>` | 5280231 (`main`'s play, with the per-way line) | 25 minutes. Median age 89 seasons. Bold 8,359 characters, 158 of the top five, 519 of the top twenty, 10% dead, the living gained 27 a head; careful 4,853, 92 and 481, 13% dead, gained 39. A careful character reaches the top five 1.00 times as often a head as a bold one, the top twenty 1.60 times. Wins: Egypt 0, Hatti 0, Babylonia 2, Mitanni 0, Assyria 3, Arzawa 0, Alashiya 0; a character 4; another state 41 |
| Baseline, seeds 51-100 | `--games 50 --seed 51 --out <dir>` | 5280231 | 24 minutes. Median age 87 seasons over the hundred. Bold 9,298 characters, 152 of the top five, 513 of the top twenty, 12% dead, gained 26 a head; careful 4,977, 98 and 487, 14% dead, gained 41. **Seeds 1-100:** bold 17,657 characters, 310 of the top five (1.76 in a hundred) and 1,032 of the top twenty (5.84); careful 9,830, 190 (1.93) and 968 (9.85): a careful character reaches the top five 1.10 times as often a head (a standard error of 0.10), the top twenty 1.68 times. First places: Egypt 1, Hatti 1, Babylonia 3, Mitanni 0, Assyria 8, Arzawa 0, Alashiya 0; a character 12; another state 75 (Arwad 8) |

### Still to do, in order

1. The chief's share (52104fd), seeds 1-100 (running).
2. Baseline, seeds 101-200: par's own seeds, played with that par in the script kings' reckoning of their rivals, to tell
   whether the Great Kings' upper results fall short of par on seeds 1-100 by the seeds or by the par in play.
