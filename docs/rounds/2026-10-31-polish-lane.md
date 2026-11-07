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

**Resumed 31 October, 23:20 UTC** (the orchestrator, from the owner: carry on from the pushed branches; merge #260 and the
waiting PRs as CI goes green; then Space and the speed keys; then the remaining finds). Added: #293 (Space and the pace keys), #294 (the design note on province ownership), #295 (the audience panel's pointer to standing answers, audit 15),
#296 ("(season 4)" dated on screen).

**State when usage ran out (31 October, about 19:30 UTC; the owner: "We are running out of usage. 97 percent. commit and
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
- Every province a proper name ("Places by their own names"): the copper hills of Alashiya are Tamassos, its harbour Enkomi, the land of the Tjehenu Tjehenu, the Kaska lands Kaska, the Sutean steppe Sutu, and the map's plateau beyond the Salt Sea Moab; what the descriptions said is on the province card, under the name. Still open: the powers' land names ("the land of the Tjehenu", "the Kaska lands", "the Sutean steppe", "the land of the Shasu"), whose renaming changes how the script kings read letters (seed 2 changed its winner), so it goes to an item.
- An audience's answer ran "Seal the tablet  Gift to the envoy [0]" together and left its amounts bare ("purity % 100"); the seal has its own line, each amount its unit ("[0] shekels", "of purity [100] %"), the envoy order form too, and the note says accepted service is paid three seasons ahead.
- The Standard preset's card told players it was "The design document's table"; it reads "The table the game is built for".
- The header's second line began with the runner's step in lower case ("orders · Any season may be the last"); it reads "Orders being given", "Audiences", "The season resolves" and so on.
- A free person's card (candidates to hire, the court) opened with a stray "·" ("· at your court"); the line joins only the parts there are.
- "(known to Terqa)", "Seals: Seha": the "known to" notes, seals, the winners line, an audience's vassal, the tolls line, buying news and the "whose troops?" list named powers by their engine ids; they use the names the game shows ("Hana", "the Seha River Land").
- A gift of troops read "give Memphis to Hatti" in the draft, beside "cede Memphis to Hatti"; it reads "give the army at Memphis to Hatti" (the engine's own words, which kings read, unchanged).
- The README, the Standings tab's opening table and two design notes said strength is ten times the land's yield; it is ten times what the land produces in a season (its harvest at the price of grain plus its mines), as the rulebook and `rules/scoring.ts` have it.
- On a computer the Legends tab's and a followed life's dates ran into the line beside them ("season 2, 1346 BCSealed a tablet"); their column is wide enough for the dates since they read in words.
- The end of an age read "The age has ended (the gods have ended the age)"; it reads "The gods have ended the age." (or "Only one kingdom remains.", "The age has run its course."), and the header names the winners as the game shows them.
- In the Standings tables a power's name could fall to the line below its emblem ("Carchemish" alone under its seal);
  emblem and name now stay on one line (#346).
- The camera stopped where the board met the screen's edge, so a province at the edge of the play area could never be centred; it now goes until the board's edge is at the centre, over the lands drawn beyond it, never past them.
- On the whole map a tap on a small city's seal opened whichever neighbour's tap circle was drawn last (Sidon's opened Ṣurru, Gezer's Ayyaluna: 23 of 71 seals on a computer, 31 on a phone); the nearest seal wins now (5 and 1 left, each a neighbour's army counter drawn over the seal, an open find).
- The panel's tabs and the courts along the map scrolled only by touch or the arrow keys; with a mouse they scroll with the wheel and by dragging, and a drag never picks the tab or opens the court it started on.
- Looking back at an earlier season, the province card gave the live state (in a seat view the new holder's figures where the city has since fallen); it gives that season's recorded figures (from the weekly blind re-review of #374).
- A king's other names were never shown (#418): his card, from the courts along the map, now gives them under his name ("Also known as Akhenaten; Neferkheperure Waenre; Amenhotep IV"), every name but the one the viewer's court uses.
- A post with an article of its own took another ("once a the ruler's brother", "Served as an a lord of the coast", "a King's Son of Kush"); such a post, or a title, now takes none (#468).
- Every province drew its realm's thick band all round it, so a realm's own provinces were parted as hard as two powers; the band now runs only where a realm meets another power, no one's land or the sea, and its own provinces are parted by the thin province line ("Following, travel lines and borders", third of three parts).
- A followed person's line ran straight between the places the seat knew him at, across deserts and seas; it now runs along the roads between them, and stops at the last place known ("Following, travel lines and borders", second of three parts; a seat's own travellers already drew their whole road, and no one else's is drawn but as reported).
- Follow brought the camera to its person once and stayed put; the camera now keeps to the person, where the seat last knew him, season after season, until the player moves the camera (a drag, a province chosen from the list, the whole map shown; "Keep the camera on them" in the Follow tab takes it back) or stops following ("Following, travel lines and borders", first of three parts).
- The small seal of a land with no great town of its time (Kaska, Lukka, Nesa, the steppe, Libya, the Shasu) was drawn 1.43 times as wide as the box the placement kept clear for it, so a caravan's mark could touch it (#525); it now shrinks to the small seal's share of its own size.
- A quiet frontier and one where two powers' armies stood face to face looked the same (#549); the latter now has a faint wider stroke under its band, drawn only from the armies the seat sees now. The bands layer is redrawn per scene, not per frame, so switching whose eyes the map is seen through redraws the borders too.
- The map kept a seal's fill clear of other markers but not its rim, so the thick dark rim of a crowded or besieged small seal could touch a neighbour (#562); the placement and the smoke test now measure each seal with its rim.
- On a phone the courts along the map were chips 21 px tall, and the chosen one's ring was cut off at its top and bottom; with a finger each chip is a 44 px target, its pill drawn inside it at the height it had, and the ring whole.
- A person whose name says their place was named with it twice ("Abdi-Ashtarti of Ta-Mehu of Ta-Mehu, chief of the loose men") on the People tab, person cards, the Follow tab, an audience and the wealth table; the place is said once, by the engine's own rule (`nameFrom`), and the People tab's emblem no longer touches the name.
- A province with many bands drew their campfires in one row from its city, eight of them running across the next province and into the Gulf (Urim, late in a game); below a city stand three marks at most, the third counting the rest ("+6"), its title telling each of them ("6 more bands in Urim:", then their men and chiefs).
- The game menu's volume sliders were the browser's blue beside the game's brown checkboxes, and its two links were 22 px tall on a phone; every slider takes the game's accent, and with a finger its links and sliders are 44 px targets.
- A border glowed where two powers' armies faced each other (#583), but the numbers were only on the counters; a province's card now lists, for each glowing frontier, the armies the seat sees that season on the other side (#586, queued by the owner): "In Suhu: an army, 2,877 men, of Babylonia."
- A followed person's line stopped at the last place the seat knew him, but nothing said how old that was, so a person unseen for years looked as if he stood there now (#539); the line's end now says "last seen 8 seasons ago", and nothing while he is in sight this season.
- A seat's own governor, at his seat in the land, was on no follow line after he left the court, so Follow kept the camera at the capital he left; his seat is now his place each season, as his court knows it (a seat moved far off only once word of it arrives), and in god view where he truly sits.
- The legend's swatch for a crowded small seal drew its dark rim at a width of its own, 2, beside the map's 4.5 at the small seal's .45 scale (#578); the swatch now takes the map's own `--small-rim-marked` and the small seal's scale, now one variable, `--small-seal`, for the map, the legend and the placement alike, so the two cannot drift apart (2.025 px now, so it looks the same).
- The file picker for saved games and replays was the browser's own grey "Choose File" button, unlike every other button in the game, and stark in dark mode; it is now drawn as the game's buttons are, everywhere a file is chosen.
- On the New game screen, the Local agents card's cost, "your Claude subscription", broke onto two lines beside its note on desktop; the cost stays on one line, and its note moves below it when the card is narrow.
- The "How it works" page still told the first rules of combat, "strength is one plus supports … dislodged units are destroyed", and so did the rules-as-implemented design note; both now say what the README and the battles' design note do: each unit fights by its men and its commander, and a beaten unit loses men and falls back, destroyed only when beaten three to one or with nowhere to go.
- The Threads tab told a city-state's capital as its own: "Gazru, Gazru's capital may fall to Gimti next season" (the same for Niya, Akka and every realm named after its city); a city that names its realm is now said once, "Gazru may fall to Gimti next season", and a Great King's capital keeps its line ("Ashur, Assyria's capital"). The template narrator's words only; no request or seat view reads them.

## Finds not yet fixed

- A court's own people are described by province ids ("governing kizzuwatna · in kizzuwatna") and an envoy's court is said twice, on the People tab and the Follow tab: filed as bug #734, since the line is the engine's character view, which a model king reads and the script kings parse.
- Audit 15's "answer the rest alike" was left out (#295 points to standing answers instead): copying one reply to the
  next envoys would carry what belongs to one audience, and the worker gives the page one audience at a time.
- In a seat's view the map's "as of …" notes on remembered units overlap one another near Gaza (Egypt, desktop, the
  first season): label placement on the map, left for item 19++ (the visual pass).

Fixed since they were listed here: army counters standing over a neighbour's seal on the whole map (none at 1280 × 800 on 6 November, measured by each counter's box against every other province's seal, after the seals' rims were padded, #562, and part E's units, #728), the Standings tab's leak of distant holders (#297), the seat menu at 390 px (#303),
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

The owner, 1 November 2026, on speeds: "I don't feel we should introduce 5, just to have 5. Paradox games have them because
they tick time. but we have rounds, akin to civilization.", then "Yes, please! expertly!" ("Pace of play" under
Interface). The first version of #293 read "1 to 5 set the speed" as five speeds and added Very slow and Fast; that
reading is dropped. Built: 1 Slow, 2 Normal (the default), 3 Fast, the game's three existing speeds as paces; + and −
step between them; Space does what the play button shows. Left to items 17+++ and 17+++a, as "Pace of play" puts them,
and noted in the key table (`src/web/src/ui/keys.ts`): 4 for Simulate, Space pausing mid-playout, Enter ending one's
season.

