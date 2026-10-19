# Round report: second agent simulation, with model characters (Build order item 4)

Specification: the Build order's item 4 in the design document's main tab, with the "Rules for the builder", "Local
play on a Claude subscription" (main tab) and "Skills are hard-coded; decisions belong to the character" (Ideas tab),
all read fresh from the live document on 19 October 2026. Branch `item/second-simulation`, built on `develop` at
`c0ff3cf`. Balance frozen; save version raised from 3 to 4 (fix (a)).

The item has two halves. First, three fixes, each with its own commit and tests: (a) the seat view showed a king
every foreign spy posted at his court, with its employer; (b) phone performance, since watching a game on a phone is
the first milestone; (c) a character with no employer and no location was given Egypt as its court. Then the second
agent simulation: the `sim/` kit extended so that envoys and spies are agents too, isolated like the kings; seed 7 and
one new seed for ten seasons with sleep on; and, before the review stop, the kit made playable for Haakon ("Local
play on a Claude subscription": a human seat in the locally running game against file-seat kings answered by
guarded, isolated king agents).

**What this session cannot do.** It cannot run the simulation itself. New agent types (`.claude/agents/*.md`) are
loaded only when a Claude Code session starts (a type added mid-session was not found), and the headless `claude`
command on this machine is not signed in. So the build part of this item is the three fixes, the kit extended so
that envoys and spies are agents, the local-play kit, and everything prepared so that Haakon can start a fresh Claude
Code session from `docs/SIMULATION-PROMPT.md` and run the two games. No agent was started and no model call was
spent: the plumbing is proved with stub repliers, small scripts that write valid replies (or none) into the request
folders. The measurements the item asks for (whether model envoys lie, skim and cover up, compared with script envoys
of the same traits; how often kings reopen their orders after an audience; wake-ups and call sizes under the new
triggers) wait for that run, and so does the review stop that reads them.

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
  first session from `docs/PLAY-PROMPT.md`, whose live isolation test comes before any game.
- **Characters as agents in local play.** Kings only, as the item says (see Readings).
- **The launcher that returns nothing** (README, "Not built"): as in the simulation, the orchestrator's rule keeps the
  agents' words apart.
- **A count or names of the kings being waited on.** Left out on purpose, as above.
- **Line endings.** The bridge's requests have Unix line endings, because the page builds the text; the batch
  runner's on Windows have Windows line endings. The words are the same, and agents read both.
- **Merging with fix (b).** The phone-performance branch moves the script kings into a Web Worker in `SeatFactory`.
  Local agent kings are model leader seats, which stay in the page as API kings do, so this part does not touch
  `SeatFactory`. It changes `SeatSetup`, `Home.razor` and `Play.razor` instead.
