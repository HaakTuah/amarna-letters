# Item 11b: roads and reputations (28 October 2026)

Build order item 11b (`docs/intent/build-order/item-11.md`, the 11b part). Branch `item/roads-and-reputations`. Save
version 21. What was built, file by file: `docs/design/23-roads-and-reputations.md`. Weekly usage: unknown
(`scripts/usage.sh` cannot read it in this session). Effort: medium, as set.

## The check for changes

The copy in `docs/intent/` was cut from Build order revision 75, Characters 20, War and the seas 59, Diplomacy 24, Work
and money 11, Land and economy 29, Overview 561. The live document was asked for what changed since each at the start:
nothing had. While the item was being built, Haakon's #117 and #118 merged into `develop` (Build order revision 80): they
open item 11b with his answers to items 11a and 11a+. `develop` was merged into the branch; what was built of those answers
is below.

## The audit at the start

Seeds 1-50 from `develop`, every king a script king, repeated item 11a+'s "after" figures exactly (wins 1, 16, 4, 27, 0,
2, 0; a capital fell in 21 games), and `--versus solo` (40 seeds) gave 2.54 / 1.09 and 71% / 14%, as 11a+ reported. These
are the "before" figures below. The features that showed no use were those earlier audits explained (`reputation`,
`pact-with-consequences`, `fee-withheld`, the captives' convoys, deals of tablets and collectors). One weakness of the
script characters that predates this item was seen: free characters gather at one court (Alashiya in seed 1, some 40 of
the 44 free at times). It is left for the rework of jobs that Haakon's answers ask for (below), which changes where people
seek work.

## What was built

- **Bands** ("Bands are a character's soldiers", "How many bands", "A head rises where men lack one", "Pirates are bands
  at sea"): chiefs rise from large unpoliced crowds of loose men, from mutineers, from a fallen court's refugees, as a
  band's successor or a lieutenant splitting off, and from free people who turn outlaw. A band robs its province's purse
  and stores, the travellers, caravans and ships on its roads and, with a ship, at sea off its coast; it pays and feeds its
  men from what it takes and keeps only as many as it can pay; unpaid, its men leave, and in the end turn on their chief.
  Bands compete for men, move to richer, weaker-guarded land, and buy ships. A king's army standing where a band works in
  his land falls on it each season, and may take its chief. A chief whose band dwindles takes the way back: his men go
  loose and he seeks service, carrying the hidden fact "Rode with the Habiru".
- **Robbing purses on the road** (carried from 11a's reading 10): people travelling on their own way now walk the road and
  meet its outlaws; a robbed traveller loses its purse; a band kills one in ten it robs. What is robbed goes to the band's
  chief or the loose men there: nothing vanishes any more (before, robbed gold and caravans' cargo left the world).
- **Messengers are errands**: a spy's report from abroad waits for a carrier: its master's own people going home (free),
  a traveller going that way (a small fee on delivery), a free person hired at that court (half from the spy's purse, the
  rest on delivery), or, after two seasons with nobody, the spy itself, leaving its post. The report shares its carrier's
  fate. Seasons waited are counted by court.
- **Characters sell news**: free people note what they see at a court and offer it at other courts at a price that falls
  as it ages (order `buy_news`); a greedy, disloyal seller exaggerates the treasury.
- **Reputation from losses abroad**: people hear of the captures and executions at the courts they stand at and from
  those they meet; they ask more of a court that loses its people abroad or puts others to death, the timid most, and
  script characters avoid such courts.
- **Natural losses without old age**: the road, plague and famine where people stand; no persona states an age (tested).
- **The leader's skill in the pace**: from a tenth less to a tenth more road a season by competence.
- **The Idrimi line** in the kings' primer and the characters' requests.
- **Haakon's answers to 11a and 11a+**: granaries rot like the king's stores, and a dismissal before the term ends is a
  broken promise on record. The rest is left for the next item that touches jobs (Design questions, below).
- The rulebook has a new part, ROADS AND OUTLAWS; the travel and intelligence parts say what changed; the kings' view
  lists the bands they see and the news offered at their court; the web order form buys news.

## Script players

- **Script kings** (`bots/outlaws.ts`) send armies they can spare after bands working next door in their land, and buy
  the freshest news of a court they fight or do not trust. Their beliefs about other kings' troops now read bought and
  spied sightings alike.
- **Script characters** turn outlaw by the pressures of "Turning outlaw" (long unhired or out of gold, bold or greedy and
  not loyal, a crowd at hand), and not again soon after giving up the road; chiefs raid, buy ships and take the way back
  by formula.
- **Weaknesses found and patched**: in the first benchmark characters turned outlaw 4,359 times in 50 games, going back
  and forth between the road and court; now they wait 8 seasons unhired (3 seasons out of gold) and not within 12 seasons
  of giving up the road. Kings bought news 7 times in 50 games; now they buy of any court they do not trust, up to 4
  seasons old. Reports from watch posts piled up unseen (324 waiting in one game); now a carrier takes every report
  waiting for its court, a spy carries them home itself after two seasons, and a post next to its master's land uses the
  realm's couriers.

AFTER_NUMBERS

## The review

One reviewer (Opus, high effort) read the code diff against the item. Fixed: letters already given a carrier were handled
again in the same season, hiring a second carrier and charging a second fee; plague or famine could kill an envoy in the
middle of an audience (natural losses now strike only people at rest, chiefs and posted spies); a dead chief's band
went on taking loot in his name until the next season (it now loses him at once); reports left at a deserted watch post
waited forever; the capture notice offered a ransom nobody could pay; a chief's capture was talked of as a spy's;
pirates took a king's ship without saying that the fleet was lost, and its crew vanished (now loose on the pirates'
coast); a traveller on its own way planned its road from its destination court's closed roads, and routes avoided bands
their court could not see. Left as a design question: carriers' fees paid on delivery without an order (reading 17).

## Readings taken and design questions

1. **Only spies' reports from abroad wait for a carrier**; rumours, word of the world, overdue notices and ransom
   demands travel as talk by themselves, and ransom gold as before. (Everything is somewhere: talk is carried by many;
   a report is one tablet in one man's hands.) Alternative: ransom demands need a carrier too.
2. **A spy with nobody to carry its reports for two seasons carries them home itself**, leaving its post; its master
   believes it posted until it arrives. ("or the person himself travelling home", "Messengers are errands".)
   Alternative: it waits at its post however long it takes.
3. **A watch post next to its master's land hands its reports to the realm's couriers**. (Distance inside your own
   realm: the spy slips over the border.) Alternative: every post outside the realm needs a carrier.
4. **A hired carrier is the cheapest free person at that court**; a court trusted 60 in a hundred or more pays it all on
   delivery. Carriers deliver faithfully: reading, selling or swapping what they carry is not built. (Skills set the
   odds; the character decides: the carrier's choice needs the languages of item 12 to read.)
5. **A king's army standing in his own province where a band works falls on it each season by itself.** (No menus: an
   army in place does what armies there did; policing proper is item 15's.) Alternative: only on an order to hunt.
6. **A band cannot be hired as soldiers until item 13's command at a distance**; a chief who gives up the road can be
   hired like anyone. (No stopgaps: a hired band needs commands it cannot take yet.) Alternative: hire a band now, sparing
   its master's land.
7. **A king's pardon is hiring the chief once he has given up the road**, with the hidden fact "Rode with the Habiru".
   (No menus.) Alternative: a pardon order or clause now.
8. **Chiefs, model ones too, choose raids, ships and the way back by formula**; a model character sees the crowds near
   it and may take to the hills itself. (Models only where they matter: a chief's raids are routine.) Alternative: a
   chief's own request now.
9. **A band that robs a traveller kills him 1 time in 10**, loose men never. (EA 8: merchants robbed and killed.)
10. **Only free people sell news**; servants abroad do not sell what they see. (A servant's knowledge is its master's
    until it changes sides.) Alternative: envoys and spies may sell it too.
11. **A court's record of paying is still known to all at once**, as 11a's question 3 left it; Haakon's answer (records
    travel as news) is left for the rework of jobs (question 13).
12. **The holder's troops halve what bands take**, as they halve the loose men's take; bands avoid land where any army
    stands. (Incentives, not quotas.)
13. **Haakon's answers to items 11a and 11a+, mostly left for the next item that touches jobs.** Built here: granaries
    rot; a dismissal before the term is a broken promise. Not built: jobs as errands offered through carriers anywhere;
    every payment by the payer's order; no going rate or floor; records, a tablet's end and grants as news; seizing a
    living man's hoard; kings collecting and selling tablets; characters dealing anywhere in a shared province; the
    levy's size by the king; a captive's purse kept until taken. Together they rework item 11a's jobs and money (its
    contracts, `jobsDone`, `settleRest`, the going rate, hiring in person) and the script kings' and characters' hiring,
    more than an hour's work and better built whole than in pieces beside this item. ("Bigger review fixes in a session
    of their own", the standing instruction of 28 October.)
14. **First guesses** (item 18 tunes them): `BandData`, `LetterData`, `NewsData`, `LossData`, the wariness 10/15/60,
    `LeaderPace` ±10, a bandit's share 20 shekels a thousand men a season.
15. **Free travellers' arrival** now follows their road (`setOut`) instead of the fastest seasons between capitals, so
    some arrive a season later or sooner.
16. **People die of plague** 5 in a hundred a season where it strikes, of famine 2 where the people had under half their
    food.
17. **A carrier's fee is paid on delivery from the treasury by itself**, and counts against the record if the treasury
    cannot pay it (the review's point 5). Haakon's answer that every payment is the payer's own order belongs to the rework
    of jobs (question 13), which will move this payment with the others.
18. **A report left at a watch post whose spy is gone is lost** after two seasons, with no court there to hire a carrier.
19. **A chief taken by a king's army is a captive like any other**, but no court counts it as one of its people lost
    abroad, and nobody ransoms him.
