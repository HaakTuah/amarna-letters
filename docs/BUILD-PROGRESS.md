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
- **Done so far** (2 November 2026): the progress file under 20 KB (#388); the files every session reads (#390);
  `docs/` (#392: item 2's, 4's and 5+'s briefs and specs to `docs/archive/specs/`, built entries out of "Not built yet"; #393:
  design note 10 down to its live differences); the archive's `progress-done.md` split by kind (#394). **Left:** the code,
  once the open lanes touching it merge (17++ B and C, export, model calls, fog); the conversion's parity check removed
  (#443); `docs/DESIGN-NOTES.md` after its open lane merges.

## Follow-ups

- **Node 26** (the owner, 2 November 2026; "Git and GitHub" in `AGENTS.md`): CI's `node-version` (every
  `actions/setup-node` in `.github/workflows/`) and `scripts/cloud-setup.sh` (installing Node 26 if the machine has an
  older one, from the npm registry the cloud allows) move from 22 to 26 together, with `@types/node` 26 and the full
  suites; 24 if the tooling is not ready for 26, said in the PR. Dependabot's closed #448 was the cue.

Points a review moved out of its PR, each with its reason ("Reviews" in `docs/claude-and-codex.md`, point 2); struck when
fixed.

- ~~**The province card looking back** (the weekly blind re-review of #374): in a seat view on an earlier season the
  card read the live state, the new holder's figures where the city has since fallen; it gives that season's recorded
  figures now, with a test at a past season (#414).~~
- ~~**The canary test for hidden information**~~ (done, #421): `src/web/test/canary.test.ts` plants an envoy's hidden
  mandate, its letter, a sealed tablet, an army in the fog and another court's treasury, and reads every seat's input,
  every model request, the chronicles, every view, map and panel the page shows, live, in past seasons and on replay; no
  leak found; its export part (#430) plants sensitive failures and a human seat's words and exports them under all
  sixteen filters: none found. Whether "Export log" should wait for "Reveal all" while a human plays: #424.
- ~~**First of all: what a game's export holds**~~ (done, #385): nothing sensitive in `tests/fixtures/`; one export
  with filters (calls, shadows, audits, human words), kept clean by design: failures logged as kind and code, each
  record giving only its listed fields, and without human words a game with a human seat blanks every text and still
  replays. Report: `docs/rounds/2026-11-02-export-audit.md`; note: `docs/design/50-the-export.md`.
- ~~**The export's stand-in names and its gate**~~ (done, #436): under the human-words filter a name made up in an
  order (a pitch's name, `goAs`, a claimed realm) is Name-1, Name-2, real names kept, and it still replays; "Export
  log" is offered only when the god view is; the canary grows a line for each (`docs/rounds/2026-11-02-export-stand-ins.md`).
- ~~**Model calls that get through**~~ (done, #386): the limiter and its retries, the cache written once, answers read
  as meant (all 26 recorded slips mended), play in the background on the batch service, and the estimate from recorded
  token counts. An early all-Haiku season costs about $0.15 live and $0.08 in the background. Report:
  `docs/rounds/2026-11-02-model-calls-get-through.md`.
- ~~**Counsel's plans from a digest**~~ (done, #437): the plan call opens with its own short rules (how a power wins,
  the plan, standing answers), about 3,900 tokens where it read the kings' 70,600, so Counsel estimates below Standard
  again ($1.13 a season live against $1.34). Report: `docs/rounds/2026-11-02-counsel-plans-from-digest.md`.
- ~~**People moving in the fog**~~ (done, #387): no leak. They were Egypt's own caravans and envoys and the nomads'
  armies in its sight; titles and legend now say so. Report: `docs/rounds/2026-11-02-people-in-the-fog.md`.

- **From #348 (17+), round 2:** (c) to (h) ~~done~~ (#404); (a), (i) and a dismissed spy's stirring gold wait for #378:
  issue #417. (b), the chiefs' lands falling in the first two seasons, is 17++'s and measured in its report.
- **From #376 (17++ B), round 1, not blocking; outside the item (a file it only touched):** `src/engine/src/model/orders.ts`
  is over 50 KB (about 55 KB): split by responsibility in a PR of its own, behaviour proven unchanged by replays.
- ~~**From #376 (17++ B), round 1 (Codex, P1); test infrastructure outside the item:** the engine suite has no reduced-world
  fixture, so every engine test builds the whole starting world~~ (#441: `smallWorld` in `src/engine/test/support.ts`,
  the engine's rule tests on it, its suite 80 s to 44 s). Left for a later pass: the engine test files #378 changes
  (`counts`, `crowns`, `declarations`, `governors-region`, `mood-reads`, `seat-word`, `who-they-are`, `works`).

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
| 17++ B | Counting the land (census), asking an amount by a fresh count and levying by share by an old one (`--count-play-half`) | 0.97 growth to 0.86, 26 wins to 24, in 50 games (after round 1: 0.96 to 0.89, 30 to 20) | Pays |
| 17++ A | Folding or disbanding remnants (`--remnant-play-half`) | 0.96 growth to 0.88, 29 wins to 21, in 50 games | Pays |
| 17++ A | The ledger's script play: grain in the king's own name, tax relief, food bought, stirring (`--freedom-play-half`) | 0.95 growth to 0.92, 21 wins to 29, in 50 games; food bought in 0 unit-seasons against 1,056 taken | Not paying yet: the markets hold no grain to spare, so troops take; item 18 tunes the markets and the army's food |

## Items
Each item's text is its brief (`docs/intent/build-order/`); the summaries these rows carried before 1 November 2026 are in `docs/archive/progress-done.md`, "Summaries of items not yet built".


| # | Item | State | Branch | Report |
|---|---|---|---|---|
| 17++ | What a king can count | in progress: part A (whom a province obeys) merged, #375; part B (counts, census, demands) merged, #376; part C (governors over regions, grants, the map, the audit's script finds) under way; "taken up, never thrust on anyone" (2 November 2026) goes into part C, or a part of its own if C has merged | `item/whom-a-province-obeys`, `item/counts-and-demands`, `item/governors-grants-map` | `docs/rounds/2026-11-01-whom-a-province-obeys.md`, `docs/rounds/2026-11-02-what-a-king-can-count.md` |
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
