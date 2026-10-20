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

## The feature audit: every feature is every seat's

Lane 2 of the fix pass, on branch `item/fix-pass-bots`, after part 4 (from `7ecde28`). The builder rules ask for it "once,
at the start of the next item begun": audit every feature built so far for the script players, the way each item now
tests its own, and patch the gaps ("Every feature is every seat's", a core tenet since 20 October). No model games were
played and no model calls made: script games only.

### How it was measured

Every feature a player can use was listed from the rulebook (`Prompts.cs`), the order and reply schemas (`Schemas.cs`)
and `docs/DESIGN-NOTES.md`: unit orders, levies, purchases, cessions and gifts of troops; letters with gold, debased gold,
tablets, evidence and greetings; everything a host can do at an audience; the court (hiring, renewal, dismissal,
background checks, assays, examinations, watchmen, spies and recalls, forgeries, captives, ransoms, held envoys); and what
script characters choose (skims, swapped inventories, gifts and offers of service, commitments, softening, embellishing).
Seeds 1-100 were played with `--out` before (at `7ecde28`, which plays exactly as part 4's benchmarks) and after (at
`377269c`), and a script read the logged orders, the hosts' and envoys' replies, the trails, the events and every court's
news: how often script players used each feature, and how often it did what it was for. The script is kept with the
benchmarks (scratchpad `b2/tools-final/features.js`); its counts are for all seven kings and all 100 games together.

A feature never used, or used without success, counted as a gap; so did an order that kept failing, an exploit the
script players fell for, and a choice a competent player would not make. Each patch was then checked against the frozen
baseline (`--versus solo`, and `--focus` for single kings over 100 seeds, with each patch switched off in turn where a
king lost ground), so that no patch made the script kings weaker: improving their play is allowed, tuning the game's own
numbers is not, and none was touched.

### The audit

Seeds 1-100, all seven kings; "before" at `7ecde28`, "after" at `377269c`. Uses / successes, with what success means.

**Troops and land**

| Feature | Success means | Before | After | What was patched |
|---|---|---|---|---|
| Hold | (none needed) | 18,589 | 18,829 | |
| Move | the move succeeds | 12,697 / 6,266 | 12,665 / 6,373 | |
| Support | given (not cut or void) | 5,679 / 5,005 | 5,689 / 4,970 | |
| Convoy | the army lands | **0** | 27 / 14 | A stranded army (nothing to take by land) is worth more carried than the fleet taking that coast itself, and a fleet puts to sea next to it first (below). |
| Raise a levy | the levy stands | 603 / 367 | 627 / 401 | Provinces least likely to be attacked come first (below). |
| Disband | done | 12 / 12 | 13 / 13 | |
| Give troops | given | **0** | 11 / 11 | A troop that must go, or will desert, goes to a friend next to it instead (below). |
| Buy a city | bought | 1,340 / 982 | 1,249 / 985 | A city lately contested scores 0.6 for three seasons: failed bids (rival buyers) 351 to 253. |
| Cede a province | ceded | **0** | 18 / 9 | Land the king cannot keep goes to a friend before a rival ahead takes it (below). |

**Letters, gold and tablets**

| Feature | Success means | Before | After | What was patched |
|---|---|---|---|---|
| Send an envoy | the audience is held | 8,580 / 8,004 | 8,762 / 8,160 | |
| Send gold | delivered in full | 1,725 / 1,335 | 1,703 / 1,349 | Gifts and tribute go with the most reliable envoy (a known skimmer no longer carries the gold). |
| Debased gold (letters and gold sent back) | not found by an assay | 436 / 24 | 37 / 11 | **Used, nearly never with success:** 412 of 436 lots were found, each costing the sender trust. Now only for a friend the king trusts 0.3 or more. |
| Propose a tablet | sealed | 4,971 / 3,591 | 5,135 / 3,642 | |
| ... peace; alliance oath; coalition | sealed | 1,953 / 1,679; 376 / 280; 2,642 / 1,632 | 1,959 / 1,684; 509 / 366; 2,667 / 1,592 | |
| Show a tablet as evidence | shown | 1,027 / 961 | 1,019 / 942 | |
| Show a forgery | shown | 1 / 1 | 1 / 0 (the envoy was held) | |
| Greeting: no "brother"; deny Great King; own name first | (a slight) | 1,277; 522; 587 | 1,315; 567; 576 | |
| Greeting: none at all | (a slight) | **0** | 203 | To a hostile oath-breaker, from a king with pride above 0.8. |
| Greeting: not claiming Great King | (deference) | **0** | 37 | Tribute from a modest king (pride below 0.5); a proud host is flattered (trust + 0.05 + 0.1 × pride). |
| Threaten war | (a threat the host hears) | **0** | 151, of which 26 dropped by timid or fond envoys | A grievance from a king strong enough to back it (below). |

**Audiences (the host)**

| Feature | Success means | Before | After | What was patched |
|---|---|---|---|---|
| Seal a tablet | sealed | 3,591 | 3,642 | |
| Bribe the envoy | accepted | 269 / 89 | 403 / 95 | |
| Second exchange | held | **0** | 250 | A host that offers a gift keeps the audience open; if refused, it offers half as much again, once. |
| ... a refused bribe raised | accepted | **0** | 130 / 6 | |
| Ask the envoy for an oath | the envoy commits | **0** | 1,958 / 1,958 | Sealing a coalition or alliance, the host asks the envoy to swear (below). |
| Offer the envoy service | accepted | 765 / 137 | 816 / 137 | |
| Detain the envoy | detained | 187 / 184 | 190 / 186 | |
| Send gold back | sent | 92 / 92 | 106 / 105 | |
| Read a planted envoy's true orders | read | (not in the logs) | (not in the logs; tested) | A lull ("only of friendship"), or a threat left unsaid in its lord's real letter: trust −0.3, grudge + 1.5. |

**The court and intelligence**

| Feature | Success means | Before | After | What was patched |
|---|---|---|---|---|
| Ask for candidates | candidates come | 1,029 / 2,795 | 1,120 / 3,041 | |
| Hire | hired | 257 / 250 | 265 / 256 | People another court holds are not asked twice. |
| Renew | renewed | 653 / 653 | 678 / 678 | |
| Dismiss | done | 81 / 81 | 88 / 88 | |
| Dismiss a thief | a skimmer let go after its skim | **0** | 33 | A servant found keeping gold is let go when next at court (below). |
| Background check | a hidden fact found | 564 / 195 | 593 / 203 | |
| Assay | debasement found | 1,572 / 411 | 1,553 / 26 | Not patched: see below. |
| Examine a tablet | a forgery found | 726 / **0** | 978 / 11 | |
| ... an inventory | a forgery found | **0** | 240 / 11 (50 of the 240 forged; 7 traced) | **The owner's example.** Kings examine inventories, most often a lot that weighed light (below). |
| Watchmen | a spy caught that season | 1,322 / 5 | 451 / 5 | **A choice a competent king would not make:** the careful and rich paid every season, spies or not. Now only when spies are likely to come. |
| Place a spy | posted | 123 / 123 | 126 / 126 | |
| ... its reports; copies | arrived | 1,566; 571 | 1,147; 463 | Fewer: recalled spies (below). |
| Recall a spy | recalled | **0** | 46 / 46 (19 from fallen courts) | From a fallen court, or a long, idle watch when nobody is left at court to send. |
| Forge a tablet | forged | 4 / 1 | 3 / 1 | A hand that botched a forgery is not asked again. |
| Captive: turn; ransom (paid); execute | done | 5 / 5; 20 / 8; 1 / 1 | 3 / 3; 12 / 8; 2 / 2 | |
| Captive: release | released | **0** | 1 / 1 | A captive nobody will pay or can be deceived for, or whose ransom twice lapsed; an ally's spy. |
| Pay a ransom | paid | 9 / 8 | 8 / 8 | |
| Release a held envoy | released | 120 / 120 | 135 / 135 | Those whose king fell or dismissed them too (a known quirk). |

**Script characters (`ScriptMind`)**

| Feature | Before | After | Note |
|---|---|---|---|
| Skim gold out; home | 310; 8 | 268; 8 | Part 4. |
| Swap the inventory | 106 (0 exposed) | 84 (7 exposed and traced) | Now found by kings' examinations. |
| Take a host's gift | 89 of 269 | 95 of 403 | |
| Pass on a briber's message | 75 | 84 | |
| Go over to the host | 137 | 137 | |
| Embellish (ambitious) | 2,641 | 2,732 | |
| Soften a threat | **0** | 26 | **Never used:** script kings never threatened. Patched in the kings' letters. |
| Commit to something; beyond the mandate | **0; 0** | 1,742; 216 | **Never used:** no script host's words asked for a commitment. Patched in the hosts' words. |

**Only for sleeping seats.** Scheduled orders, standing orders, letters sent from an audience while orders stand,
reopening orders, and the seat's own wake triggers (which lane 1 removes): 0 before and after, by design. A script seat is
asked every season and gives every order fresh, so it has nothing to schedule or stand by; when it stands in for a
sleeping seat whose call failed, it plays that one season. Forcing their use would only repeat what it decides anyway.

### What was patched, in more detail

- **Inventories** (`Statecraft.Court`). In a season it examines no tablet shown to it, a king weighs up each inventory
  in its archive once, newest first, while its spare gold covers the usual floor (60 + 60 × (1 − caution)) plus twice an
  examination, and examines at most one. Kings send gold in round sums (script kings in tens), so an inventory whose
  amount is not a whole ten shekels, which is what a skimmer's forgery states, is examined with a chance of 0.5 more and
  40 shekels more (30 + 50 × caution + 40), since a forger's hand is found only with gold; gold from a court trusted below
  0.3 with 0.1 more; any other with 0.02 + 0.05 × caution. The first version examined every inventory with 0.05 + 0.15 ×
  caution, 433 examinations in seeds 1-100, and cost the small kingdoms growth against the baseline (Arzawa alone 3.03
  with it, 3.14 without, over 100 seeds); so the base chance was cut and the floor raised (Arzawa 3.13 with, 3.14 without).
- **Thieves** (`Brain.LearnOfPeople`, `Statecraft.Court`). A servant is marked when a lot it brought home weighed less
  than its inventory (the report's "[The inventory lists 45 shekels of gold; your weighers found 40 shekels.]"), when the
  king's own examination traces a forged inventory to its hand, when another court announces that an inventory it brought
  was forged by it, or when its known facts show a theft. It is dismissed once it is at court with nothing on its hands,
  never renewed while away, and the court counts itself one short.
- **Convoys** (`Tactics.Make`). A stranded army, one with nothing it could take by land this season, makes a convoy op
  worth 0.85 × value × multiplier + 60 − exposure, more than its fleet would net taking that coast itself (0.85 × gain):
  the army goes in and the fleet stays at sea. Before, every convoy op lost to the fleet's own attack on the same coast,
  so none was ever ordered. And a free fleet puts to the sea next to a stranded army's coast whose far coasts are worth
  most (at least 200), so the convoy can follow next season. Egypt now carries its army from Gaza to Enkomi, and Arzawa
  from Lukka to Tamassos. Switched off, it changes nothing measurable (Egypt alone 2.92 with, 2.86 without; Arzawa 3.03
  and 3.06; Hatti and Alashiya level).
- **Gifts of troops** (`Statecraft.Economy`). A troop that must be disbanded goes instead to a friend the king would not
  betray, whose land the troop stands in or whose land or troops stand next to it, and whose treasury (as reckoned) feeds
  it for four seasons. When nothing idle is left and the treasury cannot pay next season's upkeep, a troop that would
  desert goes the same way. Never a troop in the king's own land: land passes to whoever's troops stand in it, so the
  friend would take the province too. The first version lacked that rule, and of its 10 gifts in seeds 1-100 Hatti gave
  away an army in its own Tuwanuwa and Arzawa one in its own Mira. A king given troops or land trusts the giver more.
  Most gifts now are a dying Alashiya's last fleet, which before deserted.
- **Cessions** (`Statecraft.Cession`). Land outside the homeland, without walls or a troop of the king's, that no troop
  of his could reach, with a rival next to it or a move away who is not a friend, leads or stands at or above the king,
  and has been taking land or is hostile; and next to it the troops or land of a friend who does not lead and stays
  below the rival with it. The land is lost either way; ceded, it does not carry the rival further ahead. Land a friend
  ceded is kept: without that rule, Carchemish went round three kings in five seasons in seed 64. With the rival only
  next to it, 0 of 6 cessions stood (the rival took the land first); with a rival a move away too, 9 of 18 do.
- **Recalls, captives, held envoys** (`Statecraft.Court`, `Brain`). Spies come home from a fallen court, or after eight
  seasons at a court that no longer matters when nobody is left at court to send. A captive nobody will pay for or can be
  deceived for (learned from the refusal: "nobody is left to pay"), or whose ransom twice lapsed, is released (or
  executed by the vengeful), as is an ally's spy; this ends the known quirk of a cunning captor ordering "turn" every
  season for a captive of a fallen kingdom. A held envoy whose king fell or dismissed it is let go like any other (the
  other quirk).
- **Audiences** (`Statecraft.Host`). The second exchange, for a refused gift; the oath asked when sealing a coalition or
  alliance ("Swear to me that your lord's troops will stand with mine, as mine will stand with his."), which makes a
  script envoy with a mandate commit, within it or, if ambitious and disloyal, beyond it ("My lord will agree to all of
  it, I promise you."), and its report then owns up vaguely ("I gave him such assurances as you would wish."); a humble
  greeting read kindly; a planted envoy's true orders read darkly.
- **Letters** (`Statecraft.Letters`, `Compose`, `Greet`). A grievance from a king at least 0.9 times as strong as the
  other, with aggression + vengeance above 1, ends "If you do not withdraw, my troops will march into your land.", a
  threat the softening rule recognises; no greeting at all to a hostile oath-breaker from a king with pride above 0.8;
  tribute (now a mission of its own, scored and paid as before) from a modest king without the title Great King.
- **Choices a competent king would not make.** Debased gold only where it goes unassayed; watchmen only when the king
  leads or was attacked in the last three seasons (script kings spy on the court they make war on, or on the leader's);
  levies in the provinces least likely to be attacked first; another city while a contested one is likely contested
  again; gold carried by the most reliable envoy.

### Found, not patched

- **Levies still fail a third of the time** (226 of 627): nearly all in a homeland being overrun, where every empty
  province is threatened, and the attacker takes the one the levy was raised in. A failed levy costs nothing, so trying
  is the right play; ordering the provinces by danger moved the rate only from 39% to 36%.
- **Assays now rarely find anything** (26 of 1,553): debased gold has become rare among script kings. An assay costs 10
  shekels and is the only defence against debasement by a model or human king, so the rule stands.
- **A bribed envoy's report is believed.** "At the court of Hatti ... I saw for myself that it is so" changes what a
  script king thinks of Hatti, and nothing in its rules weighs an envoy's word against its known gifts. A check of one's
  own servants would find the hidden "Took ... from the king of Hatti" now and then; left for item 11, which gives
  characters their strategies.
- **Plants are never found.** A plant is a deep secret, found by a background check with a chance of spend ÷ 400 (6% at
  the 25 shekels script kings spend), and script kings check only candidates. Reading a plant's true orders is patched;
  finding one is left, for the same reason.
- **Fewer spy reports** (1,566 to 1,147, copies 571 to 463): the price of recalling idle spies. The solo benchmark is level.
- **Void supports rose** (325 to 378): joint blows that misfire, a known quirk, more often now that more alliances are
  sworn (alliance oaths sealed 280 to 366, after fewer debasements were found and fewer gifts soured trust).

### Benchmarks

Release, `--verify-replay --no-chronicles`. Before: `fixpass-b1-*.txt` (part 4's after); after: `fixpass-b2-*.txt`.
Every seed replayed exactly, 200 of 200, and the replay check (`--games 10 --seed 1 --verify-replay`) 10 of 10.

| Power | Seeds 1-100 before | after | Seeds 101-200 before | after |
|---|---|---|---|---|
| Egypt | 19 (2.36) | 19 (2.40) | 19 (2.31) | 18 (2.35) |
| Hatti | 30 (2.01) | 34 (2.05) | 35 (2.01) | 35 (2.02) |
| Babylonia | 20 (2.32) | 14 (2.24) | 15 (2.24) | 12 (2.21) |
| Mitanni | 3 (0.67) | 6 (0.79) | 3 (0.77) | 4 (0.69) |
| Assyria | 14 (1.60) | 18 (1.68) | 17 (1.46) | 15 (1.78) |
| Arzawa | 14 (1.25) | 9 (1.11) | 11 (1.21) | 16 (1.09) |
| Alashiya | 0 (1.10) | 0 (1.04) | 0 (1.15) | 0 (1.12) |

Wins (mean growth). Babylonia loses 6 and 3 wins, and Arzawa 5 in one set while gaining 5 in the other: within the spread
a change of play this wide gives over 100 seeds. Signals that moved, seeds 1-100 and 101-200: authentication 696 to 936
and 634 to 893; forgery-exposed 0 to 7 and 0 to 5; debasement-found 412 to 26 and 463 to 17; skim 318 to 276 and 301 to
280; inventory-swapped 110 to 85 and 105 to 110; spy-caught 21 to 16 and 22 to 21; archive-copied 571 to 463 and 504 to
457.

The frozen baseline, seeds 1-40 (`--versus solo`), growth alone / all-baseline and wins alone / all-baseline: all kings
2.67 / 1.12 and 72% / 14% before, 2.65 / 1.12 and 72% / 14% after. By king, Egypt alone 2.86 to 2.91, Hatti 2.67 to
2.61, Arzawa 3.23 to 3.10, Assyria 3.73 to 3.67. Over 100 seeds, as a further check, all kings 2.77 and 73% before and
after, and no king moves by more than 0.04 (Arzawa 3.17 to 3.13). The `docs/DESIGN-NOTES.md` benchmark table now shows the
seeds 1-40 numbers.

These are a regression check, not tuning: no number of the game's own was changed.

### New numbers (first guesses, not tuned)

- Inventories: chance 0.02 + 0.05 × caution, + 0.5 for a lot not in whole tens, + 0.1 for a court trusted below 0.3; 40
  shekels more for a light lot; only while spare exceeds the floor plus twice the cost; one examination a season in all.
- Convoys: 0.85 × value × multiplier + 60 for a stranded army; a fleet stages for coasts worth 200 or more.
- Gifts of troops: a friend whose treasury (as reckoned) feeds the troop four seasons. Trust + 0.25 for troops received,
  + 0.35 for land, each counted as a support given.
- Cessions: a rival with belligerence 0.8 or more, or hostile.
- Contested cities: × 0.6 for three seasons after a refusal.
- Second exchange: half as much again, rounded to tens, once, with spare above 150 + the first offer.
- Recalls: eight seasons at a court that no longer matters, with nobody at court. Captives: two lapsed ransoms.
- Greetings: no greeting from pride above 0.8; no title in tribute from pride below 0.5; trust + 0.05 + 0.1 × pride for a
  humble greeting. Threats: strength at least 0.9 times the other's, aggression + vengeance above 1.
- Debasement: for a friend trusted 0.3 or more. Watchmen: when leading or attacked in the last three seasons.
- A planted envoy's true orders: trust −0.3, grudge + 1.5.

### Readings taken

- **"Weighed light"** (the owner's example): a lot whose amount, by weight and by its inventory alike, stops short of a
  round ten shekels. A swapped inventory states exactly what the weighers find, so the shortfall the host can see is not
  against the inventory but against the round sum kings send. A lot lighter than its inventory needs no examination: the
  inventory is the sender's own and true, and the shortfall is plain.
- **"The same caution rule they use for sealed tablets"**: the same cost (30 + 50 × caution) and floor (60 + 60 × (1 −
  caution)), one examination a season shared with tablets shown, plus the chances above; light lots get 40 shekels more,
  since at the usual cost a skilled forger's hand is found only one time in ten or twenty.
- **Features that make sense only for sleeping seats** are reported, not forced (see above). The task's "spies (place,
  report, turn, plant)": kings cannot plant a servant (the two plants are dealt at the start), so "plant" was read as
  reading a plant's true orders and finding one; the first is patched, the second left (above).
- **Commitments and softening** are characters' choices that only kings' words call for, so they were patched in the
  kings' words: hosts ask for an oath where one belongs, and kings who can back a threat make one.
- **Cession and gifts of troops** have few sensible uses in a race for growth, since both give away score; the patches use
  them only where the land or the troop is lost to the king anyway.

### Notes for the integrator

- Commitments are now common in script games (1,958 asked for, every one answered). If lane 1 moves "the envoy committed:
  …" out of `MessageTrail.Outcomes`, `ScriptMind.Report`'s overreach line (`o.StartsWith("the envoy committed")`) needs
  the same move, as part 4's notes say; the new host words make that line live.
- `MilitaryPlan.Danger` is new (`Tactics.cs`); `Brain` keeps new memories (`Thieves`, `NoHand`, `Unclaimed`,
  `RansomLapsed`, `Posted`, `Recalled`, `BribeOffered`, `HeldElsewhere`, `Received`).
- `docs/DESIGN-NOTES.md`: the "Script kings" section (a new opening paragraph on every feature, the season outline,
  tactics, treasury, court and intelligence, letters and gifts, audiences, greetings, known quirks, the benchmark table)
  and the inventory paragraph under "Communication". The new opening paragraph refers to this audit as "The feature
  audit" in `docs/rounds/2026-10-20-fix-pass.md`.
- No save-version change: the bots' play changed, not the rules, and the fix pass is already version 5. A log keeps every
  script order and reply, so a version-5 log made before this commit replays from what it recorded.

### Checks

- `dotnet test`: 834 tests (229 engine, 577 game, 28 web), all passing; build with 0 warnings. New:
  `FeatureAuditTests` (17).
- The replay check, `--games 10 --seed 1 --verify-replay --no-chronicles`: 10 of 10; the benchmarks 200 of 200.

Commits: `377269c` (the patches, their tests and `docs/DESIGN-NOTES.md`), and this section.
