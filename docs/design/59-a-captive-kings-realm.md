# A captive king's realm under a caretaker (#806)

The owner's answer of 9 November 2026 (archive items 234 and 235; the design document: Victory, "One scoreboard for every
person"), replacing item 17b part B's reading that the court rules as before. Built in `turn/held-king.ts`, with the
lookups in `rules/court.ts` (`heldKing`, `lettersKept`, `spyWith`).

- **Held** (`heldKing`): the king is a captive at a foreign court (or on the road to it under guard) and his court has
  heard of it (no `KingTaken` word still on the road). Until it hears, the court goes on as before
  ([57](57-every-person.md), part C1). The seat's view says so (`PowerView.heldAt`, the request's COURT line).
- **The caretaker keeps the realm.** The runner asks a script of its own (`GameRunner.caretaker`, a `ScriptLeader` that
  sees the realm's view without `heldAt`) for the realm's orders every season, whether the seat sleeps or not, logged as
  `t<turn>/caretaker/<power>`, and hands them to the engine in `TurnSubmission.caretaker`. The engine keeps those within
  its mandate (`inMandate`): troops hold, march, support and convoy only into land the realm holds; levies, upkeep,
  food, fees, debts, carriers, tolls, census, the markets, standing answers, checks of tablets, hunts and watchmen are kept;
  gold and caravans move only within the realm; a dispatch goes only if it keeps a bond (tribute paid or asked,
  protection asked, an oath recalled) and carries no proposal; a ransom only for someone else. Nothing else: no war, march
  abroad, treaty, grant, hire, building or court move. His standing orders stand: the caretaker gives, changes and
  cancels none (his scheduled orders, given before, run as given).
- **The player plays the captive.** The seat's own orders are his: letters (order `write`, to any court, his own included)
  and, in a letter home, his ransom (`payRansom` for himself) or a spy hired or posted at his captor's court (`hire` or `renew` as a
  spy there, `spy`). Everything else is not carried out, and a notice says so. A word home with no letter of its own goes
  in a letter home of a line. On the road under guard he writes nothing.
- **His letters leave through his captor's court** (journey `CaptiveLetter`, waiting there for a carrier): the captor
  reads each (a notice with its words) and sends it as he sends a ransom demand, paying the carrier from his treasury
  (`carryLetters`). He may keep them (`captive` with "StopLetters", "PassLetters", for all or those to one court,
  `GameState.lettersStopped`): a kept letter goes nowhere and the captive is not told. A letter home that a spy of his
  realm posted at that court takes out (`spyWith`) goes as the spy's report does, unread and not to be kept.
- **What he agreed to** rides with the letter (`GameState.wordHome`) and his court carries it out in the season after it
  arrives, as its own business, beside the caretaker's orders; a letter lost or kept takes it with it.
- **Getting away:** the spy's own skill at going unseen adds to the king's in the chance each season (`kingsHeld`).
- **Script players:** a script captor holding a king for ransom keeps his letters to every court but his own,
  once each; a script captive pays his ransom whatever it costs (his word home), with a servant at hand asks for a spy at
  his captor's court, and writes once to each king sworn to him to pay for him or come for him (all under
  `--king-play-half`).
- **Holding a king forever** is allowed and measured, not ruled against: the batch's "Captive kings" line
  (`captives-report.ts`) gives the kings held while their courts knew it, how long, how it stood at the age's end, and
  the letters sent, smuggled and kept, and the kings who got away, with those a spy helped.
- Save version 93.
