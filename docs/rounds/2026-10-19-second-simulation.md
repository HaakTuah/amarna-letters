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
