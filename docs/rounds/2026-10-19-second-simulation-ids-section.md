## Fix (d): an id counter per kind

The owner's instruction, word for word:

> One more fix for item 4, alongside the three at its start: item 3's report found that new tablets take ids from the
> shared counter, which shifts later dice rolls and changed the winner in 13-14% of benchmark seeds. Give each kind of
> object its own id counter (or otherwise make roll subjects independent of how many objects of other kinds exist), so a
> future item that adds a new kind of object leaves existing seeds' rolls unchanged. This needs a new save version;
> afterwards, check that adding a dummy object kind leaves the benchmarks identical. Record it in the report.

Branch `item/second-simulation-ids`, from `c0ff3cf` (develop with item 3, before fixes (a)-(c)).

**What changed.**

- **A counter for each kind.** `GameState.NewId(prefix)` now counts each prefix on its own (`GameState.IdCounters`,
  prefix to the number of ids issued, saved with the state), in place of the one shared `NextId`. Ids keep their form,
  prefix and number, but each kind counts from 1: tablets are t1, t2, ..., copies k1, k2, ... The call sites did not
  change (each still passes its prefix), which keeps the change to `GameState.cs` and away from the files fixes (a)-(c)
  touch.
- **One list of prefixes.** `IdKinds.All` names the twelve kinds once: a audience, c character, f fact, g lot of gold,
  j journey, k copy of a tablet, m message trail, q task owed to a court, r request to a character's mind, t tablet, u
  unit, x catastrophe. It is built with `Add`, so a prefix given twice fails as soon as the engine loads. Standing
  orders keep their own numbering per seat ("s1", ...), outside the list, and no kind may take "s". Every prefix is
  letters only, so an id reads back as one prefix and one number, and ids of different kinds never meet although each
  kind counts from 1.
- **What feeds the dice, checked.** Every roll comes from `Rng.For(seed, turn, purpose, subject)`. The subjects, call by
  call: in the engine, the character set-up stream (no subject), starting terms, archive copying, what an envoy
  observes, spies, forged dates and losses heard (a character's id), background checks and authentications (a task's
  id), candidates and catastrophes (a power), and the end of the age (none); in the script kings, temperament,
  personality, the season's decisions, the search and the models of rivals (a power), a host's answer at an audience
  (the audience's id and the round), and a script character's reaction (its id and the round). So every subject is now
  a power, nothing, or an id within its own kind, and no number of objects of another kind can move it. The orders
  that decide something are all within one kind: by number (journeys arriving, tasks falling due, audiences heard,
  posted spies, memory folds, standing orders firing, losses heard, ties in the wealth ranking, the archive's newest
  tablet first, the trail panel) or by the id as text (units disbanded for unpaid upkeep or struck by plague, wages and
  back pay, notices and terms running out, the script kings' tie-breaks). Nothing compares, sorts or parses ids across
  kinds; every lookup is an exact id in one list. What this does not cover: a new rule that adds draws to a stream shared by many decisions (a script
  king's stream for the season, say) still moves the draws after it, as any rule change may.
- **Save version 4.** `GameState.CurrentVersion` is 4. A version-3 log is refused like earlier ones, for replay and for
  continuing it ("This game was saved under an earlier version of the rules (version 3) and cannot be replayed by this
  version."), and the web app shows that message in its saved-games card instead of loading the game. Within version
  4, seeds replay exactly: the replay test with sleep on and off, the 10-game replay check, and all 200 benchmark
  replays below. Fix (a), on the item branch, also raises the version to 4 (this branch starts before it). Both are
  item 4 and neither has been released, so item 4 is version 4 as a whole; when the branches meet, `CurrentVersion`
  stays 4 and its comment, like the DESIGN-NOTES save-version entry, names both reasons (the two edits conflict
  textually there). A log saved on the item branch between fix (a) and this fix says version 4 but would not replay
  exactly; it was never released, as with version 2 in the simulation-fixes round.
- **DESIGN-NOTES** has a new entry, "Ids: a counter for each kind of object" (how ids are issued and why), and the save
  version entry says what version 4 is, in the same commit as the change.

**Tests** (`tests/Amarna.Game.Tests/IdCounterTests.cs`, `SaveVersionTests.cs`):

- A dummy kind made during play leaves the game unchanged, seeds 1-3, whole games: the test issues ids of a kind no
  rule knows ("dummy") at every call to a seat or a character's mind, which come between the engine's own steps in a
  season (arrivals, audiences, resolution), more than ten per season; the log of every order, audience and decision,
  the events, the winner, the length and the whole final state (but for the dummy's counter) are identical to the
  same seed played without it. Checked against the old rule: with one shared counter put back, it fails on all three
  seeds at the comparison of the logs.
- Every kind has a prefix of its own (letters only, distinct, not "s"); after whole games (seeds 1 and 5) every id in
  the state has its kind's prefix, a number no higher than its kind's counter, is unique across all kinds, and every
  counter belongs to a listed kind; the list of kinds matches the collections checked; and within a kind a higher
  number was made later (characters, copies, trails, tablets), which "newest first" relies on.
- The counters are saved with the state: a snapshot read back holds the same counters and issues the same next id.
- Version 4 is current; logs of versions 1 and 3 are neither replayed nor continued; seeds replay exactly within the
  version with sleep on and off (the existing test, now under version 4).
- `StartingTermTests` compared a fingerprint of the starting characters that included their ids, which this fix
  renumbers. The fingerprint now leaves ids out; its new values were taken on the old code (`c0ff3cf`) and match the new
  code, so the renumbering moved nothing else at set-up.

All tests pass (220 engine, 459 game, 15 web), the build has 0 warnings, and the replay check (`--games 10 --seed 1
--verify-replay --no-chronicles`) replays all ten games exactly.

**A side note on hidden state.** The number in an id tells a court how many objects of that kind exist in the world: a
king who receives copy k40 after k31 knows that eight copies were made elsewhere in between. The shared counter told
the same of all kinds together, so this is no new leak, but it is a little more specific now. Left as it is; if it
matters for model kings, seat views could number what each court sees on its own.

### Benchmarks

Script kings only, shared victory off, every game replayed and checked, as under "Benchmarks" in
`docs/rounds/2026-10-19-simulation-fixes.md`, in Release. **Before** is item 3 (`develop` at `c0ff3cf`; rerun here,
its outputs matched item 3's byte for byte apart from elapsed time); **after** is this branch. All 200 replays were
exact. Game lengths are the same seed by seed (the end of the age is rolled by turn alone): 20.9 seasons on average for
seeds 1-100, 20.4 for 101-200. **Nothing was tuned.** These are the new "before" numbers for later items.

Every id is renumbered from the set-up on (characters, facts and units included), so every seed's rolls move once,
from the first season rather than from the first gold delivery as in item 3: the winner changed in 28 of seeds 1-100
and 36 of 101-200 (item 3: 14 and 13). The per-power moves go both ways between the two seed sets (Babylonia 17 to 19
in one, 15 to 14 in the other; Mitanni 5 to 4 and 1 to 4), and the baseline comparison barely moved. Egypt lost 5 wins
in each set (47 to 37 over both), about 1.7 standard deviations of a count over 200 games, with its mean growth
barely moved (2.36 to 2.35, 2.32 to 2.30); worth a look in the next items' benchmarks. I read the moves as noise from
the reshuffled rolls, not a shift in balance.

Seeds 1-100:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 23 | 18 | 2.36 | 2.35 |
| Hatti | Strong | 33 | 32 | 2.12 | 2.09 |
| Babylonia | Strong | 17 | 19 | 2.25 | 2.30 |
| Mitanni | Middle | 5 | 4 | 0.76 | 0.67 |
| Assyria | Middle | 15 | 15 | 1.60 | 1.54 |
| Arzawa | Weak | 7 | 12 | 1.09 | 1.17 |
| Alashiya | Weak | 0 | 0 | 1.11 | 1.09 |
| Won by a weak power | | 7 | 12 | | |

Seeds 101-200:

| Power | Tier | Wins before | Wins after | Mean growth before | Mean growth after |
|---|---|---|---|---|---|
| Egypt | Strong | 24 | 19 | 2.32 | 2.30 |
| Hatti | Strong | 32 | 34 | 1.98 | 2.02 |
| Babylonia | Strong | 15 | 14 | 2.21 | 2.20 |
| Mitanni | Middle | 1 | 4 | 0.76 | 0.79 |
| Assyria | Middle | 14 | 17 | 1.54 | 1.51 |
| Arzawa | Weak | 14 | 12 | 1.24 | 1.18 |
| Alashiya | Weak | 0 | 0 | 1.11 | 1.16 |
| Won by a weak power | | 14 | 12 | | |

The frozen baseline, seeds 1-40: one current king against six baselines (`--versus solo`), against the same seed played
all-baseline:

| Power | Growth alone, before / after | Growth all-baseline, before / after | Wins alone, before / after | Wins all-baseline, before / after |
|---|---|---|---|---|
| Egypt | 2.86 / 2.86 | 1.31 / 1.32 | 93% / 85% | 15% / 18% |
| Hatti | 2.78 / 2.68 | 0.84 / 0.83 | 85% / 80% | 5% / 5% |
| Babylonia | 2.44 / 2.43 | 1.16 / 1.16 | 85% / 83% | 10% / 10% |
| Mitanni | 1.85 / 1.84 | 1.35 / 1.34 | 53% / 58% | 28% / 25% |
| Assyria | 3.76 / 3.61 | 0.97 / 0.94 | 88% / 85% | 10% / 10% |
| Arzawa | 3.18 / 3.30 | 1.38 / 1.38 | 63% / 65% | 30% / 28% |
| Alashiya | 1.84 / 1.87 | 0.88 / 0.90 | 45% / 53% | 3% / 5% |
| All kings | 2.67 / 2.66 | 1.13 / 1.12 | 73% / 73% | 14% / 14% |

Signals (totals over 100 games; seeds 1-100, then 101-200):

| Signal | Before | After |
|---|---|---|
| Tablets sealed | 3,611; 3,558 | 3,603; 3,554 |
| Accusations | 969; 955 | 976; 945 |
| Broken promises | 1,207; 1,228 | 1,291; 1,202 |
| Authentications | 669; 627 | 710; 642 |
| Bribes | 95; 108 | 93; 103 |
| Defections | 131; 134 | 130; 124 |
| Detentions | 149; 169 | 158; 158 |
| Skims | 36; 27 | 36; 18 |
| Debased gold found | 412; 443 | 426; 462 |
| Spies caught | 26; 27 | 22; 22 |
| Evidence shown | 902; 884 | 918; 865 |
| Archive copied by a spy (games) | 582 (72); 547 (68) | 566 (76); 507 (71) |
| Archive taken with a capital (games) | 325 (93); 327 (93) | 352 (96); 341 (97) |
| Inventory swapped (games) | 13 (10); 11 (9) | 16 (10); 5 (5) |

The richest character held 468 shekels at the end on average over seeds 1-100 (209-1,167) and 444 over 101-200
(225-1,481), against 472 and 448 before; wages are still about 99% of all the gold characters gained.

Outputs: `ids-1-100.txt`, `ids-101-200.txt` and `ids-solo-1-40.txt` in the session's `bench` folder (item 3's are
`item3-*.txt` there).

### The dummy-kind check

After the benchmarks, a temporary change to the engine added a kind of object no rule knows: `DummyObject`, prefix
"z", kept in the state (`GameState.Dummies`, so it is saved and replayed like everything else) and read by nothing. The
engine made one at every notice it writes (`GameState.Notify`, called all through a season), three at the start of
every season and two before every resolution, so at least a dozen in every season, interleaved with the engine's own
ids. The change was a local edit applied by a script (`ids-tools/dummy-kind.sh` in the session's scratchpad), built
to a separate folder and never committed; the branch has no trace of it apart from the permanent test above.

The same three benchmarks with the dummy kind (`ids-dummy-1-100.txt`, `ids-dummy-101-200.txt`,
`ids-dummy-solo-1-40.txt`), compared with `diff` against the outputs above:

| Run | Result |
|---|---|
| Seeds 1-100, replays checked | identical apart from elapsed time (53.1 s / 65.7 s); 100 replays exact |
| Seeds 101-200, replays checked | identical apart from elapsed time (35.9 s / 65.9 s); 100 replays exact |
| Frozen baseline, seeds 1-40 | identical (it prints no time) |

As a control, the same dummy kind on the old code (`c0ff3cf`, one shared counter) changed seeds 1-100 from item 3's
output: the winner changed in 28 of the 100 seeds (`ids-control-oldcounter-dummy-1-100.txt`). So the check would have
caught the old behaviour, and with a counter per kind a new kind of object leaves existing seeds' rolls unchanged.
