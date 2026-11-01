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

## Fixes, one line each

Moved word for word from `docs/BUILD-PROGRESS.md` on 1 November 2026 ("The workshop check"); new fixes add their line here.

- The Counsel preset's card named Sonnet as its kings; it now says Haiku plays them, with Sonnet planning.
- Gold in the panels was shown with the treasury's fractions ("10.5311700 shekels"); it is now rounded to the whole shekel.
- The empty Play page lost the top bar and spoke of loading a log it gave no way to load; it keeps the bar and links to the saved games.
- On phones the whole-map button stayed 34 px (the touch rules came before the base rule), and the Legend button, the ⋯ menu, the header's selects and the page links were under 44 px; all are 44 px now.
- The README brought up to the game as built: forty-seven powers and their starting positions, walls, the ending and the score as they are now, command at a distance, the land and its people, tongues, the council, the living map, legends, the Counsel preset and the developer commands.
- The far-zoom edge: zooming out stops where the drawn world (the board and the lands beyond it) fills the view, so a wide or tall screen never shows bare water past the map's edge.
- Person cards in the People tab and the court's hiring list ended with the character's internal id ("c101"); it is gone (improvement audit, find 7).
- Standings at 390 px: the header "Land-yield ratio (not growth)" took five lines and each row three; the header reads "Land yield" (the rest in its tooltip and the text above), the yields sit on a line of their own (hidden on phones), and gold no longer wraps (improvement audit, find 11).
- The Rules tab's opening for a human seat now says first how a human gives orders, and that the rulebook's JSON and HOW TO ANSWER speak to model kings (improvement audit, find 12).
- The preset cards' estimates were reckoned for 44 seasons while the table's own total used its ending (80 by default), so one page showed two prices; the cards use the table's ending too.
- Dates read "season 2, 1344 BCE", never the shorthand "s2" (audit batch 2).
- A human seat can order the one-off hunt and razing, as script kings do (audit 6); the draft no longer gives a default hold beside a unit another order names.
- People's provinces read "settled N, land for M", not "N of M" (audit 14); "shipments", never "shipment(s)" (audit batch 2).
- Legends give the bonds sealed before the age one undated line per court, not a deed each (audit batch 2).
- Space pauses and unpauses, 1 to 3 set the pace (Slow, Normal, Fast), + and − step between them ("Also first"), in one key table that item 17+++a extends with 4 Simulate, Enter and the rest.
- The audience panel points a court with no standing answers to them (audit 15); a fact's "(season 4)" is dated by the court's calendar on screen (audit batch 2); the design note on province ownership no longer says "public at once" (audit 13).
- The `who-decides` planning tests ran 86 to 153 s on the full world and timed CI out; they play the seven Great Kings among idle powers now, 20 to 31 s each, testing the same rules.
- A human with one seat saw a one-choice seat menu at 390 px; it is a plain label, "Egypt (you)".
- The timeline read "season 1 · now" while the header planned "Season 2"; it reads "after season 1, 1346 BCE", the board it shows (" · now" on computers only, where it fits).
- The Provinces list ended each row in a bare number; it reads "yield 35", with a tooltip saying it is the base yield the harvest is reckoned from.
- A seat's orders listed "Terqa: 1 season(s) each way" for every court; they read "Envoys take, each way: Hana: 1 season; Babylonia: 2 seasons" (the engine's line, which models read, unchanged).
- The Standings tab said growth "counts treasuries and back pay too"; since item 11a nothing owed is counted, so it reads "treasuries and what people and men hold".
- The game menu (⋯) put each checkbox at one side and its word at the other ("☑ … Music"), with short volume sliders; the word stays beside its box and the sliders span the menu.
- On a phone the home page's "Your seat" broke over two lines beside its menu; the label stands above the menu, as the table's other fields have it.
- At 390 px "Customize the table" ran its "Played by" menus off the screen (the page scrolled sideways, 444 px wide); the table fits its column and each menu the room left beside the power and its tier.
- A saved game's line read "…(turn 3), 47 Script bot"; it reads "Script bot for 46 seats, Human for 1 seat" (new saves; older ones keep the line they were saved with).
- An audience's answer ran "Seal the tablet  Gift to the envoy [0]" together and left its amounts bare ("purity % 100"); the seal has its own line, each amount its unit ("[0] shekels", "of purity [100] %"), the envoy order form too, and the note says accepted service is paid three seasons ahead.
- The Standard preset's card told players it was "The design document's table"; it reads "The table the game is built for".
- The header's second line began with the runner's step in lower case ("orders · Any season may be the last"); it reads "Orders being given", "Audiences", "The season resolves" and so on.
- A free person's card (candidates to hire, the court) opened with a stray "·" ("· at your court"); the line joins only the parts there are.
- "(known to Terqa)", "Seals: Seha": the "known to" notes, seals, the winners line, an audience's vassal, the tolls line, buying news and the "whose troops?" list named powers by their engine ids; they use the names the game shows ("Hana", "the Seha River Land").
- A gift of troops read "give Memphis to Hatti" in the draft, beside "cede Memphis to Hatti"; it reads "give the army at Memphis to Hatti" (the engine's own words, which kings read, unchanged).
- The README, the Standings tab's opening table and two design notes said strength is ten times the land's yield; it is ten times what the land produces in a season (its harvest at the price of grain plus its mines), as the rulebook and `rules/scoring.ts` have it.
- On a computer the Legends tab's and a followed life's dates ran into the line beside them ("season 2, 1346 BCSealed a tablet"); their column is wide enough for the dates since they read in words.
- The end of an age read "The age has ended (the gods have ended the age)"; it reads "The gods have ended the age." (or "Only one kingdom remains.", "The age has run its course."), and the header names the winners as the game shows them.

## Finds not yet fixed

- Audit 15's "answer the rest alike" was left out (#295 points to standing answers instead): copying one reply to the
  next envoys would carry what belongs to one audience, and the worker gives the page one audience at a time.
- In a seat's view the map's "as of …" notes on remembered units overlap one another near Gaza (Egypt, desktop, the
  first season): label placement on the map, left for item 19++ (the visual pass).

Fixed since they were listed here: the Standings tab's leak of distant holders (#297), the seat menu at 390 px (#303),
`who-decides.test.ts`'s slow "Planning" tests (#302), the timeline's label against the header's season (#307), and
"ten times the yield" for strength in the README, the Standings tab and the design notes (#310), and giving troops
away, checked in play: the order drafts and seals alone, and now reads "give the army at Memphis to Hatti".

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

