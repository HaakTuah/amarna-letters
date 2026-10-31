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

- The timeline reads "s1 1345 BCE · now" while the header names the season about to be played ("Season 2"): the label is
  the last season played.
- The seat menu at 390 px cuts "Egypt (you)" to "Egypt (you"; widening it squeezes the header's ending line, so left.
- Not yet looked at: audit 15 (a human Egypt meets fourteen audiences in a row in season 2 before learning that standing
  answers exist: offer "answer the rest alike" in the audience panel, interface only); batch 2's "(season 4)" in facts
  against the court's calendar (`turn/envoys-home.ts:50-53`, `envoys.ts:272`; engine text, so check whether models read
  it before touching it; `dated()` in `web/src/ui/format.ts:16` could cover it on screen); audit 13's design note
  `docs/design/10-...` still saying province ownership is "public at once".
- `src/web/src/components/orders/TreasurySection.tsx` gives a unit away (`giftUnit`) through `draft.other` too; #269's fix
  to the draft covers it, but nobody has checked it in play.
- Workshop check: `who-decides.test.ts` "Planning" takes 111 s against a 120 s limit and timed out once on a busy machine.

## Handed to the item lane (they change what models read)

- Audit 8 (the inbox's adjudicator shorthand), 9 ("Qadesh won, far.", `turn/battles.ts:152`), 10 ("1 season(s) each
  way", `rules/views.ts:356`), batch 2's ids in engine text ("commanding an army in lukka", `rules/views.ts:773`; "pay
  c12 the rest…"; "c100 let debt d64 pass its season", `turn/money.ts:244`), and fractional treasuries reaching
  `formatMoney` in model text.

## For the design session

- The README reviewer notes that troops are paid and fed by the engine each season with no order (`payTroops`,
  `feedTroops`), unlike servants' fees, which sits uneasily with "Nothing happens unless someone orders it".
