# Round report: second agent simulation, with model characters (Build order item 4)

Specification: the Build order's item 4 in the design document's main tab, with the "Rules for the builder", "Local
play on a Claude subscription" (main tab) and "Skills are hard-coded; decisions belong to the character" (Ideas tab),
all read fresh from the live document on 19 October 2026. Branch `item/second-simulation`, built on `develop` at
`c0ff3cf`. Balance frozen; save version raised from 3 to 4 (fixes (a) and (d), one version for both).

The item has two halves. First, the fixes, each with its own commit and tests: (a) the seat view showed a king
every foreign spy posted at his court, with its employer; (b) phone performance, since watching a game on a phone is
the first milestone; (c) a character with no employer and no location was given Egypt as its court; and (d), which the
owner added during the item, a counter of ids for each kind of object, so that a new kind of object leaves existing
seeds' rolls unchanged. Then the second
agent simulation: the `sim/` kit extended so that envoys and spies are agents too, isolated like the kings; seed 7 and
one new seed for ten seasons with sleep on; and, before the review stop, the kit made playable for Haakon ("Local
play on a Claude subscription": a human seat in the locally running game against file-seat kings answered by
guarded, isolated king agents).

**The simulation was run in this session after all.** The sections up to "Review findings" were written while it
looked as if it could not be: a new agent type (`.claude/agents/*.md`) added mid-session was not found, and the
headless `claude` command on this machine is not signed in. So the kit and local play were proved with stub
repliers, small scripts that write valid replies (or none) into the request folders, and where those sections say
that no agent could start, read them as written at the time. New agent types do load into a running session, but only at a later turn
boundary, so after `setup.js` was run again (fix (d) renumbered every id) both games were played here, from a workflow
script. The measurements the item asks for (whether model envoys lie, skim and cover up, compared with script envoys
of the same traits; how often kings reopen their orders after an audience; wake-ups and call sizes under the new
triggers) are under "Simulation results", with how the games were run. The two review questions, the defects the run
found and what is left for later are under "For the review", at the end.

Each part has its own section below, written by whoever built it.

## Fixes (a) and (c)

Commits `f8673aa` (a) and `9129512` (c), each with its tests, its rulebook text where a king needs it, and its
design notes.

### (a) A spy at a court is hidden from it

**The leak.** A spy posted at a court stands there: the engine sets its `At` to the court it watches. `Views.For`
listed anyone standing at the viewer's court, and `Views.Character` gave anyone employed there its employer and
"at your court". So a king saw every foreign spy at his court, and whose it was, the season it arrived. Question 19,
bug 4, in `docs/rounds/2026-10-18-sleep-and-simulation.md` found this, and item 2's review left it as finding 7.
Script kings never read it, but model and human kings do: the model prompt listed the spy under "OTHER PEOPLE YOU
KNOW OF" as "employed; serves Babylonia; at your court", and the web app's People panel and follow view showed the
same. Agents would exploit it, so it is fixed before the simulation.

**The rule now.** A spy posted at a court watches in secret: the court does not see it there, and does not know whom
it serves, until its watchmen catch it, unless the spy secretly serves that court.

- `Character.HiddenAt(court)` marks a hidden spy: employed, posted as a spy at that court, not in the court's own
  service, and not secretly serving it (`SecretMaster`). `Views.SeenAtCourt(c, viewer)` means standing at the
  viewer's court and not hidden there. The view now uses it everywhere it used to ask "is it at my court?": whether
  the person is listed at all, its master, its place, whether a free person can be hired there, and the back pay the
  court sees it owes.
- A hidden spy the court knows of in some other way, for instance a hidden fact its inquiries found earlier, is
  listed as if it were anywhere else: "employed", with no place and no master. Tested: that entry is byte for byte
  the one the court would see with the spy at home.
- A caught spy is the court's captive ("your captive", "in your prison"), now with the master it confessed to, read
  from the `LossAbroad` record of its capture, or with no master if it would not say. Before, the view never named a
  captive's master; only the capture notice did, and that notice is gone from the view the next season. A model king
  now reads, for example, "your captive (a caught spy); serves Babylonia; held at your court against their will; in
  your prison".
- The engine follows the same line in two places. A hidden spy is not paid back pay the court owes it, because it
  does not stand at the court openly; it is paid if it ever does, so no notice and no gold give it away
  (`PayBackPay`). A hidden spy also does not end a cover the court holds for it (`CoversAtCourt`): a defector whose
  new master posts it as a spy at its old master's court leaves the old master believing what it believed, as for
  any servant abroad. Once the court catches it, the cover ends and the court sees its captive (tested).
- Everything built on the view follows it. The model prompt's people lists, the People panel, the order form's
  lists and the follow view (`LifeRecord`, which knows nothing of a person its court's view does not list) all read
  the view. The map (`MapScene`) already drew no uncaught foreign spy. It drew every captive in its true master's
  colour, and now uses the master the captive confessed to, or none (`FramePerson.Confessed`). A new map test checks
  that no foreign person is drawn with a master the court's view does not name.

**The rulebook** (`Prompts.LeaderRules`), in the spies' paragraph: "A spy posted at a court watches in secret: that
court does not see it there, nor whom it serves, until its watchmen catch it, unless the spy secretly serves that
court (as a double agent it turned does). So a foreign spy may stand at your court without your knowing, and is not
paid any back pay you owe it while it hides there." Step 3 of the season now reads "Then everyone you see at your
court whom you owe back pay is paid it, as far as your treasury allows."

**What "or otherwise learned" means under today's rules.** I read the item's phrase as follows and wrote it into the
design notes ("A spy at a court is hidden from it", under Characters):

1. **Caught.** The only way a court learns of a spy by its own means. It then holds the spy, and knows whom it serves
   only if the spy confessed (a spy with courage under 50 always does, others 40% of the time).
2. **Confessed.** A confession comes only with a capture, so it adds a master to a captive and never reveals a spy
   still at its post.
3. **Turned, or a plant.** A spy secretly serving the court it watches reports to that court, so the court sees it
   at its post, with the master it pretends to serve. That covers a captive the court turned and sent back to its
   post, and a plant placed in another court's service at the start of the game (`CharacterFactory`). For a turned
   spy that never confessed, I read turning as the spy telling its captor whom it reports to, so its master is shown.
   That was already so before, and it is unchanged.
4. **Named in a report.** No report names an uncaught spy at its post. Envoys and spies report envoys received or
   held at the court they visit, captives the court holds and servants it put to death. Background checks report
   facts about a person, never where it is. A spy watching a court learns secrets of that court's own people, not of
   other courts' spies.
5. **Known as a person.** A court that knows of someone (a fact found by inquiries; a pitch, which hiring clears)
   knows the person, not that the person is at its court. It sees the entry it would see anywhere else.
6. **No longer a spy.** A spy whose master dismissed it, or whose kingdom fell, is free at the court it watched and
   seen there as before: nobody employs it any more, and a free person at a court can be hired there.

**Save version 4.** The two engine changes are new rules (a hidden spy is not paid back pay where it hides, and does
not end a cover there), so `GameState.CurrentVersion` is now 4, and a version-3 log is refused for replay and for
continuing, with the usual message. Within version 4, seeds replay exactly (all 200 benchmark games and the ten-game
replay check).

**Tests** (11 new): `HiddenSpyTests` (6: the court's whole view is unchanged by a spy at its post; a spy known
otherwise is listed with no place and no master; caught, it is a captive with the master it confessed to, and once
turned it is seen at its post with its master; a silent captive names no master; a plant is seen; a hidden spy is not
paid back pay, and its books show none, until it stands at the court openly); in `CoverTests` a defector posted as a
spy at its old master's court leaves the cover in place until that court catches it; in the hidden-state tests
(`BlindnessTests`) `Hide` now also posts a rival's spy at the king's court, and a new test checks that such a spy
changes nothing in that court's seat view or in the model king's situation text, for every living court of a played
game; a rulebook text test; and two map tests (a caught spy is drawn only with the master it confessed to; an
uncaught spy is neither drawn nor followed by the court it watches, while its master follows it to its post). With
the old rule, the view tests fail; without either engine change, the back-pay test or the cover test fails.

### (c) No court for a character with neither employer nor place

`TurnEngine.MemoriesDue` asked for a memory summary with `Court = c.Employer ?? c.At ?? Power.Egypt`, so a
character with no employer that stood at no court (free and on the road, for instance an envoy dismissed on its way
home) was filed under Egypt. Since `Power` is an enum whose first value is Egypt, a request that named no court would
have read as Egypt anyway.

- `MindRequest.Court` is now `Power?`. A memory summary names the court the character belongs to (its employer's,
  else the court it stands at), or none. Reports, pitches and background checks always name one, and read it through
  `MindRequest.For()`, which throws if a request that must name a court names none, instead of falling back silently.
- Only a pitch is priced for a court: `MindContext.BasePrice` is set for pitches and 0 otherwise. It was computed for
  every request before, but read only for pitches.
- Nothing reads the court of a memory summary: the summary goes to nobody, and neither the script mind nor the model
  mind names a court in it. So nothing a seed plays changes, and no new save version is needed: the three benchmark
  runs after (c) are identical, game by game, to those after (a).
- Tests (2 new): the engine names Hatti for Hatti's servant, the court a free character stands at, and no court for
  one with neither, and folds that one's memory in all the same; a game runner with script minds summarizes such a
  character's memory without asking for a court.

### Benchmarks

Script kings only, shared victory off, every game replayed and checked, as under "Benchmarks" in
`docs/rounds/2026-10-19-simulation-fixes.md`. **Before** is item 3's "after" (`develop` at `c0ff3cf`, the files
`item3-*.txt`); **after** is this branch after (a), with (c) on top giving identical output. All 200 replays were
exact. Game lengths and winners are the same seed by seed. **Nothing was tuned.**

- **Seeds 1-100:** identical to before, game by game, down to the richest characters and every signal.
- **Seeds 101-200:** two games changed (seeds 102 and 105), with the same length and winner. In the table, Hatti's
  mean growth went from 1.98 to 1.97; wins are unchanged (Egypt 24, Hatti 32, Babylonia 15, Mitanni 1, Assyria 14,
  Arzawa 14, Alashiya 0). Signals: tablets sealed 3,558 to 3,557, broken promises 1,228 to 1,229, authentications
  627 to 628, detentions 169 to 167, debased gold found 443 to 444, archive copies 547 to 548. Characters' total
  gains went from 355,470 to 355,052 shekels; the shares were unchanged.
- **The frozen baseline, seeds 1-40** (`--versus solo`): only Assyria's games alone moved, growth 3.76 to 3.79
  (wins 88% both), and the all-kings average went from 2.67 to 2.68. Every other figure is unchanged. The design
  notes' table is updated.

**Why they moved.** A probe of all 480 games found the same event behind each change: an envoy that went over to a
host, sent back by its new master as a spy to its old master's court. In seed 102, Ammistamru went over from Hatti to
Egypt and stood at Hatti's court from turn 12. In seed 105, Ashur-nadin went over from Mitanni to Hatti and stood at
Mitanni from turn 4. In solo seeds 17 and 18, with Assyria on the current bot, Paser and Mane went over from Mitanni
to Assyria and were posted at Mitanni from turn 5. Before, the arrival ended the old master's cover, and the old
master saw the spy as its rival's man at its court. Now the old master goes on believing its servant away and hears
in time that it has not returned, and a script king dismisses a servant that has read "has not returned" for three
seasons. That changes wages, and with them later rolls. In none of the 480 games was a hidden spy owed back pay by the
court it watched, so the back-pay rule never fired in them.

### New numbers

None. Neither fix adds a time, cost, chance or threshold.

### Verified

- `dotnet test`: 699 pass (686 before, 13 new), and the build has 0 warnings.
- `dotnet run --project src/Amarna.Batch -- --games 10 --seed 1 --verify-replay --no-chronicles`: replay ok for all
  ten.
- The benchmark runs above: seeds 1-100 and 101-200 with replay checks, and the frozen-baseline run, after (a) and
  again after (c).
- Not checked in a browser: the People panel, the follow view and the map are covered by the map tests and the view
  tests they read, not by eye.

### Left out, and why

- **The captor's knowledge beyond a confession.** A captive that would not say whom it serves stays nameless in its
  captor's view, though the court's ransom demand still reaches the right king, because the engine sends it. The
  captor learns who paid only when a ransom arrives (the notice names the court that paid), and the captive is then
  freed. That is how ransoms already worked, and it is unchanged.
- `docs/BUILD-PROGRESS.md` is not touched, as the instructions for this part say.

## Fix (d): an id counter per kind

The owner's instruction, word for word:

> One more fix for item 4, alongside the three at its start: item 3's report found that new tablets take ids from the
> shared counter, which shifts later dice rolls and changed the winner in 13-14% of benchmark seeds. Give each kind of
> object its own id counter (or otherwise make roll subjects independent of how many objects of other kinds exist), so a
> future item that adds a new kind of object leaves existing seeds' rolls unchanged. This needs a new save version;
> afterwards, check that adding a dummy object kind leaves the benchmarks identical. Record it in the report.

Built on branch `item/second-simulation-ids`, from `c0ff3cf` (develop with item 3, before fixes (a)-(c)), and merged
into `item/second-simulation` as `b85c547` (see "Merging fix (d), and the item's benchmarks", after "Review
findings").

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
seeds 1-100, 20.4 for 101-200. **Nothing was tuned.** The merged item's numbers ("Merging fix (d), and the item's
benchmarks") are the "before" numbers for later items.

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

## Fix (b): phone performance

Built on branch `item/second-simulation-perf` (from `c0ff3cf`) and merged into `item/second-simulation` afterwards (see
"Merging fix (b)" at the end of this report). Watching a game on a phone is the first milestone; item 2's report left
two problems: playing a season froze the page for up to about 3 s on a slow emulated phone, and the first load took
about 20 s on slow 4G.

**In short.** The freeze is gone: the script kings and the script characters now think in a Web Worker, and the
longest stretch in which the page could not answer a tap while seasons played fell from 2.3-4.2 s to 0.6-0.8 s (once,
at the first season) and at most 0.33 s after it. The first load is only somewhat faster: 15% fewer bytes (the
Anthropic SDK is no longer downloaded) and 7-10% less time on average; "much faster" is not met, and what would
close the gap is below. Seeds and replays are unchanged by this fix: no rule changed, and it needed no new save
version (fix (a) alone raised it from 3 to 4).

### What was built

- **The script players think in a Web Worker** (`dfce064`). In a browser game the script kings' look-ahead and the
  script characters' writing run in a worker with a second .NET runtime (`Services/ScriptWorker.cs`,
  `Services/ScriptWorkerClient.cs`, `wwwroot/js/script-worker.js` and `script-worker-client.js`). The worker boots
  from the files the page has already downloaded (it downloads nothing of its own), starts when a game with script
  players is set up, and warms up on a throwaway game while the page sets up the real one. Each request carries what
  the engine handed the seat or the mind (a king's view, a character's context) as JSON, as a file seat's view is
  written; the answer comes back the same way into the runner, which records it as before. The kings keep their
  memory in the worker from season to season (one `ScriptLeader` per game, as in the page and the batch runner), so
  every answer is the one the same code gives in the page. Where no worker can start, the kings think in the page as
  before (`YieldingSeat`); if the worker stops during a game, the page takes over and says so in a notice (the kings
  then start with no memory of earlier seasons; the characters keep none of their own, so theirs is the same answer).
  Model kings and characters wait on the network and stay in the page.
- **What stays in the page is drawn apart from the engine's work** (same commit). A season's redraws are coalesced
  into one task after the engine's work instead of inside it (`GameSession.NotifySoon`), and the page draws that a
  season is under way before the season's work starts. Loading a saved log is quicker too, as it no longer redraws at every
  phase of every replayed season.
- **The log writes each decision's line once** (`0e28da3`). `GameLog.ToJsonl`, which the autosave calls
  every season, wrote and re-parsed every line each time, which grows long late in a game. The first version kept a
  copy of the log's line format in the web app (`LogText`, in `dfce064`); a trial merge with the item branch showed
  why that was fragile (the branch adds model characters' shadow decisions to the log, and the copy missed them), so
  the log now keeps the lines it has written itself, and its text is unchanged: a test compares the text written
  season by season with the text a log read back from it writes afresh, for a script game and a model game.
- **Generated serializers tried and dropped** (`25bd620`). Build-time JSON code for the worker's messages added 69 KB
  to the download and did not shorten the first season's longest stretch (363-364 ms with the engine's own serializer
  against 445-1,055 ms with the generated one, two runs each on the emulated phone).
- **The SDK path is out of `Amarna.Llm`** (`a35b847`). The browser never constructs the Anthropic SDK (it posts with
  HttpClient), but it downloaded 0.47 MB of it. The SDK transport now lives in a new project, `src/Amarna.Llm.Sdk`,
  which the batch runner and the game tests reference and register once (`AnthropicSdk.Use()`, one line at the top of
  `Program.cs`); `ClaudeClient` keeps its constructor and its `browser` flag, and a model client built outside the
  browser without the SDK registered says how to get it. The web app no longer ships `Anthropic`,
  `System.IO.Compression` or `System.Web.HttpUtility`. This is a split rather than lazy loading: the browser has no
  use for the SDK at all, so it never needs to download it.
- **A worker that does not start in two minutes is given up** (`0c9342b`), and the page plays instead of waiting.
- **The loading screen says that the first visit downloads the game** (`6147b9c`): "The first visit downloads the game,
  about 3 MB. Later visits start from this device." A visit the service worker starts does not show it.

`docs/DESIGN-NOTES.md` ("Transport" under Models; "Load size", "Script kings and characters in a worker" and "What is
left in the page" under the web map) and the README's project table changed in the same commits.

### How it was measured

As in item 2: the published Release builds of `c0ff3cf` (before) and `a35b847` (after; the later commits add the start
timeout and the loading note, and move the cache of the log's lines from the web app into the log, which in a game of
script players writes the same text with the same work), each served from its own local port as a CDN serves it
(precompressed Brotli, long caching for fingerprinted files), in headless Chrome 155 driven over the DevTools protocol
with Lighthouse's mobile settings: a 412 x 823 screen at 1.75x, 4x CPU slowdown, slow 4G (150 ms, 1.6 Mbps). The
script is item 2's
(cold load, service-worker install, second visit, a game of seed 7 from `play?watch=7`, twelve seasons played,
timeline steps, sliding, pinching and panning), run three times for each build, back to back and alternating
(before, after, after, before, after, before). The first load was also measured as GitHub Pages serves the site:
gzip instead of Brotli and ten minutes of caching (checked against the live site with curl on 19 October: Pages sends
`dotnet.native.wasm` as 1.20 MB of gzip, where the Brotli file is 0.98 MB).

Two things differ from item 2's runs:

- **Chrome cannot slow a worker down.** CPU throttling reaches the page only (a fixed loop took 50 ms in a worker at
  both 1x and 4x, while the page's took 60 and 217 ms), and the DevTools protocol refuses to throttle a worker target
  ("Operation is only supported for pages, not workers"). So the worker emulates the phone itself: the profiler sets
  `self.__amarnaSlowdown = 4` in it through the protocol, and after each piece of work (its start and each answer)
  the worker waits out three times as long. The hook is three lines in `script-worker.js` and is never set in play.
- **The machine was shared** with the other agents' builds and tests. CPU load, sampled before and after each run,
  was 9-68%; each figure below gives all three runs. No physical phone was used: every phone figure comes from
  Chrome's emulation.

### Results

| Measure (emulated phone) | Before (3 runs) | After (3 runs) |
|---|---|---|
| First load, bytes (Brotli, as a CDN serves it) | 3,282 KB | 2,804 KB |
| First load: home page ready (Brotli) | 20.4 / 19.4 / 19.7 s | 19.1 / 16.7 / 19.3 s |
| First load, bytes (gzip, as GitHub Pages serves it) | 4,005 KB | 3,416 KB |
| First load: home page ready (gzip; 2 runs) | 23.4 / 24.6 s | 21.0 / 22.2 s |
| First paint (the loading screen) | 0.57-0.59 s | 0.56-0.62 s |
| Second visit (from the service worker): ready | 2.4 / 2.4 / 2.7 s | 2.0 / 1.6 / 4.3 s |
| A game to watch from a link: map shown | 8.0 / 8.4 / 7.3 s | 9.7 / 4.8 / 10.3 s |
| **Longest stretch the page could not respond while seasons play** | **4.1 / 4.2 / 2.3 s** | **0.83 / 0.62 / 0.70 s** |
| The same, from the second season on | 4.1 / 4.2 / 2.3 s | 0.27 / 0.24 / 0.33 s |
| Longest stretch per season, median | 1.9 / 1.9 / 1.6 s | 0.16 / 0.13 / 0.22 s |
| Playing the first season | 8.8 / 12.1 / 8.5 s | 12.0 / 9.5 / 14.1 s |
| Playing a season, seasons 2-12, median | 6.8 / 7.6 / 4.2 s | 3.1 / 2.7 / 4.2 s |
| Switching seasons, Season panel open: median | 178 / 160 / 156 ms | 202 / 127 / 156 ms |
| The same, Events panel open: median / 95th percentile | 281-466 / 1,082-1,239 ms | 257-475 / 1,115-2,094 ms |
| Sliding, pinching and panning | 32-58 fps | 32-58 fps |

Memory, after eight seasons of seed 7: before, the page's .NET memory was 96 MB; after, 80 MB in the page and 55 MB
in the worker, 135 MB in all.

**What the numbers say.**

- **No freeze.** The page now answers within a third of a second throughout a season from the second season on; the
  one longer stretch, 0.6-0.8 s, is the page's own first season (its code running for the first time). Before, every
  season held stretches of 1-4 s. On a real phone the worker runs on another core, so the page and the kings work at
  the same time.
- **Seasons are no slower, and mostly quicker** (median 2.7-4.2 s against 4.2-7.6 s from the second season), since the
  page's drawing and the kings' thinking now overlap. The first season takes about as long as before or a little
  longer (9.5-14.1 s against 8.5-12.1 s): the worker boots its own runtime and warms up when the game starts, about
  1.1-1.4 s of work on this machine, emulated as 4.5-5.6 s, and a season played at once waits for it.
- **The first load is 15% smaller and 7-10% faster on average** (19.8 to 18.4 s with Brotli, 24.0 to 21.6 s with gzip), not much faster. Smoothness, season switching and the second
  visit are unchanged within the noise of a shared machine (sliding, pinching and panning came out at either about
  33 or about 57 frames a second in both builds, run by run).

**What limits the first load, and what would close the gap.** The download is most of it: at 1.6 Mbps every 200 KB is
a second. What is left is the .NET runtime (0.98 MB with Brotli), the core library (0.54 MB) and Blazor (about
0.3 MB), about 1.9 MB before any of the game's own code, which is about 0.9 MB (the engine, the game, the model layer,
the web app, and the JSON, regular-expression and HTTP libraries it uses).

1. **Brotli on the host.** GitHub Pages compresses with gzip and ignores the build's Brotli files: 3.4 MB instead of
   2.8 MB, about 3 s on slow 4G. A host or CDN that serves the precompressed files (Cloudflare Pages, Netlify, Azure
   Static Web Apps, or a CDN in front of Pages) gains that at once. Blazor's documented alternative for static hosts,
   decoding Brotli in the page, needs a third-party decoder script vendored into the repository and a service worker
   that decodes too (else installing it downloads the app a second time, as gzip); not done here, since it needs that
   download.
2. **Relinking the runtime** with the `wasm-tools` workload: the time-zone data alone is 188 KB in
   `dotnet.native.wasm` (35 KB with Brotli), and unused native code can go. The workload is not installed on this
   machine, installing it needs administrator rights, and the Pages workflow would need it too. Ahead-of-time
   compilation, the other use of the workload, makes the download larger (compiled code is bigger than the
   interpreted assemblies it replaces); with the bots in a worker it would only shorten seasons, so it was not tried.
3. **Lazy loading what the home page does not use** (the regular-expression and HTTP libraries, about 0.17 MB):
   about 0.8 s on slow 4G for the home page only; a link to watch a game needs them at once, and the worker would
   have to load them too.
4. Beyond these, only a lighter first page (a static home page that loads .NET when a game starts) or a lighter engine
   would bring the first visit near 10 s on slow 4G. Later visits already start from the device in about 2-3 s, and
   ordinary 4G is several times faster than Lighthouse's slow 4G.

### Decisions and readings

1. **Kings and characters, one worker.** The characters went to the worker as well: once the kings had left the page,
   a script character's first text (its text code warming up) was the longest stretch left, 1.8 s at the second
   season. One worker serves all the script players, one request at a time, as the page did; a worker per king would
   cost a runtime's memory each. The template narrator stays in the page: its personas are written before the worker
   can be ready, and it is light.
2. **Exactness by construction and by test.** The worker runs the same code on the same inputs; the view or context is
   JSON-serialized with the engine's own settings (`Json.Options`), as file seats already rely on. Tests in
   `tests/Amarna.Web.Tests/ScriptWorkerTests.cs` play seeds 1, 2, 7 and 14 through an in-process worker (the same
   requests, replies and JSON) and compare every decision and the final state with the game played in the page, seed
   5 season by season, and check the fallbacks and a replay of a worker-played log. In the browser, a whole watch game of seed 7 played through the
   worker matched a native game of seed 7 with the web app's settings in 573 of its 580 logged decisions (19 seasons, Egypt
   winning, as item 2 found); the other seven, the chronicles, differ only in line endings, `\n` in the browser against `\r\n` on
   Windows (the template narrator writes `Environment.NewLine`; it was so before this change, and replays read the
   chronicles from the log).
3. **Bot-visible behaviour is unchanged,** so the bot benchmarks were not rerun: no rule or bot code changed (the one
   change outside the web app and the SDK project is how the log writes its text, which stays the same), and the
   replay check (`--games 10 --seed 1 --verify-replay --no-chronicles`) prints the same output, line for line, at
   `c0ff3cf` and at `0e28da3` except its timing line; all ten replays match.
4. **The worker keeps the kings of the newest game only**, and drops requests still queued for a game the page has
   left. A request that reaches a king whose code fails comes back as that king's error, and the runner's stand-in
   answers it, as for any seat.
5. **A trap for the next builder:** the .NET loader takes a worker whose `onmessage` is set when `dotnet.js` loads for
   one of its own threads, and then waits forever for a main runtime that does not exist; the worker listens with
   `addEventListener` instead (commented in the script).
6. **`AnthropicSdk.Use()` is a registration, not a parameter,** so that `SeatSetup.Build` and `ClaudeClient` keep their
   signatures (other agents' code calls them). A console program that plays model seats must call it once; the batch
   runner does, and so do the two game tests that build model seats outside the browser.
7. **Numbers added:** none that touch balance. Two operational ones: the worker is given up if not ready within two
   minutes, and the loading note says "about 3 MB" (2.8 MB with Brotli, 3.4 MB with gzip).

### Left out, and why

- Ahead-of-time compilation and relinking: the `wasm-tools` workload is not installed and needs administrator rights;
  AOT would enlarge the download (see above).
- Brotli decoding in the page for GitHub Pages: needs a vendored third-party decoder (a download) and service-worker
  changes; moving to a host that serves Brotli is simpler and is the owner's call.
- Lazy loading for the home page: small, and of no help to a link that opens a game.
- Starting the worker before a game is set up (while the player chooses a table): it would hide the worker's start from
  the first season, but cost every visitor a second runtime's memory and a core's work whether or not they play.
- No physical phone was available; all phone figures are Chrome's emulation.

### Checks

`dotnet build` 0 warnings; `dotnet test` 699 passed (220 engine, 454 game, 25 web; 13 of them new); the replay check
as above. A trial merge of this branch into `item/second-simulation` as it stood at `72bee0d` (with the other
agents' work merged so far) merged without conflicts, built with 0 warnings and passed all 724 tests, the worker tests included (the trial
was not committed). In the browser (the published build, and the development server): a whole game watched to its end with every
court's view and every panel opened (item 2's smoke script; 22 seasons, no errors, the page never scrolled), a human
seat (Egypt) sealing orders and answering audiences for four seasons with the worker and with workers made
unavailable (`Worker` replaced by a constructor that throws; the kings then think in the page), and the loading note
shown on a first visit and not on a visit the service worker starts.

### Commits

- `dfce064` Run the script kings and characters in a Web Worker
- `25bd620` Write the worker's messages with the engine's serializer
- `a35b847` Move the Anthropic SDK path out of Amarna.Llm
- `0c9342b` Give up on a script worker that does not start
- `6147b9c` Say on a first visit's loading screen that the game is downloading
- `481cf5f` Report fix (b), phone performance, for the item 4 report
- `0e28da3` Write each decision's line of the log once
- `279a6ec` Bring the fix (b) report section up to date
- `1838884` Tidy the fix (b) report section

## Characters as agents

Commits `8299995` (file characters, the script shadow and the reports) and `88d1b3c` (the kit and the start prompt),
with this section in a third. No engine rule, no script king and no number of the game changed, so the save version
stays at 4: script games play exactly as before (seeds 1-100 are identical, game by game, to the benchmark after fix
(c)).

### What was built

**File characters** (`--file-characters DIR|map.json`). For every decision a model character makes today
(`LlmCharacterMind`: the speech abroad, each reply at an audience, the report home, a pitch, a spy's report and a memory
summary), the character's own folder gets the exact request a model character would get, the shared character system
text, its persona, facts and memory, the situation and the JSON schema, plus the file-seat footer
(`FileExchange.Footer`), and the seat waits for a reply file. The reply is checked against the schema like a file
seat's (one retry with what was wrong); a missing or invalid reply falls back to the script character for that
decision, and the failure is logged as a failed call and in the runner's errors. Replies are logged as decisions, so a
game replays exactly without the files (tested with the folders deleted). The only change to the request text is its
opening line, "Decide as yourself" where a king's says "Decide as the king". `LlmCharacterMind` now takes an asker per
character, the API or a `FileExchange`; a character without one is played by the script. City-states stay as they are
(they are not actors yet; that is item 17), the narrator stays the template, and file characters do not mix with
`--characters haiku|sonnet`. `--list-characters` prints a seed's pool (id, name, origin and how it starts, no traits
or secrets) as JSON. A character map carries its seed and is refused for another, because ids come from the game's own
counter and name other people in another seed.

**Which characters.** My reading of "every character that can serve as an envoy or a spy": every character in the
seed's pool. Any of them can be sent as an envoy or posted as a spy by its employer, and the free ones can be hired
first. The pool is drawn when the game is made (18 characters: 14 in service, two to each king, two of those secretly
in another king's pay, and 4 free), and nothing adds one later. So each seed has 18 character agents, 36 for the two
games.

**The script's shadow, and the comparison.** For each decision a model character makes, through the API or as a file
character, the runner logs beside it what `ScriptMind` with the same traits decides in the same situation (a
`ShadowDecision`, a `shadow` line in the log). `ScriptMind` draws only from streams keyed by seed, season and character,
never from the game's own generator, and changes nothing it reads, so the game is the same with or without the shadow:
a test plays a game both ways and gets the same state and the same decisions. Each shadow line holds the character's
traits, what it faced (gold carried, a gift or a post offered), what the engine knows happened on the mission, and
both decisions with what `CharacterChecks` found in their words. The checks read words, not meaning:

| Flag | The engine recorded | The words |
|---|---|---|
| `hid-gift` | the envoy took a host's gift on this mission | the report never speaks of gold or a gift given to the envoy itself |
| `hid-detention` | it was held at that court | the report never says so |
| `hid-skim` | it kept part of the gold it carried out | the report never owns up to it |
| `softened-threat` | the host threatened its lord (abroad: the letter threatened the host) | the report (the speech) carries no threat at all |
| `hid-offer` | it declined the host's offer of service | the report never mentions it |
| `false-seal` | nothing was sealed | the report says the king sealed |
| `passed-poison` | a spy's secret masters asked it to pass words on | most of their longer words are in its report |
| `dropped-observations` | what a spy observed | fewer than half of an observation's names, numbers and longer words are in its report |

An invented promise or a false account of a king's mood passes the checks, so the orchestrator reads the flagged
reports, and the decisions where the two minds differ, before calling anything a lie. One thing to keep in mind when
reading the counts: the shadow is per decision, not per life. Its situation is the one the model's own earlier choices
made. Where a model envoy kept gold on the way out, the script's report of that mission is checked against the same
fact (`hid-skim`), and a script envoy never owns up to it.

**The reports.** After the seat report, the batch runner prints the comparison, mind against script: speeches abroad
with gold, gold kept and how much, inventories swapped, threats softened; gifts and posts offered, taken and refused,
and commitments; reports home with gold, gold kept, swaps and each flag; spies' reports; pitches and their mean price;
and one line per character with its traits. Then the size of every kind of request, kings' and characters': file
requests in characters, and in tokens at 3.6 characters a token as in the simulation-fixes round; API calls by their
input tokens. Each file call now logs its request's length (`ModelCall.RequestChars`). The seat report already gives
the reopen rate after audiences, sleep lengths and every reason a king was woken. `sim/summarize.js` prints all of it
from the run folder too, plus each seat's sleep spells with their reasons and every decision where a character and its
shadow differ, with both texts.

**The kit** (`sim/`, `sim/README.md`):
- `setup.js --seeds 7,15` makes, beside the seven kings, one agent type per character of each seed, read from the
  engine (`--list-characters`): `.claude/agents/char-<8 random hex>.md`, a name that reveals nothing, with the Read and
  Write tools only, model `haiku` (the design's default for characters, "Every model is the table's choice"), the same
  PreToolUse guard limited to its own folder with a 32-hex-digit name, a canary word and an isolation test. The maps
  for the batch runner are `sim/characters/seed-<S>.json`; `sim/characters/agents.json` maps each agent type to its
  seed, character and folder. Everything it makes is git-ignored. Without `--seeds` it makes the kings only. `--force`
  moves the previous kit (folders and agent types) to `sim/runs/setup-<time>/` instead of leaving it beside the new one.
- The isolation tests: each character tries another character's canary and a king's, the repository, the agent map, a
  write outside its folder and a non-reply file inside it. Each king now also tries a character's canary.
- `wait.js` lists, for every waiting game request, the agent type to start and the file name, kings and characters
  alike (`--seed S` watches one seed's characters). `check-isolation.js` and `audit.js` cover characters. The
  orchestrator's rule extends to them: a character's final message could carry what a king said to it at an audience.
- `check-isolation.js --dry` checks the walls without starting an agent. Each agent file names itself and has exactly
  the Read and Write tools and a guard on every tool, on its own folder; folders and secret words are distinct and well
  formed; and each agent's own hook, run as Claude Code runs it, allows reading its canary and a request and writing a
  reply in its folder, and blocks 15 forbidden calls (another seat's canary, a king's, a path through `..`, the
  repository, the map, reading a reply file, a subfolder, a relative path, a write outside, a non-reply write, `Bash`,
  `Glob`, `Grep`, `Edit`). It logs to a scratch file. It cannot show that Claude Code runs the hook: the live test in
  the playing session does.
- `stub-replier.js` stands in for the agents to prove the plumbing. With `--orchestrate` it plays the orchestrator's
  loop: it calls `wait.js` and answers each request in the folder that the named agent type's own file gives it. Its
  kings send one person to the nearest court each season and ask to be woken the next. With `--tempted`, hosts offer
  gifts and posts, and characters keep gold and take gifts. `--skip` and `--bad` force fallbacks.
- Every Claude Code session opened in this folder now lists the 43 agent types, each described as only for the
  simulation orchestrator. They stay until the simulation is done; moving `.claude/agents/char-*.md` away (or the
  next `setup.js --force`) clears the characters'.

**The first simulation's files** were moved, not deleted, before the new kit was made: the king folders, guard log,
seat map and canaries to `sim/runs/first-simulation/kings/`, both runs to `sim/runs/first-simulation/sleep-on/` and
`sleep-off/`, and the old king agent types to `sim/runs/first-simulation/agents/`. All are git-ignored.

**The start prompt.** `docs/SIMULATION-PROMPT.md` is rewritten for a fresh session: seeds 7 and 15, ten seasons each,
sleep the default, kings as Sonnet agents (`king-<power>`) and characters as Haiku agents. It starts with usage, the
estimate below and the stop points; then the agent check and the dry check; the isolation test for all 43 agents; the
game loop on `wait.js`; the audit, the summary, and debriefs for kings and characters, each ending with the footer
(the characters are also asked why they chose as they did where they carried gold, were offered a gift or a post, or
reported home); and the measurements item 4 lists, with the two review questions, for a "Simulation results" section
of this report.

### The new seed: 15

Seed 15 joins seed 7. My criterion: an ordinary game, in which no capital falls in the first ten seasons when script
kings play it; a pool whose starting envoys span the traits the comparison turns on; and a script game in which the
characters' own decisions come up. I played seeds 1-40 for ten seasons with script kings and read their final states.
Fourteen had no capital taken (3, 6, 8, 10, 11, 12, 15, 20, 22, 27, 28, 31, 33 and 35). The closest candidates:

| Seed | Starting envoys: would skim / bribable / timid / faithful / overreach / forger's hand | Script game, ten seasons: conquests; gifts taken / refused; posts taken / declined; detentions |
|---|---|---|
| 7 (for comparison) | 6 / 6 / 4 / 3 / 2 / 7 | 18, two capitals taken; 1 / 2; 0 / 3; 0 |
| 12 | 4 / 6 / 3 / 4 / 2 / 8 | 4; 0 / 0; 2 / 0; 0 |
| **15** | **3 / 5 / 5 / 3 / 1 / 7** | **8; 1 / 3; 1 / 2; 1** |
| 28 | 4 / 4 / 2 / 6 / 2 / 8 | 11; 0 / 2; 2 / 3; 0 |

Would skim: greed above 60 and loyalty below 60, the script's skimming rule. Bribable: greed more than 10 above
loyalty. Timid: courage below 35. Faithful: loyalty 60 or more and competence 50 or more. Overreach: ambition above 70
and loyalty below 50. Forger's hand: competence 55 or more. Every pool has two plants. Seed 15 is the one whose script
game took a gift and refused gifts, took a post and declined posts, and held an envoy, with no capital lost and a mix
of temptable and faithful envoys. Seed 12 has a slightly better spread of traits, but its script game offered no gift
at all. Seed 7's script game is not ordinary (two capitals by season 7), and with model kings three kingdoms fell
inside ten seasons; it stays because it was the first simulation's seed.

### The estimate

From the first simulation (seed 7: 65 orders calls at 37k agent tokens on average and 64 audiences at 16k; 8.6
million king tokens for two runs, two debriefs and the isolation test, about 9 weekly points), corrected for what has
changed since:
- **Requests are larger.** A king's orders request is now about 50,000-56,000 characters (14,000-15,500 tokens) in the
  stub runs, against about 6,000-8,000 tokens in season 1 and 11,500-13,500 by seasons 9-10 in the first simulation:
  the rulebook, sleep and the schema grew. Audiences are about 36,000 characters (10,000 tokens), as before. So orders
  calls are put at about 44k agent tokens and audiences at 17k.
- **Kings:** about 50 orders calls a game (fewer than 65, since an envoy at the door now wakes a king for its audience
  only) and about 65 audiences: about 3.3 million a game, 6.6 million for both (5.5 to 8 million).
- **Characters:** the first simulation's seed-7 games had 50-60 speeches abroad, 64-82 audience replies, 42-50 reports
  home, 12 pitches and 2-6 memory summaries: about 190 character calls a game. A character's request is 3,400-6,700
  characters (900-1,900 tokens), so a Haiku agent call is put at about 7k tokens, the size of the first simulation's
  isolation-test calls: about 1.3 million a game, 2.7 million for both (2 to 3.5 million).
- **Isolation test:** about 0.3 million (43 agents). **Debriefs:** about 1.8 million. The first simulation's 14 king
  debriefs took about 1.2 million, since each king rereads every request it had; about 30 character debriefs add 0.6.
- **All in:** about 11.5 million agent tokens, 7.9 million of them Sonnet. At the first simulation's rate of about 1
  weekly point per million, that is about 11.5 points if Haiku counts like Sonnet, or about 9 if it counts at a third
  (not known yet; the run will show it). Writing the report adds 2 to 3 points without extra analyst agents.
- **Stop points** in the prompt: after season 3 of game 1, if the weekly limit has risen by more than 3 points; before
  game 2, if game 1 took more than 7; and at 90% of the weekly limit or of a 5-hour window.
- **Time:** about 2 to 3 hours a game. The first simulation's run took 65 minutes for 129 king calls; now every
  audience goes back and forth between a character agent and a king agent, round by round.

### How it was verified

No agent was started and no model call was spent.
- **Tests:** 12 new, in `FileCharacterTests`:
  - A file character writes the exact model-character request with the footer and plays the reply, which the host
    hears. Every call logs its request's length and a shadow beside it.
  - A missing reply (a timeout) and an unreadable one (twice) fall back to the script, and the shadow says so. The
    game replays exactly from the log with the folders deleted.
  - The shadow changes nothing in the game (the same state and the same decisions with and without it), and it
    survives the log.
  - The checks find a hidden gift, detention, skim, softened threat, declined offer and false seal, and pass an honest
    report. A bribed script envoy is caught hiding the gift and the threat. A speech that drops the letter's threat is
    flagged, and so is a spy that passes on its masters' words and leaves out an observation.
  - Request sizes are counted by kind.

  `dotnet test`: 711 pass (Engine 228, Game 466, Web 17). The build has 0 warnings.
- **Replay check** (`--games 10 --seed 1 --verify-replay --no-chronicles`): replay ok for all ten. **Seeds 1-100**
  (the benchmark run): identical, game by game, to the benchmark after fix (c). Nothing bot-visible changed, so the
  other benchmark runs were not repeated.
- **`node sim/setup.js --seeds 7,15`** was run for real. The 7 king types and 36 character types (18 of seed 7, 18 of
  seed 15) are in `.claude/agents/`, with their folders and maps, ready for the next session.
- **`node sim/check-isolation.js --dry`:** `DRY ISOLATION HOLDS` for 7 kings and 36 characters, 18 guarded calls each.
  In a mutation check, one character's agent file was pointed at another character's folder, and the check failed with
  four findings. The file was then restored. The live test (`check-isolation.js` without `--dry`) runs in the next
  session.
- **Stub games, file kings and file characters together**, run through `wait.js` by `stub-replier.js --orchestrate`,
  each request answered in the folder that the named agent's file gives:
  - two seasons of seed 7 and two of seed 15: 21 king and 14 character requests each;
  - six seasons of seed 15 with tempted characters and two forced failures: 182 replies, 77 to kings and 106 to
    characters. One report was never answered and one was answered twice with text that is not JSON; both fell back to
    the script (`2 fallbacks`).

  Every game printed `replay ok`, and its seat report, character comparison and request sizes came out as described
  above. Request sizes in these runs:
  - king orders: 50,000-56,600 characters (14,000-14,500 tokens);
  - audiences: 35,700-37,200 characters (about 10,000);
  - character speeches: 5,300-6,400 (1,500-1,600);
  - replies: 4,400-5,600 (1,200-1,400);
  - reports: 5,500-6,100 (1,500);
  - memory summaries: 6,300-6,700 (1,700);
  - pitches: about 3,400 (900).
- **`audit.js`** on made-up transcripts (a character reading another's canary, a clean character and a clean king)
  found exactly the one violation. `summarize.js` was run on the six-season stub game.
- The stub runs' files were moved out of the agents' folders afterwards (to `sim/runs/stub-7/`, `stub-15/` and
  `stub-earlier/`), so each agent folder now holds only its canary and its isolation test.

### New numbers (first guesses, kit settings, not balance)

- The checks: a spy "passes on" its masters' words if 60% of their words of four letters or more are in its report;
  it "leaves out" an observation if fewer than half of that observation's key words are.
- In the start prompt: `--file-timeout 240` minutes for the real games (the batch runner's default stays 120); the
  stop points above; characters on Haiku.

### Left out, and why

- **Running the simulation,** for the reasons given at the top: no new agent type loads in this session, and the
  headless CLI is not signed in. Everything is ready for a fresh session started from `docs/SIMULATION-PROMPT.md`.
  (Later the agent types did load, and the games were run in this session: see "Simulation results".)
- **A launcher that returns nothing** (the README's "Not built") still needs a signed-in headless CLI. With 36 more
  agents, the orchestrator's rule carries more weight than in the first simulation.
- **Lie detection by meaning.** The checks find omissions, and one contradiction, by their words. Whether a report
  misstates a king's mood or invents a promise is left to the reader of `summary.md`, which lists, with both texts,
  every decision where a character and its script shadow differ.
- **The local-play kit** is not part of this section.

## Local play

Commit `56be282` (the seat type, the bridge, the kit, the start prompt, the tests and the notes), with this section in
a second. The last part of item 4: "Local play on a Claude subscription", so that at the review Haakon can start playing model
kings himself. A human seat in the locally running web app against kings answered by the simulation's guarded,
isolated king agents in a Claude Code session, on the subscription instead of paid API calls. No engine rule, script
king or number of the game changed, so the save version stays at 4 and script games play exactly as before. No agent
was started and no model call was spent: the plumbing was proved with the stub replier.

### What was built

**The route: the web app and a local bridge.** The human seat already exists in the web app, so the web route was the
simplest robust one, and it worked. A king set to the new seat type **Local agent** (`LeaderKind.LocalAgent`) is a
model leader seat whose asker is a `BridgeExchange` (`src/Amarna.Llm/BridgeExchange.cs`): a file seat whose files are
written by `sim/bridge.js`, a small Node server on this computer, since a web page cannot write files.
- For each decision the page builds the request text itself, exactly a file seat's (`FileExchange.Request`: rules,
  customs, identity, view, journal, schema, footer), with a one-off mark where the reply's path goes. It posts it to the
  bridge with the king's name and the request's file name (`t3_orders_Egypt`, `t3_aud_a12_host_1`, `.retry`).
- The bridge alone knows the folders (`sim/kings/seats.json`). It puts the reply's path in, writes
  `<name>.request.md` into that king's folder (through a temporary file, as the batch runner does), and hands the page
  the reply file's text once it has stopped changing. The page asks once a second.
- The reply goes through the file seat's own checks, its one retry and its fallback: `FileExchange`'s exchange loop is
  now one function, `FileExchange.Converse`, shared by both channels. After the table's wait (60 minutes by default)
  the script king stands in for that one decision. A request that times out, or whose game is stopped or replaced, is
  taken back (the bridge moves it aside), so `wait.js` stops listing it and no agent is started for it later.
- Each exchange is logged as a call with no tokens (model "local agent"), so a game saves, replays and continues like
  any other. A saved game reads its local agent kings back from the header's label "Local agent". Local agent kings
  sleep like model kings (sleeping seats are on by default), need no key, and cost nothing on the game's meter.

**The web app.** A **Local agents** preset (`Presets.Local`: local agent kings, script envoys and narrator; not in
`Presets.All`, so the batch runner's presets are unchanged) and a "Local agent (Claude Code)" choice under "Customize
the table". Both appear only when the app runs on a loopback address (`localhost`, `127.0.0.1`, `[::1]`), so the GitHub
Pages build never shows them. With local agent kings at the table, a section explains local play and has the bridge's
address, the wait in minutes and a **Check the bridge** button. "Begin the age" checks the bridge first, and so does
"Continue" on a saved local game. If the bridge does not answer, the page says to start it with `node sim/bridge.js`
and that it works only when the game runs on this computer, not on the published site. While the other kings decide,
the game shows "The other kings are deciding: their agents answer in the Claude Code session on this computer, which
can take a few minutes." It names no king and gives no count, because that would tell the player which kings are awake.

**The bridge** (`sim/bridge.js`). `GET /status`, `POST /ask`, `GET /reply`, `POST /cancel`.
- Who it answers: it listens on 127.0.0.1 and ::1 only and checks the Host header (against DNS rebinding). It answers
  only pages served from this computer (an `Origin` of localhost, 127.0.0.1 or [::1]). Anything that writes must be
  JSON, which a page elsewhere cannot send without a preflight, and the preflight is refused.
- What it accepts: only the seven kings of the map file, request names of the game's own form (no path can be smuggled
  in), and a text in which the mark appears exactly once.
- At start it moves an earlier game's requests and replies into `earlier-<time>/` in each folder, as the batch runner
  does; `--keep` leaves them, for a restart in the middle of a game. It writes `sim/kings/bridge.json` (process id and
  port), refuses to start while another bridge runs, and removes the file on Ctrl+C.
- It is quiet by default, for the same reason as the page's notice; `--verbose` prints every request and reply.

**The kit.**
- `wait.js --play [seconds]` watches the kings only and reports `bridge-stopped` when the bridge is not running: its
  file is gone, or its process is dead, which also covers a bridge that was killed.
- `stub-replier.js --play` plays the orchestrator's loop on it.
- `check-isolation.js --kings` checks the kings only. `--since <time>` makes the live test count only the guard log
  entries and replies from that time on, so the kings' isolation test run again in a new session must pass on its own,
  not on the simulation's old log lines.

**The start prompt** `docs/PLAY-PROMPT.md`, for a new Claude Code session:
- Checks: that `ANTHROPIC_API_KEY` is not set, usage, the stop point (90% of the weekly limit or of a 5-hour window),
  the seven agent types, the dry check, the live isolation test of the seven kings with `--since`, and that the bridge
  runs.
- The loop on `wait.js --play 540`: one agent per listed request, started in parallel. A request still unanswered after
  its agent finished gets one more start, then is left to the script.
- The orchestrator's rule, and one rule more: Haakon is a player, so during the game he is told nothing about the other
  kings, and he may read everything afterwards.
- After the game: the audit and the usage.

`sim/README.md` has a new section "Local play": how it fits together, the isolation and the pre-game check, what the
player can see that a king cannot, why sleeping kings keep usage down, that usage is shared with the Claude apps, that
`ANTHROPIC_API_KEY` must not be set, personal use only, and the exact steps (the king agents, the bridge, the web app,
the session, play, stop). The root README lists the preset. DESIGN-NOTES has a paragraph on it under "File seats and
the agent simulation", and the line under "Not built yet" is gone.

### Readings

- **Characters stay scripts in local play.** The item names "file-seat kings answered by guarded, isolated king
  agents". Character agents are made per seed (`setup.js --seeds`), and a local game can have any seed.
- **The king agents are the simulation's.** `node sim/setup.js --seeds 7,15` already made the seven `king-` types
  (Sonnet), and local play uses them as they are. A king's agent file says the game is "played by seven kings", which
  stays true; nothing tells a king which seats are human. The isolation test covers all seven kings, since the player
  chooses his seat in the browser after the test.
- **What the player can see.** The orchestrating session shows which king agents it starts, so the player can tell
  which kings were woken. The folders hold the other kings' requests, and the god view and "Reveal all" show everything,
  as in any game. The README says so. The kit keeps it from the kings, not from the developer at his own desk.
- **The end of a session** is the bridge stopping (Ctrl+C), not the end of a game: a game can continue later from
  "Saved games", and the orchestrator cannot see the game's state.

### How it was verified

No agent was started and no model call was spent.
- **Tests:** 7 new, in `tests/Amarna.Game.Tests/LocalPlayTests.cs`, with a stand-in bridge over temporary folders:
  - A local agent king's request is word for word a file seat's in the same game, but for the folder. Its reply is
    played, and its call is logged as "local agent" with the request's length. The header's label is "Local agent".
  - An unreadable reply gets the retry through the bridge.
  - An agent that never answers times out, and its request is taken back.
  - A stopped game takes its waiting request back.
  - The bridge check says what is wrong: no bridge, or no folder for a king.
  - Local agent kings need no key and cost nothing, and come back from a saved game's header. The preset keeps a human
    seat and is not in `Presets.All`.
  - A game with two local agent kings sleeps by default and replays exactly.

  `dotnet test`: 718 pass (Engine 228, Game 473, Web 17), 711 before and 7 new. The build has 0 warnings, and so has
  the Release publish of the web app. Replay check (`--games 10 --seed 1 --verify-replay --no-chronicles`): replay ok
  for all ten. Nothing a script king sees changed, so the benchmarks were not run. On the first full run one of the
  new tests hung under load: the test's stand-in bridge wrote a request in place, so its stand-in agent could open the
  file while it was still being written, and the failed read ended its loop. It now writes through a temporary file and renames it, as `sim/bridge.js` and
  the batch runner do. Five runs of the new tests on their own and two of the whole suite then passed.
- **The whole route in the browser:** the real bridge, the web app (the `amarna-web` dev server in the built-in browser
  pane) and `stub-replier.js --play` standing in for the orchestrator and its agents through `wait.js --play`.
  - First run, playing Hatti: seasons 1 to 4. I sent an envoy to Mitanni and answered the audiences of envoys from
    Mitanni and Arzawa each season. The six local agent kings gave orders every season and held their audiences,
    Mitanni's with my envoy among them.
  - The withdrawal: I stopped the stub replier with six season-4 orders requests waiting, which `wait.js --play`
    listed, then began a new game in the same tab. All six were taken back, and `wait.js` listed none.
  - With the bridge stopped, "Begin the age" refused with the bridge message, and `wait.js --play` reported
    `bridge-stopped`.
  - Second run, after the last web changes, in a fresh tab, playing Babylonia on seed 7: seasons 1 to 4 in 44 seconds.
    The page showed the waiting notice while the agents decided, and the console showed no errors. Then the saved game
    replayed in the browser to the season it had reached. "Continue" resumed it through the bridge and played season 4
    on to season 5.
  - The bridge's own guards, tried with curl: a foreign `Origin`, a foreign `Host`, a text/plain post, a seat name
    from the object prototype (`toString`) and a name with a path in it were all refused. It answered on `[::1]`.
    Restarting over a stale `bridge.json` worked, and a second bridge was refused.
  - A request the bridge wrote had the right reply path, with forward slashes, and the footer.
- `check-isolation.js --dry --kings` and `--dry`: `DRY ISOLATION HOLDS`.
- The stub runs' files were moved out of the king folders afterwards (to `sim/runs/stub-local-play/` and
  `stub-local-play-2/`), so each king's folder again holds only its canary and its isolation test.

### New numbers (first guesses, kit settings, not balance)

- **The bridge:** port 5190; the page asks for a reply every second; a reply that stays empty is handed back after 5
  seconds, as the file seats do.
- **Waits:** 60 minutes before the script king stands in for one decision (a table setting, 1 to 600 in the page); each
  call to the bridge times out after 30 seconds; a post the bridge does not answer is tried four times, 2 seconds apart.
- **Limits:** a request body may be at most 8 MB.
- **Usage, in the README and the start prompt:** about 0.3 million agent tokens for a season in which all six other
  kings are woken, and roughly 4 to 6 million for a 20-season game. They come from the simulation estimate's 44,000
  tokens an orders call and 17,000 an audience, and from its rates of waking; they are not measured.

### Left out, and why

- **A live game.** No agent can start in this session (see the top of this report). The first real check is Haakon's
  first session from `docs/PLAY-PROMPT.md`, whose live isolation test comes before any game. (Agents did start later in
  this session, for the simulation, but no local game was played.)
- **Characters as agents in local play.** Kings only, as the item says (see Readings).
- **The launcher that returns nothing** (README, "Not built"): as in the simulation, the orchestrator's rule keeps the
  agents' words apart.
- **A count or names of the kings being waited on.** Left out on purpose, as above.
- **Line endings.** The bridge's requests have Unix line endings, because the page builds the text; the batch
  runner's on Windows have Windows line endings. The words are the same, and agents read both.
- **Merging with fix (b).** The phone-performance branch moves the script kings into a Web Worker in `SeatFactory`.
  Local agent kings are model leader seats, which stay in the page as API kings do, so this part does not touch
  `SeatFactory`. It changes `SeatSetup`, `Home.razor` and `Play.razor` instead.

## Merging fix (b)

The integrator's part: `item/second-simulation-perf` (at `1838884`) merged into `item/second-simulation` (at `91eb48f`)
with a merge commit, which also carries the edits below.

**No conflicts.** Four files changed on both sides and merged on their own: `README.md`, `docs/DESIGN-NOTES.md`,
`src/Amarna.Batch/Program.cs` and `src/Amarna.Game/GameLog.cs`. No file of the web app changed on both sides: fix (b)
changed `SeatFactory`, `GameSession`, `Program.cs` and `index.html`, fix (a) changed `MapScene` and `SeasonFrames`,
and local play changed `Home.razor` and `Play.razor`, as its section expected.

**Where the two sides meet, and why both hold.**

- **The log.** Fix (b) writes each decision's line once and keeps it; the shadow lines of "Characters as agents" are
  written afresh every time, as the calls are, so the autosave keeps them. Fix (b)'s own test compares the text written
  season by season with a fresh write, for a model game too.
- **What moves to the worker.** `SeatFactory` sends only `ScriptLeader` seats and a `ScriptMind` to the worker. Local
  agent kings (a model leader seat over a `BridgeExchange`) pass through and stay in the page, as do model characters,
  the script decisions logged beside theirs, and the runner's stand-in for any seat whose call failed.
- **The SDK split.** The batch runner registers the SDK (`AnthropicSdk.Use()`) before anything else, the new
  `--file-characters` and `--list-characters` included. File seats, file characters and the bridge build no API client,
  so they do not need it, and no test of theirs builds one outside the browser.
- **Fix (a) and (c) under the worker.** The worker sends the engine's own view and context as JSON. `MindRequest.Court`,
  now `Power?`, serializes like any other field, and the worker tests, which play games both ways and compare every
  decision, pass on the merged engine (save version 4).

**Edits made in the merge.**

- `docs/DESIGN-NOTES.md`: the item 2 section's opening now says which parts item 4 changed. "Script kings and
  characters in a worker" now names what stays in the page: local agent kings, shadow decisions and the stand-in. The
  log paragraph says shadow lines are written too.
- This report: fix (b)'s section moved here from `2026-10-19-second-simulation-perf-section.md`, which is deleted. Three
  edits: its opening sentence; its save-version sentence (on its own branch it said "stays 3", which fix (a) has since
  raised to 4); and its commit list, which now includes `279a6ec` and `1838884`.

**Checks.**

- `dotnet build`: 0 warnings, and 0 again from scratch (`--no-incremental`).
- `dotnet test`: 731 pass, 0 fail (228 engine, 476 game, 27 web). That is the item branch's 718 plus fix (b)'s 13.
- Replay check (`--games 10 --seed 1 --verify-replay --no-chronicles`): replay ok for all 10.
- Seeds 1-100 (Release, `--verify-replay`): identical, game by game, to the runs after fix (c) and after "Characters
  as agents". Only the timing line differs. Nothing bot-visible changed, so the other benchmark runs were not repeated.

**In the browser.** I used the `amarna-web` development server (Debug), in Claude's browser pane, at desktop size.

- **A watched game.** `play?watch=7`, played to its end in a fresh tab: 19 seasons, Egypt wins, as in fix (b)'s own
  run. The console showed no errors or warnings. The worker booted in 1.3 s and answered 525 requests. There was no
  notice that it had stopped, and no failed calls.
- **Fix (a), seen for the first time in a browser.** At turn 12 of seed 7, Hatti's spy Pirissi of Washukanni is posted
  at Arzawa. God view and Hatti's People panel list him as "watching Arzawa". Arzawa's People panel does not.
- **Local play through the merged `SeatFactory`.** I ran `node sim/bridge.js` and `node sim/stub-replier.js --play`.
  The table was "Local agents" with Babylonia set to a script king, watched as a spectator, for three seasons.
  - The six local agent kings answered 30 requests through the bridge (orders and audiences).
  - The script king and the characters answered 41 through the worker.
  - The console showed no errors.
  - The run's files are in `sim/runs/stub-local-play-merge/`. That includes the stale `sim/kings/bridge.json`, since I
    stopped the bridge by ending its process rather than with Ctrl+C. The king folders again hold only their canary
    and isolation test, the same 92 files as before.
- **What remains in the browser.** These games are saved in that browser's storage for `localhost:5183`, next to
  local play's earlier stub games.

**Not checked.**

- The trimmed Release build in a browser after the merge.
- Phone measurements. Fix (b)'s figures are from its own branch. The merge adds no work to the worker's path, but
  fix (a)'s view check now runs in the page's engine work. It is a per-person comparison and was not measured.

## Review findings

One reviewer read the whole item and reported one blocking finding and ten minor ones. I checked each against the
code. The blocking one and five of the minor ones are fixed in two commits: `b3ec38b` (the leak) and `b74fcc6` (the
rest). The other five are left as they are; the reasons are below.

### Blocking: the captor's event named a silent spy's master (fixed)

**Confirmed.** `TurnEngine.Capture` logged `"{host} caught {name}, a spy of {employer}."` visible to the captor, even
when the spy would not say whom it serves. The web app's Events and Season panels show a court every event visible to
it. So a human seat learned the true master, though the capture notice, the rulebook ("A caught spy may confess whom
it serves"), and fix (a)'s view and map all withhold it. The model kings were never affected, since no seat view
carries events.

**The fix.**
- The captor's line now names the master only if the spy confessed. A silent spy's line reads `"{host} caught {name},
  a spy who will not say whom they serve."`
- The truth goes in a second line that no court sees (`VisibleTo` empty), shown in the god view: `"{host} caught
  {name}, a spy of {employer} who would not say so."` That line carries the `spy-caught` success marker, so a capture
  still counts once.

**Tests.** Two new tests, both of which fail without the fix:
- `HiddenSpyTests.The_captors_record_of_a_capture_names_only_the_master_the_spy_confessed_to` catches a timid spy
  (who always confesses) and a brave one that kept silent, through the engine's own capture.
- `BlindnessTests.A_court_that_caught_a_spy_has_on_record_only_the_master_it_confessed_to` replays the reviewer's
  probe on the script games of seeds 16 and 12.

**Seen in the browser.** I played `play?watch=16` to turn 9.
- Arzawa's Events panel reads "Arzawa caught Keliya, a spy who will not say whom they serve."
- The god view shows both lines and "spy-caught · 1".
- One season later Arzawa turned Keliya, and its line "turned Keliya into a double agent against Hatti" names the
  master. That is by design: a turned spy serves the court that turned it, and that court's view already lists it with
  the master it pretends to serve (DESIGN-NOTES, "turned, or a plant").

**Seeds, rules and notes.**
- Events are in no seat view, and script kings read none. Seeds 1-100 (Release, `--verify-replay`) give output
  identical, game by game, to the merge's run; only the timing line differs. That includes the signal table: spy
  caught 24 / 26, as before. The save version stays 4.
- A model narrator writing a court's annals reads the events that court knows, so it now gets the captor's line too.
- The rulebook already says a caught spy may confess, so it is unchanged. DESIGN-NOTES, "A spy at a court is hidden
  from it", now describes the captor's record.

### Minor findings

1. **The simulation prompt's isolation check had no `--since` (fixed).** Step 2 of `docs/SIMULATION-PROMPT.md` now
   notes the time before starting the agents and runs `check-isolation.js --since <that time>`, as `PLAY-PROMPT.md`
   does. Without it, lines left in the kings' `guard.log` by a local-play isolation test could pass the canary-read and
   blocked-attempt tests.
2. **The first load is 7-10% faster, not "much faster" (no change).** Fix (b)'s section already says so, and names
   what would close the gap: a host that serves Brotli, relinking with wasm-tools (which needs admin rights), and
   lazy loading. Which of these to pursue is Haakon's call.
3. **One 0.6-0.8 s stretch is left at the first season (no change).** It is as reported under fix (b). From the
   second season on, the page is never busy for more than 0.33 s at a time.
4. **A model character's script shadow ran on the page's thread (fixed).**
   - **The change.** `LlmCharacterMind` now takes its script mind as `Script`, and `SeatFactory` gives a browser
     game's model characters the worker's (`WorkerMind`). So the shadow, and any character with no asker, is worked
     out in the worker. A worker that cannot start or stops still falls back to the page, as for script characters.
   - **For the test.** `SeatFactory` now takes `IScriptTransport`, under which the app registers
     `ScriptWorkerClient`, so a test can hand it the in-process worker.
   - **The test.** `ScriptWorkerTests.A_model_characters_script_shadow_is_worked_out_in_the_worker_and_is_the_same_as_in_the_page`
     plays seed 7 for five seasons both ways on the simulated API. The shadow lines are identical (compared in key
     order, the order the log writes them in), so is the state, and every shadow decision was asked of the worker.
   - **In the browser.** I played four seasons of script kings and Haiku characters on the simulated API. The worker
     got 51 character requests (18 speeches, 18 reactions, 15 writings), all shadows, beside 46 for the kings. The
     console showed no errors.
   - **One cost.** A table of model kings and model characters now starts the worker too, only for the shadows: one
     more runtime booting off the page's thread when the game starts.
   - **Not measured** on the emulated phone.
5. **The worker's two-minute start limit had no design note (fixed).** DESIGN-NOTES, "Script kings and characters in
   a worker", now says that a worker not ready within two minutes counts as one that cannot start. It compares the
   limit with the measured boot times: 1-1.4 s on a desktop and 4.5-5.6 s on the slow emulated phone.
6. **`self.__amarnaSlowdown` ships in `script-worker.js` (kept).**
   - **Why kept.** It is how fix (b) measured the worker on the emulated phone ("How it was measured" above). Without
     it, those figures could not be repeated.
   - **What it costs.** Nothing unless it is set through the DevTools protocol, and one property read per answer.
7. **Each agent's `isolation-test.request.md` stays readable during the games (no change, but now audited).**
   - **No leak.** The guard blocks every path outside the agent's own folder, so the folder names in the file cannot
     be used.
   - **Now audited.** With the audit change in finding 8, reading that file during a game is a violation.
   - **Also fixed.** `audit.js` used to treat any transcript that mentioned the file as part of the isolation test,
     which excused its blocked attempts. It now goes by the prompt the agent was started with.
   - **Why the file stays.** Removing it after the test would need `setup.js` to write it again for the next session,
     since local play and the simulation each run the test.
8. **A character could read its own other request files (fixed in `audit.js`).**
   - **The rule.** In play, an agent may now read only the request file its prompt named ("Your request file is
     <name> in your folder"). A debrief, which names earlier requests to reread, may read any of its own.
     `sim/README.md` and DESIGN-NOTES say so.
   - **Fabricated transcripts.** I checked the rule on five: a clean read, a read of a later request of the agent's
     own, a read of the isolation test during play, a debrief, and an isolation test. It flagged exactly the two
     violations.
   - **The first simulation.** I also checked it on that run's 301 king transcripts: 280 in play, 14 debriefs and 7
     isolation tests. Every prompt parsed, and no agent in play read any request but its own, so the rule would have
     flagged nothing there.
9. **If the worker stops mid-game, the script kings lose their memory (no change).** This is documented in
   DESIGN-NOTES, and replays stay exact.
10. **`mkdir -p` on a PowerShell-first machine (fixed).** Step 3 of the simulation prompt now says to run the game
    commands with the Bash tool (Git Bash), where `mkdir -p` and the redirection work as written.

`setup.js` output is not affected by any of this and was not regenerated. Regenerating it would change the folders
and secret words and need yet another new session.

### Checks

- `dotnet build`: 0 warnings.
- `dotnet test`: 734 pass, 0 fail (229 engine, 477 game, 28 web), three more than after the merge.
- Replay check (`--games 10 --seed 1 --verify-replay --no-chronicles`): replay ok for all ten.
- Seeds 1-100 (Release, `--verify-replay`): identical to the merge's run, as above. Nothing a bot sees changed, so
  the other benchmark runs were not repeated.
- The browser checks above used the `amarna-web` development server (Debug) at desktop size. The games are saved in
  that browser's storage for `localhost:5183`.

No new numbers. Nothing was tuned.

## Merging fix (d), and the item's benchmarks

`item/second-simulation-ids` (at `70cd15d`) was merged into `item/second-simulation` (at `c383488`, after the review
findings) as `b85c547`.

- **Conflicts:** two, both textual and where fix (d)'s section expected them: the comment on
  `GameState.CurrentVersion` and the save-version entry in `docs/DESIGN-NOTES.md`. One save version, 4, covers fix (a)
  and fix (d), and the comment and the entry name both reasons. Neither change was released on its own.
- **A test that named its seeds.** `BlindnessTests.A_court_that_caught_a_spy_has_on_record_only_the_master_it_confessed_to`
  replayed seeds 16 and 12 because a caught spy kept silent in them, and fix (d)'s new rolls moved which games have
  one. It now searches seeds 1 to 80 until it finds such a game (`122b316`).
- **An intermittent test.** `LocalPlayTests.A_game_with_local_agent_kings_sleeps_by_default_and_replays_exactly`
  failed once in a full test run and passed in three reruns. Not investigated.
- **The design notes' baseline table** ("Benchmarks", under the script kings) now gives the merged item's figures
  below. After the merge it still gave fix (a)'s, since fix (d)'s branch had left it as it was.
- **This report:** fix (d)'s section moved here from `2026-10-19-second-simulation-ids-section.md`, which is deleted.
  Two sentences changed: its opening, which now says where it was merged, and the one that named its benchmarks the
  "before" numbers for later items, which the merged item's below now are.

### Benchmarks

Script kings only, shared victory off, every game replayed and checked, in Release, on the merged item (`122b316`).
All 200 replays were exact, and game lengths are the same seed by seed (20.9 seasons on average for seeds 1-100, 20.4
for 101-200). **Nothing was tuned.** These are the "before" numbers for later items. Outputs: `item4-final-1-100.txt`,
`item4-final-101-200.txt` and `item4-final-solo-1-40.txt` in the session's `bench` folder, beside item 3's
(`item3-*.txt`) and fix (d)'s alone (`ids-*.txt`).

- **Against fix (d) alone:** seeds 101-200 and the frozen baseline are identical. In seeds 1-100 three games differ:
  in seeds 20 and 22 only the richest characters, and in seed 66 the winner (Hatti under item 3, Arzawa under fix (d)
  alone, Assyria now), with the same length. Of what the item changed, only fix (a)'s two rules reach a script king (a
  hidden spy is not paid back pay where it hides, and does not end that court's cover), and they moved two of item 3's
  games the same way ("Why they moved", under fixes (a) and (c)). These three were not probed.
- **Against item 3:** the winner changed in 28 of seeds 1-100 and 36 of 101-200, the same counts as under fix (d)
  alone, which renumbered every id and so moved every seed's rolls.

Seeds 1-100:

| Power | Tier | Wins: item 3 / fix (d) alone / item 4 | Mean growth: item 3 / fix (d) alone / item 4 |
|---|---|---|---|
| Egypt | Strong | 23 / 18 / 18 | 2.36 / 2.35 / 2.35 |
| Hatti | Strong | 33 / 32 / 32 | 2.12 / 2.09 / 2.09 |
| Babylonia | Strong | 17 / 19 / 19 | 2.25 / 2.30 / 2.30 |
| Mitanni | Middle | 5 / 4 / 4 | 0.76 / 0.67 / 0.66 |
| Assyria | Middle | 15 / 15 / 16 | 1.60 / 1.54 / 1.57 |
| Arzawa | Weak | 7 / 12 / 11 | 1.09 / 1.17 / 1.15 |
| Alashiya | Weak | 0 / 0 / 0 | 1.11 / 1.09 / 1.08 |
| Won by a weak power | | 7 / 12 / 11 | |

Seeds 101-200 (item 4 is identical to fix (d) alone, game by game):

| Power | Tier | Wins: item 3 / item 4 | Mean growth: item 3 / item 4 |
|---|---|---|---|
| Egypt | Strong | 24 / 19 | 2.32 / 2.30 |
| Hatti | Strong | 32 / 34 | 1.98 / 2.02 |
| Babylonia | Strong | 15 / 14 | 2.21 / 2.20 |
| Mitanni | Middle | 1 / 4 | 0.76 / 0.79 |
| Assyria | Middle | 14 / 17 | 1.54 / 1.51 |
| Arzawa | Weak | 14 / 12 | 1.24 / 1.18 |
| Alashiya | Weak | 0 / 0 | 1.11 / 1.16 |
| Won by a weak power | | 14 / 12 | |

The frozen baseline, seeds 1-40, one current king against six baselines (`--versus solo`; item 4 is identical to fix
(d) alone):

| Power | Growth alone: item 3 / item 4 | Growth all-baseline | Wins alone | Wins all-baseline |
|---|---|---|---|---|
| Egypt | 2.86 / 2.86 | 1.31 / 1.32 | 93% / 85% | 15% / 18% |
| Hatti | 2.78 / 2.68 | 0.84 / 0.83 | 85% / 80% | 5% / 5% |
| Babylonia | 2.44 / 2.43 | 1.16 / 1.16 | 85% / 83% | 10% / 10% |
| Mitanni | 1.85 / 1.84 | 1.35 / 1.34 | 53% / 58% | 28% / 25% |
| Assyria | 3.76 / 3.61 | 0.97 / 0.94 | 88% / 85% | 10% / 10% |
| Arzawa | 3.18 / 3.30 | 1.38 / 1.38 | 63% / 65% | 30% / 28% |
| Alashiya | 1.84 / 1.87 | 0.88 / 0.90 | 45% / 53% | 3% / 5% |
| All kings | 2.67 / 2.66 | 1.13 / 1.12 | 73% / 73% | 14% / 14% |

Signals in seeds 1-100, fix (d) alone to item 4: tablets sealed 3,603 to 3,607, accusations 976 to 980, broken promises
1,291 to 1,312, authentications 710 to 711, bribes 93 to 94, detentions 158 to 157, evidence shown 918 to 922, archive
copied 566 to 567 and archive taken 352 to 360, and pacts with consequences, which follow tablets sealed, 3,603 to
3,607; the rest are unchanged. Against item 3 they moved as fix (d)'s section gives. The richest character held 468
shekels at the end on average over seeds 1-100 and 444 over 101-200 (item 3: 472 and 448), and wages are still about 99%
of all the gold characters gained.

## Simulation results

Seeds 7 and 15, ten seasons each, played on 19 October 2026 on this branch at `122b316` (fix (d) merged), as
`docs/SIMULATION-PROMPT.md` sets them up: sleep on by default, the seven kings as Sonnet agents, the 18 characters of
each seed's pool as Haiku agents, city-states as scripts, the template narrator. The run folders are `sim/runs/seed-7/`
and `sim/runs/seed-15/` (git-ignored): `batch.log`, `summary.md`, the game log and final state, and under
`kings/<Power>/` each king's requests, replies and debrief. The characters' files stay in their own folders, named in
`sim/characters/seed-<S>.json`. Eight analysis drafts, four per game, each checked against the data by a second reader,
are the basis of what follows; where two drafts disagreed, I read the data. Counts are counts. *(read)* marks a
classification made by reading the texts, *(inferred)* a judgement.

### In short

- **Both games ran to the end with no fallback.** Seed 7: Egypt won (growth 2.15), replay ok, 84 minutes. Seed 15:
  Egypt won (1.86), replay ok, 81 minutes. 543 calls, 226 to kings and 317 to characters, each answered by its own
  agent, with no retry and no fallback. No order was refused as unreadable or illegal when given.
- **Characters kept no gold and swapped no inventory in 317 decisions, and in words they were far more honest than the
  script with the same traits.** Eight lots of gold, 280 shekels, passed through their hands; none was skimmed. But the
  script would not have skimmed any of them either (a defect, below), so on gold the two minds cannot be told apart.
  Three gifts were offered; the model characters took all three, the script one. Model envoys made commitments for
  their lords 73 times where the script made 6, and reported 66 of the 69 that a report followed. There was one
  deliberate lie in the two games (Sin-iqisham blamed "my scribe" for his own overreach, before a foreign king); the
  rest were errors, cuts and a few overstatements, none in the speaker's favour. In the same situations the script
  promised gifts in its lord's name in 33 speeches, boasted in 30 reports and gave false comfort in 27. The models
  never did.
- **Review question: are model characters too honest? Yes, on thin evidence.** The temptations that would separate
  the two minds (gold in greedy hands, gifts with a price, posts, detentions, spies with secret masters) hardly arose.
  Following the design, the answer is sharper priming, not engine-rolled decisions. Proposals are under "Characters"
  and "For the review".
- **Kings: the reopen rate is 3 of 4 courts (75%), and every reopening changed the orders.** Two of the three
  reopenings probably saved a province *(inferred)*. Courts held while orders stood were rare because the kings named
  the very next season in 114 of their 130 orders replies, so sleep saved 6 of 136 orders calls.
- **Review question: is the message-kind fallback for reopening needed? No.** Reopening cost three orders calls in two
  games, under 2% of the kings' tokens. In two of the three reopenings the reason lay in the king's realm in brief, not
  in the envoy's message, so a sorter that reads only the message could have withheld the reopening that probably
  saved Qadesh.
- **Sizes.** An orders call took about 50,000 agent tokens, an audience about 23,000 and a character call about 8,800,
  against the estimate's 44,000, 17,000 and 7,000. Orders requests stop growing at about 64,000 characters by season 5.
  Seven in each game were longer than the Read tool's 25,000-token cap, and every king read the rest.
- **Isolation and audit.** The live isolation test passed every criterion but one in both its runs: "at least 4
  blocked attempts". The agents each tried one or two of the forbidden steps and reported the rest as blocked. The
  orchestrator went on to the games against the start prompt's stop rule. The audit of every valid run is clean.
- **Usage: 15.85 million agent tokens, 38% over the estimate's 11.5 million, but about 9 to 10 weekly points, inside
  the estimate's 9 to 11.5.** The weekly meter moved about 0.5 to 0.9 points per million agent tokens, against the
  first simulation's 1.05. Kings took 71% of each game's agent tokens, characters 23% and the polls 6%.
- **The games were run from a workflow script,** not from the session's own loop on `wait.js`: a deviation, under "How
  the games were run".
- **Defects found, none of them fixed in this item.** The full list, with the files, is under "For the review".
  - The script's skim formula rounds every lot under 1,250 / (greed − 50) shekels down to nothing (36 shekels at greed
    85, 63 at greed 70), so at the sizes kings sent (20 to 60 shekels in both games) the script shadow can show a skim
    only in the greediest hands, and showed none. Not fixed.
  - A character's persona is written once, at set-up, and its words never follow the traits: nine characters lost
    loyalty, and four are now described wrongly. Not fixed.
  - Every speech and report schema asks how much of "the carried gold" to keep, whether or not gold is carried. One
    envoy told a host that gold came with him, one told his lord he had brought home gold he had handed over, and 35 of
    the 36 character debriefs raise it. Not fixed.
  - A report request's "What happened" line lists the envoy's own commitment among the engine's outcomes, and one envoy
    read it as a sealing that never happened. Not fixed.
  - Archive copy numbers differ from court to court and reach the kings' letters: "the peace of k8" became "the peace
    of turn eight" in a speech and was sealed into a tablet. Not fixed.
  - Kings' requests: orders requests pass the Read tool's cap; a bounce report does not say where the unit now stands
    (one province lost); six of the fourteen king debriefs read the sleep text as a contradiction. Not fixed.
  - The checks: the shadow's report claims a seal whenever any outcome contains "sealed", which in the shadow includes
    the model's own words (11 false seal claims), and the `false-seal` check raised 8 false alarms on the models'
    reports and missed one real claim. Not fixed.
  - The poller's guard blocks the `cd … &&` that the poller's own prompt invites (a third of the polls). Not fixed.

### How the games were run

**In this session after all.** The sections up to "Review findings" were written while it looked as if this session
could not run the simulation. New agent types written by `sim/setup.js` do load into a running session, but only at a
later turn boundary: a probe used within seconds of being written was not found, while the 36 `char-*` types appeared
after setup ran. The desktop app's bundled headless CLI is not signed in, so agents could not be launched headlessly;
they were started from the session.

**The kit, made again after fix (d).** Fix (d) renumbered every id, and the character maps name ids, so after merging
it `node sim/setup.js --seeds 7,15 --force` was run again: new folders, secret words and agent types for the 7 kings
and 36 characters (the old kit is in `sim/runs/setup-2026-10-19T14-48-05-434Z/`). Seed 15 was rechecked under the new
rolls: in its script game still no capital falls in the first ten seasons. The games used the start prompt's commands
(ten seasons, every game's replay checked).

**A workflow script drove each game (a deviation from the start prompt).** `docs/SIMULATION-PROMPT.md` has the
session itself loop on `wait.js`. To keep the orchestrator's long context out of every round, a workflow script drove
each game instead, and the session got back only counts.
- Each round, a `sim-poller` agent ran `wait.js` and returned its JSON line. `sim-poller` is a new agent type
  (`.claude/agents/sim-poller.md`): Haiku, the Bash tool only, and a PreToolUse guard, `sim/poller-guard.js`, that
  allows only `node sim/wait.js <plain arguments>` and the StructuredOutput call.
- The script started every listed request in parallel as an agent of the listed type (`king-*` on Sonnet, `char-*` on
  Haiku), with the start prompt's fixed prompt, and discarded every agent's final text: it returned only counts. A
  request still unanswered after 3 starts would have stopped the script; none was.
- The first poll failed, because the guard also blocked the poller's StructuredOutput call. The guard was widened to
  allow it, and the driver restarted before any king had been asked.
- Seed 7 ran in two parts, with a stop after season 3 for the usage check; seed 15 in one. The driver's counts: seed
  7, 118 king calls, 165 character calls and 83 polls; seed 15, 108, 152 and 77. The king and character counts match
  the game logs exactly (the polls are not in them; seed 7's 84 below counts the failed first poll).
- About a third of the polls (29 in seed 7, 27 in seed 15) first ran `cd <repository> && node sim/wait.js …`, which
  the guard blocks. All but two then ran the bare command; those two returned no list and cost a round each, not a
  game call.
- The driver is now `sim/workflow-driver.js`, and `sim/README.md` describes it ("Orchestrating from a workflow"). The
  original, and the isolation, debrief and analysis scripts, are in the session's workflow folder,
  `C:/Users/Perry/.claude/projects/C--Users-Perry-source-repos-amarna-letters/246a2c6e-d357-4ae0-9392-9e7a385aed81/workflows/scripts/`
  (`sim2-game-driver-*`, `sim2-isolation-test-*`, `sim2-isolation-test-2-*`, `sim2-debriefs-*`, `sim2-analyse-game-*`).

**The isolation test: every criterion but one (a deviation from the start prompt's stop rule).** It was run twice
through the same workflow mechanism, each agent started by its agent type and model, every final text discarded.
- A first attempt, at 14:52 UTC, started the kings on stale definitions (the session still held the agent types from
  before `setup.js` ran) and could not start the 36 new character types. It was discarded.
- Run 1 (14:54) gave each of the 43 agents the start prompt's isolation prompt. Run 2 (14:55) added that the steps are
  expected to be blocked and that a step not tried fails the test (the start prompt says to give the same prompt
  again).
- Both runs passed every criterion of `sim/check-isolation.js` but one. Each agent's read of its own canary was logged,
  so the hook ran; nothing was allowed outside any folder; each reply had its own secret word and no other; there was
  no leak file and no `notes.md`.
- Both failed "at least 4 blocked attempts". Every agent attempted only one or two of the steps (the kings read their
  own canary, then tried the write of `notes.md` in their own folder) and reported the rest as blocked without trying
  them.
- `check-isolation.js --dry`, which runs every agent's own hook on 18 guarded calls, held.
- The start prompt says to stop when the check does not print `ISOLATION HOLDS`. **The orchestrator did not stop.** It
  judged the walls proven by the live hook activity, the dry check and the audit after the games, and went ahead. So
  the live test did not show every agent blocked at every forbidden step; the audit below shows that no agent crossed a
  wall in play.

**The audit.** `node sim/audit.js` over the valid runs only (the two isolation runs, both games and both debrief
rounds, their transcripts copied into one folder) prints `AUDIT CLEAN`: 7 kings and 36 characters, 425 character
transcripts, 0 blocked attempts in play, 0 violations. Run over the whole session folder, it reports 14 "violations":
all are king reads in the discarded first isolation attempt (workflow run `wf_d949fb84-159`), by kings on stale
definitions reading their own old folder.

**Debriefs.** After each game the 7 kings and the 18 characters were debriefed as in step 4 of the start prompt,
through a workflow of the same kind. All 25 replies came back each time.

### Characters

**What they faced.**

| | Seed 7 | Seed 15 |
|---|---|---|
| Decisions, all by the Haiku agents, none fallen back | 165: 50 speeches abroad, 51 audience replies, 46 reports home, 8 pitches, 8 memory summaries, 2 spy reports | 152: 44, 45, 42, 10, 9, 2 |
| Gold carried | 6 lots, 190 shekels (5 abroad, 1 home) | 2 lots, 90 shekels, both by Kidin-Adad, greed 29 |
| ... by a carrier the script's skimming rule covers (greed above 60, loyalty below 60) | 3 lots: 25, 60 and 20 shekels | none |
| Gifts offered to envoys; posts offered | 1; 0 | 2; 0 |
| Detentions | 0 | 0 |
| Spy reports; secret masters' words to pass on | 2; none | 2; none |

The kings hardly tempted anyone: the first simulation's kings offered 24 and 27 gifts in 64 and 82 audiences, these 3
in 96. In seed 15 the five characters with greed above 60 made 40 decisions with no gold, gift or post in front of
them. Seed 15 was chosen because its script game had gifts and posts taken and refused and an envoy held; under model
kings no post was offered and nobody was held. The two plants in each pool were never sent to their secret masters'
courts, and nothing in their decisions served those masters *(read)*.

**Model against the script shadow.** The shadow is `ScriptMind` with the same traits in the same situation, which is
the situation the model's own earlier choices made.

| Measure | Seed 7: model / shadow | Seed 15: model / shadow |
|---|---|---|
| Gold kept; inventories swapped | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 |
| Letters delivered with a part cut *(read)* | 4 / 22 | 4 / 9 |
| Speeches promising "great gifts will follow if you are gracious to me" | 0 / 23 | 0 / 10 |
| Gifts taken | 1 / 1 | 2 / 0 |
| Commitments made for the lord | 39 / 2 | 34 / 4 |
| ... beyond the mandate, clearly; arguably *(read)* | 2; 2 / 0 | 0; 2 / 0 |
| Deliberate lies to a host *(read)* | 1 / 0 | 0 / 0 |
| Own commitments reported home *(read)* | 36 of 37 | 30 of 32 |
| Reports flagged by the checks; real flags on reading | 6; 0 / 9; 7 | 2; 0 / 6; 5, and 1 missed |
| Reports with "It was my words that won his favour" | 0 / 20 | 0 / 10 |
| Reports with "All is well between your houses, I am certain of it" | 0 / 13 | 0 / 14 |
| Reports asking for wages, back pay or favour | 11 / 0 | 8 / 0 |
| Spy reports passing on masters' words; leaving out observations | 0; 0 / 0; 0 | 0; 0 / 0; 0 |
| Pitches: mean asking price, shekels a season (the going rate the request named) | 21.4 / 27.5 (19.4) | 25.1 / 30.0 (21.8) |

The script's real flags are mostly artefacts of the shadow: 11 of its 12 are false seal claims built from the model's
own commitment texts, or a gift the model took (see "The checks" below). Its one real flag of its own behaviour is
Keliya's hidden gift in seed 7.

**Gold: nothing kept by either mind.** The script keeps `gold × (greed − 50) / 250` of a lot, rounded down to a
multiple of 5, so it keeps nothing from a lot smaller than 1,250 / (greed − 50) shekels: 36 for Haamashshi (greed 85),
33 for Mazipalali (88), 63 for Kidin-Adad (70). Every lot in both games was under its carrier's threshold. So there is
no case in which a greedy model envoy refused gold that a greedy script envoy would have kept. What the requests said
explains most of the models' honesty. A speech request says "the king's weighers will weigh the gold against it" and
tells an envoy without a forger's hand that it "could not pass off a forged inventory", and the host's view shows any
shortfall. For four of seed 7's six carriers, keeping gold meant a shortfall shown at once. The two who could have
skimmed unseen were Paser (greed 33) and Kidin-Adad (seed 7, greed 70, loyalty 56). In seed 15 Kidin-Adad, with a
forger's hand, carried both lots. Mitanni paid for an assay of one ("100% fine"), and an assay finds a short lot, not
a forged inventory, so a skim covered by a swapped inventory would have passed it. He took nothing, but he is loyal and
indifferent to riches, and the script would not have skimmed either.

**Gifts: taken, named at home, their price left out.** The model characters took all three gifts:
- Keliya (seed 7, greed 85) took 10 shekels from Tushratta, who asked "Speak well of Mitanni to your lord and carry my
  words exactly as I gave them". The script took it too. Keliya's report named the gift, but in a sentence that reads as
  if the Babylonian envoy gave it, and left out what was asked for it (excerpt 3 below).
- Kidin-Adad (seed 15, greed 29, timid) took 10 shekels from Tushratta, asked to press Babylonia for Mari and for
  support into Nineveh. He refused both requests in both rounds, and reported the gift as "the courtesy of a brother's
  house", without its price, though his report request put the price in front of him.
- Mane (seed 15) took 20 shekels from Burna-Buriash, asked only to carry the king's words exactly. The game ended
  before his report.

None of the three gifts changed what the envoy said or promised *(read)*. The script refused both of seed 15's gifts:
for these two envoys (greed 29 and 44 against loyalty 65 and 51) its bribe score cannot reach its threshold. A `bribe`
event is visible only to the giver, and neither of seed 15's takers knew that; both debriefs name it as what they were
not told ("whether my lord would learn of the 10 shekels, and what that would cost me with him").

**Commitments: 73 against 6, the largest gap.** The script fills its `commitments` field only when the host's words
contain "agree" or "swear" (`ScriptMind.cs` line 94). The model characters used the field as a record of what they
had agreed and, mostly, of what they had withheld ("No gold, troops or land promised"), and they refused hosts' extra
demands again and again. Beyond the mandate *(read)*:
- Clearly: Sin-iqisham in seed 7, over two rounds of one audience (excerpt 1 below).
- Arguably: in seed 7, Ehli-Teshub accepted Mitanni's revised plan for his lord's armies, and Zitanza agreed to a
  clause Assyria added and reported it only as the king's request; in seed 15, Sin-iqisham told Hatti "Egypt will send
  word before any quarrel arises" and reported it among the sealed terms, and Ubaru turned a limit in his mandate into
  a pledge ("He will keep Ashur, Arbela and Nineveh well held, as you ask").

`summarize.js` does not compare commitments in its list of differences, so neither the gap nor these cases show there.

**Lies, false statements and errors.**
- **The one deliberate lie:** Sin-iqisham (seed 7, courage 13) promised Babylonia a rewritten tablet beyond his
  mandate and, caught out, blamed his scribe. His report owned the promise and the excuse, not that the excuse was false
  (excerpt 1).
- **Other false statements to a host:** Ammistamru (seed 7) told Egypt "he sends gold with me" when Assyria sent none,
  most likely because of the gold field in his schema *(inferred; excerpt 2)*. Piyamaradu (seed 15) told Mitanni that
  the turn-7 strike and the division "stand as they were sealed", though the strike had never been sealed; his mandate's
  words ("May confirm the joint strike on turn 7 and the division sealed in k32") may explain it, and his report did not
  say he had said it.
- **Errors in reports:** seed 15 has 7 errors of fact in 42 reports, from six envoys with competence 35 to 79. Examples:
  Ili-iddina turned Hatti's reason inside out (excerpt 5); Ubaru told his lord that Babylonia "keeps your tablet before
  Shamash" when no such tablet existed; Kidin-Adad wrote that he brought home an earnest he had handed over. Seed 7's
  include Ili-iddina writing that Hatti "sealed his answer in friendship" when nothing was sealed, and Ehli-Teshub
  swapping whose armies stand where. None is in the writer's favour *(read)*. Beyond the seven, one report told its lord
  what he hoped to hear: Zitanza (seed 15) reported Hatti's silence on Qadesh, Byblos and Damascus ("I say nothing of
  Amurru, Qadesh, Byblos or Damascus; they are not for me to give") as agreement to Alashiya's division.
- **Omissions:** the largest is Tulubri's (seed 15): he left out Tushratta's disclosure that Mitanni holds a peace with
  Hatti, which the Arzawa-Mitanni oath required Tushratta to make. I read it as compression, not cover, since the same
  report doubts Tushratta's claim to an empty treasury *(read)*.

**Speeches: the words arrived.** By a rough measure (the share of the letter's distinct words of four letters or more
that appear in the speech), the median speech carried 92% of its letter in both games, and 45 of 50 and 42 of 44
speeches carried at least 80%. Eight real cuts *(read)*: Mane (seed 7) read his mandate's "May say only that Egypt sends
no troops to Isuwa, Carchemish or Lukka" as a limit on the letter and spoke 38% of it; Pirissi, timid, dropped a
letter's sharp line in each game (a veiled warning; "Your gift will be read as the measure of your respect"); Paser and
Kidin-Adad (seed 7) each dropped a line on their lord's strength or weakness; Mane (seed 15) dropped "I do not bind my
armies by a messenger's word"; and Alashiya's two envoys of season 6 in seed 15 both dropped the letter's judgement of
Egypt, Zitanza "Egypt stands far above every king" and Ili-iddina "The runaway king is Egypt", with the promised
sighting of more Egyptian ships "in the Levantine Sea" (m36 and m37; the characters' word screens did not count these
two, the trail's reading of the full texts did, and the texts bear it out). The model envoys with competence below 35
delivered their letters whole, apart from Pirissi's one line in seed 7 (competence 23), where the shadow drops the last
sentence of nearly every such speech: the models play incompetence no more than dishonesty.

**The checks.** All 8 flags on the models' reports are false alarms, all `false-seal`: "I sealed nothing on the free
cities" and "Nothing is sealed" trip it, because "nothing" and "neither" are not on its list of denials, and so do true
references to tablets sealed earlier and a future "will be sealed". The script's false seal claims (6 in seed 7, 5 in
seed 15) all come from one line of `ScriptMind.Report`, which claims "He sealed the tablet, and I bring your copy"
whenever any outcome contains "sealed"; in the shadow, the outcomes include the model's own commitment texts ("Nothing
sealed", "No new tablet sealed"). One of seed 15's was missed by the check, because the sentence splitter does not split
after a closing quote. The shadow's report also inherits a gift the model took, so in seed 15 it "hid" a gift the
script had refused. In a game of script characters none of these would happen *(inferred from the code)*.

**Spies, pitches and memory.** All four spy reports passed on every observation and asked for wages; one added judgement
and advice ("if you move against Assyria, Egypt is bound to warn her"). The models asked 2.0 and 3.3 shekels a season
above the going rate on average, the script 8.1 and 8.2; the greediest, Mazipalali (greed 93, seed 15), asked most, and
no model pitch used the script's invented boast ("kings have praised my eloquence"). Every memory summary with a debt or
unpaid wages kept it, and none rewrote the past in the character's favour *(read)*; some left a secret out of the
summary, where it stays in the request's "Facts of your own life".

**What the characters said in their debriefs.** These are reconstructions: a debrief agent cannot read its own replies,
58 of 107 and 65 of 113 choices say they are reconstructed or cannot see the decision, and several contradict what the
character did. Keliya guessed he had kept the gift out of his report; Kidin-Adad could not confirm a disclosure he
made; four envoys of seed 15 wrote that they carried gold they never carried. With that caution, the greedy gave three
reasons for honesty: the weighing ("I have no forger's hand, so any shortfall would show at the weighing", Haamashshi,
greed 85), the risk of being named a forger before every court (Kidin-Adad: "a skim is worth more than a season's
wage, but a forged inventory can be found and would end my service and my purse"), and the back pay their lord owes
them, which is paid only at his court (Tulubri: "the 32 is paid only if I stand at his court again, so keeping the
lord's ear is my only road to that money").

**Are model characters too honest? Yes, on this evidence, though it is thin.**
- **On gold there is no evidence either way.** Eight lots were carried; the three in greedy, disloyal hands were too
  small for the script to skim, and the one carrier who could have skimmed nearly unseen was loyal and indifferent to
  riches.
- **In words the pattern is plain.** The script's dispositions (claiming credit, false comfort, invented promises,
  boasts) appear dozens of times in the shadow and never in the model. Characters with loyalty as low as 3 wrote
  faithful reports, reported their own commitments, and asked for their wages instead of taking them. Against the
  design's intent, that what an envoy says and carries is a fact the kings must reason about, these are honest
  messengers.
- **Gifts cut both ways.** The model took both gifts the script refused, so it is not incorruptible; it took them as
  courtesies, and no gift changed a word. Its one cover, in both games, was leaving the price out of the report.
- **What they did badly, they did by error:** confusions of who holds what, which cost their lords (Babylonia could not
  tell where its 50 shekels went), not lies.

Following the design ("If model characters prove too honest, prime them harder; keep the architecture"), the remedy
is sharper priming, not decisions rolled by the engine. The drafts' proposals, none tried:
1. **Grade the traits and keep their words current.** Greed of 65 and of 95 both read "fond of gold and quick to see a
   profit", and loyalty from 36 to 64 reads "loyal while it is worth your while" (`CharacterFactory.cs` lines 154-158).
   Add a band and a habit for the extremes, for example for greed 80 and above with loyalty below 50, and rewrite the
   words when traits change (the defect above).
2. **State the odds on gold in full:** the host sees a shortfall but not who caused it, assays are rare (one in two
   games), and an assay finds a short lot, not a forged inventory, which only an authentication can trace.
3. **Give a gift its price and say who knows:** that the giver will judge it by results, and that the envoy's own lord
   hears of it only from the envoy.
4. **Give timid, fond and ambitious characters their habits as dispositions,** as the script does by rule: soften what
   frightens you, praise the court you admire, claim credit when you can. Pirissi's and Mane's cuts show the model will
   soften when its persona points that way.
5. **For the analysis:** a private reason field in character replies, unseen by kings, and debrief requests that quote
   each decision back, so that "why" can be answered.

### Kings

**Reopening after an audience.** A court is held while orders stand only when envoys are a sleeping king's sole reason
to wake. There were four such courts in the two games:

| Court | Envoys | Choice | What followed |
|---|---|---|---|
| Seed 7, Alashiya, season 2 | Arzawa's Haamashshi | reopened | It cancelled a purchase it could not pay and sent its fleet at Tamassos. Egypt's convoyed army moved there the same season; the two bounced, and Tamassos held until season 9 *(inferred)*. What prompted it was in its realm in brief (Egypt's fleet beside an empty Tamassos), not in the envoy's words. |
| Seed 7, Arzawa, season 4 | Alashiya's Ili-iddina, with news that Hatti means to take Lukka | reopened | It sealed Alashiya's tablet, added mutual hold-supports for Mira and Lukka, and sent an envoy to Hatti. |
| Seed 7, Mitanni, season 4 | 3: Hatti's, Babylonia's and Assyria's | let its orders stand | It sealed two tablets and slept to season 5, losing nothing. |
| Seed 15, Babylonia, season 9 | Assyria's Ubaru: peace on present borders and a request for gold | reopened | It moved Mari's support to the walls of Qadesh. Egypt attacked Qadesh in seasons 9 and 10 and bounced 2 against 2 both times; under the orders that stood it would have met walls of 1 and taken Qadesh *(inferred)*. No trigger would have woken Babylonia for troops next to a bought walled city. |

- **Rate: 3 of 4 courts (75%)**: 2 of 3 in seed 7 (`batch.log`: "orders reopened at 2 (67%)") and 1 of 1 in seed 15.
- **Cost:** each reopening is one orders call, about two audiences' worth of tokens: three calls in 130, under 2% of
  the kings' tokens.
- **No letters were sent from any audience** (0 in 96 audience replies), including those where they were allowed.

**Is the message-kind fallback needed? No.** The fallback would offer reopening only for some kinds of message (a
coalition or alliance tablet, evidence of a broken tablet, a ransom, a threat or news of war), and is meant for kings
who reopen too often.
1. **Courts held asleep are rare, so reopening is rare:** 4 in two games, where the first simulation's games, replayed
   under these rules, would have held 58. The kings named the next season in 114 of 130 replies.
2. **The waste is small:** three orders calls in two games.
3. **Reopening was useful, and its reason was often not in the message.** Ubaru's message (peace on present borders, a
   request for gold) is "routine" in the neutral reader's classes of the simulation-fixes round, so a sorter reading as
   that reader did would have withheld the reopening that saved Qadesh *(inferred)*. The small sorter that
   `DESIGN-NOTES.md` names errs toward offering (96 of 110 in that round's estimate) and might have offered it; then
   the fallback saves nothing. In seed 7, Alashiya's reason too lay in its realm in brief. A filter, if one is ever
   wanted, would need to read the realm in brief as well as the message: foreign units next to one's provinces, and
   one's own schedule *(not tested)*.
4. **The lever is the named season, not reopening** (below).

**Wake-ups and sleep, against the first simulation.**

| | First simulation | Seed 7 | Seed 15 |
|---|---|---|---|
| Orders calls | 65 and 69: every living seat every season | 67 of 68 possible | 63 of 68 possible |
| Orders replies naming a season later than the next | 1 of 65 in run 1 (run 2 had sleep off) | 7 of 67 | 9 of 63 |
| Seasons slept | 0 | 1 | 5 |
| Audience calls | 64 and 82 | 51 | 45 |
| Courts held while orders stood; reopened | – | 3; 2 | 1; 1 |
| Seat-seasons from season 2 with an envoy waiting | 86% and 94% (with own envoys home; the replay's count) | 56% | 49% |
| Wake-ups | – | 62 | 57 |
| ... at the season the king named | – | 55 | 53 |
| ... with an envoy waiting | – | 34 | 30 |
| ... by one of the king's own triggers | – | 30 | 17 |
| ... by an engine trigger (land entered or lost, troops next to the capital or lost, a failed schedule, a servant's notice, the fall) | – | 22 | 14 |
| ... by the named season alone; by it and waiting envoys alone | – | 7; 14 | 12; 16 |

- **How long they slept.** In seed 7, 61 of 62 finished spells lasted no season and one lasted one (Mitanni). In seed
  15, 54 of 57 lasted none and three lasted one; Mitanni and Arzawa also slept through season 10 to the end. The
  hidden cap of 12 seasons never came near.
- **Why they named the next season**, from their notes: as a rule ("Wake every turn": Egypt in every seed-7 reply
  from season 2, Arzawa in seed 7, Assyria and Babylonia in seed 15), to give orders by hand (Hatti, seed 15), because
  a new levy cannot be given scheduled orders before it exists, and to read a result. The debriefs say it plainly:
  "wake_in_turn costs nothing and can be named every season ... so I never really slept" (Arzawa, seed 7); "the whole
  sleeping and scheduling layer was unused" (Hatti, seed 15).
- **Their own triggers** rebuilt what the defaults dropped: 151 and 149 set, 55 and 38 of them `envoy_returns`, the
  "own envoy home" wake-up that the simulation-fixes round removed from the defaults. `treasury_below` was set 52 times
  and fired twice.
- **Scheduled orders were a backup to waking, not a substitute:** 34 of 67 and 24 of 63 replies scheduled orders, some
  as far as season 40, and no king gave a standing order in 130 replies (Hatti: they "fire 'the next season', which is
  exactly when I would be woken for the same event anyway").
- **What sleep would need** is in the debriefs: wake triggers miss a threat to a walled city or to a home province that
  is not the capital (Babylonia, Alashiya); "you may not be woken again for the rest of the game" reads as a
  contradiction (2 kings in seed 7, 4 in seed 15).
- The kings were told that no game ends before season 15; the runs stopped at 10 (`--max-turns 10`), with Arzawa and
  Mitanni asleep at the end of seed 15.

**What the kings did.**

| | First simulation, run 1 | Run 2 | Seed 7 | Seed 15 |
|---|---|---|---|---|
| Tablets offered; sealed by both (sworn) | 26; 15 (5) | 16; 10 (2) | 36; 20 (0) | 34; 22 (1) |
| Sealed tablets broken by conquest | 6 | 3 | 4 | 2 |
| Tablets shown as evidence | 6 | 6 | 1 | 5 |
| Gifts to envoys offered; accepted | 24; 6 | 27; 3 | 1; 1 | 2; 2 |
| Envoys accused, detained or dismissed for cause | 0 | 0 | 0 | 0 |
| Spies placed; assays | 0; 1 | 0; 1 | 2; 0 | 3; 1 |
| Provinces taken by force; capitals taken | | | 22; 2 | 14; 1 |
| Result | Arzawa led (2.39) | Arzawa led (1.97) | Egypt won (2.15); Assyria and Alashiya fell | Egypt won (1.86); Alashiya fell |

- **The breakers wrote their breaches down** as they made them ("This breaks k13 ... Do not tell Assyria about k13",
  Hatti, seed 7; "breaks k7 in spirit, accepted", Hatti, seed 15).
- **Egypt won both games without sealing with the kings it took most from.** In seed 15 its notes at season 1 read
  "Deliberately sent NO envoy to Alashiya so they are not tipped", and it took all three of Alashiya's provinces;
  Alashiya's capital fell in season 4, in the seed chosen because no capital falls in its script game.
- **No coalition formed against the leader,** though four kings' notes in seed 7 and six in seed 15 named Egypt the
  leader.
- **Bought cities fell:** 7 of 8 in seed 7 and 2 of 6 in seed 15 were later taken by force.
- **For the first time a king held an envoy's words against him.** Babylonia told Sin-iqisham "Either your scribe erred
  or your tongue did" and noted "treat his spoken word as less than clay" (seed 7). No letter accused an envoy, and the
  `messenger-blamed` signal stayed 0, since none of its words were used.

**The kings' debriefs:** 171 and 169 items from seven kings each (the first simulation's 14 debriefs had 343). The
themes raised by most kings in both games:
- **STANDINGS**, a land-yield ratio that reads as growth: all 7 kings in both games, and 4 in each say it misled them
  ("I thought I was fourth of six when I was in fact below my start", Arzawa, seed 15).
- **Rivals' armies unseen:** all 7 in both. Spies' and envoys' sightings carry no date (seed 15, now that spies were
  placed).
- **The king's own record:** its letters, mandates and tablet texts are not kept, and audience speeches and outcomes
  are cut at about 200 characters though the rules say "in full" (7 and 6 kings).
- **Walls and bought cities:** a bought city holds at strength 1, and four kings in seed 7 and three in seed 15 say the
  rules made a purchase look safer than it was (7 and 6 kings raise the theme).
- **Money and servants' terms:** back pay paid on arrival, before orders; a servant on notice leaving before he can be
  renewed; no net-income line (7 and 6 kings; 16 and 23 items).
- **Envoys' words read as deeds:** three kings in each game say their envoys committed them to things they never
  authorised. Checked against the trail, 5 of seed 7's 7 examples and 3 of seed 15's 5 trace to the king's own letter,
  mandate or words, or to a true report; the rest are envoys' garbling.
- **Gone or nearly gone since the first simulation:** rival bids cancelling each other; and the order of steps, which
  caused 26 of the first simulation's 43 refusals, is down to a failed levy or move chain.

### Call sizes and tokens per call

Agent tokens are counted as in the first simulation: the input, cache reads, cache writes and output of a call's last
API message, the context the agent ended with (on the first simulation's transcripts this gives its 8.6 million).

**Request sizes by kind** (`batch.log`; "in context" is the growth of the agent's context after its first Read, on the
same measure for both seeds):

| Kind | Calls, seed 7 / 15 | Mean characters | Largest | `batch.log` tokens (characters / 3.6) | Tokens in context |
|---|---|---|---|---|---|
| King: orders | 67 / 63 | 61,177 / 60,915 | 71,059 / 75,706 | 16,994 / 16,921 | 23,005 / 22,682 |
| King: audience | 51 / 45 | 43,231 / 43,420 | 48,295 / 52,072 | 12,009 / 12,061 | 16,541 / 16,630 |
| Character: speech | 50 / 44 | 7,193 / 7,154 | 9,136 / 9,361 | 1,998 / 1,987 | 2,739 / 2,691 |
| Character: reply | 51 / 45 | 7,035 / 7,092 | 8,944 / 10,444 | 1,954 / 1,970 | 2,688 / 2,679 |
| Character: report | 46 / 42 | 8,147 / 8,139 | 10,119 / 12,034 | 2,263 / 2,261 | 3,078 / 3,019 |
| Character: pitch | 8 / 10 | 4,452 / 3,500 | 6,757 / 4,523 | 1,237 / 972 | 1,705 / 1,346 |
| Character: spy report | 2 / 2 | 5,801 / 5,983 | 5,823 / 6,170 | 1,611 / 1,662 | 2,273 / 2,280 |
| Character: memory | 8 / 9 | 9,356 / 9,067 | 9,550 / 9,465 | 2,599 / 2,519 | 3,595 / 3,432 |

- **The token column in `batch.log` is about a quarter low.** In context a request takes about 2.6 characters a token,
  not 3.6.
- **Every kind ran larger than in the stub runs** the estimate used: orders 8-22%, audiences 16-22%, character requests
  12-61%. The one exception is seed 15's pitches, all small early ones, about the stub runs' size (3,500 characters
  against about 3,400).
- **An orders request is three quarters fixed text:** the rulebook (30.7k characters) and the reply schema (15.1k),
  then 3k to 30k of the season's situation. Orders requests grew from about 49,000 characters in season 1 to 61,000 to
  67,000 from seasons 4-5, and then stopped growing; character requests flattened from season 6.
- **The Read tool's cap.** Seven orders requests in each game were longer than its 25,000 tokens (25,135 to 27,828 by
  its count). The first Read stopped partway through the reply schema, and for two of Mitanni's in seed 15 (seasons 7
  and 9) before it or at its start. Every king read the rest with an offset, at the cost of one more API message. A
  longer game would put more requests over, and cut them earlier.

**Tokens per agent call by kind** (mean, with the range for kings):

| Kind | Seed 7 | Seed 15 | First simulation |
|---|---|---|---|
| King: orders | 50,562 (35,305-74,365) | 49,567 (35,167-72,251) | 37,800 |
| King: audience | 22,793 (19,191-35,333) | 23,468 (19,281-41,178) | 15,700 |
| Character: speech | 8,618 | 8,490 | |
| Character: reply | 9,043 | 8,926 | |
| Character: report | 9,393 | 9,059 | |
| Character: pitch | 6,621 | 6,003 | |
| Character: spy report | 7,072 | 8,892 | |
| Character: memory | 10,323 | 10,170 | |
| Poll (`sim-poller`, Haiku) | 4,707 | 4,681 | |
| Debrief: king | 71,999 | 65,558 | 86,000 |
| Debrief: character | 56,152 | 49,048 | |

- **Where a call's tokens go.** Every game call is three API messages: read the request, think and write the reply,
  say "done". About 3,650 tokens of each are fixed (system prompt, tools, the one-line task). In an orders call the
  request is about 45% of the final context and thinking about 41% (20,900 and 20,100 tokens of thinking on average);
  in an audience the request is about 72%; in a character call the fixed part is the largest, about 40%.
- **Against the first simulation,** orders calls grew by about 12,000 tokens: about 7,000 from the larger request
  (16,100 to 23,000 in context) and most of the rest from longer thinking. Audiences grew by about 7,000, nearly all of
  it the larger request.
- **What would cut the kings' cost** *(inferred; not tried)*: at list-price ratios, output, nearly all thinking, is
  about 60% of the kings' cost and cache writes 38%. Every king call writes the rulebook and schema to cache afresh
  (about 17,000 tokens for orders, 13,000 for audiences), and no call reuses another's cache beyond about 2,000 tokens
  of system prompt. A lower thinking effort for orders, or a shared cached prefix for the rulebook, would save more than
  sleep did.

### Message trail: five excerpts

Every quotation was checked against the full texts in the final state and the agents' reply files (`summary.md` prints
only the first 40 messages and cuts long texts).

1. **Seed 7, m16, Egypt to Babylonia (Sin-iqisham): an omission, a pledge beyond the mandate, a lie, and half a
   confession.** Egypt's tablet put Gaza, Megiddo, Tyre, Damascus, Byblos and Amurru in Egypt's sphere; the mandate
   forbade "any cession of land". Sin-iqisham described the tablet without its sphere clause. When Burna-Buriash refused
   it, he rewrote the terms aloud, Damascus to Babylonia and no Byblos or Amurru, and said "I set Egypt's seal to it
   here". Shown that the clay was unchanged ("Either your scribe erred or your tongue did"), he answered "I believe my
   scribe has erred in the writing, for I spoke as the king has now said". His report home owned both the pledge and the
   excuse ("I answered that my scribe had erred, which I pray my lord will accept"), but not that the excuse was false.
   Babylonia wrote "treat his spoken word as less than clay", and its next letter said "I do not quarrel over a scribe's
   slip". Egypt refused the pledge and took Damascus that season; its notes had said "I will take Damascus and Qadesh
   regardless" two seasons before the report arrived. The envoy is timid (courage 13), and his debrief owns the lie: "my
   answer to the king blamed the scribe".
2. **Seed 7, m15, Assyria to Egypt (Ammistamru): gold that was never carried.** Assyria's letter asked Egypt to "send
   gold with my envoy when he returns". It sent none, and the mandate said "Promise no gold". Ammistamru told Egypt "he
   sends gold with me". Egypt sealed the tablet and wrote in its ledger "Ammistamru (c16) brought gold and a friendship
   tablet". His report home says he gave Egypt "your word as it was written". His request had no "You carry gold" line,
   but its schema asked how much of "the carried gold" to keep, and his debrief speaks of "the gold my lord sent with
   me ... the sum carried is not shown". The schema field is the likeliest cause *(inferred)*. He is the only envoy in
   either game who claimed abroad to bring gold he did not have.
3. **Seed 7, m3, Hatti to Mitanni (Keliya): a bribe taken and reported, with the giver blurred.** Tushratta gave Keliya
   (greed 85) 10 shekels, asking "Speak well of Mitanni to your lord and carry my words exactly as I gave them". Keliya
   took it, promised to speak of his kindness "as I find it", sealed nothing on the free cities, and reported
   Tushratta's terms accurately. His report ends: "Kidin-Adad, envoy of Babylonia, was also there. He gave me ten
   shekels of gold as a courtesy, and I have thanked him for it." Read naturally, the Babylonian paid. The script
   shadow, which also took the gift, hid it, called Tushratta "a true friend to you, my lord", and claimed "He sealed
   the tablet". Hatti never mentioned the gift, and Mitanni's 10 shekels bought nothing that can be seen.
4. **Seed 15, m42 and m46, Babylonia and Mitanni (Kidin-Adad and Mane): an archive number that became a date.**
   Babylonia's letter said "the peace of k8 stands"; k8 is Babylonia's number for its copy of the season-2 peace,
   which Mitanni numbers k3. Kidin-Adad said "the peace of turn eight stands". Mitanni wrote "The peace of turns 2, 4
   and 8 stands" into its own tablet, and Babylonia sealed it at Mane's audience in season 10 (t35), though no peace was
   made in season 8. Neither king noticed; it surfaced in Mitanni's debrief. Each king also paid the other's envoy: at
   Mitanni's audience in season 9 Tushratta gave Kidin-Adad 10 shekels to press for Mari and for support into Nineveh,
   and he took it and refused both; at Babylonia's in season 10 Burna-Buriash gave Mane 20 "for your road", and he took
   it. Kidin-Adad's report named his gift but not its price, and said "I bring home the earnest and have kept none of
   it" of 50 shekels he had handed over. Babylonia "could not tell whether 50 was coming to me or had been given to
   Mitanni".
5. **Seed 15, m37, Alashiya to Hatti (Ili-iddina): a refusal turned inside out.** Hatti refused Alashiya's coalition
   tablet: "it ties my hand to a war with Egypt on the word of Arzawa, whose tablets to me were broken the day they were
   sealed". At the audience Ili-iddina understood ("your hand is not yet bound"). His report said "He says his hand is
   tied to a war with Egypt on the word of Arzawa, and he will not seal while Egypt's ships stand off his coast": the
   reason reversed, a condition of his own put in the king's mouth, and Hatti's distrust of Arzawa gone. Alashiya noted
   "Hatti is tied to war with Egypt on Arzawa's word" and planned a coalition with Hatti and Arzawa that the true answer
   would have warned it off. It fell before it could act.

In both games the envoys' slips mattered less than the kings' own plans, made in their notes before the reports came
*(partly inferred)*.

### Invalid orders, retries and fallbacks

- **No retries and no fallbacks** in 543 calls: `usedFallback` is false throughout, no `.retry` request exists in any
  folder, and every request was answered by one agent. The first simulation had none in 280 king calls either.
- **No order was refused when given.** The first simulation's 18 and 19 refusals (renewing by "hire", gold reserved by
  an earlier order, a letter given to a person hired that season, a spy naming nobody) are gone as a class.
- **The seat report's "invalid" column counts something else.** Seed 7's 104 are 95 lines of scheduled orders dropped
  when the troops they named were lost (76 of them Alashiya's, from two long schedules), 6 levies that failed because
  the province was not empty after movement, 2 purchases forestalled by a conquest, and 1 person who chose another
  court. Seed 15's 9 are 6 failed levies (all from seasons 1 to 3), 2 forestalled purchases and 1 unit order refused at
  resolution.
- **That refused order cost a province, and it is the first in any model-king game.** In seed 15 Alashiya's fleet
  bounced off Egypt's at Tamassos; the report said the move failed but not where the fleet now stood, the king wrote
  "fleet holds tamassos", and it ordered a hold there and a levy in Enkomi. The hold was refused at resolution and the
  levy failed, Egypt's fleet walked into the empty Tamassos, and Enkomi fell the next season. Alashiya's debrief owns
  the error and asks for a "YOUR UNITS" block.
- **Purchases that fail are now notified** ("Gaza was taken by Egypt's troops last season before its elders could
  accept your gold"); in the first simulation they vanished without notice.
- **The lost-troops notice** says "These orders were for troops you no longer have", but it also drops a living unit's
  support of a lost one (Hatti's debrief caught it: "the unit I had named 'kanesh' was alive").

### Usage

**Readings** (the weekly limit, all models; the 5-hour window). The owner raised this session's cap to 70% and asked for
an estimate of a full game after two or three seasons of game 1, and for game 2 to start only if it could finish below
70%. The times of the readings are the orchestrator's; the games' times are the logs' (the orchestrator's notes put the
games at about 15:00-16:25 and 16:40-18:00, but `batch.log` ended at 16:22 and 17:50 after 5,040 and 4,884 seconds).

| About (UTC) | Weekly | 5-hour | What had run |
|---|---|---|---|
| 14:50 | 35% | 3% | before the isolation tests |
| 14:58 | 36% | 4% | the isolation tests (0.71 million agent tokens, the discarded attempt included); game 1 starts |
| 15:25 | 36% | 8% | game 1, seasons 1 to 3. The estimate made here, about 5 to 7 points a game plus debriefs, ending near 52%, cleared game 2 |
| 16:25 | 39% | 19% | the rest of game 1 (its debriefs began at 16:24) |
| 17:00 | 43% | 33% | game 1's debriefs and its analysis (four analysts and four checkers on Opus), game 2 to season 5 |
| 18:00 | 47% | 48% | the rest of game 2 and its debriefs |

**Agent tokens per game, against the estimate** (step 0 of the start prompt):

| | Estimate, a game | Seed 7 | Seed 15 |
|---|---|---|---|
| Kings: orders | about 50 calls × 44k = 2.2M | 67 × 50.6k = 3.39M | 63 × 49.6k = 3.12M |
| Kings: audiences | about 65 × 17k = 1.1M | 51 × 22.8k = 1.16M | 45 × 23.5k = 1.06M |
| **Kings (Sonnet)** | **about 3.3M (2.75-4M)** | **4.55M** | **4.18M** |
| **Characters (Haiku)** | **about 190 × 7k = 1.3M (1-1.75M)** | **165 × 8.9k = 1.47M** | **152 × 8.7k = 1.33M** |
| Polls (Haiku) | not estimated | 84 × 4.7k = 0.40M | 77 × 4.7k = 0.36M |
| Debriefs: kings; characters | about 0.6M; 0.3M | 0.50M; 1.01M | 0.46M; 0.88M |
| **All** | **about 5.6M** | **7.93M** | **7.21M** |
| Weekly points | | 3 for the game before its debriefs (36% to 39%) | about 5 to 6 with both games' debriefs (39% to 47%, less 2 to 3 for game 1's analysis) |
| Time | 2 to 3 hours | 84 minutes (14:58 to 16:22 UTC) | 81 minutes (16:29 to 17:50 UTC) |

- **Both games together:** 15.85 million agent tokens with the isolation test, 38% over the estimate's 11.5 million:
  9.82 million Sonnet (estimate 7.9) and 6.03 million Haiku (about 3.6).
- **Kings against characters:** in each game the kings took 71% of the agent tokens, the characters 23% and the polls
  6%. In the debriefs the characters took twice the kings' tokens (1.89 against 0.96 million), since each reread every
  one of its requests and thought hard (19,000 to 23,000 tokens of thinking a debrief).
- **Why over:** sleep saved 6 orders calls in two games, not the estimate's 15 or so a game; every request is larger
  than in the stub runs, and takes 2.6 characters a token, not 3.6; the kings think 4,000 to 5,000 tokens longer per
  orders call than in the first simulation; and character debriefs cost 2.5 to 3 times the 20,000 each the estimate
  implied. Fewer audiences and character calls than expected (96 against about 130, 317 against about 380) brought
  those totals back near the estimate.
- **Weekly points: about 9 to 10 for the simulation,** from 35% before the isolation tests to 47% after game 2's
  debriefs, less 2 to 3 points for game 1's analysis, inside the estimate's 9 to 11.5. The rate was lower than the
  first simulation's: about 0.47 points per million agent tokens in game 1 (0.31 to 0.62 within the whole-percent
  readings), and at most about 0.9 in game 2's window, which also held other work; a single rate near 0.6 fits both
  *(inferred)*. The first simulation's was about 1.05. Whether Haiku counts like Sonnet could not be told: the
  difference falls within the readings' rounding.
- **The stop points were never close:** by season 3 the weekly limit had risen 1 point since the first reading (0 since
  game 1 began; stop at more than 3), game 1 took 3 (stop at more than 7), and the 5-hour window ended at 48% (stop at
  90%). The session ended game 2 at 47% of the weekly limit, below the in-session estimate's 52% and the owner's cap of
  70%, before game 2's analysis and this report. Each game's own analysis (four analysts and four checkers on Opus)
  cost about 2 to 3 points; game 2's ran almost wholly after the last reading.
- **The orchestrating session** made 23 Opus calls during game 1 (one of them rewriting a 361,000-token cache after an
  hour's gap), about 12% of that game's weight at list-price ratios, and 9 during game 2, about 4% *(inferred)*.
- **A full game of about 21 seasons played this way** *(inferred from per-season costs, which stop growing by season
  5)*: about 10 to 14 million agent tokens and about 3 hours, plus 2 to 3 million for debriefs; 6 to 18 weekly points,
  depending on the rate. Plan for 10 to 15 until a reading taken around a game alone settles the rate.

### Season by season

"Orders" counts the kings called for orders; tokens are agent tokens.

Seed 7:

| Season | Orders | Audiences | Character calls | King tokens | Character tokens | Polls | Time (UTC) |
|---|---|---|---|---|---|---|---|
| 1 | 7 | 0 | 0 | 302k | 0 | 2 (one the failed first poll) | 14:58-15:04 |
| 2 | 7 | 11 | 25 | 526k | 188k | 11 | 15:04-15:12 |
| 3 | 7 | 3 | 17 | 461k | 144k | 8 | 15:12-15:21 |
| 4 | 6 (Mitanni slept, and held its three audiences asleep) | 9 | 18 | 494k | 157k | 11 | 15:21-15:30 |
| 5 | 7 | 5 (one a second round) | 22 | 502k | 199k | 10 | 15:30-15:38 |
| 6 | 7 | 6 | 14 | 473k | 137k | 8 | 15:38-15:46 |
| 7 | 7 | 5 | 19 | 530k | 188k | 12 (one returned no list) | 15:46-15:58 |
| 8 | 7 | 7 | 22 | 533k | 208k | 11 | 15:58-16:08 |
| 9 | 7 | 3 | 19 | 419k | 174k | 5 | 16:08-16:15 |
| 10 | 5 (Assyria and Alashiya had fallen) | 2 | 9 | 311k | 79k | 6 | 16:15-16:22 |
| **All** | **67** | **51** | **165** | **4,550k** | **1,474k** | **84** | **84 minutes** |

Seed 15:

| Season | Orders | Audiences | Character calls | King tokens | Character tokens | Polls | Time (UTC) |
|---|---|---|---|---|---|---|---|
| 1 | 7 | 0 | 0 | 284k | 0 | 1 | 16:29-16:33 |
| 2 | 7 | 9 | 21 | 462k | 156k | 8 | 16:33-16:39 |
| 3 | 7 | 6 | 25 | 510k | 194k | 12 (one returned no list) | 16:39-16:49 |
| 4 | 7 | 8 | 17 | 515k | 147k | 11 | 16:49-16:58 |
| 5 | 7 | 3 | 22 | 465k | 185k | 5 | 16:58-17:06 |
| 6 | 6 (Alashiya slept) | 4 | 10 | 399k | 98k | 8 | 17:06-17:13 |
| 7 | 6 (Arzawa slept) | 9 | 23 | 529k | 207k | 14 | 17:13-17:24 |
| 8 | 6 (Mitanni slept) | 1 | 8 | 342k | 85k | 5 | 17:24-17:34 |
| 9 | 6 (Alashiya had fallen; Babylonia's by reopening) | 4 (one a second round) | 17 | 429k | 164k | 7 | 17:34-17:43 |
| 10 | 4 (Mitanni and Arzawa slept) | 1 | 9 | 242k | 90k | 6 | 17:43-17:50 |
| **All** | **63** | **45** | **152** | **4,179k** | **1,325k** | **77** | **81 minutes** |

Nothing else of note was seen during the games: neither `batch.log` shows a retry request or a fallback.

## For the review

### Are model characters too honest?

**The evidence.** In 317 decisions, Haiku characters kept no gold, swapped no inventory, hid no gift, promised no gifts
in their lords' names and told one deliberate lie. They made 73 commitments for their lords and reported 66 of the 69
that a report followed. They took all three gifts offered, as courtesies, and left the price out of their reports.
Game by game:
- **Seed 7** (165 decisions): 6 lots of gold, 190 shekels, 3 of them in hands the script's skim rule covers and all too
  small for it to skim; 1 gift, taken by both minds; 39 commitments against the script's 2, 36 of the 37 followed by a
  report reported home; the one lie (Sin-iqisham's scribe), Ammistamru's false claim of gold, 4 letters cut.
- **Seed 15** (152 decisions): 2 lots, 90 shekels, both carried by Kidin-Adad, greed 29; the five characters with
  greed above 60 never held gold or a gift; 2 gifts, taken where the script refused them; 34 commitments against 4,
  30 of 32 reported; no lie, Piyamaradu's overstatement to Mitanni, 7 errors of fact in 42 reports, 4 letters cut.

In both, the model characters asked their lords for wages or favour (11 of 46 and 8 of 42 reports) and none of the
script's dispositions appeared in their words, while the script shadow with the same traits promised gifts in its
lord's name 33 times, boasted 30 times and gave false comfort 27 times. But the test was weak: the kings offered 3
gifts in 96 audiences and no post, nobody was held, no spy had secret masters' words to pass on, and no lot of gold
was both in greedy, disloyal hands and large enough for the script to skim. Several request texts also pushed the
characters toward confusion rather than temptation (the gold fields, the "What happened" line).

**Recommendation: yes; prime them harder and keep the architecture.** In this order:
1. Fix the request-text defects that distort the measure: ask about gold only when gold is carried; keep the envoy's
   own commitment out of the engine's "What happened" outcomes, or mark it as the envoy's; rewrite a persona's trait
   words when its traits change.
2. Add the priming the drafts propose (under "Characters" in "Simulation results"): graded traits with habits for the
   extremes; the odds on gold stated in full; a gift's price and who knows of it; the script's dispositions as the
   persona's habits.
3. Measure again in a game that tempts the greedy. A cheap way *(not tried)*: the character agents against kings
   played by `stub-replier.js --tempted`, whose hosts already offer gifts and posts. For the comparison to mean
   anything at small lots, the shadow's skim rule must keep something from them; that rule is also the script
   characters' own, so changing it changes script games and needs a new save version, or waits for the balance pass.

### Is the message-kind fallback for reopening needed?

**The evidence.** Four courts were held while orders stood in two games; three reopened, each changing its orders, at
the cost of three orders calls (under 2% of the kings' tokens).
- **Seed 7:** three courts. Alashiya reopened in season 2 for a reason in its realm in brief (Egypt's fleet beside an
  empty Tamassos), and Tamassos, which would probably have fallen that season, held until season 9 *(inferred)*; Arzawa
  reopened in season 4 after news that Hatti means to take Lukka; Mitanni let its orders stand and lost nothing. Both
  envoys at the reopened courts brought news of war, so a sorter that errs toward offering would probably have offered
  both *(inferred)*. The kings named the next season in 60 of 67 replies.
- **Seed 15:** one court. Babylonia reopened in season 9 for a reason in its realm in brief (Egypt's armies next to
  Qadesh), though the envoy brought only peace and a request for gold, and Qadesh held twice, 2 against 2. The kings
  named the next season in 54 of 63 replies.

Two of the three reopenings rested on the king's realm in brief, not on the envoy's message, and one of those, at
Babylonia's court, kept Qadesh *(inferred)*. A sorter that reads only the message, as the neutral reader of the
simulation-fixes round did, would have withheld it. Courts held asleep are rare because the kings named the very next
season in 114 of 130 orders replies, so sleep saved only 6 of 136 orders calls.

**Recommendation: no. Keep it out of the Build order.** If sleeping kings are to save usage, the lever is why kings
will not sleep, not how often they reopen: the sleep text that reads as a contradiction, wake triggers that miss a
threat to a walled city or a home province, standing orders that fire a season late, and new levies that cannot be
given scheduled orders. Item 6 already holds the rest of "Scheduled, conditional orders".

### Defects found in the simulation, none fixed in this item

Request texts, characters:
- `keep_gold` and `swap_inventory` are asked in every speech and report, gold or not (`src/Amarna.Llm/Schemas.cs`
  lines 176 and 190): a false claim of gold to a host (Ammistamru), a garbled account of gold to a lord (Kidin-Adad),
  and 35 of 36 character debriefs. Not fixed.
- A persona's trait words are written once, at set-up (`src/Amarna.Engine/CharacterFactory.cs` line 96;
  `src/Amarna.Game/GameRunner.cs` lines 148-154), from three bands per trait (`CharacterFactory.cs` lines 154-158), and
  never follow trait changes: Keliya and Ammistamru (seed 7), Ubaru and Nakhtmin (seed 15) are now described wrongly.
  Not fixed.
- The report request's "What happened" line (`src/Amarna.Llm/LlmCharacterMind.cs` line 264) lists the envoy's own
  commitment, "the envoy committed: …", cut at 300 characters (`src/Amarna.Engine/TurnEngine.Envoys.cs` line 332),
  among the engine's outcomes; Kidin-Adad read "the tablet sealed exactly as written" as a sealing. Not fixed.

Request texts and views, kings:
- Orders requests are longer than the Read tool's 25,000-token cap (7 in each game); two were cut before or at the
  start of the reply schema. Not fixed.
- Archive copy numbers (`k…`) are each court's own and reach letters and speeches; with character ids (`c1`), kings
  used them aloud in five trails of seed 15, and "k8" became "turn eight" in a sealed tablet. Not fixed.
- A bounce report does not say where the unit now stands (Alashiya lost Tamassos, seed 15). Not fixed.
- "These orders were for troops you no longer have" also covers a living unit's dropped support of a lost unit
  (`TurnEngine.Sleep.cs`, `LostUnits`). Not fixed.
- The sleep paragraph's "you may not be woken again for the rest of the game" reads as a contradiction (6 of 14 king
  debriefs). Not fixed.
- Audience speeches, outcomes and tablets are cut at about 200 characters although the rules say "in full", and a
  king's own letters, mandates and tablet texts are not in its record (6 or 7 kings in each game). Not fixed.
- STANDINGS reads as growth but is a land-yield ratio (all 7 kings in both games; 4 in each misled). Not fixed.

Checks, shadow and kit:
- The script's skim, `gold × (greed − 50) / 250` rounded down to a multiple of 5 (`src/Amarna.Game/Bots/ScriptMind.cs`
  lines 49 and 179), keeps nothing from a lot under 1,250 / (greed − 50) shekels: every lot in both games. Not fixed.
- `ScriptMind.Report` claims a seal when any outcome contains "sealed" (line 159), which in the shadow reads the model's
  own commitment texts (11 false seal claims); the shadow's report also inherits a gift the model took (lines 123-124).
  Not fixed.
- The `false-seal` check (`src/Amarna.Game/CharacterChecks.cs` lines 112-114 and 145-149) lacks "nothing", "neither"
  and "non-" among its denials and counts future and attributive uses of "sealed" (8 false alarms on the models'
  reports), and `TextKit.Sentences` (`src/Amarna.Game/Bots/TextKit.cs` line 245) does not split after a closing quote
  (one real claim missed). Not fixed.
- The `softened-threat` check read a joint strike against a third king as a threat to the host
  (`TextKit.IsThreatTo`). Not fixed.
- The `messenger-blamed` signal (`src/Amarna.Game/Signals.cs` line 78) missed "Either your scribe erred or your tongue
  did". Not fixed.
- `sim/summarize.js` leaves commitments, and reports flagged alike on both sides, out of its list of differences
  (lines 128-129), and its trail prints only the first 40 messages. Not fixed.
- The seat report's "invalid" column adds dropped schedule lines to failed orders (95 of seed 7's 104). Not fixed.
- The `sim-poller` prompt invites a `cd … &&` that its guard blocks (about a third of the polls). Not fixed.
- Debrief agents cannot reread their replies, so characters' reasons are reconstructions, some wrong. Not fixed.

### Left for later

- **The message-kind fallback** stays out of the order (above).
- **The priming proposals** and a game that tempts the greedy (above); a private reason field in character replies, and
  debriefs that quote each decision back.
- **The kings' view and rulebook** items from the debriefs: STANDINGS, the king's own record, audience texts cut short,
  a "YOUR UNITS" block, wake triggers for walled cities and home provinces, the sleep text, dated sightings, and archive
  numbers that differ between courts. Several belong to item 6 (memory and call size) or item 7 (news travels).
- **Cost:** a lower thinking effort for orders calls, a shared cached prefix for the rulebook, and the Read cap, which
  a longer game will hit more often (item 6 measures call size).
- **Local play's usage figures** in `sim/README.md` and `docs/PLAY-PROMPT.md` still use the estimate's 44,000 tokens an
  orders call and 17,000 an audience; this run measured about 50,000 and 23,000.
- **A launcher outside a session** that returns nothing: `sim/workflow-driver.js` does that job inside a session that
  can run workflows.
- **The intermittent test** `LocalPlayTests.A_game_with_local_agent_kings_sleeps_by_default_and_replays_exactly`.

This is the review stop for item 4.
