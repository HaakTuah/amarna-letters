### Standing orders

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
