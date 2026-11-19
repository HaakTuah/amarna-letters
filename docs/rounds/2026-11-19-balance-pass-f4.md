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
| Baseline, seeds 1-50 | `--games 50 --seed 1` | 1af19bc | 48 minutes beside another run (a first try was stopped by the session's time limit for background commands, and run again detached). Bold 8,359 characters, 158 of the top five (1.89 a hundred heads), 519 of the top twenty, 10% dead, gained 27 a head; careful 4,853, 92 of the top five (1.90), 481 of the top twenty, 13% dead, gained 39. By way, bold / careful: Steady 2.2 / 2.0, Keeper 1.9 / 2.0, Seller 1.5 / 1.8, Climber 1.9 / 1.5, Outlaw 3.4 / 3.4. **Seeds 1-100: bold 310 of the top five from 17,657 (1.76), careful 190 from 9,830 (1.93): 1.10 times, about one standard error; the top twenty 1.69 times.** Great Kings' wins 0, 0, 2, 0, 3, 0, 0; standing 0.91, 1.05, 0.89, 1.04, 1.07, 0.92, 0.91. **Seeds 1-100: the Great Kings first in 13 games (Egypt 1, Hatti 1, Babylonia 3, Mitanni 0, Assyria 8, Arzawa 0, Alashiya 0)**; a king first in 88, a character in 12 |
| Diagnostic, seeds 201-216, final states kept | `--games 16 --seed 201 --out <dir>` | 1af19bc | 21 minutes. Read by scripts not kept (each character's road, way, traits, how it came into play, earnings and place). Of 4,624 characters who never reigned, 2,546 are heads risen from loose men or bands, 74% of them bold by the lean of how they rose; 1,246 of the 2,957 bold walked off from a band that could not pay its men (a split). Top five a hundred heads, bold / careful: the starting cast and arrivals 2.46 / 3.02 (853 / 992 heads), risen heads 1.27 / 0.76 (1,887 / 659), raiders 0 / 0 (113 / 3). A risen head earns about what it spends (loot 78, fees 56, spent 126 a head) |
