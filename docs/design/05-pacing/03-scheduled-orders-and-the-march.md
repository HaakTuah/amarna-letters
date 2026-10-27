### Scheduled orders and the march

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
