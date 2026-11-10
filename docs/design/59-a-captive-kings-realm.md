# A captive king's realm under a caretaker (#806)

The owner's answer of 9 November 2026 (archive items 234 and 235; the design document: Victory, "One scoreboard for every
person"), replacing item 17b part B's reading that the court rules as before. Built in `turn/held-king.ts`, with the
lookups in `rules/court.ts` (`heldKing`, `lettersKept`, `spyWith`).

- **Held** (`heldKing`): the king is a captive at a foreign court (or on the road to it under guard) and his court has
  heard of it (no `KingTaken` word still on the road). Until it hears, the court goes on as before
  ([57](57-every-person.md), part C1). The seat's view says so (`PowerView.heldAt`, the request's COURT line).
- **What he knows:** every word from his court comes to him as late as a courier from it to his captor's court
  (`heldLagOf`, at most 12 seasons, `HeldLagMost`; `courtLagOf` and `notify` apply it to the realm's whole inbox and to
  the people come to his court, so every panel of his seat shows the same), but what befalls him there himself
  (notices whose subject is the king) at once; and the rest of what his seat is shown to decide on is his court's view
  as it stood then (the runner's `captiveView`, from the realm's views kept since his capture). The caretaker reads the
  court's own word as it comes there (`Views.court`: each notice at `turn - lag`, `InboxItem.lag`, but none of what
  befalls the king himself abroad, which only he knows) and its own people.
- **The caretaker keeps the realm.** The runner asks a script of its own (`GameRunner.caretaker`, a `ScriptLeader` that
  sees the realm's view as its court knows it, without `heldAt`) for the realm's orders every season, whether the seat sleeps or not, logged as
  `t<turn>/caretaker/<power>`, and hands them to the engine in `TurnSubmission.caretaker`. The engine keeps those within
  its mandate (`inMandate`): troops hold, march, support and convoy only into land the realm holds; levies, upkeep,
  food, fees, debts, runaways returned as promised, carriers, tolls, census, the markets, standing answers, checks of tablets, hunts and watchmen are kept;
  gold and caravans move only within the realm; a dispatch goes only if it keeps a bond (tribute paid or asked,
  protection asked, an oath recalled) and carries no proposal; a ransom only for someone else. Nothing else: no war, march
  abroad, treaty, grant, hire, building or court move. His standing orders stand: the caretaker gives, changes and
  cancels none, and its orders only fill what his word home and his scheduled and standing orders leave free, as a
  stand-in's do (`planSeason`, `compose`).
- **The player plays the captive.** The seat's own orders are his: letters (order `write`, to any court, his own included)
  and, in a letter home, his ransom (`payRansom` for himself), giving in (`cede`, `giftUnit`, or a `dispatch` his court
  sends with the tablet he names), or a man hired, kept on or posted as a spy at his captor's court to free him (`hire` or
  `renew` as a spy there, `spy`; below). Everything else is not carried out, and a notice says so. A word home with no letter of its own goes
  in a letter home of a line. On the road under guard he writes nothing.
- **His letters leave through his captor's court** (journey `CaptiveLetter`, waiting there for a carrier): the captor
  reads each (a notice with its words) and sends it as he sends a ransom demand, paying the carrier from his treasury
  (`carryLetters`). He may keep them (`captive` with "StopLetters", "PassLetters", for all or those to one court,
  `GameState.lettersStopped`): a kept letter goes nowhere and the captive is not told. A letter home that a man of his
  realm on the errand to free him takes out (`spyWith`, `own`) goes as the spy's report does, unread and not to be kept.
- **What he agreed to** rides with the letter (`GameState.wordHome`) and his court carries it out in the season after it
  arrives, as its own business and as orders given now, before his scheduled orders and the caretaker's (a stand-in's
  too, once he is free); a letter lost or kept takes it with it.
- **The captor's guard:** what he spends on watchmen in a season (`counterIntel`) guards the kings he holds: the king's
  chance of getting away that season is multiplied by 100 / (100 + that spend) (`KingData.guard`, a first guess; kept
  as `TurnEngine._guardedLast` since `kingsHeld` runs after the season's watch is cleared), so 100 shekels halve it.
  That is what holding him safely costs.
- **Getting away:** freeing him is an errand of a job like any other (`JobErrand.frees`, the king's id, on a spy's job at
  the captor's court), given only by his word home: a man it hires or keeps on as a spy there (`hire`, `renew`, stamped
  with `frees` in `heldSeason`; one at his court is sent there at once), or a man it posts there (`spy`, the job marked
  as he is sent, `placeSpy`). The validator lets a job free only the realm's own king, held at that court. His skill at
  going unseen adds to the king's in the chance each season (`kingsHeld`, `spyWith`); he is caught as any posted spy at
  that court is, by its watchmen and his own skill, with 4 in a hundred more each season for the errand (`AidData.risk`,
  in `watchAndReport`); one of loyalty below 35 who fears the errand (courage below 40) or whose sympathy lies with the
  captor sells him out instead, telling the captor (`AidData`, first guesses, a script character's choice by his
  traits), and is off the errand. Recalled, his job is done (`recall`), so a new posting is a new job. Spies posted for
  anything else do not help.
- **Freed by force:** a court taken, in its city or on the road (`courtFlees`), lets go every captive it held but those
  still on the road to it under guard, kings among them, as a fallen realm's are (`fall`); troops of his own may also free
  him on the road ([57](57-every-person.md)).
- **Script players:** a script captor holding a king keeps watchmen to guard him
  ([14](07-script-kings/14-court-and-intelligence.md)), and a cunning one (above 0.5) holding him for ransom keeps his
  letters to every court but his own, once each; a script captive pays his ransom whatever it costs (his word home), or, his treasury short of it, gives in once:
  the least province he holds beyond his homeland, next to his captor's land if he can, ceded to his captor with a letter
  saying so; an honest script captor (0.3 and above) lets a king go whose realm ceded him land in the last three seasons.
  With a servant at hand he asks for a spy at
  his captor's court, and writes once to each king sworn to him to pay for him or come for him (all under
  `--king-play-half`).
- **Holding a king forever** is allowed and measured, not ruled against: the batch's "Captive kings" line
  (`captives-report.ts`) gives the kings held while their courts knew it, how long, how it stood at the age's end, and
  the letters sent, smuggled and kept, the kings who got away, with those a spy helped, the seasons held under the
  captor's watchmen, and the words home giving in (signal `king-gave-in`).
- Save version 93.
