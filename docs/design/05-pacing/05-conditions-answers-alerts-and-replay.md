### Conditions, planning ahead, standing answers, light alerts, failures and replay

- **Conditions** (item 6b; "Scheduled, conditional orders"). A scheduled entry or a standing order may carry at
  most 4 conditions (`Condition` in `model/conditions.ts`, checked in `rules/conditions.ts`): `TroopsIn` (troops of
  a power, or any foreign power's, in a province, where the seat can see them: troops it cannot see count as not
  there), `TreasuryBelow` and `TreasuryAtLeast` (its treasury by its own ledger), `EnvoyBack` (one of its people back
  at its court and ready) and `TabletSealed` (a tablet in its archive sealed by it and a court, or any court), each an
  "if" or an "unless". They are read from the seat's own view (`TurnEngine.conditionsHold`): a standing answer's as the
  court begins, an order's once the season's audiences are over (what they gave and sealed counts), one
  view built a season for each seat that has conditions), never from a fact it could not know; item 13 makes that view
  local. Scheduled orders whose conditions do not hold are dropped for that season with the notice "Scheduled orders
  held back by their conditions", which wakes nobody (the seat's own choice); a march held up a season keeps its
  place but is not checked again. A standing order whose conditions do not hold when its move comes does not fire,
  says so in the seat's news ("Standing order s3 did not fire") and still stands. A condition that cannot be read (a
  province or court nobody knows, no person, no amount) refuses its entry or standing order like any other refusal. The reply
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
  check), each waiting envoy is matched to the first answer that covers him, by what the court can read as he arrives
  (the gold his lord sent, as the sealed inventory states it); if what that answer sends back would pass the backstop,
  he is the king's (a later answer does not take him);
  an envoy who shows tablets as evidence, or secretly serves the host, is never covered. A hidden backstop: answers
  together send back at most a quarter of the treasury as the season begins (`AnswerGoldShare`); an envoy whose
  answer would pass it is the king's. A covered envoy wakes nobody (`wakeReasons` and the court count skip him):
  the runner answers him in one exchange that ends the audience (`TurnEngine.answerReply`), and the king's phrasing
  call words it (below); the host reads in its news "Your standing answer a1 received him in your name." before the
  audience's record. Script seats give none (they make no calls); a human seat has no screen for them yet (see the
  item's report).
- **Light alerts and routine courts** (item 6c; "Light alerts go to the cheaper model too", "Routine audiences are
  answered by a cheaper model"). A model king with a small rung has its digest's news of the season read by it while it
  sleeps on, and is woken for orders ("word came: …") when the small rung judges the news needs his own mind; and a court
  it holds while its orders stand goes to the small rung first, envoy by envoy, except what the engine passes to its own
  model by itself. Both, and the budget's waiting orders, are under "Who decides" in `04-models.md`.
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

