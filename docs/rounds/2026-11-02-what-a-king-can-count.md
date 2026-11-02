# Item 17++, part B: what a king can count

Branch `item/counts-and-demands` (an older `item/what-a-king-can-count` from before part A was split off is left as it was), from part A's branch (`item/whom-a-province-obeys` at `7319705`), as "Pipeline,
don't wait" orders. The item's text: `docs/intent/build-order/item-17.md`, "Then **17++**", the words from "17++, what a
king can count" to "this replaces item 10+a's tax rate", and "Script kings use the census and judge their demands by
their counts where it pays, measured against scripts that never count." Design note:
`docs/design/48-what-a-king-can-count.md`. Save version 40.

**The sections it names are missing.** The item points to "Counts as the scribes knew them", "A census" and "The king says
how much he wants" under The world. None of the three is in the repository's copy (`docs/intent/`, cut 1 November 2026),
on this branch or on `develop`, and the live document refused this account ("forbidden", role), as it did for part A.
Part B is built from the item's own text, which says what each does; the readings below fill the rest, and the first
question for Haakon asks for the copy to be refreshed so that the next part, and a later review, can check against them.

## What was built

1. **The province card's town and land apart**: "about 18,000 in the town; about 650,000 on its land", rounded to two
   figures (`about`, `ui/format.ts`); the town marker on the map says the same.
2. **Counts as the scribes knew them** (`GameState.counts`): every court starts with a count of its land; the seat view,
   the model king's prompt, the province card and the town marker give a seat its provinces' people and fields as last
   counted, with the count's season; the engine and god view stay exact.
3. **The census** (order `census`, model action `census`, the web's grain row): scribes paid when they set out, counting
   the province a season later, a taking in the ledger, their count travelling home as word does.
4. **The demand** (order `demand`, model actions `ask_share` and `ask_amount`, the web's grain row), replacing item 10+a's
   tax rate (`TaxOrder`, `set_tax`, `GameState.taxes`, `taxRate` and the scripts' `taxOrders` are removed): a share, which
   the land hides from by the count's age and its distance, or an amount, which it cannot hide and which falls on its
   people when it is more than the land yields.
5. **Script kings** (`game/src/bots/counts.ts`): an amount by a fresh count, a share by an old one, scribes sent where the
   count has grown old; `--count-play-half` for use against ignore.

## Readings taken

1. **Levies by share or amount; work gangs as each work's need** (round 1 of the review). The item's text settles levies:
   "grain, levy and work gangs asked either as a share ... or as an amount". A levy may now be asked as a share of the men
   of fighting age at home (`raise` with `share`; model actions `raise_army_share`, `raise_fleet_share`; the web's share
   box beside the levy), which never takes more than are there but which the province hides part of by the same rule as a
   share of grain; or as a number of men, which the king gets from the men really there, every one if he asks that many,
   the fields losing their hands (item 11a+'s levy, unchanged). The corvée is not asked at all: each work names the men
   it needs (item 15), so it is an amount by nature, and a share of it would have to invent how a half-manned work
   progresses, a rule no section gives. Principle: "No stopgaps". **Asked of Haakon** (question 2, narrowed to the corvée).
2. **What a share hides.** "lets it hide more the older his count and the farther it lies": a point of the share for every
   season since the count, two for every season of the word's road beyond the first, at most thirty; land never counted
   twenty before distance. First guesses. Principle: "Information time travel" (what a king knows is as old as its road).
   **A share never squeezes** (round 1): it is reckoned from what the farmers do not eat, their food held back first, so
   no share starves them, and only an amount can.
3. **What an amount does.** "which he gets but cannot judge, falling on the people really there (a smaller next harvest,
   hunger, unrest, flight) or leaving wealth in the fields": taken as asked, as far as the farmers' granaries hold; what
   the farmers lack for food is hunger by item 10+a's rule, its flight and its ledger taking; the next harvest is smaller by
   the hands that left. No new rule of hunger. Principle: "One rule for everything".
4. **What the stewards report exactly.** A count is of people and fields; the king's own stores, market, what his demand
   brings in and how the countryside ate are his stewards' reports and stay exact. So a king can see a share's hiding as
   a shortfall in what comes in, as a court would; the yields the seat view gives of its own and watched land are the
   same: what comes in, as it comes in. A levy refused for too few men no longer names how many are at home (round 1).
   Principle: "Information as known".
5. **Every court starts counted** in the first season: the courts of the age kept lists of households and
   men (as at Alalakh and Ugarit). Land taken later is uncounted. Principle: "Period first".
6. **The census's fee is flat** (three shekels a province), so the fee tells the king nothing of what the scribes will
   find; a census of a province once at a time; "counting stirs some unrest" is five points of the ledger. First guesses.
7. **"Only a governor stands between king and province"** read as: where a governor stands, the ledger debits and credits
   him for what is asked (part A's hand); no other intermediary. Principle: "One rule for everything".
9. **"Counted people and measured fields are the king's answer to a province's word"** read as: a governor's letters on a
   province's mood and harvest (items 13, 17), and the shortfall a share shows, are claims a king can now check against
   his own count, which comes home dated and by the road; no rule compares them for him. Principle: "Deceit is
   information" (a lie is found out by evidence, never by a roll).
8. **The scripts' amount** is what their farmers can bear by the count (item 10+a's reckoning), asked while the count is
   two seasons old or less; past that a share. They count the richest stale provinces (eight seasons), two a season.
   Script play, not balance.

## Design questions

None beyond those for Haakon below.

## Benchmarks and use against ignore

**After round 1** (20 games, seed 1, `--verify-replay`, on `78fd012`): every replay exact; a capital fell in 20 of 20
games, 308 kingdoms in all, the first in season 4 on the median (4 to 7), **none in its first two seasons**. Winners:
Suteans, Azzi, Lukka, Hatti, Gath, Libya, Egypt and Assyria among the first eight seeds.

**Use and success, by the batch's signals** (games in which it happened / times, over the 20): scribes sent to count a
province (`census`) 20 / 13,316, counts come home (`census-home`) 20 / 13,035 (98%: the rest found the land lost or the
game ended first); demands set as a share 20 / 15,576 and as an amount 20 / 14,301. Every script king counts and asks
both ways in every game.

Before round 1 (on `bee4370`, before the signals): 20 games, every replay exact, the first fall in season 4 on the
median, none in the first two seasons.

**Use against ignore** (`--count-play-half`, 50 games, seed 1, after round 1): kings that count and ask an amount while the
count is fresh, against kings that never count and always ask a share: **0.96 growth to 0.89, 30 wins to 20. Pays.**
Uneven by power (Hatti 1.05 against 1.28, Assyria 0.36 against 0.57, Azzi 1.62 against 0.97): item 18 looks at the share
and amount numbers together.

## The review

(To come.)

Questions for Haakon:

1. The sections part B names under The world ("Counts as the scribes knew them", "A census", "The king says how much he
   wants") are not in the repository's copy of the design document, and this account cannot read the live one. Could the
   copy be refreshed? Reading taken: built from the item's own text (readings above). Alternative: wait for the sections.
2. Should the corvée (the men a work takes) also be asked as a share? Levies now can be, as the item's text says. Reading
   taken: the corvée stays each work's need, an amount, since a share would have to invent how a half-manned work
   progresses. Alternative: a share of the men for works, the work going slower by the men who came.
