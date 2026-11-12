# Build progress

One line per item: state, branch, report, and what was decided along the way ("Progress" in the builder rules,
`docs/builder-rules.md`; how work flows and is reviewed: `core/modules/work-flow.md` and `core/modules/reviews.md`). The
order is "Build order" in the design document (copy: `docs/intent/build-order/`). An entry of the design document keeps
its title wherever it moved, so `grep -rn "Title" docs/intent` finds what an item names; a title it no longer finds was
history and is in `docs/archive/design-history.md`.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`;
the owner's standing instructions given in chat, word for word, in `docs/archive/instructions.md`.

## The polish lane

The game's polish lane (`core/modules/work-flow.md`, point 4; the owner, 31 October 2026).
- **A bug beside it, now:** #666, a phone at Fast still drops frames past 50 ms, mostly the browser's own layering and
  painting of the map's SVG; its own lane on the map's drawing, which the music does not touch, measured as item 17+++
  part G measured it, until frames stay under 50 ms on a phone and on desktop at every speed. PR #930
  (`docs/rounds/2026-11-11-phone-frames.md`): at Fast, the phone's 7.4% to 4%, desktop's 1.4% to 0.4%; next, one
  transform a symbol.
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
- **What belongs, here:** graphical glitches and inconsistencies first, as item 19++ asks; light and dark too; the
  rulebook's wording as well as the interface's. Never a request to a model, the save version or the names item 17+ will
  change: those go to their items.
- **How, here:** play proven unchanged by the suites, the seeds replaying exactly as before and the benchmarks
  unchanged.

Fixes: one line each in `docs/rounds/2026-10-31-polish-lane.md`, "Fixes, one line each" (moved there on 1 November 2026,
"The workshop check"; new fixes add their line there), with the finds still open.

## The workshop lane

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
- **A check for code nothing uses** (the owner, 11 November 2026: "Should we have a rule about removing unused code,
  expert?", then "Yes, expertly to all, expert!"). "Keep it lean" forbids leftovers, but no check holds it. (1) Finish
  `--noUnusedLocals` on `turn/counts.ts`, `turn/couriers.ts`, `turn/economy.ts`, `turn/resolve.ts`, `turn/unrest.ts` and
  `web/src/map/life.ts`, then turn on `noUnusedLocals` and `noUnusedParameters` in `tsconfig.base.json`, so
  `scripts/test.sh` fails a leftover. (2) Exports and files nothing imports: one clean-up PR, then a finder in
  `scripts/test.sh`; a small script on the compiler's own API first, a pinned dev tool (floor rules 7 and 10) only if
  that falls short; what is reached indirectly is listed with its reason. (3) A lint rule fails a test skipped or
  narrowed to one (`.skip`, `.only`, `.todo`; the owner, the same day: "Yes, expertly to all!"). The replays prove play
  unchanged. A routine lane.
- ~~**A pointer check and a reading-size check on every PR** (archive item 217).~~ Done as the core's, shared with
  Barkstreet Snakes (core #69): the copies workflow runs them, with this game's marks in `scripts/sizes.json`; the lane's
  own (#721) gave way to them.
- **Done so far** (2 November 2026): the progress file, the files every session reads and `docs/` (#388, #390,
  #392-#394, #444); the parity check (#443); the code: `orders.ts` (#532) and `svg-renderer.ts` (#561) split, unused
  imports and locals out (#556), engine tests on `smallWorld` (#567), the review's small finds (#568), and the splits it
  found: `prompts.ts` (#572), `schemas.ts` (#573), `seat-setup.ts` (#577), `statecraft-letters.ts` (#588).
  `--noUnusedLocals` cleared all but the files open PRs held then (#748), which the next entry finishes. Looked at and
  left whole, each one thing whose split would mean redesigning it, not moving code: `bots/tactics.ts` (one 620-line
  `makePlan`), `llm/src/character-mind.ts` and `web/src/audio/player.ts` (one class each), `web/src/pages/Home.tsx` (the
  start screen; its saved-games card is 2.5 KB).
- **The README as a front page** (an outside review of the repositories, 11 November 2026: about 7,000 words, rules
  that read like a legal code, which players will not read): the README keeps what the game is, how to start and how a
  season goes, in a few hundred words, and points to the rulebook for the rules in full; whatever moves goes to the
  rulebook or the design notes, nothing a player needs is lost, and the copies check proves nothing is said twice.
- **The code files near the split line** (the same review): 17 code files are past 40 KB, `turn/plans.ts` within a few
  hundred bytes of the 50 KB line. Each is checked against "Split by meaning" and split where it holds two things, in a
  PR of its own when no open lane touches it, behaviour proven unchanged ("Same seed, same game"); generated data and
  the files already judged one thing above stay whole.

## Follow-ups

- **A letters-only game** (the owner, 11 November 2026, agreeing with the design session's answer to an outside review:
  "Agreed with all your takes, expertly!"; #927): after item 18, a preset with the letters, envoys and treaties and
  the other systems off, played by the script kings on the same seeds as the full game, measuring how often kings keep
  and break their word and come to trust or shun each other in each, so the game shows whether its trust comes from the
  letters or from the economy around them.

- **Use against ignore, the third group** (the core's `modules/game-design.md`, "Using a feature must pay"): scripts
  that always use the item's feature, beside those that use it where it fits and those that ignore it, with the
  threshold for "by more than chance" listed as a first guess. Also unmet there: no computer player's timing gives a
  person away; what the game shows from the past shows its age; a replay from the log of every input and model answer,
  model and prompts counted in its version; and, not checked yet, a saved game opened in a newer version carrying on in
  the newer rules, its log marking where. All by way of the design session (the core repository's
  `reports/2026-11-10-step-3-now.md`, in no copy).

- **For the orchestrator's next wake** (the owner, 3 November 2026; archive item 189): (2) The
  code-scanning alert open on `main` gets a small side lane now, kept private as `SECURITY.md`, rule 9, says for a weakness whose kind the
  owner has not said: a PR that fixes it names neither the alert nor the weakness until it is merged. (4) A security review ran only if Codex's review summary shows its completed "🔒 Security Review" row; report a PR that lacks it.

- **Model trial 2** (the owner, 12 November 2026): from 16 November the next numbered part is built twice, as
  `docs/rounds/2026-11-12-model-trial-2.md` says.

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
  person"; built in #850, report `docs/rounds/2026-11-09-captive-caretaker.md`); the weight of size set by testing (#825; the same section); a resident hires a carrier (#836; Diplomacy,
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
  workflow that opens an `enhancement` issue when one is behind.~~ Done in #547; Node, all it held, is now the core's
  one exact pin (`core/.node-version`), so the game's own list and check are gone.

Points a review moved out of its PR, each with its reason (`core/modules/reviews.md`, point 5); struck when
fixed.

## For the owner

Open [ideas](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Aenhancement) (`enhancement`) and
[bugs](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Abug) (`bug`), by `core/modules/inbox.md`.
Answered review points from before 2 November 2026: `docs/archive/progress-done.md`.

## Use against ignore

Every item adds its numbers here ("Every item tests them" in the builder rules; how they are measured: the *use-against-ignore measurement* in `core-manifest.md`). Earlier items' numbers are in their reports; item 10+a's audit of every feature built so far adds them here.

The rows of done items (6c to 17++) are in `docs/archive/progress-done.md`, "Use against ignore: done items" (6c to
17+ moved 2 November 2026, 17++ on 6 November, 17++a to 17++++a and the bug fixes' rows on 7 November, "The workshop check");
new rows are added here. Where they stand (F3: item 18 F3):
**pays** 6c planning ahead, 7b roads, 9 authority (F3), 9+a the economy (F3, patched), 9+b trade, 10+a land play (F3),
10+b borders, 11a and 11a+ money and seasons (a little), 13 command (a little), 15 works (growth), 16 the council, 17++
(occupying, the census, governors' regions and grants, the spy's check, remnants); **a little ahead** (F3) 9 winter
strokes, 12 languages, 17 buying food and stirring, 17+ holding back pay, 17++ D talk; **even** (F3) 10 judging people,
11b, 11b++ hunting, 11b+ borrowing, raiders, 11e walls, 11f caravans abroad, 11+ vassalage (patched), 18 E gifts; #806 and 18
F2 a captive king; **mixed** 17++a the war of choice (F3, unpatched play); **not measured again yet** 7a sea play, 8
inventories, tidings, rides, coffers, 17++ A the ledger, 17++ D a carrier caught; nothing to measure for 11d,
11f+, 13+, 14 and 17+'s names.

| Item | Feature | Users against ignorers (same seeds) | Verdict |
|---|---|---|---|
| 17b B | A captive king ransomed or put to death, and one's own ransomed (`--king-play-half`) | 0.76 growth to 0.77, 29 wins to 21, in 50 games; kings taken 1,178 times, 72 escapes, 6 deaths | Pays in wins |
| 17b C1 | A king who goes to the front without his court when his army fights where the court's couriers come late (`--field-play-half`) | 0.76 growth to 0.73, 29 wins to 21, in 50 games; kings went alone 736 times in 44 of 50 games (regression run) | Pays in wins |
| 17b C2 | Granting land, now also to a fallen realm's king or heir in exile at the court (`--grant-play-half`) | 0.79 growth to 0.75, 28 wins to 22, in 50 games; heirs in exile 124 times in 39 games, fallen realms' kings or heirs made king again 26 times in 20 games (regression run) | Pays |
| 17b D | One scoreboard of every person: no lever of its own (it changes what is counted, not what a player can do) | a character first on the board in 1 of 50 regression games, a king in 49 | No lever |
| 18 C | Commanders granted away from court, with mandates, on the slower breach (`--command-play-half`) | 0.79 growth to 0.90, 12 wins to 27, in 50 games | Pays |
| 18 E | Gifts, bribes and tribute judged by their expected return (`--gift-play-half`) | 0.79 growth to 0.85, 15 wins to 24 (seeds 1-50, with the vassal's tribute judged too); before that, 14 to 20 and 14 to 17 (seeds 101-150) | Ahead, within the noise of 50 games; part F re-measures on the full seed sets |
| 18 E | A vassal's tribute judged by the peace it buys (`--vassal-play-half`) | 0.74 growth to 0.78, 21 wins to 19 | Growth ahead, wins even |
| #806 | A captive king under a caretaker: his ransom by his word home or, short of it, giving in with land; a spy sent to free him; letters to his sworn friends; a captor keeping his letters, guarding him once a plot is found, and letting him go for land; with 17b's ransoms (`--king-play-half`) | 0.83 growth to 0.82, 19 wins to 22, in 50 games; 395 kings held, 22 still held at the age's end; 132 escapes, 6 helped by a spy; 2 letters smuggled, 6 kept; 8 gave in | Even, within the noise of 50 games; not yet in wins |
| 18 F2 | A captive king, after #878 and the new par (`--king-play-half`) | 0.82 growth to 0.80, 44 wins to 50, in 100 games (before: 0.82 to 0.81, 39 to 37); a king held long gains his captor nothing beyond the capture | Even; holding a king forever neither pays nor ruins |
| 18 F3 | Every feature, against a null split (`--null-half`) | the economy 0.80 growth to 0.865, patched 0.865 to 0.765; vassalage 0.77 to 0.79, patched even; the rest in F3's report | Two patched; five not measured |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".

| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 18 | The balance pass | in progress, in parts: A to F2 merged (#828 to #845, #895; save version 94), F3 merged (#899: use against ignore; grain sold at any price; a paying vassal weighed as any king); F3's remainder in progress (its runs, done and to do, in its report); then, by the F3 report's "Split, and where to pick up": F4 (the bold road, commit f2e973c; Arzawa), F5 (17+'s people, positions, banditry, commanders), then stop for review (none started: the owner's word, 12 November) | `item/balance-f3-rest` | `docs/rounds/2026-11-12-balance-pass-f3-rest.md` |
| 18a | The world in graphs | not started | | |
| 19+ | Answers to 19's review | not started | | |
| 19++ | The visual pass | not started | | |

Done items 1 to 14 (11d to 14 moved on 30 October 2026, "The workshop check"), done items 15 to 19+++, 17a and 17+ and the side lanes (moved on 1 November 2026), done items 17++, 17++a to 17++++a and 17b (moved on 7 November 2026), and the port's findings (all handled): `docs/archive/progress-done.md`.
