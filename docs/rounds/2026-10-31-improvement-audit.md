# Improvement audit (31 October 2026)

Branch `audit/improvement` (PR #235), from `develop` at f1007bc. One session, intended at high effort. Worked from the
copy of the design document in `docs/intent/` (no live document on this account). Weekly usage: unknown in this session.

How the audit looked: the built web app (`npm run build --workspace src/web`) driven with Playwright at 1280 px and at
390 px, whole games watched at the top speed with memory and season times recorded, a human seat played as Egypt at
phone size; one-game probes of the engine in Node with the heap measured every ten turns; 50 script games
(`scripts/sim.sh --games 50 --seed 1 --verify-replay --out <dir>`) read from their final states; and the code of
`src/engine`, `src/game/src/bots` and `src/web`. The scripts used are in the session's scratchpad, not in the repository.

Finds are ranked by how much each would improve the game. Each names its lane (17a, 17+, 17++, 18, the item lane for
script-king play, or polish), its evidence, and the fix suggested. Nothing here was built: a find that changes a rule or a
number is a question for Haakon (the "Questions for Haakon" section and the "For Haakon" table of `docs/BUILD-PROGRESS.md`).

## 1. The crash at high speed is the turn-by-turn snapshots (17a)

**What happens.** Watching a whole game at the top speed in headless Chromium at 1280 px, the page died twice with
"Target crashed" (the renderer process killed), once between seasons 100 and 110 and once just after season 80. No
console error or page error came first. The renderer process grew with every season:

| Season | Renderer process | Main thread's JS heap |
|---|---|---|
| 10 | 807 MB | 59 MB |
| 20 | 1,021 MB | 109 MB |
| 40 | 1,891 MB | 118 MB |
| 60 | 2,892 MB | 150 MB |
| 80 | 3,567 MB | 134 MB |

The main thread stays small, so the growth is the engine's Web Worker. The same game in Node, one script game at seed 1
with `GameRunner.keepSnapshots` on (as the web session has it), grows the heap 300 MB at turn 10, 539 at 20, 858 at 30,
1,243 at 40, 1,682 at 50, and dies at Node's 2 GB heap limit around turn 55 ("FATAL ERROR: Reached heap limit"). With
`keepSnapshots` off, the same game sits at 180 MB at turn 10 and 187 MB at turn 20: flat.

**Why.** `src/game/src/runner.ts:149-154` keeps the whole serialised `GameState` at the end of every turn
(`snapshots: string[]`), for the web app's history; its own comment says "a long game's snapshots run to gigabytes",
and the batch runner turns it off (`src/game/src/batch.ts:280`). The web session never turns it off
(`src/web/src/session/core.ts`), and reads a past state only for `catchUpFrames` (`src/web/src/session/frames.ts:400`,
which builds one `SeasonFrame` per snapshot right after it is taken, so it only ever needs the live state) and for the
page's `stateAt` request (`core.ts:513`, a past season's view). The state itself is large and grows: a finished
game's state is 16 MB of JSON at turn 102, of which `inbox` is 8.8 MB (every message every court ever received, 30,000 of
them, never pruned: 13,400 notices, 11,200 resolutions, 4,100 battle reports), `events` 3.2 MB (22,600) and `characters`
2 MB (198 characters at about 10 KB each, mostly `facts` and `payOld`). So each snapshot is several MB and the sum is
quadratic in the game's length. With the age now lasting about 80 to 160 seasons (item 17), a desktop browser reaches
the renderer's limit at about season 80 to 110; a phone, with far less memory, much earlier. Haakon saw "a white page
with an error" on the live site: Chrome's own out-of-memory page is exactly that.

**Suggested fix (behaviour unchanged).** Stop keeping a full state per season. The frames already carry what the map and
panels show of past seasons; for the "whose eyes" view of a past season (`stateAt`), keep a snapshot only every k-th
season (say 10) and rebuild the one asked for by replaying the log from the nearest snapshot, which the deterministic
engine and the small log (8 MB at turn 100) allow, or keep the snapshots compressed in IndexedDB rather than in the
worker's heap. Either way the worker's memory stops growing with the game's length. A guarding test: play a small game
for many seasons and assert the runner's retained memory, or the snapshot count, stays bounded. Separately, `inbox`
should keep only what a seat's view still reads (the old messages are in the log for the record), which also shrinks
every save and every structured clone.

**Season times at the top speed** (the engine's turn time, 1280 px, the machine otherwise busy with the 50-game run, so
the absolute numbers are high): mean 2.2 s a season; the first three seasons 10 s, 8 s and 7 s (the opening: 47 powers
hiring and sending envoys), then 2 to 3 s. In Node the probe took 1.6 to 2.6 s a turn on the same busy machine. The
first seasons are the slow spot to profile first.

**Where a turn's time goes** (Node, `--cpu-prof`, 30 turns of seed 3, 78 s sampled): the script kings' decisions are
62% of a turn (`decideNow`, `src/game/src/bots/script-leader.ts:90`), of which the plan search `improve`
(`bots/search.ts:73`) is 41% and route-finding 22%: `cheapestRoute` (`src/engine/src/model/travel.ts:207`) is a Dijkstra
that scans every reached province for the minimum at each step (no heap) and builds a `Map` of all province indexes on
every call, called from 16 places; only `fastestPoints` caches it. The garbage collector is 18% of the whole and
`Dict.entries` (`src/engine/src/core/collections.ts:102`, a generator yielding a fresh tuple per entry) 9% by itself.
The engine's own resolution is a few percent. So for 17a's "make it faster": a heap and a per-season cache for
`cheapestRoute` (the map changes only when roads close or works change), and iterating `Dict` without allocating a
tuple per entry in the hot paths (`search.ts:563 score`, `tactics.ts:142 makePlan`, `trade.ts:95 landWay`).

## 2. A render error blanks the whole page (17a)

There is no React error boundary anywhere in `src/web/src` (no `componentDidCatch`, no `getDerivedStateFromError`), and
no `window.onerror` or `unhandledrejection` handler. React 18 unmounts the root on an uncaught render error, so any
such error during a game is a white page with nothing to copy and no way back, which is the second thing item 17a asks
for. The worker's own death is caught (`client.ts:96` shows "The game's worker stopped"), but the renderer being killed
for memory (find 1) is not something the page can catch, so the fix is find 1; the boundary is for everything else.

## 3. Script kings hoard gold and let their armies dwindle (item lane: script-king play)

Across the first eight finished games of the 50 (seeds 1 to 8, ages of 23 to 143 seasons), the units on the whole
map fall from 56 to 60 at the start to a mean of 24 at the end (16 to 37), season by season, and no king rebuilds:
counted every 20 turns a typical game reads 58, 37, 33, 31, 24, 21. At the end Babylonia holds 3,700 to 8,900
shekels and 2 to 5 armies in every game; Egypt 400 to 5,900 shekels and 1 to 6 units; Hatti one army in six of eight
games; Mitanni and Assyria 0 to 2 units. Seventeen to twenty-four of the 47 powers are eliminated in a game.

The homelands have the men: Babylon's people are 253,000 with 50,000 men of fighting age at the end of game 1. The
script king's raise rule (`src/game/src/bots/statecraft-strategy.ts:286-309`) raises only against a plan's
"shortfalls" and only where the shortfall's value beats a lifetime cost of pay, food and lost harvest over ten seasons,
scaled by caution and aggression; a king with no shortfall and a full treasury raises nothing, however rich. The
baseline king (`baseline-leader.ts:357-375`) also stops at one unit more than its provinces. The result is a late game
decided by two or three armies a side, and a world where a human with two fresh armies rolls over any neighbour.
"Gold buys only what is there" cuts the other way here: the gold is there and the men are there, and the scripts buy
nothing with them. The fix is in the scripts (allowed in every item): a rich king with idle men should raise and use
troops, measured by the use-against-ignore method. Whether the numbers themselves (army 100 shekels, upkeep 20) are
right is item 18's.

## 4. The human seat cannot give two orders the scripts can (every feature is every seat's)

The web orders tab offers no `raze` order (item 15: an army razes a level of roads, stations, harbour or works where it
stands; `src/engine/src/model/orders.ts:72`, used by the scripts in `works.ts`) and no one-off `hunt` order (an army
falls on the band in its province this season, `orders.ts:388`; the standing `huntBands` is offered in
`CourtSection.tsx:260`, the one-off is not). Checked by searching `src/web/src` for each order type's name and
constructor. The scripts, in turn, never give `unseat` (dismissing a governor, `orders.ts:364`; the web offers it in
`CommandSection.tsx:210`) and never change a commander's mandate after granting it (`mandateOrder`). Interface work,
no rule changed; the script side belongs with find 3.

## 5. Internal notation shown to a human king (polish)

- Every person card ends with the character's internal id ("c1", "c101"): `src/web/src/components/Person.tsx:66`,
  `<small className="muted">{c.id}</small>`. Seen on the People tab at 390 px. The builder rules forbid internal ids a
  king could repeat ("Requests are rules too"); the card should drop it.
- The inbox's "Movements last season" is written in the adjudicator's shorthand: "A memphis holds", "F delta holds",
  "Qadesh: A qadesh → byblos: succeeds (it stands within the walls of byblos and does not take it)", lowercase province
  ids and A/F for army and fleet (`src/engine/src/model/state.ts:965` `unitLabel`; `src/engine/src/turn/resolve.ts:358`).
  The Events tab too: "Byblos's A byblos was destroyed." (`resolve.ts:258`). Models can read it; a human reads every
  other line of the game in names and plain words, and this one in a code. The Season tab already says the same things
  well ("Qadesh's army in Qadesh got within the walls of Byblos"); the notice should use names.
- "Qadesh's army from Qadesh fought Byblos's army at Byblos: Qadesh won, far." (`src/engine/src/turn/battles.ts:152`):
  "far" for a rout reads as a typo; "by far" or "routed them".

## 6. The orders tab's opening paragraph at phone size (polish)

`src/web/src/components/OrdersPanel.tsx:34` prints "Click one of your units on the map, then a destination ... Envoys
take: Hatti: 1 season(s) each way; Babylonia: 2 season(s) each way; ..." for all 46 other powers
(`src/engine/src/rules/views.ts:356`), a wall of text that fills two phone screens before the first control, on a touch
screen where nothing is clicked. The travel times belong beside the envoy's destination when one is chosen (or in the
province card), and the word is "Tap" on a touch screen; "season(s)" should be "season" or "seasons".

## 7. Smaller presentation finds (polish)

- The Standings table's first header, "Land-yield ratio (not growth)", wraps to five lines at 390 px
  (`StandingsPanel.tsx:42`); the column needs a short head with the explanation in the paragraph above, which already
  explains it.
- The Rules tab's lead paragraph for a human seat talks of "rather than as JSON" and "the record of notes, summary and
  ledger that HOW TO ANSWER describes" (`src/web/src/pages/Play.tsx:580-581`): the model's instructions showing through
  to a human.
- `README.md` says an army's upkeep is 30 a season and a fleet's 35; the game's config has 20 and 25
  (`armyUpkeep`, `fleetUpkeep` in a saved game's header). The README also says "one of thirty powers"; the game has 47.
- The header's second line, "audiences · Any season may be the last", is cut off at 390 px ("Any season may be th").
- The timeline reads "Akhet 1346 BCE · now" for a human seat but "s2 1320 BCE · now" and "Moves of s2 1320 BCE" in god
  view, an abbreviation nobody is told.
- The people controls show "Sinai (settled 16,054 of 14,342, loose 3,168)": more settled than the land holds, which may
  be true in the rules but reads as an error without a word.
- `docs/design/10-where-the-code-differs-from-the-design-document.md` still says "Who holds each province is public at
  once"; `src/engine/src/rules/views.ts:124-160` dates each court's knowledge of an owner by what it saw or heard
  since item 7b. A stale note, to be refreshed.

## 8. A human Egypt answers fourteen audiences in season 2 (interface; a reading, no rule change)

Playing Egypt at 390 px, season 2 opened with fourteen audiences in a row, one per vassal's envoy, each reciting the
same two clauses (tribute of 10 to 20 shekels, protection asked) with the same inventory line, each needing the Answer
button. The standing answers exist (the orders tab's "Add standing answer": any court's envoy who brings gold...), but a
new player meets the wall before learning of them. Suggested: the audience panel, when the same offer waits from
several envoys, offers to answer the rest alike and to make it a standing answer, which changes no rule (the answers
are the king's). The design's "a minister who receives routine envoys" (Not built yet) is the larger answer and needs a
decision first.

## 9. Script kings repeat orders the engine refuses every season (item lane: script-king play)

Counting the "Rejected" notices in eight games' inboxes: "No runaways were sent back from X: Y has no land to take them"
1,004 times (the script keeps ordering runaways returned to a power that has fallen or lost its land); "keep the
walls of Sutean Steppe / Lukka at level N: ... has no town to wall" 109 times (walls ordered where no town is, season
after season); "Nobody was put out of X: it is not besieged / you no longer hold it" 58; "set the tax ...: you had
already set that tax this season" 33; errands given to people who never took the job ("is not in your service: they did
not take the job offered" 41, "declined your offer ...: they are not at your court" 29); orders for troops no longer
held 47. Each is a wasted order and, for a human reading god view, noise. The scripts should check the receiver's
land, the town, the siege and the hire before ordering, as a competent player would.

## 10. Troops of two men hold cities (question 1 for Haakon)

At the end of eight games, 21 of 202 units had under 200 men, among them armies of 2, 6, 7, 8 and 15 men (Jerusalem's
army of 2 in Jerusalem, Hebron's of 6 and 7, Amurru's of 15). The engine removes a unit only at 0 men
(`src/engine/src/turn/battles.ts:91,103`, `command.ts:164`), and a unit holds a province, gets within walls and blocks
a move whatever its size (the adjudicator counts units, the men only on the walls since 11e). Hatti's inbox shows the
effect: "Mira's army from mira got within the walls but did not storm them (its strength 0 against your walls 3 and
defenders 17.6 ...)". A troop of a few men, a thousandth of a full levy (`LandData.armyMen`, 5,000), still counts as an army. "Numbers come from
their causes" and "incentives, not quotas" point to a troop below some size ceasing to be a unit, its men turning band
or settling where they stand, as a band's do; that is a rule change, so it goes to Haakon (question 1 below).

## 11. A host that seals a vassal tablet says it refuses the tribute on it (item lane: script-king play)

Trail of Egypt to Arwad, game 1, season 1: Egypt's tablet asked tribute, offered protection and asked service. Arwad's
script host answered "I accept your offer of protection. I refuse your demand for tribute." and sealed the whole
tablet, tribute clause included (`src/game/src/bots/statecraft-letters.ts:717-745`: `sealBond` decides the seal, the
"accept" answers the first proposal kind, while the request loop before it refuses the tribute on its own). The words
contradict the seal, and the sealed tablet now binds Arwad to a tribute its king said he refused; the report tells
Egypt both. When the bond is sealed, the answers should match it.

## 12. More presentation finds (polish)

- The map and the timeline abbreviate every season but Egypt's to "s2 1336 BCE", "as of s0 1346 BCE", "➔ s1 1335 BCE"
  (`src/engine/src/rules/calendar.ts:68-70` `shortDate`); the panels write "the second season, 1336 BCE". Nobody is
  told what "s2" means; a short ordinal ("2nd season 1336") or the court's own season name would do.
- Facts and events carry turn numbers as "(season 4)" while the interface dates everything by the court's calendar
  (`src/engine/src/turn/envoys-home.ts:50-53`, `envoys.ts:272`); `dated()` in `src/web/src/ui/format.ts:16` already
  rewrites "turn N" and could cover "season N" too.
- Lowercase ids in the People tab's status line: "commanding an army in lukka · in lukka" (the status text of a
  commander); and in rejections shown to a king: "pay c12 the rest of the fee owed: not enough gold".
- Event texts with ids: "c100 let debt d64 pass its season." (`src/engine/src/turn/money.ts:244`): the character's and
  the debt's ids where a name and "the debt of 40 shekels to X" belong.
- "Hatti put 0 people out of besieged Kizzuwatna." (an expel event logged for nobody); and "Nobody at Egypt's court
  understood Akit-Teshup, envoy of Akko" in the Season tab while the audience says "Abdi-Milki carries his words to you":
  the first event should say "only through Abdi-Milki".
- A bridge's "Changed the words of X, envoy of Y" fact is pushed once per servant who noticed
  (`src/engine/src/turn/languages.ts:627-636`, inside `for (const w of servantsAt(...))`), so a People card lists the
  same line seven times. One fact per bridging, naming who heard it.
- The Legends tab's "rise and fall of Egypt" opens with fifteen lines "Sealed a vassal treaty with ..." for the opening
  bonds, which were starting data, not deeds; one line ("Began the age with fifteen vassals by sealed tablet") reads
  as history.
- The Inbox's "Treasury ... including 18 unassayed shipment(s)": "shipments".

## 13. Numbers for item 18 and 17++ (evidence only, no change proposed)

- Egypt won 5 of the first 8 games (Babylonia, Pella and Arzawa one each), with the score meant to level a one-city
  power and an empire ("Standings"); the arming failure of find 3 may be why, since Egypt starts with five units and
  keeps them.
- Taxes: in game 1 the script kings set a tax 1,988 times in 102 seasons (Babylonia 276 times, Hatti 238), ending at
  30% to 37% in most provinces, and 2,249 "fled a heavy tax" events moved about 1.07 million people in that one game
  ("589 people fled a heavy tax from Arrapha into Ashur"). Whether that is the equilibrium 10+a meant or over-taxing is
  for 17++ (which replaces the tax rate) and 18 to judge; the re-setting every season is the scripts' habit, not a
  rule.
- Fourteen audiences in one season for Egypt (find 8) are the fifteen opening vassal bonds each sending tribute at
  once; a reading of the data, not a rule.

## Questions for Haakon

1. **Should a troop too small to fight go on counting as a unit?** Armies of 2, 6, 7 and 15 men hold cities and block
   moves at the end of games (find 10). Reading the audit would take: a troop below a tenth of a full levy's men
   (500 for an army, 200 for a fleet's crews) stops being a unit at the season's end; its men turn band where they
   stand or settle there, as a fallen king's leaderless men do, and the land is held by nobody until someone stands in
   it. Alternative: as now,
   any unit of one man or more holds land, and only men on the walls are counted.

*The audit continues: the 50-game summary and its signals, the phone at a throttled CPU, and the reviewer's check.*
