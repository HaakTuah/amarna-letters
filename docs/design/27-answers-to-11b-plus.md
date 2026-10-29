# The answers to item 11b+ (item 11b++)

Haakon's answers to item 11b+'s review (29 October 2026, "Agree to all"), each by "The game in one page". Save version
25. The report is `docs/rounds/2026-10-29-answers-to-11b-plus.md`.

- **A starting servant's standing order to pay on completion** (`factory.ts`, `Contract.payOnDone`) was built in 11b+; it
  is now listed under the king's standing orders in the web app, with a Cancel (`pay_fee` with pay false, `withhold_fee`),
  and the rulebook says so.
- **A hire abroad known by the roads** (`Contract.knownFrom`) and **an unpaid fee broken once the man stood a season at
  the payer's court** (`duesSeason`) were built in 11b+; the rulebook's sentence now says the second as built.
- **A dead man's purse** (`goldAndTabletsTaken`): to whoever is with him. Robbers who kill take it as they rob
  (`travel.ts`); a captive who dies held leaves it to his captor's treasury, with a notice; otherwise it goes into the
  purse of the town where he died (on the road, of the province). His hoard stays where it is kept.
- **No rule forgets talk of promises** ("Memory"): `foldOldPay` still folds a promise heard everywhere after
  `HeardData.seasons` into each court's record (`payKnown`), and now also into the old talk of each person who heard
  it (`Character.payOld`: per party, kept and broken, at the mean season), never dropped. A person keeps
  `MoneyData.heardKeep` promises one by one and folds the oldest into its old talk when it holds a score more
  (`hearPay`); it then takes in no talk of promises made by the last season folded (`Character.heardFrom`), so nothing is
  counted twice. Each fold also leaves a note in its memory ("Old talk I keep: ..."), which a model character keeps or
  drops in its own words when it condenses its memory (`SummarizeMemory`). The engine's reckoning for a script person
  weighs each promise by its age (`talkWeight`: half at `MoneyData.talkHalf` seasons plus a season per ten of loyalty,
  never nothing); a person's trust (`trustIn`) uses it. The life view gives all it heard (`kept`, `broken`, for the
  model) and the same weighed, in tenths (`keptAged`, `brokenAged`), which the script life mind uses.
- **A traveller decides whether to carry a letter** (`carryLetters`): one of the sender's own court's people (for a
  report, its master's; for a ransom demand, the captor's) carries it free; a stranger asks his fee
  (`LetterData.sidePercent` of a season's price a season of road) and takes it on delivery only from a court whose
  standing order is to pay carriers and whose record of paying he trusts (`LetterData.trustOnDelivery`); else only paid
  now, by the spy from its purse or, for a demand, by the captor from his treasury. A model traveller has no request of
  its own for this yet and decides by the same formula.
- **A levy larger than a full unit** was built in 11b+.
- **A stay at court is an errand** (`JobWhat` "stay", where: the employer's own court; the term is the deadline): it fits
  if the man can reach the court and stay a season (`jobFits`), and is done at its term with him at court. An errand given
  during it is a new job (`renew`) with its own fee; the stay waits beside it (`Contract.stay`: until when, its rest, its
  order to pay) and goes on when the errand's job is done, if its deadline has not passed; if it has, its rest is paid by
  its own standing order or falls due. Orders, views, the web form and the model's schema take "stay".
- **A ransom demand's carrier and its fee** (built in 11b+): the captive's line shows what the cheapest free person at
  the captor's court would ask to carry it, paid from his treasury (`CharacterView.ransomCarrier`), in the web app and the
  seat view.
- **A spy's thresholds** (`LetterData.payLoyalty`, `selfWait`) are script spies' only; a model spy decides in its own
  request (side lane #128, `25-chiefs-and-spies-choose.md`).
- **A standing hunt names provinces or the whole land** (`HuntBandsOrder.provinces`, `GameState.hunts`: power,
  provinces, the season given; `huntCovers`): a new one replaces the old, several naming provinces in one season add up
  (one province per model order, `hunt_bands_always` with a province).
- **Anyone may sell what he knows; a report is the servant's own words** ("Reports", `buyNewsOrder`): selling news of
  the court his present job's errand sent him to, seen during that job, records a hidden fact (`sold-report`): known at
  once to his master if the master bought it, else reaching the master by the roads `NewsData.secretsCaught` times in a
  hundred, with a notice ("evidence of a broken job"). The engine never judges a report.
- **The spy walks to the border himself** (`borderOf`, `walkToBorder`, `Journey.border`): a report from a watch post just
  across its master's border waits there like any report abroad; when the spy chooses to carry it, he walks to his
  master's nearest province and back (a `SpyOutbound` journey there and back, off his post, open to the road), and the
  realm's couriers take the reports from the border once he has passed it (`lettersGo`).
- **Every traveller is a witness** (`chiefKills`, `robbersNamed`): a traveller robbed and left alive names his robbers:
  the chief's hidden "Rode with the Habiru" fact goes by the roads (a "Name" rumour) to the land's king and the
  traveller's master, with a notice. A ruthless chief kills where no army of the land's king stands in or next to the
  province and he has heard of no standing hunt over it.
- **Chiefs hear of a standing hunt by talk** (`huntHeard`): from its king's capital, at the pace of the roads, from the
  season it was given. **A hunted chief chooses where to flee**: a model chief to the land his request named, if no army
  stands there; a script chief away from land under a standing hunt he heard of, and he keeps his band out of such land
  when he moves. The model chief's request says which land next door he heard is hunted.
- **Script kings** give the standing hunt over their whole land once and keep it (naming provinces would steer bands
  into the rest); keep a proven person at hand with a four-season stay when nobody else is at hand and gold is spare;
  and withhold the fee of, then dismiss, a servant known to have sold what belonged in his report or his master's
  secrets.
