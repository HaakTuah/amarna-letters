# Build progress

> **Paused for usage** (3 November 2026, at 83% of the week): the orchestrator's hourly check is deleted and restarts when the
> owner says "resume", from this file. On resume, each lane's entry below names its queue and its PR; the item lane picks up
> at 17+++ part E.

One line per item: state, branch, report, and what was decided along the way ("Progress" in the builder rules,
`docs/builder-rules.md`, which also say how items are branched and merged, and when work slows for usage;
how work flows and is reviewed: "How work flows" in `AGENTS.md` and "Reviews" in `docs/claude-and-codex.md`). The order is "Build order" in the design document (copy: `docs/intent/build-order/`). An entry of the design
document keeps its title wherever it moved, so `grep -rn "Title" docs/intent` finds what an item names; a title it no
longer finds was history and is in `docs/archive/design-history.md`.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`;
the owner's standing instructions given in chat, word for word, in `docs/archive/instructions.md`.

## The polish lane

A side lane of small refinements, beside the item lane and never ahead of it (the owner, 31 October 2026: "Should we add a
polish point to each that it can spend the last credits on also?" and, to the design session's shape of it, "Yes, and
make things as refined as possible!"). Taken when the item lane's current item is merged or parked, and on the second
account until its usage is spent; on the main account the usage brake closes it first (from about 85%).
- **Next, from the owner's notes of 2 November** (his words in `docs/archive/instructions.md`, item 134): by "Following,
  travel lines and borders" under Interface, Follow keeps the camera on the person, travel lines follow their roads (your
  orders' whole path, others' only as reported), and borders are strong between powers and quiet within one (after
  17++ part C merges, since it redraws the map's steps). Open from the notes' first four: the powers' land names
  (#403, a question for the owner), and army counters standing over a neighbour's seal on the whole map (the lane's report).
- **Done:** the README brought up to the game as built (#256), the far-zoom edge (#259), Space and the speed keys (#293),
  the soundtracks and the Music page (#350), the soundscape (#351, #352), whose briefs are in
  `docs/archive/progress-done.md`, "Side lanes"; and from the notes of 2 November every province a proper name (#391),
  the camera to the play area's edges (#396), a seal's tap to its own city (#398), and the tabs and the courts scrolled
  by wheel and drag (#397).
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

- **The shared core** (archive items 223 and 224), first among the side lanes and before the rule-file audit. The rules
  common to every project move to one public repository, `HaakTuah/agent-rules` (the name the design session proposed),
  and each project carries an exact copy of it under `core/`, pinned to one of its commits, generated and never edited
  by hand, as this repository treats `docs/intent/`. What moves: the security baseline, the four pillars, the one inbox,
  keeping the owner's words, the roles and reviews, helpers, models and effort, the Git flow, usage, updates and "No
  description left untrue". What stays here: what the game is, its build order and builder rules, its commands and
  whatever only it has, each rule file cut to that, with pointers into `core/`. The steps: (1) the owner creates the
  repository and adds it to Claude's and Codex's GitHub access, which only he can do; (2) a fresh session the owner
  starts in the core repository at high effort writes the core from both games' rule files (it reads them, as they are
  public, and writes only to the core), from this brief: (a) read both games' rule files whole on `main` (`AGENTS.md`,
  `CLAUDE.md`, `SECURITY.md`, `docs/threat-model.md`, `docs/claude-and-codex.md`, `docs/codex-building.md`,
  `docs/orchestrating.md`, `docs/review-guidelines.md`, `docs/developing.md`, and Amarna Letters' builder rules); (b) a rule goes into the core
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
  Barkstreet Snakes. Step 1 is the owner's.
- **A content security policy for the built app** (archive item 220), first among the side lanes, as security hardening:
  a policy in the built page (GitHub Pages sends no headers) by which it loads code only from itself and contacts only
  its own files, the AI providers on one list, and the player's own machine (`localhost`, for local models and the
  bridge), so no code in it, a package's included, can send a key or a save anywhere else. The list is one place in
  code: the settings screen offers it in place of today's free-text endpoint, and the build writes the policy from it,
  so a new provider is one line and the policy follows (Anthropic, OpenAI, Google, Mistral, Groq, DeepSeek, xAI and
  OpenRouter, which alone reaches most models). Done when a test shows the policy matches the list, model seats and the
  bridge still work on the PR's preview, and `SECURITY.md` and `docs/developing.md` point to it.
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
- **A pointer check and a reading-size check on every PR** (archive item 217), beside the copies check and protected
  like it (`SECURITY.md`, rule 3): (1) every pointer in the rule files to a file, a section or a numbered point must
  lead to one that exists, or the PR fails, saying which; forms it cannot read are listed, never guessed; (2) the files
  every session reads, each against a mark of about 20 KB (one already past it, as this file is, starts at its size
  today, a baseline that may only shrink), their total against today's, and every file past about 50 KB the PR
  changes (Step 0); a PR that crosses a mark moves the mark in the same PR and says why. The workshop check's points 2
  and 3 are then measured on every PR; its wording in the builder rules goes to the design session.
- **Done so far** (2 November 2026): the progress file, the files every session reads and `docs/` (#388, #390, #392-#394,
  #444); the parity check (#443); the code: `orders.ts` (#532) and `svg-renderer.ts` (#561) split, unused imports and
  locals out (#556), engine tests on `smallWorld` (#567), the review's small finds (#568), and the splits it found:
  `prompts.ts` (#572), `schemas.ts` (#573), `seat-setup.ts` (#577), `statecraft-letters.ts` (#588). **Left:**
  `--noUnusedLocals` again on the files open PRs held (one known: `renew` in `bots/statecraft-court.ts`). Looked at and
  left whole, each one thing whose split would mean redesigning it, not moving code: `bots/tactics.ts` (one 620-line
  `makePlan`), `llm/src/character-mind.ts` and `web/src/audio/player.ts` (one class each), `web/src/pages/Home.tsx`
  (the start screen; its saved-games card is 2.5 KB).

## Follow-ups

- **The rule-file audit's larger moves** (the workshop check's point 6, 3 November 2026; archive item 212): (1) the
  builder rules carry what only some roles need: the model-game debrief question, the sorting of model mistakes and the
  simulation kit's start prompt belong in `sim/README.md`, and the workshop check in `docs/orchestrating.md`, moved by
  the design session at the design document's next refresh. (2) to (4) done in #732: what waits until Codex can build is
  `docs/codex-building.md`; the slop bar is "Text a player reads" in `docs/review-guidelines.md`; 17++'s rows are in
  the archive. `docs/claude-and-codex.md` is still 22 KB, past the 20 KB warning: what is left is one thing (the roles,
  the reviews, Codex's setup), so it stays whole until the shared core takes its common part.
- **The old copies, removed** (archive item 207): `scripts/copies-baseline.json` lists 21, nearly all test helpers
  written again in each test (`begin`, a `Board`), and one passage of the builder rules said twice (to be fixed in the
  design document). A workshop lane removes them by pointing to one shared helper, and drops each entry as it goes.
- **A canary for Codex's code review, on resume** ("Reviews", point 5, in `docs/claude-and-codex.md`; archive item 206): the
  review guidelines moved to `docs/review-guidelines.md`, so a test PR with planted faults, one breaking a line only that
  file holds (such as "History holds"), proves Codex follows the pointer from `AGENTS.md`. Never merged.
- **#612, decided** (the owner, 3 November 2026; archive item 204): after the usage reset, a fresh session fixes the
  one case left open (a scheduled or standing order for a far unit lost out of sight is refused at once, through
  `TurnEngine.bind` and the standing-order target check), the PR is reviewed again, and it merges at a clean review.
- **For the orchestrator's next wake** (the owner, 3 November 2026; archive item 189): (1) #612 has had four Codex
  rounds, past the three that "Codex reviews" holds: no fifth; take it to escalation as that section says. (2) The
  code-scanning alert open on `develop` (the Security tab) gets a small side lane now, kept private as `SECURITY.md`, rule 9, says for a weakness whose kind the
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
  - **#591, no wording gives an envoy's hidden state away** (script characters only; a model writes its own words):
    honest script envoys at warm courts sometimes say "kindly" and "friend" too, and the bribed or frightened lines
    borrow honest wording, so no phrasing marks one state. A new save version, and a measurement that the script
    kings' trust readings still behave well.
  - ~~**#616, one clock for one road:**~~ (done, #639) a far province's report and its notices come by one function,
    the couriers' seasons from the place to the court (`wordHomeAt`), with a test that the same season's both arrive
    together. Save version 57. Report: `docs/rounds/2026-11-03-one-clock.md`.
  - ~~**#601, a fast courier, hired:**~~ (done, #641) a job whose errand is a ride to a far province of the king's: its
    report and notices come home within the season; the rider asks by what he heard a ride pays, how much sooner the
    report comes and how many rides the court asks against the free people there, and takes less down to a least. For
    item 18: the rider is never stopped on the road (a first guess). Save version 59. Report:
    `docs/rounds/2026-11-03-hired-courier.md`.
  - ~~**#618, after item 17++a:**~~ (done, #637) word of a change of hands a vassal's or ally's court saw goes by the
    road to the king it is bound to: a notice, and his map. The Great Kings hear of a change of the map every 4.3 to
    5.9 seasons (5.1 to 7.2 before); Arzawa and Alashiya, with few bonds, stay far off it. Save version 58. Report:
    `docs/rounds/2026-11-03-news-beyond-sight.md`.
  - **#592, after #543:** a caught offer is a thing held: its captor may send it on, sell it to its claimant or to the
    land's king, or keep it back.

Follow-ups done and struck are in `docs/archive/progress-done/follow-ups-done.md`, word for word (moved 3 November 2026,
the workshop check): among them the history check's lines still unclear for a reader with the editions.

- **Four more ideas from the reviews, accepted** (the owner, 3 November 2026; archive item 184):
  - ~~**#566:**~~ (done, #722) the twin canary plays each twin bound to a place at Nippur and at Dilmun (two
    seasons off, by sea), the place a parameter; it found a far levy's army in the movements notice, listed under #600.
    Report: `docs/rounds/2026-11-06-twin-second-place.md`.
  - **#543, after part D's follow-ups (#550, #553):** a caravan or trader leaving a province for the claimant's market
    carries its offer, as a traveller going that way would, and carries talk along its road; the history dossier
    cited for word travelling with goods.
  - **#539, the polish lane:** beside a followed person on the map, a small dated note ("last seen 2 seasons ago"),
    from the record the follow line is drawn from, absent while he is in sight.
  - **#578, the polish lane:** the legend's crowded-seal swatch takes its rim from `--small-rim-marked`, the map's own
    variable.

- **The Gulf's head as it stood in the Late Bronze Age** (#527; archive item 175): **done** in #523 (save version 47):
  the shore at the estuary some 140 km below Ur, the middle of the dated published lines; Ur a river port, its Gulf door 150 km
  down the Euphrates and the marshes. Still due: the full `--versus solo` run, seeds 1-40, on save version 47, with the
  next item's benchmarks (#523 measured two seeds only).

- **Five ideas from the reviews, accepted** (the owner, 2 November 2026; archive item 182):
  - **#553, into item 17++ part D (#538):** a king whose troops or people catch an offer's carrier reads the offer, as
    a caught spy's report is read ("A letter taken on the road"). Done, #576 (`docs/rounds/2026-11-02-offer-caught.md`).
  - **#550:** under NAMES CLAIMED, in the seat view, the Court section and the models' line, the season each claim was
    heard from its sealed greeting. Done, #574 (`docs/rounds/2026-11-02-names-season.md`).
  - **#554:** a short note, from its sourced basis, on each connection whose travel days are not the plain distance
    (Ur's river to the Gulf, the Ways of Horus, the Wadi Hammamat road). Done, the history lane's PR (`docs/rounds/2026-11-03-connection-notes.md`).
  - **#549, the polish lane:** a faint accent on a frontier where the seat itself sees two powers' armies on either
    side, drawn only from what it sees.
  - **#562, the polish lane:** placement and the smoke test pad each seal's box by half its stroke, so no rim touches
    a neighbouring marker.

- **The slop audit** (the owner, 2 November 2026; archive item 178): everything a player reads, checked by fresh eyes
  for the tells of machine-written text, as a side lane now.
  1. **Scope:** the rulebook and the seat view; notices, news and the season's reports; the script kings' letters and
     their envoys' speech (`src/game/src/bots/statecraft-letters.ts` and its kin), whose templates a player meets every
     season; the cast's biographies; the interface, the council and the help; the README's player text. And the
     requests that make models write (personas, letters, envoys' words): no stock phrasing a model would echo back,
     as "Requests are rules too" asks, changed only with that rule's care.
  2. **A fresh-eyes reviewer** (a helper given only the text and this brief, Opus at high effort) reads each kind
     whole and lists its worst lines, each with its tell ("Text a player reads" in `docs/review-guidelines.md`).
  3. **The builder rewrites them** in the period's voice, as "Voice of the age" under World and history describes it;
     the PR shows ten lines before and after, so the owner can set the bar.
  4. **A cheap guard after:** a test that fails when a script king's letters, or a report's lines, keep repeating one
     shape across a game.
  Each kind of text is reviewed as every review is ("Reviews" in `docs/claude-and-codex.md`), against the bar in
  "Text a player reads" in `docs/review-guidelines.md`. One PR per kind of text.
  **Done:** the script kings' letters and audience words, #558 (10; report `docs/rounds/2026-11-02-slop-audit-letters.md`;
  the words in `bots/voices.ts`, the guard and the readers' test in `src/game/test/letter-shapes.test.ts`); the
  envoys' speech, #585 (10; report `docs/rounds/2026-11-02-slop-audit-envoys.md`; `bots/envoy-words.ts`, read through
  `src/game/test/readings.ts`; #591 asks whether an envoy's wording may give away its hidden state); notices, news and the
  season's reports, #605 (10; report `docs/rounds/2026-11-03-slop-audit-notices.md`; one name per power, `pick` in
  `rules/wording.ts`; save version 60). **Next:** the owner's answer to #591 (the bribed envoy's words); then the rest in
  the order above, from the rulebook and the seat view.

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

- **Every version where Dependabot sees it** (the owner, 2 November 2026). Playwright moves into `package.json` as a
  devDependency, and `.github/workflows/pages.yml` and `scripts/cloud-setup.sh` read its version from there instead of
  writing it twice; anything Dependabot still cannot read is listed in one file, checked by a monthly scheduled
  workflow that opens an `enhancement` issue when one is behind.

Points a review moved out of its PR, each with its reason ("Reviews" in `docs/claude-and-codex.md`, point 2); struck when
fixed.

- **From #348 (17+), round 2:** (c) to (h) ~~done~~ (#404); ~~(a), (i) and a dismissed spy's stirring gold~~ (#534, issue
  #417; report `docs/rounds/2026-11-02-bug-417.md`). (b), the chiefs' lands falling in the first two seasons, is 17++'s
  and measured in its report.

## For the owner

Everything for the owner is an issue: [questions and readings](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Aquestion)
(`question`), [ideas](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Aenhancement) (`enhancement`) and
[bugs](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Abug) (`bug`), by
"Questions, readings and ideas" in `AGENTS.md`. Answered review points from before 2 November 2026:
`docs/archive/progress-done.md`.

## Use against ignore

Every item adds its numbers here: on the same seeds, scripts that use the item's features against scripts that ignore them ("Using a feature must pay" in the builder rules, 28 October 2026). While the game is incomplete a feature may not win yet; once it is feature complete (item 18) none may be left whose users do not come out ahead. Earlier items' numbers are in their reports; item 10+a's audit of every feature built so far adds them here.

The rows of done items (6c to 17++) are in `docs/archive/progress-done.md`, "Use against ignore: done items" (6c to
17+ moved 2 November 2026, 17++ on 6 November, "The workshop check"); new rows are added here. Where they stand:
**pays** 6c planning ahead, 7b roads, 9+b trade, 10+b borders, 11a and 11a+ money and seasons (a little), 13 command
(a little), 15 works (growth), 16 the council, 17++ (occupying, the census, governors' regions and grants, the spy's
check, remnants; the war of choice in wins); **even or barely** 7a sea play, 8 inventories, 9 authority, 10+a land
play, 11b+ hunting, 11e walls, 12 languages, 17+ holding back pay, 17++ D talk of a province's leaning; **not paying
yet, re-measure in item 18** 9 winter strokes, 9+a the economy (wins), 10 characters, 11b and 11b++ hunting, 11b+
carriers and repaying, 11+ vassalage, 11f supply through foreign land, 17 buying food and stirring, 17++ A the
ledger's script play, 17++ D a carrier caught (too rare); nothing to measure for 11d, 11f+, 13+, 14 and 17+'s names.

| Item | Feature | Users against ignorers (same seeds) | Verdict |
|---|---|---|---|
| #587 | Sending gold ahead to far coffers that owe or run short (`--coffer-play-half`) | 0.81 growth to 0.72, 21 wins to 29, in 50 games; 32 sends in 15 games, 24 bills unpaid in 10 | Pays in growth, not in wins: credit covers most far costs, so sending ahead seldom matters; for item 18 |
| #618 | Reading word from vassals and allies of land changing hands (`--tidings-play-half`) | 0.79 growth to 0.80, 11 wins to 9, in 20 games; 11.2 pieces of word reached the Great Kings a game | Even: the word mostly makes news of what the map already showed, sooner only where the reporter is nearer |
| #601 | Hiring a rider for a far province's report, haggling (`--ride-play-half`) | No ride in 20 games: of 6,070 Great King-seasons, 119 held land beyond a season's road home out of sight (all Hatti's), each with a report one season old, which a ride cannot better; the scenario test shows them ride, haggle and raise | Nothing to measure in script games; re-measure in item 18 if realms grow |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".


| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 17++ | What a king can count | in progress: part A (whom a province obeys) merged, #375; part B (counts, census, demands) merged, #376; part C (governors over regions, grants, the map, the audit's script finds, "taken up, never thrust on anyone", the corvée as a share #411, and script kings checking a governor's word against their spy's #459) merged, #378; #480 (a governor's letter says where he sits) in #531; part D (#431's carriers) merged, #538; then 17++a | `item/whom-a-province-obeys`, `item/counts-and-demands`, `item/governors-grants-map` | `docs/rounds/2026-11-01-whom-a-province-obeys.md`, `docs/rounds/2026-11-02-what-a-king-can-count.md`, `docs/rounds/2026-11-02-governors-grants-map.md` |
| 17++a | Something happens every season | done, #590: the pulse measure (`pulse.ts`, in every batch report); the four lands named and anchored (#403); script kings occupy land until it obeys and wage the war they choose (a map change every 5-7 seasons for the large kings, 5-15 without the war play; short of the target of 4, the limit now hearing: #618); crowns' ids registered; save version 54 | `item/every-season` | `docs/rounds/2026-11-02-every-season.md` |
| 17+++ | The season plays out | in progress: part A (a mind's own words kept and shown) merged, #627; part C (zoom shapes the realms' colours) merged, #634; part B (the season in sequence, paced by meaning) merged, #645; part F (threads to watch, the director camera) merged, #664; part G (smooth on a phone) merged, #667, the phone bar **blocked** (#666, with the design for it: the land on a canvas painted off the main thread, one transform per symbol, no page step over 10 ms); part D (the land's season under the realms) merged, #676; part E (units drawn as what they are, with weight) not started: pick up there, on a fresh branch from `develop` | `item/season-plays-out` | `docs/rounds/2026-11-03-season-plays-out.md` |
| 17+++a | Keys for everything | not started | | |
| 17+++b | History, search and names | not started | | |
| 17++++ | A small state as a seat | not started | | |
| 17++++a | Raiders from beyond the map | not started | | |
| 17b | Every person on one scoreboard | not started | | |
| 18 | The balance pass | not started | | |
| 18a | The world in graphs | not started | | |
| 19+ | Answers to 19's review | not started | | |
| 19++ | The visual pass | not started | | |

Done items 1 to 14 (11d to 14 moved on 30 October 2026, "The workshop check"), done items 15 to 19+++, 17a and 17+ and the side lanes (moved on 1 November 2026), and the port's findings (all handled): `docs/archive/progress-done.md`.
