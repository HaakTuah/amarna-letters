## Jobs and money: Haakon's answers to items 11a and 11a+

Built after item 11b, before 11+ (the 11b row of `docs/BUILD-PROGRESS.md`; `docs/intent/build-order/item-11.md`, the 11b
opening; "The game in one page"). Save version 22. The report is `docs/rounds/2026-10-28-jobs-and-money-answers.md`. It
reworks `21-money-and-work.md` where the two differ; this file wins. First guesses: `MoneyData.heardWeight`,
`heardKeep`, `errandStay` (`model/money.ts`), `WarySeized` (`turn/court.ts`); item 18 tunes them.

### A job is an errand (`Contract`, `JobErrand`, `turn/jobs.ts`, `turn/court.ts`)

- **A job** names its errand (`Contract.errand`: `what` "envoy" to a court or "spy" on a court or province, `where`) and
  by when (`untilTurn`), with the fee, the advance handed over and the rest due when it is done. Orders `hire` and
  `renew` take `what`, `where`, `payOnDone`, `offerAgain` (and `hire` a `via`). The validator wants an errand, and the
  man refuses a term too short for the road there and back with a season there (`jobFits`, `MoneyData.errandStay`).
- **Only that errand.** A dispatch or a spy sent is refused (validator `errandFits`, engine `dispatch`/`placeSpy`) unless
  it is the job's errand; another errand is a new job (`renew` at court). A starting servant's job, or one taken over at
  an audience, has no errand until its first sending names it.
- **Same season.** Jobs are settled first in `resolveCourt` (`hireAll`, `renew`), so a man offered a job at court can be
  sent on its errand at once; `hire` and `renew` are not tasks (`characterOf`).
- **Done.** An envoy's errand is done at its audience (`envoyArrivesAbroad`), a spy's when it leaves its post (`recall`);
  a spy whose term runs out at its post sets out home. `jobsDone`: back at court with no task, errand done or term out,
  the job is done: the rest is paid if the job carries its master's standing order (`payOnDone`), else it falls due
  (`fallsDue`); then **the job ends** and the man is free at that court, unless the standing offer of the same job
  (`offerAgain`) is still worth his while and he was paid. A spy renewed by that offer at its post carries the rest into
  the new stay (`Contract.carried`). There is no notice any more (`noticePrice`, `noticesRunOut` are gone); the notice
  that wakes a sleeping seat is "A job done".

### Every payment by order

- **Fees** are paid when the job is done only by `payOnDone`, or by `pay_fee` while the man stands at court. A fee
  unpaid by the end of the season after it fell due counts once as a broken promise (`duesSeason`, `Character.owedDue`);
  paid within that season, kept.
- **Carriers** of letters (item 11b) are paid on delivery only by the court's standing order (`payCarriers`,
  `GameState.payCarriers`); otherwise the fee falls due like any other (`letterDelivered`). A carrier hired at a court
  takes all on delivery only from a court with that order whose record it trusts.
- **Collectors** hired by characters are paid the rest on delivery only if the approach carried the employer's word
  (`Approach.payOnDone`, `Errand.payOnDone`).
- **The advance** is what the order names: a model king's 0 means nothing now (it meant half).

### Offers abroad (`DispatchOrder` via `HireOrder.via`, `Dispatch.offers`, `envoyBusinessAbroad`)

A `hire` naming `via` (an envoy dispatched this season to the court where the man stands) rides with that envoy, its
advance taken from the treasury and carried. On arrival the man takes it or not (`hireAll` with the court). Taken: a spy
whose post is where it stands takes it up; anyone else walks to its master. Declined, or the man gone: the advance is
`Character.carriedFor`, handed over when the envoy is home (`carriedHome`), taken with a captive's purse, lost with the
dead on the road.

### No going rate (`basePrice`, `Character.heardRate`)

`GameState.goingRate` and `goingRateMoves` are gone. What a person asks is its own price moved half way
(`heardWeight`) towards what it has heard jobs pay a season (`heardFee`): every person standing where a job is agreed,
and the man hired, hear its rate. It asks more of a court it heard seized hoards (`WarySeized`).

### Records, a tablet's end and grants as news

- **`GameState.payFacts`** (`PayFact`): every promise to pay kept or broken, with the season word of it reaches each
  court by the roads from where it happened (`recordPay`). A court knows a fact from then (`recordKnown`, `trustIn` with
  a court); a person knows what it heard (`Character.heardPay`, at most `heardKeep`): the payer and the payee at once,
  people at a court the talk there of the last 12 seasons (`newsSeason`), and those they stand with what each heard.
  `GameState.payRecords` stays the true record, which a court knows of itself.
- **A tablet gone missing** on the road ends the debt (`missingAt`) but stays in its borrower's ledger until word comes
  from where it was lost (`Debt.endHeard`, `standsForBorrower`).
- **A grant revoked** reaches the grantee as word (`NewsKind` "Grant"); a grant by order already did (item 11a+).

### Hard acts, debts and the levy

- **Seize** (`seizeHoard`): a living person's hoard in the king's capital, with its tablets. A public fact on the man, and
  a loss of kind "Seized" talked of at that court (`lossesHeardOf().seized`).
- **Tablets a king holds** (`SeatView.debtsHeld`): sent with an envoy (`dispatch.collect`; the envoy holds it for its
  king, `Debt.for`), presented to a borrower king (who may `repay` while the envoy is there) or a person standing there
  (who may repay it in its own season); what is repaid is carried home. Sold (`sellDebt`) to a person at court who
  thinks it worth the price (what is left, as far as it trusts the borrower) and has the gold. A borrower at the king's
  court may repay him there (`applyLife`).
- **A captive's purse** stays on it (`goldAndTabletsTaken`) until order `captive` "TakePurse" (`takePurse`); a dead
  person's purse passes, like its tablets, to the court where it died. Kings see what their captives carry
  (`CharacterView.carries`) and the hoards kept in their capital (`hoardHere`).
- **The levy** (`RaiseOrder.men`): any number of men from `LandData.levyLeast` up to all at home; a unit larger than a
  full levy costs, eats and counts in battle in proportion (`shareOfFull`, `unitWeight` no longer capped).
- **Dealing in a shared province** (`provinceOf`): approaches and deals between people in the same province, a free
  traveller on the road answering the approaches waiting for it.

### Script players (`game/src/bots/errands.ts`, `credit.ts`, `life-mind.ts`)

- **Script kings** keep no idle staff: they send servants at court or the free people there (`atHand`, their own
  first), and each one sent is given the errand's job (`jobsForErrands`): a new job for a servant whose job was
  another, an offer for a free person, the term the road there and back (`errandTerm`), half now (all on completion
  when short of gold and its name is good enough), with the standing order to pay on completion. They ask for
  candidates when fewer than two are at hand, pay carriers by standing order, sell tablets they hold to lenders at
  court, send tablets owed by a king with the envoy going there, seize the largest hoard in their city when they cannot
  pay a season's costs and find no lender (greedy or about to fall), and take what their captives carry. The baseline
  bot (`--versus`) offers its errands as jobs too.
- **Script characters** stay at a court a few seasons before moving on and shun one crowded with seekers (the crowding
  item 11b found), turn outlaw only on the outlaw's road or near the end of their purse (it was about 30 a game), keep
  no hoard where a court seized one, answer a collector's job by the advance alone without the employer's word to pay,
  and give that word when they are honest.

### The answers to item 11b's review (11b+, second part)

- **A ransom demand needs a carrier** (`captive` "Ransom"): its word waits at the captor's capital (`Journey.waitAt`) until
  someone sets out for the payer's court, the payer's own people or any traveller, for nothing (`carryLetters`, a
  journey that is not a `SpyReport`), or, with nobody going, a free person at the captor's court hired from his treasury
  as part of his order; the demand stands 8 seasons. A carrier takes the waiting letters of one kind only (a demand never
  carries a spy's reports), and a demand replaced or lapsed is dropped unsent. Rumours and word of the world stay talk by the roads.
- **The spy decides** (`carryLetters`): a passing traveller is paid on delivery by its court's standing order, else by
  the spy from its purse if it is loyal enough (`LetterData.payLoyalty`); so is a carrier it hires; it carries its
  reports home itself after `selfWait` seasons (two, a season more for a brave spy and for a loyal one).
- **The border walk** (`reportRoad`): a watcher just across its master's border walks its reports to the nearest
  province of his, where the realm's couriers take them.
- **Hunting only on order** (`hunt` for next season, `huntBands` standing; `GameState.huntNow`, `huntBands`): an army
  falls on a band where it stands only so; troops standing there still halve what bands take.
- **Robbers choose** (`chiefKills`): a ruthless chief (disloyal or greedy) kills a robbed king's servant, a witness whose
  master would hear him, where no army of the land's king stands in the province or next to it (what a chief can see,
  not the king's orders); a careful one never does, and a free traveller is let go. No fixed odds.
- **Anyone may sell what he knows** (`newsSeason`, `buyNewsOrder`): servants abroad note news too; a greedy, disloyal
  servant notes its master's court, and selling it is found out `NewsData.secretsCaught` times in a hundred: a hidden
  fact whose word goes from the buyer's court to its master by the roads (a "Name" rumour), with a notice on arrival.
- **Not built here**: a band hired as soldiers (item 13); a pardon has no order (words, or a sealed promise); **a model
  chief's own request** for raids, ships and the way back, built after it (`25-chiefs-and-spies-choose.md`).
- **Script kings** (`game/src/bots/outlaws.ts`) order a hunt (`hunt`) only where an army of theirs stands with a band and
  the hunt breaks it or leaves it no province of theirs without troops to flee to (`worthHunting`), never the standing
  order (a band driven off robs a neighbouring province at the full rate); spare armies march on a band only where such a
  hunt would pay. They buy news only of the court they fight or a hostile one, at most a fiftieth of their gold, and
  dismiss a servant found selling their secrets.
