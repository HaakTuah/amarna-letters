## Pacing: sleeping seats

Sleeping seats are on by default (since 18 October 2026, the design document's "Decided: sleep is
the default"; `--sleep off` in the batch runner, or the checkbox under Customize in the web app,
switches them off so that every seat is asked every season, for comparison). The world still
advances every season, but a model or file seat sleeps after every set of orders and is asked
again only when something concerns it or the hidden cap is reached: a king never chooses when he
wakes (the document's "Decided: sleep is the default" and "No triggers of the seat's own"; since the
fix pass after item 4, save version 5). Script seats play every season as before. Since item 9+a (Haakon, 27 October 2026: sleep is for every seat) a human seat may sleep too: in the web app it seals its orders either awake (`TurnSubmission.stayAwake`, asked again next season) or with a sleep, and is then woken by the same triggers as any seat, or by itself ("Wake now": `ISeat.wakeRequested`, read once a season before the wake check, logged as the decision `t<turn>/wake/<power>` only when it happens, so a replay wakes it the same; the reason is "you woke yourself"). There is never a global skip, and each seat
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
