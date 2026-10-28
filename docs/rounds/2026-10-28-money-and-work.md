# Item 11a: money and work (28 October 2026)

Build order item 11a (`docs/intent/build-order/item-11.md`, the 11a part), with the sections it names. Branch
`item/money-and-work`; save version 19. What was built is in `docs/design/21-money-and-work.md`; this report says why,
what it cost and what was found. Weekly usage: unknown (this session cannot read it). Effort: medium, as asked. Helpers:
one reviewer, none other.

Before the item, as its own pull request (#109, merged into `develop`): the two files the last workshop check found over
50 KB were split with behaviour proven unchanged. `OrdersPanel.tsx` (66 KB to 6 KB, its sections in `components/orders/`,
their JSX the old lines unchanged) and `rules.ts` (56 KB to 34 KB, two parts into `rules-war.ts` and
`rules-intelligence.ts`; the rulebook byte-identical across eight configurations).

## The check for changes

Asked at the start (Build order since 73; Work, money and lending since 11; Characters since 20): nothing new. Asked again
before the pull request (the same tabs, and Victory and the ending since 9, Land, people and economy since 29): the Build
order is now at revision 75 and has a new item, **11a+, "Harvests in their season, and the answers to items 8 to 10+b"**,
added after this item was begun. It carries Haakon's answer to the reviews of items 8, 9, 10+a and 10+b, word for word:

> "You figure all this out, expert. You know me by now. But models must be able to alter clauses also. Remember,
> everyone plays the same game!"

Item 11a+ builds what that answer changes (model envoys altering clauses, winter by an army's size, passage by order,
script kings posting province spies and sailing winter strokes, levies by the men a province has, runaways by what the
farmers keep, the mouths a king chooses to put out, a water dossier, deportees as a company, robbing outside the walls,
and the harvest in its season). None of it touches 11a's sections, so nothing of it is built here; the progress file
gains its row, and the "For Haakon" rows of items 8 to 10+b are marked answered by it. `docs/BUILD-PROGRESS.md` held no
other answers.

## The audit at the start

Seeds 1-50 from `develop` (after the split, every king a script king) repeated item 10+b's "after" figures exactly (wins
2, 7, 6, 24, 0, 11, 0; capitals fell in 27 games, 34 kingdoms), and `--versus solo` (40 seeds) gave 2.29 / 0.96, 73% /
14%, as 10+b reported. These are the "before" figures below. Every feature built so far was used in those games except
those 10+a's and 10+b's audits already explained (`reputation`, `pact-with-consequences`, `gift-to-person`, `landing`,
the interception of captives under guard). Nothing new was found to patch.

## What was built

- **Jobs, not wages**: a job with a term and a fee, the advance handed over when it is agreed (and reserved by the
  validator), the rest falling due when the job is done (the term served, the servant back at court with no task), paid
  unless withheld (order `pay_fee` with pay false) or the treasury cannot pay it; then owed, a broken promise, payable
  later by `pay_fee`. Nothing accrues: back pay is gone everywhere (engine, views, rulebook, requests, web, tests). A
  captured man has not done his job: its rest never falls due.
- **A court's record** of promises to pay kept and broken, read by every person as how much of a promised rest it counts
  on (`trustIn`); a job is taken if the advance plus the trusted rest reaches its price for the term.
- **Fees clear the market**: one going rate of service that scales every price, moving with the hires sought against
  the people seeking service.
- **Hiring as a negotiation**: hired in person only, at the court where the person stands; candidates are those seeking
  service there; asking for candidates marks the court as hiring for those who would travel to it; a pitch cites a real
  offer from another court, kept until the person is hired, or (greedy and disloyal) invents one; a candidate who waits
  unhired three seasons may move on; quitting is recorded.
- **Living from the markets**, **hoards** with their keep, **debt tablets** between any two parties, **borrowing** from a
  person at court who offers to lend and **repaying** whoever holds the tablet; defaults counted only once the holder has
  stood a season where the borrower could pay; a fallen kingdom's debts die; captives' purses and tablets go to their
  captor; the dead's tablets and hoards to the court where they lie.
- **A life of their own**: characters decide their own season (`MindTask` "Life") when something calls for it: travel to
  volunteer, seek service or work for themselves, hoard, offer loans, approach someone in the same place and answer
  approaches (loans, exchanges, a job of collecting a debt), quit, repay, hand over or keep what they collected.
- **The living pool**: the baseline (the starting 60), newcomers through the four doors by the history dossier's shares,
  names, reasons and tongues, the narrator writing their personas on arrival.
- **Stakes, not dispositions**: each character's way to a fortune and road by formula; every character request says its
  goal (wealth, the ranking of the richest, the dead below the living), its way and road, and what is at stake; the
  narrator's persona prompt is written from them; the template persona's "what you want most" follows the strategy; a
  Life request tells the ending's rule in words.
- **Gold is a lifeline** in the kings' treasury line and audiences; **the score** counts what is held, never what is owed
  or owed to one; **the richest characters** count purse and hoard, every character ranked, the dead below the living.
- The rulebook's **WORK AND MONEY** part, the web app's court section (fees, advances, lenders, debts, what is owed) and
  standings (hoards), and the model requests (pitches name what is asked a season of a term).

## Readings taken and design questions

Each is a question Haakon can answer; the reading taken comes first, the alternative in brackets, and the principle it
rests on ("Reason from the pillars").

1. **A job is a post with a term**, one fee for the term, done when the term is served and the servant is home with no
   task; errands within it are the king's orders as before (or each errand its own job with its own fee). Principle:
   "Errands, not roles" keeps the errands; one fee per term keeps a sleeping king's court staffed without a call a season.
2. **The rest is paid when the job is done unless the king withheld it** in advance, standing for the scheduled payment the
   design allows (or every payment by explicit order, a king who forgets breaking his word). Principle: "A sleeping king
   keeps his promise without waking"; the choice to break it stays his (order `pay_fee` with pay false).
3. **A party's record of paying is known to everyone at once** (or spread by carriers as news, once letters need real
   carriers in item 11b). Principle: no rule for the meantime ("No stopgaps") would be worse than a record known at
   once; the carriers come with 11b.
4. **A person is hired only in person**, at the court where it stands, so two courts never bid at once; courts compete
   across seasons through offers cited, true or false (or bids from afar on a pitch). Principle: "Hiring as a
   negotiation": characters travel to volunteer and pitch in person.
5. **One going rate for all service**, moving 5 a season with the hires, renewals and calls for candidates sought against
   the people seeking service at the courts. In script games it falls to its floor (50) within about ten seasons: some
   45 people seek service against a handful of hires (or count demand differently, or one rate per kind of job). Leave to
   item 18? Principle: "Fees clear the market"; a surplus means cheap men, as "A baseline, not a limit" expects.
6. **Contented servants serve on for 6 seasons on the same terms**, the old share handed over in advance (kept from the
   built renewal rule). Principle: keep what is built where the item does not change it.
7. **Starting characters bring savings** (free people 10-60 shekels, from a stream of their own; starting servants half
   their starting job's fee) so that living and lending have gold to work with from the start (or start with nothing, as
   before). Principle: "Characters live from the markets too" needs a purse to pay from.
8. **Living is 2 measures of grain a season** for free people only (servants are guests or live on the advance;
   travellers pay where they set out from, not each market passed). Principle: "A guest of a court lives on its
   hospitality"; road markets wait for item 11b's travellers.
9. **Hoards are kept at courts' capitals only**, lost to whoever takes that capital, passing to that court at their
   owner's death; no order lets a king seize a living man's hoard (or such an order now). Principle: the map's cities are
   the capitals until city-states (item 11+); seizure is an act a king's order would need, and none exists yet.
10. **Robbing a purse on the road waits for item 11b's outlaws** (or a chance now). Principle: "No stopgaps".
11. **Characters deal only at the same court**, never on the road (or in any province they share). Principle: "Same
    place only"; travellers on their own way are between courts for a season or two.
12. **Everyone understands everyone** until item 12's languages; newcomers' tongues are facts in words only.
    Principle: "No stopgaps".
13. **The first job one character gives another is collecting a debt**: the collector carries the tablet, the employer
    pays the rest at delivery if it has it (or the employer chooses, as a king does). Escorts and messengers come with
    11b. Principle: "Anyone can hire anyone" is built as the contract; jobs follow the errands that exist.
14. **A missing tablet ends the debt at once**, the borrower's ledger dropping it at once (or keeping it until news
    reaches him, once carriers exist). Principle: "No stopgaps".
15. **A king who comes to hold a tablet** (from a captive, the dead or a fall) can neither collect nor sell it yet (or a
    collect order now). Principle: collection needs a carrier abroad, which 11b and 13 bring.
16. **Dismissal records nothing** against the court (or a dismissal without cause counted as a broken promise).
    Principle: the design names only fees withheld and debts unpaid as broken promises.
17. **Characters decide their own season every third season** (staggered), on arriving somewhere, after waiting three
    seasons unhired, when an approach or an errand waits, or a master owes them a fee. Principle: "Characters sleep like
    kings": 0.61 wake-ups a character a season in script games (0.15 before), which is what model games would pay.
18. **The strategy formula's weights and the bold threshold (55)**, and "the outlaw's life" worded for what exists now
    (serving nobody's interest but one's own) until 11b brings outlawry. Principle: "How the strategy is made"; "Requests
    are rules too".
19. **Strength counts borrowed gold as the borrower's**, so defaulting near the end pays; lenders price that in (the
    design says so). Principle: "Debts are facts; repayment is a choice".
20. **A captive's purse goes to its captor at once** (it was kept before). Principle: "Where characters keep their gold":
    "seized when he is captured".
21. **Newcomers' marks** (an invented name, a people recorded later) are data on the character, never told in the game.
    Principle: "Grounded in the sources" marks them in the data; "Requests are rules too".
22. **A model hiring order's advance of 0 means half**, so "all on completion" cannot be ordered by a model (or a
    separate field). Principle: a short schema.

## First guesses (item 18 tunes them)

All in `MoneyData`: the going rate (100, step 5, 50-300); trust (80, +4, -30, 10-100); living (2 measures); hoard keep (2
in 100, at least 1); arrivals (5 + 300 × shortfall/baseline, at most 80, in 100); loans (6 seasons; interest a season in
tenths of a percent: 10 + impatience, + 60 for each broken promise, + 15 at war (unused), + 40 besieged, + 20 shrunk);
patience (3 seasons). In the engine: a content servant's 1.2 margin and 6-season renewal (kept), one not paid asking a
fifth more, 15 loyalty lost to a fee unpaid (kept from missed pay), 20 off one's name for quitting, a meeting seen 1 in 5.
In the scripts: the strategy fits, the bold threshold, the impatience formula, the court scores, the kings' highest rate
(4 + 4 × greed − 2 × caution percent a season) and two seasons of costs in hand.

## Script players and the feature

What the scripts do is in `docs/design/21-money-and-work.md`, "Script players". How often each part was used in the 50
games after (seeds 1-50, every king a script king), and how it went:

| Part | Used (games with it / times, 50 games) | How it went |
|---|---|---|
| Hiring for a fee, in person | 50 / 346 hires | Every game; the going rate falls to its floor (50) within about ten seasons (reading 5) |
| Fees paid when the job is done | 48 / 3,080 | 19 fees fell due unpaid (a treasury that could not pay), none withheld by choice; script kings pay what they owe later |
| Quitting | 22 / 58 | Servants paid less than they ask, or long unpaid |
| Kings borrowing from a lender at court | 49 / 345 loans | 261 repaid in full; kings rarely run short of gold, so they borrow little |
| Defaults (kings' and characters' loans) | 45 / 718 | Mostly characters' loans to each other and to kings in their last straits; counted only once presented |
| Characters lending to characters | 48 / 967 loans, 70 repaid | Lending pays the lenders (11.7% of all characters' gain) though most such debts are never repaid: borrowers seldom have the gold |
| Hoards | 45 / 780 opened | Kept at the capitals, a few lost with a fallen capital |
| Newcomers through the doors | 2 / 2 | Rare: the pool stays near its baseline, few die |
| Deals of tablets between characters | 0 | Not used: script characters only sell a tablet to a collector, and no collector was hired |
| A character hiring a collector | 0 | Not used, even after making lenders who stay to seek service send one: lenders are mostly the borrower's own servants, standing where they can present the tablet themselves. The feature stays (models may use it); 11b's roads, where tablets travel far, give it its reason |

Characters decide their own season 0.61 times a season each, 0.76 calls (0.15 and 0.21 before, when they had little to
decide). The richest held 701 shekels at the end on average (78-1,610): fees 71.8% of all they gained, lending and
dealing 11.7%, savings brought in 15.6%.

**Using against ignoring** (`--money-play-half`, seeds 1-50): current kings (borrowing and repaying) 1.16 growth and 28 wins, those that never do 1.14 and 22 wins. Borrowing pays, a little: it keeps troops paid in the seasons a treasury runs short, which at these first guesses are few.

## Benchmarks and script games

**Before** (the audit) and **after**, seeds 1-50, `scripts/sim.sh --games 50 --seed 1 --verify-replay`: 50 of 50 replays exact. `--versus solo` (40 seeds): 2.29 / 0.96 and 73% / 14% before; 2.38 / 1.07 and 73% / 14% after.

| Power | Wins before | Wins after | Growth before | Growth after |
|---|---|---|---|---|
| Egypt | 2 | 0 | 1.15 | 1.21 |
| Hatti | 7 | 4 | 0.91 | 0.77 |
| Babylonia | 6 | 2 | 1.27 | 1.28 |
| Mitanni | 24 | 28 | 1.45 | 1.77 |
| Assyria | 0 | 0 | 0.45 | 0.57 |
| Arzawa | 11 | 16 | 1.30 | 1.55 |
| Alashiya | 0 | 0 | 0.81 | 0.95 |

A capital fell in 27 games before (34 kingdoms) and 25 after (32), the first on the median in season 15. Growth rises
for most powers, most likely because the going rate falls to its floor, making service cheap, and the score no longer
subtracts debts (not measured apart); Mitanni's lead grows (28 wins in 50). Balance stays frozen:
item 18 tunes it.

## The review

One reviewer (Opus, high effort), given the diff and the item's text. Its findings, and what was done:

1. **Blocking: a debt counted as broken as soon as its season passed**, though the holder had never come to be paid (a
   lender that moved on cost the king 30 trust for nothing). Fixed: a default counts only after the holder has stood a
   whole season past due where the borrower could pay (`Debt.presented`), and the king is told when it is presented.
   Script lenders now go to the borrower's court when a debt falls due.
2. A collector whose employer had moved kept the gold silently; the rest was paid for an errand never walked. Fixed: it
   follows its employer; the rest is due only if the borrower's court was reached (`Errand.reached`). The employer still
   pays automatically (reading 13).
3. A collector could be hired by a king mid-errand and vanish from his court. Fixed: not available for hire on an errand.
4. The rules and the request said a king could seize a hoard, which no order does. Fixed: the claim is gone (reading 9).
5. Tablets kept in a hoard were stranded when the hoard emptied, fell or its owner died. Fixed: they come back to the
   owner's person, go to the taker, or to the court that kept the hoard.
6. Leaks: a character saw a court's true growth (private treasury); a borrower saw a tablet's real holder anywhere.
   Fixed: the courts' land ratio from who holds what; the holder only when it stands there, else the lender.
7. A strategy chosen once never followed drifting traits. Fixed: chosen again before each season of its own.
8. The outlaw's and seller's words promised roads 11a lacks. The outlaw's way is reworded (reading 18).
9. Newcomers' "invented name" and "recorded later" markers were hidden facts a background check could reveal, and a
   door fact used game words. Fixed: data fields; "Came by the western sea to Apasa, to trade."
10. A captured man's job counted as done. Fixed: its rest never falls due.
11. Dismissal before the term ends costs the king nothing: kept, reading 16.
12. Script kings never paid a fee they owed, and real rival offers were cleared before they could be cited. Fixed: script
    kings pay what they owe to one at court; offers are kept until the person is hired.
13. Minor ones fixed: the request's "everything stays as it is" now excepts the loan offer, a hoard cannot be opened at a
    fallen court, only tablets on one's person change hands in person, a servant's life counts as dangerous in its
    impatience. Kept as readings: an advance of 0 meaning half (22), living at the market one set out from (8), a king
    holding a tablet unable to collect it (15). Kept as built: the advance comes off the true treasury without exposing
    debased gold (as hires never did), and renewing a servant its master believes away takes the advance even if it is
    dead (the treasury must not betray its fate).

## Tests

`src/engine/test/money-and-work.test.ts` (a fee withheld and paid late, the score counting what is held, borrowing and
repaying on a debt tablet, a default only once presented, a fallen kingdom's debts, a loan between characters by approach
and answer, a collector hired and presenting the tablet, a captive's purse and tablets, the dead ranked below the
living, living from the market, a hoard and its fall, newcomers through the doors, strategy and road, the ending in
words, the going rate); `contract.test.ts` and `cover.test.ts` rewritten for jobs; the back-pay tests removed with back
pay; text and fingerprint tests updated (the template persona's "what you want most" changed; no draw moved).

## Left for later

Outlaws, bands, pirates, selling news, messengers as errands, natural losses and personas without age (item 11b, which
also records this item's working-for-oneself benchmarks again); escorts and robbing purses on the road (11b);
collecting a tablet a king holds (11b, 13); seizing a hoard; languages in dealing (12); city-states' hoards and staff
(11+); tuning every first guess (18).
