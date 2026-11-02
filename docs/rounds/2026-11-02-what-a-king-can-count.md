# Item 17++, part B: what a king can count

Branch `item/what-a-king-can-count`, from part A's branch (`item/whom-a-province-obeys` at `7319705`), as "Pipeline,
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

1. **Levies and work gangs stay amounts as built.** The item lists "grain, levy and work gangs" as asked by share or
   amount. A levy already takes the men a unit needs from the men really there (item 10+a, `levyMen`), and the corvée the
   men a work needs (item 15): both are amounts the king names and gets, falling on the people there, which is what the
   item says an amount is. A share of men has no use the game has yet (no standing levy each year), and inventing one is a
   rule the sections might say otherwise of. So grain is asked either way, and levies and gangs stay the amounts they are.
   Principle: "No stopgaps" (no rule invented for the meantime) and "Different data, same rules". **Asked of Haakon**
   (question 2), since the sections are missing.
2. **What a share hides.** "lets it hide more the older his count and the farther it lies": a point of the share for every
   season since the count, two for every season of the word's road beyond the first, at most thirty; land never counted
   twenty before distance. First guesses. Principle: "Information time travel" (what a king knows is as old as its road).
3. **What an amount does.** "which he gets but cannot judge, falling on the people really there (a smaller next harvest,
   hunger, unrest, flight) or leaving wealth in the fields": taken as asked, as far as the farmers' granaries hold; what
   the farmers lack for food is hunger by item 10+a's rule, its flight and its ledger taking; the next harvest is smaller by
   the hands that left. No new rule of hunger. Principle: "One rule for everything".
4. **What the stewards report exactly.** A count is of people and fields; the king's own stores, market, what his demand
   brings in and how the countryside ate are his stewards' reports and stay exact. So a king can see a share's hiding as
   a shortfall in what comes in, as a court would. Principle: "Information as known".
5. **Every court starts counted** in the first season: the courts of the age kept lists of households and
   men (as at Alalakh and Ugarit). Land taken later is uncounted. Principle: "Period first".
6. **The census's fee is flat** (three shekels a province), so the fee tells the king nothing of what the scribes will
   find; a census of a province once at a time; "counting stirs some unrest" is five points of the ledger. First guesses.
7. **"Only a governor stands between king and province"** read as: where a governor stands, the ledger debits and credits
   him for what is asked (part A's hand); no other intermediary. Principle: "One rule for everything".
8. **The scripts' amount** is what their farmers can bear by the count (item 10+a's reckoning), asked while the count is
   two seasons old or less; past that a share. They count the richest stale provinces (eight seasons), two a season.
   Script play, not balance.

## Design questions

None beyond those for Haakon below.

## Benchmarks and use against ignore

(To come.)

## The review

(To come.)

Questions for Haakon:

1. The sections part B names under The world ("Counts as the scribes knew them", "A census", "The king says how much he
   wants") are not in the repository's copy of the design document, and this account cannot read the live one. Could the
   copy be refreshed? Reading taken: built from the item's own text (readings above). Alternative: wait for the sections.
2. Should levies and work gangs also be asked as a share (for example a standing share of the men each year)? Reading
   taken: they stay amounts as built, since a levy and the corvée already take named numbers of men from the men really
   there. Alternative: a share of men, hidden by the count's age like grain.
