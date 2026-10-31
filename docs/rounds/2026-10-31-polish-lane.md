# Polish lane, 31 October 2026 (second account)

Brief: "The polish lane" in `docs/BUILD-PROGRESS.md`. Worked from the copy of the design document in `docs/intent/`
(no live document on this account). Weekly usage: unknown (this session cannot read it).

Each fix is its own PR from `develop`; this file keeps the running list.

## Fixed (one PR each)

- #238 the Counsel card's kings; #239 gold to the whole shekel; #240 the empty Play page's top bar and saved games;
  #255 touch targets of 44 px; #256 the README brought up to the game as built ("First, the README"); #259 the
  far-zoom edge ("Also first"); #261 person cards without the internal id (audit 7); #262 the Standings table at 390 px
  (audit 11); #264 the Rules tab's opening for a human (audit 12); the preset cards' estimates for the table's ending.

Pictures for the PRs live on the branch `polish/pictures`, which never merges.

**How the progress lines are kept (a reading).** Each fix first carried its own line in `docs/BUILD-PROGRESS.md`, as the
lane's brief says; with eight fixes in CI at once, every merge put all the others in conflict on that one list, and each
re-sync cost a full CI run (about 20 minutes). From 31 October evening the lines go into this lane's own PR (#234),
merged after the fixes, which keeps "one line per fix under the lane" without the churn (principle: "Usage is limited.
Prefer the cheapest approach that does the job well").

## Finds not yet fixed

- **Season shorthand** ("s2 1336 BCE", "as of s0 1346 BCE", "Moves of s1 1345 BCE", audit batch 2): `shortDate` in
  `src/engine/src/rules/calendar.ts:68` is display only (its comment: no rule, view or prompt reads it), used only by the
  web; spell it as the header does ("season 2, 1336 BCE"), update `src/engine/test/map-presentation.test.ts:43-44`, and
  check the timeline label still fits at 390 px.
- The timeline reads "s1 1345 BCE · now" while the header names the season about to be played ("Season 2"): the label is
  the last season played.
- The seat menu at 390 px cuts "Egypt (you)" to "Egypt (you"; widening it squeezes the header's ending line, so left.
- Audit 6 (the human seat cannot give `raze` or the one-off `hunt`), 14's "Sinai (settled 16,054 of 14,342…)", 15
  (fourteen audiences in a row: "answer the rest alike"), batch 2's Legends listing the fifteen opening bonds as deeds,
  "(season 4)" in facts against the court's calendar, and "18 unassayed shipment(s)": not yet looked at.
- Workshop check: `who-decides.test.ts` "Planning" takes 111 s against a 120 s limit and timed out once on a busy machine.

## Handed to the item lane (they change what models read)

- Audit 8 (the inbox's adjudicator shorthand), 9 ("Qadesh won, far.", `turn/battles.ts:152`), 10 ("1 season(s) each
  way", `rules/views.ts:356`), batch 2's ids in engine text ("commanding an army in lukka", `rules/views.ts:773`; "pay
  c12 the rest…"; "c100 let debt d64 pass its season", `turn/money.ts:244`), and fractional treasuries reaching
  `formatMoney` in model text.

## For the design session

- The README reviewer notes that troops are paid and fed by the engine each season with no order (`payTroops`,
  `feedTroops`), unlike servants' fees, which sits uneasily with "Nothing happens unless someone orders it".
