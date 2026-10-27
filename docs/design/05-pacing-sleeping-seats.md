## Pacing: sleeping seats

Sleeping seats are on by default (since 18 October 2026, the design document's "Decided: sleep is
the default"; `--sleep off` in the batch runner, or the checkbox under Customize in the web app,
switches them off so that every seat is asked every season, for comparison). The world still
advances every season, but a model or file seat sleeps after every set of orders and is asked
again only when something concerns it or the hidden cap is reached: a king never chooses when he
wakes (the document's "Decided: sleep is the default" and "No triggers of the seat's own"; since the
fix pass after item 4, save version 5). Script and human seats play every season as before. There is never a global skip, and each seat
sees only its own wake-ups. With sleeping seats off, a king reads nothing of any of this: no sleep
sections in the rulebook, no sleep fields in the schema, no opening sleep line. Standing orders are not
a sleeping seat's alone: every seat may keep them, awake or asleep, and every king reads how they work in the
rulebook's STANDING ORDERS section (see "Standing orders" below).

- **Asleep.** The seat is not called for orders (an envoy at its door is received in an audience
  call; see below). Its units hold, and the orders it scheduled for that season run. Nobody is told
  that it sleeps.
- **Sleeping after every call.** A seat never asks to sleep: after every orders call it answered
  itself, it sleeps. Having given orders in turn t, it is woken at the start of turn
  t + 1 + `MaxSleep` at the latest, unless something concerns it sooner. It cannot name a season to
  be woken in, nor set triggers of its own (see "Kings never choose when they wake" below). When
  the script king stands in because a call failed, the seat does not go to sleep: it is asked again
  next season (see below).
- **Kings never choose when they wake** (the fix pass after item 4; the document's "Decided: sleep
  is the default" and "No triggers of the seat's own", dropped 19 October 2026). Until then a king
  could name a season to be woken in (`wake_in_turn`, holding only until it was next woken) and set
  up to 8 triggers of its own (`wake_on`: a unit moving, one of its people back at court, its
  treasury falling below an amount, foreign troops entering a province, a province changing hands,
  each firing on a change after it was set). In the second agent simulation the kings named the very
  next season in 114 of their 130 orders replies, and sleep saved 6 of 136 orders calls; their own
  triggers rebuilt the "own envoy home" wake-up that the simulation-fixes round had removed. All of it
  is gone: the schema has no `sleep` field, a reply that still carries one is read as if it did not
  (`Parse.orders`, tested), the view no longer reminds a king of a season it named, and the batch
  seat report has no "n" for a sleep that ended in the season named. Only the engine's own triggers
  (below) and the hidden cap wake a king. The document's option to raise or lower a default
  trigger's priority was never built, and is not now.
- **What wakes it**, and nothing else. These are checked each season after the arrivals and
  reports, from the seat's own view only. An envoy waiting wakes it for its audience only (since
  Part H of the simulation-fixes round; see the next bullet); every other reason is an order
  trigger, which reopens its orders directly, without asking:
  - an envoy waits to be received at its court (an audience only, unless an order trigger fires too)
  - foreign troops entered its land last season ("foreign troops entered your land: Assyria's army
    moved ekallatum -> sippar"; a move counts as into its land if it held the province before the
    moves)
  - **foreign troops attacked it, and failed** (since the review of the fix pass after item 4; "it is
    attacked", among the document's default triggers): a foreign move last season into a province it
    held, or into one where its troops stood, that did not get in, whatever stopped it (its troops
    that held, a bounce with another move; walls stop no move since the siege package: a move that
    gets within them wakes the seat as one entering its land), seen by the seat as every move into its
    land or its troops is ("foreign troops attacked you, and failed: Mitanni's army tried to move
    terqa -> mari"). Babylonia's debrief after seed 15 of the second agent simulation found the gap:
    "A bounced assault on my walls therefore does not wake me ... Qadesh can only be protected
    blind". When the attackers stood next to the city before the king last gave orders, no arrival
    woke him, and a standing order fires once and is gone, so he first heard of the threat as land
    lost. The review's probe: Mitanni's army in Terqa attacked Babylonia's bought Mari alone, the
    walls held, and Babylonia slept on, the attack only in its digest (tested now: it wakes, and so
    does an attack on its army in a home province). Two foreign moves that bounce in a province that
    is not the seat's, with none of its troops there, do not wake it (tested). Until this review a
    failed attack went to the digest, marked "(into your land)" or "(against your troops)", by the
    reading of the simulation-fixes round (below).
  - **retired with the siege package** (Build order item 5): a temporary trigger for foreign troops
    ending a move next to the capital ("foreign troops came next to your capital: Hatti's army moved
    isuwa -> sapinuwa"), which stood in, from the user's addendum to the simulation-fixes round, for
    the warning walls would give: with no walls on homeland provinces an army there could take the
    capital the next season. The capital now has walls 3, and falls only to a storm of 4 or more or a
    siege of seasons; troops next to it wake the king as troops next to any province of his homeland
    do ("foreign troops came next to your homeland: ..., next to babylon, nippur, sippar"), and a move
    into his own land next to it gives that reason alone. The sleep triggers for walled cities and home
    provinces stay as the fix pass built them; their rulebook text now says what troops next to them
    can do ("get into it the next season: take it if it has no walls, or stand within them and besiege it").
  - **a threat to a home province or a walled city** (since the fix pass after item 4): foreign
    troops ended a move last season in a province next to another province of its homeland that it
    still holds ("foreign troops came next to your homeland: Egypt's fleet moved delta ->
    greatgreen, next to tamassos"), or, with none of its homeland there, next to a walled city it
    holds, which today is a city it bought ("foreign troops came next to a walled city of yours:
    Mitanni's army moved washukanni -> terqa, next to mari"). "Threat" is read as the capital
    trigger reads it, from what the king could know: an arrival by a move the seat saw (its
    `lastSeen`; a province next to its own land is always in its sight), one link of any kind, so a
    fleet off a coastal province counts, as does a move within the mover's own land. Troops that stay
    where they are, a move that failed, the seat's own troops, a levy, and any move once the
    province is lost do not wake it; a move into its land wakes it as "foreign troops entered your
    land" alone, a failed one into its land or against its troops as an attack, and a move next to its
    capital gives the capital reason alone (tested). The second
    agent simulation found both gaps: Alashiya saw Egypt's fleet beside an empty Tamassos only because
    an envoy woke it (seed 7), and Babylonia moved support to the walls of its bought Qadesh, next to
    Egypt's armies, only because an envoy woke it (seed 15); both kings named the gap in their
    debriefs. Since the siege package the capital falls under this one (its own trigger is retired).
  - **a siege of a city of its own** (the siege package): one begun last season ("a siege of a city of
    yours has begun: Assyria's army besieges babylon (walls 3), worn down 1 of 3"), a change the entry
    before it did not tell (an army within the walls may stand as a guest until it besieges), and one
    that will make the city surrender at the end of this season if the besiegers just hold ("a city of
    yours surrenders at the end of this season unless the siege is broken: ..., worn down 2 of 3"), the
    last season to break it. Each fires once (question 5 listed both among the triggers a siege needs;
    its other three, for the besieger and for envoys, are not built: a besieger is woken by attacks on
    its army as any king is, a caught envoy is news that travels, and the captor decides the captive's
    fate when next it gives orders, as for a caught spy).
  - it lost land ("land lost: Sippar has been taken by Assyria.")
  - it lost troops: a unit destroyed in battle ("your army in sippar was destroyed"), unpaid troops
    deserting ("your unpaid troops deserted"), or a unit killed by plague ("plague destroyed troops
    of yours")
  - a scheduled or standing order that others foiled as the season resolved (`TurnEngine.scheduledFailed`):
    a scheduled move stopped by another power's unit (held off, met head on, or beaten to the
    province; `TurnEngine.stoppedByOthers`), with the battle report's reason ("orders you scheduled could not
    be carried out: sippar -> ekallatum (the unit holding ekallatum (Assyria's army) kept its place;
    your strength 1 against 1)"); a scheduled support that a foreign attack cut ("... (the support
    was cut by an attack from ekallatum)"); a purchase other buyers or another's troops spoiled; a
    levy or cession in land lost in that season's moves; a hire another court won, or one whose
    candidate another court hired or holds; a servant who left the seat's service, a spy no longer
    at its post, a captive no longer held or whose king fell, a ransom whose captive was let go,
    that season; gold found short when paid, which only debased gold others gave can cause (and an
    assay of gold weighed then). An order of a standing order that fired reads "a standing order of
    yours could not be carried out: s3: ...". A support or convoy whose unit was destroyed is not
    counted again: the lost troops already wake the seat.

    **Nothing a king's own orders bring about wakes him** (since the review of the fix pass after
    item 4), so that he cannot wake himself through them, which would bring back the named season
    by another door ("No triggers of the seat's own": "Each is a way for a king to wake himself").
    The review's probe found the door: a sleeping Babylonia that added an entry for the season
    before to every reply was asked for orders every season, woken by "orders you scheduled were
    refused: turn 0: that season has passed", the very "wake me next season" the kings of the
    second simulation chose in 114 of 130 replies. So these are told in the seat's news, and in
    the digest of a seat that sleeps on ("an order was refused or failed (...)"), and wake nobody:
    - an order refused, when given (orders not kept: a season already past, past a limit, naming
      a province where the seat has no unit, unreadable; standing orders not kept) or when it runs
      (any of the validator's refusals: it checks the seat's own state and orders);
    - a failure of its own making as the season resolves: a support or convoy that matched no
      move (a guess at another unit's orders, given on purpose as easily); a move stopped by its own
      unit, or for want of a convoy (until the siege package also by walls alone, whose strength of 1
      the king knew); a levy where its own unit stands, or in land it
      ceded; a cession its own troops stood in; a disband or a gift of a unit its own orders had
      moved (one destroyed wakes it as troops lost); a purchase its own troops took first; a hire
      below the asking price; a renewal below the servant's price, or of a servant it dismissed that
      season (the price follows a rule; a servant's notice wakes it by itself); a forgery by a
      servant without the skill;
    - orders dropped because their unit is lost ("Orders for lost troops dropped": troops lost to
      others wake the seat by themselves, and troops it disbanded or gave away are its own doing), or
      because the levy they waited for raised none ("Orders for a levy that raised no unit dropped":
      a scheduled levy that others foiled wakes it as a failed order; every other cause is its own).

    Each was a reason before ("orders you scheduled were refused: ...", "standing orders you gave
    were refused: ...", "orders you gave for later could not be carried out: the troops they were
    for are lost (...)" or "... the levy they waited for raised no unit (...)"), and so was every
    failure as the season resolved. The review suggested also checking a scheduled order's shape
    (reach, unit kind) when it is given; with no refusal waking a king, that would change only when
    he reads of the mistake, not whether it wakes him, so it is not built (a refused move still ends
    the unit's march, as before). What remains is a route through others' troops: a king can still
    schedule a weak attack on a foreign unit he expects to stand, and be woken when it fails; that
    costs him a unit's season and depends on another
    king's orders, and is left to the owner as a review question.
  - a ransom is demanded for one of its people
  - a servant gives notice ("a servant gives notice: Mane asks 20 shekels a season to serve on"):
    the season of the notice is the one in which it can be renewed before it leaves
  - the hidden cap is reached ("your counsellors woke you after a long sleep")
  - its kingdom falls, which ends its sleep ("the kingdom fell")

  A refused or failed order among those it gave for the season it was awake does not wake it: it
  reads why when next woken, and the rulebook says so. (Until the simulation-fixes round an envoy
  coming home, every report, candidates, catastrophes, forgeries, a caught spy, and foreign troops
  at its border or attacking it in vain woke it too: replayed through the engine, the simulation's
  two seed-7 games would have woken a sleeping king in 117 of 120 seasons. A failed attack on its land
  or troops wakes it again since the review of the fix pass after item 4, above.)
- **An envoy at the door: an audience, and the king judges whether to reopen its orders** (Part H
  of the simulation-fixes round, the owner's later instruction in `docs/archive/rounds/ROUND-PROMPT-ADDITIONS.md`,
  section 4; it replaced an earlier plan in which an envoy could never reopen orders). The principle:
  a king sleeps while nothing changes, and when something happens it judges whether that alters its
  plan. Envoys were the most common reason a king woke, and an orders call costs about twice an
  audience.
  - When the only reasons a sleeping seat has are envoys waiting, the wake check does not wake it:
    it holds court asleep (`SleepState.holdsCourt`), its orders stand, and its audiences are held
    as usual, one call per exchange, by the seat's own model at one effort level lower (the owner's
    rule that the seat's own model makes every decision; the lower effort is that of every
    audience, and whether the reopen choice, a planning decision, should be made at the orders
    call's effort instead is left to the owner). When a call fails the script king
    answers the envoy, but it decides nothing for the seat (see **A failed call at court** below).
    When an order trigger fires as well, the seat wakes as before and its audiences are ordinary
    ones (no realm in brief, letters or choice).
  - Such an audience opens "You slept 2 seasons (you last gave orders in turn 5). You were woken to
    receive an envoy: an envoy of Egypt waits to be received. Your orders stand unless you reopen
    them at your audience." In place of the old line of land and troops (and the treasury figure on
    the season line) it reads "YOUR REALM IN BRIEF (enough to judge whether the news changes your
    plan; you see the full map only if you reopen your orders)": the treasury with income, upkeep,
    wages and back pay owed; its land; its troops; foreign troops at or inside its borders as far as
    it can see (a foreign unit standing in its land, "(in your land)", or in a province next to its
    land, "(next to your byblos, enkomi)"; fleets at sea included); its scheduled orders by season
    and its standing orders, as in its view; its people at court and ready to be sent (id and name);
    and its other people with their duty and timing. Not the map, the standings table, the travel
    table, the other people it knows of or the troops elsewhere; the one line counting each power's
    lands ("Lands now: Egypt 6; Hatti 5; ..."), which opens every audience, stays, so the king can
    weigh an envoy's claims about who grows strong. "While you slept", the season's news, the
    tablets it holds and its journal follow as before, then the audience, which ends with "YOUR
    ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at
    court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at
    the end of this season with everyone's orders and are checked first. Reopen your orders
    (reopen_orders) if the news changes your plan: you then give orders this season, with your full
    view, after your audiences. Otherwise your orders stand and you sleep on." Its schema adds
    `letters` (the orders' letter shape) and `reopen_orders`. Once the king has chosen to reopen (at an
    earlier exchange or audience that season), its orders no longer stand: the audience says "You have
    already chosen to reopen your orders this season: you give orders after your audiences, with your
    full view", its opening line ends "You chose at an earlier audience this season to reopen your
    orders", and its schema has `letters` but no `reopen_orders` (since "Requests are rules too": it
    once still read "YOUR ORDERS STAND WHILE YOU SLEEP" and was asked again).
  - **Letters** sent from such an audience (`HostReply.letters`: dispatch orders, or a letter to a
    court nobody knows, refused with the reason) are kept in the seat's state (`courtLetters`) and
    validated as usual with the season's orders: they come first among the seat's orders, so their
    gold is reserved first. A later letter for the same person in the same season replaces an earlier
    one; a later exchange or audience shows the letters already sent, in full (to whom, with what gold,
    the message, the mandate and the tablet: `inFull`; until the fix pass after item 4 only
    "send c4 to Hatti"), and whether the king already chose to reopen, and, when they carry gold, "Gold already committed by these letters: 40
    shekels, not yet taken from the treasury you read here; it is reserved first when the season's
    orders are checked." (the treasury a king reads is the season's, so without it a king could
    promise the same gold twice and see its later letters refused; the orders request after
    reopening carries the same sentence after its list of letters). A letter cannot be cancelled,
    only replaced: by a later letter for the same person, or, after reopening, by an order for the
    same person. A refused letter is reported in its news like any order and, if it sleeps on,
    waits in its digest; it does not wake it (as with orders given for a season the seat was awake).
    The envoy before the king never hears of the letters or the choice (`HostReply.asHeard`).
    Letters and the choice in a reply at an ordinary audience are ignored.
    **What a letter from an audience costs and can win** (the fix pass after item 4, part 2: in the
    second agent simulation no king sent one, in 96 audience replies, 4 of them held while orders
    stood; explained, never primed). The rulebook's paragraph on an envoy at the door goes on: "A
    letter sent there costs what it costs in your orders (the gold it carries, the scribe's fee of 20
    for a tablet, one of the 3 envoys who may leave your court in a season, and the envoy's time
    away) and sets out this season; if you send none and let your orders stand, your next letters
    leave only when you next give orders, which may be many seasons away. Your answer to the envoy
    before you goes home only as his report of your words; a letter goes with your own envoy, in
    your words, with a mandate, gold, a tablet to seal or tablets shown as evidence." The audience
    request says it shortly ("A letter sent now costs what it would in your orders (its gold, the
    scribe's fee for a tablet, one of the envoys who may leave your court this season); if you let
    your orders stand and send none, your next letters leave only when you next give orders."), and
    the schema's `letters` adds "each costs what a letter in your orders costs".
  - **Reopening.** If any of its replies that season (any exchange of any audience) says
    `reopen_orders`, then once the audiences are applied (`TurnEngine.courtsHeld`) the seat wakes
    for an orders call that season, as an ordinary wake: its sleep ends with the envoys plus "you
    chose at your audience to reopen your orders", and the orders
    request opens "You were woken because: an envoy of Egypt waits to be received; you chose at
    your audience to reopen your orders." and lists the letters already sent ("LETTERS YOU SENT FROM
    YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order
    you give now for the same person replaces its letter): ..."). Otherwise it sleeps on: its sleep
    continues (the hidden cap still counts from its last orders), and the season's movements and reports go
    to its digest after the audiences. If its orders call that season then fails, it is asked again
    the next season like any seat whose call failed, told the envoys it was woken for but not "you
    chose at your audience to reopen your orders", a choice already spent.
  - **A failed call at court** (from the review of Part H). When a call fails at an audience held
    while the orders stand, the script king answers the envoy as at any audience, and its reply is
    marked (`HostReply.fromFallback`, set by the runner and logged, so replays stay exact). It
    decides nothing for the seat: its letters and its choice are ignored, and unless the seat chose
    itself, at another exchange, to reopen its orders, the seat wakes for an orders call that same
    season (its sleep ends with the envoys plus "your counsellors answered an envoy in your place").
    Only the seat's own model may choose to let its orders stand (the owner's rule, section 6.3), and
    an error toward reopening costs a call where the other error would cost the king a decision
    (section 6.2); before Part H the same envoy gave the seat an orders call that season anyway. Its
    own replies at other exchanges still count: their letters go out. (A first version let the
    stand-in's empty reply stand as "orders stand": the script chose to sleep on, nothing woke the
    king again, and the reopen rate counted the script's default as the king's choice.)
  - The journal records the letters given at each audience ("...: you said "..."; letters you gave
    at the audience: send c12 to Hatti"; whether each went out, or was refused or replaced, its news
    tells it), and an audience request shows "AUDIENCES YOU HAVE HELD SINCE YOU LAST GAVE ORDERS",
    since a king whose orders stand may hold several courts before it gives orders again (this also
    shows a host its earlier audiences of the same season).
  - Each court held asleep is recorded (`SleepState.courts`: season, envoys, reopened by its own
    choice, and whether the stand-in answered at it). The batch seat report has a `courts` column
    (held/reopened, with "(1 by stand-in)" for courts where a call failed and the king was asked
    for orders without choosing) and a line "Courts held while orders stood: 5; orders reopened at 2
    (40%).", and the batch summary gives the same over all games; courts the stand-in answered at
    are counted apart and left out of the rate ("...; orders reopened at 1 of the 4 where the king
    chose (25%); at 1 a call failed, the stand-in answered and the king was asked for orders without
    choosing (left out of the rate)."). The reopen rate is to be learned from the next agent
    simulation. Not built: the planned fallback if the rate is high, offering the reopening only for
    some kinds of message (see "Not built yet").
  - With sleeping seats off every king gives orders every season and its audiences are exactly as
    before (tested). Measured on both seed-7 games' 146 logged audience calls (characters / 3.6),
    an audience held asleep is about 1,400 tokens larger than before (about 11,900 against 10,500;
    the schema +750, the realm in brief +240, the rulebook +230, the audience's closing paragraph
    +125, the journal +55), and an ordinary audience about 280 larger (the rulebook and the journal).
- **Changes, not states** (the user's rule for Part G of the simulation-fixes round: a trigger on a
  standing condition wakes a king every season and defeats sleeping). The engine's reasons above are
  all events or arrivals: an envoy waiting is one that arrived this season (audiences are cleared
  each season), foreign troops are counted when they move in, attack in vain, or arrive next to the capital, the
  homeland or a walled city, land and
  troops when they are lost, failures, notices and ransom demands when they come. A foreign levy
  raised next to the capital or the homeland is not an arrival by a move and wakes nobody (levies are not among the
  moves a seat sees).
- **The digest.** Everything else waits for its next waking, as "WHILE YOU SLEPT": first "in
  brief", one line for each troop movement it saw ("turn 5: Egypt's army moved gaza -> megiddo";
  "turn 5: Assyria's army tried to move mari -> terqa and failed", a move that touched none of its
  land or troops) and
  for each envoy home with its report, spy, check, assay or examination report, candidate,
  catastrophe that killed no unit, forgery ready, spy caught at its court, refused or failed
  order, and standing order that fired ("turn 5: your envoy Mane came home with a report"; "turn 6:
  your standing order s1 fired", dated by the season it fired, as movements are by the season they
  were made, while the other lines carry the season their news came); then the news of those seasons in
  full, oldest first. Rumours and notices are only in the news. To stay readable over a long
  sleep, the routine treasury notices of the seasons it slept are left out (this season's is in
  its news; one that says troops deserted or people went unpaid stays), the brief keeps the latest
  60 lines and the news the latest 40 items, each saying how many earlier ones were left out.
- **What the kings are told.** Right after HOW YOU WIN the rulebook says: "After you give your
  orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign
  troops entering or attacking your land or your troops, or arriving next to your homeland or a
  walled city you hold; land or troops
  lost; a scheduled or standing order
  that others foiled; a servant giving notice; a ransom demanded. You cannot ask to be woken, at a season
  you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest
  of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your
  armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave
  your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your
  orders if the news changes your plan; otherwise they stand." It follows the document's decided
  text ("What the kings are told") with these changes: "a failed order" is "a scheduled or standing
  order that others foiled", to stay true (since the review of the fix pass after item 4, which
  made a failure of the king's own making wake nobody; until then "that failed"); the list of what wakes a king names the engine's triggers as
  built; the sentence on reopening is the owner's, from Part H; and the decided "Nothing else wakes
  you, and you may not be woken again for the rest of the game" is said plainly instead ("Only these
  wake you"; "If none of these happens, you sleep on: you may sleep for the rest of the game"), since
  six of the fourteen kings debriefed after the second agent simulation read it as a contradiction of
  the list before it ("It should say plainly that the listed events wake you and nothing else does",
  Mitanni, seed 7). Until the fix pass after item 4 the list ended "or news you asked to hear" and
  the plan "set the triggers you want". A section
  "PLANNING AHEAD (how sleeping works)" follows with the mechanics: an envoy at the door ("An envoy
  at your door wakes you for the audience only. You read your realm in brief (...), answer the envoy
  as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at
  the end of the season with everyone's orders and are checked like orders you give, before them.
  A letter sent there costs what it costs in your orders (...) and sets out this season; ... Then
  you choose: reopen your orders, and after your audiences you give orders this season with
  your full view, as when anything else wakes you; or let them stand and sleep on. Anything else
  that wakes you reopens your orders without asking (your audiences still come first)."); which foreign troops wake the
  king ("Foreign troops wake you when they move into your land or against your troops, whether or not
  the move succeeds, and when they end a move in a
  province next to your capital, another province of your homeland or a walled city you hold, while
  you hold it (troops there can take it the next season). Troops that only stay where they are do not
  wake you again, nor do troops raised by a levy."; since the siege package "... next to a province
  of your homeland or a walled city you hold, while you hold it (troops there can get into it the next
  season: take it if it has no walls, or stand within them and besiege it). ... A siege of a city of
  yours wakes you in the season after it begins, and again when the city would surrender at the end of
  the season if the besiegers just hold: the last season to break the siege."); scheduled orders, naming units
  by where they stand now, and their limits; the march; standing orders; which failures wake; and
  the digest. The seat's view lists its scheduled orders
  by season and its standing orders by id, each of its units named by where it stands now ("- turn
  4: the army now in durkurigalzu -> nippur"; "- s1: when your army now in sippar is attacked,
  then: the army now in babylon -> nippur"). Every request, for orders and for
  audiences, opens with one line: "You slept 3 seasons (you last gave orders in turn 5). You were
  woken because: foreign troops entered your land: ..." (an audience held while its orders stand:
  "... You were woken to receive an envoy: an envoy of Egypt waits to be received. Your orders stand
  unless you reopen them at your audience."). Woken in the season after its orders it
  reads "You gave orders last season (turn 5). You were woken because: ..."; in the first season,
  "This is your first season."; and if it has never answered itself (its first call failed), "This
  is the first season you give orders." An audience request carries "WHILE YOU SLEPT" (the brief
  and the news of the seasons slept) as the orders request does, before the season's news: an
  envoy at the door is what most often wakes a king, so the audience is usually the first thing it
  reads on waking.
- **The cap is hidden**: `MaxSleep` = 12 seasons (`--sleep-cap N`, or the hidden safety cap box in
  the web app). It is in no rulebook, schema or view (the view only says whether the seat sleeps),
  and the reason it gives says nothing of it. A placeholder, to be set from the next games'
  wake-up data. It stays hidden only until it first wakes a seat: the opening line then reads "You
  slept 12 seasons (...). You were woken because: your counsellors woke you after a long sleep.",
  so a king that reaches it can count it, and from then on
  it may anchor that king's plans. Both the exact count and the neutral reason were decided; a
  way out, left to the user, would be to vary the cap a little for each sleep (from
  `Rng.for(seed, turn, "sleepcap", power)`). The batch seat report prints, per seat, the courts it
  held while its orders stood and at how many it reopened them ("held/reopened"), how many
  seasons each sleep lasted ("+" for a sleep still
  running at the end; the seasons it held court asleep count as slept) and every reason it was
  woken, counted by kind over its sleeps.
- **Scheduled orders**, kept secret in the seat's own state, for any later season, at most 24
  orders a season and at most 40 seasons. An entry for a season after the game's last (the secret `finalSeason`)
  is kept, listed and counted like any other and simply never runs, because the game ends first:
  what the king reads and the notices it gets are the same whatever the last season is, so nothing tells
  it when the game must end (tested). What is not kept (a season already past, orders past the
  24th, seasons past the 40th) is reported as "Scheduled orders not kept", and, like
  any other refusal, wakes nobody (the rulebook: "orders past these limits are refused"). One entry per season
  replaces everything scheduled for it, and an empty entry cancels it; that works for the current
  season too, and then its orders count as given now (they are not bound to units, and a failure
  among them does not wake the seat, as the rulebook says of the orders given for the season the
  seat is awake). They are validated when they run, after the seat's fresh orders for that season
  and the orders of its standing orders that fire (the rulebook says so), so the gold they need is
  reserved last. In a season when the seat is awake, a fresh order for a unit or a person replaces
  the scheduled one for it, a scheduled order the seat repeats runs once, and the other scheduled
  orders still run. A renewal is not a task: a fresh renewal replaces a scheduled renewal or
  dismissal of the same person, and a fresh dismissal a scheduled renewal, but a renewal and an
  errand for the same person both run (the rulebook says so in a clause). A scheduled order that others
  foiled wakes the seat next season (see "What wakes it"); a failure the seat has already seen in its news, while awake, does
  not wake it later.
- **Orders follow their unit** (since the simulation-fixes round; before, a unit was named by where
  it would stand in that season, so a planned march failed at its first bounce). In `schedule` and
  in standing orders the king names each of its own units by the province it stands in when it
  gives the orders. The engine binds the order to that unit's id (`PlannedOrder.unitId`), and an
  own unit named as the unit supported or the army convoyed too (`otherUnitId`); a foreign unit, or
  walls, stay named by province, and an order for no unit (a levy, an errand) runs as given. When
  the order runs it is given from where its units then stand (`asItStands`). An order
  naming a province where the seat has no unit, or a unit not its own, is refused when given, in the
  validator's words ("- turn 7: nippur -> ur: you have no unit in nippur", in "Scheduled orders not
  kept"; "the unit in X is not yours" only where the seat can see, see "Sight"), which wakes nobody
  (until the review of the fix pass after item 4 it woke the seat next season; a unit a levy is to raise is named as below). An order the reply named
  but left unreadable is refused when given in the same way. When a unit is lost (destroyed, deserted, killed by plague, disbanded or given away), every
  scheduled order bound to it is dropped, and so is a standing order that waited on it or has no
  orders left (a standing order's other orders stay). This is checked at the start of each season,
  before the wake check: the seat reads "Orders for lost troops dropped", listing each order as it
  gave it. That wakes nobody since the review of the fix pass after item 4 (troops lost to others wake the seat by themselves; before, it was woken: "orders you gave for later could not be carried out: the troops they were
  for are lost (...)").
- **Scheduled orders for new levies** (since the fix pass after item 4). A unit a levy is to raise
  is named by the province of the levy: in a scheduled order for a season after a levy of the seat's
  in that province (a levy accepted among the orders it gives now, or one it scheduled for an earlier
  season), the name means the levy's unit, the latest such levy before the order's season, even
  where another of its units stands there now (so "turn 2: durkurigalzu -> nippur; raise army in
  durkurigalzu; turn 3: durkurigalzu holds" gives turn 2's march to the army there now and turn 3's
  hold to the new army). The order waits for the levy (`PlannedOrder.unitLevy`, or `otherLevy` for
  the unit supported or convoyed); when the levy raises its unit, at the end of its season, the order
  is bound to it (`TurnEngine.levyRaised`) and follows it like any other. If the levy raises none
  (refused, failed, or replaced before it ran), the orders waiting for it are dropped once that
  season's levies are raised (`TurnEngine.unraisedLevies`): the seat reads "Orders for a levy that
  raised no unit dropped" ("These orders were for troops a levy was to raise, and it raised none, so
  they were dropped:", then a line for each, "- turn 3: the army to be raised in sippar in turn 2 ->
  mari"), which wakes nobody since the review of the fix pass after item 4 (a scheduled levy others foiled wakes the seat as a failed order; before, the seat was woken
  ("orders you gave for later could not be carried out: the levy they waited for raised no unit
  (...)")). Until the levy's season the view names the unit as "the army to be raised in ur in turn
  2" (`TurnEngine.asShown`). A levy in the same season as the order does not count (the levy is
  placed after movement, so its unit can first be ordered the season after), and standing orders,
  which have no season, name only units standing now. The rulebook: "A unit you raise can be given
  orders ahead too: name it by the province of its levy, in orders for any season after the levy (a
  levy you order now, or one you schedule). In those seasons that name means the unit the levy
  raises, even if another of your units stands there now; if the levy raises none, those orders are
  dropped (your news says so). Any other order naming a province where you have no unit is refused."
  Until then an order naming a province where the seat had no unit was refused, so a new levy could
  not be given orders ahead: one of the reasons the kings of the second agent simulation gave for
  naming the very next season to be woken (tested).
- **The march.** A unit's scheduled moves are its march. After movement, a scheduled move whose
  unit still stands but did not reach its destination (stopped for any reason) is tried again the
  next season, and each of that unit's own later scheduled orders moves a season later (orders of
  other units that were to help it do not); the seat reads "A march is held up": "Your army in
  babylon did not reach durkurigalzu in turn 2. It will try again in turn 3, and each of its later
  scheduled orders waits a season (they now run in turn 4)." A move tried again that is stopped
  again ends the march: the unit's remaining scheduled orders are dropped ("A march ends": "Your
  army in babylon failed to reach durkurigalzu a second time in turn 3: its march ends, and its
  remaining scheduled orders were dropped: turn 4: babylon -> nippur."). A scheduled move refused by
  the validator is not tried again (it would be refused again from the same place) and ends the
  march the same way. A failure others caused wakes the seat (see "What wakes it"), which sees the
  shifted plan in its view. A refused move with no later orders to drop is told only as refused (no
  "A march ends" notice). Only scheduled moves form a march: a move given for the season the seat
  is awake (or in the schedule's entry for that season) that is stopped is not tried again, and the
  unit's scheduled orders run from where it stands. Shifted orders are not counted again against
  the limit of 40 seasons. (The brief allowed a refused move to be tried again too; the round's
  plan for this part did not, and that is what is built.)
- **Standing orders**, at most 12 (`standing_orders`), kept in the game state for each seat that
  gave one (`GameState.standing`, a `StandingBook` per seat with its orders and its last id) until they fire
  or are cancelled (`cancel_standing`: ids, or "all"; an unknown id is reported as "Standing orders
  not cancelled"). **Every seat may keep them, awake or asleep** (since the owner's additions to the
  fix pass after item 4; see "For every seat" below): until then they were kept in a sleeping seat's
  `SleepState`, and only a model or file seat with sleep on could give them. Each has an id per seat ("s1", "s2", ...), one event and up to 24 orders, unit
  orders and other orders in the same shapes as the schedule, bound to units as scheduled orders
  are. **A standing order answers a move in the season it is made** (since the fix pass after item
  4). The events: `unit_enters`, a unit of the power named (any foreign power's if none is named;
  never the seat's own then) sets out to move into the province named; `unit_attacked`, a foreign
  unit sets out to move into the province where the seat's unit stands as the season begins (named
  by where it stands when the order is given). Each fires on the move as it is ordered, whatever then
  becomes of it (a move stopped at the border still sets it off), and only on a move the seat can
  see: one from or into a province in its sight as the season begins (`TurnEngine.standingFires`).
  The moves are those each seat was ordered to make this season (its fresh orders, its letters and
  its scheduled orders, or the stand-in's), as the validator accepts them, before any standing order
  fires: a standing order never answers what another standing order gives, so the season still
  resolves in one pass and the result does not depend on the order seats are read in. So a standing
  order may answer a move that its mover's own standing order then turns aside: it fires, and its
  notice names a move that was never made, which tells its seat of an order the mover gave and lost.
  Since a standing order that fires replaces the orders given that season, this can happen to any
  seat's fresh orders, not only to a sleeping seat's scheduled ones; the rulebook says so ("it may
  answer a move that the mover's own standing order then turns aside: it fires even though that move
  is never made", since the follow-up's review of the fix pass after item 4; tested). In the script
  games of seeds 1-200 it never happened: the move was made in all 174 firings. A move of the
  seat's own does not count (tested, each filter). A standing order first fires in the season after
  it is given. It fires once: its orders are given from where their units stand as the season
  begins, and replace the season's other orders for the same units or people: scheduled orders (so
  "when the army in sippar is attacked, it holds" stops the march it was scheduled to make) and, since
  the owner's additions to the fix pass after item 4, the orders the seat gives that season too
  (`TurnEngine.compose`). A seat that gives orders every season gives its units their orders as usual
  and leaves the standing order to change them only if the blow comes; to keep one from firing it
  cancels it (cancelled in that season, it does not fire). Until then fresh orders replaced a standing
  order's, which suited a king woken for the season but left a seat that gives orders every season
  (every unit of a human's has an order, a hold at least) with standing orders that could never act.
  The orders are checked in this order: those given now, then the standing orders', then the scheduled
  ones, then the stand-in's. Two that fire in the same
  season go by id: the lower id's orders replace the other's for the same units or people, so they
  never reach the validator as two orders for one unit (the rulebook says so). A fired move that is
  stopped is a failed order, but not a march: it is not tried again. It is then removed, and once
  the season's orders are checked the seat reads "Standing order s1 fired", saying what became of
  each of its orders: "Your standing order s2 (when Assyria's troops enter arbela) fired in turn 3:
  Assyria's army set out from ekallatum for arbela. It gave these orders: durkurigalzu holds.
  Replaced by standing order s1, which fired in the same season: babylon holds.", with "Refused:
  sippar -> ur (an army in sippar cannot reach ur)." and "They replaced these orders you gave for turn
  3: durkurigalzu -> nippur." where they apply (an order given that season that the standing order
  repeats exactly is not counted as replaced; until the additions it read "Replaced by the orders you
  gave for turn 3: ...", the other way round). Firing does not wake the seat (the digest has "turn 3: your standing
  order s1 fired"); an order of it that others foil does ("a standing order of yours could
  not be carried out: s1: babylon -> durkurigalzu (it met a move into durkurigalzu from ekallatum
  ...)", tested). A standing order that cannot be kept (a province that does not exist, no unit of
  the seat's where `unit_attacked` names, no orders or more than 24, an order naming a province
  where the seat has no unit, a power nobody knows, or a thirteenth) is refused whole ("Standing
  orders not kept"), which wakes nobody (until the review of the fix pass after item 4 it woke the seat next season); the rulebook and the schema give both limits.
  Cancellation is applied before the season's standing orders fire, new standing orders after the
  season's orders are checked. The design document's wider vocabulary came with item 6b: see
  "Conditions" below.
  - **Why same season** (the fix pass after item 4; the document's "Status of sleeping seats", now in
    `docs/archive/design-history.md`:
    "standing orders that fire a season late"). Until then a standing order's event was checked after
    movement, from what the seat saw (`unit_enters`: the unit got there; `unit_attacked`: the unit
    was still there afterwards), and its orders ran the next season. That is the season a king woken
    by the same event gives orders anyway, so a standing order did nothing waking could not: no king
    gave one in 130 orders replies of the second agent simulation, and five of the fourteen debriefs
    said why ("it cannot help against a lethal attack, and it comes a season late", Hatti, seed 7;
    "they should also say what standing orders can do that waking cannot", Arzawa, seed 7). Answering
    the move as it is made is what the document's own example needs ("if Hatti enters Mira, support
    Mira"), and what commanders on the spot could do within a season. The rulebook ends its paragraph
    on standing orders: "This is what a standing order can do that waking cannot: woken, you would
    answer the blow only the season after it fell." The seat's view no longer says "(it fires this
    season: ...)", since no seat knows in advance whether a standing order will fire.
  - **What it costs and what it can win** (the fix pass after item 4, part 2, by the tenet "Every
    feature is every seat's": models must be able to use every feature well, and the second agent
    simulation found no king giving a standing order, explained, never primed). The paragraph goes
    on: "Unlike a scheduled order, which runs in its season whatever happens, a standing order runs
    only if the move it waits for comes, and then in that very season: a unit of yours next to the
    province attacked can support your unit there holding (unit_attacked), or support the walls of a
    walled city of yours holding (unit_enters on the city), as the blow falls. [Since the siege
    package walls add nothing to a battle, and the section reads instead "... can support your unit
    there holding (unit_attacked), and a unit next to an empty province of yours, walled or not, can
    move into it, so that an attacker without support bounces."] Giving one costs
    nothing; its orders cost what they cost when they run (a levy its gold), and in the season it
    fires its units do its orders instead of their scheduled ones. It fires once, on the first move it
    waits for that you see, whether a real attack or a feint, and is then gone." Two debriefs had
    asked what a standing order does that a scheduled one cannot, and Babylonia (seed 7) found no
    way to guard a bought walled city, which `unit_enters` does. The schema's description adds
    "Giving one costs nothing; its orders cost what they cost when they run.", and the orders
    request ends "Now give your orders for this season and the seasons ahead: your troops, your
    envoys and letters, orders scheduled for later seasons, standing orders, and anything else. You
    sleep after them." (`ordersLine`; since "Requests are rules too" it names the troops only
    when the king has some, and the envoys and letters only when one of its people is at court and
    ready.) Since the owner's additions this paragraph is the rulebook's STANDING ORDERS section, which
    every king reads, and the sleeping section keeps what concerns sleep (below).
  - **For every seat** (the owner's additions to the fix pass after item 4; the design document's "the
    game adds no position that exists for one kind of seat only", and the review's finding that a
    same-season reaction existed for sleeping seats alone). The feature audit of the fix pass had left
    standing orders to sleeping seats ("Script kings give no standing orders: they never sleep"); the
    review asked that it be built rather than deferred. Now:
    - **The engine** keeps every seat's standing orders alike (`GameState.standing`). A seat that plays
      every season keeps the ones it gives in any season, unless the stand-in gave them
      (`TurnEngine.afterValidation`), cancels in the season it gives the cancellation, and has troops it
      lost take their standing orders with them at the wake check, which runs for every seat
      (`TurnEngine.wakeCheck`, `lostUnits`). Every seat's season is planned and composed the same way
      (`TurnEngine.planSeason`, `compose`); for a seat that does not sleep there is simply no schedule
      and no letters from audiences. With no standing order waiting anywhere, a season resolves exactly
      as before (tested by the benchmarks of the change before the script kings gave any).
    - **The view** shows every seat its standing orders (`SeatView.standing`), and the orders request
      lists them under YOUR STANDING ORDERS whether or not the king sleeps. Its header repeats the
      precedence ("each fires once, in the season you see the move it waits for, and its orders then
      replace the orders you give that season for the same units or people; … one cancelled does not
      fire in that season"), and so does that of ORDERS YOU HAVE SCHEDULED ("… or a standing order of
      yours that fires that season gives them orders"), since a woken king reads the view (the
      follow-up's review).
    - **The rulebook** has a section of its own, STANDING ORDERS, after MOVEMENT AND COMBAT, for every
      king: what a standing order waits for, what it can do as the blow falls (support a troop or a
      walled city of the king's holding, or march into an empty province of his so that a lone attacker
      bounces), how its units are named, that its orders replace the king's other orders for the season
      and how to stop it (cancel it), that it fires once and first the season after it is given, the
      limits and the cost. HOW A SEASON RESOLVES says at step 6 that standing orders that fire answer
      the moves just ordered. The sleeping section keeps one bullet: standing orders keep answering
      while the king sleeps, in place of his scheduled orders, firing does not wake him, and this is
      what a standing order can do that waking cannot.
    - **The schema** offers `standing_orders` and `cancel_standing` to every king; `schedule` only with
      sleep on. Its description says the standing order's orders replace the king's other orders that
      season, those he gives then among them ("and your scheduled ones" with sleep on), that it first
      fires the season after it is given, and, with sleep on only, what wakes him.
    - **Script kings** give them (`Contingencies`; see "Standing orders" under Script kings).
    - **Human seats** give them in the web app's orders panel (see the web app's orders panel, under
      "The web map and the interface").
- **Conditions** (item 6b; "Scheduled, conditional orders"). A scheduled entry or a standing order may carry at
  most 4 conditions (`Condition` in `model/conditions.ts`, checked in `rules/conditions.ts`): `TroopsIn` (troops of
  a power, or any foreign power's, in a province, where the seat can see them: troops it cannot see count as not
  there), `TreasuryBelow` and `TreasuryAtLeast` (its treasury by its own ledger), `EnvoyBack` (one of its people back
  at its court and ready) and `TabletSealed` (a tablet in its archive sealed by it and a court, or any court), each an
  "if" or an "unless". They are read from the seat's own view as the season begins (`TurnEngine.conditionsHold`, one
  view built a season for each seat that has conditions), never from a fact it could not know; item 13 makes that view
  local. Scheduled orders whose conditions do not hold are dropped for that season with the notice "Scheduled orders
  held back by their conditions", which wakes nobody (the seat's own choice); a march held up a season keeps its
  place but is not checked again. A standing order whose conditions do not hold when its move comes does not fire,
  says so in the seat's news ("Standing order s3 did not fire") and still stands. A condition that cannot be read (a
  province nobody knows, no person, no amount) refuses its entry or standing order like any other refusal. The reply
  names them `troops_in`, `treasury_less_than`, `treasury_at_least`, `envoy_back` and `tablet_sealed` (the old,
  dropped wake trigger `treasury_below` stays out of the schema). Since item 6b the entries a seat gives for one
  season together replace everything scheduled for it, each with its own conditions, so orders of one season can carry
  different conditions (before, the last entry for a season won); the view shows them apart ("- turn 7 (unless
  Hatti's troops are in kizzuwatna, where you can see them): ...").
- **Script kings that sleep plan ahead** (item 6b, `bots/ahead.ts`; only with `--sleeping-scripts`, since script
  kings otherwise play every season and schedule nothing): an envoy sent now is sent again with the same message,
  without gold or a tablet, in each of the six seasons from the second on, on the condition that he is back at court
  and ready; a levy ordered now is repeated in the next two seasons if the treasury holds twice its cost and unless the
  king's own troops stand in the province. `--no-plan-ahead` and `--plan-ahead-half` measure what it is worth (see the
  item's report).
- **Standing answers** (item 6b; "Standing answers" under "Minds follow what is at stake"; `model/answers.ts`,
  `turn/answers.ts`). A king may give them in its orders reply or its court reply (`standing_answers`,
  `cancel_answers`), at most 8, kept in `GameState.answers` until cancelled and shown in its view ("YOUR STANDING
  ANSWERS", and in the realm in brief). Each names whose envoys (one court's or any), what the envoy brings (anything;
  only words; gold, at least an amount his inventory states, and no tablet; a tablet to seal), conditions as above,
  and what is done: seal the tablet or not, send back a share of the gold (100% is a gift of like value), and the gist
  of what is said (at most 300 characters). As a season's court begins (`assignAnswers`, at the top of the wake
  check), each waiting envoy is matched to the first answer that covers him, by what the court can read as he arrives;
  an envoy who shows tablets as evidence, or secretly serves the host, is never covered. A hidden backstop: answers
  together send back at most a quarter of the treasury as the season begins (`AnswerGoldShare`); an envoy whose
  answer would pass it is the king's. A covered envoy wakes nobody (`wakeReasons` and the court count skip him):
  the runner answers him in one exchange that ends the audience (`TurnEngine.answerReply`), and the king's phrasing
  call words it (below); the host reads in its news "Your standing answer a1 received him in your name." before the
  audience's record. Script seats give none (they make no calls); a human seat has no screen for them yet (see the
  item's report).
- **When a model call fails** and the script king stands in, the seat has not seen that season:
  it is not put to sleep, its digest and its "while you slept" window are kept, and it is asked
  again next season, told why it was woken in the season it missed (it never read that) and what
  concerns it now, as if woken, or, if nothing does, "your counsellors woke you". Those reasons are
  carried, without repeats, until the seat answers itself. The stand-in is not the seat: the seat's
  own plans for that season go first (the standing orders that fire, the scheduled orders due, a
  march's step tried again), and the stand-in's orders only fill the units and people they leave
  free; it neither replaces the schedule nor gives or cancels standing orders, whether the seat sleeps or not (since the owner's additions to the fix pass after item 4, a model seat with sleep off keeps standing orders too). (Until the review of Part D its
  orders counted as the seat's own fresh orders, so the script king's holds used up a standing order
  that fired that season and dropped the scheduled moves due, and the seat was told that "the orders
  you gave" replaced them.) A call that fails at an audience held while the seat's orders stand
  is answered by the stand-in too, and the seat is then asked for orders that same season (see
  "A failed call at court" above).
- **What a human player can tell.** No seat's view and no event carries another seat's sleep (the
  web app shows it only in the God view, which with humans playing needs Reveal all). But the web
  app's model-spend pill, shown to the operator and so to a human at the table, rises only when a
  model seat is called, and the orders phase returns at once when every model king sleeps: season by
  season, a human can tell whether any model king was asked. This is accepted as operator
  information (the pill is for whoever pays), not hidden.
- **Replay.** Sleep state lives in `GameState`, and the log header records which seats may sleep,
  so replays stay exact with sleeping seats on and off (tested). With sleeping seats on, every
  season is also marked in the log (`t<turn>/season`), since a season can pass with no seat asked.
  A saved game with sleeping seats can be continued only by seats that can sleep for exactly the
  same kings. A game of script kings has no seat that sleeps, so it plays exactly as with sleeping
  seats off.

