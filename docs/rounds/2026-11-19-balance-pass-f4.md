# Item 18, the balance pass: part F4, the bold road and Arzawa

Part F4 of item 18 (`docs/rounds/2026-11-11-balance-pass-f3.md`, "Split, and where to pick up", point 2), from `main` at
c5cda6b (save version 95, par from 767cab8). Model trial 2's Opus builder (`docs/rounds/2026-11-12-model-trial-2.md`).

**The check for changes:** the live design document could not be read from this session (the docs connector refused
access), so the copy on `main` was read again by its diff since c5cda6b, at the start and before the pull request.

## How the runs are kept

Every run is written here, with its command, seeds, commit and result, as it finishes; each is 50 games, from a worktree
of the named commit, two at once at most.

### Finished

| Run | Command (`scripts/sim.sh ...`) | Commit | Result |
|---|---|---|---|
| Baseline, seeds 51-100 | `--games 50 --seed 51` | 1af19bc | 50 minutes beside another run. Bold 9,298 characters, 152 of the top five (1.63 a hundred heads), 513 of the top twenty, 12% dead, 9,352 jobs, the living gained 26 a head, earned 180 a head (fees 59%, loot 30%, dealing 8%); careful 4,977, 98 of the top five (1.97), 487 of the top twenty, 14% dead, 9,749 jobs, gained 41, earned 226 (fees 78%, loot 12%, dealing 8%). **The careful reach the top five 1.21 times as often a head, the top twenty 1.78 times.** By way, top five a hundred heads, bold / careful: Steady 2.9 / 2.0 (272 / 2,156 heads), Keeper 1.4 / 1.3 (4,173 / 916), Seller 2.7 / 2.6 (329 / 1,030), Climber 1.6 / 1.9 (4,415 / 858), Outlaw 2.8 / 0 (109 / 17). Great Kings' wins 1, 1, 1, 0, 5, 0, 0 (Egypt to Alashiya); standing 0.86, 0.98, 0.90, 1.14, 1.10, 0.95, 0.92 |
