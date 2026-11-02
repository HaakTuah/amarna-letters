# Build progress

One line per item: state, branch, report, and what was decided along the way ("Progress" in the builder rules,
`.claude/rules/builder-rules.md`, which also say how items are branched, merged and reviewed, and when work slows for
usage). The order is "Build order" in the design document (copy: `docs/intent/build-order/`). An entry of the design
document keeps its title wherever it moved, so `grep -rn "Title" docs/intent` finds what an item names; a title it no
longer finds was history and is in `docs/archive/design-history.md`.

What each built item found and decided, word for word as recorded at the time, is in `docs/archive/build-log.md`;
Haakon's standing instructions given in chat, word for word, in `docs/archive/instructions.md`.

## The polish lane

A side lane of small refinements, beside the item lane and never ahead of it (Haakon, 31 October 2026: "Should we add a
polish point to each that it can spend the last credits on also?" and, to the design session's shape of it, "Yes, and
make things as refined as possible!"). Taken when the item lane's current item is merged or parked, and on the second
account until its usage is spent; on the main account the usage brake closes it first (from about 85%).
- **Next, from Haakon's notes of 2 November** (his words in `docs/archive/instructions.md`, item 134): by "Following,
  travel lines and borders" under Interface, Follow keeps the camera on the person, travel lines follow their roads (your
  orders' whole path, others' only as reported), and borders are strong between powers and quiet within one (after
  17++ part C merges, since it redraws the map's steps). Open from the notes' first four: the powers' land names
  (#403, for Haakon), and army counters standing over a neighbour's seal on the whole map (the lane's report).
- **Done:** the README brought up to the game as built (#256), the far-zoom edge (#259), Space and the speed keys (#293),
  the soundtracks and the Music page (#350), the soundscape (#351, #352); from the notes of 2 November, every province
  a proper name (#391), the camera to the play area's edges (#396), a seal's tap to its own city (#398) and the tabs
  and courts scrolled by wheel and drag (#397); their briefs are in
  `docs/archive/progress-done.md`, "Side lanes".
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

- **The file-by-file review** (Haakon, 2 November 2026: "Need a full review and clean up where we look at every file,
  especially the documents, and ask what does this state that it does, and does it do it? If something in it doesn't
  then it needs to be somewhere else, if anywhere at all.", then "Yes ro absolutely all pt these! Extra expertly expertly!"). A side lane, after
  the rules restructure (PR of 2 November). Every file, docs first: what does it say it is for, and does it do that?
  What doesn't belong moves to where it does, or goes; code is checked against "Split by meaning" and "Keep it lean"
  in `AGENTS.md`. The files every session reads first (`AGENTS.md`, `CLAUDE.md`, this file), then `docs/`, then the
  code, in a few PRs, each with a table of every file it covered and what happened to it, behaviour proven unchanged.
  Helpers by "Helpers: when they pay" (a Haiku search helper per folder). The builder rules and `docs/intent/` come from
  the design document, so what they need goes to the design session as a list in the PR; it condenses them at the
  next refresh.
- **Done so far** (2 November 2026): the progress file under 20 KB (#388); the files every session reads (#390);
  `docs/` (#392: item 2's, 4's and 5+'s briefs and specs to `docs/archive/specs/`, built entries out of "Not built yet"; #393:
  design note 10 down to its live differences); the archive's `progress-done.md` split by kind (#394). **Left:** the code,
  once the open lanes touching it merge (17++ B and C, export, model calls, fog); first find there: the conversion's
  parity check (`src/game/src/parity.ts`, `src/batch/src/parity*.ts`, `--parity` in `src/batch`) compares against the C#
  build removed on 27 October, so it is probably a leftover; `docs/DESIGN-NOTES.md` after its open lane merges.

## Follow-ups

Points a review moved out of its PR, each with its reason ("Reviews" in `docs/claude-and-codex.md`, point 2); struck when
fixed.

- **First of all: what a game's export holds** (Haakon, 2 November 2026: "And queue a job going fully over what the
  export function includes, and ensuring it doesn't include anything sensitive, at all. If it does, it must all be
  fixed, and we must be alerted, so we can remove this file."). Go through everything the export writes (the
  session's `export`, `log.toJsonl()` and every record type in it: the header, calls, decisions, shadows) and
  everything it could carry: API keys or anything from the key's storage, provider addresses with tokens in them,
  request or organisation ids, e-mail addresses, local paths, browser or device details.
  Anything sensitive is removed from the export, with a test that fails if it comes back, and **Haakon is alerted at
  once**: the PR's first line and the session's "Questions for Haakon" say what was found and which files in
  `tests/fixtures/` hold it, so they can be removed from the repository and its history. If nothing is found, the
  report lists what the export holds, field by field. Then build **one export with filters** (Engine and models,
  "Logging and replay"; Haakon, 2 November 2026): by default everything, every call in full with each model's notes,
  plans and its thinking whenever a model thinks; filters leave parts out, one blanking every word a human player
  wrote so the export can be kept in the repository and still replays; what is sensitive is never a filter and never
  in any export. A human player's own words are not sensitive in a normal export.
- ~~**Model calls that get through**~~ (done, #386): the limiter and its retries, the cache written once, answers read
  as meant (all 26 recorded slips mended), play in the background on the batch service, and the estimate from recorded
  token counts. An early all-Haiku season costs about $0.15 live and $0.08 in the background. Report:
  `docs/rounds/2026-11-02-model-calls-get-through.md`.
- **Counsel's plans from a digest** (found by "model calls that get through", 2 November 2026; Engine and models,
  "Passing up and asking advice": the strong model writes the plan "from a digest of the year ... rather than the whole
  record"). A plan call opens with the kings' whole 70,600-token rulebook on Sonnet, so at the recorded token counts
  Counsel estimates about 5% above Standard, where the design has small models play and the large one only plan and
  advise. Give the plan call its own short opening (the digest and what it needs of the rules), then restore the test's
  old claim that Counsel costs less than Standard (`src/game/test/who-decides.test.ts`).
- ~~**People moving in the fog**~~ (done, #387): no leak. They were Egypt's own caravans and envoys and the nomads'
  armies in its sight; titles and legend now say so. Report: `docs/rounds/2026-11-02-people-in-the-fog.md`.

- **From #348 (17+), round 2, not blocking; outside 17++'s text (names as claims), so a side lane takes them:** (a) engine
  notices name powers by their own land while a court's view may give a contested name to another, so one name can mean two
  powers in its inputs (render notices as the recipient sees them); (c) `nameGivenBy` reads the true claims
  (`!claimed.has(p)`) in the viewer case; (d) the spectator's record of contested names is unused; (e) 17+'s readings 29
  and 33 stale against 30, 34-35 printed before 33; (f) the web Court section greys out both upkeep halves and every
  province once one upkeep order is drafted; (g) a captive's stirring gold counted as skimmed rather than carried; (h) a
  no-op `CityStarts` entry; (i) an older tablet arriving late sets a court's knowledge of a claim back. (b), the chiefs'
  lands falling in the first two seasons, is 17++'s and measured in its report.

## For Haakon

Everything for Haakon is an issue: [questions and readings](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Afor-haakon)
(`for-haakon`) and [ideas](https://github.com/HaakTuah/amarna-letters/issues?q=is%3Aopen+label%3Aidea) (`idea`), by
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
| 17++ A | Folding or disbanding remnants (`--remnant-play-half`) | 0.96 growth to 0.88, 29 wins to 21, in 50 games | Pays |
| 17++ A | The ledger's script play: grain in the king's own name, tax relief, food bought, stirring (`--freedom-play-half`) | 0.95 growth to 0.92, 21 wins to 29, in 50 games; food bought in 0 unit-seasons against 1,056 taken | Not paying yet: the markets hold no grain to spare, so troops take; item 18 tunes the markets and the army's food |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".


| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 17++ | What a king can count | in progress: part A (whom a province obeys) merged, #375; part B (counts, census, demands) in review, #376; part C (governors over regions, grants, the map, the audit's script finds) under way; "taken up, never thrust on anyone" (2 November 2026) goes into part C, or a part of its own if C has merged | `item/whom-a-province-obeys`, `item/counts-and-demands`, `item/governors-grants-map` | `docs/rounds/2026-11-01-whom-a-province-obeys.md`, `docs/rounds/2026-11-02-what-a-king-can-count.md` |
| 17++a | Something happens every season | not started (next after 17++) | | |
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
