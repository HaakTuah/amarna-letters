## Money and work (item 11a)

Reworked by Haakon's answers (`24-jobs-and-money-answers.md`, which wins where they differ): jobs are errands, the
going rate and notices are gone, every payment is an order, records travel as news.

Build order item 11a. Save version 19. The report is `docs/rounds/2026-10-28-money-and-work.md`. First guesses are in
`MoneyData` (`src/engine/src/model/money.ts`); item 18 tunes them.

### Jobs, not wages

- **A job** (`Contract`: `fee`, `advance`, `startTurn`, `untilTurn`) replaces the wage. Order `hire` (person, whole fee,
  advance, term) and `renew` (the same for one of your own) hand the advance over at once, from the treasury; the
  validator reserves it like any gold an order needs. Nothing is paid each season and nothing accrues: back pay is gone.
- **Done** means the term served and the servant back at its master's court with no task (`TurnEngine.jobsDone`, after
  the tasks due). The rest falls due then (`settleRest`): paid from the treasury, unless the court ordered it withheld
  (`pay_fee` with pay false) or cannot pay it. Unpaid, it goes into `Character.owed` (a fact, counted in no score) and the
  servant loses 15 loyalty; `pay_fee` pays it later while the person stands at court. Either way the job is settled.
- Then, as before, one content with what it was paid (its price at most 1.2 times what the job paid a season) serves on
  for 6 seasons on the same terms, its new advance (the old share) handed over now; otherwise it gives a season's notice
  and names a price a season (one not paid asks at least a fifth more). A renewal before the term ends carries the old
  job's rest into the new fee. A dismissed servant, or one who quits, is owed nothing more.
- **A court's record** (`GameState.payRecords`): every promise to pay that falls due, a fee or a loan, is kept or broken.
  A person counts on the rest of a fee from a party as far as its record lets it (`trustIn`): 80 in a hundred with no
  record, +4 for each kept, -30 for each broken, between 10 and 100. It takes a job if the advance plus the rest at that
  trust reaches what it asks a season times the term (`jobValue`); `feeFor` gives the smallest fee for a share in advance.
  The record is known to everyone at once (a reading: word of it travels with the carriers of item 11b).
- **Hiring in person** ("Hiring as a negotiation"): only a person standing at the court (or, held, the king who holds it)
  can be hired there; candidates are those seeking service at the court, and asking for candidates marks the court as
  hiring (`GameState.hiring`) for those who would travel to it. A pitch may cite a real offer from another court that
  season (`Character.offers`), or a greedy, disloyal script character invents one; it asks at least that much.
- **Fees clear the market** (`GameState.goingRate`): what everyone asks is scaled by the going rate, which moves 5 a
  season, up when more hires, renewals and calls for candidates were made than people seek service at the courts, down
  when fewer than half as many were, between 50 and 300 (`goingRateMoves`).
- **Quitting**: a servant at its master's court may quit (its own season, below); it is recorded as a public fact, a
  broken promise of its own, and 20 off its name there. An envoy who goes over to a host at an audience takes a six-season
  job there, half handed over now (`jobOffer` is a fee a season).

### The characters' money

- **Living** (`livingSeason`): a free person buys 2 measures of grain a season at the market where it stands (the
  capital of its court, or where it set out from on the road), its gold into that people's purse; one with nothing lives
  as the town does. A servant lives on its master's hospitality or the advance; a captive on its jailer's.
- **Hoards** (`Character.hoard`): gold kept at one court's capital, deposited or taken out only there; keep 2 in a hundred
  a season (at least 1 shekel) into the town's purse. Tablets on its person go into the hoard with the gold. Lost to the
  taker when that kingdom falls (`debtsDie`); at its death, passed to the court that kept it.
- **Debt tablets** (`GameState.debts`, `Debt`): lender, borrower, principal, the sum to repay, the season it is due (words:
  nothing enforces it), who holds it and where it lies. Whoever holds the tablet holds the claim; paid in full, or brought
  back to its borrower, it is settled. A season past due without repayment counts once as a broken promise.
- **Kings borrow** (order `borrow`) from a person at their court who offers to lend (`Character.lendOffer`, shown in the
  court list as `lends`): within its offer and its purse, for a sum to repay at least its rate for the seasons named.
  **Kings repay** (order `repay`) whoever holds the tablet, when the holder stands at their court.
- **What is taken** (`goldAndTabletsTaken`): a captive's purse and the tablets on its person go to its captor; a dead
  person's tablets pass to the court where it died (missing on the road), its hoard and the tablets in it to the court
  that kept it, and its own debts die with it. A fallen kingdom's debts die, and its claims pass to whoever took its capital.
- **The score** (`rules/scoring.ts`): what each side holds, never what it owes or is owed. The characters' ranking
  (`rules/wealth.ts`) is purse and hoard; the dead rank below every living character, by what they held when they died
  (`Character.diedWith`).

### A life of their own

- **Who decides** (`wantsLife`): a free person at a court every third season (staggered), on arriving somewhere, and when
  it has waited its patience (3 seasons) unhired; anyone an approach waits for; anyone on an errand; a servant at its
  master's court every third season or when its master owes it a fee. Nobody travelling, held, abroad on a king's errand or
  hidden. A request (`MindTask` "Life", `LifeView`) says where it stands, its purse, hoard and debts, the courts as it
  knows them (travel, hiring, record, executions, bread, growth, siege, what it would ask there), the others present with
  their records, the approaches waiting, its errand, real offers, and the ending in words (`endingWords`).
- **What it decides** (`LifeChoice`, `applyLife`): set out for a court (free, or on an errand: `Travel` journeys, duty
  `Travelling`, arriving as plain travellers do); seek service or work for itself; put gold into or take it out of its
  hoard; what it offers to lend the king where it stands; one approach a season to someone in the same place (words, gold
  and tablets both ways, a loan sealed on a debt tablet, or a job of collecting a debt); its answers to approaches (both
  sides change hands together, if both still stand there and have what was offered); quitting; repaying its debts to
  holders present; and, back from an errand, handing over what it collected or keeping it. Others present may notice a
  meeting (1 in 5 each), which they remember.
- **Anyone hires anyone**: a character holding a debt tablet hires another to collect it (`Character.errand`): the advance
  and the tablet change hands; the collector travels to the borrower's court, where the king is told who holds his debt;
  what is repaid to it counts as collected; back with its employer it hands over the gold and the tablet and is paid the
  rest, or keeps the gold (a public fact and a broken promise).
- **Newcomers** (`turn/pool.ts`, doors in `model/doors.ts` from `docs/history/08-beyond-the-edges.md`): below the
  baseline (the starting pool, `GameState.baseline`) a newcomer comes a season with a chance of 5 + 300 × the shortfall
  over the baseline in a hundred, at most 80; none at or above it. The door by share (the western sea 37, the Nile beyond
  Nubia 26, the eastern road 26, the Gulf 11; the Red Sea's share spread among them), the land beyond by weight (one in a
  hundred of the eastern road's from the tin lands), the reason by the door's mix, a name from the land's attested names or
  marked invented, what it carries by its reason, and facts: origin, door and reason, tongue (words until item 12), and a
  backstory free beyond the map. A door held by a living court brings it to that court; otherwise it walks to the nearest.
  The narrator writes its persona when it arrives. Heads rising from the crowd come with the bands of item 11b.

### Strategy and road

- `rules/strategy.ts`: the fit of each way to a fortune (Steady, Keeper, Seller, Climber, Outlaw) from the traits; the one
  or two that fit best (within 8); the bold road from an appetite of 55 or more (2 × courage + greed + ambition, over 4);
  impatience a season (5 + (greed + ambition - loyalty)/10 tenths of a percent, more for a dangerous life or the bold road,
  less with a hoard). Set at creation (`Character.strategy`, `bold`).
- Model characters: the persona prompt asks the narrator for how this man means to get rich, from the strategy and road;
  every request carries `strategyText`; the template persona's "what you want most" follows the strategy.

### Script players

- **Script characters** (`game/src/bots/life-mind.ts`): service against working for itself by expected income a season
  (the best fee at a hiring court as far as it trusts it, against its gold lent at its own rate); where to stand by work,
  trust, executions (more for the timid), bread, siege, sympathy and travel; the careful keep a hoard at a safe court and
  pull it out of one in danger; a lend offer to the king where it stands (the careful only with little risk, the bold at a
  rate for it: impatience + 10, + 60 for each broken promise, + 40 besieged, + 20 shrunk, in tenths of a percent a
  season); one approach: a collector for an overdue debt it cannot reach, a loan in need while seeking at a hiring court,
  or (bold, with a good name) a loan to lend on; answers loans by rate and record, collecting jobs by fee and record; quits
  a master who broke his word to it; hands over what it collected unless it is a bold keeper or greedy and disloyal.
- **Script kings** (`statecraft-court.ts`, `credit.ts`): hire and renew with half the fee now, the fee made up for their
  record (`offerFee`), only people at their court, at a price the going rate scales; borrow from the cheapest lender at
  court when two seasons of costs are not in hand, at a rate their temperament allows; repay what is due to a holder at
  court while two seasons of costs stay in hand, unless losing badly. `--money-play-half` measures it.
