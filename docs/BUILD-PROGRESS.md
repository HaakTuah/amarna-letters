# Build progress

One line per item: state, branch, report, and what was decided along the way ("Progress" in the builder rules,
`.claude/rules/builder-rules.md`, which also say how items are branched and merged, and when work slows for usage;
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
- **Done so far** (2 November 2026): the progress file, the files every session reads and `docs/` (#388, #390, #392-#394,
  #444); the parity check (#443); the code: `orders.ts` (#532) and `svg-renderer.ts` (#561) split, unused imports and
  locals out (#556), engine tests on `smallWorld` (#567), the review's small finds (#568), and the splits it found:
  `prompts.ts` (#572), `schemas.ts` (#573), `seat-setup.ts` (#577), `statecraft-letters.ts` (#588). **Left:**
  `--noUnusedLocals` again on the files open PRs held (one known: `renew` in `bots/statecraft-court.ts`). Looked at and
  left whole, each one thing whose split would mean redesigning it, not moving code: `bots/tactics.ts` (one 620-line
  `makePlan`), `llm/src/character-mind.ts` and `web/src/audio/player.ts` (one class each), `web/src/pages/Home.tsx`
  (the start screen; its saved-games card is 2.5 KB).

## Follow-ups

- **The body and the road** (the owner, 3 November 2026; archive item 187; "The body: endurance and robustness" and
  "The road he takes follows his appetite for risk" under Characters, revision 29, and "What sets a company's pace",
  revision 112): two hidden, seeded traits, endurance (the pace of lone travellers and small parties) and robustness
  (the odds wherever a character's life or health is already at risk). Both show roughly in a man's looks and sharpen
  through his record, and fees follow demand. Where there are several roads, characters choose by appetite for risk.
  Built with the first item whose errands use them; a save version.

- **Gold travels both ways** (the owner, 3 November 2026; #587; archive item 186; "One treasury, many stores" under
  Land, people and economy, revision 35): what is done far off (a caravan's porters, works paid in gold, grain bought
  at a far market) is paid only from gold that is there: sent with the order up front, the caravan's own load, the
  province's own stores, taxes or corvée, or a contract's terms with a bill carried home. The treasury moves only when
  gold leaves it or a carrier brings a payment or a bill home; the twin canary's listed leak under #587 then goes. A
  save version.

- **The owner's answers of 3 November, morning** (archive item 185):
  - **#591, no wording gives an envoy's hidden state away** (script characters only; a model writes its own words):
    honest script envoys at warm courts sometimes say "kindly" and "friend" too, and the bribed or frightened lines
    borrow honest wording, so no phrasing marks one state. A new save version, and a measurement that the script
    kings' trust readings still behave well.
  - **#616, one clock for one road:** a far province's report and its notices come by one function, the couriers'
    seasons from the place to the court, with a test that the same season's both arrive together. A save version.
  - **#601, a fast courier, hired:** a king may hire a carrier to bring one far province's report home this season.
    It is a job like any other ("Jobs, not wages"): the carrier asks his price by what he has heard such a job pays
    and by how badly he is wanted, and the king may haggle; no fixed price, no menu.
  - **#586, the polish lane:** a province's card lists, for each glowing frontier, the armies the seat sees on the
    other side.
  - **#618, after item 17++a:** word of a conquest, a fall or a revolt reaches courts beyond sight by the road: a
    vassal reports to his overlord what his court saw, an ally to the king he is bound to.
  - **#592, after #543:** a caught offer is a thing held: its captor may send it on, sell it to its claimant or to the
    land's king, or keep it back.

Follow-ups done and struck are in `docs/archive/progress-done/follow-ups-done.md`, word for word (moved 3 November 2026,
the workshop check): among them the history check's lines still unclear for a reader with the editions.

- ~~**A far levy's dropped orders by word (bug #569)**~~ (done, #610): a levy that failed in its province drops the
  orders waiting on its army when word of it comes, in the season of its "Levy failed"; till then they stay listed,
  unable to run. Save version 53. Report: `docs/rounds/2026-11-03-levy-drop-heard.md`.

- ~~**A grant and its end by word (bug #565)**~~ (done, #606): a grant by order, a revocation and closed roads reach
  the grantee's court by word, its view keeping the grant until then. Save version 52. Filed: #609 (repudiation, the
  same leak), #611. Report: `docs/rounds/2026-11-03-grants-heard.md`.

- ~~**Far land as last reported (bugs #540, #589)**~~ (done, #579): a far province's economy, works, yields and
  caravans, and the realm's strength, as last reported; far harvests, works' costs and caravan news by the road. Save
  version 51. Left open: question #587 (what the treasury pays far off, paid at once). Report:
  `docs/rounds/2026-11-03-far-as-reported.md`.

- **Four more ideas from the reviews, accepted** (the owner, 3 November 2026; archive item 184):
  - **#566:** the twin canary (`src/web/test/twin-canary.test.ts`) plays each hidden fact at a second place too, a far
    province of another power or one reached only by winter roads or by sea; the place a parameter, not a constant.
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
     whole and lists its worst lines, each with the tell: one sentence shape filled in again and again, filler and
     hedging, clichés and modern idiom in an ancient voice, every king sounding alike, the same formula in every
     season's report, lines too long for the seat view.
  3. **The builder rewrites them** in the period's voice, as "Voice of the age" under World and history describes it;
     the PR shows ten lines before and after, so the owner can set the bar.
  4. **A cheap guard after:** a test that fails when a script king's letters, or a report's lines, keep repeating one
     shape across a game.
  Each kind of text is reviewed as every review is ("Reviews" in `docs/claude-and-codex.md`); here a 10 means
  nothing reads machine-made, every voice is its own and no formula repeats. The owner's read of the ten lines before
  and after is the final word. One PR per kind of text.
  **Done:** the script kings' letters and audience words, #558 (10; report `docs/rounds/2026-11-02-slop-audit-letters.md`;
  the words in `bots/voices.ts`, the guard and the readers' test in `src/game/test/letter-shapes.test.ts`); the
  envoys' speech, #585 (10; report `docs/rounds/2026-11-02-slop-audit-envoys.md`; `bots/envoy-words.ts`, read through
  `src/game/test/readings.ts`; #591 asks whether an envoy's wording may give away its hidden state). **Next:** notices,
  news and reports (the bribed envoy's invented news moves with them); then the rest in the order above.

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

The rows of done items (6c to 17+) are in `docs/archive/progress-done.md`, "Use against ignore: done items" (moved 2 November
2026, "The workshop check"); new rows are added here. Where they stand: **pays** 6c planning ahead, 7b roads, 9+b trade,
10+b borders, 11a and 11a+ money and seasons (a little), 13 command (a little), 15 works (growth), 16 the council;
**even or barely** 7a sea play, 8 inventories, 9 authority, 10+a land play, 11b+ hunting, 11e walls,
12 languages, 17+ holding back pay; **not paying yet, re-measure in item 18** 9 winter strokes, 9+a the economy (wins),
10 characters, 11b and 11b++ hunting, 11b+ carriers and repaying, 11+ vassalage, 11f supply through foreign land,
17 buying food and stirring; nothing to measure for 11d, 11f+, 13+, 14 and 17+'s names.

| Item | Feature | Users against ignorers (same seeds) | Verdict |
|---|---|---|---|
| 17++a | Waging the war chosen, breaking a plain peace for it (`--war-play-half`) | 0.78 growth to 0.87, 13 wins to 7, in 20 games | Pays in wins, not in growth: Assyria and Arzawa lose by their wars of choice; for item 18 |
| 17++a | Judging whether land would obey, and occupying it until it does (`--occupy-play-half`) | 0.88 growth to 0.82, 9 wins to 3, in 12 games | Pays |
| 17++ C | Taking up the provinces that look to them where it pays, refusing the rest (`--take-up-play-half`) | 0.94 growth to 0.86, 26 wins to 24, in 50 games; declarations in 47 games (884), 845 taken up, 79 refused, 490 passed | Pays |
| 17++ C | Giving a trusted governor the threatened province beside his own (`--region-play-half`) | 0.96 growth to 0.89, 33 wins to 17, in 50 games; regions given in 49 games (463) | Pays |
| 17++ C | Making governors vassal kings where the tribute nets more than keeping (`--grant-play-half`) | 0.94 growth to 0.86, 28 wins to 22, in 50 games; 24 kingships taken of 95 offered | Pays (the land's multiple against tribute stays a finding for item 18) |
| 17++ B | Counting the land (census), asking an amount by a fresh count and levying by share by an old one (`--count-play-half`) | 0.96 growth to 0.85, 31 wins to 19, in 50 games, on part C's final head (part B's own: 0.97 to 0.86, 26 to 24) | Pays |
| 17++ C | The audit's script finds: raising troops when rich, governors' gold, vassal requests answered as sealed (`--audit-play-half`) | 0.94 growth to 0.86, 27 wins to 23, in 50 games | Pays |
| 17++ C | Checking a governor's word against one's own spy, recalling one caught hiding unrest (#459, `--spy-check-play-half`) | 0.96 growth to 0.87, 27 wins to 23, in 50 games | Pays |
| 17++ D, #553 | Heeding an offer read on a carrier caught, as talk of it (`--talk-play-half`, with the talk) | 0.90 growth to 0.84, 25 wins to 25, in 50 games; 1,152 offers sent, 36 carried, 1 caught and read, 33 arrived | Too rare to tell: one catch in 50 games; for item 18, with the talk |
| 17++ D | Heeding talk of a province's leaning: relief at home, warmth to the claimant, a spy where one is talked of (`--talk-play-half`) | 0.86 growth to 0.86, 26 wins to 24, in 50 games; 988 offers sent, 31 carried, 27 arrived | Even: offers rarely arrive yet, so the threat is rare; for item 18 |
| 17++ A | Folding or disbanding remnants (`--remnant-play-half`) | 0.96 growth to 0.88, 29 wins to 21, in 50 games | Pays |
| 17++ A | The ledger's script play: grain in the king's own name, tax relief, food bought, stirring (`--freedom-play-half`) | 0.95 growth to 0.92, 21 wins to 29, in 50 games; food bought in 0 unit-seasons against 1,056 taken | Not paying yet: the markets hold no grain to spare, so troops take; item 18 tunes the markets and the army's food |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".


| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 17++ | What a king can count | in progress: part A (whom a province obeys) merged, #375; part B (counts, census, demands) merged, #376; part C (governors over regions, grants, the map, the audit's script finds, "taken up, never thrust on anyone", the corvée as a share #411, and script kings checking a governor's word against their spy's #459) merged, #378; #480 (a governor's letter says where he sits) in #531; part D (#431's carriers) merged, #538; then 17++a | `item/whom-a-province-obeys`, `item/counts-and-demands`, `item/governors-grants-map` | `docs/rounds/2026-11-01-whom-a-province-obeys.md`, `docs/rounds/2026-11-02-what-a-king-can-count.md`, `docs/rounds/2026-11-02-governors-grants-map.md` |
| 17++a | Something happens every season | done, #590: the pulse measure (`pulse.ts`, in every batch report); the four lands named and anchored (#403); script kings occupy land until it obeys and wage the war they choose (a map change every 5-7 seasons for the large kings, 5-15 without the war play; short of the target of 4, the limit now hearing: #618); crowns' ids registered; save version 54 | `item/every-season` | `docs/rounds/2026-11-02-every-season.md` |
| 17+++ | The season plays out | not started | | |
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
