# Jobs and money: Haakon's answers to items 11a and 11a+ (28 October 2026)

The first part of build order item 11b+ ("Jobs as errands, and the answers to items 11a, 11a+ and 11b", added to the live
design document while this was built; the copy in `docs/intent/` still lists these answers at the opening of 11b). Branch
`item/jobs-and-money-answers`. Save version 22. What was built, by file: `docs/design/24-jobs-and-money-answers.md`.
Weekly usage: unknown (`scripts/usage.sh` cannot read it in this session). Effort: medium, as set.

## The check for changes

The copy was cut from Build order revision 80, Work and money 15, Overview 566. Asked at the start: nothing had changed.
Asked again before the pull request: Build order is at revision 81, which adds item **11b+**: first these answers (and
"carriers' fees paid on delivery by the payer's order", built here), then Haakon's answers to item 11b's review ("Agree to
all, expertly": ransom demands need a carrier, no rule moves a spy whose reports wait, the border hand-over after the walk,
armies hunt bands only on order or standing order, a pardon is words or a sealed promise, a model chief's own request,
robbers choosing whether to kill, anyone selling what he knows), then patching the script players' hunting and news
buying. Those later parts are **not built here** (the brief: build only Haakon's answers to 11a and 11a+); they are the
rest of 11b+, for the next session. Work and money and Overview were unchanged.

## The audit at the start

Seeds 1-50 from `develop` repeated item 11b's "after" figures exactly (wins 1, 16, 4, 24, 2, 3, 0; a capital fell in 22
games of 50). The features unused were those earlier audits named.
Weaknesses carried in from 11b: free characters crowd at one court (seen again: 35 to 44 of some 55 free people at one
court for long stretches of seed 2), and they turn outlaw about 30 times a game (1,502 in 50 games).

## What was built

Each of Haakon's answers, as the 11b row and item 11's text list them:

- **A job is an errand**: what (envoy to a court, spy on a court or province), where, by when, a part now and a part on
  completion. The servant goes only on that errand; another is a new job. A starting servant's first sending names its
  errand. A long stay (a spy's post) is the errand's term. The man refuses a term too short for the road.
- **Offered through carriers, wherever the man is**: an offer at court, or carried abroad by an envoy (hire `via`), its
  advance in the envoy's hands; the answer comes home as word by the roads, and the court does not count the man its own
  until then.
- **Every payment by the payer's order**: the rest of a fee by the job's standing order (`payOnDone`) or `pay_fee`;
  carriers' fees on delivery by the court's standing order (`payCarriers`), else the spy pays now; a character
  employer's rest by its word given with the job. Unpaid by the end of the next season, while the man stands there, a
  promise broken. A model's advance of 0 means nothing now (it meant half).
- **Renewing is a new offer the man must accept**: no more serving on, no notice; a job done ends, the man free at court;
  the employer may make the same offer again in advance (`offerAgain`).
- **Every fee agreed, no going rate or floor**: the going rate is gone; each person bargains from what it heard jobs pay.
- **A court's record of paying, a tablet's end and grants as news**: promises kept and broken reach each court by the
  roads and people by talk; a missing tablet stays in its borrower's ledger until word comes; a grant revoked travels.
- **Seizing hoards** (order `seize`), a fact others talk of; people ask more of that court and keep their gold elsewhere.
- **Kings collecting and selling tablets**: a tablet in the archive goes with an envoy to the borrower and comes home
  with what is repaid; or is sold to a person at court (`sellDebt`); a borrower at the king's court may repay him there.
- **Dealing anywhere in a shared province**: approaches by province, a traveller answering on the road.
- **The levy's size**: any number of men up to all (`raise` with `men`); a larger unit costs, eats and fights in
  proportion.
- **A captive's purse kept until the captor orders it taken** (`captive` TakePurse); a dead man's purse goes to the town
  where he died.
- **Governorship and command as grants of authority**: nothing to build yet; item 13 builds them so (the item's text).

The rulebook's WORK AND MONEY part and the intelligence part say all of it; the kings' view shows each job's errand and
standing orders, tablets held, hoards in the city, what captives carry, and the carriers' order; the characters' request
says what they heard jobs pay and what each court seized; the web order form offers jobs with an errand, seizes hoards,
sells tablets, toggles carriers' pay, and takes a captive's purse, and an envoy carries a tablet owed by the king it goes to.

## Script players

- **Script kings** keep no idle staff: each envoy or spy sent, from their servants at court or the free people there, is
  offered the errand's job, with the standing order to pay on completion (all on completion when short of gold); they
  seek candidates when few are at hand, pay carriers by standing order, sell tablets, send tablets owed by a king with
  the envoy, seize a hoard when they cannot pay their costs and find no lender (greedy or about to fall), and take what
  their captives carry. The baseline offers its errands as jobs too.
- **Weaknesses found and patched**: (1) letters fell to 40 in a hundred of before, since every errand now costs a job and
  kings dropped errands they could not pay half of now, and the free people were forever on the road (32 to 66 of 50 to
  100 travelling): characters now give a court two seasons before moving on and kings offer all on completion when
  short; letters came back to 5,733 in 50 games (7,155 before). (2) Script kings sent a free person when a servant stood
  ready: their own first now. (3) Model and script hires abroad: script kings do not use them, since a court does not know
  where free people stand abroad (finding below).
- **11b's two weaknesses**: crowding is gone (no court held more than a handful of free people in seed 2); turning
  outlaw fell from 1,502 to 531 in 50 games, by the outlaw's road or a purse near its end only.

## Benchmarks and script games

**Before** (`develop`, the audit) and **after**, seeds 1-50, `scripts/sim.sh --games 50 --seed 1 --verify-replay`: 50 of
50 replays exact. `--versus solo` (40 seeds): 2.69 / 1.07 and 75% / 14% before; 2.62 / 1.03 and 71% / 14% after. A capital
fell in 22 games before, 28 after.

| Power | Wins before | Wins after | Growth before | Growth after |
|---|---|---|---|---|
| Egypt | 1 | 1 | 1.20 | 1.08 |
| Hatti | 16 | 26 | 1.39 | 1.50 |
| Babylonia | 4 | 3 | 1.28 | 1.26 |
| Mitanni | 24 | 15 | 1.67 | 1.41 |
| Assyria | 2 | 1 | 0.70 | 0.57 |
| Arzawa | 3 | 4 | 1.02 | 1.01 |
| Alashiya | 0 | 0 | 0.94 | 0.99 |

**How the reworked features were used** (50 games, after): 6,799 jobs offered and taken (363 before: each errand is a
job now), 6,792 jobs done, 6,403 fees paid on completion or by order, 55 left unpaid; 436 captives' purses taken; 27
hoards seized in 19 games; 109 tablets sold in 30 games; 64 debts collected; no hire abroad by script kings (below).
Letters 5,733 (7,155 before); people turned outlaw 531 times (1,502). Characters' gold came 70 in a hundred from fees
(54 before), 13 from lending and dealing (9), 11 from loot (23). Wake-ups of characters a season 41.1 (40.3).

**Findings left open.** Script kings never offer a job abroad: a court does not know where free people stand at other
courts (its view shows only those at its own), so it has nobody to name; model and human kings can, when they hear of
someone. The levy's size is open to script kings (they raise full units, as before).

## The review

One reviewer (Opus, high effort) read the code diff against the item and "The game in one page". Fixed: (1) advances of
offers sent abroad were lost when the envoy never had its audience (now in the envoy's hands from dispatch); (2) the
advance was lost when the man was no longer free; (3) the king learned of a hire abroad at once (now word by road, and
the man is not counted his until then); (4) a passing carrier's fee became a broken promise nobody made (now only by the
court's standing order, or paid now by the spy); (5) a man hired abroad accepted terms that left out his walk to his
master; (6) a collector hired on the road got two journeys; (7) the validator told where a person abroad stood and
whether he was free; (8) a fee counted broken though the man had left before he could be paid; (9) script kings that
leave money alone, and the baseline, never paid any fee; (10) the bots' new-job price compounded the carried rest; (11)
the rulebook still said a person is hired only in person; (13) a dead captive's purse went to its captor without an
order (now to the town); (14) pay news grew without end (folded into each court's record after 12 seasons). Kept: (12)
starting servants' standing order to pay (reading 1); (15) spies posted by an offer abroad set their post directly.

## Readings taken and design questions

1. **Starting servants' jobs carry their king's standing order to pay on completion** (agreed before the game), which he
   may cancel. Alternative: no order, so each starting job's rest falls due unpaid unless he pays it.
2. **A hire abroad is known at home when word of it comes by the roads**; till then the court does not count the man its
   own. (Everything travels.) Alternative: the envoy brings the answer home.
3. **An errand's term**: the road there and back with a season there; a spy's stay is its term; the job is done once the
   man is home with no task. The man refuses a shorter term. (Skills set the odds; the man decides.)
4. **A fee unpaid counts as broken only once the man stood at the payer's court a season unpaid** (as a debt counts only
   once presented). Alternative: broken a season after it fell due, wherever he is.
5. **A dead man's purse goes into the purse of the town where he died.** Alternative: lost, or the court's.
6. **People forget talk of promises older than twelve seasons; courts keep their record.** Alternative: remembered all game.
7. **A traveller carries a letter for a court without the carriers' order only if the spy pays him now.** Alternative: as
   a favour, free.
8. **A levy can be larger than a full unit**, counting, costing and eating in proportion. Alternative: at most a full unit
   per levy.
9. **A host taking an envoy into service at an audience** still offers six seasons, half now (the reply's job offer
   kept as built). Alternative: the host's reply names the errand and the split.
10. **Every job names an errand**, so a king cannot hire someone to wait at court (no "post whose errands come free").
11. **What a person asks moves half way towards what it heard jobs pay** (`heardWeight` 50); a seizure adds 15 in a
    hundred to what people ask of that court (first guesses, item 18 tunes them).
12. **The rest of item 11b+** (the answers to item 11b's review and the script players' hunting and news) is left for the
    next session, as the brief says.

## Use against ignore

`--money-play-half` (the same 50 seeds; half the kings borrow, repay, pay carriers by standing order, sell tablets, seize
hoards and carry tablets to collect, the rest do none of it; all give every job the order to pay on completion): users
22 wins to 28, growth 1.12 to 1.09 (before this item, the same switch measured borrowing and repaying alone: 28 to 22, 1.18
to 1.15). **Not paying yet, by wins**: paying carriers on delivery costs the king what otherwise comes out of his spy's own
purse, and repaying what is due costs gold the ignorers keep, while the trust they buy is worth most when hiring, which
every king now does for every errand at a fee set by what people heard. Growth still favours the users. Re-measure in item
18, when the price of a bad name is tuned.
