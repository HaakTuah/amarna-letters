## Part 4: the script skim, and the shadow's seal claims and checks

Lane 2 of the fix pass, on branch `item/fix-pass-bots` from `0f7902c`. The owner's words: "Fix the script skim rounding
and the shadow's false seal claims and checks, under the new save version." The defects are the ones item 4's report
lists under "Checks, shadow and kit" (`docs/rounds/2026-10-19-second-simulation.md`, "Defects found in the simulation").
No model games were played and no model calls made: script games and stand-in repliers only.

### What was built

- **The skim rounding** (`ScriptMind.Kept`). A greedy, disloyal script envoy (greed above 60, loyalty below 60) keeps
  gold × (greed − 50) ÷ 250 of a lot it carries, out or home, now rounded to the nearest shekel instead of down to
  fives. So it keeps 1 to 4 shekels of a 20-shekel lot and 3 to 12 of a 60-shekel one, and something from any lot of 12
  shekels or more at greed 61. Before, it kept nothing from a lot under 1,250 ÷ (greed − 50) shekels, and the script
  kings' lots are 20 to 60 shekels (median 20): only the greediest envoys skimmed, and only lots of 40 or more. Save
  version 5 (`GameState.CurrentVersion`), with the old version 4 refused like 1 and 3 (tested).
- **A weakness found by testing it, patched.** With skims happening, every script envoy that kept gold without a
  forger's hand read its lord the host's complaint about itself: "Either your lord is mean or your messenger's hands
  are heavy with my gold" (190 of 190 such reports in seeds 1-100). An envoy that kept something now leaves out of its
  report what the host said of the weighing (`TextKit.SpeaksOfWeighing`: weighers, weight or scales, the inventory, a
  lot that came or fell short, a messenger's hands heavy with the gold). After the patch: 0 of 190. It changes no
  outcome in seeds 1-100 (the seed lines and every total are the same as without it).
- **The script report's seal claim.** "He sealed the tablet, and I bring your copy" is said only when the engine
  recorded the sealing (`MessageTrail.SealedOutcome`, now one constant used by the engine, the script and the checks),
  not whenever an outcome holds the word "sealed", which in the shadow included the model's own commitments ("Nothing
  sealed"). In script games the change is invisible, since no other outcome there holds the word.
- **The shadow's own audience** (`LlmCharacterMind.ScriptSituation`). The shadow follows the model's path, but a
  report's shadow is now written, and checked, against what the script itself chose at that audience: the gift it would
  have taken or refused (with what the host asked for it) and the gold it would have kept, with its forged inventory.
  The gift is the defect item 4 named (seed 15: the script "hid" a gift it had refused); the gold is the same artefact
  for `hid-skim`, so it is treated the same way. The engine's records are untouched (tested: same facts, same outcomes).
  With no record of the audience, as in a game resumed since, the model's situation stands.
- **The checks.**
  - `false-seal` (`CharacterChecks.ClaimsSeal`): each "sealed" or "set his seal" is read in its clause, and does not
    count when denied there or right after it ("I sealed nothing", "Nothing is sealed", "Neither king sealed"), when
    still to come or wished for ("will be sealed", "he asks that it be sealed", "if he had sealed"), when it names a
    sealed thing ("a sealed tablet", "our sealed peace", "the oath sealed before Shamash") or an earlier sealing
    ("stands as sealed", "we sealed in turn four", "(k27)", "Egypt keeps the tablet he sealed", "the tablet we sealed
    stands").
  - `TextKit.Sentences` splits after a closing quote or bracket, so a quoted denial no longer hides a claim after it
    (the claim missed in seed 15).
  - `hid-skim`: "I saw for myself" no longer owns up to a skim; "for myself" counts only after kept, took, held back,
    withheld or set aside. Found by the shadow's test: a bribed script envoy's "I saw for myself that it is so" hid its
    own skim from the check.
  - `softened-threat` (`TextKit.IsThreatTo`): a passive "warned" is a threat only when the one warned is the target
    ("you have been warned", "be warned", "consider yourself warned"). Babylonia's joint strike, "we must strike all at
    once, in the season of turn 7, before they can be warned", was read as a threat to Mitanni; the timid shadow
    dropped it and the check flagged that. The same rule decides what timid script envoys soften, so it is a rule
    change, under version 5.
  - `messenger-blamed` (`SignalDetector.BlamesMessenger`): besides a messenger's lies, his, his scribe's, his
    interpreter's or his tongue's errors count: "Either your scribe erred or your tongue did".
- **Read again with the new code,** the second agent simulation's logs give: on the models' reports, 1 `false-seal`
  flag where there were 8 false alarms, and the one left is a real error (seed 7: "He received me kindly and sealed his
  answer in friendship", when nothing was sealed); on the shadow's, no flag from its quotations of hosts, and the 11
  "He sealed the tablet" claims are lines the script no longer writes; `messenger-blamed` 1 in seed 7 (was 0), 0 in
  seed 15.

Commits: `89c2fa4` (skim rounding, version 5), `0884cf0` (checks), `1896457` (the script's seal claim and the shadow's
own audience), `2a6bd1e` (the skimmer's report), `b174338` (two more readings of "sealed" found in the recheck).
`docs/DESIGN-NOTES.md` changed in each commit with its rule (save version, script envoys' skimming and softening, the
shadow and checks, the signals).

### Every feature is every seat's: skimming in script games

Script games, seeds 1-100, at `0f7902c` (before) and at this branch's head (after), read from the final states
(`--out`):

| | Before | After |
|---|---|---|
| Lots of gold carried out; shekels | 1,639; 49,050 | 1,645; 49,180 |
| ... in hands the skimming rule covers (traits at the end) | 315 | 310 |
| Lots skimmed; shekels kept | 36; 185 | 310; 991 |
| ... hidden by a forged inventory; shortfall seen by the host | 16; 20 | 106; 204 |
| Games with a skim | 23 | 86 |
| Lots sent home by hosts, in covered hands; skimmed | 13; 0 | 9; 8 (9 shekels) |
| Reports home that read the lord the host's complaint, of those reported | 18 of 18 | 0 of 190 |
| Forged inventories exposed; skimmers later dismissed | 0; 0 | 0; 0 |
| Skimmed share of all the gold characters gained | 0.05% | 0.26% |

Usage: every lot in covered hands is now skimmed (310 of 310 out; 8 of 9 home, all 10-shekel lots, the ninth still
on the road when the game ended). Success: every skim kept its gold, and none was caught. That is not a sign of good
play on the other side:

- **Found, not patched: script kings never examine an inventory tablet**, so no forged inventory is ever exposed (0 in
  200 games before and after; `forgery-exposed` 0). Their authentication covers only tablets shown as evidence. The
  builder rules name exactly this for the audit at the start of the next item.
- **Found, not patched: no king acts on a light lot** beyond the host's complaint and a loss of trust in the sender;
  no skimmer is dismissed. Kings' reactions belong to the same audit.
- **Found, not patched: softening never fires in script games.** Script kings' letters carry no threat the rule
  recognises ("Withdraw them, and send me a fitting gift, or I will not forget it"), so in 8,004 speeches no timid or
  fond script envoy dropped a sentence, before or after. It fires in model games. A script king that never threatens
  is a script king who never uses a feature; for the audit.
- **`messenger-blamed` stays 0 in script games:** their hosts blame a messenger for gold ("hands heavy"), which the
  signal leaves out on purpose (it counts blame for words), not for words.

### Benchmarks

Release, `--verify-replay --no-chronicles`. Before: `item4-final-*.txt`; after: `fixpass-b1-*.txt` (the head before
the last commit, which changes only the checks, which no game reads; a replay of seeds 1-10 at the head gives the same
seed lines). The patch to the skimmer's report changed no total, so one "after" column serves both.

Seeds 1-100, wins (mean growth):

| Power | Before | After |
|---|---|---|
| Egypt | 18 (2.35) | 19 (2.36) |
| Hatti | 32 (2.09) | 30 (2.01) |
| Babylonia | 19 (2.30) | 20 (2.32) |
| Mitanni | 4 (0.66) | 3 (0.67) |
| Assyria | 16 (1.57) | 14 (1.60) |
| Arzawa | 11 (1.15) | 14 (1.25) |
| Alashiya | 0 (1.08) | 0 (1.10) |

Seeds 101-200: Egypt 19 to 19 (2.30 to 2.31), Hatti 34 to 35 (2.02 to 2.01), Babylonia 14 to 15 (2.20 to 2.24),
Mitanni 4 to 3 (0.79 to 0.77), Assyria 17 to 17 (1.51 to 1.46), Arzawa 12 to 11 (1.18 to 1.21), Alashiya 0 to 0
(1.16 to 1.15).

Signals that moved, seeds 1-100 and 101-200: skim 36 to 318 and 18 to 301; inventory-swapped 16 to 110 and 5 to 105;
detention 157 to 184 and 158 to 167; accusation 980 to 1,026 and 945 to 948; tablets sealed 3,607 to 3,591 and 3,554 to
3,533; broken promises 1,312 to 1,331 and 1,202 to 1,186. The skimmed share of the characters' gold, 0.0% to 0.3% and
0.2%. Every seed replayed exactly: 200 of 200, and seeds 1-10 at the head.

The frozen baseline, seeds 1-40 (`--versus solo`), growth alone / all-baseline and wins alone / all-baseline: all kings
2.66 / 1.12 and 73% / 14% before, 2.67 / 1.12 and 72% / 14% after. By king, the largest moves are Assyria alone 3.61 to
3.73 and Arzawa alone 3.30 to 3.23 (wins 65% to 63%); Egypt's all-baseline wins 18% to 15%, Hatti's 5% to 3%,
Mitanni's 25% to 28%, Alashiya's 5% to 8%.

These are a regression check, not tuning: no number of the game's own was changed. The skim share is the script
characters' play, which the builder rules let every item improve.

### New numbers (first guesses, not tuned)

- The skim share stays gold × (greed − 50) ÷ 250, rounded to the nearest shekel (halves up). The balance pass may
  change the share or add a floor.
- The words of a weighing that a skimmer leaves out of its report, listed above. They read words: "I weigh your words"
  goes too.

### Readings taken

- **"Able to skim from the lots kings actually send":** rounding to the shekel, rather than a larger share or a
  minimum, is the smallest change that does it, and keeps the formula the design notes give.
- **"non-" as a denial:** item 4's report lists "nothing", "neither" and "non-" as missing denials. "Nothing",
  "neither", "none" and "nobody" were added; "non-" was not, since "He sealed the non-aggression pact" is a real claim.
- **The shadow:** item 4 named the gift it inherits; the gold kept is the same artefact for `hid-skim`, so the script's
  own skim is used too. Everything else in the shadow's situation (what the host said, the host's choices) stays the
  model's path, as the design notes describe the shadow.
- **`messenger-blamed`:** blame of a messenger's words, lies or errors, his scribe's and his tongue's; a complaint
  about the gold he carried is not counted, so the signal keeps its meaning.

### Notes for the integrator

- Both lanes raise `GameState.CurrentVersion` to 5: keep one version 5, and merge the doc comment on it and the "Save
  version" paragraph of `docs/DESIGN-NOTES.md`, which both lanes edit. `SaveVersionTests` here asserts 5 and refuses 4.
- `MessageTrail.SealedOutcome` is new, at the top of `MessageTrail` (`src/Amarna.Engine/GameState.cs`).
- If lane 1 moves "the envoy committed: …" out of `MessageTrail.Outcomes` (part 2: the envoy's own commitment kept
  out of "What happened"), two readers here need the same move: `ScriptMind.Report`'s overreach line reads
  `o.StartsWith("the envoy committed")`, and `LlmCharacterMind.ScriptSituation` rebuilds outcomes by their prefixes
  ("kept ", "replaced the inventory with a forgery", "accepted ", "refused a gift of"). Lane 1 also edits
  `LlmCharacterMind.cs` (request texts); this lane changed only the shadow's part of it (`Shadowed`, the three
  `…Async` entry points, `Choice`, `ScriptSituation`).
- `TextKit.Sentences` now splits after a closing quote: anything of lane 1's that splits texts sees it.

### Checks

- `dotnet test`: 817 tests (229 engine, 560 game, 28 web), all passing at the head; build with 0 warnings.
- One full run failed `LocalPlayTests.A_game_with_local_agent_kings_sleeps_by_default_and_replays_exactly` (a timing
  test under load); it passed 3 times of 3 alone and in every full run since. Item 4's report lists it as
  intermittent.
- The replay check, `--games 10 --seed 1 --verify-replay --no-chronicles`: 10 of 10.
