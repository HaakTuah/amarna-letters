# Build progress

One line per item: state, branch, report, and what was decided along the way ("Progress" in the builder rules,
`docs/builder-rules.md`, which also say how items are branched and merged, and when work slows for usage;
how work flows and is reviewed: `core/modules/work-flow.md` and `core/modules/reviews.md`). The order is "Build order" in the design document (copy: `docs/intent/build-order/`). An entry of the design
document keeps its title wherever it moved, so `grep -rn "Title" docs/intent` finds what an item names; a title it no
longer finds was history and is in `docs/archive/design-history.md`.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`;
the owner's standing instructions given in chat, word for word, in `docs/archive/instructions.md`.

## The polish lane

A side lane of small refinements, beside the item lane and never ahead of it (the owner, 31 October 2026: "Should we add a
polish point to each that it can spend the last credits on also?" and, to the design session's shape of it, "Yes, and
make things as refined as possible!"). Taken when the item lane's current item is merged or parked, and on the second
account until its usage is spent; on the main account the usage brake closes it first (from about 85%).
- **Next:** first **19+++c, war music a share, never the whole** (the owner, 10 November 2026, archive item 247; its
  text under Build order in the design document): a spectator hears the realm he watches, the character he follows,
  or, drifting, the world's heat in the music of the realm doing the most, never the middle of the view, and his
  music turns over calmly (archive items 248 and 249); each next piece is drawn by chance, weighted toward the mood's own; rests of silence fall between pieces. Then finds
  of its own, from the lane's report ("Finds not yet fixed"). Open from the owner's notes of 2 November
  (his words in `docs/archive/instructions.md`, item 134): the powers' land names (#403, a question for the owner).
- **Done:** the README brought up to the game as built (#256), the far-zoom edge (#259), Space and the speed keys (#293),
  the soundtracks and the Music page (#350), the soundscape (#351, #352), whose briefs are in
  `docs/archive/progress-done.md`, "Side lanes"; and from the notes of 2 November every province a proper name (#391),
  the camera to the play area's edges (#396), a seal's tap to its own city (#398), the tabs and the courts scrolled
  by wheel and drag (#397), and Follow, travel lines and borders (the lane's report); the Legends tab's powers by their
  shown names (#790) and a city-state's capital said once in the threads to watch (#791), "tap" in the orders tab's
  help as everywhere else (#794), and the Season tab's other lines capitalised and alike ones counted (#795); the music
  follows the state (19+++b, #874; report `docs/rounds/2026-11-10-music-follows-the-state.md`; god view's music
  and the draw: 19+++c, above).
- **What belongs:** whatever makes the game feel finished without changing how it plays: graphical glitches and
  inconsistencies (things drawn wrong, out of place, overlapping or flickering; the same thing drawn, named or worded
  differently in two places), as item 19++ asks first; layout at 390 px and desktop, light and dark, reduced motion,
  tap targets and contrast; typos and wording in the interface and the rulebook; errors or warnings in the console;
  slow spots that can be made faster with behaviour unchanged; the workshop check's housekeeping (files every session
  reads under about 20 KB, merged branches deleted, leftovers archived).
- **What does not:** anything that changes a rule, a number, the script kings' or characters' play, a request to a
  model, the save version or the names item 17+ will change; those go to their items.
- **How:** look for them by playing the live build, on a phone-sized screen and on desktop, through every screen and a
  whole game watched at top speed; each find is its own small PR (about half an hour), with a before-and-after picture
  and the suites green, seeds replaying exactly as before and the benchmarks unchanged, so nothing that changes play
  slips in; merged at once, listed in one line per fix under the lane in this file. Nothing is left half done: a fix not
  finished when usage ends is left unstarted, its find noted for the next session.

Fixes: one line each in `docs/rounds/2026-10-31-polish-lane.md`, "Fixes, one line each" (moved there on 1 November 2026,
"The workshop check"; new fixes add their line there), with the finds still open.

## The workshop lane

- **Trim what every session reads** (archive item 239; a routine docs lane, for Sonnet): this file back under about
  20 KB, finished items and done follow-ups moved to the archive with a pointer.
- **The shared core** (archive items 223 and 224), first among the side lanes and before the rule-file audit. The rules
  common to every project move to one public repository, `HaakTuah/agent-core` (renamed from `agent-rules`),
  and each project carries an exact copy of it under `core/`, pinned to one of its commits, generated and never edited
  by hand, as this repository treats `docs/intent/`. It comes in two layers (archive item 240): a safety floor every project takes whole and can never edit
  or leave out, and practice modules each project picks in a small manifest of its own; this game takes them all. What moves: the security baseline, the four pillars, the one inbox,
  keeping the owner's words, the roles and reviews, helpers, models and effort, the Git flow, usage, updates and "No
  description left untrue". What stays here: what the game is, its build order and builder rules, its commands and
  whatever only it has, each rule file cut to that, with pointers into `core/`. The steps: (1) the owner creates the
  repository and adds it to Claude's and Codex's GitHub access, which only he can do; (2) a fresh session the owner
  starts in the core repository at high effort writes the core from both games' rule files (it reads them, as they are
  public, and writes only to the core), from this brief: (a) read both games' rule files whole on `main`, as they stood
  before step 3; (b) a rule goes into the core
  if it holds in both games and would hold in any project, and one that differs only in names, paths or examples goes in
  once, with the difference left as a slot each project fills; a rule only one game has stays in that game; (c) every
  rule keeps its reason, and the owner's words behind the common rules move word for word into the core's own archive,
  never rewritten; (d) the four pillars hold for the core itself, so it comes out shorter than the two games' copies
  together; (e) nothing personal, as both games' `SECURITY.md` say; (f) done when a table lists every rule of both games
  and where it went (the core, one game, or dropped with its reason), and a fresh reviewer given only the two games'
  files and the core finds nothing lost. The design session then checks the result against both games before any game
  takes a copy; (3) each project, in a PR of its own, adds the copy, cuts its rule files to what is its own, and adds a
  check on every PR that the copy matches the core at its pin (a workflow, so the owner's yes in that PR); (4) from then
  on a core change reaches a project only through a sync PR in it, reviewed as any other. No session writes to more than
  one repository. Then the rule-file audit runs once on the core and once on each project's own rules. The same in
  Barkstreet Snakes. **Steps 1 to 3 are done** (step 3: `develop` dropped in #870, then this game took the core at
  `31f3d51`, as the core's `reports/2026-11-10-step-3-now.md` lists; report `docs/rounds/2026-11-10-shared-core-step-3.md`).
  Left for others: the owner sets `main`'s ruleset and deletes `develop`; the design session cuts the builder rules and
  `scripts/design-copy.py`'s `develop` lines at the source, with the passage the builder rules say twice and the two the
  core's workshop check now holds, and then `docs/builder-rules.md` goes back into the copies check's prose
  (`scripts/copies.json` leaves it out until then); then the rule-file audit. What the game does not yet do of
  the core's rules is its own queue, by way of the design session (that report, "What each game does not yet do").
- **The file-by-file review** (the owner, 2 November 2026: "Need a full review and clean up where we look at every file,
  especially the documents, and ask what does this state that it does, and does it do it? If something in it doesn't
  then it needs to be somewhere else, if anywhere at all.", then "Yes ro absolutely all pt these! Extra expertly expertly!"). A side lane, after
  the rules restructure (PR of 2 November). Every file, docs first: what does it say it is for, and does it do that?
  What doesn't belong moves to where it does, or goes; code is checked against "Split by meaning" and "Keep it lean"
  in `AGENTS.md`. The files every session reads first (`AGENTS.md`, `CLAUDE.md`, this file), then `docs/`, then the
  code, in a few PRs, each with a table of every file it covered and what happened to it, behaviour proven unchanged.
  Helpers by "Helpers: when they pay" (a Haiku search helper per folder). The builder rules and `docs/intent/` come from
  the design document, so what they need goes to the design session as a list in the PR; it condenses them at the
  next refresh.
- ~~**A pointer check and a reading-size check on every PR** (archive item 217).~~ Done as the core's, shared with
  Barkstreet Snakes (core #69): the copies workflow runs them, with this game's marks in `scripts/sizes.json`; the lane's
  own (#721) gave way to them.
- **Done so far** (2 November 2026): the progress file, the files every session reads and `docs/` (#388, #390, #392-#394,
  #444); the parity check (#443); the code: `orders.ts` (#532) and `svg-renderer.ts` (#561) split, unused imports and
  locals out (#556), engine tests on `smallWorld` (#567), the review's small finds (#568), and the splits it found:
  `prompts.ts` (#572), `schemas.ts` (#573), `seat-setup.ts` (#577), `statecraft-letters.ts` (#588). **Left:**
  `--noUnusedLocals` again (6 November 2026: `realm.ts`, `validator-armies.ts` and `tidings.test.ts` cleared, #748)
  on the files open PRs still held then: `turn/counts.ts` and `web/src/map/life.ts` (#744), and `turn/couriers.ts`,
  `turn/economy.ts`, `turn/resolve.ts` and `turn/unrest.ts` (#612). Looked at and
  left whole, each one thing whose split would mean redesigning it, not moving code: `bots/tactics.ts` (one 620-line
  `makePlan`), `llm/src/character-mind.ts` and `web/src/audio/player.ts` (one class each), `web/src/pages/Home.tsx`
  (the start screen; its saved-games card is 2.5 KB).

## Follow-ups

- **Use against ignore, the third group** (the core's `modules/game-design.md`, "Using a feature must pay"): scripts
  that always use the item's feature, played beside those that use it where it fits and those that ignore it, with
  the threshold for "by more than chance" listed as a first guess; by way of the design session, as the core's
  `reports/2026-11-10-step-3-now.md` ("What each game does not yet do") says, with the rest of that list.

- **The rule-file audit's larger moves** (the workshop check's point 6, 3 November 2026; archive item 212): (1) the
  builder rules carry what only some roles need: the model-game debrief question, the sorting of model mistakes and the
  simulation kit's start prompt belong in `sim/README.md`, moved by the design session at the design document's next
  refresh (the workshop check is gone: the core cut it, core archive 134). (2) to (4) done in #732: what waits until Codex can build is
  `docs/codex-building.md`; the slop bar is "Text a player reads" in `docs/review-guidelines.md`; 17++'s rows are in
  the archive.
- **The old copies, removed** (archive item 207): 18 of the 21 in #731. Left in `scripts/copies-baseline.json`: the
  generated `geo-fine-data.ts` (its
  script's output), and the `import type` lines `order-makers.ts` and `orders.ts` both use whole (no fix that is not a
  dodge).
- **For the orchestrator's next wake** (the owner, 3 November 2026; archive item 189): (1) done (#612). (2) The
  code-scanning alert open on `main` (the Security tab) gets a small side lane now, kept private as `SECURITY.md`, rule 9, says for a weakness whose kind the
  owner has not said: a PR that fixes it names neither the alert nor the weakness until it is merged. (3) A PR that changes
  only docs or `docs/history/` gets no Codex review (#548 and #596 had one). (4) A security review ran only if Codex's review summary shows its completed "🔒 Security Review" row ("Codex
  reviews"); report a PR that lacks it.

- **The body and the road** (the owner, 3 November 2026; archive item 187; "The body: endurance and robustness" and
  "The road he takes follows his appetite for risk" under Characters, revision 31, and "What sets a company's pace",
  revision 112): two hidden, seeded traits, endurance (the pace of lone travellers and small parties) and robustness
  (the odds wherever a character's life or health is already at risk). Both show roughly in a man's looks and sharpen
  through his record, and fees follow demand. The two share one budget (archive item 188, revision 31): seeded
  together on a line from lean and quick to broad and tough, never adding up past a ceiling (first guess 160 of 200,
  for item 18), so the build a king sees reads both at once. Where there are several roads, characters choose by appetite for risk.
  Built with the first item whose errands use them; a save version.

- **The owner's answers of 3 November, morning** (archive item 185):
  - **Held letters never lapse** (the fallback security review of #733, P2): a letter kept, never bought, or held by a
    court since fallen stays in `GameState.lettersHeld` for the rest of the game. Rare (one caught offer in 50 script
    games) and not raisable by input; a lapse that tells no court what it has not heard (a holder's fall, a buyer's) is
    the fix.
- **The owner's answers of 7 and 9 November** (archive items 234 to 237), for item 18; each is written in the design
  document, which is the spec: a captive king's realm under a caretaker (#806; Victory, "One scoreboard for every
  person"); the weight of size set by testing (#825; the same section); a resident hires a carrier (#836; Diplomacy,
  "Messengers are errands"); favour is repaid and openings stay (#841, #840; World, "Each court plays differently");
  the people fight back (#832; War, "The people defend their land").

Follow-ups done and struck are in `docs/archive/progress-done/follow-ups-done.md`, word for word (moved 3 November 2026,
the workshop check, and again on 7 November): among them the history check's lines still unclear for a reader with the editions.

- **The slop audit** (the owner, 2 November 2026; archive item 178): done kind by kind; its brief and record are in
  `docs/archive/progress-done/follow-ups-done.md`, word for word (moved 7 November 2026). **Still open, one game-wide decision:** one
  place under several names (Karkamish and carchemish, Lakisha and Lachish, Sutu and the Suteans); "season" against
  "turn"; the engine's notices giving gold in minas (the seat view turns them into shekels; the web and logs do not);
  and order names inside engine notices ("(order repay, debt d3)"). **Shares are written "15%"** wherever a player or king reads them, notices, news and reports included
  (the owner, 6 November 2026, #735; archive item 230): done, #744 (the notice-shapes guard flags "in a hundred");
  `rules-command.ts` and `rules-freedom.ts` follow once #612 and #725 merge. **In a character's own words** (the script
  kings' letters, the envoys' speech, and the models' voice guidance for letters and audiences), a share is said as
  the period said it, "a fifth", "a tenth", "the half", never "%" or "in a hundred", and the letter-shapes guard flags
  both there (the owner, 6 November 2026; archive item 232); the data a model is given keeps "%". Done: the line
  `PeriodShares` (`src/llm/src/text.ts`) in the kings' and characters' voice guidance, the guards in `letter-shapes`
  and `envoy-words` tests.

- **The owner's answers to the history check, 2 November 2026** (archive item 170), each with a new save version where
  it moves a seed:
  1-3. **Done** (save version 47; `docs/rounds/2026-11-02-history-owner-answers.md`): no starting Alashiyan debt (#476);
     the people of 1346 "Of" where they served, Akhetaten no one's birthplace (#486); every flagged guess set by the
     experts' middle (#492): Jerusalem's water outside, Arwad's cisterns, Nubia, Babylonia and Hatti's people, 175 a
     hectare, the Nile's low floods and the plateau's droughts.
  4. ~~**A governor's letter carries word of his moved seat**~~ (#480): done, `item/governor-seat-letter`; report
     `docs/rounds/2026-11-02-governor-seat-letter.md`.
  5. **A king may confront a governor his spy caught** (#502): built in item 17 ("How cities become free", revision
     344), not before.

- ~~**Every version where Dependabot sees it** (the owner, 2 November 2026). Playwright moves into `package.json` as a
  devDependency, and `.github/workflows/pages.yml` and `scripts/cloud-setup.sh` read its version from there instead of
  writing it twice; anything Dependabot still cannot read is listed in one file, checked by a monthly scheduled
  workflow that opens an `enhancement` issue when one is behind.~~ Done in #547: the list is `.github/versions.json`
  (Node, in CI and the cloud setup), checked by `.github/workflows/versions.yml` with `scripts/versions.mjs`; all three
  retired once Node became the core's one pin (core #68), which the core's own monthly check watches (core #70).

Points a review moved out of its PR, each with its reason (`core/modules/reviews.md`, point 5); struck when
fixed.

- **From #348 (17+), round 2:** (c) to (h) ~~done~~ (#404); ~~(a), (i) and a dismissed spy's stirring gold~~ (#534, issue
  #417; report `docs/rounds/2026-11-02-bug-417.md`). (b), the chiefs' lands falling in the first two seasons, is 17++'s
  and measured in its report.

## For the owner

Readings taken are in each item's report and PR, for the owner to read when he likes; nothing waits for him but what
floor rules 3 and 14 name. Issues hold [ideas](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Aenhancement)
(`enhancement`) and [bugs](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Abug) (`bug`), by
`core/modules/inbox.md`. Answered review points from before 2 November 2026:
`docs/archive/progress-done.md`.

## Use against ignore

Every item adds its numbers here: on the same seeds, scripts that use the item's features against scripts that ignore them ("Using a feature must pay" in the builder rules, 28 October 2026). While the game is incomplete a feature may not win yet; once it is feature complete (item 18) none may be left whose users do not come out ahead. Earlier items' numbers are in their reports; item 10+a's audit of every feature built so far adds them here.

The rows of done items (6c to 17++) are in `docs/archive/progress-done.md`, "Use against ignore: done items" (6c to
17+ moved 2 November 2026, 17++ on 6 November, 17++a to 17++++a and the bug fixes' rows on 7 November, "The workshop check");
new rows are added here. Where they stand:
**pays** 6c planning ahead, 7b roads, 9+b trade, 10+b borders, 11a and 11a+ money and seasons (a little), 13 command
(a little), 15 works (growth), 16 the council, 17++ (occupying, the census, governors' regions and grants, the spy's
check, remnants; the war of choice in wins); **even or barely** 7a sea play, 8 inventories, 9 authority, 10+a land
play, 11b+ hunting, 11e walls, 12 languages, 17+ holding back pay, 17++ D talk of a province's leaning; **not paying
yet, re-measure in item 18** 9 winter strokes, 9+a the economy (wins), 10 characters, 11b and 11b++ hunting, 11b+
carriers and repaying, 11+ vassalage, 11f supply through foreign land, 17 buying food and stirring, 17++ A the
ledger's script play, 17++ D a carrier caught (too rare); nothing to measure for 11d, 11f+, 13+, 14 and 17+'s names.

| Item | Feature | Users against ignorers (same seeds) | Verdict |
|---|---|---|---|
| 17b B | A captive king ransomed or put to death, and one's own ransomed (`--king-play-half`) | 0.76 growth to 0.77, 29 wins to 21, in 50 games; kings taken 1,178 times, 72 escapes, 6 deaths | Pays in wins |
| 17b C1 | A king who goes to the front without his court when his army fights where the court's couriers come late (`--field-play-half`) | 0.76 growth to 0.73, 29 wins to 21, in 50 games; kings went alone 736 times in 44 of 50 games (regression run) | Pays in wins |
| 17b C2 | Granting land, now also to a fallen realm's king or heir in exile at the court (`--grant-play-half`) | 0.79 growth to 0.75, 28 wins to 22, in 50 games; heirs in exile 124 times in 39 games, fallen realms' kings or heirs made king again 26 times in 20 games (regression run) | Pays |
| 17b D | One scoreboard of every person: no lever of its own (it changes what is counted, not what a player can do) | a character first on the board in 1 of 50 regression games, a king in 49 | No lever |
| 18 C | Commanders granted away from court, with mandates, on the slower breach (`--command-play-half`) | 0.79 growth to 0.90, 12 wins to 27, in 50 games | Pays |
| 18 E | Gifts, bribes and tribute judged by their expected return (`--gift-play-half`) | 0.79 growth to 0.85, 15 wins to 24 (seeds 1-50, with the vassal's tribute judged too); before that, 14 to 20 and 14 to 17 (seeds 101-150) | Ahead, within the noise of 50 games; part F re-measures on the full seed sets |
| 18 E | A vassal's tribute judged by the peace it buys (`--vassal-play-half`) | 0.74 growth to 0.78, 21 wins to 19 | Growth ahead, wins even |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".


| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 18 | The balance pass | in progress, in six parts (the report lists them): A (no rule names a power; temperament a setting; save version 87) merged, #828; B (the scoreboard: par refreshed, the weight of size kept at 5 while #825 waits, the land's fixed multiple kept, bold and careful counted; save version 88) merged, #830; C (length and war: the breach twice as slow, the age's length kept, Lukka's early fall to the owner as #832; save version 89) merged, #833; D (money and characters: danger money to the bold, the money report, Egypt's residents' reports to the owner as #836; save version 90) merged, #835; E (script spending as investment: gifts, bribes and tribute by their expected return, a vassal's tribute too, the spending report, openings and far gifts to the owner as #840 and #841; save version 91) merged, #839; E2 (how close the scripts' best options are, for the model budget; the shadow script beside every model, file and local-agent king, logged by kind; no save version) merged, #843; F1 (fees that fall when many wait, #837; the baseline; save version 92) merged, #845; next F2, on a fresh branch `item/balance-f2` (**pick up at the report's "Split, and where to pick up (F2)"**: the rest of the audit: every feature's use against ignore, par refreshed once more, bold and careful in the top five and twenty and the careful dying more often, win rates on seeds 1-100 and 101-200, Mitanni below par, the Great Kings' edge at weight 0), then stop for review | `item/balance-f2` | `docs/rounds/2026-11-07-balance-pass.md` |
| 18a | The world in graphs | not started | | |
| 19+ | Answers to 19's review | not started | | |
| 19++ | The visual pass | not started | | |

Done items 1 to 14 (11d to 14 moved on 30 October 2026, "The workshop check"), done items 15 to 19+++, 17a and 17+ and the side lanes (moved on 1 November 2026), done items 17++, 17++a to 17++++a and 17b (moved on 7 November 2026), and the port's findings (all handled): `docs/archive/progress-done.md`.
