### An envoy at the door

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
