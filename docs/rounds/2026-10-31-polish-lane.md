# Polish lane, 31 October 2026 (second account)

Brief: "The polish lane" in `docs/BUILD-PROGRESS.md`. Worked from the copy of the design document in `docs/intent/`
(no live document on this account). Weekly usage: unknown (this session cannot read it).

Each fix is its own PR from `develop`; this file keeps the running list.

## Fixed (one PR each)

- #238 the Counsel card's kings; #239 gold to the whole shekel; #240 the empty Play page's top bar and saved games;
  #255 touch targets of 44 px; #256 the README brought up to the game as built ("First, the README"); #259 the
  far-zoom edge ("Also first"); #261 person cards without the internal id (audit 7); #262 the Standings table at 390 px
  (audit 11); #264 the Rules tab's opening for a human (audit 12); #267 the preset cards' estimates for the table's
  ending; #268 dates spelled "season 2, 1344 BCE", not "s2"; #269 the one-off hunt and razing for a human seat (audit 6,
  with the draft's default hold left out beside a unit another order names); #271 "settled N, land for M"; #272
  "shipments", not "shipment(s)"; #273 Legends' opening bonds as one undated line.

**Resumed 31 October, 23:20 UTC** (the orchestrator, from Haakon: carry on from the pushed branches; merge #260 and the
waiting PRs as CI goes green; then Space and the speed keys; then the remaining finds). Added: #293 (Space and the pace keys), #294 (the design note on province ownership), #295 (the audience panel's pointer to standing answers, audit 15),
#296 ("(season 4)" dated on screen).

**State when usage ran out (31 October, about 19:30 UTC; Haakon: "We are running out of usage. 97 percent. commit and
push.").** Merged into `develop`: #238, #256, #255 (and #239 if its merge below went through); milestone PR #260 carries
them to `main`. Every other PR above is pushed, reviewed by one Opus reviewer with its findings fixed, and waiting on CI
(congested): merge each once green, then this PR (#234), which carries every fix's progress line. #273 is not yet
reviewed. Pictures for the PRs are on the branch `polish/pictures` (never merged).

Pictures for the PRs live on the branch `polish/pictures`, which never merges.

**How the progress lines are kept (a reading).** Each fix first carried its own line in `docs/BUILD-PROGRESS.md`, as the
lane's brief says; with eight fixes in CI at once, every merge put all the others in conflict on that one list, and each
re-sync cost a full CI run (about 20 minutes). From 31 October evening the lines go into this lane's own PR (#234),
merged after the fixes, which keeps "one line per fix under the lane" without the churn (principle: "Usage is limited.
Prefer the cheapest approach that does the job well").

## Finds not yet fixed

- Audit 15's "answer the rest alike" was left out (#295 points to standing answers instead): copying one reply to the
  next envoys would carry what belongs to one audience, and the worker gives the page one audience at a time.
- `src/web/src/components/orders/TreasurySection.tsx` gives a unit away (`giftUnit`) through `draft.other` too; #269's fix
  to the draft covers it, but nobody has checked it in play.

Fixed since they were listed here: the Standings tab's leak of distant holders (#297), the seat menu at 390 px (#303),
`who-decides.test.ts`'s slow "Planning" tests (#302), the timeline's label against the header's season (#307), and
"ten times the yield" for strength in the README, the Standings tab and the design notes (#310).

## Handed to the item lane (they change what models read)

- Audit 8 (the inbox's adjudicator shorthand), 9 ("Qadesh won, far.", `turn/battles.ts:152`), 10 ("1 season(s) each
  way", `rules/views.ts:356`), batch 2's ids in engine text ("commanding an army in lukka", `rules/views.ts:773`; "pay
  c12 the rest…"; "c100 let debt d64 pass its season", `turn/money.ts:244`), and fractional treasuries reaching
  `formatMoney` in model text.

- The models' opening lines say "Its starting strength is 10 x its homeland yield + its treasury"
  (`src/llm/src/rules.ts:224`), while THE MAP lists each province's base "yield" and strength counts what the land
  produces in a season (`rules/scoring.ts`, the rulebook's own HOW YOU WIN line) plus holdings: "yield" there means two
  numbers. A model request, so left to the item lane.

- Event and news text names some powers by id where its name differs: "Terqa settled 874 loose men in Terqa",
  "Seha hired Ammistamru", "sold grain at Seha River Land" (the power Terqa is shown as Hana, Seha as the Seha River Land).
  Likewise `${task.requester}` and `${culprit}` (`turn/intel.ts:704-719`) and seals joined in `turn/intel.ts:774`,
  `turn/knowledge.ts:177` and `turn/archives.ts:72`.
  The engine writes these lines and kings read them, so they go with audit batch 2's ids in engine text; the interface's
  own "known to" notes and seals are fixed (polish lane).

## For the design session

- The README reviewer notes that troops are paid and fed by the engine each season with no order (`payTroops`,
  `feedTroops`), unlike servants' fees, which sits uneasily with "Nothing happens unless someone orders it".

## Space and the pace keys (#293)

Haakon, 1 November 2026, on speeds: "I don't feel we should introduce 5, just to have 5. Paradox games have them because
they tick time. but we have rounds, akin to civilization.", then "Yes, please! expertly!" ("Pace of play" under
Interface). The first version of #293 read "1 to 5 set the speed" as five speeds and added Very slow and Fast; that
reading is dropped. Built: 1 Slow, 2 Normal (the default), 3 Fast, the game's three existing speeds as paces; + and −
step between them; Space does what the play button shows. Left to items 17+++ and 17+++a, as "Pace of play" puts them,
and noted in the key table (`src/web/src/ui/keys.ts`): 4 for Simulate, Space pausing mid-playout, Enter ending one's
season.

