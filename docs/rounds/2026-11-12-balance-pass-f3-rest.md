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

1. Par, seeds 101-150 and 151-200 (`--games 50 --seed 101 --par-out`, `--seed 151`), on dde658d: **running**.
2. The null split on the new par (`--null-half`), seeds 1-50 and 51-100.
3. The tidings, the ride, the coffer, 7a sea play, 8 inventories, the war of choice: each `--*-play-half`, seeds 1-50
   and 51-100, on the new par.
4. The vassal line (paying vassals taken by their own overlords) and the trial on `tributeReturn`, seeds 1-100.
5. Benchmarks before (`--versus solo`, seeds 1-2 and 3-4, on dde658d) and after (on the branch's last patch).
6. Seeds 101-200 for the close rows and the null split, the rows named once 2 and 3 are in.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
