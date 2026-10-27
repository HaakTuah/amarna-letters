## Rules as implemented

- **No retreat phase.** A dislodged unit is destroyed. This keeps one order round per season.
- **Battle reports.** Next season each king reads its own orders as they resolved, and every
  foreign order whose unit stood, or moved to, a province it could see before the moves. Each of
  its own failed moves says why, from the adjudicator's own checks in their order: no convoy carried
  it; its own unit did not leave; the unit from the target was coming the other way and won (the
  reason given even when a third move then entered the province that unit left); it met another
  move into the target from a named province (always the reason given when that move took the
  target); the unit holding the target kept its place (or could not leave); or another move into
  the target was as strong (walls never stop a move since the siege package). Where strength decided it, the strengths compared
  follow ("your strength 2 against 2", with the ground's share of it where the ground helped the unit that held:
  "your strength 2 against 2, 1 of it for the rough ground of mira", since terrain in the siege package), then where the
  unit now stands ("; so your fleet stays in enkomi"), unless it was destroyed there, which its own line says ("F enkomi is destroyed"); the
  rulebook says so. (Until the fix pass after item 4 the line stopped at the reason: in the second
  agent simulation Alashiya read a bounced move to Tamassos as made, gave orders to a fleet that was
  still in Enkomi, and lost Tamassos.) The other side's power is named only if that unit stood,
  or was moving, in a province the king could see before the moves. A support whose unit was
  destroyed reads "void: the supporting unit was destroyed", not "cut"; a cut support says where
  the attack came from. A support or convoy that matched no real order (the unit it named moved
  when it was supported holding, or did not make the move supported) reads "void" too, and its own
  king is told why ("A babylon supports durkurigalzu -> nippur: void: no unit moved from
  durkurigalzu to nippur"); other kings see only "void". (Until the simulation-fixes round,
  foreign lines were kept by the moving unit's origin only, so a move from out of sight that
  bounced a king's move was never shown, and a support that matched nothing read "holds".)
  A move that got within walls its mover does not hold says what came of it, with the strengths
  ("- A kanesh -> carchemish: succeeds: it got within the walls of carchemish but did not storm them
  (strength 1 against walls 2 and defenders 0): your army stands inside and takes nothing; besiege
  the city to wear it down", or "...: it stormed the walls of mari (strength 4 against walls 2 and
  defenders 1), and mari is yours"), and an assault on a walled city of the king's own is among his
  own lines, with his side and the strengths ("- Your walled city of Mari: Mitanni's army from terqa
  got within the walls but did not storm them (its strength 1 against your walls 2 and defenders 0):
  it stands inside, and Mari stays yours unless a siege wears it down."). Until the siege package
  such an assault showed only under "Seen nearby", with no strengths (the fix pass after item 4,
  minor finding 5). Other kings who see it read the line with "(it stormed the walls of mari)" or
  "(it stands within the walls of mari and does not take it)". The season's sieges come in a notice
  of their own, "Sieges" (see Walls and sieges).
- **Sight.** A court sees troops in its own land, where its troops stand and in the provinces its
  spies watch, and one link of any kind (land, coast or sea) from those (`Views.sight`). A province
  spy caught or let go unknown to its master still counts while the master's cover believes it at
  its post, so the capture cannot be read off the sight line before word comes. The rulebook
  and the view's sight line say so, and that troops two links away, or an army carried across the
  sea, can arrive next season unseen. (Until the simulation-fixes round they said only "in and next
  to your own lands and troops", and empty seas were read as safety.) A refusal says nothing of
  troops out of sight: an order for a unit in a province where the king has none reads "you have no
  unit in ashur" whether the province is empty or holds a foreign unit, and "the unit in ekallatum is
  not yours" only where it can see; a support or convoy naming a province out of sight is never
  refused for what stands there ("there is no unit in X to support", "there is no army in X" only in
  sight), and is void at resolution if no unit there does what it helps (the rulebook says so). The
  scheduled and standing orders a sleeping king gives are refused in the same words. (Until the
  review of the simulation-fixes round's Part D, both refusals named a foreign unit anywhere, so an
  order for any province told whether a foreign unit stood there, and the support check told whether
  an unseen province was empty.)
- **Ownership changes every season**, whenever a unit ends a season in a province, not only in
  autumn as in Diplomacy.
- **How a season resolves.** The rulebook's section of that name lists the engine's own order
  (`TurnEngine.beginTurn`, `GameRunner.playTurn`, `TurnEngine.resolveSeason`) in 18 short
  steps: servants whose notice ran out leave; income, upkeep and wages (the wages of people at
  court; those of people away added to their back pay) and desertion; arrivals, then back pay paid
  to everyone at the court that owes it; the court (candidates, checks and examinations, contract
  ends and notices, a servant still owed back pay giving notice); audiences; orders;
  movement and battles; sieges (since the siege package); land changes hands; a kingdom falls with
  its capital (since the siege package, in place of "kingdoms with no land fall" after the
  catastrophes); cessions and gifts of troops; purchases, then walls strengthened; disbanding;
  levies; envoys set out, releases, dismissals, candidates sent for and checks paid, then hiring and
  renewals; intelligence (watchmen, captors, spies sent and recalled, assays, examinations,
  forgeries, ransoms, then spies caught or reporting); catastrophes;
  scores and the end roll. It says that orders are checked in the order the reply lists them
  (units, then letters, then other orders; a sleeping seat's scheduled orders after its fresh ones),
  that gold is reserved as each is accepted and there is no "else", that a person hired this season
  can be sent on an errand only from next season, what rival bids do, where a levy can stand, and
  what a spy needs. The refusals use the same words: "not enough gold: it needs 100 shekels; orders
  listed before it had reserved 100, and 50 was left" (or "…, and your treasury held 50 by your
  ledger"); "Mane was to be hired that season: a person hired enters your service only at the end of
  the season, and can be sent on an errand from the next season" (whichever order comes first); "a
  spy must be one of your own people at your court: you named nobody" (or "…: Mane is not at your
  court"); "a spy must be sent to watch a court or a province: you named neither". The hire itself
  reads, next season, "Mane entered your service at the end of last season, at 20 shekels a season,
  and can be sent on an errand now." Only a hire that can stand counts: an errand for someone whose
  hire is refused (no wage, someone in another court's service) reads "Mane is not in your service".
  A second assay of the same lot, or a second cession of the same province, in one season is
  refused ("Thebes was already ceded by an earlier order"). The parser drops no order a reply names:
  a place_spy naming neither court nor province, a move, support or convoy that leaves out where to
  go, whom to support or where to land ("name the province the unit should move to"), and a
  cession, gift of troops, spy, letter or forgery naming a power nobody knows ("there is no power
  called 'Kush'", or "name the power to cede it to"; `UnreadableOrder`) all reach the validator and
  are refused with the reason; the unit holds. (Until the simulation-fixes round the rulebook's
  "EACH SEASON" list ended with "Resolution, catastrophes, and reports", and 26 of the simulation's
  43 refusals came from rules it never stated; those malformed orders vanished without a word, and a
  forgery quietly lost any seal it could not read.)
- **Walls and sieges** (Build order item 5, the siege package; save version 6; question 5 of
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, plan steps 1 to 9, and the design document's
  "Tempo of war" and "Walls and terrain"). Walls set how long a city holds out, not how many armies
  a field battle needs:
  - **Walls by place** (`StartWalls`, first guesses): every capital 3; the fortresses
    Carchemish, Qadesh, Tyre, Megiddo, Gaza, Mari, Susa, Memphis, Kanesh and Nineveh 2; the walled
    towns Lukka, Isuwa, Ugarit, Amurru, Byblos and Damascus 1; every other land province none. So
    every free city has walls, and so do the capitals and three homeland fortresses. The walls
    standing now are the game state's (`GameState.walls`). THE MAP in the rulebook gives each
    province's walls at the start, which every court knows. **A court sees the walls standing now
    only where it sees troops** (its sight: its land, its troops, its spies' provinces and next to
    them), and knows them elsewhere as it last saw them (`Views.wallsKnown`, `GameState.wallsSeen`:
    each living court's, set from the map at the start and, as each season resolves, from what its
    view showed when it gave its orders), in its view ("LANDS ...: mari (walls 2)") and on its map
    (a ring for each level; the province card says "as your court last saw them" out of sight, or
    "as the map gave them at the start" where it never saw). God view draws them as they stand. Since
    the review of the siege package: until then every court saw every wall as it stood, so an
    earthquake (known exactly only to the king it strikes), walls that fell for want of upkeep (which
    told every court that a rival's treasury could not keep them) and walls raised for gold out of
    sight (whose fortify notice goes only to courts with sight) were all seen by everyone. A court
    that can see a province sees its walls fall to an earthquake there, as it sees a troop lost to
    plague. The rulebook says so in WALLS AND SIEGES and WHAT YOU SEE, and LANDS' heading ("the walls
    elsewhere as you last saw them").
  - **Walls add nothing to a battle.** Combat resolves as always, and a unit within walls defends
    with 1 plus its supports, and the ground's help where it has it (see Terrain). (Until the siege package walls were pretend units that held with
    strength 1, only on the free cities.) A move that wins its way into a walled province its mover
    does not hold **storms** the walls, and takes the province at once, only if its strength also
    beats the walls' level plus the hold strength of the defenders it beat (`Assault`; none if the
    province was empty or its unit got away, the defence of a unit met head on). An empty city with
    walls 1 needs 2, as before; Hattusa held by one army needs 5, more than its neighbours can
    supply. Otherwise the unit stands within the walls and takes nothing (`TurnEngine.updateOwnership`).
    A fleet never storms or besieges walls: it takes only coasts without walls. A foreign unit within
    walls without a siege is a **guest** and takes nothing, so an ally's relief army may stand in
    a friend's city, and turning on the host (a besiege order) is a visible act. A province without
    walls changes hands as before; the rulebook's MOVEMENT AND COMBAT says "A province without walls
    changes hands when a unit ends a season in it; a walled one only as WALLS AND SIEGES says" (since
    the review of the siege package, which found the old sentence, true only of land without walls,
    left in place). Owners may move their own troops into their own walled provinces
    (until the siege package they could not enter a bought city).
  - **Besieging** (`BesiegeOrder`, schema "besiege"): an army standing within walls it does not
    hold may besiege the city. The order runs as a hold. Each season the army holds there (a besiege
    or hold order, or none) the city is worn down a step, or two if another unit, of any power,
    gave it a support to hold that was not cut (`AdjudicationResult.holdSupported`); a season in
    which it supports, convoys or tries to move adds nothing. One order is enough: the siege goes
    on while the army holds there. When the city is worn down as far as its walls are high, it
    **surrenders** to the besieger at the end of that season (`TurnEngine.sieges`, after movement and
    before land changes hands) and its walls fall a level; a city stormed falls a level too. So a
    lone army takes walls 1 in the season after it got in, walls 3 in the third (four seasons
    counting the entry, question 5's timings), with a support each season walls 3 in the second.
    If the besieging army leaves or is destroyed, or deserts, the siege is lifted and its progress
    lost. Breaking a siege is ordinary combat against the besieger.
  - **While besieged** the city stays its holder's and counts in his strength, but yields nothing
    (`TurnEngine.effectiveYield`), and no levy can be raised there (the besieger stands in it). Each
    siege costs its besieger `GameConfig.siegeUpkeep` (15, a first guess) a season on top of the
    army's upkeep, paid with upkeep. The holder may still cede the city.
  - **What kings read.** The battle report (above); a "Sieges" notice each season to the besieger
    and to the city's holder: begun ("Your siege of Mari (walls 2, a free city) has begun, and it
    wore the city down a step: it stands at 1 of 2. The city surrenders when that reaches 2, if your
    army holds there."), pressed, not pressed, lifted, and surrendered ("Mari surrendered to you after
    a siege of 2 seasons: it is yours, with its walls a level lower (walls 1)."); the holder reads
    "Land lost" when it falls. The view's SIEGES line lists the sieges it knows of (its own, of its
    cities, and in its sight) with how far each has gone. The record logs "storm" and "siege" events,
    with the signals `storm`, `siege-begun` and `siege-won` counted in the batch report.
  - **Sallies** (`SallyOrder`, unit order "sally": the city as the unit, the province the attack comes from as the target;
    question 5, plan step 8). While foreign troops stand within the walls of a city of the king's whose walls are
    `GameConfig.sallyMinWalls` (2) or higher, its defenders may sally: the walls support one attack into the city on those
    troops, the king's own or another king's, for +1, a support that cannot be cut (counted in `Adjudicator.supports`, for
    the city's holder, so it does not help a move into his own unit). One per city a season; refused below the walls
    needed, with no foreign troops within, or from a province not next to the city ("the walls of Mari stand at 1: only
    walls of 2 or more can sally", "Harran has no walls to sally from"). A sally that finds no such attack is void, and the
    battle report says so ("- The walls of mari sally in support of the attack from terqa: given", or "...: void: no unit
    moved from damascus to mari"). So a lone relief army with a sally drives out a lone besieger, who must be supported to
    hold, unless the ground helps the besieger against that attack (rough ground, a pass or a great river crossed, or a
    landing: a relief into Carchemish over the Euphrates or the Amanus, or into Nineveh over the Tigris, is 2 against 2
    and bounces), when the relief needs one support more; the rulebook's example says so (since the review of the siege
    package, which found it stated without the exception). Timing it with an ally takes letters. 0 turns sallies off. The record marks each sally (`sally`, or `sally-won`
    when the attack it supported got in). The orders panel offers "Sally from the walls of…" where it can be given.
  - **Strengthening walls** (`FortifyOrder`, other_orders "fortify", naming the province; the design document's "can be
    strengthened for gold and upkeep, a real choice between defense and expansion"; question 5, plan step 11, first
    guesses): the walls of a province the king holds rise a level at the end of the season (after purchases), up to
    `GameConfig.maxWalls` (3), for `fortifyCost` (50) × the new level, reserved when the order is checked and paid when
    it is done; a province without walls can be given them. Refused at level 3, for land not held, while the province is
    besieged or foreign troops stand within it, or twice in a season; not done, and not paid, if the province was lost in
    the moves, a siege began or foreign troops got into it
    ("Walls not strengthened": a scheduled one then wakes its seat, as others foiled it). Each level above the map's own
    for the province costs `wallUpkeep` (5) a season, paid after the troops' upkeep (`TurnEngine.wallsUpkeep`; the
    treasury notice reads "upkeep 3 minas 5 shekels, walls 5 shekels, wages ..."); walls whose upkeep the treasury
    cannot pay fall a level, the farthest from the capital first ("Unkept, walls fell a level: Sinai, Thebes."). A city
    that falls loses a level as any other, so a captured capital at 2 can be built back to 3 without upkeep. An
    earthquake throws the walls of the province it strikes down a level (its notice says so: "..., and its walls stand a
    level lower (walls 2)."); until the siege package its text spoke of walls it did not touch. The view shows the walls'
    upkeep beside the troops' (`SeatView.wallUpkeep`), and the orders panel has "Strengthen walls in…" with the price,
    offering only land the order may be given for (since the review of the siege package, not where foreign troops stand
    within).
    Script kings strengthen walls where a feared king may walk in (see Treasury under Script kings).
  - **Envoys and a besieged capital** (the design document's "Getting a message out depends on the envoy's competence and
    courage and on how tight the siege is; the besieger may capture the envoy and read the tablets"; question 5, plan
    steps 12 and 13, first guesses in `GameConfig`). While a king's own capital is besieged (`TurnEngine.capitalSiege`), the
    siege's **tightness** is the besieger's units in the city and next to it, 1 to 3 (`TurnEngine.tightness`; shown to the
    holder and the besieger in SIEGES). An envoy of his whose courage is below 20 × tightness **will not leave** that season:
    the letter is not sent and nothing is paid ("An envoy would not leave": "Mane would not leave Ashur while Babylonia's
    army besieges it: the siege is too tight for Mane's courage this season. No gold was paid."; a scheduled letter then
    wakes its seat, since others foiled it). One that goes is **caught** slipping out with a chance in percent of 20 ×
    tightness − its skill ÷ 4, between 5 and 75 (`siegeCatchPerUnit`, `siegeCatchMin`, `siegeCatchMax`), rolled on the
    seeded stream "siege-envoy" by its id; so is one coming home to the besieged capital, with what it brings. A caught envoy
    is the besieger's captive (`TurnEngine.intercept`, `Character.intercepted`): the besieger's notice ("An envoy is
    caught") gives the letter it was to speak and its mandate, the gold goes to his treasury as an unassayed lot, and the
    tablets it carried (the one to be sealed, those shown as evidence, those brought home) go into his archive. He may
    execute, ransom or release it, not turn it ("... is an envoy your besiegers caught, not a spy at a post, and cannot
    be turned"): it was no spy at a post to be sent back to. Released, it walks home in a season. Its king goes on seeing
    it on its errand (a cover) and hears only, a season after it was due back, that it has not returned; the court that
    holds it is known for it, as for a caught spy. Other kings' envoys, and the besieged king's spies, come and go freely
    (closing the roads to all, and envoys visiting several courts in turn, come later, as question 5 planned). The record
    marks envoys that slipped out (`envoy-out`), were caught (`envoy-caught`) or would not go (`envoy-stayed`).
  - **Free cities** can also be bought for 10 × yield by a power whose land or troops touch
    them, or that holds a coast on the same sea zone (islands trade by ship). Rival bids in the same
  season bounce: the elders sell to none, and each bidder is told how many buyers bid ("The elders of
  Gaza would not choose between 2 buyers last season. No gold was paid."). A city that troops take in the season of a bid is not sold: every bidder is told
  ("Gaza was taken by Babylonia's troops last season before its elders could accept your gold. No
  gold was paid.", or "Your own troops took Gaza last season; no gold was paid."), nobody pays (gold
  is only reserved when orders are checked), and a scheduled bid that fails this way wakes its seat, unless its own
  troops took the city (since the review of the fix pass after item 4: no failure of a king's own making wakes him).
  (Until the simulation-fixes round such a bid vanished without a word.)
- **A bought city keeps its walls**, which then stand for its owner, who may station troops inside;
  a city taken by storm or siege keeps them a level lower. Buying is the durable way to grow,
  conquest the slow one now. (Until the siege package walls held with strength 1 for their owner,
  who could not enter them but could support them holding, and conquest tore them down.)
- **Terrain** (Build order item 5, the siege package; save version 6; question 5 of
  `docs/rounds/2026-10-18-sleep-and-simulation.md`, plan step 14, and the design document's "Walls and terrain": "Mountains
  and hills make a province harder to take", passes and rivers "belong on the connection between two provinces", "Islands
  such as Alashiya are protected by the sea"). The lists are `Geography`'s, unchanged since the visual overhaul drew them:
  rough ground in Mira, Lukka, Isuwa, Amurru, Arbela and Tamassos; the mountain passes of the Cilician Gates
  (Tuwanuwa–Kizzuwatna), the Taurus (Kanesh–Kizzuwatna) and the Amanus (Kizzuwatna–Carchemish); the great rivers at the
  Euphrates (Carchemish–Harran, Isuwa–Harran) and the Tigris (Taidu–Nineveh).
  - **The ground helps a unit that stands its ground** (`defenceGround`, `Adjudicator.holdStrength`): one that
    holds, besieges, supports or convoys, or whose own move failed. Against an attack it holds with
    `GameConfig.terrainDefence` (1, a first guess) more when it stands on rough ground, when the attack comes over a pass or
    a great river (a crossing protects both its sides), or when the attack is a landing from the sea (an army carried by
    convoy: question 5's "a landing by convoy counts as a crossing"); 1 in all however many apply, the first named in that
    order. So one army on rough ground needs three to dislodge it, and Alashiya's island, which armies reach only by convoy,
    meets every landing with that help (Tamassos is rough ground besides). 0 turns terrain off.
  - **What it never does.** It never helps a unit that moves, nor one met head on (both armies are on the road, as in a
    swap across the Cilician Gates), nor empty land, which stays open (question 5: "only to a defending unit"); it adds
    nothing to walls and nothing to a siege's pace ("never in sieges"). A storm must beat the walls plus the hold strength
    of the defenders it beat (`Assault`), and the ground's help is part of that strength, since the move had to beat it to
    get in (a reading): Lukka (walls 1, rough ground) held by one army is entered with 3 and stormed with 4; empty, it is
    stormed with 2 as before. A besieging army standing on rough ground, or behind a crossing, has the ground's help against
    a relief like any unit standing its ground (a reading: no rule asks who holds the city). Supports are cut as always.
  - **What kings read.** The rulebook's TERRAIN section, after WALLS AND SIEGES, built from `Geography` so it stays true if
    the map changes; THE MAP marks each rough province ("- mira: Mira; land; homeland of Arzawa; yield 30; rough ground.")
    and each link over a crossing ("kizzuwatna (across the Cilician Gates)"); LANDS marks the rough ground beside the walls
    ("lukka (walls 1, rough ground)"). A failed move's line gives the ground's share of the strength it had to beat ("the
    unit holding mira (Arzawa's army) kept its place; your strength 2 against 2, 1 of it for the rough ground of mira"),
    and an assault on walls the ground's share of the defenders ("strength 3 against walls 1 and defenders 2, 1 of it for
    the rough ground of lukka"), on both sides. The record logs "terrain" events where the ground decided a battle (the
    move beat the hold without it: signal `terrain-held`) or an attack beat a unit the ground helped (`terrain-beaten`),
    counted in the batch report. The web map's tooltips, province card, legend and about page say what the ground does.
  - **The desert costs an army supplies** (question 5, plan step 15, built as the Build order's item 5 asks: "an army in its
    own land pays no desert cost", so no rule names a power). An army that ends a season's moves in desert land (Sinai,
    `Desert`) its king did not hold when the moves were made pays `GameConfig.desertUpkeep` (30, a first guess)
    with its next upkeep (`TurnEngine.markDesert`, `GameState.inDesert`, cleared once paid; `TurnEngine.desertCost` in
    `upkeep`, so unpaid it makes troops desert like any upkeep). Egypt holds the Sinai at the start, so its armies cross it
    freely (question 5's Ways of Horus), and so does anyone who takes it, from the season after: an invader pays for the
    season he marches in, and every season he stands within walls raised there without taking it. The treasury notice says
    what was paid ("The upkeep includes 30 shekels for supplies in the desert: your army in sinai ended last season in desert
    land you did not hold."); the view's upkeep line, a forecast, leaves it out. The rulebook's TERRAIN and step 2 of HOW A
    SEASON RESOLVES say so; THE MAP and LANDS mark the desert. The record marks each army that pays (`desert`). 0 turns it
    off.
- **Levies** are raised after movement, only in a province of the power's own homeland that it
  still holds and that is empty after movement; otherwise nothing is raised or paid, and the king is
  told which ("No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.",
  or "…: you no longer held Thebes after movement.", or, for land the king itself ceded earlier in
  the resolution, "…: you ceded Sinai to Hatti last season, before the levy."). Army 100, fleet 120; upkeep 30 and 35 a season. Troops the treasury cannot pay desert at the
  start of the season, the one farthest from the capital first (the rulebook says so).
- **Slow absorption** (Build order item 5, the siege package; question 5, plan step 16, and the design document's "A
  kingdom falls with its capital": "the land becomes the conqueror's over time rather than at once, so a conqueror gains
  an empire to hold, not a lump of score"). A province taken by force (troops standing in it, a storm, a siege, or
  passing with a fallen kingdom's capital) yields its new holder a third of its yield in its first season under him,
  two thirds in the second, and all of it from the third, and counts in his strength the same way
  (`TurnEngine.beginTurn`, `GameState.conquered`: the season it was taken). The first season is the season it was taken,
  for the score reckoned at its end, and the next, for the income paid at its start; the mark goes once it counts in
  full. A province of the taker's own homeland that he takes back counts in full at once (map data, not a check of which
  power it is), and so does land bought or ceded, except land ceded while its giver was still absorbing it: the mark
  stays, and the receiver goes on absorbing it from the season it was taken, unless it is his own homeland, which is his
  in full at once as if he had retaken it (`TurnEngine.resolveTransfers`; since the review of the siege package, which
  found that a cession clearing the mark let two friends launder a conquest by passing it back and forth).
  Question 5 left the score unchanged; the design document's later words ("not a lump of score") are read as the score
  following the yield (a reading; review question). Revolts, which the design document mentions, are left for later, as
  question 5 planned. The view marks such land in LANDS ("sippar (taken by force in turn 1: yields and counts a third of
  its yield this season)"), the court's own land only (`SeatView.conquered`): who holds a province is public, but how it
  changed hands is not, and a mark on every king's land told every court which land had been conquered and which ceded
  or bought (since the review of the siege package; until then every view carried every mark). The rulebook says so
  under ECONOMY ("LANDS in your view marks your own land still being absorbed; how other kings' land changed hands is
  not shown") and in HOW YOU WIN's strength. The public land standings still use base yields.
- **Strength** = 10 × (sum of base yields of provinces held, conquered land counted as far as it is absorbed) + true gold − back pay owed (see
  "Back pay" under Characters). Growth is strength over starting strength. Units are not counted;
  they cost upkeep and are the means to land. One function computes it (`strength`): the
  engine's score with true gold and the back pay a power really owes; a seat's own strength line
  (`TurnEngine.ledgerStrength`) with its gold by its ledger and the back pay it believes it owes,
  covers included; the script kings with what their view shows (see Script kings). The rulebook's
  HOW YOU WIN says so ("... + the gold in your treasury - the back pay you owe your people"), and the
  view's treasury line says that back pay is counted against it. (Until the simulation-fixes round's
  Part G, owed gold did not exist: every wage left the treasury each season.)
- **Land standings.** Every seat's view has one line after its treasury, the same for every court
  since ownership is public, labelled for what it is: "LAND STANDINGS (a land-yield ratio, not growth:
  the yield of the land each power holds now over its homeland's yield at the start, as any court can
  reckon it from who holds what. Growth, which decides who wins, also counts treasuries and back pay,
  so these are not the winning figures, and yours is not your growth on the treasury line): Mitanni
  1.93 (land yield 280, at the start 145); Egypt (you) 1.11 (land yield 210, at the start 190); …
  Fallen: Assyria." The ratio is the base yield of the land a power holds now over its homeland's
  yield (`Views.landStandings`), the living best first; it is not the score, which adds gold and
  subtracts back pay, against a starting strength that includes the starting treasury. The rulebook's
  WHAT YOU SEE says so ("LAND STANDINGS in your view give each power's land-yield ratio: … It is not
  growth: …"). The seat's own growth by its ledger stays on its treasury line. The web app's standings
  panel shows the same ratio as a column, "Land-yield ratio (not growth)", and a human seat's own
  growth and gold there by its ledger. (Until the simulation-fixes round the view gave no standings,
  and kings added up yields by hand; the human seat's panel showed its true growth and gold. Until the
  fix pass after item 4 the line was headed "STANDINGS (an estimate from who holds what; treasuries
  are left out)", and in the second agent simulation all seven kings in both games read it as growth,
  four in each misled: "I thought I was fourth of six when I was in fact below my start".)
- **Opening positions are public.** Every king reads every power's opening troops, treasury,
  homeland yield and starting strength in the rulebook ("OPENING POSITIONS (known to every
  court)"), generated from the map data (`src/engine/src/model/map.ts`) by `openingLines` (`src/engine/src/rules/opening.ts`), so the cached block stays byte-stable.
  The web app's standings panel shows the same table to every seat, human or not. Script kings
  read the same facts from `MapData`, as before.
- **Ending** (build order item 6a, "Random ending" and "An open age" under Victory; `src/engine/src/rules/ending.ts`).
  Any season may be the last from the first: the chance that season t is the last, if the age reaches it, is k × t,
  with k found so that half of all ages have ended by the median season (`endMedian`, 44 by default: 1332 BCE; about
  0.07% in season 1, 1% in season 15, 2% in season 30, 3% in season 44). The hard cap is drawn from `capMin` to
  `capMax` (80 to 100 by default; `capped` off for none; a range of one season is a known cap). Both are drawn once, in
  secret, at the start (`drawFinalSeason`, from the stream keyed to the seed and "end" alone, so no other roll shifts
  them) into `GameState.finalSeason` and `finalByCap`, and the game ends after that season ("the gods have ended the
  age", or at the cap "the age has run its course"), or when one kingdom is left. Nothing shown reads the drawn season:
  no seat view, request, look-ahead or web frame (tested). The rulebook and the web app's header say the rule in words,
  without numbers ("Any season may be the last: early on it is very unlikely, and it grows likelier with every year.").
  Since item 6b (Haakon's answer to 6a's review) a table's median moves the words, in three bands with no numbers
  (`ageBand`, `bandWords` in `rules/ending.ts`; first guesses: a median up to 30 seasons is "likely to be short", from
  60 "likely to be long"), the same for every seat in the rulebook, the view (`SeatView.ageBand`) and the header; a
  script king believes the band's own median (24, 44 or 75 seasons, `bots/ending-belief.ts`), never the table's.
  **An open age** (`openAge`): no last season and no cap, set at the start, or chosen when the age has ended by its last
  season (not with one kingdom left): the table plays on (`playOn`; the runner records `t<N>/play-on` so a replay plays
  on too), the winners and the reason stay recorded (`ageEndedTurn`), the chronicles are not written again, and the
  rulebook then says the age has no end. The game pauses at the table's spending limit, as every model game does; since
  item 6b a table with any model-played seat (a simulated API aside) sets that limit by hand before an open age starts
  or plays on (`handLimitNeeded`: the setup refuses to begin while the limit is the suggested one, and playing on asks
  for a limit above what the game has spent). Save
  version 8.
- **A kingdom falls with its capital** (the design document's rule, built with the siege package, Build order item 5;
  until then a kingdom fell only when it held no land, so a king who lost his capital fought on from his last
  provinces). After the moves, sieges and the change of hands, a king whose capital another power now holds has
  fallen (`TurnEngine.capitalsTaken`, step 10 of HOW A SEASON RESOLVES): his remaining land passes to the power that
  took the capital, every troop of his disbands (no army has a commander yet to choose for itself, so all of them do),
  his sieges are lifted, a siege the conqueror pressed against land that is now his is over, and his debts die with him
  (back pay owed by him is lost, as before; debt tablets do not exist yet). His prisoners are let go, his servants are
  free, and none of his orders after the moves is carried out (levies, purchases, envoys, intelligence). The kingdoms
  that fall in one season are found first, so one fall revives nobody. Land passing to a capital's taker that itself
  falls that season passes on with the taker's own land to whoever took his capital, and so on down the chain; a ring of
  kings who took each other's capitals leaves the land free. Every heir is found before any land passes, so the order in
  which the falls are reckoned changes nothing (since the review of the siege package, which found that when A took B's
  capital while B took C's, C's land went to A or was left free as that order fell); the conqueror down the chain reads
  "Assyria took Washukanni, the capital of Mitanni, but fell himself in the same season, and the kingdom of Mitanni
  passes to you with his: ...", and the rulebook's HOW YOU WIN says "(if he falls too in the same season, it passes on
  with his own land)". The
  conqueror reads "A kingdom falls to you" ("With Apasa you took the kingdom of Arzawa: its king has fallen, his troops
  have disbanded, and his land is yours: Seha River Land."), every other living court the rumour "Word spreads that the
  kingdom of Arzawa is no more: Hatti took its capital, Apasa." (who holds the capital is public). The game records each
  fall (`GameState.falls`: the season, the conqueror, the capital and the land that passed). A king cannot cede his own
  capital ("you cannot cede your capital: your kingdom falls with it"); a capital that is no longer its king's (his
  kingdom has fallen) can be ceded like any city, and its archive goes with it. The rulebook says so under HOW YOU WIN
  ("A kingdom falls with its capital. If another king takes your capital, ... your game is over").
- **Dice.** Every roll comes from a stream keyed by seed, turn, purpose and subject. (An early
  version keyed it by seed XOR turn, so neighbouring seeds shared rolls at shifted turns; fixed,
  with a regression test.)
- **Ids: a counter for each kind of object** (since Build order item 4, fix (d); save version 4). Every
  object the engine makes takes its id from `newId(s, prefix)`: its kind's prefix and that kind's
  own count, so tablets are "t1", "t2", ... and copies "k1", "k2", ... (`GameState.idCounters`, saved
  with the state). The prefixes are listed once, in `IdKinds`: a audience, c character, f fact, g lot
  of gold, j journey, k copy of a tablet, m message trail, q task owed to a court, r request to a
  character's mind, t tablet, u unit, x catastrophe; standing orders are numbered per seat ("s1", ...),
  outside it. Each is letters only and belongs to one kind, so ids stay unique across kinds. Why:
  many rolls are keyed by an id (a character's, a task's, an audience's), and until version 4 all
  kinds shared one counter, so more objects of one kind, or a new kind, shifted the ids of everything
  made after them and with them the dice. Build order item 3's inventory tablets and copies did just
  that, and changed the winner in 13-14% of benchmark seeds without a rule that decided anything.
  Now a kind added later, or more of one kind, leaves the ids of every other kind, and every roll
  keyed by them, where they were. Tested: a dummy kind issued all through play leaves seeds 1-3
  identical (same log, outcomes, winner, length and world), and the benchmarks were rerun with one in
  the engine and came out identical. Within a kind a higher number was made later, which the
  archives' "newest first" and the trail panel rely on (tested). What this does not cover: a rule
  that adds draws to a stream shared by many decisions (a script king's stream for the season, say)
  still moves the draws after it. A court can tell from the numbers of the ids it sees how many
  objects of that kind exist in the world (copies made at other courts, for instance); the shared
  counter told the same of all kinds together. Left as it is.
- **Shared victory is off** (since 18 October 2026; see `docs/rounds/2026-10-18-sleep-and-simulation.md`, question 23). One
  power wins: the one with the highest growth. A tablet can still be marked as a sworn alliance,
  and the script kings still treat it as a full alliance, but it shares nothing (the order schema
  says the mark "changes no rule and binds nobody"). The rulebook and
  the order schema mention shared victory only when the house rule is on (`--shared-victory` in the
  batch runner, "Customize" in the browser). With it on, two powers holding a sealed tablet marked
  as a sworn alliance win together if their combined growth beats every other power's growth; only
  pairs count, never three or more.
- **Convoys** follow Diplomacy, with Kruijswijk's guess-and-check adjudication; circular movement
  succeeds, and convoy paradoxes are resolved by the Szykman rule (the convoyed army stays put).
- **News of a season is read the next season.** Battles, purchases, rejected orders and notices
  produced while a season resolves are delivered with the next season's reports, and say so:
  "Movements last season"; "Mane set out for Hatti last season; the journey takes 2 season(s)".
  The treasury notice is written at the start of the season, before audiences: it gives the
  treasury "after income, upkeep and wages" and says that gold received at audiences or brought
  home by envoys that season is added later. The validator's refusals are worded for the season
  they are read in ("Mane was already given a task by an earlier order"; "you had already asked for
  candidates that season").
- **Every refused or failed order is a rejection notice** (kind `Rejected`), read next season with
  the reason, and a scheduled order that fails any of these ways wakes its sleeping seat: every order
  the validator refused ("Orders that could not be carried out", one line each); a cession of land no
  longer held, or with the king's own troops still in it ("Cession failed": "Sinai was not ceded to
  Hatti: you no longer held it after movement.", the only way it can be lost by then, since a second
  cession of one province is refused); a gift of troops, or a disband, of a unit no longer
  there ("No unit of yours stood in Sinai after movement, so none was given to Hatti."); a levy (see
  Levies); a purchase (see the city-states); anything the treasury could not pay, saying what came of
  it ("There was not enough gold to pay for Mane's mission to Hatti; Mane stayed at your court.", and
  likewise for a levy, a purchase, inquiries, watchmen, an assay, an examination, a forger's
  materials, a ransom, a gift at an audience or gold sent back with an envoy); a ransom that could not
  be sent; a captive order that could no longer be carried out; a hire the person declined, with why
  ("Mane declined your offer of 10 shekels a season: they ask 20 shekels.", or "…: another court
  offered more", or, at an equal wage, "…: they chose another court that offered as much"); a
  renewal below the servant's price; a forgery botched by a servant without the skill (the clay is
  still paid for, the one exception to the rulebook's "gold reserved for an order that failed stays in
  your treasury", and it says so); an assay of gold the treasurers had already weighed that season,
  when an earlier payment fell short and exposed debased gold, which empties the list of unassayed
  lots, fine ones included ("Gold lot g901 was not assayed: your treasurers had already weighed all
  your unassayed gold last season, when a payment fell short. No fee was paid."); and, though the
  validator should already have refused them, a release, recall, dismissal or captive order that
  finds nobody to act on. The batch seat report's "invalid" column counts each of them (the validator's list
  once per order). (Until the simulation-fixes round a cession of land no longer held, a gift or
  disband of a unit that was gone, and those last few did nothing in silence; a declined hire did not
  say why; a botched forgery was an ordinary notice.)
- **Save version.** The state and the log header carry the version of the rules
  (`CURRENT_VERSION`: 2 since the simulation-fixes round, 3 since Build order item 3, whose archives,
  inventory tablets and swapped inventories change how a seed plays, 4 since Build order item 4, whose hidden spies
  are not paid back pay at the court they watch and do not end that court's cover, and whose fix (d) gives each kind
  of object its own id counter, which renumbers objects and so moves every seed's rolls once; neither was released on
  its own, so one version covers both; 5 since the fix pass after item 4, one version for all of that pass's
  changes: kings never choose when they wake (no named season, no triggers of their own, and a reply that still
  names a season is read as one that does not), threats to a home province or a walled city wake a sleeping king,
  standing orders answer a move in the season it is made, scheduled orders may name a levy's unit, and engine texts
  name tablets and people as every court sees them; since that pass's review, no order of a king's own wakes him (a
  refusal, given or run, and a failure of his own making wake nobody), a failed attack on his land or troops wakes
  him, and scribes name only the people the writer knows; script envoys keep a share of small lots of gold, rounded to the
  shekel instead of down to fives, leave the host's complaint about the weighing out of their reports when they kept
  some, tell their lord of a post they turned down (since the review), soften a passive "warned" only when the host
  is the one warned, and split sentences after a closing quote;
  and script kings use the features they never used, under "Every feature is every seat's" in Script kings; among the
  owner's additions to that pass, every seat may keep standing orders, a standing order that fires replaces the
  season's other orders for its units and people, those given that season among them, and script kings give them,
  which changes what existing seeds do, under the same unreleased version 5; 6 since Build order item 5, the siege
  package, one version for the whole item: walls by place in place of the free cities' garrisons, storming and
  sieges, terrain, and the rest of the item as it is built; 9 since item 6b: conditions on scheduled entries and
  standing orders, a season's entries standing together, standing answers, and a model king's court answered in one
  call). A log
  saved under another version is refused, both for replay and for continuing it: "This game was saved under an
  earlier version of the rules (version 3) and cannot be replayed by this version." (tested for versions 1, 3, 4 and
  5). The web app shows that message
  in the saved-games card, next to the buttons that load a game, instead of loading it. Within a version, seeds replay exactly, with sleeping seats on or off
  (tested). For analysis only, `GameRunner.forReplay(log, true)` feeds an old log through
  the current rules; it may diverge. Back pay (Part G) changed rules but not the log format (its header
  and decisions), and version 2 was never released, so it stays version 2: a version-2 log saved
  before back pay would replay under the new wage rules and may diverge. The same holds for the rest of
  Part G (the capital trigger, triggers on changes, the news of losses abroad). Part E (the king's
  record, ledger and primer) changes what a model king reads, not the rules, and adds two fields to
  the logged orders, the king's `summary` and `ledger` lines, which the engine ignores: a log saved
  before them reads both as empty, so they need no new version either.

