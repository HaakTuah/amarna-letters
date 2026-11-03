# A fast courier, hired (#601)

The owner (3 November 2026, relayed by the design session on #601): "paying for a courier is always a supply to demand
issue, a negotiation, no?" The follow-up as queued (archive item 185): "a king may hire a carrier to bring one far
province's report home this season. It is a job like any other ("Jobs, not wages"): the carrier asks his price by what
he has heard such a job pays and by how badly he is wanted, and the king may haggle; no fixed price, no menu."

## What was built

- **A ride is a job's errand** (`JobWhat` "ride", `turn/rides.ts`): offered at court (order `hire` or `renew`, errand
  `ride`, the province) to a person standing there, for a province the court knows it holds beyond the season's reach.
  The rider sets out as he takes the job; at the next season's start (`ridersBack`) the court's record of the province is
  of the ride's season (source "your rider" and his name), so its holder, its officials' report and the sieges known
  there are as of then, and the notices told from there by then come with him (`tell` now tags its word with the place).
  His job is then done, and its rest falls due as any job's.
- **His price** (`rideAsk`): his price a season for a job, moved half way to what he has heard a ride pays
  (`Character.heardRide`, heard as `heardRate` is, from the rides agreed where he stands); then more for each season
  sooner the report comes beyond the first, and more as the court asks for more rides this season against the free people
  at its court (supply and demand). He takes less if the king offers less, down to a least he keeps to himself (up to a
  quarter below his ask for a man of no greed, nothing below it for the greediest); offered less than that, he declines
  and names his ask, and the king may offer again. No fixed price and no menu: the offer is the king's.
- **The order form** offers "ride this season for the report of" one of the far provinces the seat holds.
- **Script kings** (`bots/rides.ts`): at most one ride a season, for the oldest report of a far province with a siege known
  there or land beside it held by a king hostile to them or who attacked them within four seasons; they open at 85 in a
  hundred of what they reckon he asks, the whole fee in hand, and offer 15 in a hundred more the next season after a
  refusal. `--no-ride-play`, `--ride-play-half` measure it.
- Rulebook (WORK AND MONEY, "A ride"), the order schema and parser, design note 21, README. Save version 59.

First guesses for item 18 (`RideData`): 20 in a hundred more a season sooner; 50 in a hundred more when the rides asked
for match the free people at court; 25 in a hundred off at most. The script kings' 85 and 115 (`RideTerms`).

## Hidden information

The rider brings what was true of the province at the end of the season he rode in, never later. The twin canary has a
new case, "a far province lost after a rider brought its report": it fails if the rider is made to report a season late
(checked by mutation). Engine tests in `src/engine/test/rides.test.ts`; the script kings' play in
`src/game/test/rides-play.test.ts`.

## Use against ignore (`--ride-play-half`, 20 games, seed 1, 50 seasons)

**No ride was hired in 20 games** (`ride-hired` 0), so the two sides played the same and the numbers (0.83 growth and 11
wins against 0.79 and 9) are the seeds' noise. A count over the same 20 games found why: of 6,070 Great King-seasons, 240
held land beyond a season's road home, mostly where the king's own troops kept it in sight; 119 held such land out of
sight, all of them Hatti's. A probe of the game with most of them found each such province had left Hatti's sight only
the season before, so its report was one season old, and a rider, whose report comes the next season, would bring
nothing sooner: the script kings rightly did not ride. So the case a rider is for (a report two seasons old or more)
does not arise in script games; the scenario test shows the script kings ride for it, haggle, and offer more after a
refusal when it does.

## Readings taken

- **A ride is used where it can be, and that is rare in script games** (the builder rules: "a feature they never use ...
  is not done"). The letter would have the script kings ride where there is nothing to ride for, which is no competent
  play; the rule's purpose, that every seat can use every feature, is met by the scenario test. Flagged for the rule's
  wording ("Principles over rules"), and put to the owner as #650.
- **"How badly he is wanted"** is what a man standing at a court can know: how much sooner the report comes (the road he
  would ride), and how many rides that court asks for this season against the free people there.
- **Haggling** is one offer a season: below his least he declines and names his ask; the king may offer again. A ride
  offered below his ask and above his least is taken: that is the haggle won.
- **A servant renewed for a ride** asks as any rider does (`rideAsk`), so both paths keep the owner's rule.
- **The ride goes by the road home** (`wordFrom`, #616): how much sooner the report comes, and whether a rider is needed
  at all, are reckoned on the road the report comes by; no ride where no road brings word.
- **Word that came to the place from farther off** (a governor's letter about a farther province) stays on its road: a
  rider brings only word of the place itself (`tell` tags only that).
- **A ride is never offered again by standing order** (no `offer_again`): each ride is priced anew.
- **A ride's fee is heard as what a ride pays**, never as a job's pay a season (`heardRide`, not `heardRate`).
- **A ride's term is one season** (the validator): it is there and back within it, and a longer term would make what is
  heard of a ride's pay a longer job's.
- **A ride is offered at court, never by an envoy**: the rider sets out from the court that hires him.
- **The rider is not stopped on the road** (first guess): a fast rider travels light, by the king's own roads.
- **His fee is paid as any job's is**: the advance from the treasury at court, the rest when he is back (coordination
  with #587, "Gold travels both ways": nothing here moves gold between places).

## Questions for the owner

- #650: a feature script kings never meet in script games: is the hired rider done?
