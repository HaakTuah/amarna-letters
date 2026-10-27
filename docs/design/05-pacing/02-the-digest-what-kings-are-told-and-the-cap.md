### Changes, the digest, what the kings are told, and the cap

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
